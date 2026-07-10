import { prepareImage } from '../images'
import { sendToTab } from '../messages'
import type { ActuatorAction, ActuatorResult } from './types'
import type { AnyBlock, ToolUseBlock } from '../anthropic/types'

export interface ExecOutcome {
  blocks: AnyBlock[]
  outcome: string
  isError: boolean
  refusal: 'password' | 'payment' | null
  imageThumb: string | null
}

export interface ExecContext {
  getTabId(): number | null
  setTabId(id: number): void
  consumePaymentApproval(): boolean
}

function text(outcome: string, snapshot?: string | null): AnyBlock[] {
  const blocks: AnyBlock[] = [{ type: 'text', text: outcome }]
  if (snapshot) blocks.push({ type: 'text', text: `\n\n${snapshot}` })
  return blocks
}

function ok(outcome: string, snapshot: string | null = null): ExecOutcome {
  return { blocks: text(outcome, snapshot), outcome, isError: false, refusal: null, imageThumb: null }
}

function err(outcome: string, snapshot: string | null = null): ExecOutcome {
  return { blocks: text(outcome, snapshot), outcome, isError: true, refusal: null, imageThumb: null }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

function waitForLoad(tabId: number, timeoutMs = 12000): Promise<void> {
  return new Promise((resolve) => {
    let finished = false
    const finish = () => {
      if (finished) return
      finished = true
      chrome.tabs.onUpdated.removeListener(listener)
      window.clearTimeout(timer)
      resolve()
    }
    const listener = (id: number, info: chrome.tabs.TabChangeInfo) => {
      if (id === tabId && info.status === 'complete') finish()
    }
    const timer = window.setTimeout(finish, timeoutMs)
    chrome.tabs.onUpdated.addListener(listener)
    void chrome.tabs.get(tabId).then((tab) => {
      if (tab.status === 'complete') finish()
    }).catch(finish)
  })
}

async function actuate(tabId: number, action: ActuatorAction): Promise<ActuatorResult | 'gone'> {
  try {
    const result = await Promise.race([
      sendToTab(tabId, { kind: 'agent-action', action }),
      sleep(9000).then(() => 'timeout' as const)
    ])
    if (result === 'timeout' || result === undefined || result === null) return 'gone'
    return result as ActuatorResult
  } catch {
    return 'gone'
  }
}

async function snapshotAfterNavigation(tabId: number, note: string): Promise<ExecOutcome> {
  await waitForLoad(tabId)
  await sleep(700)
  const tab = await chrome.tabs.get(tabId).catch(() => null)
  const where = tab?.url ? ` Now at ${tab.url.slice(0, 160)}.` : ''
  const snap = await actuate(tabId, { tool: 'read_page' })
  if (snap === 'gone' || !snap.snapshot) {
    return ok(`${note}${where} This page can't be read by Briefly (it may be a browser-internal or protected page).`)
  }
  return ok(`${note}${where}`, snap.snapshot)
}

function normalizeUrl(raw: string): string | null {
  let url = raw.trim()
  if (!/^[a-z][a-z0-9+.-]*:/i.test(url)) url = `https://${url}`
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
    return parsed.href
  } catch {
    return null
  }
}

export async function executeTool(tool: ToolUseBlock, ctx: ExecContext): Promise<ExecOutcome> {
  const input = tool.input ?? {}
  const tabId = ctx.getTabId()

  switch (tool.name) {
    case 'read_page':
    case 'click':
    case 'type_text':
    case 'select_option':
    case 'scroll': {
      if (tabId === null) return err('No working tab. Use navigate or open_tab first.')
      let action: ActuatorAction
      if (tool.name === 'read_page') action = { tool: 'read_page' }
      else if (tool.name === 'click') {
        action = { tool: 'click', elementId: Number(input.element_id) }
        if (ctx.consumePaymentApproval()) action.approvedPayment = true
      } else if (tool.name === 'type_text') {
        action = {
          tool: 'type_text',
          elementId: Number(input.element_id),
          text: String(input.text ?? ''),
          pressEnter: Boolean(input.press_enter)
        }
      } else if (tool.name === 'select_option') {
        action = { tool: 'select_option', elementId: Number(input.element_id), value: String(input.value ?? '') }
      } else {
        action = {
          tool: 'scroll',
          direction: input.direction === 'up' ? 'up' : 'down',
          ...(input.element_id !== undefined ? { elementId: Number(input.element_id) } : {})
        }
      }
      const result = await actuate(tabId, action)
      if (result === 'gone') {
        if (tool.name === 'click' || tool.name === 'type_text') {
          return snapshotAfterNavigation(tabId, 'The action triggered a page change.')
        }
        return err("Couldn't reach this page — it may be protected, still loading, or need a reload. Try navigate, or tell the user.")
      }
      const out: ExecOutcome = {
        blocks: text(result.outcome, result.snapshot),
        outcome: result.outcome,
        isError: !result.ok,
        refusal: result.refusal,
        imageThumb: null
      }
      return out
    }
    case 'screenshot': {
      if (tabId === null) return err('No working tab to capture.')
      try {
        const tab = await chrome.tabs.get(tabId)
        if (!tab.active) await chrome.tabs.update(tabId, { active: true })
        const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'jpeg', quality: 85 })
        const img = await prepareImage(dataUrl)
        return {
          blocks: [
            { type: 'text', text: 'Screenshot of the visible page:' },
            { type: 'image', source: { type: 'base64', media_type: img.mediaType, data: img.data } }
          ],
          outcome: 'Took a screenshot.',
          isError: false,
          refusal: null,
          imageThumb: `data:${img.mediaType};base64,${img.data}`
        }
      } catch {
        return err("Couldn't capture this page — Chrome blocks screenshots here.")
      }
    }
    case 'navigate': {
      const url = normalizeUrl(String(input.url ?? ''))
      if (!url) return err('That URL is not navigable. Use a full http or https address.')
      let target = tabId
      if (target === null) {
        const tab = await chrome.tabs.create({ url, active: true })
        if (tab.id === undefined) return err('Could not open a tab.')
        ctx.setTabId(tab.id)
        return snapshotAfterNavigation(tab.id, `Opened ${url.slice(0, 120)} in a new tab.`)
      }
      try {
        await chrome.tabs.update(target, { url })
      } catch {
        return err('The working tab is gone. Use open_tab to start a fresh one.')
      }
      return snapshotAfterNavigation(target, `Navigated to ${url.slice(0, 120)}.`)
    }
    case 'go_back': {
      if (tabId === null) return err('No working tab.')
      try {
        await chrome.tabs.goBack(tabId)
      } catch {
        return err("Can't go back — there's no earlier page in this tab's history.")
      }
      return snapshotAfterNavigation(tabId, 'Went back.')
    }
    case 'wait': {
      const seconds = Math.max(0, Math.min(5, Number(input.seconds) || 1))
      await sleep(seconds * 1000)
      return ok(`Waited ${seconds}s.`)
    }
    case 'list_tabs': {
      const tabs = await chrome.tabs.query({ currentWindow: true })
      const lines = tabs
        .filter((t) => t.id !== undefined)
        .map((t) => {
          const marker = t.id === tabId ? ' (working tab)' : t.active ? ' (active)' : ''
          return `[tab ${t.id}] ${(t.title ?? 'Untitled').slice(0, 60)} — ${(t.url ?? '').slice(0, 80)}${marker}`
        })
      return ok(`Open tabs in this window:\n${lines.join('\n')}`)
    }
    case 'open_tab': {
      const url = normalizeUrl(String(input.url ?? ''))
      if (!url) return err('That URL is not navigable. Use a full http or https address.')
      const tab = await chrome.tabs.create({ url, active: true })
      if (tab.id === undefined) return err('Could not open a tab.')
      ctx.setTabId(tab.id)
      return snapshotAfterNavigation(tab.id, `Opened a new tab at ${url.slice(0, 120)}. It is now the working tab.`)
    }
    case 'switch_tab': {
      const target = Number(input.tab_id)
      try {
        const tab = await chrome.tabs.get(target)
        if (tab.id === undefined) throw new Error('no id')
        await chrome.tabs.update(tab.id, { active: true })
        ctx.setTabId(tab.id)
        return snapshotAfterNavigation(tab.id, `Switched to tab ${tab.id} (${(tab.title ?? '').slice(0, 60)}). It is now the working tab.`)
      } catch {
        return err(`No tab with id ${target}. Use list_tabs to see what's open.`)
      }
    }
    default:
      return err(`Unknown tool "${tool.name}".`)
  }
}
