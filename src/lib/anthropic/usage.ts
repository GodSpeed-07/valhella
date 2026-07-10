import type { Usage } from './types'

export function mergeUsage(a: Usage, b: Usage): Usage {
  return {
    input_tokens: (a.input_tokens ?? 0) + (b.input_tokens ?? 0),
    output_tokens: (a.output_tokens ?? 0) + (b.output_tokens ?? 0),
    cache_creation_input_tokens: (a.cache_creation_input_tokens ?? 0) + (b.cache_creation_input_tokens ?? 0),
    cache_read_input_tokens: (a.cache_read_input_tokens ?? 0) + (b.cache_read_input_tokens ?? 0),
    requests: [...(a.requests ?? []), ...(b.requests ?? [])]
  }
}

export function requestUsageTotals(usage: Usage): {
  input: number
  cacheCreation: number
  cacheRead: number
  output: number
} {
  return (usage.requests ?? []).reduce(
    (total, request) => ({
      input: total.input + request.uncachedInputTokens,
      cacheCreation: total.cacheCreation + request.cacheCreationInputTokens,
      cacheRead: total.cacheRead + request.cacheReadInputTokens,
      output: total.output + request.outputTokens
    }),
    { input: 0, cacheCreation: 0, cacheRead: 0, output: 0 }
  )
}

export function usageReconciles(usage: Usage): boolean {
  const total = requestUsageTotals(usage)
  return (
    total.input === (usage.input_tokens ?? 0) &&
    total.cacheCreation === (usage.cache_creation_input_tokens ?? 0) &&
    total.cacheRead === (usage.cache_read_input_tokens ?? 0) &&
    total.output === (usage.output_tokens ?? 0)
  )
}
