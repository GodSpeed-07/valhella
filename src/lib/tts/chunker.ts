export const CHUNK_LIMIT = 950

function splitSentences(text: string): string[] {
  const out: string[] = []
  const re = /[^.!?…]+[.!?…]+["'”’)\]]*\s*/g
  let last = 0
  let m = re.exec(text)
  while (m !== null) {
    out.push(m[0])
    last = re.lastIndex
    m = re.exec(text)
  }
  if (last < text.length) out.push(text.slice(last))
  return out.filter((s) => s.trim().length > 0)
}

function splitLong(sentence: string, max: number): string[] {
  const parts: string[] = []
  let rest = sentence
  while (rest.length > max) {
    let sliceEnd = max
    const comma = rest.lastIndexOf(', ', max - 1)
    if (comma >= max * 0.4) {
      sliceEnd = comma + 1
    } else {
      const space = rest.lastIndexOf(' ', max - 1)
      if (space >= max * 0.4) sliceEnd = space + 1
    }
    parts.push(rest.slice(0, sliceEnd).trim())
    rest = rest.slice(sliceEnd).trim()
  }
  if (rest) parts.push(rest)
  return parts
}

export function chunkText(text: string, max: number = CHUNK_LIMIT): string[] {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (!clean) return []
  const sentences = splitSentences(clean).flatMap((s) => (s.length > max ? splitLong(s, max) : [s]))
  const chunks: string[] = []
  let current = ''
  for (const sentence of sentences) {
    const trimmed = sentence.trim()
    if (!trimmed) continue
    if (current && current.length + trimmed.length + 1 > max) {
      chunks.push(current)
      current = trimmed
    } else {
      current = current ? `${current} ${trimmed}` : trimmed
    }
  }
  if (current) chunks.push(current)
  return chunks
}
