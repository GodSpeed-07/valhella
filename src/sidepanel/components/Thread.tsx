import { useEffect, useRef, useState } from 'react'
import Icon from '../../ui/Icon'
import MessageView from './MessageView'
import { useStore } from '../store'

function EmptyState() {
  return (
    <div className="empty">
      <svg className="empty-mark" viewBox="0 0 128 128" aria-hidden="true">
        <rect width="128" height="128" rx="28" fill="var(--accent)" />
        <rect x="28" y="36" width="72" height="11" rx="5.5" fill="var(--paper-raised)" />
        <rect x="28" y="58" width="50" height="11" rx="5.5" fill="var(--paper-raised)" />
        <rect x="28" y="80" width="62" height="11" rx="5.5" fill="var(--accent-soft)" />
      </svg>
      <h2 className="empty-title">
        Ask about this page,
        <br />
        or anything at all.
      </h2>
      <p className="empty-sub">
        Briefly reads what you're reading, searches the live web, and can act on pages for you.
      </p>
      <p className="empty-kbd">
        <span className="kbd">Alt</span>
        <span className="kbd">B</span>
        toggles Briefly anywhere
      </p>
    </div>
  )
}

export default function Thread() {
  const messages = useStore((s) => s.messages)
  const streaming = useStore((s) => s.streaming)
  const offline = useStore((s) => s.offline)
  const ref = useRef<HTMLDivElement>(null)
  const nearBottom = useRef(true)
  const [showJump, setShowJump] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (el && nearBottom.current) el.scrollTop = el.scrollHeight
  }, [messages])

  const onScroll = () => {
    const el = ref.current
    if (!el) return
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 90
    nearBottom.current = near
    setShowJump(!near && streaming !== null)
  }

  useEffect(() => {
    if (!streaming) setShowJump(false)
  }, [streaming])

  const lastUserIdx = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i]?.role === 'user') return i
    }
    return -1
  })()

  return (
    <div className="thread-wrap">
      <div className="thread" ref={ref} onScroll={onScroll}>
        {offline && (
          <div className="banner">
            <Icon name="warning" size={14} />
            You're offline — answers need a connection.
          </div>
        )}
        {messages.length === 0 ? (
          <EmptyState />
        ) : (
          messages.map((m, i) => (
            <MessageView
              key={m.id}
              msg={m}
              isLast={i === messages.length - 1}
              isLastUser={i === lastUserIdx}
              streamingThis={streaming?.messageId === m.id}
            />
          ))
        )}
      </div>
      {showJump && (
        <button
          className="jump"
          onClick={() => {
            const el = ref.current
            if (el) el.scrollTop = el.scrollHeight
            nearBottom.current = true
            setShowJump(false)
          }}
        >
          <Icon name="chevron-down" size={14} />
          Latest
        </button>
      )}
    </div>
  )
}
