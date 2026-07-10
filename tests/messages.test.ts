import { describe, expect, it } from 'vitest'
import { isRuntimeMessage, isTabMessage } from '../src/lib/messages'

describe('message protocol guards', () => {
  it('accepts known runtime messages', () => {
    expect(isRuntimeMessage({ kind: 'popup-speak', text: 'hi' })).toBe(true)
    expect(
      isRuntimeMessage({
        kind: 'panel-handoff',
        payload: { userText: 'u', assistantText: null, model: 'claude-sonnet-5', title: null, autoSend: true }
      })
    ).toBe(true)
  })

  it('rejects unknown or malformed messages', () => {
    expect(isRuntimeMessage(null)).toBe(false)
    expect(isRuntimeMessage('popup-speak')).toBe(false)
    expect(isRuntimeMessage({ kind: 'not-a-thing' })).toBe(false)
    expect(isRuntimeMessage({})).toBe(false)
  })

  it('separates tab messages from runtime messages', () => {
    expect(isTabMessage({ kind: 'extract-page' })).toBe(true)
    expect(isTabMessage({ kind: 'agent-action', action: { tool: 'read_page' } })).toBe(true)
    expect(isTabMessage({ kind: 'popup-speak', text: 'x' })).toBe(false)
    expect(isRuntimeMessage({ kind: 'extract-page' })).toBe(false)
  })
})
