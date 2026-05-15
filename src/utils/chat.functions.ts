import { OpenRouter } from '@openrouter/sdk'
import { createServerFn } from '@tanstack/react-start'
import type { ChatRequest } from './chat.types'

const AVAILABLE_MODELS = [
  { id: 'anthropic/claude-sonnet-4', label: 'Claude Sonnet 4' },
  { id: 'openai/gpt-4o', label: 'GPT-4o' },
  { id: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
  { id: 'meta-llama/llama-4-maverick', label: 'Llama 4 Maverick' },
] as const

const DEFAULT_MODEL = AVAILABLE_MODELS[0].id

const getClient = () =>
  new OpenRouter({
    apiKey: process.env['OPENROUTER_API_KEY'] ?? '',
    httpReferer: process.env['APP_URL'] ?? 'http://localhost:3000',
    appTitle: 'A.G.I',
  })

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
    const client = getClient()
    const messages = data.messages

    const response = await client.chat.send({
      chatRequest: {
        model: DEFAULT_MODEL,
        messages,
      },
    })

    const choice = response.choices?.[0]
    const content = choice?.message?.content
    const textContent = typeof content === 'string' ? content : ''
    return { content: textContent }
  })
