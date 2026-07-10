import { hostnameOf, type Settings } from './settings'
import type { ExtractResponse, PageExtract } from './messages'

export type PageContextState =
  | { status: 'none' }
  | { status: 'ready'; page: PageExtract; favIconUrl: string | null }
  | { status: 'removed'; page: PageExtract; favIconUrl: string | null }
  | { status: 'blocked'; host: string }
  | { status: 'unreadable'; title: string; reason: 'restricted' | 'no-access' | 'empty' }

export async function readActivePage(settings: Settings): Promise<PageContextState> {
  let tab: chrome.tabs.Tab | undefined
  try {
    ;[tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  } catch {
    return { status: 'none' }
  }
  if (!tab || tab.id === undefined) return { status: 'none' }
  const url = tab.url ?? ''
  const host = hostnameOf(url)
  if (!host) {
    return { status: 'unreadable', title: tab.title || 'This page', reason: 'restricted' }
  }
  if (settings.siteContextBlocklist.includes(host)) {
    return { status: 'blocked', host }
  }
  try {
    const res = (await chrome.tabs.sendMessage(tab.id, { kind: 'extract-page' })) as ExtractResponse | undefined
    if (!res) {
      return { status: 'unreadable', title: tab.title || host, reason: 'no-access' }
    }
    if (res.ok) {
      return { status: 'ready', page: res, favIconUrl: tab.favIconUrl ?? null }
    }
    if (res.selection) {
      const page: PageExtract = {
        ok: true,
        url: res.url,
        title: res.title || host,
        siteName: null,
        byline: null,
        text: '',
        excerpt: null,
        selection: res.selection,
        truncated: false,
        wordCount: 0
      }
      return { status: 'ready', page, favIconUrl: tab.favIconUrl ?? null }
    }
    return { status: 'unreadable', title: res.title || host, reason: 'empty' }
  } catch {
    return { status: 'unreadable', title: tab.title || host, reason: 'no-access' }
  }
}

export function unreadableCopy(reason: 'restricted' | 'no-access' | 'empty'): string {
  switch (reason) {
    case 'restricted':
      return "Chrome protects this page — Briefly can't read it"
    case 'no-access':
      return "Can't read this tab — try reloading it"
    case 'empty':
      return 'Nothing readable on this page'
  }
}
