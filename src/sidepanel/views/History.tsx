import { useEffect, useRef, useState } from 'react'
import { db, type ConversationRow } from '../../lib/db'
import { textOfBlocks } from '../../lib/anthropic/types'
import { conversationToMarkdown, downloadFile, safeFilename } from '../../lib/export'
import { timeAgo } from '../../lib/time'
import Icon from '../../ui/Icon'
import IconButton from '../../ui/IconButton'
import Menu from '../../ui/Menu'
import Dialog from '../../ui/Dialog'
import { Input } from '../../ui/Input'
import { useStore } from '../store'

function orderRows(rows: ConversationRow[]): ConversationRow[] {
  return [...rows].sort((a, b) => b.pinned - a.pinned || b.updatedAt - a.updatedAt)
}

export default function History() {
  const [q, setQ] = useState('')
  const [rows, setRows] = useState<ConversationRow[] | null>(null)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<ConversationRow | null>(null)
  const openConversation = useStore((s) => s.openConversation)
  const togglePin = useStore((s) => s.togglePin)
  const deleteConversation = useStore((s) => s.deleteConversation)
  const renameConversation = useStore((s) => s.renameConversation)
  const searchRef = useRef<HTMLInputElement>(null)

  async function load(query: string): Promise<void> {
    const all = orderRows(await db.conversations.toArray())
    if (!query.trim()) {
      setRows(all)
      return
    }
    const t = query.trim().toLowerCase()
    const hitIds = new Set(all.filter((c) => c.title.toLowerCase().includes(t)).map((c) => c.id))
    await db.messages.each((m) => {
      if (hitIds.has(m.conversationId)) return
      if (textOfBlocks(m.blocks).toLowerCase().includes(t)) hitIds.add(m.conversationId)
    })
    setRows(all.filter((c) => hitIds.has(c.id)))
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void load(q), q ? 160 : 0)
    return () => window.clearTimeout(timer)
  }, [q])

  useEffect(() => {
    searchRef.current?.focus()
  }, [])

  async function exportOne(conv: ConversationRow): Promise<void> {
    const messages = await db.messages.where('conversationId').equals(conv.id).sortBy('createdAt')
    downloadFile(
      safeFilename(conv.title || 'briefly-chat', 'md'),
      'text/markdown',
      conversationToMarkdown(conv, messages)
    )
  }

  function commitRename(id: string): void {
    void renameConversation(id, renameValue).then(() => {
      setRenaming(null)
      void load(q)
    })
  }

  return (
    <div className="hist">
      <div className="hist-search">
        <Icon name="search" size={14} />
        <input
          ref={searchRef}
          className="hist-search-input"
          placeholder="Search conversations…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {q && <IconButton icon="x" label="Clear search" size="sm" onClick={() => setQ('')} />}
      </div>
      <div className="hist-list" role="list">
        {rows !== null && rows.length === 0 && (
          <div className="hist-empty">
            {q ? (
              <>
                <div className="hist-empty-title">No matches</div>
                <div className="hist-empty-sub">Nothing mentions “{q}”.</div>
              </>
            ) : (
              <>
                <div className="hist-empty-title">Nothing here yet</div>
                <div className="hist-empty-sub">Conversations you start will collect here, auto-titled.</div>
              </>
            )}
          </div>
        )}
        {(rows ?? []).map((c) => (
          <div
            key={c.id}
            className="hist-row"
            role="listitem"
            tabIndex={0}
            onClick={() => renaming !== c.id && void openConversation(c.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && renaming !== c.id) void openConversation(c.id)
            }}
          >
            {renaming === c.id ? (
              <Input
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  e.stopPropagation()
                  if (e.key === 'Enter') commitRename(c.id)
                  if (e.key === 'Escape') setRenaming(null)
                }}
                onBlur={() => commitRename(c.id)}
              />
            ) : (
              <>
                <div className="hist-row-main">
                  {c.pinned === 1 && (
                    <span className="hist-pin">
                      <Icon name="pin" size={12} />
                    </span>
                  )}
                  <span className="hist-title">{c.title || 'Untitled conversation'}</span>
                  <span className="hist-time">{timeAgo(c.updatedAt)}</span>
                </div>
                <div className="hist-row-actions" onClick={(e) => e.stopPropagation()}>
                  <IconButton
                    icon="pin"
                    label={c.pinned ? 'Unpin' : 'Pin'}
                    size="sm"
                    active={c.pinned === 1}
                    onClick={() => void togglePin(c.id).then(() => load(q))}
                  />
                  <Menu
                    entries={[
                      { id: 'rename', label: 'Rename', icon: 'pencil' },
                      { id: 'export', label: 'Export as Markdown', icon: 'download' },
                      { sep: true },
                      { id: 'delete', label: 'Delete', icon: 'trash', danger: true }
                    ]}
                    align="end"
                    onSelect={(id) => {
                      if (id === 'rename') {
                        setRenaming(c.id)
                        setRenameValue(c.title)
                      } else if (id === 'export') void exportOne(c)
                      else if (id === 'delete') setDeleteTarget(c)
                    }}
                    trigger={(p) => (
                      <button
                        ref={p.ref}
                        onClick={p.onClick}
                        aria-expanded={p['aria-expanded']}
                        aria-haspopup={p['aria-haspopup']}
                        className="iconbtn iconbtn-sm"
                        aria-label="Conversation actions"
                      >
                        <Icon name="dots" size={14} />
                      </button>
                    )}
                  />
                </div>
              </>
            )}
          </div>
        ))}
      </div>
      <Dialog
        open={deleteTarget !== null}
        title="Delete this conversation?"
        confirmLabel="Delete"
        danger
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            void deleteConversation(deleteTarget.id).then(() => {
              setDeleteTarget(null)
              void load(q)
            })
          }
        }}
      >
        “{deleteTarget?.title || 'Untitled conversation'}” will be removed from this device. There's no undo.
      </Dialog>
    </div>
  )
}
