import { QUICK_ACTIONS, quickActionUser, quickSystem, uiLanguageName, type QuickActionDef } from './anthropic/prompts'
import type { Settings } from './settings'
import type { QuickActionRequest } from './messages'

export interface ResolvedAction {
  id: string
  name: string
  icon: QuickActionDef['icon'] | 'sparkle'
  instruction: string
  custom: boolean
}

export function resolveActions(settings: Settings): ResolvedAction[] {
  const target = uiLanguageName()
  const curated: ResolvedAction[] = QUICK_ACTIONS.map((a) => ({
    id: a.id,
    name: a.name,
    icon: a.icon,
    instruction: a.instruction(target),
    custom: false
  }))
  const custom: ResolvedAction[] = settings.customActions.map((a) => ({
    id: `custom:${a.id}`,
    name: a.name,
    icon: 'sparkle',
    instruction: a.prompt,
    custom: true
  }))
  return [...curated, ...custom]
}

export function actionUserText(action: ResolvedAction, text: string, source?: { title: string; url: string }): string {
  if (action.instruction.includes('{text}')) {
    return action.instruction.replaceAll('{text}', text)
  }
  return quickActionUser(action.instruction, text, source)
}

export function buildQuickRequest(
  action: ResolvedAction,
  text: string,
  settings: Settings,
  source?: { title: string; url: string }
): QuickActionRequest {
  return {
    system: quickSystem(),
    user: actionUserText(action, text, source),
    model: settings.defaultModel
  }
}

export function askRequest(question: string, text: string, settings: Settings): QuickActionRequest {
  return {
    system: quickSystem(),
    user: `${question}\n\n<text>\n${text}\n</text>`,
    model: settings.defaultModel
  }
}

export function handoffUserText(action: { name: string; instruction: string } | null, question: string | null, text: string): string {
  const quoted = text
    .split('\n')
    .map((l) => `> ${l}`)
    .join('\n')
  const head = action ? action.instruction : (question ?? '')
  return `${head}\n\n${quoted}`
}
