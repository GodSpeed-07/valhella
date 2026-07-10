import { DEFAULT_MODEL, type ModelId } from './models'

export type PermissionChoice = 'ask_first' | 'act_freely'
export type ThemeChoice = 'system' | 'light' | 'dark'

export interface CustomAction {
  id: string
  name: string
  prompt: string
}

export interface Settings {
  apiKey: string
  defaultModel: ModelId
  permissionMode: { default: PermissionChoice; perSite: Record<string, PermissionChoice> }
  voice: { id: string; rate: number }
  customActions: CustomAction[]
  siteContextBlocklist: string[]
  selectionPopupEnabled: boolean
  selectionPopupBlocklist: string[]
  theme: ThemeChoice
  onboardingDone: boolean
  ttsUsage: { month: string; chars: number }
  webSearchDefault: boolean
  ttsFallbackAt: number | null
}

export const DEFAULT_SETTINGS: Settings = {
  apiKey: '',
  defaultModel: DEFAULT_MODEL,
  permissionMode: { default: 'ask_first', perSite: {} },
  voice: { id: 'en-US-JennyNeural', rate: 0 },
  customActions: [],
  siteContextBlocklist: [],
  selectionPopupEnabled: true,
  selectionPopupBlocklist: [],
  theme: 'system',
  onboardingDone: false,
  ttsUsage: { month: '', chars: 0 },
  webSearchDefault: true,
  ttsFallbackAt: null
}

export async function getSettings(): Promise<Settings> {
  const stored = await chrome.storage.local.get(Object.keys(DEFAULT_SETTINGS))
  return { ...DEFAULT_SETTINGS, ...stored }
}

export async function updateSettings(patch: Partial<Settings>): Promise<void> {
  await chrome.storage.local.set(patch)
}

export function watchSettings(cb: (s: Settings) => void): () => void {
  const listener = (_changes: Record<string, chrome.storage.StorageChange>, area: string) => {
    if (area !== 'local') return
    void getSettings().then(cb)
  }
  chrome.storage.onChanged.addListener(listener)
  return () => chrome.storage.onChanged.removeListener(listener)
}

export function hostnameOf(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
    return u.hostname.toLowerCase()
  } catch {
    return null
  }
}

export function permissionFor(settings: Settings, hostname: string): PermissionChoice {
  return settings.permissionMode.perSite[hostname] ?? settings.permissionMode.default
}
