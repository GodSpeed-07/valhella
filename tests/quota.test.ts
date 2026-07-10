import { describe, expect, it } from 'vitest'
import { addChars, currentMonth, rollLedger, wouldExceed, SOFT_LIMIT } from '../src/lib/tts/quota'

const june = new Date('2026-06-15T12:00:00Z')
const july = new Date('2026-07-02T12:00:00Z')

describe('tts quota ledger', () => {
  it('formats the month key', () => {
    expect(currentMonth(june)).toBe('2026-06')
  })

  it('rolls over to a fresh ledger on month change', () => {
    const u = { month: '2026-06', chars: 40000 }
    expect(rollLedger(u, june)).toEqual(u)
    expect(rollLedger(u, july)).toEqual({ month: '2026-07', chars: 0 })
  })

  it('accumulates characters within the month', () => {
    let u = { month: currentMonth(june), chars: 0 }
    u = addChars(u, 900, june)
    u = addChars(u, 100, june)
    expect(u.chars).toBe(1000)
  })

  it('resets before accumulating across months', () => {
    const u = addChars({ month: '2026-06', chars: 59000 }, 500, july)
    expect(u).toEqual({ month: '2026-07', chars: 500 })
  })

  it('flags the soft limit only when crossed in the live month', () => {
    expect(wouldExceed({ month: currentMonth(june), chars: SOFT_LIMIT - 100 }, 99, SOFT_LIMIT, june)).toBe(false)
    expect(wouldExceed({ month: currentMonth(june), chars: SOFT_LIMIT - 100 }, 101, SOFT_LIMIT, june)).toBe(true)
    expect(wouldExceed({ month: '2026-06', chars: 60000 }, 500, SOFT_LIMIT, july)).toBe(false)
  })

  it('ignores negative additions', () => {
    expect(addChars({ month: currentMonth(june), chars: 10 }, -5, june).chars).toBe(10)
  })
})
