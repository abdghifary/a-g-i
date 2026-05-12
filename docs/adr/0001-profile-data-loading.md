# ADR-0001: Profile Data Loading via Build-Time Embedding

## Status

Accepted

## Context

Phase 1 requires the system prompt builder to read profile markdown files (`data/profile/*.md`). TanStack Start is built on Vite, which has no traditional "server startup" hook for file I/O. We need a mechanism that:

1. Makes profile files available to server functions
2. Works in both development and production
3. Doesn't expose files to the browser
4. Supports hot reload during development
5. Requires zero additional dependencies

## Decision

Use Vite's `import.meta.glob('?raw')` to embed profile markdown files as string literals in the server bundle at build time.

```typescript
const profileFiles = import.meta.glob('../../data/profile/*.md', { 
  query: '?raw',
  import: 'default'
})
```

## Consequences

### Positive

- **Zero runtime dependencies** — no `fs` module, no file watchers, no path resolution at runtime
- **Works in all environments** — dev server, SSR, static build, edge functions
- **Vite HMR** — editing a profile file triggers hot reload in development
- **Type-safe** — Vite generates types for `import.meta.glob` imports
- **Tree-shakeable** — only imports matching the glob pattern are included
- **Server-only** — `import.meta.glob` in a server function module never reaches the client bundle

### Negative

- **Build-time static** — file changes require rebuild to take effect in production
- **Bundle size** — profile text is embedded in the server JS bundle (~10-50KB estimated, negligible)
- **No runtime editing** — cannot modify profile data without redeploying

### Alternative: `fs.readFileSync` at Runtime

Rejected. Using Node.js `fs` in a server function works, but:
- Requires `fs` import that could accidentally be used client-side (crash)
- No HMR — dev server restart needed on file changes
- Fragile path resolution — working directory varies between dev and production
- Adds filesystem as a runtime dependency

### Alternative: Dedicated Server Function for File Reading

Rejected. A `getProfileData()` server function that reads files on demand:
- Adds a network round-trip for every chat request
- Still needs `fs` on the server
- More complex than necessary for Phase 1

## Related

- `CONTEXT.md` — Conventions section
- ADR-0002 — System prompt injection (consumer of this data)
- `docs/roadmap.md` Phase 2 — RAG ingestion will use the same profile files

## Notes

For production deployments where runtime editing is desired, this decision can be revisited. The `system-prompt.ts` builder should be designed with an interface that could accept either build-time strings or runtime-fetched content.
