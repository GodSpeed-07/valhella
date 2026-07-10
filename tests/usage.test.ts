import { afterEach, describe, expect, it, vi } from 'vitest'
import { streamMessage } from '../src/lib/anthropic/client'
import { buildRequest } from '../src/lib/anthropic/params'
import { mergeUsage, usageReconciles } from '../src/lib/anthropic/usage'
import { requestCostDollars } from '../src/lib/cost'

afterEach(() => vi.restoreAllMocks())

function sseResponse(): Response {
  const body = [
    'event: message_start\ndata: {"type":"message_start","message":{"model":"claude-sonnet-5","usage":{"input_tokens":10,"cache_creation_input_tokens":20,"cache_read_input_tokens":30}}}\n\n',
    'event: content_block_start\ndata: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":"ok"}}\n\n',
    'event: content_block_stop\ndata: {"type":"content_block_stop","index":0}\n\n',
    'event: message_delta\ndata: {"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"output_tokens":5}}\n\n',
    'event: message_stop\ndata: {"type":"message_stop"}\n\n'
  ].join('')
  return new Response(body, { status: 200, headers: { 'content-type': 'text/event-stream' } })
}

describe('usage accounting', () => {
  it('records retry count without double-counting provider usage', async () => {
    vi.spyOn(globalThis, 'setTimeout').mockImplementation(((handler: TimerHandler) => {
      if (typeof handler === 'function') handler()
      return 1
    }) as typeof setTimeout)
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('{"error":{"message":"busy"}}', { status: 503 }))
      .mockResolvedValueOnce(sseResponse())
    const request = buildRequest({
      model: 'claude-sonnet-5', mode: 'chat', system: 'Stable.',
      messages: [{ role: 'user', content: [{ type: 'text', text: 'Hi' }] }], requestTurn: 1
    })
    const result = await streamMessage('test-key', request, {})
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(result.usage).toMatchObject({
      input_tokens: 10,
      cache_creation_input_tokens: 20,
      cache_read_input_tokens: 30,
      output_tokens: 5
    })
    expect(result.usage.requests).toHaveLength(1)
    expect(result.usage.requests?.[0]).toMatchObject({ retryCount: 1, uncachedInputTokens: 10, outputTokens: 5 })
    expect(usageReconciles(result.usage)).toBe(true)
  })

  it('reconciles per-request categories with cumulative totals', () => {
    const first = {
      input_tokens: 10, cache_creation_input_tokens: 20, cache_read_input_tokens: 30, output_tokens: 5,
      requests: [{
        turn: 1, messageCount: 1, estimatedInputTokens: 60, requestBytes: 240,
        cacheBlockCount: 1, duplicateLargeBlocks: 0, compacted: false, artifactReferences: 0,
        retryCount: 0, retryProviderReportedTokens: 0, uncachedInputTokens: 10,
        cacheCreationInputTokens: 20, cacheReadInputTokens: 30, outputTokens: 5, costDollars: 0.00001
      }]
    }
    const second = {
      input_tokens: 7, cache_creation_input_tokens: 0, cache_read_input_tokens: 40, output_tokens: 3,
      requests: [{
        turn: 2, messageCount: 3, estimatedInputTokens: 50, requestBytes: 200,
        cacheBlockCount: 2, duplicateLargeBlocks: 1, compacted: true, artifactReferences: 1,
        retryCount: 2, retryProviderReportedTokens: null, uncachedInputTokens: 7,
        cacheCreationInputTokens: 0, cacheReadInputTokens: 40, outputTokens: 3, costDollars: 0.00001
      }]
    }
    const cumulative = mergeUsage(first, second)
    expect(cumulative).toMatchObject({
      input_tokens: 17, cache_creation_input_tokens: 20, cache_read_input_tokens: 70, output_tokens: 8
    })
    expect(cumulative.requests).toHaveLength(2)
    expect(usageReconciles(cumulative)).toBe(true)
  })

  it('uses the documented Sonnet 5 promotional rate and its scheduled successor', () => {
    const usage = { input_tokens: 1_000_000, output_tokens: 1_000_000 }
    expect(requestCostDollars('claude-sonnet-5', usage, new Date('2026-07-11T00:00:00Z'))).toBe(12)
    expect(requestCostDollars('claude-sonnet-5', usage, new Date('2026-09-01T00:00:00Z'))).toBe(18)
  })
})
