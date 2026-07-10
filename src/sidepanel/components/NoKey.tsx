import Icon from '../../ui/Icon'
import { KeyEditor } from '../views/SettingsView'
import { useStore } from '../store'

export default function NoKey() {
  const keyInvalid = useStore((s) => s.keyInvalid)
  return (
    <div className="nokey">
      <div className="nokey-card">
        <span className="nokey-icon">
          <Icon name="key" size={22} />
        </span>
        <h2 className="nokey-title">{keyInvalid ? 'Your API key stopped working' : 'Add your Anthropic key'}</h2>
        <p className="nokey-sub">
          {keyInvalid
            ? 'Anthropic rejected the saved key. Paste a fresh one to keep going.'
            : 'Briefly runs on your own Anthropic API key — no account, nothing leaves this machine except calls to Anthropic.'}
        </p>
        <KeyEditor />
        <a
          className="nokey-link"
          href="https://console.anthropic.com/settings/keys"
          target="_blank"
          rel="noreferrer"
        >
          Get a key from the Anthropic console
          <Icon name="external" size={12} />
        </a>
      </div>
    </div>
  )
}
