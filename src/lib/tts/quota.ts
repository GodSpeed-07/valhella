import { getSettings, updateSettings } from '../settings'

export const MONTHLY_LIMIT = 60000
export const SOFT_LIMIT = 55000

export interface TtsUsage {
  month: string
  chars: number
}

export function currentMonth(now: Date = new Date()): string {
  return now.toISOString().slice(0, 7)
}

export function rollLedger(usage: TtsUsage, now: Date = new Date()): TtsUsage {
  const month = currentMonth(now)
  if (usage.month !== month) return { month, chars: 0 }
  return usage
}

export function addChars(usage: TtsUsage, n: number, now: Date = new Date()): TtsUsage {
  const rolled = rollLedger(usage, now)
  return { month: rolled.month, chars: rolled.chars + Math.max(0, n) }
}

export function wouldExceed(usage: TtsUsage, n: number, limit: number = SOFT_LIMIT, now: Date = new Date()): boolean {
  const rolled = rollLedger(usage, now)
  return rolled.chars + n > limit
}

export async function getUsage(): Promise<TtsUsage> {
  const settings = await getSettings()
  return rollLedger(settings.ttsUsage)
}

export async function recordChars(n: number): Promise<void> {
  const settings = await getSettings()
  await updateSettings({ ttsUsage: addChars(settings.ttsUsage, n) })
}

export async function noteFallback(): Promise<void> {
  await updateSettings({ ttsFallbackAt: Date.now() })
}
