import { create } from 'zustand'
import { ApiError, streamMessage } from '../lib/anthropic/client'
import { buildRequest } from '../lib/anthropic/params'
import { PreflightError, RequestContextSession } from '../lib/anthropic/preflight'
import { mergeUsage } from '../lib/anthropic/usage'
import {
  isTextBlock,
  isThinkingBlock,
  isToolUseBlock,
  textOfBlocks,
  type AnyBlock,
  type ApiMessage,
  type ToolResultBlock,
  type Usage
} from '../lib/anthropic/types'
import { AGENT_TOOLS } from '../lib/agent/tools'
import { agentSystem, agentTaskText } from '../lib/agent/prompt'
import { describeTool } from '../lib/agent/describe'
import { executeTool } from '../lib/agent/executor'
import type { AgentStep, StepStatus } from '../lib/agent/types'
import { newId, type MessageRow } from '../lib/db'
import { hostnameOf, permissionFor, updateSettings } from '../lib/settings'
import { isModelId } from '../lib/models'
import { useStore } from './store'

export type ApprovalChoice = 'once' | 'always' | false

interface AgentUiState {
  running: boolean
  messageId: string | null
  awaitingHost: string | null
  paymentAsk: string | null
}

export const useAgent = create<AgentUiState>(() => ({
  running: false,
  messageId: null,
  awaitingHost: null,
  paymentAsk: null
}))

let controller: AbortController | null = null
let cancelled = false
let approvalResolve: ((choice: ApprovalChoice) => void) | null = null
let paymentResolve: ((approve: boolean) => void) | null = null
let paymentApproved = false

export function stopAgent(): void {
  cancelled = true
  controller?.abort()
  approvalResolve?.(false)
  paymentResolve?.(false)
}

export function resolveApproval(choice: ApprovalChoice): void {
  approvalResolve?.(choice)
}

export function resolvePayment(approve: boolean): void {
  paymentResolve?.(approve)
}

function contextMessages(rows: MessageRow[]): ApiMessage[] {
  const out: ApiMessage[] = []
  for (const row of rows.slice(-12)) {
    const textBlocks = row.blocks.filter(isTextBlock).filter((b) => b.text.length > 0)
    if (textBlocks.length === 0) continue
    out.push({ role: row.role, content: textBlocks.map((b) => ({ type: 'text', text: b.text.slice(0, 4000) })) })
  }
  if (out.length > 0 && out[0]?.role === 'assistant') out.shift()
  return out
}

const ACTING_TOOLS = new Set(['click', 'type_text', 'select_option'])

export async function runAgentTask(taskText: string): Promise<void> {
  const store = useStore.getState()
  const settings = store.settings
  if (!settings?.apiKey || useAgent.getState().running || store.streaming) return
  const model = store.model

  const conv = await store.ensureConversation()
  const priorRows = useStore.getState().messages

  const userRow: MessageRow = {
    id: newId(),
    conversationId: conv.id,
    role: 'user',
    blocks: [{ type: 'text', text: taskText }],
    createdAt: Date.now(),
    model: null,
    usage: null,
    stopReason: null,
    kind: 'chat',
    agentSteps: null,
    error: null,
    stopped: false,
    notice: null,
    contextTitle: null,
    contextUrl: null
  }
  const agentRow: MessageRow = {
    id: newId(),
    conversationId: conv.id,
    role: 'assistant',
    blocks: [],
    createdAt: Date.now() + 1,
    model,
    usage: null,
    stopReason: null,
    kind: 'agent',
    agentSteps: [],
    error: null,
    stopped: false,
    notice: null,
    contextTitle: null,
    contextUrl: null
  }
  await store.appendRow(userRow)
  await store.appendRow(agentRow)

  cancelled = false
  paymentApproved = false
  controller = null
  useAgent.setState({ running: true, messageId: agentRow.id, awaitingHost: null, paymentAsk: null })

  let steps: AgentStep[] = []
  const pushStep = (step: AgentStep) => {
    steps = [...steps, step]
    void store.patchRow(agentRow.id, { agentSteps: steps })
  }
  const updateStep = (id: string, patch: Partial<AgentStep>) => {
    steps = steps.map((s) => (s.id === id ? { ...s, ...patch } : s))
    void store.patchRow(agentRow.id, { agentSteps: steps })
  }

  let taskTabId: number | null = null
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    taskTabId = tab?.id ?? null
  } catch {
    taskTabId = null
  }
  const ctx = {
    getTabId: () => taskTabId,
    setTabId: (id: number) => {
      taskTabId = id
    },
    consumePaymentApproval: () => {
      const v = paymentApproved
      paymentApproved = false
      return v
    }
  }

  const approvedHosts = new Set<string>()
  const messages: ApiMessage[] = [
    ...contextMessages(priorRows),
    { role: 'user', content: [{ type: 'text', text: agentTaskText(taskText) }] }
  ]
  const contextSession = new RequestContextSession(messages)

  let usage: Usage = {}
  let finalBlocks: AnyBlock[] = []
  let stopReason: MessageRow['stopReason'] = null
  let errorInfo: MessageRow['error'] = null
  let lastPatch = 0

  const requirePermission = async (host: string): Promise<boolean> => {
    if (approvedHosts.has(host)) return true
    const live = useStore.getState().settings ?? settings
    if (permissionFor(live, host) === 'act_freely') {
      approvedHosts.add(host)
      return true
    }
    const stepId = newId()
    pushStep({ id: stepId, icon: 'shield', label: `Waiting for your go-ahead on ${host}`, detail: null, status: 'pending', imageThumb: null })
    useAgent.setState({ awaitingHost: host })
    const choice = await new Promise<ApprovalChoice>((resolve) => {
      approvalResolve = resolve
    })
    approvalResolve = null
    useAgent.setState({ awaitingHost: null })
    if (choice === false) {
      updateStep(stepId, { label: `Not approved on ${host}`, status: 'stopped' })
      return false
    }
    approvedHosts.add(host)
    if (choice === 'always') {
      const current = useStore.getState().settings ?? settings
      await updateSettings({
        permissionMode: {
          ...current.permissionMode,
          perSite: { ...current.permissionMode.perSite, [host]: 'act_freely' }
        }
      })
    }
    updateStep(stepId, { label: `Approved on ${host}`, status: 'ok' })
    return true
  }

  const hostForTool = async (name: string, input: Record<string, unknown>): Promise<string | null> => {
    if (name === 'navigate' || name === 'open_tab') {
      return hostnameOf(String(input.url ?? '').startsWith('http') ? String(input.url) : `https://${String(input.url ?? '')}`)
    }
    if (!ACTING_TOOLS.has(name)) return null
    if (taskTabId === null) return null
    try {
      const tab = await chrome.tabs.get(taskTabId)
      return hostnameOf(tab.url ?? '')
    } catch {
      return null
    }
  }

  try {
    let turn = 0
    for (;;) {
      turn += 1
      if (cancelled) break
      if (turn > 25) {
        pushStep({ id: newId(), icon: 'warning', label: 'Reached the 25-step limit', detail: 'Stopping here.', status: 'error', imageThumb: null })
        finalBlocks = [{ type: 'text', text: 'I hit the 25-step limit before finishing. Here is where things stand — tell me to continue if you want me to keep going.' }]
        stopReason = 'end_turn'
        break
      }
      controller = new AbortController()
      const req = buildRequest({
        model,
        mode: 'agent',
        system: agentSystem(),
        messages,
        clientTools: AGENT_TOOLS,
        requestTurn: turn,
        contextSession
      })
      const result = await streamMessage(
        settings.apiKey,
        req,
        {
          onBlocks: (blocks) => {
            const now = Date.now()
            if (now - lastPatch < 90) return
            lastPatch = now
            const live = blocks.filter(isTextBlock).filter((b) => b.text.length > 0)
            void store.patchRow(agentRow.id, { blocks: live })
          }
        },
        controller.signal
      )
      usage = mergeUsage(usage, result.usage)
      stopReason = result.stopReason
      const turnText = textOfBlocks(result.blocks).trim()

      if (result.stopReason === 'pause_turn') {
        messages.push({ role: 'assistant', content: result.blocks })
        continue
      }

      if (result.stopReason !== 'tool_use') {
        finalBlocks = result.blocks.filter((b) => !isThinkingBlock(b))
        break
      }

      if (turnText) {
        pushStep({ id: newId(), icon: 'chat', label: turnText.slice(0, 260), detail: null, status: 'ok', imageThumb: null })
      }
      void store.patchRow(agentRow.id, { blocks: [] })

      const toolUses = result.blocks.filter(isToolUseBlock)
      const toolResults: ToolResultBlock[] = []
      let halted = false

      for (const tu of toolUses) {
        if (cancelled) {
          halted = true
          break
        }
        const host = await hostForTool(tu.name, tu.input)
        if (host) {
          const allowed = await requirePermission(host)
          if (!allowed || cancelled) {
            halted = true
            break
          }
        }
        const desc = describeTool(tu.name, tu.input)
        const stepId = newId()
        pushStep({ id: stepId, icon: desc.icon, label: desc.label, detail: null, status: 'pending', imageThumb: null })
        let exec = await executeTool(tu, ctx)
        if (exec.refusal === 'payment' && tu.name === 'click') {
          updateStep(stepId, { label: 'Paused before a purchase step', detail: exec.outcome, status: 'refused' })
          useAgent.setState({ paymentAsk: exec.outcome })
          const approve = await new Promise<boolean>((resolve) => {
            paymentResolve = resolve
          })
          paymentResolve = null
          useAgent.setState({ paymentAsk: null })
          if (approve && !cancelled) {
            paymentApproved = true
            const retryId = newId()
            pushStep({ id: retryId, icon: 'cursor', label: 'Completing the approved step', detail: null, status: 'pending', imageThumb: null })
            exec = await executeTool(tu, ctx)
            updateStep(retryId, {
              label: exec.outcome.split('\n')[0]?.slice(0, 160) ?? 'Done',
              status: exec.isError ? 'error' : 'ok'
            })
          } else {
            if (!cancelled) {
              pushStep({ id: newId(), icon: 'shield', label: 'Purchase not approved', detail: null, status: 'stopped', imageThumb: null })
            }
            halted = true
            toolResults.push({ type: 'tool_result', tool_use_id: tu.id, content: exec.blocks, is_error: true })
            break
          }
        } else {
          const status: StepStatus = exec.refusal ? 'refused' : exec.isError ? 'error' : 'ok'
          updateStep(stepId, {
            label: exec.outcome.split('\n')[0]?.slice(0, 160) ?? desc.label,
            status,
            imageThumb: exec.imageThumb
          })
        }
        toolResults.push({ type: 'tool_result', tool_use_id: tu.id, content: exec.blocks, is_error: exec.isError })
      }

      if (halted || cancelled) break

      messages.push({ role: 'assistant', content: result.blocks })
      messages.push({ role: 'user', content: toolResults as unknown as AnyBlock[] })
    }
  } catch (e) {
    const err = e instanceof ApiError
      ? e
      : e instanceof PreflightError
        ? new ApiError('bad-request', e.message)
        : new ApiError('unknown', 'Something unexpected went wrong.')
    if (err.code !== 'aborted') {
      errorInfo = { code: err.code, message: err.message }
    }
  } finally {
    controller = null
  }

  if (cancelled) {
    pushStep({ id: newId(), icon: 'stop', label: 'Stopped', detail: null, status: 'stopped', imageThumb: null })
  }

  const summaryText = textOfBlocks(finalBlocks).trim()
  await store.patchRow(
    agentRow.id,
    {
      blocks: finalBlocks.filter(isTextBlock),
      agentSteps: steps,
      usage,
      stopReason,
      error: errorInfo,
      stopped: cancelled,
      model: isModelId(model) ? model : agentRow.model
    },
    true
  )
  await store.touchConversation(conv.id)
  store.maybeAutoTitle(conv, taskText, summaryText || 'Browser task')
  useAgent.setState({ running: false, messageId: null, awaitingHost: null, paymentAsk: null })
}
