import { create } from 'zustand'
import { getSettings } from '../lib/settings'
import { Speaker, type SpeakStatus } from '../lib/tts/player'

interface TtsStore {
  messageId: string | null
  status: SpeakStatus
}

export const useTts = create<TtsStore>(() => ({
  messageId: null,
  status: { phase: 'idle', fraction: 0, fallback: false }
}))

const speaker = new Speaker((status) => {
  useTts.setState((state) => ({
    status,
    messageId: status.phase === 'idle' ? null : state.messageId
  }))
})

export async function speakMessage(messageId: string, text: string): Promise<void> {
  const settings = await getSettings()
  useTts.setState({ messageId })
  await speaker.speak(text, settings.voice)
}

export function pauseSpeech(): void {
  speaker.pause()
}

export function resumeSpeech(): void {
  speaker.resume()
}

export function stopSpeech(): void {
  speaker.stop()
}
