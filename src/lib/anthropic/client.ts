import type { ApiErrorCode } from '../messages'
import { requestCostDollars } from '../cost'
import { createSseDecoder } from './sse'
import { createAccumulator, StreamError, type AccumulatedMessage, type AccumulatorHandlers } from './accumulate'
import { getPreflightDiagnostics } from './preflight'
import type { MessagesRequest } from './types'

const API_BASE = 'https://api.anthropic.com/v1'

export class ApiError extends Error {
  code: ApiErrorCode
  status: number | null

  constructor(code: ApiErrorCode, message: string, status: number | null = null) {
    super(message)
    this.code = code
    this.status = status
  }
}

function apiHeaders(apiKey: string): Record<string, string> {
  return {
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
    'content-type': 'application/json',
    'anthropic-dangerous-direct-browser-access': 'true'
  }
}

async function errorFromResponse(res: Response): Promise<ApiError> {
  let message = `Request failed (${res.status}).`
  try {
    const body = (await res.json()) as { error?: { message?: string } }
    if (body.error?.message) message = body.error.message
  } catch {
    void 0
  }
  if (res.status === 401 || res.status === 403) return new ApiError('auth', message, res.status)
  if (res.status === 429) return new ApiError('rate-limit', message, res.status)
  if (res.status === 400 || res.status === 404 || res.status === 413) {
    return new ApiError('bad-request', message, res.status)
  }
  if (res.status >= 500) return new ApiError('overloaded', message, res.status)
  return new ApiError('unknown', message, res.status)
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms)
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(t)
        reject(new ApiError('aborted', 'Stopped.'))
      },
      { once: true }
    )
  })
}

export async function validateKey(
  apiKey: string
): Promise<{ ok: true; modelIds: string[] } | { ok: false; error: ApiError }> {
  try {
    const res = await fetch(`${API_BASE}/models?limit=100`, { headers: apiHeaders(apiKey) })
    if (!res.ok) return { ok: false, error: await errorFromResponse(res) }
    const body = (await res.json()) as { data?: { id?: string }[] }
    const modelIds = (body.data ?? []).map((m) => m.id ?? '').filter(Boolean)
    return { ok: true, modelIds }
  } catch (e) {
    if (e instanceof ApiError) return { ok: false, error: e }
    return { ok: false, error: new ApiError('network', 'Could not reach the Anthropic API.') }
  }
}

export async function streamMessage(
  apiKey: string,
  request: MessagesRequest,
  handlers: AccumulatorHandlers,
  signal?: AbortSignal
): Promise<AccumulatedMessage> {
  if (!apiKey) throw new ApiError('no-key', 'No API key set.')

  let res: Response | null = null
  let attempt = 0
  const maxAttempts = 3
  for (;;) {
    if (signal?.aborted) throw new ApiError('aborted', 'Stopped.')
    let current: Response
    try {
      current = await fetch(`${API_BASE}/messages`, {
        method: 'POST',
        headers: apiHeaders(apiKey),
        body: JSON.stringify(request),
        signal: signal ?? null
      })
    } catch (e) {
      if (signal?.aborted || (e instanceof DOMException && e.name === 'AbortError')) {
        throw new ApiError('aborted', 'Stopped.')
      }
      throw new ApiError('network', 'Could not reach the Anthropic API. Check your connection.')
    }
    if (current.ok) {
      res = current
      break
    }
    const err = await errorFromResponse(current)
    attempt += 1
    if (err.code === 'rate-limit' && attempt < 2) {
      const after = Number(current.headers.get('retry-after'))
      await sleep(Number.isFinite(after) && after > 0 ? Math.min(after, 20) * 1000 : 3000, signal)
      continue
    }
    if (err.code === 'overloaded' && attempt < maxAttempts) {
      await sleep(attempt === 1 ? 1000 : 3000, signal)
      continue
    }
    throw err
  }

  const body = res.body
  if (!body) throw new ApiError('unknown', 'The API returned an empty stream.')

  const acc = createAccumulator(handlers)
  const decode = createSseDecoder()
  const reader = body.getReader()
  const textDecoder = new TextDecoder()

  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      for (const event of decode(textDecoder.decode(value, { stream: true }))) {
        acc.apply(event.event, event.data)
      }
      if (acc.isDone()) break
    }
  } catch (e) {
    if (signal?.aborted || (e instanceof DOMException && e.name === 'AbortError')) {
      throw new ApiError('aborted', 'Stopped.')
    }
    if (e instanceof StreamError) {
      if (e.apiType === 'overloaded_error') throw new ApiError('overloaded', e.message)
      if (e.apiType === 'rate_limit_error') throw new ApiError('rate-limit', e.message)
      if (e.apiType === 'authentication_error') throw new ApiError('auth', e.message)
      if (e.apiType === 'invalid_request_error') throw new ApiError('bad-request', e.message)
      throw new ApiError('unknown', e.message)
    }
    throw new ApiError('network', 'The stream was interrupted.')
  } finally {
    reader.releaseLock()
  }

  const result = acc.result()
  const preflight = getPreflightDiagnostics(request)
  if (preflight) {
    const costDollars = requestCostDollars(request.model, result.usage)
    result.usage.requests = [{
      ...preflight,
      retryCount: attempt,
      retryProviderReportedTokens: attempt > 0 ? null : 0,
      uncachedInputTokens: result.usage.input_tokens ?? 0,
      cacheCreationInputTokens: result.usage.cache_creation_input_tokens ?? 0,
      cacheReadInputTokens: result.usage.cache_read_input_tokens ?? 0,
      outputTokens: result.usage.output_tokens ?? 0,
      costDollars
    }]
  }
  return result
}
