import type { ReactNode } from 'react'

export type IconName =
  | 'send'
  | 'stop'
  | 'mic'
  | 'speaker'
  | 'copy'
  | 'check'
  | 'retry'
  | 'pencil'
  | 'trash'
  | 'pin'
  | 'search'
  | 'plus'
  | 'x'
  | 'chevron-down'
  | 'chevron-right'
  | 'chevron-left'
  | 'globe'
  | 'image'
  | 'camera'
  | 'page'
  | 'sparkle'
  | 'sliders'
  | 'history'
  | 'download'
  | 'external'
  | 'play'
  | 'pause'
  | 'bolt'
  | 'shield'
  | 'dots'
  | 'warning'
  | 'info'
  | 'key'
  | 'moon'
  | 'sun'
  | 'monitor'
  | 'link'
  | 'list'
  | 'book'
  | 'wand'
  | 'eye'
  | 'eye-off'
  | 'arrow-up'
  | 'arrow-left'
  | 'clock'
  | 'chat'
  | 'cursor'

const stroked: Partial<Record<IconName, ReactNode>> = {
  send: <path d="M10 16V4M5 8.5 10 4l5 4.5" />,
  mic: (
    <>
      <rect x="7.75" y="2.75" width="4.5" height="8.5" rx="2.25" />
      <path d="M5 9.5a5 5 0 0 0 10 0M10 14.5v2.75" />
    </>
  ),
  speaker: (
    <>
      <path d="M4 7.75v4.5h2.8L11 15.6V4.4L6.8 7.75H4Z" />
      <path d="M13.7 7.3a3.9 3.9 0 0 1 0 5.4M15.9 5.2a6.9 6.9 0 0 1 0 9.6" />
    </>
  ),
  copy: (
    <>
      <rect x="7.25" y="7.25" width="8.5" height="8.5" rx="1.75" />
      <path d="M4.75 12.5V6.1c0-.75.6-1.35 1.35-1.35h6.4" />
    </>
  ),
  check: <path d="m4.25 10.6 3.6 3.65 7.9-8.5" />,
  retry: <path d="M5.1 4.6v3.9H9M5.4 8.5a5.6 5.6 0 1 1-.9 4.4" />,
  pencil: <path d="m4 16 .9-3.4 8.5-8.5a1.85 1.85 0 0 1 2.6 2.6l-8.6 8.5L4 16Z" />,
  trash: (
    <>
      <path d="M4 6h12M8 6V4.4h4V6" />
      <path d="m5.8 6 .6 9.4h7.2L14.2 6M8.4 9v4M11.6 9v4" />
    </>
  ),
  pin: <path d="M12.2 3 17 7.8l-3.7 1L10 12.1 8.6 16 4 11.4 7.9 10l3.3-3.3 1-3.7ZM7 13l-3.5 3.5" />,
  search: (
    <>
      <circle cx="9" cy="9" r="5.25" />
      <path d="m13 13 4 4" />
    </>
  ),
  plus: <path d="M10 4.25v11.5M4.25 10h11.5" />,
  x: <path d="m5 5 10 10M15 5 5 15" />,
  'chevron-down': <path d="m5.25 7.75 4.75 4.5 4.75-4.5" />,
  'chevron-right': <path d="m7.75 5.25 4.5 4.75-4.5 4.75" />,
  'chevron-left': <path d="M12.25 5.25 7.75 10l4.5 4.75" />,
  globe: (
    <>
      <circle cx="10" cy="10" r="6.9" />
      <path d="M3.1 10h13.8M10 3.1c2.4 2 2.4 11.8 0 13.8M10 3.1c-2.4 2-2.4 11.8 0 13.8" />
    </>
  ),
  image: (
    <>
      <rect x="3.25" y="4.25" width="13.5" height="11.5" rx="2" />
      <circle cx="7.4" cy="8.3" r="1.25" />
      <path d="m4 14.5 4.1-4 2.9 2.9 2.4-2.4 3.1 3" />
    </>
  ),
  camera: (
    <>
      <path d="M3.25 7.4c0-.9.7-1.65 1.65-1.65H7L8.4 3.9h3.2L13 5.75h2.1c.9 0 1.65.75 1.65 1.65v6.7c0 .9-.75 1.65-1.65 1.65H4.9c-.95 0-1.65-.75-1.65-1.65v-6.7Z" />
      <circle cx="10" cy="10.4" r="2.8" />
    </>
  ),
  page: (
    <>
      <path d="M5.75 3.25h5.25l3.25 3.25v10.25h-8.5V3.25Z" />
      <path d="M11 3.25V6.5h3.25M8 10.4h4M8 13.2h4" />
    </>
  ),
  sliders: (
    <>
      <path d="M3.5 6.5h7M14.5 6.5h2M3.5 13.5h2M9.5 13.5h7" />
      <circle cx="12.5" cy="6.5" r="1.9" />
      <circle cx="7.5" cy="13.5" r="1.9" />
    </>
  ),
  history: (
    <>
      <circle cx="10" cy="10" r="6.9" />
      <path d="M10 6.2v3.8l2.7 2" />
    </>
  ),
  clock: (
    <>
      <circle cx="10" cy="10" r="6.9" />
      <path d="M10 6.2v3.8l2.7 2" />
    </>
  ),
  download: <path d="M10 3.5v9M6 8.9l4 4 4-4M4.5 16.5h11" />,
  external: <path d="M8.5 5.25H5v9.75h9.75V11.5M11.75 3.5h4.75v4.75M16 4 9.4 10.6" />,
  bolt: <path d="M11.2 3 5.2 11.4h3.9L8.8 17l6-8.4h-3.9L11.2 3Z" />,
  shield: <path d="m10 3 6 2.2v4.7c0 3.5-2.4 6-6 7.1-3.6-1.1-6-3.6-6-7.1V5.2L10 3Z" />,
  warning: <path d="M10 3.6 17.4 16H2.6L10 3.6ZM10 8.6v3.3M10 14.1v.05" />,
  info: (
    <>
      <circle cx="10" cy="10" r="6.9" />
      <path d="M10 9.2v4.3M10 6.5v.05" />
    </>
  ),
  key: (
    <>
      <circle cx="7" cy="12.7" r="3.1" />
      <path d="m9.4 10.4 6.3-6.3M13.4 6.4l2.1 2.1" />
    </>
  ),
  moon: <path d="M16.4 12.4A7 7 0 0 1 7.6 3.6a7 7 0 1 0 8.8 8.8Z" />,
  sun: (
    <>
      <circle cx="10" cy="10" r="3.4" />
      <path d="M10 2.4v1.8M10 15.8v1.8M2.4 10h1.8M15.8 10h1.8M4.6 4.6l1.3 1.3M14.1 14.1l1.3 1.3M15.4 4.6l-1.3 1.3M5.9 14.1l-1.3 1.3" />
    </>
  ),
  monitor: (
    <>
      <rect x="3" y="4.25" width="14" height="9.5" rx="1.6" />
      <path d="M7.5 16.75h5" />
    </>
  ),
  link: (
    <>
      <path d="M8.4 11.6a3.1 3.1 0 0 0 4.4 0l2.4-2.4A3.1 3.1 0 0 0 10.8 4.8l-1.1 1.1" />
      <path d="M11.6 8.4a3.1 3.1 0 0 0-4.4 0L4.8 10.8a3.1 3.1 0 0 0 4.4 4.4l1.1-1.1" />
    </>
  ),
  list: <path d="M7 5.6h9.5M7 10h9.5M7 14.4h9.5M3.6 5.6h.05M3.6 10h.05M3.6 14.4h.05" />,
  book: (
    <>
      <path d="M10 5.1C8 3.9 5.6 3.9 3.6 4.7v10.6c2-.8 4.4-.8 6.4.4 2-1.2 4.4-1.2 6.4-.4V4.7c-2-.8-4.4-.8-6.4.4Z" />
      <path d="M10 5.1v10.6" />
    </>
  ),
  wand: (
    <>
      <path d="M3.9 16.1 12.6 7.4" />
      <path d="m14.9 3.1.6 1.5 1.5.6-1.5.6-.6 1.5-.6-1.5-1.5-.6 1.5-.6.6-1.5ZM15.9 11.9l.45 1.15 1.15.45-1.15.45-.45 1.15-.45-1.15-1.15-.45 1.15-.45.45-1.15Z" />
    </>
  ),
  eye: (
    <>
      <path d="M2.6 10S5.4 5.1 10 5.1 17.4 10 17.4 10 14.6 14.9 10 14.9 2.6 10 2.6 10Z" />
      <circle cx="10" cy="10" r="2.2" />
    </>
  ),
  'eye-off': (
    <>
      <path d="M4.4 5.6C3.2 6.9 2.6 10 2.6 10s2.8 4.9 7.4 4.9c1.3 0 2.5-.4 3.5-1M8.2 5.4c.6-.2 1.2-.3 1.8-.3 4.6 0 7.4 4.9 7.4 4.9s-.7 1.2-1.9 2.4" />
      <path d="m4 4 12 12" />
    </>
  ),
  'arrow-up': <path d="M10 16.25V4M5.25 8.5 10 3.75l4.75 4.75" />,
  'arrow-left': <path d="M16.25 10H4M8.5 5.25 3.75 10l4.75 4.75" />,
  chat: <path d="M3.6 5.9c0-1.1.9-2 2-2h8.8c1.1 0 2 .9 2 2v5.6c0 1.1-.9 2-2 2H8.2L4.6 16.6l.1-3.1h-.05c-.6-.3-1.05-1-1.05-1.9V5.9Z" />,
  cursor: <path d="M5 3.8 15.4 9.9l-4.6 1.2-2.5 4.1L5 3.8ZM11.6 12.2l3.2 3.9" />
}

const filled: Partial<Record<IconName, ReactNode>> = {
  stop: <rect x="5.4" y="5.4" width="9.2" height="9.2" rx="2" />,
  play: <path d="M7 4.4v11.2l9-5.6-9-5.6Z" />,
  pause: (
    <>
      <rect x="5.6" y="4.4" width="3" height="11.2" rx="1.2" />
      <rect x="11.4" y="4.4" width="3" height="11.2" rx="1.2" />
    </>
  ),
  sparkle: <path d="M10 2.8 11.8 8l5.2 1.8-5.2 1.8L10 16.8 8.2 11.6 3 9.8 8.2 8 10 2.8Z" />,
  dots: (
    <>
      <circle cx="4.4" cy="10" r="1.5" />
      <circle cx="10" cy="10" r="1.5" />
      <circle cx="15.6" cy="10" r="1.5" />
    </>
  )
}

export default function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  const fill = filled[name]
  if (fill) {
    return (
      <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        {fill}
      </svg>
    )
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {stroked[name]}
    </svg>
  )
}
