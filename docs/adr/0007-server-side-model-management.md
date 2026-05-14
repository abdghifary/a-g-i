# ADR-0007: Server-Side Model Management with Auto-Fallback

## Status

Accepted

## Context

The current implementation exposes model selection to users via a dropdown in `src/routes/index.tsx`. The `ChatRequest` type includes a `model` field that clients send to the server.

**Problem**: For a portfolio chatbot, users shouldn't care about LLM models. Model selection is an implementation detail. Exposing it:
- Clutters the UI with technical choices users don't understand
- Creates support burden ("which model should I pick?")
- Violates the "it just works" principle
- Doesn't match the persona (a Fallout terminal robot wouldn't ask you to pick a neural network)

**New Requirement**: Remove model selection from UI entirely. Server manages models internally with automatic fallback on errors.

## Decision

### 1. Remove Model Selection from Client

**Deleted from client:**
- `model` field from `ChatRequest` type
- Model selector dropdown in `index.tsx`
- `selectedModel` state in `App` component
- `AVAILABLE_MODELS` export from client-facing types (or keep as server-only)

**Client flow simplification:**
```
Before: User types → select model → send { messages, model }
After:  User types → send { messages }
```

### 2. Server-Side Model Fallback Chain

Define a priority-ordered list of models on the server:

```typescript
// src/utils/chat.functions.ts — SERVER ONLY
const MODEL_FALLBACK_CHAIN = [
  'meta-llama/llama-4-maverick:free',
  'google/gemma-4-26b-a4b-it:free',
  'qwen/qwen3-next-80b-a3b-instruct:free',
] as const
```

**Fallback logic:**
```
User sends message
    │
    ├── Try Model 1 (primary)
    │      Success? ──Yes──► Return response
    │      │
    │      Error
    │      │
    │      Retryable? (429, 5xx, timeout)
    │      │
    │      Yes
    │      │
    ├── Try Model 2 (fallback)
    │      Success? ──Yes──► Return response
    │      │
    │      Error
    │      │
    │      Retryable?
    │      │
    │      Yes
    │      │
    ├── Try Model 3 (last resort)
    │      Success? ──Yes──► Return response
    │      │
    │      Error
    │      │
    └── All failed ──► Return persona-appropriate error message
```

### 3. Retryable vs Non-Retryable Errors

| Error | Retry? | Action |
|-------|--------|--------|
| 429 Too Many Requests | Yes | Rate limited, try next model |
| 500 Internal Server Error | Yes | Provider error, try next model |
| 502/503/504 Gateway Error | Yes | Provider down, try next model |
| Network timeout | Yes | Try next model |
| 400 Bad Request | No | Our bug, don't retry |
| 401 Unauthorized | No | API key issue, don't retry |
| 403 Forbidden | No | Access denied, don't retry |

### 4. Client Communication

**On model switch**: Client doesn't need to know. Response looks identical.

**On all-models-failed**: Return persona-appropriate error:
```
[SYSTEM ERROR]
All neural pathways currently offline. Rate limits hit on every model. 
Try again in a few minutes — or pay my human's consulting rate for a private API key.
```

**Optional**: Return `modelUsed` in response for dev mode logging:
```typescript
interface ChatResponse {
  content: string
  modelUsed?: string // Only exposed in dev mode
}
```

### 5. Implementation

```typescript
// src/utils/chat.functions.ts
const MODEL_FALLBACK_CHAIN = [
  'meta-llama/llama-4-maverick:free',
  'google/gemma-4-26b-a4b-it:free', 
  'qwen/qwen3-next-80b-a3b-instruct:free',
] as const

const RETRYABLE_STATUS_CODES = [429, 500, 502, 503, 504]

function isRetryable(error: unknown): boolean {
  if (error instanceof Response) {
    return RETRYABLE_STATUS_CODES.includes(error.status)
  }
  if (error instanceof Error && error.message.includes('timeout')) {
    return true
  }
  return false
}

export const chatCompletion = createServerFn({ method: 'POST' })
  .inputValidator((data: { messages: Array<{ role: string; content: string }> }) => {
    // ... validation (no model field)
  })
  .handler(async ({ data }): Promise<{ content: string }> => {
    const systemPrompt = buildSystemPrompt()
    const messages = [
      { role: 'system' as const, content: systemPrompt.stablePrefix + systemPrompt.volatileSuffix },
      ...data.messages.filter(m => m.role !== 'system'),
    ]
    
    let lastError: Error | null = null
    
    for (const modelId of MODEL_FALLBACK_CHAIN) {
      try {
        const client = getClient()
        const response = await client.chat.send({
          chatRequest: {
            model: modelId,
            messages: messages.map(m => ({ role: m.role as 'user' | 'assistant' | 'system', content: m.content })),
          }
        })
        
        const choice = response.choices?.[0]
        const content = typeof choice?.message?.content === 'string' 
          ? choice.message.content 
          : ''
        
        return { content }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        
        if (!isRetryable(error)) {
          // Non-retryable error — stop immediately
          break
        }
        
        // Log for monitoring
        console.warn(`Model ${modelId} failed, trying fallback...`, error)
      }
    }
    
    // All models failed or non-retryable error
    throw lastError ?? new Error('All models failed')
  })
```

### 6. UI Changes

**Removed from `src/routes/index.tsx`:**
- `selectedModel` state
- Model selector `<select>` dropdown
- `AVAILABLE_MODELS` import (if not used elsewhere)

**Kept:**
- `ChatMessage` type (for UI state)
- `DEFAULT_MODEL` no longer needed (server decides)

## Consequences

### Positive

- **Simpler UI**: No technical dropdown, cleaner chat interface
- **Better UX**: Users just chat, no decisions to make
- **Resilient**: Auto-fallback handles rate limits gracefully
- **Maintains persona**: A robot terminal wouldn't ask you to pick a model
- **Server control**: Can adjust model list without client deployment
- **Cost optimization**: Server can prioritize cheaper/better models

### Negative

- **Less transparency**: Users don't know which model answered (acceptable for portfolio)
- **No power-user mode**: Can't manually select a specific model (dev mode could expose this)
- **Fallback complexity**: Need robust error classification
- **Debugging harder**: Need server logs to know which model failed

### Mitigations

- Dev mode can show `modelUsed` in response metadata
- Server logs track fallback chains for debugging
- Could add "report issue" button that includes model info

## Alternative: Client-Side Fallback (Rejected)

Client tries Model A, gets error, tries Model B:
- ❌ Exposes multiple models to client (information leakage)
- ❌ More network round-trips
- ❌ Complex client error handling
- ❌ User sees errors before fallback succeeds

## Related

- ADR-0002 — Server-side system prompt injection (same principle: server owns LLM details)
- `docs/roadmap.md` Phase 1 Task 6 — Model selection (now removed from UI)
- `src/utils/chat.types.ts` — Type changes (remove `model` from `ChatRequest`)
- `src/routes/index.tsx` — UI simplification (remove dropdown)

## Migration Notes

1. Remove `model` from `ChatRequest`
2. Remove model selector from `index.tsx`
3. Add `MODEL_FALLBACK_CHAIN` to `chat.functions.ts`
4. Implement fallback loop in `chatCompletion`
5. Add `isRetryable()` error classifier
6. Update `chatMutation` in `index.tsx` to not send `model`
7. Test: simulate 429 errors, verify fallback works

## Unresolved Items

| Item | Status | Notes |
|------|--------|-------|
| Paid model support in dev mode | TBD | Could expose via `VITE_SHOW_PAID_MODELS` env var |
| Fallback retry delay | TBD | Immediate fallback or exponential backoff? |
| Model health monitoring | TBD | Track which models fail most often |
| Fallback chain order | TBD | Based on actual testing (U1) |
