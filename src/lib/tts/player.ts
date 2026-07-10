import { speakableText } from './speakable'
import { chunkText } from './chunker'
import { synthesize, TtsError } from './freetts'
import { cacheKey, getCached, putCached } from './cache'
import { getUsage, noteFallback, recordChars, wouldExceed } from './quota'
import { speakWithSynthesis, type SynthesisHandle } from './fallback'

export type SpeakPhase = 'idle' | 'loading' | 'playing' | 'paused'

export interface SpeakStatus {
  phase: SpeakPhase
  fraction: number
  fallback: boolean
}

type ChunkResult = { kind: 'blob'; blob: Blob } | { kind: 'fallback' }

const MIN_REQUEST_GAP = 3200
let lastRequestAt = 0

async function throttle(): Promise<void> {
  const wait = lastRequestAt + MIN_REQUEST_GAP - Date.now()
  if (wait > 0) await new Promise((r) => setTimeout(r, wait))
  lastRequestAt = Date.now()
}

export class Speaker {
  private session = 0
  private audio: HTMLAudioElement | null = null
  private synthHandle: SynthesisHandle | null = null
  private phase: SpeakPhase = 'idle'
  private fallback = false
  private chunkCount = 1
  private chunkIndex = 0
  private audioFraction = 0

  constructor(private onStatus: (s: SpeakStatus) => void) {}

  private emit(): void {
    const base = this.chunkCount === 0 ? 0 : (this.chunkIndex + this.audioFraction) / this.chunkCount
    this.onStatus({ phase: this.phase, fraction: Math.max(0, Math.min(1, base)), fallback: this.fallback })
  }

  private setPhase(phase: SpeakPhase): void {
    this.phase = phase
    this.emit()
  }

  async speak(text: string, voice: { id: string; rate: number }): Promise<void> {
    this.stop()
    const mySession = ++this.session
    const chunks = chunkText(speakableText(text))
    if (chunks.length === 0) return
    this.chunkCount = chunks.length
    this.chunkIndex = 0
    this.audioFraction = 0
    this.fallback = false
    this.setPhase('loading')

    const pending = new Map<number, Promise<ChunkResult>>()
    const fetchChunk = (i: number): Promise<ChunkResult> => {
      const existing = pending.get(i)
      if (existing) return existing
      const chunk = chunks[i]
      const p: Promise<ChunkResult> = (async () => {
        if (chunk === undefined) return { kind: 'fallback' }
        const hash = await cacheKey(voice.id, voice.rate, chunk)
        const cached = await getCached(hash)
        if (cached) return { kind: 'blob', blob: cached }
        const usage = await getUsage()
        if (wouldExceed(usage, chunk.length)) {
          await noteFallback()
          return { kind: 'fallback' }
        }
        try {
          await throttle()
          const blob = await synthesize(chunk, voice.id, voice.rate)
          await recordChars(chunk.length)
          await putCached(hash, blob)
          return { kind: 'blob', blob }
        } catch (e) {
          if (e instanceof TtsError) await noteFallback()
          return { kind: 'fallback' }
        }
      })()
      pending.set(i, p)
      return p
    }

    for (let i = 0; i < chunks.length; i++) {
      if (this.session !== mySession) return
      void fetchChunk(Math.min(i + 1, chunks.length - 1))
      const result = await fetchChunk(i)
      if (this.session !== mySession) return
      this.chunkIndex = i
      this.audioFraction = 0
      if (result.kind === 'fallback') {
        this.fallback = true
        await this.speakRest(chunks.slice(i), voice, mySession, i)
        if (this.session === mySession) this.finish()
        return
      }
      const ok = await this.playBlob(result.blob, mySession)
      if (!ok || this.session !== mySession) return
    }
    this.finish()
  }

  private finish(): void {
    this.chunkIndex = this.chunkCount
    this.audioFraction = 0
    this.setPhase('idle')
  }

  private playBlob(blob: Blob, mySession: number): Promise<boolean> {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      this.audio = audio
      audio.addEventListener('timeupdate', () => {
        if (this.session !== mySession) return
        if (audio.duration > 0) {
          this.audioFraction = audio.currentTime / audio.duration
          if (this.phase === 'playing') this.emit()
        }
      })
      audio.addEventListener('ended', () => {
        URL.revokeObjectURL(url)
        if (this.audio === audio) this.audio = null
        resolve(true)
      })
      audio.addEventListener('error', () => {
        URL.revokeObjectURL(url)
        if (this.audio === audio) this.audio = null
        resolve(false)
      })
      this.setPhase('playing')
      void audio.play().catch(() => resolve(false))
    })
  }

  private speakRest(rest: string[], voice: { id: string; rate: number }, mySession: number, baseIndex: number): Promise<void> {
    return new Promise((resolve) => {
      this.setPhase('playing')
      this.synthHandle = speakWithSynthesis(rest, voice.id, voice.rate, {
        onChunk: (i) => {
          if (this.session !== mySession) return
          this.chunkIndex = baseIndex + i
          this.audioFraction = 0
          this.emit()
        },
        onEnd: () => {
          this.synthHandle = null
          resolve()
        }
      })
    })
  }

  pause(): void {
    if (this.phase !== 'playing') return
    if (this.synthHandle) this.synthHandle.pause()
    this.audio?.pause()
    this.setPhase('paused')
  }

  resume(): void {
    if (this.phase !== 'paused') return
    if (this.synthHandle) this.synthHandle.resume()
    void this.audio?.play().catch(() => undefined)
    this.setPhase('playing')
  }

  stop(): void {
    this.session += 1
    if (this.synthHandle) {
      this.synthHandle.cancel()
      this.synthHandle = null
    }
    if (this.audio) {
      this.audio.pause()
      this.audio.src = ''
      this.audio = null
    }
    if (this.phase !== 'idle') {
      this.chunkIndex = 0
      this.audioFraction = 0
      this.setPhase('idle')
    }
  }
}
