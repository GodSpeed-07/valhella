import { MODELS, type ModelId } from '../models'
import { webFetchTool, webSearchTool } from './tools'
import { prepareRequest, type RequestContextSession } from './preflight'
import type { ApiMessage, MessagesRequest, SystemBlock, ToolDefinition } from './types'

export type RequestMode = 'chat' | 'quick' | 'agent' | 'title'

const MAX_TOKENS: Record<RequestMode, number> = {
  chat: 16384,
  quick: 2048,
  agent: 8192,
  title: 100
}

export interface BuildOptions {
  model: ModelId
  mode: RequestMode
  system: string | SystemBlock[]
  messages: ApiMessage[]
  webSearch?: boolean
  clientTools?: ToolDefinition[]
  maxTokensOverride?: number
  disabledServerTools?: string[]
  inputTokenBudget?: number
  requestTurn?: number
  contextSession?: RequestContextSession
}

export function buildRequest(o: BuildOptions): MessagesRequest {
  const info = MODELS[o.model]
  const req: MessagesRequest = {
    model: o.model,
    max_tokens: Math.min(o.maxTokensOverride ?? MAX_TOKENS[o.mode], info.maxOutput),
    stream: true,
    messages: o.messages
  }

  const system: SystemBlock[] =
    typeof o.system === 'string' ? [{ type: 'text', text: o.system }] : o.system.map((b) => ({ ...b }))
  if (system.length > 0) req.system = system

  const tools: ToolDefinition[] = []
  if (o.webSearch) {
    const disabled = o.disabledServerTools ?? []
    const search = webSearchTool(o.model)
    const fetch = webFetchTool(o.model)
    if (!disabled.includes(search.type ?? '')) tools.push(search)
    if (!disabled.includes(fetch.type ?? '')) tools.push(fetch)
  }
  if (o.clientTools) tools.push(...o.clientTools)
  if (tools.length > 0) req.tools = tools

  const interactive = o.mode === 'chat' || o.mode === 'agent'
  if (info.thinking === 'adaptive-default' && !interactive) {
    req.thinking = { type: 'disabled' }
  } else if (info.thinking === 'explicit-adaptive' && interactive) {
    req.thinking = { type: 'adaptive' }
  }

  return prepareRequest(req, {
    mode: o.mode,
    inputTokenBudget: o.inputTokenBudget,
    requestTurn: o.requestTurn,
    contextSession: o.contextSession
  })
}
