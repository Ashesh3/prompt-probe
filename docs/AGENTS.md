# AGENTS.md

## Mission

Build Prompt Probe from scratch as a Next.js application. The app helps developers test system prompts against selected LLM models, identify content-filter triggers, and compare prompt revisions.

## First Steps

1. Use Pencil MCP to read the project designs before writing UI code.
2. Initialize a Next.js App Router project in this directory.
3. Use TypeScript throughout.
4. Implement the real app UI as the first screen. Do not create a marketing landing page.
5. Keep all documentation in this directory up to date when implementation decisions change.

## Required Technology

- Next.js App Router
- TypeScript
- React Server Components where appropriate
- Tailwind CSS
- shadcn/ui or similarly accessible primitives
- Monaco Editor
- SQLite persistence with Prisma or Drizzle
- Server-side routes for provider/model calls

## Design Requirements

- Read Pencil MCP designs and implement them closely.
- If Pencil MCP is unavailable, implement from [DESIGN.md](./DESIGN.md).
- The editor is the core product surface.
- Use a dense, polished developer-tool layout.
- Do not make a landing page.
- Do not use decorative gradient blobs, oversized hero sections, or marketing cards.
- Make all main workflows usable from the first screen.

## Development Commands

After initialization, provide and maintain these commands:

```bash
npm run dev
npm run build
npm run lint
npm run test
```

If using `pnpm`, `bun`, or `yarn`, update this section and the README consistently.

## Code Style

- Strict TypeScript.
- Avoid `any`; define explicit interfaces.
- Prefer small, focused components.
- Keep server-only model/token logic out of client components.
- Store secrets only server-side.
- Use accessible components and keyboard-friendly controls.

## Implementation Order

1. Project setup and base shell.
2. Prompt editor page with Monaco.
3. Model selection and run settings.
4. Test execution API with mocked provider adapter first.
5. Results matrix.
6. Version history.
7. Diff viewer.
8. Risk inspector.
9. Real provider adapters.
10. Tests and polish.

## Verification

Before calling work complete:

- Run lint.
- Run typecheck.
- Run tests.
- Start the dev server.
- Use browser automation to verify the main workflow at desktop and mobile widths.
- Confirm text does not overflow buttons, cards, sidebars, or tables.
