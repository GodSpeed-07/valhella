import { describe, expect, it } from 'vitest'
import { createSseDecoder } from '../src/lib/anthropic/sse'
import { createAccumulator } from '../src/lib/anthropic/accumulate'

describe('sse decoder', () => {
  it('parses complete events', () => {
    const decode = createSseDecoder()
    const events = decode('event: message_start\ndata: {"type":"message_start"}\n\n')
    expect(events).toEqual([{ event: 'message_start', data: '{"type":"message_start"}' }])
  })

  it('buffers partial events across chunks', () => {
    const decode = createSseDecoder()
    expect(decode('event: content_block_delta\ndata: {"a"')).toEqual([])
    const events = decode(':1}\n\nevent: ping\ndata: {}\n\n')
    expect(events).toHaveLength(2)
    expect(events[0]).toEqual({ event: 'content_block_delta', data: '{"a":1}' })
  })

  it('joins multi-line data', () => {
    const decode = createSseDecoder()
    const events = decode('data: line1\ndata: line2\n\n')
    expect(events[0]?.data).toBe('line1\nline2')
  })
})

describe('stream accumulator', () => {
  const feed = (events: [string, unknown][]) => {
    const acc = createAccumulator({})
    for (const [event, payload] of events) acc.apply(event, JSON.stringify(payload))
    return acc
  }

  it('accumulates text deltas and stop reason', () => {
    const acc = feed([
      ['message_start', { type: 'message_start', message: { model: 'claude-sonnet-5', usage: { input_tokens: 10 } } }],
      ['content_block_start', { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } }],
      ['content_block_delta', { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'Hel' } }],
      ['content_block_delta', { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'lo' } }],
      ['content_block_stop', { type: 'content_block_stop', index: 0 }],
      ['message_delta', { type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: { output_tokens: 5 } }],
      ['message_stop', { type: 'message_stop' }]
    ])
    const result = acc.result()
    expect(result.model).toBe('claude-sonnet-5')
    expect(result.stopReason).toBe('end_turn')
    expect(result.usage.input_tokens).toBe(10)
    expect(result.usage.output_tokens).toBe(5)
    expect(result.blocks[0]).toMatchObject({ type: 'text', text: 'Hello' })
    expect(acc.isDone()).toBe(true)
  })

  it('assembles tool_use input from json deltas', () => {
    const acc = feed([
      ['content_block_start', { type: 'content_block_start', index: 0, content_block: { type: 'tool_use', id: 't1', name: 'click', input: {} } }],
      ['content_block_delta', { type: 'content_block_delta', index: 0, delta: { type: 'input_json_delta', partial_json: '{"element' } }],
      ['content_block_delta', { type: 'content_block_delta', index: 0, delta: { type: 'input_json_delta', partial_json: '_id":12}' } }],
      ['content_block_stop', { type: 'content_block_stop', index: 0 }]
    ])
    expect(acc.result().blocks[0]?.input).toEqual({ element_id: 12 })
  })

  it('collects citations from citation deltas', () => {
    const acc = feed([
      ['content_block_start', { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } }],
      ['content_block_delta', { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'Fact.' } }],
      ['content_block_delta', { type: 'content_block_delta', index: 0, delta: { type: 'citations_delta', citation: { type: 'web_search_result_location', url: 'https://x.com', title: 'X' } } }]
    ])
    const block = acc.result().blocks[0]
    expect(Array.isArray(block?.citations)).toBe(true)
    expect((block?.citations as unknown[]).length).toBe(1)
  })

  it('throws StreamError on error events', () => {
    const acc = createAccumulator({})
    expect(() =>
      acc.apply('error', JSON.stringify({ type: 'error', error: { type: 'overloaded_error', message: 'Busy' } }))
    ).toThrowError('Busy')
  })
})
