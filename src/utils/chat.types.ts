export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt: number
}

export interface ChatRequest {
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
  model: string
}

export interface ChatStreamChunk {
  delta?: string
  done: boolean
  error?: string
}

export const AVAILABLE_MODELS = [
  { id: 'anthropic/claude-sonnet-4', label: 'Claude Sonnet 4' },
  { id: 'openai/gpt-4o', label: 'GPT-4o' },
  { id: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
  { id: 'meta-llama/llama-4-maverick', label: 'Llama 4 Maverick' },
] as const

export const DEFAULT_MODEL = AVAILABLE_MODELS[0].id
