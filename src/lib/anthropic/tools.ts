import { MODELS, type ModelId } from '../models'
import type { ToolDefinition } from './types'

export function webSearchTool(model: ModelId): ToolDefinition {
  return { type: MODELS[model].webSearchType, name: 'web_search', max_uses: 6 }
}

export function webFetchTool(model: ModelId): ToolDefinition {
  return { type: MODELS[model].webFetchType, name: 'web_fetch', max_uses: 6 }
}
