import { Marked } from 'marked'
import DOMPurify from 'dompurify'

const marked = new Marked({ gfm: true, breaks: false })

let hooked = false

export function renderMd(text: string): string {
  if (!hooked) {
    hooked = true
    DOMPurify.addHook('afterSanitizeAttributes', (node) => {
      if (node.tagName === 'A') {
        node.setAttribute('target', '_blank')
        node.setAttribute('rel', 'noreferrer noopener')
      }
    })
  }
  const html = marked.parse(text, { async: false }) as string
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p',
      'br',
      'hr',
      'strong',
      'em',
      'del',
      'code',
      'pre',
      'ul',
      'ol',
      'li',
      'a',
      'blockquote',
      'h1',
      'h2',
      'h3',
      'h4',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td'
    ],
    ALLOWED_ATTR: ['href']
  })
}
