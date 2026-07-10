import {
  isTextBlock,
  isToolResultBlock,
  isToolUseBlock,
  type AnyBlock,
  type ApiMessage,
  type MessagesRequest
} from './types'

export const MAX_CACHE_BREAKPOINTS = 4
export const DEFAULT_AGENT_INPUT_TOKEN_BUDGET = 32_000
export const DEFAULT_INPUT_TOKEN_BUDGET = 120_000

const LARGE_ARTIFACT_CHARS = 1_000
const RECENT_RAW_TOOL_PAIRS = 4

export interface PreflightDiagnostics {
  turn: number | null
  messageCount: number
  estimatedInputTokens: number
  requestBytes: number
  cacheBlockCount: number
  duplicateLargeBlocks: number
  compacted: boolean
  artifactReferences: number
}

interface PrepareOptions {
  mode: 'chat' | 'quick' | 'agent' | 'title'
  inputTokenBudget?: number
  requestTurn?: number
  contextSession?: RequestContextSession
}

interface ToolPair {
  assistant: ApiMessage
  result: ApiMessage
}

interface ReductionStats {
  duplicateLargeBlocks: number
  artifactReferences: number
}

const diagnostics = new WeakMap<MessagesRequest, PreflightDiagnostics>()

export class PreflightError extends Error {
  readonly diagnostic: PreflightDiagnostics

  constructor(message: string, diagnostic: PreflightDiagnostics) {
    super(message)
    this.diagnostic = diagnostic
  }
}

function cloneBlock(block: AnyBlock): AnyBlock {
  const copy = { ...block }
  delete copy.cache_control
  if (Array.isArray(copy.content)) copy.content = copy.content.map((b) => cloneBlock(b as AnyBlock))
  if (copy.source && typeof copy.source === 'object') copy.source = { ...(copy.source as Record<string, unknown>) }
  return copy
}

function cloneMessages(messages: ApiMessage[]): ApiMessage[] {
  return messages.map((message) => ({ role: message.role, content: message.content.map(cloneBlock) }))
}

function contentText(content: unknown): string {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''
  return content
    .filter((block): block is AnyBlock => Boolean(block) && typeof block === 'object')
    .filter(isTextBlock)
    .map((block) => block.text)
    .join('\n')
}

function requestJsonForEstimate(request: MessagesRequest): string {
  return JSON.stringify(request, (_key, value: unknown) => {
    if (
      typeof value === 'string' &&
      value.length > 4_000 &&
      /^[A-Za-z0-9+/=]+$/.test(value.slice(0, 500))
    ) {
      return `[base64 image: ${value.length} characters]`
    }
    return value
  })
}

export function estimateInputTokens(request: MessagesRequest): number {
  let imageCount = 0
  for (const message of request.messages) {
    for (const block of message.content) {
      if (block.type === 'image') imageCount += 1
      if (isToolResultBlock(block) && Array.isArray(block.content)) {
        imageCount += block.content.filter((nested) => nested.type === 'image').length
      }
    }
  }
  return Math.ceil(requestJsonForEstimate(request).length / 4) + imageCount * 3_000
}

function requestBytes(request: MessagesRequest): number {
  return new TextEncoder().encode(JSON.stringify(request)).byteLength
}

function cacheBlockCount(request: MessagesRequest): number {
  let count = request.cache_control ? 1 : 0
  count += request.system?.filter((block) => block.cache_control).length ?? 0
  for (const message of request.messages) {
    count += message.content.filter((block) => block.cache_control).length
  }
  return count
}

function hashString(value: string): string {
  let a = 0x811c9dc5
  let b = 0x9e3779b9
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i)
    a = Math.imul(a ^ code, 0x01000193)
    b = Math.imul(b ^ code, 0x85ebca6b)
  }
  return `${(a >>> 0).toString(16).padStart(8, '0')}${(b >>> 0).toString(16).padStart(8, '0')}`
}

function firstLine(value: string): string {
  return value.split('\n').map((line) => line.trim()).find(Boolean)?.slice(0, 500) ?? ''
}

function uniqueLimited(values: string[], maxItems: number, maxChars: number): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  let chars = 0
  for (const raw of values) {
    const value = raw.trim()
    if (!value || seen.has(value)) continue
    if (out.length >= maxItems || chars + value.length > maxChars) break
    seen.add(value)
    out.push(value)
    chars += value.length
  }
  return out
}

function toolPairs(messages: ApiMessage[], start: number): { pairs: ToolPair[]; firstPair: number } {
  const pairs: ToolPair[] = []
  let firstPair = -1
  for (let index = start; index < messages.length - 1; index += 1) {
    const assistant = messages[index]
    const result = messages[index + 1]
    if (!assistant || !result || assistant.role !== 'assistant' || result.role !== 'user') continue
    const uses = assistant.content.filter(isToolUseBlock)
    if (uses.length === 0) continue
    const resultIds = new Set(result.content.filter(isToolResultBlock).map((block) => block.tool_use_id))
    if (!uses.every((use) => resultIds.has(use.id))) continue
    if (firstPair === -1) firstPair = index
    pairs.push({ assistant, result })
    index += 1
  }
  return { pairs, firstPair }
}

function criticalLines(text: string): string[] {
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean)
  return lines
    .filter((line) => /https?:\/\/|\b(?:url|id|identifier|case|ticket|order|error|failed|refused|unresolved|remaining|next|todo)\b|\[[0-9]+\]/i.test(line))
    .map((line) => line.slice(0, 600))
}

export class RequestContextSession {
  private readonly originalTaskIndex: number
  private readonly artifacts = new Map<string, string>()
  private compactedPairCount = 0
  private compactedSummary: string | null = null

  constructor(initialMessages: ApiMessage[]) {
    let taskIndex = -1
    for (let index = initialMessages.length - 1; index >= 0; index -= 1) {
      if (initialMessages[index]?.role === 'user') {
        taskIndex = index
        break
      }
    }
    this.originalTaskIndex = Math.max(0, taskIndex)
  }

  artifactCount(): number {
    return this.artifacts.size
  }

  getArtifact(reference: string): string | undefined {
    return this.artifacts.get(reference)
  }

  private storeArtifact(serialized: string): string {
    const base = `artifact:${hashString(serialized)}:${serialized.length}`
    let reference = base
    let collision = 1
    while (this.artifacts.has(reference) && this.artifacts.get(reference) !== serialized) {
      reference = `${base}:${collision}`
      collision += 1
    }
    this.artifacts.set(reference, serialized)
    return reference
  }

  private reduceDuplicates(messages: ApiMessage[], stats: ReductionStats): ApiMessage[] {
    const out = cloneMessages(messages)
    const firstByContent = new Map<string, string>()
    for (let messageIndex = 0; messageIndex < out.length; messageIndex += 1) {
      const message = out[messageIndex]
      if (!message) continue
      for (const block of message.content) {
        if (!isToolResultBlock(block)) continue
        if (typeof block.content === 'string') {
          if (block.content.length < LARGE_ARTIFACT_CHARS) continue
          const serialized = block.content
          const reference = this.storeArtifact(serialized)
          const first = firstByContent.get(serialized)
          if (first) {
            block.content = `[Unchanged tool result; full local artifact ${first}]`
            stats.duplicateLargeBlocks += 1
            stats.artifactReferences += 1
          } else {
            firstByContent.set(serialized, reference)
          }
          continue
        }
        for (let nestedIndex = 0; nestedIndex < block.content.length; nestedIndex += 1) {
          const nested = block.content[nestedIndex]
          if (!nested) continue
          const serialized = JSON.stringify(nested)
          if (serialized.length < LARGE_ARTIFACT_CHARS) continue
          const reference = this.storeArtifact(serialized)
          const first = firstByContent.get(serialized)
          if (first) {
            block.content[nestedIndex] = { type: 'text', text: `[Unchanged tool artifact; full local artifact ${first}]` }
            stats.duplicateLargeBlocks += 1
            stats.artifactReferences += 1
          } else {
            firstByContent.set(serialized, reference)
          }
        }
      }
    }
    return out
  }

  private summary(prefix: ApiMessage[], oldPairs: ToolPair[], stats: ReductionStats): string {
    const prior = prefix
      .filter((_message, index) => index !== this.originalTaskIndex)
      .flatMap((message) => message.content.filter(isTextBlock).map((block) => `${message.role}: ${block.text.slice(0, 1_000)}`))
    const discoveries: string[] = []
    const decisions: string[] = []
    const completed: string[] = []
    const errors: string[] = []
    const remaining: string[] = []
    const exactValues: string[] = []
    const states: string[] = []

    for (const pair of oldPairs) {
      const narration = pair.assistant.content.filter(isTextBlock).map((block) => block.text).join('\n')
      if (/\b(?:decid|chose|choose|because|rationale)\b/i.test(narration)) decisions.push(narration.slice(0, 1_000))
      if (/\b(?:remaining|next|todo|open question|unresolved)\b/i.test(narration)) remaining.push(narration.slice(0, 1_000))
      for (const use of pair.assistant.content.filter(isToolUseBlock)) {
        const input = JSON.stringify(use.input)
        exactValues.push(`${use.name} ${input}`)
        const result = pair.result.content.find((block) => isToolResultBlock(block) && block.tool_use_id === use.id)
        const text = result && isToolResultBlock(result) ? contentText(result.content) : ''
        completed.push(`${use.name} ${input}${text ? ` => ${firstLine(text)}` : ''}`)
        discoveries.push(...criticalLines(text))
        if (result && isToolResultBlock(result) && (result.is_error || /\b(?:error|failed|refused|stale)\b/i.test(text))) {
          errors.push(`${use.name}: ${firstLine(text)}`)
        }
        if (text) states.push(firstLine(text))
        if (text.length >= LARGE_ARTIFACT_CHARS) {
          const reference = this.storeArtifact(text)
          discoveries.push(`Full local tool artifact: ${reference}`)
          stats.artifactReferences += 1
        }
      }
    }

    const sections: [string, string[]][] = [
      ['Prior conversation context', uniqueLimited(prior, 6, 4_000)],
      ['Verified discoveries and stable references', uniqueLimited(discoveries, 24, 8_000)],
      ['Decisions and rationale', uniqueLimited(decisions, 10, 4_000)],
      ['Completed work', uniqueLimited(completed, 30, 8_000)],
      ['Errors and failed approaches', uniqueLimited(errors, 12, 4_000)],
      ['Open questions and remaining work', uniqueLimited(remaining, 12, 4_000)],
      ['Exact tool values retained', uniqueLimited(exactValues, 30, 8_000)],
      ['Current state/progress', uniqueLimited(states.slice(-5), 5, 2_500)]
    ]
    const lines = ['[Deterministic local state extracted from older completed history; no model call was used.]']
    for (const [heading, values] of sections) {
      if (values.length === 0) continue
      lines.push(`\n${heading}:`, ...values.map((value) => `- ${value}`))
    }
    return lines.join('\n')
  }

  private excerptOlderArtifacts(messages: ApiMessage[], keepLastPairs: number, stats: ReductionStats): ApiMessage[] {
    const out = cloneMessages(messages)
    const { pairs } = toolPairs(out, this.originalTaskIndex + 1)
    const older = pairs.slice(0, Math.max(0, pairs.length - keepLastPairs))
    for (const pair of older) {
      for (const result of pair.result.content.filter(isToolResultBlock)) {
        if (typeof result.content === 'string' && result.content.length >= LARGE_ARTIFACT_CHARS) {
          const reference = this.storeArtifact(result.content)
          const preserved = uniqueLimited([firstLine(result.content), ...criticalLines(result.content)], 12, 3_000)
          result.content = `${preserved.join('\n')}\n[Full local artifact ${reference}]`
          stats.artifactReferences += 1
        } else if (Array.isArray(result.content)) {
          result.content = result.content.map((nested) => {
            const serialized = JSON.stringify(nested)
            if (serialized.length < LARGE_ARTIFACT_CHARS) return nested
            const reference = this.storeArtifact(serialized)
            const text = isTextBlock(nested) ? nested.text : ''
            const preserved = uniqueLimited([firstLine(text), ...criticalLines(text)], 12, 3_000)
            stats.artifactReferences += 1
            return { type: 'text', text: `${preserved.join('\n')}\n[Full local artifact ${reference}]` }
          })
        }
      }
    }
    return out
  }

  prepare(rawMessages: ApiMessage[], budget: number, requestWithoutMessages: MessagesRequest): {
    messages: ApiMessage[]
    stats: ReductionStats & { compacted: boolean }
  } {
    const stats: ReductionStats & { compacted: boolean } = {
      duplicateLargeBlocks: 0,
      artifactReferences: 0,
      compacted: false
    }
    let messages = this.reduceDuplicates(rawMessages, stats)
    const withMessages = (candidate: ApiMessage[]) => ({ ...requestWithoutMessages, messages: candidate })
    const raw = cloneMessages(rawMessages)
    const { pairs, firstPair } = toolPairs(raw, this.originalTaskIndex + 1)
    if (this.compactedSummary === null && estimateInputTokens(withMessages(messages)) <= budget) {
      return { messages, stats }
    }
    if (pairs.length === 0 || firstPair === -1) return { messages, stats }

    const taskWithSummary = (summary: string): ApiMessage | null => {
      const source = raw[this.originalTaskIndex] ?? raw[0]
      const task = source ? cloneMessages([source])[0] : undefined
      if (!task) return null
      task.content.push({ type: 'text', text: summary })
      return task
    }
    const candidateFrom = (summary: string, compactedPairCount: number): ApiMessage[] | null => {
      const task = taskWithSummary(summary)
      if (!task) return null
      return this.reduceDuplicates(
        [task, ...pairs.slice(compactedPairCount).flatMap((pair) => [pair.assistant, pair.result])],
        stats
      )
    }

    if (this.compactedSummary !== null) {
      stats.compacted = true
      const existing = candidateFrom(this.compactedSummary, this.compactedPairCount)
      if (existing) {
        messages = existing
        if (estimateInputTokens(withMessages(existing)) <= budget) return { messages: existing, stats }
      }
    }

    for (let keep = Math.min(RECENT_RAW_TOOL_PAIRS, pairs.length); keep >= 1; keep -= 1) {
      const compactedPairCount = pairs.length - keep
      const oldPairs = pairs.slice(0, compactedPairCount)
      const prefix = raw.slice(0, firstPair)
      const state = this.summary(prefix, oldPairs, stats)
      const candidate = candidateFrom(state, compactedPairCount)
      if (!candidate) break
      stats.compacted = true
      if (estimateInputTokens(withMessages(candidate)) <= budget) {
        this.compactedPairCount = compactedPairCount
        this.compactedSummary = state
        return { messages: candidate, stats }
      }
      messages = candidate
    }

    messages = this.excerptOlderArtifacts(messages, 1, stats)
    return { messages, stats }
  }
}

function validateToolMessages(messages: ApiMessage[]): void {
  const seenUses = new Set<string>()
  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index]
    if (!message) continue
    const results = message.content.filter(isToolResultBlock)
    if (results.length > 0) {
      const firstNonResult = message.content.findIndex((block) => !isToolResultBlock(block))
      if (firstNonResult >= 0 && message.content.slice(firstNonResult).some(isToolResultBlock)) {
        throw new Error('tool_result blocks must precede other user content')
      }
      if (message.role !== 'user') throw new Error('tool_result blocks must use the user role')
      for (const result of results) {
        if (!seenUses.has(result.tool_use_id)) throw new Error(`orphaned tool_result ${result.tool_use_id}`)
      }
    }
    const uses = message.content.filter(isToolUseBlock)
    if (uses.length === 0) continue
    if (message.role !== 'assistant') throw new Error('tool_use blocks must use the assistant role')
    for (const use of uses) {
      if (seenUses.has(use.id)) throw new Error(`duplicate tool_use id ${use.id}`)
      seenUses.add(use.id)
    }
    const next = messages[index + 1]
    const nextIds = new Set(next?.content.filter(isToolResultBlock).map((block) => block.tool_use_id) ?? [])
    if (!next || next.role !== 'user' || !uses.every((use) => nextIds.has(use.id))) {
      throw new Error(`tool_use ids must have tool_result blocks immediately after: ${uses.map((use) => use.id).join(', ')}`)
    }
  }
}

function validateRequest(request: MessagesRequest): void {
  const blocks = cacheBlockCount(request)
  if (blocks > MAX_CACHE_BREAKPOINTS) throw new Error(`cache breakpoint limit exceeded: ${blocks}/${MAX_CACHE_BREAKPOINTS}`)
  validateToolMessages(request.messages)
}

export function prepareRequest(request: MessagesRequest, options: PrepareOptions): MessagesRequest {
  const clean: MessagesRequest = {
    ...request,
    system: request.system?.map((block) => ({ type: 'text', text: block.text })),
    messages: cloneMessages(request.messages)
  }
  delete clean.cache_control

  const budget = options.inputTokenBudget ??
    (options.mode === 'agent' ? DEFAULT_AGENT_INPUT_TOKEN_BUDGET : DEFAULT_INPUT_TOKEN_BUDGET)
  let duplicateLargeBlocks = 0
  let artifactReferences = 0
  let compacted = false

  if (options.contextSession) {
    const base = { ...clean, messages: [] }
    const reduced = options.contextSession.prepare(clean.messages, budget, base)
    clean.messages = reduced.messages
    duplicateLargeBlocks = reduced.stats.duplicateLargeBlocks
    artifactReferences = reduced.stats.artifactReferences
    compacted = reduced.stats.compacted
  }

  const lastSystem = clean.system?.[clean.system.length - 1]
  if (lastSystem) lastSystem.cache_control = { type: 'ephemeral' }
  if (options.mode === 'agent') clean.cache_control = { type: 'ephemeral' }

  validateRequest(clean)
  const diagnostic: PreflightDiagnostics = {
    turn: options.requestTurn ?? null,
    messageCount: clean.messages.length,
    estimatedInputTokens: estimateInputTokens(clean),
    requestBytes: requestBytes(clean),
    cacheBlockCount: cacheBlockCount(clean),
    duplicateLargeBlocks,
    compacted,
    artifactReferences
  }
  diagnostics.set(clean, diagnostic)
  if (diagnostic.estimatedInputTokens > budget) {
    throw new PreflightError(
      `Anthropic request blocked by context preflight: estimated ${diagnostic.estimatedInputTokens} input tokens exceeds budget ${budget}.`,
      diagnostic
    )
  }
  return clean
}

export function getPreflightDiagnostics(request: MessagesRequest): PreflightDiagnostics | undefined {
  return diagnostics.get(request)
}
