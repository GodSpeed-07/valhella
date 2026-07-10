import { describe, expect, it } from 'vitest'
import { buildRequest } from '../src/lib/anthropic/params'
import {
  DEFAULT_AGENT_INPUT_TOKEN_BUDGET,
  getPreflightDiagnostics,
  MAX_CACHE_BREAKPOINTS,
  RequestContextSession
} from '../src/lib/anthropic/preflight'
import type { AnyBlock, ApiMessage, ToolResultBlock } from '../src/lib/anthropic/types'

const SYSTEM = 'Stable agent system. '.repeat(100)
const TOOLS = [{
  name: 'read_page',
  description: 'Read the current page and return its state.',
  input_schema: { type: 'object', properties: { value: { type: 'string' } } }
}]

function snapshot(turn: number, body: string): string {
  return [
    `Completed page read ${turn}.`,
    'URL: https://example.test/known',
    'Identifier: CASE-42',
    body.repeat(4_000).slice(0, 14_500)
  ].join('\n')
}

function appendPair(
  messages: ApiMessage[],
  turn: number,
  resultText: string,
  options: { narration?: string; isError?: boolean; value?: string; cache?: boolean } = {}
): void {
  const content: AnyBlock[] = []
  if (options.narration) content.push({ type: 'text', text: options.narration })
  content.push({
    type: 'tool_use',
    id: `toolu_${turn}`,
    name: 'read_page',
    input: { value: options.value ?? `value-${turn}` }
  })
  const result: ToolResultBlock = {
    type: 'tool_result',
    tool_use_id: `toolu_${turn}`,
    content: [{ type: 'text', text: resultText }],
    is_error: options.isError
  }
  if (options.cache) result.cache_control = { type: 'ephemeral' }
  messages.push({ role: 'assistant', content }, { role: 'user', content: [result as unknown as AnyBlock] })
}

function assertToolIntegrity(messages: ApiMessage[]): void {
  for (let index = 0; index < messages.length; index += 1) {
    const uses = messages[index]?.content.filter((block) => block.type === 'tool_use') ?? []
    if (uses.length === 0) continue
    const next = messages[index + 1]
    expect(next?.role).toBe('user')
    const ids = new Set(next?.content.filter((block) => block.type === 'tool_result').map((block) => block.tool_use_id))
    expect(uses.every((use) => ids.has(use.id))).toBe(true)
  }
}

describe('Anthropic request preflight', () => {
  it('bounds a 25-turn agent run while retaining objective task state', () => {
    const messages: ApiMessage[] = [{
      role: 'user',
      content: [{
        type: 'text',
        text: [
          'Original task: complete the workflow.',
          'Active constraints: never submit payment; keep CASE-42 exact.',
          'Known URL: https://example.test/known',
          'Completion condition: report completed and remaining work.'
        ].join('\n')
      }]
    }]
    const session = new RequestContextSession(messages)
    const diagnostics = []
    const compactedStates: string[] = []
    let finalRequest = buildRequest({
      model: 'claude-sonnet-5', mode: 'agent', system: SYSTEM, messages,
      clientTools: TOOLS, contextSession: session, requestTurn: 1
    })

    for (let turn = 1; turn < 25; turn += 1) {
      appendPair(messages, turn, snapshot(turn, `unique-page-${turn}-`), {
        narration: turn === 2
          ? 'Decision: chose the safe route because payment submission is prohibited.'
          : turn === 4
            ? 'Remaining work: verify the final confirmation page.'
            : undefined,
        isError: turn === 3,
        value: turn === 2 ? 'LATER-TOOL-VALUE-9001' : undefined,
        cache: turn % 3 === 0
      })
      if (turn === 3) {
        const result = messages.at(-1)?.content[0]
        if (result?.type === 'tool_result') result.content = [{ type: 'text', text: `Error: stale element failed.\n${snapshot(turn, 'error-page-')}` }]
      }
      finalRequest = buildRequest({
        model: 'claude-sonnet-5', mode: 'agent', system: SYSTEM, messages,
        clientTools: TOOLS, contextSession: session, requestTurn: turn + 1
      })
      const diagnostic = getPreflightDiagnostics(finalRequest)
      expect(diagnostic).toBeDefined()
      diagnostics.push(diagnostic!)
      const state = finalRequest.messages[0]?.content
        .filter((block) => block.type === 'text')
        .map((block) => String(block.text))
        .find((text) => text.startsWith('[Deterministic local state'))
      if (state) compactedStates.push(state)
      expect(diagnostic!.estimatedInputTokens).toBeLessThanOrEqual(DEFAULT_AGENT_INPUT_TOKEN_BUDGET)
      expect(diagnostic!.cacheBlockCount).toBeLessThanOrEqual(MAX_CACHE_BREAKPOINTS)
      assertToolIntegrity(finalRequest.messages)
    }

    expect(diagnostics.filter((diagnostic) => diagnostic.compacted).length).toBeGreaterThan(5)
    expect(compactedStates.some((state, index) => index > 0 && state === compactedStates[index - 1])).toBe(true)
    expect(Math.max(...diagnostics.map((diagnostic) => diagnostic.estimatedInputTokens))).toBeLessThanOrEqual(32_000)
    const retained = JSON.stringify(finalRequest.messages)
    for (const required of [
      'Original task',
      'never submit payment',
      'https://example.test/known',
      'CASE-42',
      'chose the safe route',
      'stale element failed',
      'Completed page read',
      'Remaining work',
      'LATER-TOOL-VALUE-9001'
    ]) expect(retained).toContain(required)
    expect(session.artifactCount()).toBeGreaterThan(10)
  })

  it('deduplicates only byte-identical large results and retains changed versions', () => {
    const messages: ApiMessage[] = [{ role: 'user', content: [{ type: 'text', text: 'Task: compare pages.' }] }]
    const session = new RequestContextSession(messages)
    const repeated = snapshot(1, 'same-content-')
    appendPair(messages, 1, repeated)
    appendPair(messages, 2, repeated)
    appendPair(messages, 3, `${repeated} changed`)
    for (let index = 2; index < messages.length; index += 2) {
      const result = messages[index]?.content[0]
      if (result?.type !== 'tool_result') continue
      const page = index === 6 ? `${repeated} changed` : repeated
      result.content = [{ type: 'text', text: `Action outcome ${index}` }, { type: 'text', text: page }]
    }
    const request = buildRequest({
      model: 'claude-sonnet-5', mode: 'agent', system: SYSTEM, messages,
      clientTools: TOOLS, contextSession: session, inputTokenBudget: 100_000
    })
    const diagnostic = getPreflightDiagnostics(request)!
    expect(diagnostic.duplicateLargeBlocks).toBe(1)
    expect(JSON.stringify(request.messages)).toContain('changed')
    expect(JSON.stringify(request.messages)).toContain('Unchanged tool artifact')
    expect(session.artifactCount()).toBe(2)
  })

  it('strips obsolete cache markers and applies at most two centralized markers', () => {
    const messages: ApiMessage[] = [{ role: 'user', content: [{ type: 'text', text: 'Task: cache safely.' }] }]
    const session = new RequestContextSession(messages)
    for (let turn = 1; turn <= 12; turn += 1) appendPair(messages, turn, `small ${turn}`, { cache: true })
    const request = buildRequest({
      model: 'claude-sonnet-5', mode: 'agent', system: SYSTEM, messages,
      clientTools: TOOLS, contextSession: session, inputTokenBudget: 100_000
    })
    const diagnostic = getPreflightDiagnostics(request)!
    expect(diagnostic.cacheBlockCount).toBe(2)
    expect(request.cache_control).toEqual({ type: 'ephemeral' })
    expect(request.system?.at(-1)?.cache_control).toEqual({ type: 'ephemeral' })
    expect(JSON.stringify(request.messages)).not.toContain('cache_control')
  })

  it('leaves short tasks uncompacted and does not change their message flow', () => {
    const messages: ApiMessage[] = [{ role: 'user', content: [{ type: 'text', text: 'Short task.' }] }]
    const request = buildRequest({ model: 'claude-sonnet-5', mode: 'chat', system: 'System.', messages })
    expect(request.messages).toEqual(messages)
    expect(request.cache_control).toBeUndefined()
    expect(getPreflightDiagnostics(request)).toMatchObject({ compacted: false, cacheBlockCount: 1, messageCount: 1 })
  })

  it('keeps recent thinking, signature, redacted thinking, and tool pairs byte-for-byte', () => {
    const messages: ApiMessage[] = [{ role: 'user', content: [{ type: 'text', text: 'Task: preserve thinking protocol.' }] }]
    const session = new RequestContextSession(messages)
    for (let turn = 1; turn <= 5; turn += 1) appendPair(messages, turn, snapshot(turn, `page-${turn}-`))
    const latestAssistant = messages.at(-2)!
    latestAssistant.content.unshift(
      { type: 'thinking', thinking: 'opaque summary', signature: 'signature-unchanged' },
      { type: 'redacted_thinking', data: 'encrypted-unchanged' }
    )
    const expected = JSON.stringify(latestAssistant.content)
    const request = buildRequest({
      model: 'claude-opus-4-8', mode: 'agent', system: SYSTEM, messages,
      clientTools: TOOLS, contextSession: session, inputTokenBudget: 18_000
    })
    const retained = request.messages.find((message) => message.content.some((block) => block.id === 'toolu_5'))
    expect(JSON.stringify(retained?.content)).toBe(expected)
    assertToolIntegrity(request.messages)
  })

  it('blocks malformed tool sequences before a network request', () => {
    const messages: ApiMessage[] = [{
      role: 'assistant',
      content: [{ type: 'tool_use', id: 'orphan', name: 'read_page', input: {} }]
    }]
    expect(() => buildRequest({ model: 'claude-sonnet-5', mode: 'agent', system: SYSTEM, messages, clientTools: TOOLS }))
      .toThrow(/tool_result blocks immediately after/)
  })
})
