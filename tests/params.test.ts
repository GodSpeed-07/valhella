import { describe, expect, it } from 'vitest'
import { buildRequest } from '../src/lib/anthropic/params'
import type { ApiMessage } from '../src/lib/anthropic/types'

const messages: ApiMessage[] = [{ role: 'user', content: [{ type: 'text', text: 'hi' }] }]

describe('buildRequest', () => {
  it('never includes sampling parameters', () => {
    for (const model of ['claude-haiku-4-5', 'claude-sonnet-5', 'claude-opus-4-8'] as const) {
      const req = buildRequest({ model, mode: 'chat', system: 'sys', messages }) as unknown as Record<string, unknown>
      expect(req.temperature).toBeUndefined()
      expect(req.top_p).toBeUndefined()
      expect(req.top_k).toBeUndefined()
    }
  })

  it('omits thinking for sonnet chat but disables it for quick actions', () => {
    expect(buildRequest({ model: 'claude-sonnet-5', mode: 'chat', system: 's', messages }).thinking).toBeUndefined()
    expect(buildRequest({ model: 'claude-sonnet-5', mode: 'quick', system: 's', messages }).thinking).toEqual({
      type: 'disabled'
    })
  })

  it('sends adaptive thinking for opus chat and agent only', () => {
    expect(buildRequest({ model: 'claude-opus-4-8', mode: 'chat', system: 's', messages }).thinking).toEqual({
      type: 'adaptive'
    })
    expect(buildRequest({ model: 'claude-opus-4-8', mode: 'agent', system: 's', messages }).thinking).toEqual({
      type: 'adaptive'
    })
    expect(buildRequest({ model: 'claude-opus-4-8', mode: 'quick', system: 's', messages }).thinking).toBeUndefined()
  })

  it('never sends thinking for haiku', () => {
    for (const mode of ['chat', 'quick', 'agent', 'title'] as const) {
      expect(buildRequest({ model: 'claude-haiku-4-5', mode, system: 's', messages }).thinking).toBeUndefined()
    }
  })

  it('uses per-mode max_tokens', () => {
    expect(buildRequest({ model: 'claude-sonnet-5', mode: 'chat', system: 's', messages }).max_tokens).toBe(16384)
    expect(buildRequest({ model: 'claude-sonnet-5', mode: 'quick', system: 's', messages }).max_tokens).toBe(2048)
    expect(buildRequest({ model: 'claude-sonnet-5', mode: 'agent', system: 's', messages }).max_tokens).toBe(8192)
    expect(buildRequest({ model: 'claude-haiku-4-5', mode: 'title', system: 's', messages }).max_tokens).toBe(100)
  })

  it('marks the last system block with cache_control', () => {
    const req = buildRequest({ model: 'claude-sonnet-5', mode: 'chat', system: 'stable system', messages })
    expect(req.system?.[0]?.cache_control).toEqual({ type: 'ephemeral' })
  })

  it('wires model-correct web tool versions', () => {
    const sonnet = buildRequest({ model: 'claude-sonnet-5', mode: 'chat', system: 's', messages, webSearch: true })
    expect(sonnet.tools?.map((t) => t.type)).toEqual(['web_search_20260209', 'web_fetch_20260209'])
    const haiku = buildRequest({ model: 'claude-haiku-4-5', mode: 'chat', system: 's', messages, webSearch: true })
    expect(haiku.tools?.map((t) => t.type)).toEqual(['web_search_20250305', 'web_fetch_20250910'])
  })

  it('drops disabled server tools and omits tools when search is off', () => {
    const req = buildRequest({
      model: 'claude-sonnet-5',
      mode: 'chat',
      system: 's',
      messages,
      webSearch: true,
      disabledServerTools: ['web_search_20260209']
    })
    expect(req.tools?.map((t) => t.type)).toEqual(['web_fetch_20260209'])
    expect(buildRequest({ model: 'claude-sonnet-5', mode: 'chat', system: 's', messages }).tools).toBeUndefined()
  })

  it('appends client tools after server tools', () => {
    const req = buildRequest({
      model: 'claude-opus-4-8',
      mode: 'agent',
      system: 's',
      messages,
      webSearch: false,
      clientTools: [{ name: 'click', input_schema: { type: 'object' } }]
    })
    expect(req.tools?.map((t) => t.name)).toEqual(['click'])
  })
})
