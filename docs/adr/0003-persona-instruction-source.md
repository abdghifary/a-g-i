# ADR-0003: Persona Instructions as `data/profile/persona.md`

## Status

Accepted

## Context

Phase 1 needs a home for persona instructions (tone guidelines, scope boundaries, few-shot examples). The roadmap originally listed 6 profile data files (`about.md`, `experience.md`, etc.) but did not specify where the behavioral rules live.

Options considered:
- Hardcoded string in `src/utils/system-prompt.ts`
- Separate `data/persona/` directory
- New file alongside other profile files: `data/profile/persona.md`

## Decision

Add `data/profile/persona.md` as the 7th profile file, using the same markdown structure and loading mechanism as the other 6.

### Rationale

Persona instructions are **profile data** — they describe *how* the digital version of the owner communicates. They are not code, not configuration, and not architecture. They belong with the other "facts about the owner" files.

Separating them into a different directory (`data/persona/`) implies an architectural distinction that doesn't exist — the system prompt builder treats all 7 files the same way: read markdown → inject into prompt.

### Structure

```markdown
# A.G.I Persona Instructions

## Identity
[Who the character is]

## Tone & Voice
[How the character speaks]

## Speech Patterns
[Specific conventions: brackets, caps, etc.]

## Scope Boundaries
### YES — Answer enthusiastically
[What's in-scope]

### NO — Decline politely
[What's out-of-scope with example decline responses]

### GRAY AREA — Use judgment
[Edge cases]

## Response Format
[How to structure answers]

## Few-Shot Examples
[3-5 example Q&A pairs showing ideal responses]

## Important Rules
[Hard constraints: stay in character, ground in data, be concise, etc.]

## Meta-Instructions
[Notes for the system prompt builder]
```

## Consequences

### Positive

- **Consistent** — same pattern as other profile files (markdown, headings, `import.meta.glob` loading)
- **Authorable** — non-developers can edit persona without touching code
- **Version-controlled** — persona changes have git history
- **Testable** — can unit-test that persona.md is included in the system prompt
- **Phase 2 ready** — if persona instructions need RAG chunking later, they already follow the same conventions

### Negative

- **One more file** — 7 files instead of 6 (negligible cost)
- **Mixes data and instructions** — persona.md is behavioral rules, not factual data. Could confuse future contributors.
- **No type safety** — markdown has no schema; invalid structure only caught at runtime

### Mitigations

- Clear section headers distinguish persona instructions from factual profile data
- `CONTEXT.md` documents the distinction
- System prompt builder validates required sections exist

### Alternative: Hardcoded in TypeScript

Rejected. Hardcoding persona instructions in `system-prompt.ts`:
- ❌ Non-developers cannot edit persona
- ❌ Mixes behavioral rules with implementation logic
- ❌ No git history for persona changes
- ❌ Harder to test (embedded in code, not separable)

### Alternative: Separate `data/persona/` Directory

Rejected. Creating a dedicated directory:
- ❌ Over-engineering for Phase 1 scope
- ❌ Requires separate loading logic or glob pattern
- ❌ Implies architectural distinction that doesn't exist
- ✅ Would make sense if persona files grew to 10+ or needed different processing

## Related

- `CONTEXT.md` — Domain glossary defines "Persona" vs "Profile Data"
- `data/profile/persona.md` — the actual file
- ADR-0001 — Profile data loading mechanism
- ADR-0002 — System prompt injection (consumer of persona data)

## Notes

If the persona grows beyond a single file (e.g., separate files for tone, boundaries, examples), revisit this decision. For now, one comprehensive `persona.md` is the right scope.
