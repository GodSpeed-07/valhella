import { getSettings, watchSettings, type Settings } from '../lib/settings'
import {
  isRuntimeMessage,
  PORT_PANEL,
  PORT_QUICK_ACTION,
  SESSION_HANDOFF_KEY,
  type HandoffPayload,
  type PanelPortMessage,
  type QuickActionEvent,
  type QuickActionRequest
} from '../lib/messages'
import { resolveActions, handoffUserText } from '../lib/actions'
import { buildRequest } from '../lib/anthropic/params'
import { ApiError, streamMessage } from '../lib/anthropic/client'
import { textOfBlocks } from '../lib/anthropic/types'

const panelPorts = new Map<number, chrome.runtime.Port>()

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => undefined)

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    void chrome.tabs.create({ url: chrome.runtime.getURL('src/onboarding/index.html') })
  }
  void rebuildMenus()
})

let lastMenuSignature = ''

async function rebuildMenus(): Promise<void> {
  const settings = await getSettings()
  const actions = resolveActions(settings)
  const signature = actions.map((a) => `${a.id}:${a.name}`).join('|')
  if (signature === lastMenuSignature) return
  lastMenuSignature = signature
  await chrome.contextMenus.removeAll()
  chrome.contextMenus.create({
    id: 'briefly',
    title: 'Briefly',
    contexts: ['selection']
  })
  for (const action of actions) {
    chrome.contextMenus.create({
      id: `qa:${action.id}`,
      parentId: 'briefly',
      title: action.name,
      contexts: ['selection']
    })
  }
  chrome.contextMenus.create({ id: 'sep', parentId: 'briefly', type: 'separator', contexts: ['selection'] })
  chrome.contextMenus.create({
    id: 'ask',
    parentId: 'briefly',
    title: 'Ask Briefly about this…',
    contexts: ['selection']
  })
  chrome.contextMenus.create({
    id: 'open-panel',
    title: 'Open Briefly',
    contexts: ['page']
  })
}

void rebuildMenus()
watchSettings(() => void rebuildMenus())

function openPanel(windowId: number | undefined): void {
  if (windowId === undefined) return
  void chrome.sidePanel.open({ windowId }).catch(() => undefined)
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  const windowId = tab?.windowId
  if (info.menuItemId === 'open-panel') {
    openPanel(windowId)
    return
  }
  const selection = (info.selectionText ?? '').trim()
  if (!selection) return
  openPanel(windowId)
  void (async () => {
    const settings = await getSettings()
    const actions = resolveActions(settings)
    const id = String(info.menuItemId)
    let payload: HandoffPayload | null = null
    if (id.startsWith('qa:')) {
      const action = actions.find((a) => `qa:${a.id}` === id)
      if (action) {
        payload = {
          userText: handoffUserText(action, null, selection.slice(0, 12000)),
          assistantText: null,
          model: settings.defaultModel,
          title: null,
          autoSend: true
        }
      }
    } else if (id === 'ask') {
      const quoted = selection
        .slice(0, 4000)
        .split('\n')
        .map((l) => `> ${l}`)
        .join('\n')
      payload = {
        userText: `${quoted}\n\n`,
        assistantText: null,
        model: settings.defaultModel,
        title: null,
        autoSend: false
      }
    }
    if (payload) await chrome.storage.session.set({ [SESSION_HANDOFF_KEY]: payload })
  })()
})

chrome.commands.onCommand.addListener((command, tab) => {
  if (command !== 'toggle-panel') return
  const windowId = tab?.windowId
  if (windowId === undefined) return
  const port = panelPorts.get(windowId)
  if (port) {
    port.postMessage({ kind: 'close' })
  } else {
    void chrome.sidePanel.open({ windowId })
  }
})

async function ensureOffscreen(): Promise<void> {
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT' as chrome.runtime.ContextType]
  })
  if (contexts.length > 0) return
  try {
    await chrome.offscreen.createDocument({
      url: 'src/offscreen/index.html',
      reasons: ['AUDIO_PLAYBACK' as chrome.offscreen.Reason],
      justification: 'Plays read-aloud audio for the selection popup while the side panel is closed.'
    })
  } catch {
    return
  }
}

chrome.runtime.onMessage.addListener((raw: unknown, sender, sendResponse) => {
  if (!isRuntimeMessage(raw)) return
  if (raw.kind === 'panel-handoff') {
    openPanel(sender.tab?.windowId)
    void chrome.storage.session.set({ [SESSION_HANDOFF_KEY]: raw.payload }).then(() => sendResponse({ ok: true }))
    return true
  }
  if (raw.kind === 'open-panel') {
    openPanel(sender.tab?.windowId)
    sendResponse({ ok: true })
    return
  }
  if (raw.kind === 'popup-speak') {
    const tabId = sender.tab?.id
    if (tabId === undefined) return
    void (async () => {
      await ensureOffscreen()
      const settings = await getSettings()
      await chrome.runtime.sendMessage({
        kind: 'offscreen-speak',
        text: raw.text,
        voiceId: settings.voice.id,
        rate: settings.voice.rate,
        requestTabId: tabId
      })
      sendResponse({ ok: true })
    })()
    return true
  }
  if (raw.kind === 'popup-speak-stop') {
    void chrome.runtime.sendMessage({ kind: 'offscreen-stop' }).catch(() => undefined)
    sendResponse({ ok: true })
    return
  }
  if (raw.kind === 'offscreen-state') {
    void chrome.tabs.sendMessage(raw.requestTabId, { kind: 'speak-state', state: raw.state }).catch(() => undefined)
    return
  }
  return
})

function postSafe(port: chrome.runtime.Port, event: QuickActionEvent): void {
  try {
    port.postMessage(event)
  } catch {
    return
  }
}

async function runQuickAction(port: chrome.runtime.Port, request: QuickActionRequest, signal: AbortSignal): Promise<void> {
  let settings: Settings
  try {
    settings = await getSettings()
  } catch {
    postSafe(port, { kind: 'error', code: 'unknown', message: 'Briefly could not load its settings.' })
    return
  }
  if (!settings.apiKey) {
    postSafe(port, { kind: 'error', code: 'no-key', message: 'Add your Anthropic key in Briefly first.' })
    return
  }
  const req = buildRequest({
    model: request.model,
    mode: 'quick',
    system: request.system,
    messages: [{ role: 'user', content: [{ type: 'text', text: request.user }] }]
  })
  try {
    const result = await streamMessage(
      settings.apiKey,
      req,
      {
        onBlocks: (blocks) => postSafe(port, { kind: 'delta', text: textOfBlocks(blocks) })
      },
      signal
    )
    if (result.stopReason === 'refusal') {
      postSafe(port, { kind: 'error', code: 'refusal', message: 'Briefly declined this one.' })
      return
    }
    postSafe(port, { kind: 'done', full: textOfBlocks(result.blocks) })
  } catch (e) {
    if (e instanceof ApiError) {
      if (e.code === 'aborted') return
      postSafe(port, { kind: 'error', code: e.code, message: e.message })
    } else {
      postSafe(port, { kind: 'error', code: 'unknown', message: 'Something went wrong.' })
    }
  }
}

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === PORT_PANEL) {
    port.onMessage.addListener((raw) => {
      const msg = raw as PanelPortMessage
      if (msg.kind === 'hello') {
        panelPorts.set(msg.windowId, port)
        port.onDisconnect.addListener(() => {
          if (panelPorts.get(msg.windowId) === port) panelPorts.delete(msg.windowId)
        })
      }
    })
    return
  }
  if (port.name === PORT_QUICK_ACTION) {
    const aborter = new AbortController()
    port.onMessage.addListener((raw) => {
      const msg = raw as { kind?: string; request?: QuickActionRequest }
      if (msg.kind === 'run' && msg.request) {
        void runQuickAction(port, msg.request, aborter.signal)
      }
    })
    port.onDisconnect.addListener(() => aborter.abort())
  }
})
