import { db } from '../db'

const MAX_BYTES = 50 * 1024 * 1024

export async function cacheKey(voiceId: string, rate: number, text: string): Promise<string> {
  const data = new TextEncoder().encode(`${voiceId}|${rate}|${text}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function getCached(hash: string): Promise<Blob | null> {
  try {
    const row = await db.audioCache.get(hash)
    if (!row) return null
    void db.audioCache.update(hash, { lastUsed: Date.now() })
    return row.blob
  } catch {
    return null
  }
}

export async function putCached(hash: string, blob: Blob): Promise<void> {
  try {
    await db.audioCache.put({ hash, blob, bytes: blob.size, lastUsed: Date.now() })
    const rows = await db.audioCache.orderBy('lastUsed').toArray()
    let total = rows.reduce((sum, r) => sum + r.bytes, 0)
    for (const row of rows) {
      if (total <= MAX_BYTES) break
      await db.audioCache.delete(row.hash)
      total -= row.bytes
    }
  } catch {
    return
  }
}
