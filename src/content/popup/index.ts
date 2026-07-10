import {
  getSettings,
  hostnameOf,
  updateSettings,
  watchSettings,
  type Settings
} from '../../lib/settings'
import {
  askRequest,
  buildQuickRequest,
  handoffUserText,
  resolveActions,
  type ResolvedAction
} from '../../lib/actions'
import {
  PORT_QUICK_ACTION,
  sendRuntime,
  type HandoffPayload,
  type QuickActionEvent,
  type QuickActionRequest
} from '../../lib/messages'
import { renderMd } from './md'
import { POPUP_CSS } from './styles'

const ICONS = {
  x: '<svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="m5 5 10 10M15 5 5 15"/></svg>',
  copy: '<svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="7.25" y="7.25" width="8.5" height="8.5" rx="1.75"/><path d="M4.75 12.5V6.1c0-.75.6-1.35 1.35-1.35h6.4"/></svg>',
  check: '<svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m4.25 10.6 3.6 3.65 7.9-8.5"/></svg>',
  panel: '<svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3.5" width="14" height="13" rx="2"/><path d="M12.5 3.5v13"/></svg>',
  speaker: '<svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7.75v4.5h2.8L11 15.6V4.4L6.8 7.75H4Z"/><path d="M13.7 7.3a3.9 3.9 0 0 1 0 5.4M15.9 5.2a6.9 6.9 0 0 1 0 9.6"/></svg>',
  stopSq: '<svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor"><rect x="5.4" y="5.4" width="9.2" height="9.2" rx="2"/></svg>',
  arrow: '<svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 16V4M5 8.5 10 4l5 4.5"/></svg>',
  dots: '<svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><circle cx="4.4" cy="10" r="1.5"/><circle cx="10" cy="10" r="1.5"/><circle cx="15.6" cy="10" r="1.5"/></svg>',
  warn: '<svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3.6 17.4 16H2.6L10 3.6ZM10 8.6v3.3M10 14.1v.05"/></svg>',
  mark: '<svg width="18" height="18" viewBox="0 0 128 128"><rect width="128" height="128" rx="30" fill="#C2481A"/><rect x="28" y="36" width="72" height="11" rx="5.5" fill="#F8F2E5"/><rect x="28" y="58" width="50" height="11" rx="5.5" fill="#F8F2E5"/><rect x="28" y="80" width="62" height="11" rx="5.5" fill="#EFB795"/></svg>'
}

let settings: Settings | null = null
let host: HTMLDivElement | null = null
let shadow: ShadowRoot | null = null
let wrap: HTMLDivElement | null = null
let mode: 'hidden' | 'pill' | 'card' = 'hidden'
let selText = ''
let anchor: DOMRect | null = null
let port: chrome.runtime.Port | null = null
let currentAction: ResolvedAction | null = null
let currentQuestion: string | null = null
let resultText = ''
let done = false
let fontRequested = false
let checkTimer = 0
let speakState: 'idle' | 'loading' | 'playing' = 'idle'
let speakBtn: HTMLButtonElement | null = null

function speakLabel(): string {
  if (speakState === 'loading') return `${ICONS.speaker}<span>Loading…</span>`
  if (speakState === 'playing') return `${ICONS.stopSq}<span>Stop</span>`
  return `${ICONS.speaker}<span>Read aloud</span>`
}

function updateSpeakBtn(): void {
  if (speakBtn) speakBtn.innerHTML = speakLabel()
}

function stopPopupSpeech(): void {
  if (speakState !== 'idle') {
    speakState = 'idle'
    void sendRuntime({ kind: 'popup-speak-stop' }).catch(() => undefined)
    updateSpeakBtn()
  }
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (cls) node.className = cls
  if (text !== undefined) node.textContent = text
  return node
}

function isDark(): boolean {
  const theme = settings?.theme ?? 'system'
  if (theme === 'dark') return true
  if (theme === 'light') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function ensureShadow(): ShadowRoot {
  if (shadow) return shadow
  host = el('div')
  host.style.cssText = 'all:initial;position:absolute;top:0;left:0;width:0;height:0;z-index:2147483646;'
  shadow = host.attachShadow({ mode: 'closed' })
  const sheet = new CSSStyleSheet()
  sheet.replaceSync(POPUP_CSS)
  shadow.adoptedStyleSheets = [sheet]
  ;(document.body ?? document.documentElement).appendChild(host)
  if (!fontRequested) {
    fontRequested = true
    try {
      const font = new FontFace(
        'Briefly Grotesk',
        `url(${chrome.runtime.getURL('fonts/schibsted-grotesk-latin-wght-normal.woff2')}) format('woff2-variations')`,
        { weight: '400 900' }
      )
      void font.load().then((f) => document.fonts.add(f))
    } catch {
      fontRequested = true
    }
  }
  return shadow
}

function insideOurUi(target: EventTarget | null, path?: EventTarget[]): boolean {
  if (!host) return false
  if (path && path.includes(host)) return true
  return target === host
}

function place(prefer: 'above' | 'below'): void {
  if (!wrap || !anchor) return
  const w = wrap.offsetWidth
  const h = wrap.offsetHeight
  const cx = anchor.left + anchor.width / 2
  const left = Math.max(8, Math.min(cx - w / 2, window.innerWidth - w - 8))
  let top: number
  if (prefer === 'above') {
    top = anchor.top - h - 8
    if (top < 8) top = Math.min(anchor.bottom + 8, window.innerHeight - h - 8)
  } else {
    top = anchor.bottom + 8
    if (top + h > window.innerHeight - 8) top = Math.max(8, anchor.top - h - 8)
  }
  wrap.style.left = `${Math.round(left)}px`
  wrap.style.top = `${Math.round(top)}px`
}

function clearWrap(): void {
  wrap?.remove()
  wrap = null
}

function teardownStream(): void {
  if (port) {
    try {
      port.disconnect()
    } catch {
      port = null
    }
    port = null
  }
}

export function dismissPopup(): void {
  if (mode === 'hidden') return
  teardownStream()
  stopPopupSpeech()
  speakBtn = null
  mode = 'hidden'
  const dying = wrap
  wrap = null
  if (dying) {
    dying.classList.add('out')
    window.setTimeout(() => dying.remove(), 110)
  }
  currentAction = null
  currentQuestion = null
  resultText = ''
  done = false
}

function miniMenu(anchorBtn: HTMLElement, container: HTMLElement): void {
  const existing = container.querySelector('.mini-menu')
  if (existing) {
    existing.remove()
    return
  }
  const menu = el('div', 'mini-menu')
  const hideHere = el('button', 'mini-item', `Hide on ${hostnameOf(location.href) ?? 'this site'}`)
  hideHere.addEventListener('click', () => {
    const h = hostnameOf(location.href)
    if (h && settings) {
      void updateSettings({ selectionPopupBlocklist: [...settings.selectionPopupBlocklist, h] })
    }
    dismissPopup()
  })
  const off = el('button', 'mini-item', 'Turn off the selection popup')
  off.addEventListener('click', () => {
    void updateSettings({ selectionPopupEnabled: false })
    dismissPopup()
  })
  menu.append(hideHere, off)
  menu.addEventListener('mousedown', (e) => e.preventDefault())
  anchorBtn.insertAdjacentElement('afterend', menu)
}

function showPill(): void {
  if (!settings) return
  const root = ensureShadow()
  clearWrap()
  mode = 'pill'
  wrap = el('div', 'wrap')
  wrap.dataset.dark = String(isDark())
  const pill = el('div', 'pill')
  pill.addEventListener('mousedown', (e) => e.preventDefault())
  const mark = el('span', 'mark')
  mark.innerHTML = ICONS.mark
  pill.appendChild(mark)
  for (const action of resolveActions(settings)) {
    const btn = el('button', 'act', action.name)
    btn.addEventListener('click', () => runAction(action))
    pill.appendChild(btn)
  }
  const ask = el('button', 'act ask', 'Ask Briefly…')
  ask.addEventListener('click', () => showCard('ask'))
  pill.appendChild(ask)
  const dotsWrap = el('span')
  dotsWrap.style.position = 'relative'
  const dots = el('button', 'dots')
  dots.innerHTML = ICONS.dots
  dots.setAttribute('aria-label', 'Popup options')
  dots.addEventListener('click', () => miniMenu(dots, dotsWrap))
  dotsWrap.appendChild(dots)
  pill.appendChild(dotsWrap)
  wrap.appendChild(pill)
  root.appendChild(wrap)
  place('above')
}

function footerButton(label: string, icon: string, primary = false): HTMLButtonElement {
  const b = el('button', primary ? 'foot-btn primary' : 'foot-btn')
  b.innerHTML = `${icon}<span>${label}</span>`
  return b
}

interface CardRefs {
  body: HTMLDivElement
  title: HTMLSpanElement
  qEl: HTMLDivElement
  foot: HTMLDivElement
}

let refs: CardRefs | null = null

function showCard(kind: 'ask' | 'stream'): void {
  const root = ensureShadow()
  clearWrap()
  mode = 'card'
  wrap = el('div', 'wrap')
  wrap.dataset.dark = String(isDark())
  const card = el('div', 'card')
  card.addEventListener('mousedown', (e) => {
    const t = e.target as HTMLElement
    if (t.tagName !== 'INPUT') e.preventDefault()
  })

  const head = el('div', 'card-head')
  const mark = el('span', 'mark')
  mark.innerHTML = ICONS.mark
  const title = el('span', 'card-title', currentAction?.name ?? 'Ask Briefly')
  const close = el('button', 'icon-btn')
  close.innerHTML = ICONS.x
  close.setAttribute('aria-label', 'Close')
  close.addEventListener('click', dismissPopup)
  head.append(mark, title, close)

  const qEl = el('div', 'card-q')
  qEl.style.display = 'none'
  const body = el('div', 'card-body')
  const foot = el('div', 'card-foot')
  foot.style.display = 'none'

  card.append(head, qEl, body, foot)
  wrap.appendChild(card)
  root.appendChild(wrap)
  refs = { body, title, qEl, foot }

  if (kind === 'ask') {
    body.innerHTML = ''
    const row = el('div', 'ask-row')
    const input = el('input', 'ask-input') as HTMLInputElement
    input.placeholder = 'Ask about this selection…'
    const send = el('button', 'ask-send')
    send.innerHTML = ICONS.arrow
    send.setAttribute('aria-label', 'Ask')
    const submit = () => {
      const q = input.value.trim()
      if (!q || !settings) return
      currentQuestion = q
      currentAction = null
      startStream(askRequest(q, selText, settings))
    }
    send.addEventListener('click', submit)
    input.addEventListener('keydown', (e) => {
      e.stopPropagation()
      if (e.key === 'Enter') submit()
      if (e.key === 'Escape') dismissPopup()
    })
    row.append(input, send)
    body.replaceChildren(row)
    body.style.padding = '0'
    window.setTimeout(() => input.focus(), 40)
  }
  place('below')
}

function renderResult(): void {
  if (!refs) return
  refs.body.style.padding = ''
  const near =
    refs.body.scrollHeight - refs.body.scrollTop - refs.body.clientHeight < 40
  if (!resultText && !done) {
    refs.body.innerHTML = '<div class="waiting">One moment…</div>'
  } else {
    const md = el('div', 'md')
    md.innerHTML = renderMd(resultText)
    if (!done) {
      const caret = el('span', 'caret')
      md.appendChild(caret)
    }
    refs.body.replaceChildren(md)
  }
  if (near) refs.body.scrollTop = refs.body.scrollHeight
  place('below')
}

function renderFooter(): void {
  if (!refs) return
  refs.foot.style.display = 'flex'
  refs.foot.innerHTML = ''
  const copy = footerButton('Copy', ICONS.copy)
  copy.addEventListener('click', () => {
    void navigator.clipboard.writeText(resultText).then(() => {
      copy.innerHTML = `${ICONS.check}<span>Copied</span>`
      window.setTimeout(() => {
        copy.innerHTML = `${ICONS.copy}<span>Copy</span>`
      }, 1400)
    })
  })
  speakBtn = footerButton('Read aloud', ICONS.speaker)
  speakBtn.innerHTML = speakLabel()
  speakBtn.addEventListener('click', () => {
    if (speakState === 'idle') {
      speakState = 'loading'
      updateSpeakBtn()
      void sendRuntime({ kind: 'popup-speak', text: resultText }).catch(() => {
        speakState = 'idle'
        updateSpeakBtn()
      })
    } else {
      stopPopupSpeech()
    }
  })
  const spacer = el('span', 'foot-spacer')
  const cont = footerButton('Continue in panel', ICONS.panel, true)
  cont.addEventListener('click', () => {
    if (!settings) return
    const payload: HandoffPayload = {
      userText: handoffUserText(currentAction, currentQuestion, selText),
      assistantText: done ? resultText : null,
      model: settings.defaultModel,
      title: null,
      autoSend: !done
    }
    void sendRuntime({ kind: 'panel-handoff', payload })
    dismissPopup()
  })
  refs.foot.append(copy, speakBtn, spacer, cont)
}

export function onSpeakState(state: 'loading' | 'playing' | 'ended' | 'error'): void {
  if (state === 'loading') speakState = 'loading'
  else if (state === 'playing') speakState = 'playing'
  else speakState = 'idle'
  updateSpeakBtn()
}

function showError(message: string, canRetry: boolean, retry: () => void): void {
  if (!refs) return
  const err = el('div', 'err')
  const icon = el('span')
  icon.innerHTML = ICONS.warn
  const text = el('span', undefined, message)
  err.append(icon, text)
  if (canRetry) {
    const btn = el('button', undefined, 'Retry')
    btn.addEventListener('click', retry)
    err.appendChild(btn)
  }
  refs.body.replaceChildren(err)
  place('below')
}

function startStream(request: QuickActionRequest): void {
  teardownStream()
  resultText = ''
  done = false
  if (currentQuestion && refs) {
    refs.qEl.textContent = currentQuestion
    refs.qEl.style.display = 'block'
    refs.title.textContent = 'Ask Briefly'
  }
  renderResult()
  try {
    port = chrome.runtime.connect({ name: PORT_QUICK_ACTION })
  } catch {
    showError("Couldn't reach Briefly — reload the page.", false, () => undefined)
    return
  }
  const thisPort = port
  thisPort.onMessage.addListener((raw) => {
    const event = raw as QuickActionEvent
    if (event.kind === 'delta') {
      resultText = event.text
      renderResult()
    } else if (event.kind === 'done') {
      resultText = event.full
      done = true
      renderResult()
      renderFooter()
      teardownStream()
    } else if (event.kind === 'error') {
      done = true
      teardownStream()
      const retry = () => {
        if (currentAction && settings) startStream(buildQuickRequest(currentAction, selText, settings, { title: document.title, url: location.href }))
        else if (currentQuestion && settings) startStream(askRequest(currentQuestion, selText, settings))
      }
      if (event.code === 'no-key') showError('Add your Anthropic key in Briefly first.', false, retry)
      else if (event.code === 'refusal') showError('Briefly declined this one.', false, retry)
      else showError(event.message || 'Something went wrong.', true, retry)
    }
  })
  thisPort.onDisconnect.addListener(() => {
    if (port === thisPort) port = null
    if (!done && mode === 'card') {
      done = true
      showError('The connection dropped.', true, () => {
        if (currentAction && settings) startStream(buildQuickRequest(currentAction, selText, settings, { title: document.title, url: location.href }))
        else if (currentQuestion && settings) startStream(askRequest(currentQuestion, selText, settings))
      })
    }
  })
  thisPort.postMessage({ kind: 'run', request })
}

function runAction(action: ResolvedAction): void {
  if (!settings) return
  currentAction = action
  currentQuestion = null
  showCard('stream')
  startStream(buildQuickRequest(action, selText, settings, { title: document.title, url: location.href }))
}

function evaluateSelection(): void {
  if (!settings || !settings.selectionPopupEnabled) return
  if (mode === 'card') return
  const h = hostnameOf(location.href)
  if (!h || settings.selectionPopupBlocklist.includes(h)) return
  const sel = window.getSelection()
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
    if (mode === 'pill') dismissPopup()
    return
  }
  const text = sel.toString().trim()
  if (text.length < 3 || text.length > 20000) {
    if (mode === 'pill') dismissPopup()
    return
  }
  const rect = sel.getRangeAt(0).getBoundingClientRect()
  if (rect.width === 0 && rect.height === 0) return
  selText = text.slice(0, 12000)
  anchor = rect
  showPill()
}

function scheduleCheck(): void {
  window.clearTimeout(checkTimer)
  checkTimer = window.setTimeout(evaluateSelection, 130)
}

export function initPopup(): void {
  void getSettings().then((s) => {
    settings = s
  })
  watchSettings((s) => {
    settings = s
    if (!s.selectionPopupEnabled && mode !== 'hidden') dismissPopup()
    if (wrap) wrap.dataset.dark = String(isDark())
  })

  document.addEventListener('mouseup', (e) => {
    if (insideOurUi(e.target, e.composedPath())) return
    scheduleCheck()
  })
  document.addEventListener('keyup', (e) => {
    if (e.key === 'Shift' || e.key.startsWith('Arrow')) scheduleCheck()
  })
  document.addEventListener(
    'mousedown',
    (e) => {
      if (mode === 'hidden') return
      if (insideOurUi(e.target, e.composedPath())) return
      dismissPopup()
    },
    true
  )
  document.addEventListener(
    'keydown',
    (e) => {
      if (e.key === 'Escape' && mode !== 'hidden') {
        e.stopPropagation()
        dismissPopup()
      }
    },
    true
  )
  window.addEventListener(
    'scroll',
    (e) => {
      if (mode === 'hidden') return
      if (insideOurUi(e.target, e.composedPath?.())) return
      dismissPopup()
    },
    { passive: true, capture: true }
  )
  window.addEventListener('resize', () => {
    if (mode !== 'hidden') dismissPopup()
  })
}
