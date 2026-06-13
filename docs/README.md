# Prompt Probe

Prompt Probe is a Next.js web app for testing system prompts against multiple LLM models and tracking content-filter behavior across prompt revisions.

The app is a developer tool, not a landing page. Users paste or edit a system prompt, select models, run tests, inspect filtered results, and compare prompt versions over time.

## Primary Workflow

1. Paste or edit a system prompt in a Monaco-style editor.
2. Select one or more models to test.
3. Configure a default user message, max tokens, temperature, streaming, and optional tool schemas.
4. Run the test matrix.
5. Review per-model results, including `finish_reason`, filter status, token usage, latency, response ID, and raw payload details.
6. Save every run as a versioned snapshot.
7. Compare prompt versions with a side-by-side diff and result deltas.

## Required Stack

- Next.js App Router
- TypeScript
- React
- Tailwind CSS
- shadcn/ui or equivalent accessible component primitives
- Monaco Editor for the prompt editor
- SQLite via Prisma or Drizzle for local persistence
- Server-side API routes for model execution

## Design Source

Before implementing UI, use the Pencil MCP integration to read the Pencil.dev designs for this project. Treat Pencil as the source of truth for visual layout, component sizing, spacing, and interaction patterns.

If the Pencil MCP design is unavailable, follow [DESIGN.md](./DESIGN.md) as the fallback design contract.

## Documentation

- [REQUIREMENTS.md](./REQUIREMENTS.md): product requirements and acceptance criteria
- [DESIGN.md](./DESIGN.md): UI and UX specification
- [ARCHITECTURE.md](./ARCHITECTURE.md): technical architecture
- [FEATURES.md](./FEATURES.md): feature breakdown
- [DATA_MODEL.md](./DATA_MODEL.md): persistence model
- [API.md](./API.md): app API contracts
- [TESTING.md](./TESTING.md): test strategy
- [SECURITY.md](./SECURITY.md): token and request safety requirements
- [AGENTS.md](./AGENTS.md): instructions for AI coding agents

## Development Commands

The implementation agent should initialize the app with Next.js and then keep these commands current:

```bash
npm run dev
npm run build
npm run lint
npm run test
```

Use the package manager selected during project setup consistently across the repo.
