import { buildRequest } from '../src/lib/anthropic/params'
import {
  estimateInputTokens,
  getPreflightDiagnostics,
  RequestContextSession
} from '../src/lib/anthropic/preflight'
import type { AnyBlock, ApiMessage, MessagesRequest } from '../src/lib/anthropic/types'

const INPUT_DOLLARS_PER_TOKEN = 2 / 1_000_000
const system = 'Stable browser-agent instruction. '.repeat(60)
const tools = Array.from({ length: 12 }, (_, index) => ({
  name: `tool_${index}`,
  description: 'Browser action with a deterministic input schema. '.repeat(4),
  input_schema: { type: 'object', properties: { value: { type: 'string' } } }
}))
const task: ApiMessage = {
  role: 'user',
  content: [{
    type: 'text',
    text: 'Task: preserve https://example.test/known, CASE-42, constraints, decisions, errors, completed work, remaining work, and LATER-9001.'
  }]
}

function snapshot(turn: number, repeated: boolean): string {
  const content = repeated ? 'unchanged-page-' : `unique-page-${turn}-`
  return `URL: https://example.test/known\nIdentifier: CASE-42\n${content.repeat(4_000).slice(0, 14_500)}`
}

function append(messages: ApiMessage[], turn: number, repeated: boolean, oldCacheMarker: boolean): void {
  const result: AnyBlock = {
    type: 'tool_result',
    tool_use_id: `toolu_${turn}`,
    content: [
      { type: 'text', text: `Completed browser action ${turn}.` },
      { type: 'text', text: snapshot(turn, repeated) }
    ]
  }
  if (oldCacheMarker) result.cache_control = { type: 'ephemeral' }
  messages.push(
    {
      role: 'assistant',
      content: [{
        type: 'tool_use', id: `toolu_${turn}`, name: 'tool_0',
        input: { value: turn === 2 ? 'LATER-9001' : `value-${turn}` }
      }]
    },
    { role: 'user', content: [result] }
  )
}

function oldRequest(messages: ApiMessage[]): MessagesRequest {
  return {
    model: 'claude-sonnet-5',
    max_tokens: 8_192,
    stream: true,
    tools,
    system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
    messages
  }
}

function byteLength(request: MessagesRequest): number {
  return new TextEncoder().encode(JSON.stringify(request)).byteLength
}

function cacheBlocks(request: MessagesRequest): number {
  return (JSON.stringify(request).match(/"cache_control"/g) ?? []).length
}

function isMessagePrefix(previous: MessagesRequest, current: MessagesRequest): boolean {
  if (previous.messages.length >= current.messages.length) return false
  return previous.messages.every((message, index) => JSON.stringify(message) === JSON.stringify(current.messages[index]))
}

function estimatedCacheCost(requests: MessagesRequest[]): number {
  if (requests.length === 0) return 0
  const stable = estimateInputTokens({ ...requests[0]!, messages: [], cache_control: undefined })
  let costTokenEquivalent = estimateInputTokens(requests[0]!) * 1.25
  for (let index = 1; index < requests.length; index += 1) {
    const previous = requests[index - 1]!
    const current = requests[index]!
    const currentTokens = estimateInputTokens(current)
    const reusable = isMessagePrefix(previous, current) ? estimateInputTokens(previous) : stable
    costTokenEquivalent += reusable * 0.1 + Math.max(0, currentTokens - reusable) * 1.25
  }
  return costTokenEquivalent * INPUT_DOLLARS_PER_TOKEN
}

function estimatedOldCacheCost(requests: MessagesRequest[], stopAtInvalid: boolean): number {
  if (requests.length === 0) return 0
  const stable = estimateInputTokens({ ...requests[0]!, messages: [] })
  let cachedPrefix = stable
  let previousBlocks = 1
  let costTokenEquivalent = 0
  for (let index = 0; index < requests.length; index += 1) {
    const request = requests[index]!
    const blocks = cacheBlocks(request)
    if (stopAtInvalid && blocks > 4) break
    const total = estimateInputTokens(request)
    if (index === 0) {
      costTokenEquivalent += stable * 1.25 + Math.max(0, total - stable)
    } else if (blocks > previousBlocks) {
      costTokenEquivalent += cachedPrefix * 0.1 + Math.max(0, total - cachedPrefix) * 1.25
      cachedPrefix = total
    } else {
      costTokenEquivalent += cachedPrefix * 0.1 + Math.max(0, total - cachedPrefix)
    }
    previousBlocks = blocks
  }
  return costTokenEquivalent * INPUT_DOLLARS_PER_TOKEN
}

function scenario(repeated: boolean) {
  const beforeMessages: ApiMessage[] = [structuredClone(task)]
  const before: MessagesRequest[] = []
  for (let turn = 1; turn <= 25; turn += 1) {
    before.push(oldRequest(structuredClone(beforeMessages)))
    if (turn < 25) append(beforeMessages, turn, repeated, turn % 3 === 0)
  }

  const afterMessages: ApiMessage[] = [structuredClone(task)]
  const session = new RequestContextSession(afterMessages)
  const after: MessagesRequest[] = []
  for (let turn = 1; turn <= 25; turn += 1) {
    after.push(buildRequest({
      model: 'claude-sonnet-5',
      mode: 'agent',
      system,
      messages: afterMessages,
      clientTools: tools,
      contextSession: session,
      requestTurn: turn
    }))
    if (turn < 25) append(afterMessages, turn, repeated, false)
  }

  const beforeTokens = before.map(estimateInputTokens)
  const afterDiagnostics = after.map((request) => getPreflightDiagnostics(request)!)
  const afterTokens = afterDiagnostics.map((item) => item.estimatedInputTokens)
  const firstInvalid = before.findIndex((request) => cacheBlocks(request) > 4)
  return {
    turn25: {
      before: {
        messages: before[24]!.messages.length,
        estimatedInputTokens: beforeTokens[24],
        requestBytes: byteLength(before[24]!),
        cacheBlocks: cacheBlocks(before[24]!)
      },
      after: {
        messages: after[24]!.messages.length,
        estimatedInputTokens: afterTokens[24],
        requestBytes: byteLength(after[24]!),
        cacheBlocks: afterDiagnostics[24]!.cacheBlockCount,
        compacted: afterDiagnostics[24]!.compacted,
        artifactsRetainedLocally: session.artifactCount()
      }
    },
    cumulativeEstimatedInputTokens: {
      before: beforeTokens.reduce((sum, value) => sum + value, 0),
      after: afterTokens.reduce((sum, value) => sum + value, 0)
    },
    noCacheInputCostUpperBoundDollars: {
      before: beforeTokens.reduce((sum, value) => sum + value, 0) * INPUT_DOLLARS_PER_TOKEN,
      after: afterTokens.reduce((sum, value) => sum + value, 0) * INPUT_DOLLARS_PER_TOKEN
    },
    cachePolicyEstimatedInputCostDollars: {
      beforeThroughFailure: estimatedOldCacheCost(before, true),
      beforeHypothetical25TurnsIgnoringBlockLimit: estimatedOldCacheCost(before, false),
      after: estimatedCacheCost(after)
    },
    previousPolicyFirstInvalidRequest: firstInvalid === -1 ? null : firstInvalid + 1,
    maxAfterEstimatedInputTokens: Math.max(...afterTokens),
    maxAfterCacheBlocks: Math.max(...afterDiagnostics.map((item) => item.cacheBlockCount)),
    compactionRequests: afterDiagnostics.filter((item) => item.compacted).length,
    duplicateBlocksReplaced: afterDiagnostics.reduce((sum, item) => sum + item.duplicateLargeBlocks, 0)
  }
}

const shortMessages: ApiMessage[] = [{ role: 'user', content: [{ type: 'text', text: 'Short task.' }] }]
const short = buildRequest({ model: 'claude-sonnet-5', mode: 'chat', system: 'System.', messages: shortMessages })
console.log(JSON.stringify({
  note: 'Token and cost values are deterministic local estimates; no API key was available, so provider usage is intentionally not fabricated.',
  short: {
    messageCount: short.messages.length,
    compacted: getPreflightDiagnostics(short)?.compacted,
    estimatedInputTokens: getPreflightDiagnostics(short)?.estimatedInputTokens,
    cacheBlocks: getPreflightDiagnostics(short)?.cacheBlockCount
  },
  longUnique: scenario(false),
  longRepeated: scenario(true)
}, null, 2))
