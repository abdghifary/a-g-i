<!-- intent-skills:start -->

## Skill Loading

Before substantial work:

- Skill check: run `pnpm dlx @tanstack/intent@latest list`, or use skills already listed in context.
- Skill guidance: if one local skill clearly matches the task, run `pnpm dlx @tanstack/intent@latest load <package>#<skill>` and follow the returned `SKILL.md`.
- Monorepos: when working across packages, run the skill check from the workspace root and prefer the local skill for the package being changed.
- Multiple matches: prefer the most specific local skill for the package or concern you are changing; load additional skills only when the task spans multiple packages or concerns.
<!-- intent-skills:end -->

# A.G.I

AI-powered digital portfolio — a "digitalized version" of the owner. Visitors chat with an AI persona (Fallout-terminal-robot style: casual, goofy, sarcastic) that answers questions about experience, skills, and projects, grounded in real data via RAG.

Built with TanStack Start (React SSR), TanStack Router, TanStack Query, OpenRouter for LLM calls. Styled with WebTUI + Catppuccin Mocha + Tailwind CSS v4.

**Secondary goal**: Learning vehicle for the Frontend-to-AI-Engineer transition (prompt engineering, RAG, vector DBs, tool use, evaluation).

## Commands

```bash
pnpm install                # Install dependencies
pnpm dev                    # Dev server -> http://localhost:3000
pnpm build                  # Production build (must pass before PR)
pnpm test                   # Run Vitest
pnpm lint                   # ESLint on src/
pnpm approve-builds         # If @openrouter/sdk build scripts need approval
```

## Critical Rules

- **NEVER** expose `OPENROUTER_API_KEY` to client code — all LLM calls go through `createServerFn`
- **NEVER** import from `@openrouter/sdk` in client components — server functions only (`src/utils/chat.functions.ts`)
- **NEVER** suppress type errors with `as any`, `@ts-ignore`, or `@ts-expect-error`
- **ALWAYS** run `pnpm test && pnpm lint` before committing
- **ALWAYS** place Tailwind imports AFTER WebTUI imports in `src/styles.css`

## Constraints

- **$0 budget** — no paid cloud services, no GPU, no paid APIs beyond free tiers
- **Weak local machine** — cannot run Ollama or local LLMs
- **TypeScript-first** — stay in JS/TS ecosystem; Python only if necessary
- **Local-first** — everything works on localhost before considering deployment

## Persona

- **Tone**: Casual, friendly, goofy, sarcastic
- **Vibe**: Fallout terminal robot / retro-futuristic AI assistant
- **Scope**: Professional first (skills, projects, work history). Personal interests secondary.
- **Contact**: abdghifary@gmail.com

## Gotchas

- WebTUI attributes in React use trailing dash: `box-="square"` not `box="square"`
- WebTUI CSS layer declaration (`@layer base, utils, components;`) must come BEFORE any `@import`
- OpenRouter SDK is ESM-only — works fine with TanStack Start's ESM setup
- `@openrouter/sdk` build scripts may need approval: run `pnpm approve-builds` if prompted
- `src/routeTree.gen.ts` uses `as any` — this is auto-generated, not a violation
- Theme init script in `__root.tsx` prevents FOUC — don't remove the `dangerouslySetInnerHTML` block
- `about.tsx` and `demo/tanstack-query.tsx` still use old starter styling (not WebTUI) — will be updated

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Chat UI / main page | `src/routes/index.tsx` | `App` component — messages, input, model selector |
| LLM API calls | `src/utils/chat.functions.ts` | `chatCompletion` server function — **server-side only** |
| Types & models list | `src/utils/chat.types.ts` | `ChatMessage`, `ChatRequest`, `AVAILABLE_MODELS` |
| Root layout / HTML shell | `src/routes/__root.tsx` | Theme init script, WebTUI data attribute, devtools |
| Router config | `src/router.tsx` | SSR query integration, scroll restoration |
| Styling | `src/styles.css` | Layer order critical: WebTUI layers first, then Tailwind |
| Theme toggle | `src/components/ThemeToggle.tsx` | 3-state: light/dark/auto |
| Route tree | `src/routeTree.gen.ts` | Auto-generated — never edit |
| Architecture & conventions | [`docs/architecture.md`](docs/architecture.md) | Stack, structure, decisions, code map, conventions |
| Roadmap / vision | [`docs/roadmap.md`](docs/roadmap.md) | 6-phase plan with architecture diagrams |

## Code Review Graph

This project uses [code-review-graph](https://github.com/tirth8205/code-review-graph) for AI-assisted reviews. For setup, daemon mode, and configuration see [`docs/code-review-graph.md`](docs/code-review-graph.md).

### Usage Patterns

**Before any review or change:**

1. Call `get_minimal_context_tool` for ultra-compact context
2. Call `detect_changes_tool` for risk-scored impact analysis
3. Call `get_review_context_tool` for detailed review context

**For architecture understanding:**

1. Call `get_architecture_overview_tool`
2. Call `list_communities_tool` to see code clusters
3. Call `get_hub_nodes_tool` to find hotspots

**For debugging:**

1. Call `query_graph_tool` with `callers_of` or `callees_of`
2. Call `traverse_graph_tool` for BFS/DFS exploration
3. Call `get_affected_flows_tool` to find impacted execution paths

## Agent skills

### Issue tracker

Local markdown — issues live as files under `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary — all five canonical role strings used as-is. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context — one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
