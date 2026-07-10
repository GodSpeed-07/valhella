import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import Icon, { type IconName } from './Icon'

export interface MenuAction {
  id: string
  label: string
  sub?: string
  icon?: IconName
  hint?: string
  danger?: boolean
  checked?: boolean
  disabled?: boolean
}

export type MenuEntry = MenuAction | { sep: true } | { title: string }

function isAction(e: MenuEntry): e is MenuAction {
  return 'id' in e
}

interface MenuProps {
  entries: MenuEntry[]
  onSelect: (id: string) => void
  align?: 'start' | 'end'
  width?: number
  trigger: (props: {
    ref: (el: HTMLElement | null) => void
    onClick: () => void
    'aria-expanded': boolean
    'aria-haspopup': 'menu'
  }) => ReactNode
}

export default function Menu({ entries, onSelect, align = 'start', width, trigger }: MenuProps) {
  const anchorRef = useRef<HTMLElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)
  const [active, setActive] = useState(-1)

  const actionIndexes = entries
    .map((e, i) => (isAction(e) && !e.disabled ? i : -1))
    .filter((i) => i >= 0)

  const close = (refocus: boolean) => {
    setOpen(false)
    setPos(null)
    setActive(-1)
    if (refocus) anchorRef.current?.focus()
  }

  useLayoutEffect(() => {
    if (!open) return
    const anchor = anchorRef.current
    const menu = menuRef.current
    if (!anchor || !menu) return
    const a = anchor.getBoundingClientRect()
    const mw = menu.offsetWidth
    const mh = menu.offsetHeight
    let left = align === 'end' ? a.right - mw : a.left
    left = Math.max(8, Math.min(left, window.innerWidth - mw - 8))
    let top = a.bottom + 4
    if (top + mh > window.innerHeight - 8) top = Math.max(8, a.top - mh - 4)
    setPos({ left, top })
    menu.focus()
  }, [open, align, entries.length])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node
      if (menuRef.current?.contains(t) || anchorRef.current?.contains(t)) return
      close(false)
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => document.removeEventListener('pointerdown', onPointerDown, true)
  }, [open])

  const move = (dir: 1 | -1) => {
    if (actionIndexes.length === 0) return
    const cur = actionIndexes.indexOf(active)
    const next =
      cur === -1
        ? dir === 1
          ? 0
          : actionIndexes.length - 1
        : (cur + dir + actionIndexes.length) % actionIndexes.length
    const idx = actionIndexes[next]
    if (idx !== undefined) setActive(idx)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      move(1)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      move(-1)
    } else if (e.key === 'Home') {
      e.preventDefault()
      const idx = actionIndexes[0]
      if (idx !== undefined) setActive(idx)
    } else if (e.key === 'End') {
      e.preventDefault()
      const idx = actionIndexes[actionIndexes.length - 1]
      if (idx !== undefined) setActive(idx)
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      const entry = entries[active]
      if (entry && isAction(entry)) {
        onSelect(entry.id)
        close(true)
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      close(true)
    } else if (e.key === 'Tab') {
      e.preventDefault()
      close(true)
    }
  }

  const hasChecks = entries.some((e) => isAction(e) && e.checked !== undefined)

  return (
    <>
      {trigger({
        ref: (el) => {
          anchorRef.current = el
        },
        onClick: () => (open ? close(false) : setOpen(true)),
        'aria-expanded': open,
        'aria-haspopup': 'menu'
      })}
      {open &&
        createPortal(
          <div
            ref={menuRef}
            className="menu surface-overlay"
            role="menu"
            tabIndex={-1}
            onKeyDown={onKeyDown}
            style={{
              left: pos?.left ?? -9999,
              top: pos?.top ?? -9999,
              width,
              visibility: pos ? 'visible' : 'hidden'
            }}
          >
            {entries.map((entry, i) => {
              if ('sep' in entry) return <div key={`sep-${i}`} className="menu-sep" role="separator" />
              if ('title' in entry)
                return (
                  <div key={`title-${i}`} className="menu-title">
                    {entry.title}
                  </div>
                )
              return (
                <div
                  key={entry.id}
                  className="menu-item"
                  role={entry.checked !== undefined ? 'menuitemradio' : 'menuitem'}
                  aria-checked={entry.checked !== undefined ? entry.checked : undefined}
                  aria-disabled={entry.disabled || undefined}
                  data-active={i === active || undefined}
                  data-danger={entry.danger || undefined}
                  onMouseEnter={() => !entry.disabled && setActive(i)}
                  onClick={() => {
                    if (entry.disabled) return
                    onSelect(entry.id)
                    close(true)
                  }}
                >
                  {hasChecks && (
                    <span className="menu-check">{entry.checked ? <Icon name="check" size={14} /> : null}</span>
                  )}
                  {entry.icon && (
                    <span className="menu-icon">
                      <Icon name={entry.icon} size={15} />
                    </span>
                  )}
                  <span className="menu-label">
                    {entry.label}
                    {entry.sub && <span className="menu-sub">{entry.sub}</span>}
                  </span>
                  {entry.hint && <span className="menu-hint">{entry.hint}</span>}
                </div>
              )
            })}
          </div>,
          document.body
        )}
    </>
  )
}
