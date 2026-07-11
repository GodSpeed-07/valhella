import { useState } from 'react'
import { updateSettings } from '../../lib/settings'
import { validateKey } from '../../lib/anthropic/client'
import Button from '../../ui/Button'
import Icon from '../../ui/Icon'
import { Input } from '../../ui/Input'

export function KeyEditor({ onSaved }: { onSaved?: () => void }) {
  const [value, setValue] = useState('')
  const [show, setShow] = useState(false)
  const [state, setState] = useState<'idle' | 'checking' | 'ok' | 'bad'>('idle')
  const [message, setMessage] = useState('')

  const check = async () => {
    const key = value.trim()
    if (!key) return
    setState('checking')
    const res = await validateKey(key)
    if (res.ok) {
      await updateSettings({ apiKey: key })
      setState('ok')
      setMessage('Key verified and saved.')
      setValue('')
      onSaved?.()
    } else {
      setState('bad')
      setMessage(
        res.error.code === 'auth'
          ? "Anthropic rejected this key. Check it's copied whole."
          : res.error.code === 'network'
            ? "Couldn't reach the Anthropic API to verify."
            : res.error.message
      )
    }
  }

  return (
    <div className="keyed">
      <div className="keyed-row">
        <Input
          type={show ? 'text' : 'password'}
          placeholder="sk-ant-…"
          value={value}
          autoComplete="off"
          spellCheck={false}
          aria-invalid={state === 'bad'}
          onChange={(e) => {
            setValue(e.target.value)
            setState('idle')
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void check()
          }}
        />
        <button className="iconbtn keyed-eye" aria-label={show ? 'Hide key' : 'Show key'} onClick={() => setShow(!show)}>
          <Icon name={show ? 'eye-off' : 'eye'} size={15} />
        </button>
        <Button variant="primary" loading={state === 'checking'} disabled={!value.trim()} onClick={() => void check()}>
          Verify
        </Button>
      </div>
      {state === 'ok' && (
        <div className="keyed-note keyed-ok">
          <Icon name="check" size={13} />
          {message}
        </div>
      )}
      {state === 'bad' && (
        <div className="keyed-note keyed-bad">
          <Icon name="warning" size={13} />
          {message}
        </div>
      )}
    </div>
  )
}
