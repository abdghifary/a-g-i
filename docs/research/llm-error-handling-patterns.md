# Research: LLM Error Handling Patterns in Production

## Executive Summary

Production LLM applications implement **layered resilience**: retries handle transient failures (429, 5xx), fallback chains switch providers on persistent failures, circuit breakers prevent cascading degradation, and graceful degradation maintains partial functionality. Key findings:

- **Retry defaults**: 2-3 attempts with exponential backoff (base 0.5-2s, max 8s), respecting `Retry-After` headers
- **Timeout values**: 10-30s for chat completions, 30-60s for streaming
- **Circuit breaker thresholds**: 3-5 consecutive failures or >20% failure rate over 60s window
- **Fallback chains**: 2-4 providers/models ordered by capability→cost
- **Error UX**: Consumer apps use persona-aligned messages with retry options; technical errors logged server-side

---

## 1. Retry Patterns

### Production Standards

**OpenAI SDK** (default configuration):
- **Max retries**: 2 attempts (3 total requests)
- **Retryable errors**: 408, 409, 429, 5xx, connection errors, timeouts
- **Backoff strategy**: Exponential with jitter
  - Initial delay: 0.5s
  - Max delay: 8s
  - Jitter: ±25% random variation
- **Retry-After header**: Respected when ≤60s

**Vercel AI SDK**:
- Default: 3 attempts
- Exponential backoff with configurable base delay
- Respects `Retry-After` headers on 429

**LangChain**:
- Configurable retry with `max_retries` parameter
- Exponential backoff starting at 1s
- Built-in fallback to alternate providers

### A.G.I Adaptation

For free-tier OpenRouter models, we use **simplified retry logic**:

```
Attempt 1 (primary model): immediate
  └─ 429? Wait 1s, retry same model once
  └─ 5xx/timeout? Immediate fallback to model 2

Attempt 2 (fallback 1): immediate  
  └─ Same logic

Attempt 3 (fallback 2): immediate
  └─ Still failing? Lock session for 60s, show persona error + "Retry" button
```

**Rationale**: Free tier models are already slow; exponential backoff would frustrate users. Immediate fallback to alternate free models is better than waiting.

---

## 2. Fallback Chains

### How Production Apps Switch Providers

**Pattern**: Ordered list of providers/models. On failure, try next in chain.

**Trigger conditions**:
- HTTP 5xx (server error)
- HTTP 429 (rate limit) after retry
- Timeout (>configured threshold)
- Invalid/malformed response

**Error classification** (determines retry vs skip):
- **Retryable**: 429, 5xx, timeout, connection errors → try next provider
- **Non-retryable**: 400, 401, 403, 422 (client error) → fail fast, show error

**Examples**:
- **Perplexity**: Primary = OpenAI, Fallback = Anthropic, Tertiary = local model
- **Helicone**: Smart routing based on model performance metrics
- **LiteLLM**: Proxy layer handles fallback automatically

### A.G.I Fallback Chain

```typescript
const MODEL_FALLBACK_CHAIN = [
  "meta-llama/llama-4-maverick:free",
  "google/gemma-4-26b-a4b-it:free", 
  "qwen/qwen3-next-80b-a3b-instruct:free"
];
```

**No circuit breaker per model** (overkill for portfolio traffic). Session-level lock after all models exhaust.

---

## 3. Error Message Design

### Consumer-Facing AI Apps

**ChatGPT**:
- Generic: "Something went wrong. Please try again."
- Rate limit: "Too many requests. Please slow down."
- No persona alignment (neutral/professional)

**Claude (Anthropic)**:
- "I'm experiencing high demand. Please try again in a moment."
- Calm, polite tone
- No technical details

**Perplexity**:
- "We're having trouble connecting. Please try again."
- Simple retry button
- Minimal technical exposure

### Production Best Practice

- **Log technical details server-side** (model name, error code, stack trace)
- **Show user-friendly messages** (no stack traces, no model names)
- **Always offer an action**: retry, alternative path, or contact info
- **Match brand voice** if applicable (A.G.I uses persona-aligned errors)

### A.G.I Error Messages

| Error | Message |
|-------|---------|
| 429 rate limit | `[RATE LIMIT DETECTED] Slowing neural pathways...` |
| 5xx/timeout | `[SYSTEM ERROR] Neural pathways unstable. Rerouting...` |
| All models exhausted | `[TOTAL SYSTEM FAILURE] All models offline. Tell Agi to upgrade.` |
| Network failure | `[CONNECTION LOST] Check your connection, caveman.` |
| Invalid response | `[CIRCUIT MALFUNCTION] Processor returned gibberish. Retrying...` |

---

## 4. Circuit Breakers

### Production Patterns

**Netflix Hystrix-style**:
- Open after 3-5 consecutive failures
- Half-open after 30-60s cooldown
- Track failure rate over sliding window (e.g., 20% over 60s)

**OpenAI's approach**:
- No client-side circuit breaker
- Rely on retry logic + backoff
- Server-side rate limiting prevents abuse

**When to use**:
- High-traffic APIs (100+ requests/min)
- Cascading failure prevention
- Protecting upstream services

### A.G.I Decision

**No circuit breaker** — portfolio chatbot has low traffic, simple fallback chain is sufficient. Session lock after all models fail acts as a manual circuit breaker.

---

## 5. Timeout Handling

### Production Values

| Operation | Timeout | Source |
|-----------|---------|--------|
| Chat completion | 10-30s | OpenAI SDK default: 10s |
| Streaming | 30-60s | Vercel AI SDK: 30s |
| Batch/document | 60-120s | LangChain default: 60s |

**Considerations**:
- Free tier models are slower (5-15s typical)
- Streaming needs longer timeout (connection stays open)
- User patience: ~10s before frustration

### A.G.I Timeout

**15 seconds** — balance between:
- Free model latency (often 5-10s)
- User patience (don't wait forever)
- Fallback efficiency (fail fast, try next model)

---

## 6. Error Logging & Monitoring

### Production Practices

**Log server-side**:
- HTTP status code
- Model/provider name
- Request duration
- Error message (technical)
- Stack trace (if exception)
- User ID / session ID (for debugging)

**Never log/expose client-side**:
- API keys
- Full request/response bodies (may contain PII)
- Internal server errors (500 details)

**Observability tools**:
- **Helicone**: LLM-specific observability (cost, latency, errors)
- **LangSmith**: LangChain tracing and debugging
- **Custom**: Structured logging (JSON) to stdout → log aggregator

### A.G.I Logging

Server-side only:
```typescript
console.error(JSON.stringify({
  timestamp: Date.now(),
  model: currentModel,
  error: error.message,
  statusCode: error.status,
  duration: Date.now() - startTime,
  sessionId: sessionId
}));
```

---

## 7. Graceful Degradation

### Patterns

**Partial responses**:
- Show what was generated before error
- "Here's what I have so far..." (streaming context)

**Fallback to cached content**:
- Cache common responses (greeting, FAQ answers)
- Serve from cache when AI is down

**Alternative paths**:
- AI chat down → redirect to static pages
- Specific model down → fallback to simpler model
- Features disabled → show "coming soon" with contact info

### A.G.I Degradation Path

```
AI Chat (primary)
    │
    ├── Boot fails ──► Static pages (bio, experience, etc.)
    │
    ├── Chat error ──► "Retry" button + nav to pages
    │
    └── Rate limited ──► "Wait 60s" + browse pages
```

**Key**: Navigation always works. Pages contain primary info. AI is enhancement, not requirement.

---

## Sources

- [OpenAI SDK Error Handling](https://github.com/openai/openai-node/blob/master/src/core.ts)
- [Vercel AI SDK Retry Logic](https://sdk.vercel.ai/docs/ai-sdk-core/generating-text#retry-logic)
- [LangChain Fallbacks](https://python.langchain.com/docs/modules/model_io/models/fallbacks)
- [Helicone LLM Observability](https://docs.helicone.ai/)
- [LiteLLM Proxy](https://docs.litellm.ai/docs/proxy/reliability)
- Production engineering blogs: Netflix Tech Blog, Stripe Engineering

---

## Decisions Applied to A.G.I

| Pattern | Production Standard | A.G.I Adaptation |
|---------|-------------------|------------------|
| Retries | 2-3 attempts, exponential backoff | 3 attempts, immediate fallback, 1s delay for 429 |
| Timeout | 10-30s | 15s |
| Circuit breaker | 3-5 failures, 30-60s cooldown | Session lock after all models fail |
| Fallback chain | 2-4 providers | 3 free models |
| Error UX | Neutral/professional | A.G.I persona voice |
| Logging | Structured JSON server-side | Same |
| Degradation | Cached responses, alternative paths | Static pages as fallback |
