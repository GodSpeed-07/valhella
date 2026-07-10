export type AnyBlock = { type: string } & Record<string, unknown>

export interface TextCitation {
  type: string
  url?: string
  title?: string
  cited_text?: string
  [k: string]: unknown
}

export interface TextBlock {
  type: 'text'
  text: string
  citations?: TextCitation[]
}

export interface ThinkingBlock {
  type: 'thinking'
  thinking: string
  signature?: string
}

export interface ImageBlock {
  type: 'image'
  source: { type: 'base64'; media_type: string; data: string }
}

export interface ToolUseBlock {
  type: 'tool_use'
  id: string
  name: string
  input: Record<string, unknown>
}

export interface ServerToolUseBlock {
  type: 'server_tool_use'
  id: string
  name: string
  input: Record<string, unknown>
}

export interface ToolResultBlock {
  type: 'tool_result'
  tool_use_id: string
  content: string | AnyBlock[]
  is_error?: boolean
  cache_control?: { type: 'ephemeral' }
}

export type StopReason =
  | 'end_turn'
  | 'max_tokens'
  | 'stop_sequence'
  | 'tool_use'
  | 'pause_turn'
  | 'refusal'
  | null

export interface Usage {
  input_tokens?: number
  output_tokens?: number
  cache_creation_input_tokens?: number
  cache_read_input_tokens?: number
  requests?: RequestUsage[]
  [k: string]: unknown
}

export interface RequestUsage {
  turn: number | null
  messageCount: number
  estimatedInputTokens: number
  requestBytes: number
  cacheBlockCount: number
  duplicateLargeBlocks: number
  compacted: boolean
  artifactReferences: number
  retryCount: number
  retryProviderReportedTokens: number | null
  uncachedInputTokens: number
  cacheCreationInputTokens: number
  cacheReadInputTokens: number
  outputTokens: number
  costDollars: number
}

export interface SystemBlock {
  type: 'text'
  text: string
  cache_control?: { type: 'ephemeral' }
}

export interface ApiMessage {
  role: 'user' | 'assistant'
  content: AnyBlock[]
}

export interface ToolDefinition {
  name: string
  type?: string
  description?: string
  input_schema?: Record<string, unknown>
  max_uses?: number
}

export interface MessagesRequest {
  model: string
  max_tokens: number
  stream: true
  messages: ApiMessage[]
  system?: SystemBlock[]
  tools?: ToolDefinition[]
  thinking?: { type: 'adaptive' } | { type: 'disabled' }
  cache_control?: { type: 'ephemeral' }
}

export function isTextBlock(b: AnyBlock): b is TextBlock & AnyBlock {
  return b.type === 'text' && typeof b.text === 'string'
}

export function isThinkingBlock(b: AnyBlock): b is ThinkingBlock & AnyBlock {
  return b.type === 'thinking'
}

export function isImageBlock(b: AnyBlock): b is ImageBlock & AnyBlock {
  return b.type === 'image'
}

export function isToolUseBlock(b: AnyBlock): b is ToolUseBlock & AnyBlock {
  return b.type === 'tool_use' && typeof b.id === 'string' && typeof b.name === 'string'
}

export function isServerToolUseBlock(b: AnyBlock): b is ServerToolUseBlock & AnyBlock {
  return b.type === 'server_tool_use'
}

export function isToolResultBlock(b: AnyBlock): b is ToolResultBlock & AnyBlock {
  return b.type === 'tool_result'
}

export function textOfBlocks(blocks: AnyBlock[]): string {
  return blocks.filter(isTextBlock).map((b) => b.text).join('')
}
