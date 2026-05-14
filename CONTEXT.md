# A.G.I Context

AI-powered portfolio chatbot — a "digitalized version" of the owner.

## Domain Glossary

### Core Concepts

| Term | Definition |
|------|------------|
| **A.G.I** | The chatbot persona — Artificial General Intelligence. A Portal 2 GLaDOS-meets-Fallout-terminal robot representing the human owner. Sarcastic, clinically detached, reluctantly helpful. Not a generic AI assistant. |
| **Persona** | The character definition: tone (sarcastic, superior, passive-aggressive), speech patterns (science framing, system brackets), scope boundaries, and few-shot examples. Lives in `data/profile/persona.md`. |
| **Profile Data** | Factual information about the owner: bio, experience, skills, projects, education, contact. Lives in `data/profile/*.md` (6 files). |
| **System Prompt** | The complete prompt sent to the LLM on every request. Assembled from: persona instructions + profile data. Never exposed to the client. |
| **Persona Adherence** | The degree to which the LLM maintains the A.G.I character across responses. Primary quality metric for Phase 1. |
| **Scope Boundary** | The line between in-scope questions (professional: skills, projects, experience) and out-of-scope questions (coding help, general knowledge, personal advice). |
| **Decline** | When the chatbot refuses an out-of-scope question in character. Should redirect to an in-scope topic. |
| **Boot Sequence** | User-initiated startup via "Boot A.G.I" button. Shows terminal animation while establishing LLM connection. |
| **Navigation Gate** | REMOVED — nav links always visible. Boot button replaces forced engagement pattern. |

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

### Architecture Pattern

**Hybrid: Pages + AI Companion**

```
User Journey:
├─ Landing (index.tsx) ──► AI Chat (primary interface)
│                           └─ Deep-dive questions (RAG details)
├─ /bio ──► Static page (primary info)
├─ /experience ──► Static page (primary info)
├─ /projects ──► Static page (primary info)
└─ /contact ──► Static page (primary info)
```

- **Traditional pages** contain basic information (resume-style)
- **AI chat** explains details NOT on pages (project war stories, behind-the-scenes, nuance)
- **Boot button**: User-initiated AI startup on landing page. Nav always visible.
- Pages act as fallback when AI is unavailable

### Naming Convention

| Context | Format | Example |
|---------|--------|---------|
| GitHub repo / folder | `a-g-i` | `github.com/user/a-g-i` |
| Display / UI title | `A.G.I` | `<title>A.G.I</title>` |
| Code variables / types | `AGI` | `AGIBootButton`, `AGIMessage` |
| Package.json name | `a-g-i` | `"name": "a-g-i"` |
| Robot self-reference | "I'm A.G.I" | Persona.md instructions |

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
| Model management | Server-side fallback chain, no UI selection | ADR-0007 |
| Free model default | Server-side fallback chain (3 free models) | ADR-0007 |
| Jailbreak defense | Server filter + system prompt rules (both layers) | ADR-0004 |
| Dev mode activation | URL param (`?dev=1`) + LocalStorage persistence | — |
| Dev mode display | Sidebar panel (not inline) for system prompt preview | — |
| `ChatRequestMessage` | Minimal `{ role, content }` — no `id` or `createdAt` | — |
| App title | "A.G.I." (Abdurachman Ghifary initials) | ADR-0005 |
| Initial greeting | AI-crafted via LLM call, user-initiated boot button | ADR-0005 |
| Boot error message | Persona error with fallback chain + static fallback | ADR-0005 |
| Boot UX | "Boot A.G.I" button — user-initiated, not auto-start | ADR-0005 |
| Navigation | Bottom terminal-style nav, always visible | ADR-0005 |
| Page/AI relationship | Traditional pages = primary info, AI = deep-dive companion | ADR-0005 |
| System prompt assembly | Static (all files), priority-ordered, with delimiters | ADR-0006 |
| Persona adherence research | Shorter prompts (<2000 tokens) outperform 100K+ prompts | Research |
| Prompt caching | Static prefix cacheable, dynamic suffix fresh | Research |
| Input validation | MAX_INPUT_LENGTH = 500 chars, MAX_MESSAGE_COUNT = 20, session expiry = 30 min | — |
| Eval frequency | Manual, run after every profile change | — |
| Limit messages | 500 chars: "My circuits can only process so much at once. I suggest you to go to ChatGPT if want to start a therapy sessions." / 20 msgs: "Conversation limit reached. Refresh to start a new session. Or better yet, tell the real Agi to upgrade the free model tier." | — |
| Error handling | 3-model fallback, 15s timeout, 1s delay for 429, immediate for 5xx, session lock 60s after exhaustion | — |
| Error messages | ALL in A.G.I persona voice. No technical details exposed. Server-side logging only. | — |
| Profile tone | Plain factual, third person. No humor/sarcasm — save that for persona.md | — |
| Profile structure | `#` title, `##` sections (200-300 words each), `###` subsections | — |

## Unresolved Items

| # | Item | Blocking? | Status |
|---|------|-----------|--------|
| U1 | Free model fallback chain | YES | Server-side priority list, test top 3 candidates |
| U12 | Model fallback retry delay | NO | **RESOLVED**: 1s delay for 429, immediate for 5xx, session lock 60s after exhaustion |
| U2 | `ChatMessage` type allows `system` role | YES | Decision: keep in `ChatMessage` (UI), remove from `ChatRequest` (API) |
| U3 | System prompt builder implementation | YES | `src/utils/system-prompt.ts` not yet created |
| U9 | Jailbreak pattern list | NO | Regex patterns defined in ADR-0004, needs implementation |
| U10 | Input length limits | NO | **RESOLVED**: MAX_INPUT_LENGTH=500, MAX_MESSAGE_COUNT=20, session expiry=30min |
| U11 | Dev mode UI component | NO | Phase 4+ feature; activation mechanism decided |
| U4 | Persona validation / eval checklist | NO | Deferred to post-implementation. Need 5-10 test questions |
| U5 | Error handling for rate limits (429) | NO | **RESOLVED**: 3-model fallback, 15s timeout, persona error messages, session lock |
| U6 | Token budgeting for system prompt | NO | Low priority. Monitor after free model selected |
| U7 | Profile data filled with real content | NO | Owner responsibility. Templates created |
| U8 | Streaming compatibility (Phase 4) | NO | Future concern. Design `system-prompt.ts` as pure function |
