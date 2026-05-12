import { OpenRouter } from '@openrouter/sdk'
import { createServerFn } from '@tanstack/react-start'
import type { ChatRequest } from './chat.types'

const getClient = () =>
  new OpenRouter({
    apiKey: process.env['OPENROUTER_API_KEY'] ?? '',
    httpReferer: process.env['APP_URL'] ?? 'http://localhost:3000',
    appTitle: 'TUI Chatbot',
  })

export const chatCompletion = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: ChatRequest): ChatRequest => {
      if (!data.messages || !Array.isArray(data.messages) || data.messages.length === 0) {
        throw new Error('messages array is required and must not be empty')
      }
      if (!data.model || typeof data.model !== 'string') {
        throw new Error('model is required')
      }
      return data
    },
  )
  .handler(async ({ data }: { data: ChatRequest }): Promise<{ content: string }> => {
    const client = getClient()

    const response = await client.chat.send({
      chatRequest: {
        model: data.model,
        messages: data.messages.map((m: { role: string; content: string }) => ({
          role: m.role as 'user' | 'assistant' | 'system',
          content: m.content,
        })),
      },
    })

    const choice = response.choices?.[0]
    const content = choice?.message?.content
    const textContent = typeof content === 'string' ? content : ''
    return { content: textContent }
  })
