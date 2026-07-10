export interface SynthesisHandle {
  pause(): void
  resume(): void
  cancel(): void
}

export interface SynthesisHooks {
  onChunk(index: number): void
  onEnd(): void
}

function pickVoice(localePrefix: string): SpeechSynthesisVoice | null {
  const voices = speechSynthesis.getVoices()
  const exact = voices.find((v) => v.lang.toLowerCase() === localePrefix.toLowerCase())
  if (exact) return exact
  const lang = localePrefix.split('-')[0]?.toLowerCase() ?? ''
  return voices.find((v) => v.lang.toLowerCase().startsWith(lang)) ?? null
}

async function voicesReady(): Promise<void> {
  if (speechSynthesis.getVoices().length > 0) return
  await new Promise<void>((resolve) => {
    const t = window.setTimeout(resolve, 500)
    speechSynthesis.addEventListener(
      'voiceschanged',
      () => {
        window.clearTimeout(t)
        resolve()
      },
      { once: true }
    )
  })
}

export function synthesisRate(percent: number): number {
  return Math.max(0.5, Math.min(2, 1 + percent / 100))
}

export function localeOfVoiceId(voiceId: string): string {
  const parts = voiceId.split('-')
  if (parts.length >= 2) return `${parts[0]}-${parts[1]}`
  return navigator.language || 'en-US'
}

export function speakWithSynthesis(
  chunks: string[],
  voiceId: string,
  ratePercent: number,
  hooks: SynthesisHooks
): SynthesisHandle {
  let cancelled = false
  let index = 0

  const speakNext = () => {
    if (cancelled || index >= chunks.length) {
      if (!cancelled) hooks.onEnd()
      return
    }
    const u = new SpeechSynthesisUtterance(chunks[index])
    const voice = pickVoice(localeOfVoiceId(voiceId))
    if (voice) u.voice = voice
    u.rate = synthesisRate(ratePercent)
    u.onend = () => {
      index += 1
      speakNext()
    }
    u.onerror = () => {
      index += 1
      speakNext()
    }
    hooks.onChunk(index)
    speechSynthesis.speak(u)
  }

  void voicesReady().then(() => {
    if (!cancelled) speakNext()
  })

  return {
    pause: () => speechSynthesis.pause(),
    resume: () => speechSynthesis.resume(),
    cancel: () => {
      cancelled = true
      speechSynthesis.cancel()
    }
  }
}
