interface RecognitionAlternative {
  transcript: string
}

interface RecognitionResult {
  isFinal: boolean
  0: RecognitionAlternative
  length: number
}

interface RecognitionResultList {
  length: number
  [index: number]: RecognitionResult
}

interface RecognitionEvent {
  resultIndex: number
  results: RecognitionResultList
}

interface RecognitionErrorEvent {
  error: string
}

interface Recognition {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((e: RecognitionEvent) => void) | null
  onerror: ((e: RecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}

declare global {
  interface Window {
    webkitSpeechRecognition?: new () => Recognition
    SpeechRecognition?: new () => Recognition
  }
}

export type DictationError = 'not-allowed' | 'network' | 'unsupported'

export interface DictationHandlers {
  onText(finalText: string, interim: string): void
  onStop(): void
  onError(code: DictationError): void
}

export function dictationSupported(): boolean {
  return Boolean(window.SpeechRecognition ?? window.webkitSpeechRecognition)
}

export class Dictation {
  private rec: Recognition | null = null
  private active = false
  private finalText = ''

  start(handlers: DictationHandlers): void {
    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition
    if (!Ctor) {
      handlers.onError('unsupported')
      return
    }
    this.finalText = ''
    this.active = true
    const rec = new Ctor()
    this.rec = rec
    rec.continuous = true
    rec.interimResults = true
    rec.lang = navigator.language || 'en-US'
    rec.onresult = (e) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i]
        if (!result) continue
        const transcript = result[0]?.transcript ?? ''
        if (result.isFinal) {
          this.finalText += transcript
        } else {
          interim += transcript
        }
      }
      handlers.onText(this.finalText, interim)
    }
    rec.onerror = (e) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return
      this.active = false
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        handlers.onError('not-allowed')
      } else if (e.error === 'network') {
        handlers.onError('network')
      } else {
        handlers.onError('network')
      }
    }
    rec.onend = () => {
      if (this.active) {
        try {
          rec.start()
        } catch {
          this.active = false
          handlers.onStop()
        }
      } else {
        handlers.onStop()
      }
    }
    try {
      rec.start()
    } catch {
      this.active = false
      handlers.onError('unsupported')
    }
  }

  stop(): void {
    this.active = false
    this.rec?.stop()
  }

  isActive(): boolean {
    return this.active
  }
}
