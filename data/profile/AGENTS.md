# Profile Data

This directory contains the factual information about Abdurachman Ghifary (Agi) that powers the A.G.I chatbot.

## Files

| File | Content |
|------|---------|
| `persona.md` | A.G.I's character instructions (tone, speech patterns, boundaries) |
| `about.md` | Bio, personality notes |
| `experience.md` | Work history with achievements |
| `skills.md` | Tech stack breakdown |
| `projects.md` | Notable projects with outcomes |
| `education.md` | Degrees, certifications |
| `contact.md` | Email, social links, availability |

## Writing Style Guide

### DO
- **Third person**: "Agi built..." not "I built..."
- **Quantify achievements**: numbers, percentages, outcomes
- **Be factual**: dates, technologies, concrete results
- **Include years of experience**: helps A.G.I answer "how long" questions
- **Keep sections to 200-300 words**: optimal for RAG chunking in Phase 2

### DON'T
- **Don't be funny**: A.G.I handles the sarcasm. Profile data should be neutral.
- **Don't exaggerate**: "Improved performance by 40%" is fine. "Revolutionized the industry" is not.
- **Don't use first person**: These are facts, not your voice.
- **Don't add emojis or flair**: Save that for the chatbot.

### Example

**Good:**
```
## Senior Frontend Engineer — TechCorp

- Led migration from jQuery to React + TypeScript
- Reduced bundle size by 40% through code splitting
- Mentored 3 junior developers
```

**Bad:**
```
## Code Ninja — AwesomeTech

- Revolutionized the frontend with mind-blowing React magic
- I'm a wizard at TypeScript and I love shipping code
```

## When A.G.I Uses This Data

A.G.I reads these files on every chat request (server-side only). It grounds its answers in this data while adding its own sarcastic, clinically detached persona on top.

**Example flow:**

1. User asks: "What's Agi's tech stack?"
2. A.G.I reads `skills.md`
3. A.G.I responds: *"Oh, you want the technical specifications. Test results indicate my human specializes in React, TypeScript, and the TanStack ecosystem. Secondary capabilities include Node.js and PostgreSQL. The full dataset is... extensive."*

## Updates

When you update any profile file:
1. Rebuild the app (`pnpm build`) — files are embedded at build time
2. Run the eval checklist (`data/eval/persona-eval.md`) to verify persona still holds
3. Deploy

## Phase 2: RAG

In Phase 2, these `##` sections become vector search chunks. The heading structure matters:
- `#` = File title
- `##` = Major section (RAG chunk boundary)
- `###` = Subsection
