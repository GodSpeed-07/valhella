import { isRuntimeMessage } from '../lib/messages'
import { Speaker } from '../lib/tts/player'

let currentTabId: number | null = null
let lastSent: string | null = null
let hasSpoken = false

const speaker = new Speaker((status) => {
  if (currentTabId === null) return
  let state: 'loading' | 'playing' | 'ended' | null = null
  if (status.phase === 'loading') state = 'loading'
  else if (status.phase === 'playing' || status.phase === 'paused') {
    state = 'playing'
    hasSpoken = true
  } else if (status.phase === 'idle' && hasSpoken) state = 'ended'
  if (state && state !== lastSent) {
    lastSent = state
    void chrome.runtime
      .sendMessage({ kind: 'offscreen-state', state, requestTabId: currentTabId })
      .catch(() => undefined)
  }
})

chrome.runtime.onMessage.addListener((raw: unknown) => {
  if (!isRuntimeMessage(raw)) return
  if (raw.kind === 'offscreen-speak') {
    currentTabId = raw.requestTabId
    lastSent = null
    hasSpoken = false
    void speaker.speak(raw.text, { id: raw.voiceId, rate: raw.rate })
  } else if (raw.kind === 'offscreen-stop') {
    speaker.stop()
  }
})
