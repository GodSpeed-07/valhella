import { isModelId, MODELS } from './models'
import { isImageBlock, isTextBlock, type TextCitation } from './anthropic/types'
import type { ConversationRow, MessageRow } from './db'
import type { Settings } from './settings'

function modelLabel(model: string | null): string {
  return model && isModelId(model) ? MODELS[model].label : 'Briefly'
}

function citationsOf(msg: MessageRow): TextCitation[] {
  const out: TextCitation[] = []
  const seen = new Set<string>()
  for (const block of msg.blocks) {
    if (!isTextBlock(block) || !Array.isArray(block.citations)) continue
    for (const c of block.citations as TextCitation[]) {
      const url = typeof c.url === 'string' ? c.url : null
      if (!url || seen.has(url)) continue
      seen.add(url)
      out.push(c)
    }
  }
  return out
}

export function messageText(msg: MessageRow): string {
  const parts: string[] = []
  let imageCount = 0
  for (const block of msg.blocks) {
    if (isTextBlock(block)) {
      const text = block.text.trim()
      if (text) parts.push(text)
    } else if (isImageBlock(block)) {
      imageCount += 1
    }
  }
  if (imageCount > 0) parts.unshift(imageCount === 1 ? '*(image attached)*' : `*(${imageCount} images attached)*`)
  return parts.join('\n\n')
}

export function conversationToMarkdown(conv: ConversationRow, messages: MessageRow[]): string {
  const lines: string[] = [`# ${conv.title || 'Untitled conversation'}`, '']
  lines.push(`*Exported from Briefly · ${new Date(conv.createdAt).toLocaleDateString('en-US', { dateStyle: 'medium' })}*`)
  for (const msg of messages) {
    lines.push('')
    if (msg.role === 'user') {
      lines.push('## You', '')
      if (msg.contextTitle && msg.contextUrl) {
        lines.push(`*(with page context: [${msg.contextTitle}](${msg.contextUrl}))*`, '')
      }
      lines.push(messageText(msg))
    } else {
      lines.push(`## Briefly · ${modelLabel(msg.model)}`, '')
      if (msg.kind === 'agent' && msg.agentSteps && msg.agentSteps.length > 0) {
        for (const step of msg.agentSteps) {
          lines.push(`- ${step.label}${step.detail ? ` — ${step.detail}` : ''}`)
        }
        lines.push('')
      }
      lines.push(messageText(msg))
      const cites = citationsOf(msg)
      if (cites.length > 0) {
        lines.push('', '**Sources**', '')
        cites.forEach((c, i) => {
          lines.push(`${i + 1}. [${c.title || c.url}](${c.url})`)
        })
      }
    }
  }
  lines.push('')
  return lines.join('\n')
}

export function allDataToJson(
  data: { conversation: ConversationRow; messages: MessageRow[] }[],
  settings: Settings
): string {
  const { apiKey: _key, ...safeSettings } = settings
  return JSON.stringify(
    {
      app: 'briefly',
      version: 1,
      exportedAt: new Date().toISOString(),
      settings: safeSettings,
      conversations: data.map((d) => ({ ...d.conversation, messages: d.messages }))
    },
    null,
    2
  )
}

export function safeFilename(title: string, ext: string): string {
  const base = title.trim().replace(/[^\w\d -]+/g, '').replace(/\s+/g, '-').slice(0, 60) || 'briefly-export'
  return `${base}.${ext}`
}

export function downloadFile(name: string, mime: string, content: string): void {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}
