import { OpenRouter } from '@openrouter/sdk'
import { createServerFn } from '@tanstack/react-start'
import type { ChatRequest } from './chat.types'
import { buildSystemPrompt } from './system-prompt'

// Model fallback chain — server-only, not exported (ADR-0007)
const MODEL_FALLBACK_CHAIN = [
  'meta-llama/llama-4-maverick:free',
  'google/gemma-4-26b-a4b-it:free',
  'qwen/qwen3-next-80b-a3b-instruct:free',
] as const

const RETRYABLE_STATUS_CODES = [429, 500, 502, 503, 504]

const REQUEST_TIMEOUT = 15_000
const SESSION_LOCK_DURATION = 60_000

let sessionLockTime: number | null = null

/** @internal Test-only reset for session lock state */
export function _resetSessionLockForTesting(): void {
  sessionLockTime = null
}

function isRetryable(error: unknown): boolean {
  if (error instanceof Response) {
    return RETRYABLE_STATUS_CODES.includes(error.status)
  }
  if (error instanceof Error) {
    if (error.message.toLowerCase().includes('timeout')) return true

    const statusMatch = error.message.match(/\b(\d{3})\b/)
    if (statusMatch) {
      const statusCode = parseInt(statusMatch[1], 10)
      if (RETRYABLE_STATUS_CODES.includes(statusCode)) return true
      if (statusCode >= 400 && statusCode < 500) return false
    }

    const errWithStatus = error as Error & { status?: number; response?: { status?: number } }
    const status = errWithStatus.status ?? errWithStatus.response?.status
    if (status !== undefined) return RETRYABLE_STATUS_CODES.includes(status)

    return true
  }
  if (typeof error === 'object' && error !== null) {
    const errObj = error as Record<string, unknown>
    const status = errObj['status'] as number | undefined
    const responseStatus = (errObj['response'] as Record<string, unknown> | undefined)?.['status'] as
      | number
      | undefined
    const effectiveStatus = status ?? responseStatus
    if (effectiveStatus !== undefined) {
      return RETRYABLE_STATUS_CODES.includes(effectiveStatus)
    }
  }
  // Unknown errors default to retryable (defensive)
  return true
}

function isNonRetryableClientError(error: unknown): boolean {
  if (error instanceof Response) {
    return error.status >= 400 && error.status < 500 && !RETRYABLE_STATUS_CODES.includes(error.status)
  }
  if (error instanceof Error) {
    const statusMatch = error.message.match(/\b(\d{3})\b/)
    if (statusMatch) {
      const statusCode = parseInt(statusMatch[1], 10)
      return statusCode >= 400 && statusCode < 500 && !RETRYABLE_STATUS_CODES.includes(statusCode)
    }
    const errWithStatus = error as Error & { status?: number; response?: { status?: number } }
    const status = errWithStatus.status ?? errWithStatus.response?.status
    if (status !== undefined) {
      return status >= 400 && status < 500 && !RETRYABLE_STATUS_CODES.includes(status)
    }
  }
  if (typeof error === 'object' && error !== null) {
    const errObj = error as Record<string, unknown>
    const status = errObj['status'] as number | undefined
    const responseStatus = (errObj['response'] as Record<string, unknown> | undefined)?.['status'] as
      | number
      | undefined
    const effectiveStatus = status ?? responseStatus
    if (effectiveStatus !== undefined) {
      return effectiveStatus >= 400 && effectiveStatus < 500 && !RETRYABLE_STATUS_CODES.includes(effectiveStatus)
    }
  }
  return false
}

const getClient = () =>
  new OpenRouter({
    apiKey: process.env['OPENROUTER_API_KEY'] ?? '',
    httpReferer: process.env['APP_URL'] ?? 'http://localhost:3000',
    appTitle: 'A.G.I',
  })

function stripSystemMessages(messages: ChatRequest['messages']) {
  return (messages as Array<{ role: string; content: string }>).filter((msg) => {
    const role = msg.role as string
    return role !== 'system'
  }) as ChatRequest['messages']
}

function extractStatusCode(error: unknown): number | undefined {
  if (error instanceof Response) return error.status
  if (error instanceof Error) {
    const statusMatch = error.message.match(/\b(\d{3})\b/)
    if (statusMatch) return parseInt(statusMatch[1], 10)
    const errWithStatus = error as Error & { status?: number; response?: { status?: number } }
    return errWithStatus.status ?? errWithStatus.response?.status
  }
  if (typeof error === 'object' && error !== null) {
    const errObj = error as Record<string, unknown>
    const status = errObj['status'] as number | undefined
    const responseStatus = (errObj['response'] as Record<string, unknown> | undefined)?.['status'] as
      | number
      | undefined
    return status ?? responseStatus
  }
  return undefined
}

export async function handleChatCompletion(data: ChatRequest): Promise<{ content: string }> {
  if (sessionLockTime !== null && Date.now() - sessionLockTime < SESSION_LOCK_DURATION) {
    throw new Error('[SYSTEM LOCKED] Neural pathways cooling down. Try again in a minute.')
  }

  const client = getClient()

  // Strip any system role messages from client payload silently (ADR-0002)
  const userMessages = stripSystemMessages(data.messages)

  // Build system prompt server-side (ADR-0002)
  const { stablePrefix, volatileSuffix } = await buildSystemPrompt()
  const combinedPrompt = stablePrefix + volatileSuffix
  console.log('[chat] System prompt length:', combinedPrompt.length, 'chars')

  const messages = [
    { role: 'system' as const, content: combinedPrompt },
    ...userMessages,
  ]

  for (const model of MODEL_FALLBACK_CHAIN) {
    try {
      const response = await Promise.race([
        client.chat.send({
          chatRequest: {
            model,
            messages,
          },
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('[TIMEOUT] Request timed out.')), REQUEST_TIMEOUT),
        ),
      ])

      const choice = response.choices?.[0]
      const content = choice?.message?.content
      const textContent = typeof content === 'string' ? content : ''
      return { content: textContent }
    } catch (error) {
      if (isNonRetryableClientError(error)) {
        throw error
      }

      if (isRetryable(error)) {
        const statusCode = extractStatusCode(error)
        console.warn(`[chat] Model ${model} failed (status: ${statusCode ?? 'unknown'}), trying next model...`)

        if (statusCode === 429) {
          await new Promise((resolve) => setTimeout(resolve, 1000))
        }

        continue
      }

      throw error
    }
  }

  sessionLockTime = Date.now()
  throw new Error('[TOTAL SYSTEM FAILURE] All models offline. Tell Agi to upgrade.')
}

export const chatCompletion = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: ChatRequest): ChatRequest => {
      if (!data.messages || !Array.isArray(data.messages) || data.messages.length === 0) {
        throw new Error('messages array is required and must not be empty')
      }
      return data
    },
  )
  .handler(async ({ data }: { data: ChatRequest }): Promise<{ content: string }> => {
    return handleChatCompletion(data)
  })