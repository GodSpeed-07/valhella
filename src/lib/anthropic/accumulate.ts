import type { AnyBlock, StopReason, Usage } from './types'

export interface SearchActivity {
  tool: 'web_search' | 'web_fetch'
  detail: string | null
}

export interface AccumulatorHandlers {
  onBlocks?: (blocks: AnyBlock[]) => void
  onSearch?: (activity: SearchActivity | null) => void
  onThinking?: (active: boolean) => void
}

export interface AccumulatedMessage {
  blocks: AnyBlock[]
  stopReason: StopReason
  usage: Usage
  model: string | null
}

interface StreamErrorShape {
  type?: string
  message?: string
}

export class StreamError extends Error {
  apiType: string
  constructor(apiType: string, message: string) {
    super(message)
    this.apiType = apiType
  }
}

export function createAccumulator(handlers: AccumulatorHandlers) {
  const blocks: AnyBlock[] = []
  const partialJson = new Map<number, string>()
  let stopReason: StopReason = null
  let usage: Usage = {}
  let model: string | null = null
  let done = false

  const emitBlocks = () => handlers.onBlocks?.(blocks.map((b) => ({ ...b })))

  const emitSearch = (index: number) => {
    const b = blocks[index]
    if (!b || b.type !== 'server_tool_use') return
    const name = String(b.name ?? '')
    if (name !== 'web_search' && name !== 'web_fetch') return
    const input = (b.input ?? {}) as Record<string, unknown>
    let detail: string | null = null
    if (name === 'web_search' && typeof input.query === 'string') detail = input.query
    if (name === 'web_fetch' && typeof input.url === 'string') {
      try {
        detail = new URL(input.url).hostname
      } catch {
        detail = input.url
      }
    }
    handlers.onSearch?.({ tool: name, detail })
  }

  function apply(event: string, data: string): void {
    if (event === 'ping') return
    let payload: Record<string, unknown>
    try {
      payload = JSON.parse(data) as Record<string, unknown>
    } catch {
      return
    }
    if (event === 'error' || payload.type === 'error') {
      const err = (payload.error ?? {}) as StreamErrorShape
      throw new StreamError(err.type ?? 'api_error', err.message ?? 'The API returned an error.')
    }
    switch (payload.type) {
      case 'message_start': {
        const msg = (payload.message ?? {}) as Record<string, unknown>
        if (typeof msg.model === 'string') model = msg.model
        if (msg.usage && typeof msg.usage === 'object') usage = { ...(msg.usage as Usage) }
        break
      }
      case 'content_block_start': {
        const index = Number(payload.index)
        const block = { ...((payload.content_block ?? {}) as AnyBlock) }
        blocks[index] = block
        if (block.type === 'thinking') handlers.onThinking?.(true)
        if (block.type === 'text' || block.type === 'tool_use') handlers.onThinking?.(false)
        if (block.type === 'server_tool_use') emitSearch(index)
        if (block.type === 'web_search_tool_result' || block.type === 'web_fetch_tool_result') {
          handlers.onSearch?.(null)
        }
        emitBlocks()
        break
      }
      case 'content_block_delta': {
        const index = Number(payload.index)
        const block = blocks[index]
        if (!block) break
        const delta = (payload.delta ?? {}) as Record<string, unknown>
        if (delta.type === 'text_delta' && typeof delta.text === 'string') {
          block.text = String(block.text ?? '') + delta.text
        } else if (delta.type === 'thinking_delta' && typeof delta.thinking === 'string') {
          block.thinking = String(block.thinking ?? '') + delta.thinking
        } else if (delta.type === 'signature_delta' && typeof delta.signature === 'string') {
          block.signature = String(block.signature ?? '') + delta.signature
        } else if (delta.type === 'input_json_delta' && typeof delta.partial_json === 'string') {
          partialJson.set(index, (partialJson.get(index) ?? '') + delta.partial_json)
          if (block.type === 'server_tool_use') {
            try {
              block.input = JSON.parse(partialJson.get(index) ?? '') as Record<string, unknown>
              emitSearch(index)
            } catch {
              break
            }
          }
        } else if (delta.type === 'citations_delta' && delta.citation && typeof delta.citation === 'object') {
          const existing = Array.isArray(block.citations) ? (block.citations as unknown[]) : []
          block.citations = [...existing, delta.citation]
        }
        emitBlocks()
        break
      }
      case 'content_block_stop': {
        const index = Number(payload.index)
        const block = blocks[index]
        const partial = partialJson.get(index)
        if (block && partial !== undefined && (block.type === 'tool_use' || block.type === 'server_tool_use')) {
          try {
            block.input = JSON.parse(partial === '' ? '{}' : partial) as Record<string, unknown>
          } catch {
            block.input = {}
          }
          partialJson.delete(index)
        }
        if (block && block.type === 'thinking') handlers.onThinking?.(false)
        emitBlocks()
        break
      }
      case 'message_delta': {
        const delta = (payload.delta ?? {}) as Record<string, unknown>
        if (typeof delta.stop_reason === 'string') stopReason = delta.stop_reason as StopReason
        if (payload.usage && typeof payload.usage === 'object') {
          usage = { ...usage, ...(payload.usage as Usage) }
        }
        break
      }
      case 'message_stop': {
        done = true
        handlers.onSearch?.(null)
        handlers.onThinking?.(false)
        break
      }
      default:
        break
    }
  }

  function result(): AccumulatedMessage {
    return { blocks, stopReason, usage, model }
  }

  return { apply, result, isDone: () => done }
}
