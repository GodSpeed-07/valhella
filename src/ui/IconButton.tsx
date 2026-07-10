import { useRef, useState, type ButtonHTMLAttributes } from 'react'
import { createPortal } from 'react-dom'
import Icon, { type IconName } from './Icon'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName
  label: string
  size?: 'sm' | 'md'
  iconSize?: number
  active?: boolean
  showTooltip?: boolean
}

export default function IconButton({
  icon,
  label,
  size = 'md',
  iconSize,
  active = false,
  showTooltip = true,
  className,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  ...rest
}: IconButtonProps) {
  const ref = useRef<HTMLButtonElement>(null)
  const timer = useRef<number | null>(null)
  const [tip, setTip] = useState<{ x: number; y: number } | null>(null)

  const show = () => {
    if (!showTooltip) return
    if (timer.current !== null) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      const r = ref.current?.getBoundingClientRect()
      if (r) setTip({ x: r.left + r.width / 2, y: r.top - 6 })
    }, 500)
  }

  const hide = () => {
    if (timer.current !== null) window.clearTimeout(timer.current)
    timer.current = null
    setTip(null)
  }

  const classes = ['iconbtn']
  if (size === 'sm') classes.push('iconbtn-sm')
  if (active) classes.push('is-active')
  if (className) classes.push(className)

  return (
    <>
      <button
        ref={ref}
        className={classes.join(' ')}
        aria-label={label}
        onMouseEnter={(e) => {
          show()
          onMouseEnter?.(e)
        }}
        onMouseLeave={(e) => {
          hide()
          onMouseLeave?.(e)
        }}
        onFocus={(e) => {
          show()
          onFocus?.(e)
        }}
        onBlur={(e) => {
          hide()
          onBlur?.(e)
        }}
        onClick={rest.onClick}
        {...rest}
      >
        <Icon name={icon} size={iconSize ?? (size === 'sm' ? 14 : 16)} />
      </button>
      {tip &&
        createPortal(
          <span
            className="tooltip"
            style={{ left: tip.x, top: tip.y, transform: 'translate(-50%, -100%)' }}
            role="presentation"
          >
            {label}
          </span>,
          document.body
        )}
    </>
  )
}
