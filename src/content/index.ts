import { isTabMessage } from '../lib/messages'
import { extractPage } from './extractor'
import { handleAgentAction } from './actuator'
import { initPopup, onSpeakState } from './popup'

declare global {
  interface Window {
    __brieflyContent?: boolean
  }
}

function init(): void {
  if (window.__brieflyContent) return
  window.__brieflyContent = true

  chrome.runtime.onMessage.addListener((raw: unknown, _sender, sendResponse) => {
    if (!isTabMessage(raw)) return
    if (raw.kind === 'extract-page') {
      sendResponse(extractPage())
      return
    }
    if (raw.kind === 'agent-action') {
      void handleAgentAction(raw.action).then(sendResponse)
      return true
    }
    if (raw.kind === 'speak-state') {
      onSpeakState(raw.state)
    }
    return
  })

  initPopup()
}

init()

export {}
