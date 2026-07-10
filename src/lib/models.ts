export type ModelId = 'claude-haiku-4-5' | 'claude-sonnet-5' | 'claude-opus-4-8'

export interface ModelInfo {
  id: ModelId
  label: string
  tagline: string
  pricePerMTokIn: number
  pricePerMTokOut: number
  contextWindow: number
  maxOutput: number
  webSearchType: string
  webFetchType: string
  thinking: 'adaptive-default' | 'explicit-adaptive' | 'none'
}

export const MODELS: Record<ModelId, ModelInfo> = {
  'claude-haiku-4-5': {
    id: 'claude-haiku-4-5',
    label: 'Haiku 4.5',
    tagline: 'Fast',
    pricePerMTokIn: 1,
    pricePerMTokOut: 5,
    contextWindow: 200_000,
    maxOutput: 64_000,
    webSearchType: 'web_search_20250305',
    webFetchType: 'web_fetch_20250910',
    thinking: 'none'
  },
  'claude-sonnet-5': {
    id: 'claude-sonnet-5',
    label: 'Sonnet 5',
    tagline: 'Balanced',
    pricePerMTokIn: 2,
    pricePerMTokOut: 10,
    contextWindow: 1_000_000,
    maxOutput: 128_000,
    webSearchType: 'web_search_20260209',
    webFetchType: 'web_fetch_20260209',
    thinking: 'adaptive-default'
  },
  'claude-opus-4-8': {
    id: 'claude-opus-4-8',
    label: 'Opus 4.8',
    tagline: 'Most capable',
    pricePerMTokIn: 5,
    pricePerMTokOut: 25,
    contextWindow: 1_000_000,
    maxOutput: 128_000,
    webSearchType: 'web_search_20260209',
    webFetchType: 'web_fetch_20260209',
    thinking: 'explicit-adaptive'
  }
}

export const MODEL_LIST: ModelInfo[] = [
  MODELS['claude-haiku-4-5'],
  MODELS['claude-sonnet-5'],
  MODELS['claude-opus-4-8']
]

export const DEFAULT_MODEL: ModelId = 'claude-sonnet-5'
export const TITLE_MODEL: ModelId = 'claude-haiku-4-5'

export function isModelId(v: unknown): v is ModelId {
  return v === 'claude-haiku-4-5' || v === 'claude-sonnet-5' || v === 'claude-opus-4-8'
}
