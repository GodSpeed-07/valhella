import type { ActuatorAction, ActuatorResult } from '../lib/agent/types'

const SNAPSHOT_CAP = 15000

let registry = new Map<number, Element>()
let nextId = 1

const INTERACTIVE_SELECTOR = [
  'a[href]',
  'button',
  'input:not([type="hidden"])',
  'select',
  'textarea',
  'summary',
  '[contenteditable="true"]',
  '[role="button"]',
  '[role="link"]',
  '[role="textbox"]',
  '[role="searchbox"]',
  '[role="combobox"]',
  '[role="checkbox"]',
  '[role="radio"]',
  '[role="menuitem"]',
  '[role="option"]',
  '[role="switch"]',
  '[role="tab"]'
].join(',')

function isVisible(el: Element): boolean {
  const rects = el.getClientRects()
  if (rects.length === 0) return false
  const rect = el.getBoundingClientRect()
  if (rect.width < 6 || rect.height < 6) return false
  const style = getComputedStyle(el)
  if (style.visibility === 'hidden' || style.display === 'none') return false
  if (Number(style.opacity) < 0.05) return false
  if (el.closest('[aria-hidden="true"]')) return false
  return true
}

function isDisabled(el: Element): boolean {
  if (el instanceof HTMLButtonElement || el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement) {
    return el.disabled
  }
  return el.getAttribute('aria-disabled') === 'true'
}

export function roleOf(el: Element): string {
  const explicit = el.getAttribute('role')
  if (explicit) return explicit
  const tag = el.tagName.toLowerCase()
  if (tag === 'a') return 'link'
  if (tag === 'button' || tag === 'summary') return 'button'
  if (tag === 'select') return 'select'
  if (tag === 'textarea') return 'textbox'
  if (tag === 'input') {
    const type = (el as HTMLInputElement).type
    if (type === 'checkbox' || type === 'radio' || type === 'submit' || type === 'button') return type
    if (type === 'search') return 'searchbox'
    return 'textbox'
  }
  if ((el as HTMLElement).isContentEditable) return 'textbox'
  return tag
}

export function nameOf(el: Element): string {
  const aria = el.getAttribute('aria-label')
  if (aria?.trim()) return aria.trim()
  const labelledBy = el.getAttribute('aria-labelledby')
  if (labelledBy) {
    const text = labelledBy
      .split(/\s+/)
      .map((id) => document.getElementById(id)?.textContent ?? '')
      .join(' ')
      .trim()
    if (text) return text
  }
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
    const labels = (el as HTMLInputElement).labels
    if (labels && labels.length > 0) {
      const text = labels[0]?.textContent?.trim()
      if (text) return text
    }
    const placeholder = el.getAttribute('placeholder')
    if (placeholder?.trim()) return placeholder.trim()
    if (el instanceof HTMLInputElement && (el.type === 'submit' || el.type === 'button') && el.value) return el.value
    const name = el.getAttribute('name')
    if (name) return name
  }
  const title = el.getAttribute('title')
  const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim()
  return text || title?.trim() || ''
}

function stateOf(el: Element): string {
  const parts: string[] = []
  if (el instanceof HTMLInputElement) {
    if (el.type === 'checkbox' || el.type === 'radio') {
      parts.push(el.checked ? '(checked)' : '(unchecked)')
    } else if (el.type !== 'submit' && el.type !== 'button') {
      parts.push(el.value ? `(value: "${el.value.slice(0, 40)}")` : '(empty)')
    }
  } else if (el instanceof HTMLTextAreaElement) {
    parts.push(el.value ? `(value: "${el.value.slice(0, 40)}")` : '(empty)')
  } else if (el instanceof HTMLSelectElement) {
    const label = el.selectedOptions[0]?.label
    parts.push(label ? `(selected: "${label.slice(0, 40)}")` : '(nothing selected)')
  } else if (el instanceof HTMLAnchorElement && el.href) {
    try {
      const u = new URL(el.href)
      if (u.protocol.startsWith('http')) {
        parts.push(`(→ ${(u.hostname + u.pathname).replace(/\/$/, '').slice(0, 50)})`)
      }
    } catch {
      parts.push('')
    }
  }
  const expanded = el.getAttribute('aria-expanded')
  if (expanded !== null) parts.push(expanded === 'true' ? '(expanded)' : '(collapsed)')
  return parts.filter(Boolean).join(' ')
}

export function elementLine(id: number, el: Element): string {
  const name = nameOf(el).slice(0, 80)
  const state = stateOf(el)
  return `[${id}] ${roleOf(el)}${name ? ` "${name}"` : ''}${state ? ` ${state}` : ''}`
}

export function composeSnapshot(header: string, lines: string[], outline: string[], cap: number = SNAPSHOT_CAP): string {
  const parts = [header, '', 'Interactive elements (viewport first):']
  let used = parts.join('\n').length
  let truncated = false
  for (const line of lines) {
    if (used + line.length + 1 > cap - 200) {
      truncated = true
      break
    }
    parts.push(line)
    used += line.length + 1
  }
  if (outline.length > 0) {
    const head = '\nPage outline:'
    if (used + head.length < cap - 100) {
      parts.push(head)
      used += head.length + 1
      for (const line of outline) {
        if (used + line.length + 1 > cap) {
          truncated = true
          break
        }
        parts.push(line)
        used += line.length + 1
      }
    }
  }
  if (truncated) parts.push('(snapshot truncated — scroll to reveal more)')
  return parts.join('\n')
}

function buildSnapshot(): string {
  registry = new Map()
  nextId = 1
  const all = Array.from(document.querySelectorAll(INTERACTIVE_SELECTOR)).filter(
    (el) => isVisible(el) && !isDisabled(el)
  )
  const vh = window.innerHeight
  const scored = all
    .map((el) => {
      const rect = el.getBoundingClientRect()
      const inViewport = rect.bottom > 0 && rect.top < vh
      return { el, rect, score: inViewport ? rect.top : vh + Math.abs(rect.top < 0 ? -rect.top + vh : rect.top) }
    })
    .sort((a, b) => a.score - b.score)
  const lines: string[] = []
  for (const { el } of scored) {
    const id = nextId++
    registry.set(id, el)
    lines.push(elementLine(id, el))
  }
  const outline: string[] = []
  for (const h of Array.from(document.querySelectorAll('h1, h2, h3'))) {
    const text = (h.textContent ?? '').replace(/\s+/g, ' ').trim()
    if (!text) continue
    const depth = Number(h.tagName.slice(1))
    outline.push(`${'  '.repeat(depth - 1)}${'#'.repeat(depth)} ${text.slice(0, 110)}`)
    if (outline.length >= 40) break
  }
  const scrollable = document.documentElement.scrollHeight - window.innerHeight
  const scrollPct = scrollable > 0 ? Math.round((window.scrollY / scrollable) * 100) : 0
  const header = `Page: ${document.title.slice(0, 120)}\nURL: ${location.href.slice(0, 200)}\nScroll position: ${scrollPct}% ${scrollable > 0 ? 'of a scrollable page' : '(fits in one screen)'}`
  return composeSnapshot(header, lines, outline)
}

function resolve(id: number): Element | null {
  const el = registry.get(id)
  if (!el || !el.isConnected) return null
  return el
}

function settle(maxMs = 3000, quietMs = 500): Promise<void> {
  return new Promise((resolvePromise) => {
    let timer = window.setTimeout(finish, quietMs)
    const hardStop = window.setTimeout(finish, maxMs)
    const observer = new MutationObserver(() => {
      window.clearTimeout(timer)
      timer = window.setTimeout(finish, quietMs)
    })
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true })
    function finish() {
      observer.disconnect()
      window.clearTimeout(timer)
      window.clearTimeout(hardStop)
      resolvePromise()
    }
  })
}

function isPasswordField(el: Element): boolean {
  return el instanceof HTMLInputElement && el.type === 'password'
}

function isCardField(el: Element): boolean {
  const auto = (el.getAttribute('autocomplete') ?? '').toLowerCase()
  if (auto.startsWith('cc-')) return true
  const hint = `${el.getAttribute('name') ?? ''} ${el.id} ${el.getAttribute('aria-label') ?? ''}`.toLowerCase()
  return /card.?number|cc.?num|cvc|cvv|security.?code|card.?exp/i.test(hint)
}

const PURCHASE_RE = /\b(place (your )?order|pay now|pay \$|buy now|complete (purchase|order|payment)|confirm (purchase|order|payment)|submit (order|payment)|purchase now)\b/i

function isPurchaseControl(el: Element): boolean {
  const name = nameOf(el)
  const role = roleOf(el)
  if (!/button|submit/.test(role)) return false
  return PURCHASE_RE.test(name)
}

function firePointer(el: Element): void {
  const rect = el.getBoundingClientRect()
  const x = rect.left + rect.width / 2
  const y = rect.top + rect.height / 2
  const opts = { bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y, view: window }
  el.dispatchEvent(new PointerEvent('pointerdown', { ...opts, pointerId: 1, isPrimary: true }))
  el.dispatchEvent(new MouseEvent('mousedown', opts))
  el.dispatchEvent(new PointerEvent('pointerup', { ...opts, pointerId: 1, isPrimary: true }))
  el.dispatchEvent(new MouseEvent('mouseup', opts))
  el.dispatchEvent(new MouseEvent('click', opts))
}

function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  const proto = el instanceof HTMLInputElement ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
  if (setter) setter.call(el, value)
  else el.value = value
  el.dispatchEvent(new Event('input', { bubbles: true }))
  el.dispatchEvent(new Event('change', { bubbles: true }))
}

function pressEnter(el: Element): void {
  const opts = { bubbles: true, cancelable: true, key: 'Enter', code: 'Enter', keyCode: 13, which: 13 }
  el.dispatchEvent(new KeyboardEvent('keydown', opts))
  el.dispatchEvent(new KeyboardEvent('keypress', opts))
  el.dispatchEvent(new KeyboardEvent('keyup', opts))
  const form = (el as HTMLInputElement).form
  if (form && !form.querySelector('button[type="submit"], input[type="submit"]')) {
    form.dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }))
  }
}

function staleResult(id: number): ActuatorResult {
  return {
    ok: false,
    outcome: `Element [${id}] is stale — the page has changed since that snapshot. Use the fresh snapshot below.`,
    snapshot: buildSnapshot(),
    refusal: null
  }
}

export async function handleAgentAction(action: ActuatorAction): Promise<ActuatorResult> {
  switch (action.tool) {
    case 'read_page': {
      return { ok: true, outcome: 'Read the page.', snapshot: buildSnapshot(), refusal: null }
    }
    case 'click': {
      const el = resolve(action.elementId)
      if (!el) return staleResult(action.elementId)
      if (isPurchaseControl(el) && !action.approvedPayment) {
        return {
          ok: false,
          outcome: `Refused: "${nameOf(el).slice(0, 60)}" looks like a final purchase or payment step. Briefly pauses there — ask the user to approve it in the panel before retrying.`,
          snapshot: null,
          refusal: 'payment'
        }
      }
      const label = elementLine(action.elementId, el)
      el.scrollIntoView({ block: 'center', inline: 'nearest' })
      await new Promise((r) => setTimeout(r, 80))
      if (el instanceof HTMLElement) el.focus({ preventScroll: true })
      firePointer(el)
      await settle()
      return { ok: true, outcome: `Clicked ${label}.`, snapshot: buildSnapshot(), refusal: null }
    }
    case 'type_text': {
      const el = resolve(action.elementId)
      if (!el) return staleResult(action.elementId)
      if (isPasswordField(el)) {
        return {
          ok: false,
          outcome: 'Refused: that is a password field. Briefly never types into password fields — ask the user to enter it themselves.',
          snapshot: null,
          refusal: 'password'
        }
      }
      if (isCardField(el)) {
        return {
          ok: false,
          outcome: 'Refused: that looks like a payment card field. Briefly never enters card details — ask the user to fill it themselves.',
          snapshot: null,
          refusal: 'payment'
        }
      }
      const label = nameOf(el).slice(0, 50)
      el.scrollIntoView({ block: 'center' })
      if (el instanceof HTMLElement) el.focus({ preventScroll: true })
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        setNativeValue(el, action.text)
      } else if ((el as HTMLElement).isContentEditable) {
        const html = el as HTMLElement
        html.textContent = action.text
        html.dispatchEvent(new InputEvent('input', { bubbles: true, data: action.text }))
      } else {
        return {
          ok: false,
          outcome: `Element [${action.elementId}] is not editable.`,
          snapshot: buildSnapshot(),
          refusal: null
        }
      }
      if (action.pressEnter) pressEnter(el)
      await settle()
      return {
        ok: true,
        outcome: `Typed "${action.text.slice(0, 60)}" into ${label || 'the field'}${action.pressEnter ? ' and pressed Enter' : ''}.`,
        snapshot: buildSnapshot(),
        refusal: null
      }
    }
    case 'select_option': {
      const el = resolve(action.elementId)
      if (!el) return staleResult(action.elementId)
      if (!(el instanceof HTMLSelectElement)) {
        return { ok: false, outcome: `Element [${action.elementId}] is not a select.`, snapshot: buildSnapshot(), refusal: null }
      }
      const wanted = action.value.toLowerCase()
      const option = Array.from(el.options).find(
        (o) => o.value.toLowerCase() === wanted || o.label.toLowerCase() === wanted || o.label.toLowerCase().includes(wanted)
      )
      if (!option) {
        const available = Array.from(el.options)
          .slice(0, 12)
          .map((o) => `"${o.label}"`)
          .join(', ')
        return { ok: false, outcome: `No option matching "${action.value}". Available: ${available}.`, snapshot: buildSnapshot(), refusal: null }
      }
      el.value = option.value
      el.dispatchEvent(new Event('input', { bubbles: true }))
      el.dispatchEvent(new Event('change', { bubbles: true }))
      await settle()
      return { ok: true, outcome: `Selected "${option.label}".`, snapshot: buildSnapshot(), refusal: null }
    }
    case 'scroll': {
      if (action.elementId !== undefined) {
        const el = resolve(action.elementId)
        if (!el) return staleResult(action.elementId)
        el.scrollIntoView({ block: 'center' })
      } else {
        const delta = window.innerHeight * 0.8 * (action.direction === 'up' ? -1 : 1)
        window.scrollBy({ top: delta, behavior: 'auto' })
      }
      await settle(1500, 350)
      return { ok: true, outcome: 'Scrolled.', snapshot: buildSnapshot(), refusal: null }
    }
  }
}
