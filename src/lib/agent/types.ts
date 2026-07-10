export type ActuatorAction =
  | { tool: 'read_page' }
  | { tool: 'click'; elementId: number; approvedPayment?: boolean }
  | { tool: 'type_text'; elementId: number; text: string; pressEnter?: boolean }
  | { tool: 'select_option'; elementId: number; value: string }
  | { tool: 'scroll'; direction?: 'up' | 'down'; elementId?: number }

export interface ActuatorResult {
  ok: boolean
  outcome: string
  snapshot: string | null
  refusal: 'password' | 'payment' | null
}

export type StepStatus = 'pending' | 'ok' | 'error' | 'refused' | 'stopped'

export interface AgentStep {
  id: string
  icon: string
  label: string
  detail: string | null
  status: StepStatus
  imageThumb: string | null
}

export type AgentTaskStatus = 'running' | 'awaiting-permission' | 'done' | 'stopped' | 'error'
