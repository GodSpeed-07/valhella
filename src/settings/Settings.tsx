import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { db, newId } from '../lib/db'
import { allDataToJson, downloadFile } from '../lib/export'
import {
  getSettings,
  updateSettings,
  watchSettings,
  type CustomAction,
  type PermissionChoice,
  type Settings,
  type ThemeChoice
} from '../lib/settings'
import { fetchVoices, type FreettsVoice } from '../lib/tts/freetts'
import { MONTHLY_LIMIT, rollLedger } from '../lib/tts/quota'
import Button from '../ui/Button'
import Dialog from '../ui/Dialog'
import Icon, { type IconName } from '../ui/Icon'
import IconButton from '../ui/IconButton'
import { Field, Input, Textarea } from '../ui/Input'
import Spinner from '../ui/Spinner'
import Toggle from '../ui/Toggle'
import { KeyEditor } from '../sidepanel/components/KeyEditor'
import { speakMessage, stopSpeech, useTts } from '../sidepanel/tts'

type NavId = 'general' | 'permissions' | 'voice' | 'actions' | 'data'

const NAV: { id: NavId; label: string; icon: IconName }[] = [
  { id: 'general', label: 'General', icon: 'sliders' },
  { id: 'permissions', label: 'Permissions', icon: 'shield' },
  { id: 'voice', label: 'Voice', icon: 'speaker' },
  { id: 'actions', label: 'Actions', icon: 'sparkle' },
  { id: 'data', label: 'Data', icon: 'download' }
]

function maskKey(key: string): string {
  if (key.length <= 10) return '••••••••'
  return `${key.slice(0, 7)}…${key.slice(-4)}`
}

function languageName(locale: string): string {
  try {
    const name = new Intl.DisplayNames(['en'], { type: 'language' }).of(locale.split('-')[0] ?? '')
    return name ?? locale
  } catch {
    return locale
  }
}

function useSettings(): Settings | null {
  const [settings, setSettings] = useState<Settings | null>(null)
  useEffect(() => {
    let alive = true
    void getSettings().then((s) => {
      if (alive) setSettings(s)
    })
    const unwatch = watchSettings((s) => setSettings(s))
    return () => {
      alive = false
      unwatch()
    }
  }, [])
  return settings
}

function Card({
  title,
  desc,
  control,
  children
}: {
  title: string
  desc?: string
  control?: ReactNode
  children?: ReactNode
}) {
  return (
    <section className="st-card">
      <div className="st-card-top">
        <div className="st-card-heading">
          <h3 className="st-card-title">{title}</h3>
          {desc && <p className="st-card-desc">{desc}</p>}
        </div>
        {control && <div className="st-card-control">{control}</div>}
      </div>
      {children && <div className="st-card-body">{children}</div>}
    </section>
  )
}

function Seg<T extends string>({
  value,
  options,
  onChange,
  ariaLabel
}: {
  value: T
  options: [T, IconName, string][]
  onChange: (v: T) => void
  ariaLabel: string
}) {
  return (
    <div className="st-seg" role="radiogroup" aria-label={ariaLabel}>
      {options.map(([val, icon, label]) => (
        <button
          key={val}
          className={`st-seg-btn${value === val ? ' on' : ''}`}
          role="radio"
          aria-checked={value === val}
          onClick={() => onChange(val)}
        >
          <Icon name={icon} size={13} />
          {label}
        </button>
      ))}
    </div>
  )
}

function SiteList({
  hosts,
  tag,
  onRemove,
  removeLabel
}: {
  hosts: string[]
  tag?: (host: string) => string
  onRemove: (host: string) => void
  removeLabel: (host: string) => string
}) {
  return (
    <ul className="st-list">
      {hosts.map((host) => (
        <li key={host} className="st-list-row">
          <span className="st-list-host">{host}</span>
          {tag && <span className="st-list-tag">{tag(host)}</span>}
          <IconButton icon="x" label={removeLabel(host)} size="sm" onClick={() => onRemove(host)} />
        </li>
      ))}
    </ul>
  )
}

function GeneralSection({ settings }: { settings: Settings }) {
  const [editingKey, setEditingKey] = useState(false)
  return (
    <>
      <Card title="Anthropic API key" desc="Stored only in this browser's extension storage and sent only to api.anthropic.com.">
        {settings.apiKey && !editingKey ? (
          <div className="st-keyrow">
            <span className="st-keymask">{maskKey(settings.apiKey)}</span>
            <Button size="sm" onClick={() => setEditingKey(true)}>
              Replace
            </Button>
          </div>
        ) : (
          <KeyEditor onSaved={() => setEditingKey(false)} />
        )}
      </Card>

      <Card title="Appearance" desc="Match your system, or lock Briefly to light or dark.">
        <Seg<ThemeChoice>
          value={settings.theme}
          ariaLabel="Theme"
          options={[
            ['system', 'monitor', 'System'],
            ['light', 'sun', 'Light'],
            ['dark', 'moon', 'Dark']
          ]}
          onChange={(theme) => void updateSettings({ theme })}
        />
      </Card>

      <Card title="Keyboard shortcut" desc="Toggle the Briefly side panel from any page.">
        <span className="st-shortcut">
          <span className="kbd">Alt</span>
          <span className="kbd">B</span>
        </span>
      </Card>
    </>
  )
}

function MicCard() {
  const [mic, setMic] = useState<'idle' | 'granted' | 'denied'>('idle')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void navigator.permissions
      .query({ name: 'microphone' as PermissionName })
      .then((status) => {
        if (status.state === 'granted') setMic('granted')
      })
      .catch(() => undefined)
  }, [])

  const enable = async () => {
    setBusy(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach((t) => t.stop())
      setMic('granted')
    } catch {
      setMic('denied')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card title="Microphone" desc="Enable microphone access to dictate messages with your voice in the composer.">
      {mic === 'granted' ? (
        <div className="st-status st-status-ok">
          <span className="st-status-dot">
            <Icon name="check" size={12} />
          </span>
          <div>
            <div className="st-status-title">Microphone access granted</div>
            <div className="st-status-sub">You can now dictate. To revoke it, use Chrome's site settings.</div>
          </div>
        </div>
      ) : (
        <div className="st-stack">
          <Button icon="mic" loading={busy} onClick={() => void enable()}>
            Enable microphone
          </Button>
          {mic === 'denied' && (
            <p className="st-note st-note-bad">
              <Icon name="warning" size={13} />
              Chrome blocked it. Click the mic icon in the address bar to allow, then try again.
            </p>
          )}
        </div>
      )}
    </Card>
  )
}

function PermissionsSection({ settings }: { settings: Settings }) {
  const perSite = Object.entries(settings.permissionMode.perSite)
  const setDefault = (value: PermissionChoice) =>
    void updateSettings({ permissionMode: { ...settings.permissionMode, default: value } })
  const removePerSite = (host: string) => {
    const next = { ...settings.permissionMode.perSite }
    delete next[host]
    void updateSettings({ permissionMode: { ...settings.permissionMode, perSite: next } })
  }
  return (
    <>
      <MicCard />

      <Card
        title="Before acting on a site"
        desc="Ask first checks once per site per task. Either way, Briefly never touches passwords or card details and always pauses before a purchase."
      >
        <Seg<PermissionChoice>
          value={settings.permissionMode.default}
          ariaLabel="Agent permission"
          options={[
            ['ask_first', 'shield', 'Ask first'],
            ['act_freely', 'bolt', 'Act freely']
          ]}
          onChange={setDefault}
        />
      </Card>

      <Card title="Approved sites" desc="Sites where you've chosen how Briefly may act on your behalf.">
        {perSite.length === 0 ? (
          <p className="st-empty">No site overrides yet. Briefly asks the first time it acts on a new site.</p>
        ) : (
          <SiteList
            hosts={perSite.map(([host]) => host)}
            tag={(host) => (settings.permissionMode.perSite[host] === 'act_freely' ? 'Act freely' : 'Ask first')}
            onRemove={removePerSite}
            removeLabel={(host) => `Remove override for ${host}`}
          />
        )}
      </Card>

      <Card title="Page-context blocklist" desc="Briefly never attaches page content on these sites.">
        {settings.siteContextBlocklist.length === 0 ? (
          <p className="st-empty">No sites blocked. Add one from the context chip's menu in the panel.</p>
        ) : (
          <SiteList
            hosts={settings.siteContextBlocklist}
            onRemove={(host) =>
              void updateSettings({ siteContextBlocklist: settings.siteContextBlocklist.filter((h) => h !== host) })
            }
            removeLabel={(host) => `Allow context on ${host}`}
          />
        )}
      </Card>

      <Card
        title="Selection popup"
        desc="A quiet pill with quick actions appears when you select text on a page."
        control={
          <Toggle
            checked={settings.selectionPopupEnabled}
            onChange={(v) => void updateSettings({ selectionPopupEnabled: v })}
            label="Selection popup"
          />
        }
      >
        {settings.selectionPopupBlocklist.length > 0 && (
          <>
            <p className="st-note">Hidden on these sites:</p>
            <SiteList
              hosts={settings.selectionPopupBlocklist}
              onRemove={(host) =>
                void updateSettings({
                  selectionPopupBlocklist: settings.selectionPopupBlocklist.filter((h) => h !== host)
                })
              }
              removeLabel={(host) => `Show popup on ${host}`}
            />
          </>
        )}
      </Card>
    </>
  )
}

function VoiceSection({ settings }: { settings: Settings }) {
  const [voices, setVoices] = useState<FreettsVoice[] | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const previewing = useTts((s) => s.messageId === 'voice-preview' && s.status.phase !== 'idle')

  useEffect(() => {
    fetchVoices()
      .then(setVoices)
      .catch(() => setLoadFailed(true))
  }, [])

  const groups = useMemo(() => {
    if (!voices) return []
    const byLang = new Map<string, FreettsVoice[]>()
    for (const v of voices) {
      const lang = v.locale.split('-')[0] ?? 'other'
      const list = byLang.get(lang) ?? []
      list.push(v)
      byLang.set(lang, list)
    }
    const mine = (navigator.language || 'en').split('-')[0] ?? 'en'
    return [...byLang.entries()].sort((a, b) => {
      if (a[0] === mine) return -1
      if (b[0] === mine) return 1
      return languageName(a[0]).localeCompare(languageName(b[0]))
    })
  }, [voices])

  const usage = rollLedger(settings.ttsUsage)
  const percent = Math.min(100, Math.round((usage.chars / MONTHLY_LIMIT) * 100))
  const speed = 1 + settings.voice.rate / 100
  const fallbackRecent = settings.ttsFallbackAt !== null && Date.now() - settings.ttsFallbackAt < 48 * 3600 * 1000

  return (
    <Card title="Read-aloud voice" desc="Briefly can speak answers aloud with a natural neural voice.">
      <div className="st-stack">
        <Field label="Voice">
          {voices ? (
            <select
              className="input st-select"
              value={settings.voice.id}
              onChange={(e) => void updateSettings({ voice: { ...settings.voice, id: e.target.value } })}
            >
              {groups.map(([lang, list]) => (
                <optgroup key={lang} label={languageName(lang)}>
                  {list.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          ) : loadFailed ? (
            <p className="st-note">Couldn't load the voice catalog right now — keeping {settings.voice.id}.</p>
          ) : (
            <span className="st-loading">
              <Spinner size={12} />
              Loading voices…
            </span>
          )}
        </Field>
        <Field label={`Speed · ${speed.toFixed(2).replace(/0$/, '')}×`}>
          <input
            type="range"
            className="st-range"
            min={-50}
            max={100}
            step={5}
            value={settings.voice.rate}
            onChange={(e) => void updateSettings({ voice: { ...settings.voice, rate: Number(e.target.value) } })}
            aria-label="Speech speed"
          />
        </Field>
        <div>
          <Button
            size="sm"
            icon={previewing ? 'stop' : 'play'}
            onClick={() =>
              previewing
                ? stopSpeech()
                : void speakMessage('voice-preview', "Here's how Briefly sounds reading your answers aloud.")
            }
          >
            {previewing ? 'Stop' : 'Preview'}
          </Button>
        </div>
        <div className="st-meter">
          <div className="st-meter-bar">
            <div className="st-meter-fill" style={{ width: `${percent}%` }} />
          </div>
          <span className="st-note">
            {usage.chars.toLocaleString()} / {MONTHLY_LIMIT.toLocaleString()} neural-voice characters this month
          </span>
        </div>
        {fallbackRecent && (
          <p className="st-note">
            The standard browser voice was used recently — the neural voice was unreachable or near its monthly cap.
          </p>
        )}
      </div>
    </Card>
  )
}

function ActionsSection({ settings }: { settings: Settings }) {
  const [editing, setEditing] = useState<CustomAction | null>(null)
  const [name, setName] = useState('')
  const [prompt, setPrompt] = useState('')
  const [adding, setAdding] = useState(false)

  const startAdd = () => {
    setAdding(true)
    setEditing(null)
    setName('')
    setPrompt('')
  }
  const startEdit = (a: CustomAction) => {
    setEditing(a)
    setAdding(false)
    setName(a.name)
    setPrompt(a.prompt)
  }
  const cancel = () => {
    setAdding(false)
    setEditing(null)
  }
  const save = () => {
    const n = name.trim()
    const p = prompt.trim()
    if (!n || !p) return
    const next = editing
      ? settings.customActions.map((a) => (a.id === editing.id ? { ...a, name: n, prompt: p } : a))
      : [...settings.customActions, { id: newId(), name: n, prompt: p }]
    void updateSettings({ customActions: next })
    cancel()
  }
  const remove = (id: string) => {
    void updateSettings({ customActions: settings.customActions.filter((a) => a.id !== id) })
    if (editing?.id === id) cancel()
  }

  const formOpen = adding || editing !== null

  return (
    <Card
      title="Quick actions"
      desc="Summarize, Explain, Simplify, Translate, and Improve writing are built in. Your own actions appear beside them in the selection popup, the composer, and the right-click menu."
    >
      <div className="st-stack">
        {settings.customActions.length > 0 && (
          <ul className="st-list">
            {settings.customActions.map((a) => (
              <li key={a.id} className="st-list-row">
                <div className="st-action-main">
                  <span className="st-action-name">{a.name}</span>
                  <span className="st-action-prompt">{a.prompt}</span>
                </div>
                <IconButton icon="pencil" label={`Edit ${a.name}`} size="sm" onClick={() => startEdit(a)} />
                <IconButton icon="trash" label={`Delete ${a.name}`} size="sm" onClick={() => remove(a.id)} />
              </li>
            ))}
          </ul>
        )}
        {formOpen ? (
          <div className="st-actionform">
            <Field label="Name">
              <Input
                autoFocus
                placeholder="Make it a haiku"
                value={name}
                maxLength={28}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <Field label="Prompt" hint="Runs on the highlighted text. Write {text} to place it yourself.">
              <Textarea
                placeholder="Rewrite the text as a haiku that keeps its meaning."
                value={prompt}
                rows={3}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </Field>
            <div className="st-actionform-row">
              <Button variant="ghost" onClick={cancel}>
                Cancel
              </Button>
              <Button variant="primary" disabled={!name.trim() || !prompt.trim()} onClick={save}>
                {editing ? 'Save changes' : 'Add action'}
              </Button>
            </div>
          </div>
        ) : (
          <Button size="sm" icon="plus" className="st-selfstart" onClick={startAdd}>
            New action
          </Button>
        )}
      </div>
    </Card>
  )
}

function DataSection({ settings }: { settings: Settings }) {
  const [clearOpen, setClearOpen] = useState(false)
  const [cleared, setCleared] = useState(false)

  const exportAll = async () => {
    const conversations = await db.conversations.orderBy('updatedAt').reverse().toArray()
    const data = []
    for (const conversation of conversations) {
      const messages = await db.messages.where('conversationId').equals(conversation.id).sortBy('createdAt')
      data.push({ conversation, messages })
    }
    downloadFile('briefly-export.json', 'application/json', allDataToJson(data, settings))
  }

  const clearAll = async () => {
    await db.messages.clear()
    await db.conversations.clear()
    await db.audioCache.clear()
    setClearOpen(false)
    setCleared(true)
    window.setTimeout(() => setCleared(false), 2500)
  }

  return (
    <>
      <Card
        title="Export everything"
        desc="All conversations and settings as JSON. Your key is never included."
        control={
          <Button size="sm" icon="download" onClick={() => void exportAll()}>
            Export
          </Button>
        }
      />
      <Card
        title="Clear all conversations"
        desc="Removes every conversation and cached audio. Keeps your key and settings."
        control={
          <Button size="sm" variant="danger" onClick={() => setClearOpen(true)}>
            {cleared ? 'Cleared' : 'Clear…'}
          </Button>
        }
      />
      <Dialog
        open={clearOpen}
        title="Clear all conversations?"
        confirmLabel="Clear everything"
        danger
        onClose={() => setClearOpen(false)}
        onConfirm={() => void clearAll()}
      >
        Every conversation on this device will be deleted. Export first if you want a copy — there's no undo.
      </Dialog>
    </>
  )
}

export default function Settings() {
  const settings = useSettings()
  const [active, setActive] = useState<NavId>('general')
  const [removeOpen, setRemoveOpen] = useState(false)

  if (!settings) return <div className="st-app" />

  return (
    <div className="st-app">
      <header className="st-topbar">
        <div className="st-brand">
          <svg className="st-brand-mark" viewBox="0 0 128 128" aria-hidden="true">
            <rect width="128" height="128" rx="28" fill="var(--accent)" />
            <rect x="28" y="36" width="72" height="11" rx="5.5" fill="var(--paper-raised)" />
            <rect x="28" y="58" width="50" height="11" rx="5.5" fill="var(--paper-raised)" />
            <rect x="28" y="80" width="62" height="11" rx="5.5" fill="var(--accent-soft)" />
          </svg>
          <span className="st-brand-name">Briefly settings</span>
        </div>
        <span className="st-topbar-key">
          <Icon name="key" size={13} />
          {settings.apiKey ? maskKey(settings.apiKey) : 'No key set'}
        </span>
      </header>

      <div className="st-shell">
        <nav className="st-nav" aria-label="Settings sections">
          {NAV.map((item) => (
            <button
              key={item.id}
              className={`st-nav-item${active === item.id ? ' on' : ''}`}
              aria-current={active === item.id}
              onClick={() => setActive(item.id)}
            >
              <Icon name={item.icon} size={16} />
              {item.label}
            </button>
          ))}
          <div className="st-nav-sep" />
          <button className="st-nav-item st-nav-danger" onClick={() => setRemoveOpen(true)}>
            <Icon name="logout" size={16} />
            Remove API key
          </button>
        </nav>

        <main className="st-content">
          <div key={active} className="st-section">
            <h2 className="st-section-title">{NAV.find((n) => n.id === active)?.label}</h2>
            {active === 'general' && <GeneralSection settings={settings} />}
            {active === 'permissions' && <PermissionsSection settings={settings} />}
            {active === 'voice' && <VoiceSection settings={settings} />}
            {active === 'actions' && <ActionsSection settings={settings} />}
            {active === 'data' && <DataSection settings={settings} />}
          </div>
        </main>
      </div>

      <Dialog
        open={removeOpen}
        title="Remove your API key?"
        confirmLabel="Remove key"
        danger
        onClose={() => setRemoveOpen(false)}
        onConfirm={() => {
          void updateSettings({ apiKey: '' })
          setRemoveOpen(false)
        }}
      >
        Briefly will stop working until you add a key again. Your conversations and settings stay put.
      </Dialog>
    </div>
  )
}
