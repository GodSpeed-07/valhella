import Dexie, { type Table } from 'dexie'
import type { ModelId } from './models'
import type { AnyBlock, StopReason, Usage } from './anthropic/types'
import type { AgentStep } from './agent/types'
import type { ApiErrorCode } from './messages'

export interface ConversationRow {
  id: string
  title: string
  model: ModelId
  pinned: number
  createdAt: number
  updatedAt: number
  webSearch: boolean
  autoTitled: boolean
}

export interface MessageRow {
  id: string
  conversationId: string
  role: 'user' | 'assistant'
  blocks: AnyBlock[]
  createdAt: number
  model: ModelId | null
  usage: Usage | null
  stopReason: StopReason
  kind: 'chat' | 'agent'
  agentSteps: AgentStep[] | null
  error: { code: ApiErrorCode; message: string } | null
  stopped: boolean
  notice: string | null
  contextTitle: string | null
  contextUrl: string | null
}

export interface AudioCacheRow {
  hash: string
  bytes: number
  blob: Blob
  lastUsed: number
}

class BrieflyDB extends Dexie {
  conversations!: Table<ConversationRow, string>
  messages!: Table<MessageRow, string>
  audioCache!: Table<AudioCacheRow, string>

  constructor() {
    super('briefly')
    this.version(1).stores({
      conversations: 'id, updatedAt, pinned, createdAt',
      messages: 'id, conversationId, createdAt',
      audioCache: 'hash, lastUsed'
    })
  }
}

export const db = new BrieflyDB()

export function newId(): string {
  return crypto.randomUUID()
}
