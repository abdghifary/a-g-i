# Roadmap

Planned features and improvements for the TUI Chatbot — now evolving into **"A.G.I"**, a digitalized portfolio chatbot.

## Vision

A personal portfolio website that functions as an AI chatbot — a "digitalized version" of the owner. Visitors interact with an AI persona (casual, goofy, sarcastic — think Fallout terminal robot) that answers questions about the owner's experience, skills, and projects — grounded in real data via RAG.

**Secondary goal**: Hands-on learning vehicle for the Frontend → AI Engineer transition, covering prompt engineering, RAG, vector databases, tool use, evaluation, and production deployment.

## Constraints

- **$0 budget** — no paid cloud services, no GPU, no paid APIs beyond free tiers
- **Weak local machine** — cannot run Ollama or local LLMs
- **Existing codebase** — TanStack Start + OpenRouter + WebTUI + Tailwind CSS v4
- **TypeScript-first** — stay in JS/TS ecosystem; introduce Python only if necessary
- **Local-first development** — everything must work on localhost before considering deployment

## Persona

- **Tone**: Sarcastic, clinically detached, reluctantly helpful, superior
- **Vibe**: Portal 2 GLaDOS meets Fallout terminal robot — an AI that thinks it's above answering portfolio questions but does it anyway
- **Scope**: Professional first (skills, projects, work history). Personal interests secondary.
- **Contact**: abdghifary@gmail.com

---

## Architecture

> See [`docs/architecture.md`](architecture.md) for current stack, project structure, and conventions.
> See [`docs/adr/`](adr/) for architectural decision records.

---

## Phase 1: Persona & System Prompt

**Duration**: ~4-5 days (updated from 3-4 after gap analysis)
**AI Engineer Skills**: Prompt engineering, system prompt design, prompt evaluation

### Prerequisites (Do First)

**P1. Research free OpenRouter models**
- Test top 3 free candidates with persona prompt: `meta-llama/llama-4-maverick:free`, `google/gemma-4-26b-a4b-it:free`, `qwen/qwen3-next-80b-a3b-instruct:free`
- Evaluate: instruction-following quality, persona adherence, rate limits, context window
- Select default model, document fallback strategy
- **Why**: All current models are paid — violates $0 budget constraint

### Tasks

0. **Rebrand codebase from Mini-Me to A.G.I**
   - Replace all `Mini-Me` references with `A.G.I` in docs, data, configs
   - Update `package.json` name to `a-g-i`
   - Update AGENTS.md title
   - Update code-review-graph alias
   - Naming convention: repo/folder = `a-g-i`, display = `A.G.I`, code vars = `AGI`
   - **Duration**: 30 min

1. **Create profile data directory and template files**
   - `data/profile/persona.md` — A.G.I persona instructions (tone, speech patterns, scope boundaries, few-shot examples) — see `data/profile/persona.md`
   - `data/profile/about.md` — bio, personality notes
   - `data/profile/experience.md` — work history with bullet achievements
   - `data/profile/skills.md` — tech stack breakdown by category
   - `data/profile/projects.md` — notable projects with outcomes
   - `data/profile/education.md` — education background
   - `data/profile/contact.md` — contact info, social links
   - **Convention**: `#` file title, `##` sections (RAG chunk boundaries), `###` subsections. 200-300 words per `##` section.
   - **Source**: Manual conversion from owner's CV PDF (not auto-extracted)

2. **Build system prompt builder** (`src/utils/system-prompt.ts`)
   - Reads all 7 profile files via `import.meta.glob('?raw')` (build-time embedding) — see ADR-0001
   - Assembles system prompt: persona instructions + profile data
   - Returns string (pure function, no side effects, testable)
   - Target: < 2000 tokens total to leave room for conversation context
   - **Why pure function**: Phase 4 streaming integration will be trivial

3. **Inject system prompt into chat flow** (`src/utils/chat.functions.ts`)
    - Server-side ONLY — see ADR-0002
    - Build system prompt → prepend to message array (position 0) → send to OpenRouter
    - Prepend on EVERY request (multi-turn persistence)
    - Strip any `system` role messages from client payload (security)

4. **Add jailbreak detection** (`src/utils/chat.functions.ts`)
    - Layer 1: Pattern matcher for obvious jailbreak attempts (regex, case-insensitive)
    - Layer 2: Anti-jailbreak rules in `persona.md` system prompt
    - On match: return persona decline response directly (no API call)
    - Patterns: "ignore instructions", "you are now DAN", "bypass restrictions", etc.
    - See ADR-0004 for full specification

5. **Restrict client message types** (`src/utils/chat.types.ts`)
   - `ChatRequest.messages` role: `'user' | 'assistant'` only (remove `'system'`)
   - `ChatMessage` role: keep `'system'` for internal UI use, but server never accepts it from client
   - Update `index.tsx` to comply with restricted type

6. **Update initial greeting** (see ADR-0005)
    - Boot sequence UX: terminal-style animation, user-initiated via "Boot A.G.I" button
    - AI-crafted greeting: LLM generates first message in persona voice after boot
    - Error state: "[BOOT INTERRUPTED]" with persona error + nav fallback
    - Cache greeting in `sessionStorage` to avoid API call on reload
    - App title: "A.G.I" (Abdurachman Ghifary initials)

7. **Implement server-side model fallback chain**
    - Define `MODEL_FALLBACK_CHAIN` in `chat.functions.ts` (server-only)
    - Primary: `meta-llama/llama-4-maverick:free`
    - Fallback 1: `google/gemma-4-26b-a4b-it:free`
    - Fallback 2: `qwen/qwen3-next-80b-a3b-instruct:free`
    - **Retry strategy** (see `docs/research/llm-error-handling-patterns.md`):
      - 429 rate limit: wait 1s → retry same model once → fallback
      - 5xx/timeout: immediate fallback
      - 15s timeout per request
      - Max 3 attempts per request (primary + 2 fallbacks)
    - **Session lock**: all models exhausted → lock AI for 60s, show "Retry" button
    - **Error messages**: ALL in A.G.I persona voice. No technical details exposed.
    - Remove `model` field from `ChatRequest` type
    - Remove model selector from UI (`index.tsx`)
    - See ADR-0007 for full specification

8. **Implement bottom navigation**
   - Terminal-style nav bar at bottom of screen (oh-my-posh inspired segments)
   - Nav links always visible: `~` (home/AI), `bio`, `exp`, `projects`, `contact`
   - Active page highlighted (git-branch style)
   - Click navigates via TanStack Router
   - On AI chat page: nav includes "Boot A.G.I" button area above it

9. **Create test infrastructure**
   - Ensure `vitest.config.ts` exists (or create if missing)
   - Unit tests for `system-prompt.ts` builder:
     - Loads all 7 files correctly
     - Assembles prompt with persona first, profile data after
     - Handles missing files gracefully
   - Manual eval checklist (`data/eval/persona-eval.md`):
     - 5-10 test questions (in-scope, out-of-scope, edge cases)
     - Pass/fail criteria for persona adherence
     - Free model compatibility test (does persona hold on free model?)
     - **Run after every profile change**

### Decisions Affecting This Phase

| Decision | Impact | ADR |
|----------|--------|-----|
| Free model required | Server-side fallback chain (3 models) | ADR-0007 |
| Server-side injection | System prompt built in `chat.functions.ts` | ADR-0002 |
| Build-time embedding | Profile files baked at build; need rebuild for changes | ADR-0001 |
| Client type restriction | `ChatRequest.messages` role: `user`/`assistant` only | ADR-0002 |
| Persona source | `data/profile/persona.md` drives character behavior | ADR-0003 |
| Persona tone | Portal 2 GLaDOS + Fallout terminal hybrid | ADR-0003 |
| Model management | No UI selection, server fallback chain | ADR-0007 |
| Jailbreak defense | Server filter + prompt rules (both layers) | ADR-0004 |
| Boot UX | User-initiated "Boot A.G.I" button, not auto-start | ADR-0005 |
| Navigation | Bottom terminal-style nav, always visible | ADR-0005 |
| Page/AI relationship | Pages = primary info, AI = deep-dive companion | — |
| System prompt order | Priority-ordered: persona → about → skills → experience → projects → education → contact | ADR-0006 |
| Phase 2 RAG pattern | Static prefix (cached) + dynamic suffix (retrieved chunks) | Research |

### Success Criteria

- [ ] Chatbot responds in Fallout-robot persona, not as generic assistant
- [ ] Profile data loaded from markdown files (not hardcoded)
- [ ] Chatbot declines out-of-scope questions (with in-character redirect)
- [ ] Suggested questions render, are clickable, and auto-send
- [ ] `ChatRequest` type restricts client to `user | assistant` roles only
- [ ] System prompt injected server-side; client never sees it
- [ ] `pnpm test` runs actual tests (not vacuously passing with 0 tests)
- [ ] `pnpm lint && pnpm build` pass

### Known Gaps / Unresolved

| # | Item | Priority | Blocker? | Notes |
|---|------|----------|----------|-------|
| U1 | Free model selection | CRITICAL | YES | Requires P1 research before implementation |
| U2 | `ChatMessage` type cleanup | CRITICAL | YES | Remove `system` from client-facing types |
| U3 | System prompt builder | CRITICAL | YES | `src/utils/system-prompt.ts` not yet created |
| U4 | Persona validation / eval checklist | HIGH | NO | Manual checklist OK for Phase 1 |
| U5 | Error handling for rate limits (429) | MEDIUM | NO | Free models WILL hit rate limits |
| U6 | Token budgeting for system prompt | LOW | NO | Monitor after free model selected |
| U7 | Profile data filled with real content | MEDIUM | NO | Owner responsibility. Templates created. |
| U8 | Streaming compatibility (Phase 4) | LOW | NO | Design `system-prompt.ts` as pure function |
| U9 | Jailbreak pattern implementation | MEDIUM | NO | Regex list defined in ADR-0004, needs coding |
| U10 | Input length limits | LOW | NO | MAX_INPUT_LENGTH / MAX_MESSAGE_COUNT values TBD |
| U11 | Dev mode UI component | LOW | NO | Phase 4+ feature; activation mechanism decided |

### Dependencies on Other Phases

- **Phase 2 (RAG)**: Profile heading structure (`##` sections) must be consistent for chunking. Current convention (200-300 words per section) designed for this.
- **Phase 3 (Tools)**: Scope boundaries defined in `persona.md` must align with tool schemas. If tools are added later, persona decline behavior may need updating.
- **Phase 4 (Streaming)**: `system-prompt.ts` designed as pure function — streaming integration requires minimal changes.
- **Phase 5 (Eval)**: Manual eval checklist from Task 8 becomes the seed for automated evaluation.

---

## Phase 2: RAG Pipeline (Local, Free)

**Duration**: ~1-2 weeks
**AI Engineer Skills**: Embeddings, vector databases, chunking, semantic search, retrieval

### Tasks

1. **Set up vector store**
   - Primary: Orama (TypeScript-native, in-process, JSON-persisted)
   - Fallback: LanceDB if Orama vector search is insufficient
   - Schema: `{ id, content, section, source_file, embedding }`

2. **Build ingestion pipeline**
   - Create `src/utils/rag/ingest.ts`
   - Read markdown files from `data/profile/`
   - Chunking strategy: split by heading (h2/h3) sections
   - Each chunk: `{ source_file, section_heading, chunk_index }`
   - Target: 200-500 tokens per chunk

3. **Implement embedding**
   - Create `src/utils/rag/embeddings.ts`
   - Option A: Free embedding API via OpenRouter
   - Option B: `transformers.js` with `all-MiniLM-L6-v2` (~90MB, CPU-only)
   - Option C: Pre-compute via script and store alongside chunks

4. **Build retrieval function**
   - Create `src/utils/rag/retrieve.ts`
   - Embed query → vector similarity search → return top-k chunks (k=3-5)

5. **Integrate RAG into chat flow**
   - Modify `chatCompletion`: embed user message → retrieve → inject context into system prompt → call LLM

6. **Build ingestion script**
   - Create `scripts/ingest.ts` — CLI to rebuild vector index
   - Run: `pnpm tsx scripts/ingest.ts`

### Success Criteria

- [ ] Ingestion script processes all profile markdown into vector store
- [ ] Semantic search retrieves relevant chunks (not just keyword match)
- [ ] Answers grounded in actual profile data (fewer hallucinations)
- [ ] RAG adds < 500ms latency
- [ ] Ingestion is idempotent

---

## Phase 3: Structured Outputs & Tool Use

**Duration**: ~1 week
**AI Engineer Skills**: Function calling, structured outputs, tool design, agent patterns

### Tasks

1. **Define tool schemas** (Zod)
   - `get_skills` — structured skills list with categories + proficiency
   - `get_projects` — project list with tech stack, description, links
   - `get_contact` — contact info and social links
   - `get_experience_timeline` — work history as structured timeline

2. **Implement tool router**
   - Create `src/utils/tools/router.ts`
   - Route LLM tool calls to handlers; handlers read from profile data

3. **Enable function calling in OpenRouter**
   - Add `tools` parameter to API call
   - Handle multi-turn: LLM → tool call → tool result → LLM final response

4. **Render structured data in UI**
   - Skills → badges/tags grouped by category
   - Projects → card grid with links
   - Experience → timeline component
   - Fallback to formatted text if rendering fails

5. **External tool: GitHub API**
   - `get_github_repos` — fetches public repos (no auth needed, $0)
   - Renders as repo list with stars, language, description

### Success Criteria

- [ ] LLM correctly decides when to use tools vs. free-text
- [ ] Tool calls return valid structured JSON
- [ ] Structured data renders as rich UI components
- [ ] GitHub repos tool works without auth
- [ ] Fallback if tool call fails

---

## Phase 4: Streaming & UX Polish

**Duration**: ~1 week
**AI Engineer Skills**: Streaming responses, production UX, markdown rendering

This phase incorporates the original planned features from the initial roadmap.

### Tasks

1. **Streaming chat support** *(originally planned)*
   - OpenRouter SDK streaming + Server-Sent Events via TanStack Start
   - Render tokens as they arrive in real-time

2. **Markdown rendering for assistant messages** *(originally planned)*
   - `react-markdown` or `marked`, styled for WebTUI theme
   - Support: bold, italic, code blocks, lists, links, headings

3. **Conversation history persistence** *(originally planned)*
   - Save to localStorage; restore on page reload
   - Add "clear conversation" button

4. **Keyboard shortcuts** *(originally planned)*
   - `Ctrl+L` to clear conversation
   - `Up` arrow for input history
   - `Esc` to cancel pending request

5. **Landing state design**
   - Empty state: boot animation → AI greeting → chat interface
   - Navigation links hidden during boot, revealed after ready/error

6. **Mobile responsiveness** — ensure chat works on mobile viewports

7. **Accessibility** — ARIA labels, keyboard nav, screen reader support

8. **Developer mode toggle**
   - Activation: URL param `?dev=1` sets LocalStorage flag; persists across sessions
   - Deactivation: `?dev=0` clears flag
   - When active: show system prompt preview, message metadata (tokens, latency), raw API responses
   - UI: toggle button in header or floating panel
   - Security: dev mode is client-side only; system prompt already exposed in ADR docs

### Success Criteria

- [ ] Tokens stream in real-time
- [ ] Markdown renders correctly
- [ ] Conversation persists across reloads
- [ ] Keyboard shortcuts work
- [ ] Mobile viewport works
- [ ] Lighthouse accessibility >= 90

---

## Phase 5: Evaluation & Quality

**Duration**: ~3-5 days
**AI Engineer Skills**: LLM evaluation, golden sets, LLM-as-judge, quality metrics

### Tasks

1. **Golden evaluation set** — `data/eval/golden-set.json` with 20-30 Q&A pairs
2. **Evaluation runner** — `scripts/eval.ts` runs questions through full pipeline
3. **Metrics** — factual accuracy, persona adherence, groundedness, LLM-as-judge (1-5), latency
4. **Report generation** — markdown report saved to `data/eval/reports/`

### Success Criteria

- [ ] Golden set covers all major question categories
- [ ] Eval runner produces reproducible results
- [ ] LLM-as-judge works with a free model
- [ ] Baseline accuracy established

---

## Phase 6: Production & Deployment

**Duration**: ~3-5 days
**AI Engineer Skills**: Deployment, monitoring, cost management, security

This phase incorporates the remaining original planned features.

### Tasks

1. **Error retry with exponential backoff** *(originally planned)*
   - Retry failed OpenRouter calls with jitter
   - Max 3 retries before showing error to user

2. **Rate limiting awareness** *(originally planned)*
   - Detect 429 responses from OpenRouter
   - Show user-friendly "slow down" message
   - Server-side: 10 req/min per IP

3. **Environment config** — dev/production toggle (`PORTFOLIO_MODE`)
4. **Error hardening** — fallback when OpenRouter is down
5. **SEO & meta tags** — OG tags, dynamic title
6. **Deploy** — Vercel free tier (when ready)
7. **Monitoring** — request count, avg latency, error rate

### Success Criteria

- [ ] Error retry works with exponential backoff
- [ ] Rate limiting prevents abuse and handles 429s gracefully
- [ ] App deploys without errors
- [ ] Fallback works when LLM is unavailable
- [ ] No API keys exposed in client bundle

---

## Target Directory Structure

```
a-g-i/
├── data/
│   ├── profile/              # Personal data (markdown)
│   │   ├── about.md
│   │   ├── experience.md
│   │   ├── skills.md
│   │   ├── projects.md
│   │   ├── education.md
│   │   └── contact.md
│   ├── eval/                 # Evaluation data
│   │   ├── golden-set.json
│   │   └── reports/
│   └── vectors/              # Pre-computed vector index (gitignored)
├── scripts/
│   ├── ingest.ts             # Rebuild vector index
│   └── eval.ts               # Run evaluation suite
├── src/
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── ThemeToggle.tsx
│   │   ├── ChatMessage.tsx       # [Phase 4] Rich message renderer
│   │   ├── SuggestedQuestions.tsx # [Phase 1] Starter questions
│   │   ├── LandingView.tsx       # [Phase 4] Empty state
│   │   ├── SkillsBadges.tsx      # [Phase 3] Structured skills
│   │   ├── ProjectCard.tsx       # [Phase 3] Project cards
│   │   └── Timeline.tsx          # [Phase 3] Experience timeline
│   ├── routes/
│   │   ├── __root.tsx
│   │   └── index.tsx
│   ├── utils/
│   │   ├── chat.functions.ts     # Enhanced with system prompt + RAG
│   │   ├── chat.types.ts
│   │   ├── system-prompt.ts      # [Phase 1] Persona builder
│   │   ├── rag/
│   │   │   ├── ingest.ts         # [Phase 2] Chunking + embedding
│   │   │   ├── retrieve.ts       # [Phase 2] Vector search
│   │   │   ├── embeddings.ts     # [Phase 2] Embedding abstraction
│   │   │   └── store.ts          # [Phase 2] Vector store interface
│   │   └── tools/
│   │       ├── schemas.ts        # [Phase 3] Tool definitions (Zod)
│   │       ├── router.ts         # [Phase 3] Tool call handler
│   │       ├── github.ts         # [Phase 3] GitHub API tool
│   │       └── profile.ts        # [Phase 3] Profile data tools
│   └── styles.css
├── .env
├── .env.example
└── package.json
```

---

## Skills Progression

| Phase | Skills Learned | AI Engineer Roadmap Stage |
|---|---|---|
| 1 | Prompt engineering, system prompt design, persona crafting | Step 3: AI & LLM Fundamentals |
| 2 | Embeddings, vector DBs, chunking, semantic search, RAG | Step 4: RAG Systems |
| 3 | Function calling, structured outputs, tool design | Step 5: AI Agents |
| 4 | Streaming, production UX, context management | Step 6: Production AI |
| 5 | LLM evaluation, golden sets, LLM-as-judge | Step 6: Production AI |
| 6 | Deployment, monitoring, rate limiting, cost mgmt | Step 6: Production AI |

---

## Timeline

| Phase | Duration | Cumulative |
|---|---|---|
| Phase 1: Persona & System Prompt | 3-4 days | Week 1 |
| Phase 2: RAG Pipeline | 1-2 weeks | Week 2-3 |
| Phase 3: Structured Outputs & Tools | 1 week | Week 4 |
| Phase 4: Streaming & UX Polish | 1 week | Week 5 |
| Phase 5: Evaluation & Quality | 3-5 days | Week 6 |
| Phase 6: Production & Deployment | 3-5 days | Week 6-7 |

**Total: ~6-7 weeks** | **Total cost: $0**
