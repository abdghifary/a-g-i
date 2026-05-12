# Mini-Me Context

AI-powered portfolio chatbot — a "digitalized version" of the owner.

## Domain Glossary

### Core Concepts

| Term | Definition |
|------|------------|
| **Mini-Me** | The chatbot persona — a Fallout-terminal-robot character that represents the human owner. Not a generic AI assistant. |
| **Persona** | The character definition: tone (casual, goofy, sarcastic), speech patterns, scope boundaries, and few-shot examples. Lives in `data/profile/persona.md`. |
| **Profile Data** | Factual information about the owner: bio, experience, skills, projects, education, contact. Lives in `data/profile/*.md` (6 files). |
| **System Prompt** | The complete prompt sent to the LLM on every request. Assembled from: persona instructions + profile data. Never exposed to the client. |
| **Persona Adherence** | The degree to which the LLM maintains the Mini-Me character across responses. Primary quality metric for Phase 1. |
| **Scope Boundary** | The line between in-scope questions (professional: skills, projects, experience) and out-of-scope questions (coding help, general knowledge, personal advice). |
| **Decline** | When the chatbot refuses an out-of-scope question in character. Should redirect to an in-scope topic. |
| **Suggested Questions** | 3-4 clickable starter questions shown below the greeting. Auto-send on click, disappear after first user message. |

### Data Layer

| Term | Definition |
|------|------------|
| **Profile Markdown** | Human-readable `.md` files in `data/profile/`. Heading structure: `#` file title, `##` sections (RAG chunk boundaries), `###` subsections. |
| **Persona Markdown** | `data/profile/persona.md` — instructions for the LLM on how to behave. Not factual data; behavioral rules. |
| **RAG Chunk** | A section of profile data (split by `##` heading) embedded as a vector for semantic search. Phase 2 concept. |
| **Vector Store** | Local in-process database (Orama or LanceDB) storing embedded profile chunks. Phase 2 concept. |

### Technical Terms

| Term | Definition |
|------|------------|
| **Server Function** | TanStack Start `createServerFn` — runs server-side, client calls via POST. All LLM calls go through these. |
| **Build-Time Embedding** | Profile files included in server bundle at build time via `import.meta.glob('?raw')`. No runtime filesystem access. |
| **Client-Side Injection** | ❌ FORBIDDEN. System prompt must NEVER be assembled or exposed in the browser. |
| **Free Model** | OpenRouter models with `:free` suffix. Rate-limited, lower quality than paid, but $0 cost. |

## Conventions

### File Structure

```
data/profile/
├── persona.md      ← Persona instructions (tone, scope, examples)
├── about.md        ← Bio, personality notes
├── experience.md   ← Work history with bullets
├── skills.md       ← Tech stack breakdown
├── projects.md     ← 3-5 best projects with outcomes
├── education.md    ← Degrees + certifications
└── contact.md      ← Email, social links, availability
```

### Markdown Style Guide

- `#` (h1): File title ONLY
- `##` (h2): Major sections — these become RAG chunk boundaries in Phase 2
- `###` (h3): Subsections
- Target: 200-300 words per `##` section
- No frontmatter (simplest for now)
- Plain text + headings. Links OK. Tables OK for skills matrix.

### Naming

- **Profile files**: kebab-case, singular noun (`about.md`, not `abouts.md`)
- **Server functions**: camelCase, ends with action (`chatCompletion`, not `chat`)
- **Types**: PascalCase, descriptive (`ChatMessage`, not `Msg`)
- **Constants**: SCREAMING_SNAKE_CASE for exported consts (`AVAILABLE_MODELS`)

## Key Decisions

Critical architectural choices affecting implementation. See [`docs/adr/`](docs/adr/) for full rationale.

| Decision | Choice | ADR |
|----------|--------|-----|
| Profile data loading | `import.meta.glob('?raw')` — build-time embedding | ADR-0001 |
| System prompt injection | Server-side only in `chat.functions.ts` | ADR-0002 |
| Persona instruction source | `data/profile/persona.md` (7th profile file) | ADR-0003 |
| Client message roles | `'user' \| 'assistant'` only (no `system` from client) | ADR-0002 |
| Free model default | Required — research pending | — |

## Unresolved Items

| # | Item | Blocking? | Status |
|---|------|-----------|--------|
| U1 | Free OpenRouter model selection | YES | Needs research: test 3 candidates with persona prompt |
| U2 | `ChatMessage` type still allows `system` role | YES | Need to restrict type + verify no client code breaks |
| U3 | System prompt builder implementation | YES | `src/utils/system-prompt.ts` not yet created |
| U4 | Persona validation / eval checklist | NO | Deferred to post-implementation. Need 5-10 test questions |
| U5 | Error handling for rate limits (429) | NO | Medium priority. Free models WILL hit limits |
| U6 | Token budgeting for system prompt | NO | Low priority. Monitor after free model selected |
| U7 | Profile data filled with real content | NO | Owner responsibility. Templates created |
| U8 | Streaming compatibility (Phase 4) | NO | Future concern. Design `system-prompt.ts` as pure function |
