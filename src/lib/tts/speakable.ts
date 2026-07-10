export function speakableText(md: string): string {
  let t = md
  t = t.replace(/```[\s\S]*?```/g, ' Code block omitted. ')
  t = t.replace(/`([^`\n]+)`/g, '$1')
  t = t.replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
  t = t.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
  t = t.replace(/^#{1,6}\s+/gm, '')
  t = t.replace(/^\s*[-*+]\s+/gm, '')
  t = t.replace(/^\s*\d+\.\s+/gm, '')
  t = t.replace(/^\s*>\s?/gm, '')
  t = t.replace(/\|/g, ', ')
  t = t.replace(/[*_~]{1,3}([^*_~]+)[*_~]{1,3}/g, '$1')
  t = t.replace(/^[-=]{3,}$/gm, ' ')
  t = t.replace(/[ \t]+/g, ' ')
  t = t.replace(/\n{2,}/g, '. ')
  t = t.replace(/\n/g, ' ')
  t = t.replace(/\.\s*\./g, '.')
  return t.trim()
}
