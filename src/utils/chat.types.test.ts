import { describe, expectTypeOf, it } from 'vitest'
import type { ChatMessage, ChatRequest } from './chat.types'

describe('chat types', () => {
  it('keeps ChatRequest limited to user and assistant messages', () => {
    expectTypeOf<ChatRequest['messages'][number]['role']>().toEqualTypeOf<'user' | 'assistant'>()
    expectTypeOf<ChatRequest>().not.toHaveProperty('model')
  })

  it('keeps ChatMessage flexible for internal UI state', () => {
    expectTypeOf<ChatMessage['role']>().toEqualTypeOf<'user' | 'assistant' | 'system'>()
  })
})
