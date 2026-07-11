import { useState, type ReactNode } from 'react'
import { hostnameOf } from '../../lib/settings'
import { unreadableCopy } from '../../lib/pagecontext'
import Icon from '../../ui/Icon'
import IconButton from '../../ui/IconButton'
import Menu from '../../ui/Menu'
import { useStore } from '../store'

function ChipFavicon({ url, favIconUrl }: { url: string; favIconUrl: string | null }) {
  const [failed, setFailed] = useState(false)
  const src = favIconUrl ?? `${chrome.runtime.getURL('/_favicon/')}?pageUrl=${encodeURIComponent(url)}&size=32`
  if (failed) return <Icon name="page" size={12} />
  return <img className="ctx-favicon" src={src} alt="" width={13} height={13} onError={() => setFailed(true)} />
}

function ChipShell({ children }: { children: ReactNode }) {
  return <div className="ctx-dock">{children}</div>
}

export default function ContextChip() {
  const agentMode = useStore((s) => s.agentMode)
  const pc = useStore((s) => s.pageContext)
  const pageAdded = useStore((s) => s.pageAdded)
  const addPageContext = useStore((s) => s.addPageContext)
  const removePageContext = useStore((s) => s.removePageContext)
  const blockCurrentSite = useStore((s) => s.blockCurrentSite)
  const unblockSite = useStore((s) => s.unblockSite)

  if (agentMode) return null

  if (pc.status === 'ready') {
    if (!pageAdded) {
      return (
        <ChipShell>
          <button className="ctx-add" onClick={addPageContext} title={pc.page.title}>
            <Icon name="plus" size={13} />
            <span>Add this page</span>
          </button>
        </ChipShell>
      )
    }
    const host = hostnameOf(pc.page.url) ?? ''
    return (
      <ChipShell>
        <div className="ctx-pill ctx-pill-live">
          <Menu
            entries={[
              { id: 'remove', label: 'Stop using this page', icon: 'x' },
              { id: 'block', label: `Never attach on ${host}`, icon: 'eye-off' }
            ]}
            onSelect={(id) => {
              if (id === 'remove') removePageContext()
              else if (id === 'block') void blockCurrentSite()
            }}
            trigger={(p) => (
              <button
                ref={p.ref}
                onClick={p.onClick}
                aria-expanded={p['aria-expanded']}
                aria-haspopup={p['aria-haspopup']}
                className="ctx-chip-main"
                title={pc.page.title}
              >
                <span className="ctx-reading">Reading</span>
                <ChipFavicon url={pc.page.url} favIconUrl={pc.favIconUrl} />
                <span className="ctx-title">{pc.page.title}</span>
                <Icon name="chevron-down" size={10} />
              </button>
            )}
          />
          <IconButton icon="x" label="Stop using this page" size="sm" onClick={removePageContext} />
        </div>
      </ChipShell>
    )
  }

  if (pc.status === 'blocked') {
    return (
      <ChipShell>
        <div className="ctx-pill ctx-pill-muted">
          <Icon name="eye-off" size={12} />
          <span className="ctx-pill-text" title={`Never attached on ${pc.host}`}>
            Never attached on {pc.host}
          </span>
          <button className="ctx-link" onClick={() => void unblockSite(pc.host)}>
            Allow
          </button>
        </div>
      </ChipShell>
    )
  }

  if (pc.status === 'unreadable') {
    const copy = unreadableCopy(pc.reason)
    return (
      <ChipShell>
        <div className="ctx-pill ctx-pill-muted ctx-pill-warn">
          <Icon name="warning" size={12} />
          <span className="ctx-pill-text" title={copy}>
            {copy}
          </span>
        </div>
      </ChipShell>
    )
  }

  return null
}
