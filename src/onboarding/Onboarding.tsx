import { useEffect, useState } from 'react'
import { updateSettings } from '../lib/settings'
import { validateKey } from '../lib/anthropic/client'
import { MODEL_LIST } from '../lib/models'
import Button from '../ui/Button'
import Icon from '../ui/Icon'
import { Input } from '../ui/Input'
import './onboarding.css'

type KeyState = 'idle' | 'checking' | 'ok' | 'bad'
type MicState = 'idle' | 'granted' | 'denied'

export default function Onboarding() {
  const [key, setKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [keyState, setKeyState] = useState<KeyState>('idle')
  const [keyMessage, setKeyMessage] = useState('')
  const [mic, setMic] = useState<MicState>('idle')
  const [windowId, setWindowId] = useState<number | null>(null)
  const [opened, setOpened] = useState(false)

  useEffect(() => {
    void updateSettings({ onboardingDone: true })
    void chrome.windows.getCurrent().then((w) => setWindowId(w.id ?? null))
    void navigator.permissions
      .query({ name: 'microphone' as PermissionName })
      .then((status) => {
        if (status.state === 'granted') setMic('granted')
      })
      .catch(() => undefined)
  }, [])

  const check = async () => {
    const k = key.trim()
    if (!k) return
    setKeyState('checking')
    const res = await validateKey(k)
    if (res.ok) {
      await updateSettings({ apiKey: k })
      const missing = MODEL_LIST.filter((m) => !res.modelIds.includes(m.id))
      setKeyState('ok')
      setKeyMessage(
        missing.length === 0
          ? 'Key verified — all three models are available.'
          : 'Key verified and saved.'
      )
    } else {
      setKeyState('bad')
      setKeyMessage(
        res.error.code === 'auth'
          ? "Anthropic rejected this key. Check it's copied whole, starting with sk-ant-."
          : res.error.code === 'network'
            ? "Couldn't reach the Anthropic API — check your connection and try again."
            : res.error.message
      )
    }
  }

  const enableMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach((t) => t.stop())
      setMic('granted')
    } catch {
      setMic('denied')
    }
  }

  const openPanel = () => {
    if (windowId !== null) {
      void chrome.sidePanel.open({ windowId })
      setOpened(true)
      window.setTimeout(() => window.close(), 400)
    }
  }

  return (
    <div className="ob">
      <main className="ob-card">
        <header className="ob-brand">
          <svg className="ob-mark" viewBox="0 0 128 128" aria-hidden="true">
            <rect width="128" height="128" rx="28" fill="var(--accent)" />
            <rect x="28" y="36" width="72" height="11" rx="5.5" fill="var(--paper-raised)" />
            <rect x="28" y="58" width="50" height="11" rx="5.5" fill="var(--paper-raised)" />
            <rect x="28" y="80" width="62" height="11" rx="5.5" fill="var(--accent-soft)" />
          </svg>
          <h1 className="ob-title">Briefly</h1>
          <p className="ob-tag">A calm AI companion for your browser — running on your own Anthropic key.</p>
        </header>

        <section className="ob-step">
          <div className="ob-step-head">
            <span className="ob-step-n">1</span>
            <h2>Add your Anthropic API key</h2>
          </div>
          <p className="ob-step-sub">
            Stored only in this browser. Sent only to api.anthropic.com.{' '}
            <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer">
              Get a key
            </a>
          </p>
          <div className="ob-keyrow">
            <Input
              type={showKey ? 'text' : 'password'}
              placeholder="sk-ant-…"
              value={key}
              autoComplete="off"
              spellCheck={false}
              aria-invalid={keyState === 'bad'}
              onChange={(e) => {
                setKey(e.target.value)
                setKeyState('idle')
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void check()
              }}
            />
            <button
              className="iconbtn"
              aria-label={showKey ? 'Hide key' : 'Show key'}
              onClick={() => setShowKey(!showKey)}
            >
              <Icon name={showKey ? 'eye-off' : 'eye'} size={15} />
            </button>
            <Button
              variant="primary"
              loading={keyState === 'checking'}
              disabled={!key.trim() || keyState === 'ok'}
              onClick={() => void check()}
            >
              {keyState === 'ok' ? 'Saved' : 'Verify'}
            </Button>
          </div>
          {keyState === 'ok' && (
            <p className="ob-note ob-ok">
              <Icon name="check" size={13} />
              {keyMessage}
            </p>
          )}
          {keyState === 'bad' && (
            <p className="ob-note ob-bad">
              <Icon name="warning" size={13} />
              {keyMessage}
            </p>
          )}
        </section>

        <section className="ob-step">
          <div className="ob-step-head">
            <span className="ob-step-n">2</span>
            <h2>Allow the microphone (optional)</h2>
          </div>
          <p className="ob-step-sub">For voice dictation in the composer. You can skip this and enable it later.</p>
          {mic === 'granted' ? (
            <p className="ob-note ob-ok">
              <Icon name="check" size={13} />
              Microphone enabled.
            </p>
          ) : (
            <>
              <Button icon="mic" onClick={() => void enableMic()}>
                Enable microphone
              </Button>
              {mic === 'denied' && (
                <p className="ob-note ob-bad">
                  <Icon name="warning" size={13} />
                  Chrome blocked it. Click the mic icon in the address bar to allow, then try again.
                </p>
              )}
            </>
          )}
        </section>

        <section className="ob-step">
          <div className="ob-step-head">
            <span className="ob-step-n">3</span>
            <h2>Three ways to use Briefly</h2>
          </div>
          <ul className="ob-tour">
            <li>
              <Icon name="page" size={16} />
              <span>
                <strong>The side panel</strong> chats about the page you're on — with live web search and citations.
              </span>
            </li>
            <li>
              <Icon name="sparkle" size={16} />
              <span>
                <strong>Highlight any text</strong> and a quiet pill offers Summarize, Explain, Translate and more.
              </span>
            </li>
            <li>
              <Icon name="bolt" size={16} />
              <span>
                <strong>Agent mode</strong> clicks, types, and navigates pages for you — narrating every step.
              </span>
            </li>
          </ul>
        </section>

        <footer className="ob-footer">
          <Button variant="primary" size="lg" disabled={keyState !== 'ok' || opened} onClick={openPanel}>
            {opened ? 'Opening…' : 'Open Briefly'}
          </Button>
          <span className="ob-skip">
            {keyState !== 'ok' && 'You can also close this tab and add a key later from the panel.'}
          </span>
        </footer>
      </main>
    </div>
  )
}
