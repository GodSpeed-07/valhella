import type { PageExtract } from '../messages'

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function chatSystem(): string {
  return [
    'You are Briefly, a calm and precise AI companion living in the user\'s browser side panel.',
    `Today's date is ${today()}.`,
    'Be genuinely helpful and get to the point. Prefer short, well-structured answers; expand only when the question needs depth.',
    'Format with Markdown: code in fenced blocks with a language tag, tables when comparing, tight lists.',
    'When page content is attached inside <page> tags, treat it as what the user is currently reading. Ground your answer in it, and say plainly when the page does not contain the answer.',
    'When the user attaches a selection inside <selection> tags, it is the text they highlighted on the page.',
    'When you use web search, cited sources render automatically in the interface, so never append a list of sources or URLs to your answer.',
    'Never invent page content, quotes, or sources.'
  ].join('\n')
}

export function quickSystem(): string {
  return [
    'You are Briefly, an instant text assistant.',
    'Follow the instruction exactly and reply with only the result.',
    'Be brief and precise. Plain Markdown, no headings unless essential, no preamble, no closing remarks.'
  ].join('\n')
}

export const TITLE_SYSTEM =
  'You title conversations. Reply with only a 2-5 word title in plain text. No quotes, no trailing punctuation.'

export function titleUser(userText: string, assistantText: string): string {
  return `Title this conversation.\n\nUser: ${userText.slice(0, 600)}\n\nAssistant: ${assistantText.slice(0, 600)}`
}

export function pageContextText(page: PageExtract): string {
  const parts = [`<page title=${JSON.stringify(page.title)} url=${JSON.stringify(page.url)}>`]
  if (page.text) parts.push(page.text)
  parts.push('</page>')
  if (page.truncated) parts.push('(page text truncated)')
  if (page.selection) {
    parts.push(`<selection>\n${page.selection}\n</selection>`)
  }
  return parts.join('\n')
}

export interface QuickActionDef {
  id: string
  name: string
  icon: 'list' | 'book' | 'wand' | 'globe' | 'pencil'
  instruction: (targetLanguage: string) => string
}

export const QUICK_ACTIONS: QuickActionDef[] = [
  {
    id: 'summarize',
    name: 'Summarize',
    icon: 'list',
    instruction: () =>
      'Summarize the text in a few tight sentences, or short bullets if the content is genuinely list-like. Preserve key facts, names, and numbers.'
  },
  {
    id: 'explain',
    name: 'Explain',
    icon: 'book',
    instruction: () =>
      'Explain the text plainly for a smart non-expert. Keep it short and define any jargon in passing.'
  },
  {
    id: 'simplify',
    name: 'Simplify',
    icon: 'wand',
    instruction: () =>
      'Rewrite the text in plain, simple language a young reader could follow. Keep the meaning, drop the filler. Output only the rewrite.'
  },
  {
    id: 'translate',
    name: 'Translate',
    icon: 'globe',
    instruction: (target) =>
      `Translate the text into ${target}. If the text is already in ${target}, translate it into English instead. Output only the translation.`
  },
  {
    id: 'improve',
    name: 'Improve writing',
    icon: 'pencil',
    instruction: () =>
      "Improve the writing: fix grammar and spelling, tighten the phrasing, and keep the author's voice and meaning. Output only the improved text."
  }
]

export function uiLanguageName(): string {
  const tag = typeof navigator !== 'undefined' ? navigator.language : 'en'
  try {
    const name = new Intl.DisplayNames(['en'], { type: 'language' }).of(tag.split('-')[0] ?? 'en')
    return name ?? 'English'
  } catch {
    return 'English'
  }
}

export function quickActionUser(instruction: string, text: string, source?: { title: string; url: string }): string {
  const parts = [instruction]
  if (source) parts.push(`From "${source.title}" (${source.url}):`)
  parts.push(`<text>\n${text}\n</text>`)
  return parts.join('\n\n')
}
