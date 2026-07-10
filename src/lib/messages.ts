import type { ModelId } from './models'
import type { ActuatorAction, ActuatorResult } from './agent/types'

export interface PageExtract {
  ok: true
  url: string
  title: string
  siteName: string | null
  byline: string | null
  text: string
  excerpt: string | null
  selection: string
  truncated: boolean
  wordCount: number
}

export interface PageExtractFailure {
  ok: false
  reason: 'empty' | 'error'
  url: string
  title: string
  selection: string
}

export type ExtractResponse = PageExtract | PageExtractFailure

export interface HandoffPayload {
  userText: string
  assistantText: string | null
  model: ModelId
  title: string | null
  autoSend: boolean
}

export type SpeakState = 'loading' | 'playing' | 'ended' | 'error'

export type ApiErrorCode =
  | 'no-key'
  | 'auth'
  | 'rate-limit'
  | 'overloaded'
  | 'bad-request'
  | 'network'
  | 'refusal'
  | 'aborted'
  | 'unknown'

export type TabMessage =
  | { kind: 'extract-page' }
  | { kind: 'agent-action'; action: ActuatorAction }
  | { kind: 'speak-state'; state: SpeakState }

export type RuntimeMessage =
  | { kind: 'panel-handoff'; payload: HandoffPayload }
  | { kind: 'popup-speak'; text: string }
  | { kind: 'popup-speak-stop' }
  | { kind: 'offscreen-speak'; text: string; voiceId: string; rate: number; requestTabId: number }
  | { kind: 'offscreen-stop' }
  | { kind: 'offscreen-state'; state: SpeakState; requestTabId: number }
  | { kind: 'open-panel' }

export const RUNTIME_KINDS = [
  'panel-handoff',
  'popup-speak',
  'popup-speak-stop',
  'offscreen-speak',
  'offscreen-stop',
  'offscreen-state',
  'open-panel'
] as const

export const TAB_KINDS = ['extract-page', 'agent-action', 'speak-state'] as const

export function isRuntimeMessage(v: unknown): v is RuntimeMessage {
  return (
    typeof v === 'object' &&
    v !== null &&
    'kind' in v &&
    (RUNTIME_KINDS as readonly string[]).includes(String((v as { kind: unknown }).kind))
  )
}

export function isTabMessage(v: unknown): v is TabMessage {
  return (
    typeof v === 'object' &&
    v !== null &&
    'kind' in v &&
    (TAB_KINDS as readonly string[]).includes(String((v as { kind: unknown }).kind))
  )
}

export interface QuickActionRequest {
  system: string
  user: string
  model: ModelId
}

export type QuickActionEvent =
  | { kind: 'delta'; text: string }
  | { kind: 'done'; full: string }
  | { kind: 'error'; code: ApiErrorCode; message: string }

export type PanelPortMessage = { kind: 'hello'; windowId: number }
export type PanelPortCommand = { kind: 'close' }

export const PORT_QUICK_ACTION = 'quick-action'
export const PORT_PANEL = 'panel'

export const SESSION_HANDOFF_KEY = 'handoff'

export async function sendToTab(tabId: number, msg: { kind: 'extract-page' }): Promise<ExtractResponse>
export async function sendToTab(tabId: number, msg: { kind: 'agent-action'; action: ActuatorAction }): Promise<ActuatorResult>
export async function sendToTab(tabId: number, msg: { kind: 'speak-state'; state: SpeakState }): Promise<unknown>
export async function sendToTab(tabId: number, msg: TabMessage): Promise<unknown> {
  return chrome.tabs.sendMessage(tabId, msg)
}

export function sendRuntime(msg: RuntimeMessage): Promise<unknown> {
  return chrome.runtime.sendMessage(msg)
}
