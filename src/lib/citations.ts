import { isTextBlock, type AnyBlock, type TextCitation } from './anthropic/types'

export interface Segment {
  text: string
  citations: TextCitation[]
}

export interface Source {
  url: string
  title: string
}

export function buildSegments(blocks: AnyBlock[]): Segment[] {
  const textBlocks = blocks.filter(isTextBlock)
  const anyCitations = textBlocks.some((b) => Array.isArray(b.citations) && b.citations.length > 0)
  if (!anyCitations) {
    const text = textBlocks.map((b) => b.text).join('')
    return text ? [{ text, citations: [] }] : []
  }
  return textBlocks
    .filter((b) => b.text.length > 0)
    .map((b) => ({
      text: b.text,
      citations: Array.isArray(b.citations) ? (b.citations as TextCitation[]) : []
    }))
}

export function collectSources(blocks: AnyBlock[]): Source[] {
  const sources: Source[] = []
  const seen = new Set<string>()
  for (const block of blocks) {
    if (!isTextBlock(block) || !Array.isArray(block.citations)) continue
    for (const c of block.citations as TextCitation[]) {
      const url = typeof c.url === 'string' ? c.url : null
      if (!url || seen.has(url)) continue
      seen.add(url)
      sources.push({ url, title: typeof c.title === 'string' && c.title ? c.title : url })
    }
  }
  return sources
}

export function sourceNumber(sources: Source[], url: string | undefined): number | null {
  if (!url) return null
  const idx = sources.findIndex((s) => s.url === url)
  return idx === -1 ? null : idx + 1
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}
