import { describe, expect, it } from 'vitest'
import { chunkText, CHUNK_LIMIT } from '../src/lib/tts/chunker'
import { speakableText } from '../src/lib/tts/speakable'

describe('chunkText', () => {
  it('returns nothing for empty input', () => {
    expect(chunkText('')).toEqual([])
    expect(chunkText('   \n  ')).toEqual([])
  })

  it('keeps short text as one chunk', () => {
    expect(chunkText('Hello there. How are you?')).toEqual(['Hello there. How are you?'])
  })

  it('splits on sentence boundaries under the limit', () => {
    const sentence = `${'word '.repeat(60)}end.`
    const text = Array.from({ length: 8 }, () => sentence).join(' ')
    const chunks = chunkText(text)
    expect(chunks.length).toBeGreaterThan(1)
    for (const c of chunks) {
      expect(c.length).toBeLessThanOrEqual(CHUNK_LIMIT)
      expect(c.trim().endsWith('.')).toBe(true)
    }
  })

  it('splits a single monster sentence at commas then hard-slices', () => {
    const monster = `${'part one two three, '.repeat(120)}done`
    const chunks = chunkText(monster)
    expect(chunks.length).toBeGreaterThan(1)
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(CHUNK_LIMIT)
  })

  it('hard-slices unbroken runs', () => {
    const run = 'a'.repeat(3000)
    const chunks = chunkText(run)
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(CHUNK_LIMIT)
    expect(chunks.join('')).toHaveLength(3000)
  })

  it('loses no meaningful content', () => {
    const text = 'First sentence. Second one! Third? Fourth… fifth.'
    const joined = chunkText(text).join(' ').replace(/\s+/g, ' ')
    expect(joined).toBe(text)
  })

  it('respects a custom limit', () => {
    const chunks = chunkText('One two. Three four. Five six.', 12)
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(12)
  })
})

describe('speakableText', () => {
  it('strips markdown to speech-friendly prose', () => {
    const md = '# Title\n\nSome **bold** and `code` text.\n\n```js\nconst x = 1\n```\n\n- item one\n- item two\n\n[link](https://x.com)'
    const s = speakableText(md)
    expect(s).toContain('Title')
    expect(s).toContain('Some bold and code text.')
    expect(s).toContain('Code block omitted.')
    expect(s).toContain('item one')
    expect(s).toContain('link')
    expect(s).not.toContain('```')
    expect(s).not.toContain('**')
    expect(s).not.toContain('https://x.com')
  })
})
