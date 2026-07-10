export interface StepDescription {
  icon: string
  label: string
}

function short(v: unknown, n: number): string {
  const s = String(v ?? '')
  return s.length > n ? `${s.slice(0, n - 1)}…` : s
}

export function describeTool(name: string, input: Record<string, unknown>): StepDescription {
  switch (name) {
    case 'read_page':
      return { icon: 'page', label: 'Reading the page' }
    case 'screenshot':
      return { icon: 'camera', label: 'Taking a screenshot' }
    case 'click':
      return { icon: 'cursor', label: `Clicking [${input.element_id}]` }
    case 'type_text':
      return { icon: 'pencil', label: `Typing “${short(input.text, 40)}”` }
    case 'select_option':
      return { icon: 'list', label: `Selecting “${short(input.value, 32)}”` }
    case 'scroll':
      return {
        icon: 'chevron-down',
        label: input.element_id !== undefined ? `Scrolling to [${input.element_id}]` : `Scrolling ${input.direction === 'up' ? 'up' : 'down'}`
      }
    case 'navigate':
      return { icon: 'globe', label: `Opening ${short(input.url, 60)}` }
    case 'go_back':
      return { icon: 'arrow-left', label: 'Going back' }
    case 'wait':
      return { icon: 'clock', label: `Waiting ${Math.min(Number(input.seconds) || 1, 5)}s` }
    case 'list_tabs':
      return { icon: 'copy', label: 'Listing open tabs' }
    case 'open_tab':
      return { icon: 'plus', label: `Opening a tab at ${short(input.url, 50)}` }
    case 'switch_tab':
      return { icon: 'external', label: `Switching to tab ${input.tab_id}` }
    default:
      return { icon: 'bolt', label: name }
  }
}
