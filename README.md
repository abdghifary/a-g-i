# A.G.I — AI-Powered Digital Portfolio

> _"I'm not just another AI assistant. I'm A.G.I — Abdurachman Ghifary's digitalized counterpart. Ask me about his skills, projects, or why he still uses NeoVim in [current year]."_

A.G.I is an AI-powered digital portfolio that functions as a chatbot — a "digitalized version" of the owner. Visitors interact with an AI persona (think Fallout terminal robot meets Portal 2 GLaDOS: casual, goofy, sarcastic, clinically detached) that answers questions about experience, skills, and projects, grounded in real data via Retrieval-Augmented Generation (RAG).

**Live Demo**: _Coming soon_  
**Contact**: [abdghifary@gmail.com](mailto:abdghifary@gmail.com)

---

## The Concept

Traditional portfolios are static. A.G.I makes yours conversational.

Instead of scrolling through bullet points, visitors **chat** with an AI that embodies your professional identity. It knows your work history, tech stack, project outcomes, and education — and delivers them with personality.

- **Professional first**: Skills, projects, work history, education
- **Personality-driven**: Sarcastic, superior, reluctantly helpful
- **Grounded in reality**: All answers come from real profile data, not hallucinations
- **Zero-cost AI**: Runs entirely on free OpenRouter models (no paid APIs, no GPU)

---

## Features

| Feature                      | Status  | Notes                                                       |
| ---------------------------- | ------- | ----------------------------------------------------------- |
| **AI Chat Interface**        | Active  | Terminal-inspired UI with WebTUI + Catppuccin Mocha theme   |
| **Persona-Driven Responses** | Active  | Fallout/GLaDOS-style AI persona via system prompt           |
| **Profile Data RAG**         | Phase 2 | Semantic search over markdown profile files                 |
| **Multi-Model Fallback**     | Active  | 3-model server-side fallback chain (free models)            |
| **Jailbreak Detection**      | Phase 1 | Server-side pattern filter + prompt-level defenses          |
| **Theme Toggle**             | Active  | Light / Dark / Auto with FOUC prevention                    |
| **Static Pages**             | Active  | Bio, Experience, Projects, Contact as traditional pages     |
| **Streaming Responses**      | Phase 4 | Real-time token streaming (planned)                         |
| **Structured Tool Output**   | Phase 3 | Skills badges, project cards, timeline components (planned) |
| **Evaluation Suite**         | Phase 5 | Golden set + LLM-as-judge quality metrics (planned)         |

---

## Tech Stack

| Layer               | Technology                                                                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Framework**       | [TanStack Start](https://tanstack.com/start) (React SSR) + [TanStack Router](https://tanstack.com/router)                                  |
| **State & Data**    | [TanStack Query](https://tanstack.com/query)                                                                                               |
| **Styling**         | [WebTUI](https://webtui.ink/) + [Tailwind CSS v4](https://tailwindcss.com/) + [Catppuccin Mocha](https://github.com/catppuccin/catppuccin) |
| **AI / LLM**        | [OpenRouter](https://openrouter.ai/) via `@openrouter/sdk`                                                                                 |
| **Vector DB**       | [Orama](https://orama.com/) (planned, Phase 2)                                                                                             |
| **Build Tool**      | [Vite 8](https://vitejs.dev/)                                                                                                              |
| **Testing**         | [Vitest](https://vitest.dev/) + [Testing Library](https://testing-library.com/)                                                            |
| **Package Manager** | [pnpm](https://pnpm.io/)                                                                                                                   |
| **TypeScript**      | Strict mode, ESM-only                                                                                                                      |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 22+ (LTS recommended)
- [pnpm](https://pnpm.io/installation) 10+
- [OpenRouter API key](https://openrouter.ai/settings/keys) (free tier works)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/a-g-i.git
cd a-g-i

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env and add your OPENROUTER_API_KEY
```

### Environment Variables

| Variable             | Required | Description                                                           |
| -------------------- | -------- | --------------------------------------------------------------------- |
| `OPENROUTER_API_KEY` | **Yes**  | Your OpenRouter API key                                               |
| `APP_URL`            | No       | App URL for OpenRouter attribution (default: `http://localhost:3000`) |

### Development

```bash
# Start the dev server
pnpm dev
# → http://localhost:3000

# Run tests
pnpm test

# Lint
pnpm lint

# Production build
pnpm build

# Preview production build
pnpm preview
```

> **Note**: If `@openrouter/sdk` build scripts need approval, run `pnpm approve-builds`.

---

## Project Structure

```
a-g-i/
├── data/
│   └── profile/                  # Profile data + persona instructions (markdown)
│       ├── persona.md            # AI persona: tone, scope, examples
│       ├── about.md              # Bio, personality notes
│       ├── experience.md         # Work history with achievements
│       ├── skills.md             # Tech stack breakdown
│       ├── projects.md           # Notable projects with outcomes
│       ├── education.md          # Education background
│       └── contact.md            # Contact info, social links
├── docs/
│   ├── architecture.md           # Stack, conventions, code map
│   ├── roadmap.md                # 6-phase development plan
│   └── adr/                      # Architecture Decision Records
├── src/
│   ├── components/               # Shared UI (Header, Footer, ThemeToggle)
│   ├── integrations/
│   │   └── tanstack-query/       # Query provider + devtools
│   ├── routes/
│   │   ├── __root.tsx            # Root layout (HTML shell, theme init)
│   │   ├── index.tsx             # Chat interface (main page)
│   │   ├── about.tsx             # About page
│   │   └── demo/                 # Demo routes (deletable)
│   ├── utils/
│   │   ├── chat.functions.ts     # Server functions (OpenRouter calls) — SERVER ONLY
│   │   ├── chat.types.ts         # Shared types and model definitions
│   │   └── system-prompt.ts      # System prompt builder — SERVER ONLY
│   ├── router.tsx                # Router config with Query integration
│   └── styles.css                # WebTUI + Tailwind styles (layer order critical!)
├── .env.example
├── package.json
└── README.md
```

---

## Architecture Overview

### Hybrid: Pages + AI Companion

```
User Journey:
├─ Landing (index.tsx) ──► AI Chat (primary interface)
│                           └─ Deep-dive questions (RAG details)
├─ /about ──► Static page (primary info)
├─ /experience ──► Static page (primary info)
├─ /projects ──► Static page (primary info)
└─ /contact ──► Static page (primary info)
```

- **Traditional pages** contain basic information (resume-style fallback)
- **AI chat** explains details NOT on pages (project war stories, behind-the-scenes, nuance)
- **Boot sequence**: User-initiated startup via "Boot A.G.I" button with terminal animation

### Security Model

| Asset                | Protection                                                              |
| -------------------- | ----------------------------------------------------------------------- |
| `OPENROUTER_API_KEY` | Server functions only (`process.env`)                                   |
| System prompt        | Assembled server-side, never exposed to browser                         |
| Profile data         | Build-time embedding via `import.meta.glob`, server bundle only         |
| Client messages      | `role: 'user' \| 'assistant'` only — `system` role rejected server-side |

---

## Roadmap

| Phase | Focus                         | Status      |
| ----- | ----------------------------- | ----------- |
| **1** | Persona & System Prompt       | In Progress |
| **2** | RAG Pipeline (Local, Free)    | Planned     |
| **3** | Structured Outputs & Tool Use | Planned     |
| **4** | Streaming & UX Polish         | Planned     |
| **5** | Evaluation & Quality          | Planned     |
| **6** | Production & Deployment       | Planned     |

See [`docs/roadmap.md`](docs/roadmap.md) for the full 6-phase plan with architecture diagrams and detailed task breakdowns.

---

## Persona

A.G.I's character is **not** a generic AI assistant. It is:

- **Tone**: Sarcastic, clinically detached, reluctantly helpful, superior
- **Vibe**: Portal 2 GLaDOS meets Fallout terminal robot
- **Scope**: Professional first (skills, projects, work history). Personal interests secondary.
- **Speech patterns**: Science framing, system brackets, dry humor

Example interaction:

> **User**: "What projects have you worked on?"  
> **A.G.I**: "_sigh_... INITIATING PROJECT DATABASE SCAN. Stand by, human."

Persona instructions live in [`data/profile/persona.md`](data/profile/persona.md).

---

## Development Guidelines

### Critical Rules

- **NEVER** expose `OPENROUTER_API_KEY` to client code — all LLM calls go through `createServerFn`
- **NEVER** import from `@openrouter/sdk` in client components — server functions only
- **NEVER** suppress type errors with `as any`, `@ts-ignore`, or `@ts-expect-error`
- **ALWAYS** run `pnpm test && pnpm lint` before committing
- **ALWAYS** place Tailwind imports AFTER WebTUI imports in `src/styles.css`

### Naming Conventions

| Context                | Format  | Example                       |
| ---------------------- | ------- | ----------------------------- |
| GitHub repo / folder   | `a-g-i` | `github.com/user/a-g-i`       |
| Display / UI title     | `A.G.I` | `<title>A.G.I</title>`        |
| Code variables / types | `AGI`   | `AGIBootButton`, `AGIMessage` |
| Package.json name      | `a-g-i` | `"name": "a-g-i"`             |

### Code Style

- Path aliases: `#/*` maps to `./src/*`
- Strict TypeScript: `strict: true`, `noUnusedLocals`, `noUnusedParameters`
- ESM-only: `"type": "module"` in package.json
- Component style: Default exports for components, named exports for utilities/types

### WebTUI Gotchas

- WebTUI attributes in React use trailing dash: `box-="square"` not `box="square"`
- WebTUI CSS layer declaration (`@layer base, utils, components;`) must come BEFORE any `@import`
- Tailwind imports must come AFTER WebTUI imports in `src/styles.css`

---

## Architecture Decisions

Key technical decisions are documented as Architecture Decision Records (ADRs) in `docs/adr/`:

| ADR                                                       | Topic                                                   |
| --------------------------------------------------------- | ------------------------------------------------------- |
| [ADR-0001](docs/adr/0001-profile-data-loading.md)         | Profile data loading via `import.meta.glob('?raw')`     |
| [ADR-0002](docs/adr/0002-system-prompt-injection.md)      | Server-side only system prompt injection                |
| [ADR-0003](docs/adr/0003-persona-instruction-source.md)   | Persona instruction source in `data/profile/persona.md` |
| [ADR-0004](docs/adr/0004-jailbreak-detection.md)          | Jailbreak detection strategy                            |
| [ADR-0005](docs/adr/0005-ai-crafted-greeting.md)          | AI-crafted greeting & boot UX                           |
| [ADR-0006](docs/adr/0006-system-prompt-assembly.md)       | System prompt assembly order                            |
| [ADR-0007](docs/adr/0007-server-side-model-management.md) | Server-side model fallback chain                        |

---

## Learning Goals

This project serves as a hands-on learning vehicle for the **Frontend → AI Engineer** transition:

| Phase | Skills Learned                                               |
| ----- | ------------------------------------------------------------ |
| **1** | Prompt engineering, system prompt design, persona crafting   |
| **2** | Embeddings, vector databases, chunking, semantic search, RAG |
| **3** | Function calling, structured outputs, tool design            |
| **4** | Streaming, production UX, context management                 |
| **5** | LLM evaluation, golden sets, LLM-as-judge                    |
| **6** | Deployment, monitoring, rate limiting, cost management       |

---

## License

MIT © Abdurachman Ghifary

---

<p align="center">
  <em>Built with <a href="https://tanstack.com/start">TanStack Start</a>, powered by <a href="https://openrouter.ai">OpenRouter</a>, styled with <a href="https://webtui.ink">WebTUI</a>.</em>
</p>
