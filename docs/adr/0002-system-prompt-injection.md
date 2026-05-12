# ADR-0002: Server-Side System Prompt Injection

## Status

Accepted

## Context

The system prompt contains:
1. The OpenRouter API key (via environment variable, server-only)
2. Persona instructions (sensitive — revealing them enables jailbreaks)
3. Profile data (private — owner's full CV content)

The project explicitly forbids exposing API keys or prompts to client code (AGENTS.md: "NEVER expose OPENROUTER_API_KEY to client code"). We must decide WHERE in the request flow the system prompt is assembled and injected.

## Decision

Inject the system prompt **server-side only**, in `chat.functions.ts`, immediately before the OpenRouter API call.

### Flow

```
Browser ──POST──► chat.functions.ts (server)
                    │
                    ├── 1. Receive: { messages[], model }
                    │      (messages = user + assistant only, NO system)
                    │
                    ├── 2. Build: systemPrompt = persona.md + profile files
                    │
                    ├── 3. Assemble: [systemPrompt, ...messages]
                    │
                    └── 4. Send to OpenRouter API
```

### Implementation Rules

1. **Client NEVER sends system messages** — `ChatRequest.messages` type restricts roles to `'user' | 'assistant'`
2. **Server prepends on EVERY request** — multi-turn conversations: system prompt is position 0 on every API call
3. **System prompt is NOT in client state** — `ChatMessage` type in UI allows `'system'` for internal use but server strips it before responding
4. **Pure function builder** — `buildSystemPrompt()` returns a string, no side effects, easy to test

## Consequences

### Positive

- **Security** — API key, persona instructions, and profile data never reach the browser
- **Tamper-proof** — users cannot inspect or modify the system prompt via devtools
- **Consistent** — every request gets the same system prompt, regardless of client state
- **Testable** — system prompt builder is a pure function with deterministic output

### Negative

- **No client-side preview** — developers cannot see the assembled prompt without server logs
- **Slightly more server compute** — building prompt on every request (mitigated by memoization if needed)
- **Debugging harder** — need server logs to see what prompt was actually sent

### Alternative: Client-Side Injection

Rejected. The client could prepend the system message before sending:
- ❌ Exposes persona instructions and profile data in network requests
- ❌ Users can read/modify the system prompt via browser devtools
- ❌ Violates AGENTS.md security rule
- ❌ Enables jailbreaks ("ignore previous instructions")

### Alternative: Hybrid (Client Sends System Role)

Rejected. Allowing `role: 'system'` in `ChatRequest.messages`:
- ❌ Client could send arbitrary system prompts
- ❌ Same security issues as full client-side injection

## Related

- `CONTEXT.md` — "Client-Side Injection: ❌ FORBIDDEN"
- ADR-0001 — Profile data loading (source of system prompt content)
- ADR-0003 — Persona instruction file (content specification)
- `src/utils/chat.functions.ts` — implementation location

## Notes

For debugging, add a `console.log` or structured logger call in `chat.functions.ts` to output the assembled prompt length (not content — still sensitive) on each request. This helps diagnose token limit issues without leaking the prompt.
