import { useMemo } from 'react'
import { summarizeCost, formatDollars, formatTokens } from '../../lib/cost'
import { conversationToMarkdown, downloadFile, safeFilename } from '../../lib/export'
import Icon from '../../ui/Icon'
import IconButton from '../../ui/IconButton'
import Menu, { type MenuEntry } from '../../ui/Menu'
import { useStore } from '../store'

export default function Header() {
  const view = useStore((s) => s.view)
  const conversation = useStore((s) => s.conversation)
  const messages = useStore((s) => s.messages)
  const setView = useStore((s) => s.setView)
  const newChat = useStore((s) => s.newChat)

  const cost = useMemo(
    () => summarizeCost(messages.filter((m) => m.role === 'assistant').map((m) => ({ model: m.model, usage: m.usage }))),
    [messages]
  )

  if (view !== 'chat') {
    return (
      <header className="hdr">
        <IconButton icon="arrow-left" label="Back to chat" onClick={() => setView('chat')} />
        <div className="hdr-label">{view === 'history' ? 'History' : 'Settings'}</div>
      </header>
    )
  }

  const entries: MenuEntry[] = []
  if (cost.inputTokens > 0) {
    entries.push({
      title: `≈ ${formatDollars(cost.dollars)} · ${formatTokens(cost.inputTokens)} in / ${formatTokens(cost.outputTokens)} out`
    })
  }
  entries.push(
    { id: 'export', label: 'Export as Markdown', icon: 'download', disabled: messages.length === 0 },
    { sep: true },
    { id: 'settings', label: 'Settings', icon: 'sliders' }
  )

  const onMenu = (id: string) => {
    if (id === 'settings') void chrome.tabs.create({ url: chrome.runtime.getURL('src/settings/index.html') })
    else if (id === 'export' && conversation) {
      void (async () => {
        const md = conversationToMarkdown(conversation, messages)
        downloadFile(safeFilename(conversation.title || 'briefly-chat', 'md'), 'text/markdown', md)
      })()
    }
  }

  return (
    <header className="hdr">
      <div className="hdr-title">
        {conversation?.title ? (
          <span className="hdr-conv" title={conversation.title}>
            {conversation.title}
          </span>
        ) : (
          <span className="wordmark">Briefly</span>
        )}
      </div>
      <div className="hdr-actions">
        <IconButton icon="plus" label="New chat" onClick={newChat} />
        <IconButton icon="history" label="History" onClick={() => setView('history')} />
        <Menu
          entries={entries}
          align="end"
          onSelect={onMenu}
          trigger={(p) => (
            <button
              ref={p.ref}
              onClick={p.onClick}
              aria-expanded={p['aria-expanded']}
              aria-haspopup={p['aria-haspopup']}
              className="iconbtn"
              aria-label="More"
            >
              <Icon name="dots" size={16} />
            </button>
          )}
        />
      </div>
    </header>
  )
}
