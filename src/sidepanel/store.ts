import { create } from 'zustand'
import { db, newId, type ConversationRow, type MessageRow } from '../lib/db'
import { getSettings, updateSettings, watchSettings, type Settings } from '../lib/settings'
import { TITLE_MODEL, isModelId, type ModelId } from '../lib/models'
import { ApiError, streamMessage } from '../lib/anthropic/client'
import { buildRequest } from '../lib/anthropic/params'
import { PreflightError } from '../lib/anthropic/preflight'
import { mergeUsage } from '../lib/anthropic/usage'
import { chatSystem, pageContextText, TITLE_SYSTEM, titleUser } from '../lib/anthropic/prompts'
import {
  isTextBlock,
  isThinkingBlock,
  textOfBlocks,
  type AnyBlock,
  type ApiMessage,
  type StopReason,
  type Usage
} from '../lib/anthropic/types'
import type { SearchActivity } from '../lib/anthropic/accumulate'
import { SESSION_HANDOFF_KEY, type HandoffPayload, type PageExtract } from '../lib/messages'
import { readActivePage, type PageContextState } from '../lib/pagecontext'
import { hostnameOf } from '../lib/settings'

export type View = 'chat' | 'history'
export type { PageContextState }

export interface Attachment {
  id: string
  mediaType: string
  data: string
}

interface StreamingInfo {
  messageId: string
  connecting: boolean
}

interface PanelStore {
  ready: boolean
  settings: Settings | null
  view: View
  offline: boolean
  keyInvalid: boolean
  conversation: ConversationRow | null
  messages: MessageRow[]
  streaming: StreamingInfo | null
  searchActivity: SearchActivity | null
  thinking: boolean
  model: ModelId
  webSearch: boolean
  composerText: string
  editing: boolean
  pageContext: PageContextState
  pageAdded: boolean
  attachments: Attachment[]
  agentMode: boolean
  setAgentMode(v: boolean): void
  ensureConversation(): Promise<ConversationRow>
  appendRow(row: MessageRow): Promise<void>
  patchRow(id: string, patch: Partial<MessageRow>, persist?: boolean): Promise<void>
  maybeAutoTitle(conv: ConversationRow, userText: string, assistantText: string): void
  touchConversation(id: string): Promise<void>
  init(): Promise<void>
  setView(v: View): void
  setComposerText(t: string): void
  setModel(m: ModelId): void
  toggleWebSearch(): void
  newChat(): void
  openConversation(id: string): Promise<void>
  send(textOverride?: string): Promise<void>
  stop(): void
  retryLast(model?: ModelId): Promise<void>
  continueLast(): Promise<void>
  startEditLast(): void
  cancelEdit(): void
  refreshPageContext(): Promise<void>
  removePageContext(): void
  addPageContext(): void
  blockCurrentSite(): Promise<void>
  unblockSite(host: string): Promise<void>
  addAttachment(a: Attachment): void
  removeAttachment(id: string): void
  deleteConversation(id: string): Promise<void>
  togglePin(id: string): Promise<void>
  renameConversation(id: string, title: string): Promise<void>
  seedConversation(userText: string, assistantText: string | null, model: ModelId, title: string | null, autoSend: boolean): Promise<void>
}

let controller: AbortController | null = null
let latestDraft: AnyBlock[] = []
let flushScheduled = false
let contextSeq = 0

function findLastIndex<T>(arr: T[], pred: (t: T) => boolean): number {
  for (let i = arr.length - 1; i >= 0; i--) {
    const item = arr[i]
    if (item !== undefined && pred(item)) return i
  }
  return -1
}

function lastTypedText(row: MessageRow): string {
  const texts = row.blocks.filter(isTextBlock)
  const last = texts[texts.length - 1]
  return last ? last.text : ''
}

function toApiMessages(rows: MessageRow[]): ApiMessage[] {
  const out: ApiMessage[] = []
  for (const row of rows) {
    let content: AnyBlock[]
    if (row.role === 'assistant') {
      content = row.blocks
        .filter(isTextBlock)
        .filter((b) => b.text.length > 0)
        .map((b) => ({ type: 'text', text: b.text }))
    } else {
      content = row.blocks.filter((b) => !isThinkingBlock(b))
    }
    if (content.length > 0) out.push({ role: row.role, content })
  }
  return out
}

export const useStore = create<PanelStore>((set, get) => {
  function pushDraft(messageId: string, blocks: AnyBlock[]): void {
    latestDraft = blocks
    if (flushScheduled) return
    flushScheduled = true
    requestAnimationFrame(() => {
      flushScheduled = false
      set((state) => ({
        streaming:
          state.streaming && state.streaming.connecting
            ? { ...state.streaming, connecting: false }
            : state.streaming,
        messages: state.messages.map((m) => (m.id === messageId ? { ...m, blocks: latestDraft } : m))
      }))
    })
  }

  async function finalizeRow(
    messageId: string,
    patch: Partial<MessageRow>
  ): Promise<void> {
    let full: MessageRow | null = null
    set((state) => ({
      messages: state.messages.map((m) => {
        if (m.id !== messageId) return m
        full = { ...m, ...patch }
        return full
      })
    }))
    if (full) await db.messages.put(full)
  }

  async function autoTitle(conv: ConversationRow, userText: string, assistantText: string, apiKey: string): Promise<void> {
    try {
      const req = buildRequest({
        model: TITLE_MODEL,
        mode: 'title',
        system: TITLE_SYSTEM,
        messages: [{ role: 'user', content: [{ type: 'text', text: titleUser(userText, assistantText) }] }]
      })
      const res = await streamMessage(apiKey, req, {})
      const raw = textOfBlocks(res.blocks).trim().split('\n')[0] ?? ''
      const title = raw.replace(/^["'“‘]+|["'”’.]+$/g, '').slice(0, 80)
      if (!title) return
      await db.conversations.update(conv.id, { title, autoTitled: true })
      set((state) =>
        state.conversation?.id === conv.id
          ? { conversation: { ...state.conversation, title, autoTitled: true } }
          : {}
      )
    } catch {
      return
    }
  }

  async function runAssistant(
    conv: ConversationRow,
    historyRows: MessageRow[],
    messageId: string,
    model: ModelId,
    webSearch: boolean
  ): Promise<void> {
    const settings = get().settings
    if (!settings) return
    controller = new AbortController()
    latestDraft = []
    let aggregated: AnyBlock[] = []
    let usage: Usage = {}
    let stopReason: StopReason = null
    let actualModel: string | null = null
    const disabledServerTools: string[] = []

    try {
      let msgs = toApiMessages(historyRows)
      for (let turn = 0; turn <= 5; turn++) {
        const req = buildRequest({
          model,
          mode: 'chat',
          system: chatSystem(),
          messages: msgs,
          webSearch,
          disabledServerTools
        })
        let result
        try {
          result = await streamMessage(
            settings.apiKey,
            req,
            {
              onBlocks: (blocks) => pushDraft(messageId, [...aggregated, ...blocks]),
              onSearch: (a) => set({ searchActivity: a }),
              onThinking: (t) => set({ thinking: t })
            },
            controller.signal
          )
        } catch (e) {
          if (
            e instanceof ApiError &&
            e.code === 'bad-request' &&
            webSearch &&
            disabledServerTools.length === 0 &&
            /web_search|web_fetch/.test(e.message)
          ) {
            if (/web_search/.test(e.message)) disabledServerTools.push('web_search')
            if (/web_fetch/.test(e.message)) disabledServerTools.push('web_fetch')
            webSearch = false
            turn -= 1
            continue
          }
          throw e
        }
        aggregated = [...aggregated, ...result.blocks]
        usage = mergeUsage(usage, result.usage)
        if (result.model) actualModel = result.model
        stopReason = result.stopReason
        if (result.stopReason !== 'pause_turn' || turn === 5) break
        msgs = [...msgs, { role: 'assistant', content: result.blocks }]
      }
      const badge = actualModel && isModelId(actualModel) ? actualModel : model
      await finalizeRow(messageId, {
        blocks: aggregated,
        usage,
        stopReason,
        model: badge,
        error: null,
        stopped: false,
        notice:
          disabledServerTools.length > 0
            ? "Web search isn't available for this model right now — answered without it."
            : null
      })
      if (!conv.autoTitled) {
        const lastUser = historyRows[historyRows.length - 1]
        const userText = lastUser ? lastTypedText(lastUser) : ''
        const assistantText = textOfBlocks(aggregated)
        if (userText && assistantText) {
          conv.autoTitled = true
          void autoTitle(conv, userText, assistantText, settings.apiKey)
        }
      }
    } catch (e) {
      const err = e instanceof ApiError
        ? e
        : e instanceof PreflightError
          ? new ApiError('bad-request', e.message)
          : new ApiError('unknown', 'Something unexpected went wrong.')
      if (err.code === 'auth') set({ keyInvalid: true })
      const kept = latestDraft.length > 0 ? latestDraft : aggregated
      await finalizeRow(messageId, {
        blocks: kept,
        usage,
        stopReason: null,
        error: err.code === 'aborted' ? null : { code: err.code, message: err.message },
        stopped: err.code === 'aborted'
      })
    } finally {
      controller = null
      set({ streaming: null, searchActivity: null, thinking: false })
      const now = Date.now()
      await db.conversations.update(conv.id, { updatedAt: now })
      set((state) =>
        state.conversation?.id === conv.id
          ? { conversation: { ...state.conversation, updatedAt: now } }
          : {}
      )
    }
  }

  return {
    ready: false,
    settings: null,
    view: 'chat',
    offline: false,
    keyInvalid: false,
    conversation: null,
    messages: [],
    streaming: null,
    searchActivity: null,
    thinking: false,
    model: 'claude-sonnet-5',
    webSearch: true,
    composerText: '',
    editing: false,
    pageContext: { status: 'none' },
    pageAdded: false,
    attachments: [],
    agentMode: false,

    setAgentMode(agentMode) {
      set({ agentMode })
    },

    async ensureConversation() {
      const s = get()
      if (s.conversation) return s.conversation
      const conv: ConversationRow = {
        id: newId(),
        title: '',
        model: s.model,
        pinned: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        webSearch: s.webSearch,
        autoTitled: false
      }
      await db.conversations.put(conv)
      set({ conversation: conv })
      return conv
    },

    async appendRow(row) {
      await db.messages.put(row)
      set((state) => ({ messages: [...state.messages, row] }))
    },

    async patchRow(id, patch, persist = false) {
      let full: MessageRow | null = null
      set((state) => ({
        messages: state.messages.map((m) => {
          if (m.id !== id) return m
          full = { ...m, ...patch }
          return full
        })
      }))
      if (persist && full) await db.messages.put(full)
    },

    maybeAutoTitle(conv, userText, assistantText) {
      const settings = get().settings
      if (!settings || conv.autoTitled || !userText || !assistantText) return
      conv.autoTitled = true
      void autoTitle(conv, userText, assistantText, settings.apiKey)
    },

    async touchConversation(id) {
      const now = Date.now()
      await db.conversations.update(id, { updatedAt: now })
      set((state) =>
        state.conversation?.id === id ? { conversation: { ...state.conversation, updatedAt: now } } : {}
      )
    },

    async init() {
      if (get().ready) return
      const settings = await getSettings()
      set({
        settings,
        model: settings.defaultModel,
        webSearch: settings.webSearchDefault,
        offline: !navigator.onLine,
        ready: true
      })
      watchSettings((s) => {
        const prev = get().settings
        set({ settings: s })
        if (prev && prev.apiKey !== s.apiKey && s.apiKey) set({ keyInvalid: false })
        if (prev && prev.siteContextBlocklist.join() !== s.siteContextBlocklist.join()) {
          void get().refreshPageContext()
        }
      })
      window.addEventListener('online', () => set({ offline: false }))
      window.addEventListener('offline', () => set({ offline: true }))
      void get().refreshPageContext()
      chrome.tabs.onActivated.addListener(() => void get().refreshPageContext())
      chrome.tabs.onUpdated.addListener((_id, info, tab) => {
        if (tab.active && (info.status === 'complete' || info.title !== undefined)) {
          void get().refreshPageContext()
        }
      })
      const applyHandoff = (payload: HandoffPayload) => {
        if (!payload.autoSend && payload.assistantText === null) {
          get().newChat()
          set({ composerText: payload.userText, view: 'chat' })
          return
        }
        void get().seedConversation(
          payload.userText,
          payload.assistantText,
          isModelId(payload.model) ? payload.model : get().model,
          payload.title,
          payload.autoSend
        )
      }
      const pending = await chrome.storage.session.get(SESSION_HANDOFF_KEY)
      const initial = pending[SESSION_HANDOFF_KEY] as HandoffPayload | undefined
      if (initial) {
        void chrome.storage.session.remove(SESSION_HANDOFF_KEY)
        applyHandoff(initial)
      }
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'session') return
        const change = changes[SESSION_HANDOFF_KEY]
        const payload = change?.newValue as HandoffPayload | undefined
        if (payload) {
          void chrome.storage.session.remove(SESSION_HANDOFF_KEY)
          applyHandoff(payload)
        }
      })
    },

    setView(view) {
      set({ view })
    },

    setComposerText(composerText) {
      set({ composerText })
    },

    setModel(model) {
      set({ model })
      void updateSettings({ defaultModel: model })
      const conv = get().conversation
      if (conv) {
        void db.conversations.update(conv.id, { model })
        set({ conversation: { ...conv, model } })
      }
    },

    toggleWebSearch() {
      const next = !get().webSearch
      set({ webSearch: next })
      const conv = get().conversation
      if (conv) {
        void db.conversations.update(conv.id, { webSearch: next })
        set({ conversation: { ...conv, webSearch: next } })
      }
    },

    newChat() {
      if (get().streaming) get().stop()
      const settings = get().settings
      set({
        conversation: null,
        messages: [],
        view: 'chat',
        composerText: '',
        editing: false,
        attachments: [],
        webSearch: settings?.webSearchDefault ?? true,
        pageAdded: false
      })
    },

    async openConversation(id) {
      if (get().streaming) get().stop()
      const conv = await db.conversations.get(id)
      if (!conv) return
      const messages = await db.messages.where('conversationId').equals(id).sortBy('createdAt')
      set({
        conversation: conv,
        messages,
        view: 'chat',
        model: isModelId(conv.model) ? conv.model : get().model,
        webSearch: conv.webSearch,
        composerText: '',
        editing: false,
        attachments: []
      })
    },

    async send(textOverride) {
      const s = get()
      if (s.streaming || !s.settings || !s.settings.apiKey) return
      const text = (textOverride ?? s.composerText).trim()
      if (!text && s.attachments.length === 0) return

      let messages = s.messages
      if (s.editing && textOverride === undefined) {
        const lastUserIdx = findLastIndex(messages, (m) => m.role === 'user')
        if (lastUserIdx >= 0) {
          const removed = messages.slice(lastUserIdx)
          messages = messages.slice(0, lastUserIdx)
          await db.messages.bulkDelete(removed.map((r) => r.id))
        }
      }

      let conv = s.conversation
      if (!conv) {
        conv = {
          id: newId(),
          title: '',
          model: s.model,
          pinned: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          webSearch: s.webSearch,
          autoTitled: false
        }
        await db.conversations.put(conv)
      }

      let context: PageExtract | null = null
      if (s.pageContext.status === 'ready' && s.pageAdded) {
        const fresh = await readActivePage(s.settings)
        if (fresh.status === 'ready') {
          context = fresh.page
          set({ pageContext: fresh })
        } else {
          context = s.pageContext.page
        }
      }
      const userBlocks: AnyBlock[] = []
      for (const a of s.attachments) {
        userBlocks.push({ type: 'image', source: { type: 'base64', media_type: a.mediaType, data: a.data } })
      }
      if (context) userBlocks.push({ type: 'text', text: pageContextText(context) })
      userBlocks.push({ type: 'text', text: text || 'See the attached image.' })

      const userRow: MessageRow = {
        id: newId(),
        conversationId: conv.id,
        role: 'user',
        blocks: userBlocks,
        createdAt: Date.now(),
        model: null,
        usage: null,
        stopReason: null,
        kind: 'chat',
        agentSteps: null,
        error: null,
        stopped: false,
        notice: null,
        contextTitle: context ? context.title : null,
        contextUrl: context ? context.url : null
      }
      const assistantRow: MessageRow = {
        id: newId(),
        conversationId: conv.id,
        role: 'assistant',
        blocks: [],
        createdAt: Date.now() + 1,
        model: s.model,
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
      await db.messages.put(userRow)
      const history = [...messages, userRow]
      set({
        conversation: conv,
        messages: [...history, assistantRow],
        composerText: textOverride === undefined ? '' : s.composerText,
        editing: false,
        attachments: [],
        streaming: { messageId: assistantRow.id, connecting: true }
      })
      await runAssistant(conv, history, assistantRow.id, s.model, s.webSearch)
    },

    stop() {
      controller?.abort()
    },

    async retryLast(model) {
      const s = get()
      if (s.streaming || !s.settings?.apiKey) return
      const last = s.messages[s.messages.length - 1]
      if (!last || last.role !== 'assistant') return
      const conv = s.conversation
      if (!conv) return
      const useModel = model ?? (last.model && isModelId(last.model) ? last.model : s.model)
      const history = s.messages.slice(0, -1)
      const resetRow: MessageRow = {
        ...last,
        blocks: [],
        usage: null,
        stopReason: null,
        model: useModel,
        error: null,
        stopped: false,
        notice: null,
        agentSteps: null,
        kind: 'chat'
      }
      set({
        messages: [...history, resetRow],
        streaming: { messageId: resetRow.id, connecting: true }
      })
      await runAssistant(conv, history, resetRow.id, useModel, s.webSearch)
    },

    async continueLast() {
      await get().send('Continue exactly where you left off.')
    },

    startEditLast() {
      const s = get()
      if (s.streaming) return
      const lastUserIdx = findLastIndex(s.messages, (m) => m.role === 'user')
      if (lastUserIdx === -1) return
      const row = s.messages[lastUserIdx]
      if (!row) return
      set({ composerText: lastTypedText(row), editing: true })
    },

    cancelEdit() {
      set({ composerText: '', editing: false })
    },

    async refreshPageContext() {
      const settings = get().settings
      if (!settings) return
      const seq = ++contextSeq
      const next = await readActivePage(settings)
      if (seq !== contextSeq) return
      const current = get().pageContext
      const keepAdded =
        get().pageAdded &&
        current.status === 'ready' &&
        next.status === 'ready' &&
        next.page.url === current.page.url
      set({ pageContext: next, pageAdded: keepAdded })
    },

    removePageContext() {
      set({ pageAdded: false })
    },

    addPageContext() {
      if (get().pageContext.status === 'ready') set({ pageAdded: true })
    },

    async blockCurrentSite() {
      const s = get().settings
      const pc = get().pageContext
      if (!s || pc.status !== 'ready') return
      const host = hostnameOf(pc.page.url)
      if (!host || s.siteContextBlocklist.includes(host)) return
      await updateSettings({ siteContextBlocklist: [...s.siteContextBlocklist, host] })
      set({ pageContext: { status: 'blocked', host }, pageAdded: false })
    },

    async unblockSite(host) {
      const s = get().settings
      if (!s) return
      await updateSettings({ siteContextBlocklist: s.siteContextBlocklist.filter((h) => h !== host) })
      void get().refreshPageContext()
    },

    addAttachment(a) {
      set((state) => ({ attachments: [...state.attachments, a].slice(0, 6) }))
    },

    removeAttachment(id) {
      set((state) => ({ attachments: state.attachments.filter((a) => a.id !== id) }))
    },

    async deleteConversation(id) {
      await db.messages.where('conversationId').equals(id).delete()
      await db.conversations.delete(id)
      if (get().conversation?.id === id) get().newChat()
    },

    async togglePin(id) {
      const conv = await db.conversations.get(id)
      if (!conv) return
      const pinned = conv.pinned ? 0 : 1
      await db.conversations.update(id, { pinned })
      if (get().conversation?.id === id) {
        const cur = get().conversation
        if (cur) set({ conversation: { ...cur, pinned } })
      }
    },

    async renameConversation(id, title) {
      const trimmed = title.trim()
      if (!trimmed) return
      await db.conversations.update(id, { title: trimmed, autoTitled: true })
      if (get().conversation?.id === id) {
        const cur = get().conversation
        if (cur) set({ conversation: { ...cur, title: trimmed, autoTitled: true } })
      }
    },

    async seedConversation(userText, assistantText, model, title, autoSend) {
      const s = get()
      if (s.streaming) get().stop()
      const conv: ConversationRow = {
        id: newId(),
        title: title ?? '',
        model,
        pinned: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        webSearch: s.settings?.webSearchDefault ?? true,
        autoTitled: title !== null
      }
      await db.conversations.put(conv)
      const userRow: MessageRow = {
        id: newId(),
        conversationId: conv.id,
        role: 'user',
        blocks: [{ type: 'text', text: userText }],
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
      await db.messages.put(userRow)
      const rows: MessageRow[] = [userRow]
      if (assistantText) {
        const assistantRow: MessageRow = {
          id: newId(),
          conversationId: conv.id,
          role: 'assistant',
          blocks: [{ type: 'text', text: assistantText }],
          createdAt: Date.now() + 1,
          model,
          usage: null,
          stopReason: 'end_turn',
          kind: 'chat',
          agentSteps: null,
          error: null,
          stopped: false,
          notice: null,
          contextTitle: null,
          contextUrl: null
        }
        await db.messages.put(assistantRow)
        rows.push(assistantRow)
      }
      set({ conversation: conv, messages: rows, view: 'chat', model })
      if (autoSend) {
        const assistantRow: MessageRow = {
          id: newId(),
          conversationId: conv.id,
          role: 'assistant',
          blocks: [],
          createdAt: Date.now() + 2,
          model,
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
        set({ messages: [...rows, assistantRow], streaming: { messageId: assistantRow.id, connecting: true } })
        await runAssistant(conv, rows, assistantRow.id, model, false)
      }
    }
  }
})
