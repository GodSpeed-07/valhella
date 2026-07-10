import { describe, expect, it } from 'vitest'
import { composeSnapshot, elementLine, nameOf, roleOf } from '../../src/content/actuator'

function make(html: string): Element {
  const host = document.createElement('div')
  host.innerHTML = html
  document.body.appendChild(host)
  return host.firstElementChild as Element
}

describe('snapshot serializer', () => {
  it('labels buttons with their text', () => {
    const el = make('<button>Add to cart</button>')
    expect(roleOf(el)).toBe('button')
    expect(elementLine(12, el)).toBe('[12] button "Add to cart"')
  })

  it('labels inputs with placeholder and emptiness', () => {
    const el = make('<input type="search" placeholder="Search products" />')
    expect(elementLine(3, el)).toBe('[3] searchbox "Search products" (empty)')
  })

  it('shows current input values', () => {
    const el = make('<input type="text" aria-label="City" value="Berlin" />')
    expect(elementLine(4, el)).toBe('[4] textbox "City" (value: "Berlin")')
  })

  it('shows link destinations', () => {
    const el = make('<a href="https://example.com/pricing">Pricing</a>')
    expect(elementLine(7, el)).toBe('[7] link "Pricing" (→ example.com/pricing)')
  })

  it('shows checkbox state and select selection', () => {
    const box = make('<input type="checkbox" aria-label="Agree" checked />')
    expect(elementLine(1, box)).toContain('(checked)')
    const sel = make('<select aria-label="Size"><option value="s">Small</option><option value="l" selected>Large</option></select>')
    expect(elementLine(2, sel)).toBe('[2] select "Size" (selected: "Large")')
  })

  it('prefers aria-label over text', () => {
    const el = make('<button aria-label="Close dialog">×</button>')
    expect(nameOf(el)).toBe('Close dialog')
  })

  it('composes a capped snapshot with header, elements, and outline', () => {
    const header = 'Page: Test\nURL: https://t.example\nScroll position: 0% (fits in one screen)'
    const lines = Array.from({ length: 300 }, (_, i) => `[${i + 1}] button "Button number ${i + 1} with a reasonably long label"`)
    const outline = ['# Main heading', '  ## Section']
    const snap = composeSnapshot(header, lines, outline, 4000)
    expect(snap.length).toBeLessThanOrEqual(4000)
    expect(snap).toContain('Page: Test')
    expect(snap).toContain('[1] button')
    expect(snap).toContain('(snapshot truncated — scroll to reveal more)')
  })

  it('keeps small snapshots whole with the outline', () => {
    const snap = composeSnapshot('Page: Tiny\nURL: x\nScroll position: 0%', ['[1] link "Home"'], ['# Tiny'])
    expect(snap).toContain('[1] link "Home"')
    expect(snap).toContain('# Tiny')
    expect(snap).not.toContain('truncated')
  })
})
