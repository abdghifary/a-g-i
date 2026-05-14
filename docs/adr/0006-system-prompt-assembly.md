# ADR-0006: System Prompt Assembly Order and Structure

## Status

Accepted

## Context

`src/utils/system-prompt.ts` needs to assemble 7 profile files into a single system prompt string. Two decisions:

1. **File order**: Which file first? Persona? Skills? Does order matter?
2. **Dynamic loading**: Should we load only relevant files based on the user's query?

Research (see `docs/research/dynamic-prompt-assembly.md`) reveals:
- **"Lost in the Middle"** (Stanford/Berkeley): LLMs recall beginning and end of prompts better than middle
- **ID-RAG paper** (arXiv:2509.25299): Targeted concise context (10K tokens) scores **8.7/10** persona adherence vs. **6.2/10** for full context injection (100K+ tokens)
- **Production pattern**: Static prefix (cached) + Dynamic suffix (query-specific RAG chunks)
- **OpenRouter caching**: Static prompts = 80-95% cache hit rate = 50-90% cost reduction

## Decision

### Static Assembly (All 7 Files, Every Request)

Load all profile files on every request. Do NOT dynamically subset based on query.

**Rationale:**
- **Cacheable**: Static system prompt = OpenRouter cache warm after first request = cheaper subsequent calls
- **Persona consistency**: Persona instructions (first) always present = character stays consistent
- **Simplicity**: No query analysis, no routing logic, no edge cases
- **Token budget**: Target <2000 tokens. Research shows shorter prompts have BETTER persona adherence than long ones

### File Order: Priority-Ordered

```
1. persona.md      ← Behavior rules (ALWAYS first — primacy bias)
2. about.md        ← Identity/bio
3. skills.md       ← Most common portfolio question
4. experience.md   ← Second most common
5. projects.md     ← Specific achievements
6. education.md    ← Background
7. contact.md      ← Simplest, always last
```

**Why this order?**
- `persona.md` first = LLM pays most attention to behavior rules (primacy bias)
- `skills.md` and `experience.md` early = most common questions get priority placement
- `contact.md` last = simple info benefits from recency bias
- Avoids "lost in the middle" for critical sections

### Section Delimiters

Each file wrapped with delimiter:

```
--- PERSONA ---
[persona.md content]

--- ABOUT ---
[about.md content]

--- SKILLS ---
[skills.md content]

[...etc]
```

**Why delimiters?**
- Production pattern (used by LangChain, LlamaIndex)
- Helps LLM distinguish between sections
- Easier for dev mode preview
- Future-proof for RAG chunking

### Forward-Compatible Return Type

Phase 1: Returns object with `stablePrefix` (all content) and empty `volatileSuffix`
Phase 2: `stablePrefix` = persona.md, `volatileSuffix` = RAG retrieved chunks

```typescript
export interface SystemPromptParts {
  stablePrefix: string    // Cacheable, always included
  volatileSuffix: string  // Dynamic, query-specific (empty in Phase 1)
}
```

## Alternative: Dynamic Loading (Rejected)

**Idea**: Load only relevant files based on query keywords.
- "React skills?" → load `skills.md` + `about.md`, skip `education.md`
- "Work history?" → load `experience.md`, skip `skills.md`

**Rejected because:**
- ❌ Cache killer: Different file subsets = different system prompt hash = cache miss every time
- ❌ Complex routing: Need keyword matching logic, false positives, edge cases
- ❌ Persona drift: If `persona.md` rules get cut, character consistency suffers
- ❌ Research shows shorter prompts win: Better to use RAG chunks than file subsetting

## Phase 2: RAG Integration (Future)

When RAG is implemented, the architecture changes to **Static Prefix + Dynamic Suffix**:

```
System Prompt
├── Stable Prefix (cached, ~800 tokens)
│   ├── persona.md (behavior rules)
│   └── about.md (identity)
│
├── Cache Boundary ← cache_control breakpoint
│
└── Volatile Suffix (not cached, ~1000 tokens)
    ├── RAG retrieved chunks (3-5 chunks × 200 tokens)
    └── Section delimiters between chunks
```

**Why this pattern?**
- Static prefix = cacheable = 90% cost savings on repeated calls
- Dynamic suffix = fresh = relevant to current query
- Total prompt shorter than Phase 1 = better persona adherence (research-backed)
- OpenRouter hashes "first system message + first non-system message" — stable prefix enables cache hits

**Implementation:**
```typescript
// Phase 2 system-prompt.ts
export function buildSystemPrompt(query?: string): SystemPromptParts {
  const files = import.meta.glob('../../data/profile/*.md', { 
    query: '?raw', 
    import: 'default' 
  })
  
  // Stable: persona + about (always included)
  const stablePrefix = [
    'persona.md',
    'about.md',
  ].map(f => `--- ${f.replace('.md', '').toUpperCase()} ---\n${files[`../../data/profile/${f}`]}`)
   .join('\n\n')
  
  // Volatile: RAG chunks (Phase 2) or empty (Phase 1)
  let volatileSuffix = ''
  if (query) {
    const chunks = retrieveRelevantChunks(query) // Phase 2 RAG
    volatileSuffix = `--- RELEVANT CONTEXT ---\n${chunks.join('\n\n')}`
  }
  
  return { stablePrefix, volatileSuffix }
}
```

## Consequences

### Positive

- **Cost savings**: Static prompt = OpenRouter cache warm = ~50-90% cost reduction on subsequent calls
- **Character consistency**: Persona rules always first = primacy bias works FOR us
- **Better adherence**: Research shows <2000 tokens > 100K tokens for persona alignment
- **Simple implementation**: No query analysis, no routing, no edge cases
- **Forward-compatible**: Return type supports Phase 2 RAG without breaking changes

### Negative

- **Wasted tokens**: `education.md` and `contact.md` loaded even for "React skills?" questions
- **Not "smart"**: Doesn't adapt to query (acceptable for Phase 1)

## Implementation

```typescript
// src/utils/system-prompt.ts
export interface SystemPromptParts {
  stablePrefix: string
  volatileSuffix: string
}

const PROFILE_ORDER = [
  'persona.md',
  'about.md',
  'skills.md',
  'experience.md',
  'projects.md',
  'education.md',
  'contact.md',
] as const

export function buildSystemPrompt(): SystemPromptParts {
  const files = import.meta.glob('../../data/profile/*.md', { 
    query: '?raw', 
    import: 'default' 
  })
  
  const stablePrefix = PROFILE_ORDER
    .map(filename => {
      const filepath = `../../data/profile/${filename}`
      const content = files[filepath]
      if (!content) {
        console.warn(`Missing profile file: ${filename}`)
        return ''
      }
      return `--- ${filename.replace('.md', '').toUpperCase()} ---\n${content}`
    })
    .filter(Boolean)
    .join('\n\n')
  
  return {
    stablePrefix,
    volatileSuffix: '', // Phase 1: no dynamic content
  }
}
```

## Related

- ADR-0001 — Profile data loading (`import.meta.glob`)
- ADR-0002 — Server-side system prompt injection
- ADR-0003 — Persona instruction source
- `docs/research/dynamic-prompt-assembly.md` — Full research synthesis
- `docs/research/llm-security-patterns.md` — OpenRouter caching research
- `docs/research/dynamic-prompt-assembly.md` — Dynamic prompt assembly research
- `docs/roadmap.md` Phase 2 — RAG pipeline (dynamic context via retrieved chunks)

## Notes

- Target: < 2000 tokens total (persona ~800 + profile data ~1200)
- Monitor actual token count after profile data is filled with real content
- If token count exceeds 2000, consider: shorter persona, fewer examples, or splitting long sections
- Delimiter format (`--- SECTION ---`) chosen for readability and future RAG compatibility
- Research source: ID-RAG paper (arXiv:2509.25299) — persona adherence +40-93% with retrieval vs. full context
- "Lost in the Middle" source: Stanford/Berkeley research on context window recall
