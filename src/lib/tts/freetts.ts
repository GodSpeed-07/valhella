const BASE = 'https://freetts.org/api'

export type TtsFailure = 'rate-limit' | 'unavailable'

export class TtsError extends Error {
  reason: TtsFailure
  constructor(reason: TtsFailure, message: string) {
    super(message)
    this.reason = reason
  }
}

export interface FreettsVoice {
  id: string
  locale: string
  gender: string
  label: string
}

export function rateToParam(rate: number): string {
  const clamped = Math.max(-50, Math.min(100, Math.round(rate)))
  return `${clamped >= 0 ? '+' : ''}${clamped}%`
}

function resolveAudioUrl(body: Record<string, unknown>): string | null {
  const id = body.file_id ?? body.fileId ?? body.id
  if (typeof id === 'string' && id) return `${BASE}/audio/${id}`
  const url = body.url ?? body.audio_url ?? body.audioUrl
  if (typeof url === 'string' && url) {
    if (url.startsWith('http')) return url
    return `https://freetts.org${url.startsWith('/') ? '' : '/'}${url}`
  }
  const data = body.data
  if (data && typeof data === 'object') return resolveAudioUrl(data as Record<string, unknown>)
  return null
}

export async function synthesize(text: string, voiceId: string, rate: number): Promise<Blob> {
  let res: Response
  try {
    res = await fetch(`${BASE}/tts`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text, voice: voiceId, rate: rateToParam(rate), pitch: '+0Hz' })
    })
  } catch {
    throw new TtsError('unavailable', 'freetts unreachable')
  }
  if (res.status === 429) throw new TtsError('rate-limit', 'freetts rate limited')
  if (!res.ok) throw new TtsError('unavailable', `freetts responded ${res.status}`)
  let body: Record<string, unknown>
  try {
    body = (await res.json()) as Record<string, unknown>
  } catch {
    throw new TtsError('unavailable', 'freetts returned a non-JSON response')
  }
  const audioUrl = resolveAudioUrl(body)
  if (!audioUrl) throw new TtsError('unavailable', 'freetts response had no file id')
  let audioRes: Response
  try {
    audioRes = await fetch(audioUrl)
  } catch {
    throw new TtsError('unavailable', 'freetts audio unreachable')
  }
  if (audioRes.status === 429) throw new TtsError('rate-limit', 'freetts rate limited')
  if (!audioRes.ok) throw new TtsError('unavailable', `freetts audio responded ${audioRes.status}`)
  const blob = await audioRes.blob()
  if (blob.size === 0) throw new TtsError('unavailable', 'freetts returned empty audio')
  return blob
}

interface VoicesCache {
  at: number
  voices: FreettsVoice[]
}

export async function fetchVoices(): Promise<FreettsVoice[]> {
  const cached = (await chrome.storage.local.get('voicesCache')) as { voicesCache?: VoicesCache }
  if (cached.voicesCache && Date.now() - cached.voicesCache.at < 24 * 3600 * 1000 && cached.voicesCache.voices.length > 0) {
    return cached.voicesCache.voices
  }
  const res = await fetch(`${BASE}/voices`)
  if (!res.ok) throw new TtsError('unavailable', `voices responded ${res.status}`)
  const raw = (await res.json()) as Record<string, unknown>[]
  const voices: FreettsVoice[] = raw
    .map((v) => {
      const id = typeof v.ShortName === 'string' ? v.ShortName : typeof v.shortName === 'string' ? v.shortName : ''
      const locale = typeof v.Locale === 'string' ? v.Locale : id.split('-').slice(0, 2).join('-')
      const gender = typeof v.Gender === 'string' ? v.Gender : ''
      const friendly = typeof v.FriendlyName === 'string' ? v.FriendlyName : id
      const short = friendly.replace(/^Microsoft\s+/, '').replace(/\s+Online \(Natural\)/, '')
      return { id, locale, gender, label: short || id }
    })
    .filter((v) => v.id)
  if (voices.length > 0) {
    await chrome.storage.local.set({ voicesCache: { at: Date.now(), voices } satisfies VoicesCache })
  }
  return voices
}
