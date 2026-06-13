# Implementation Plan

## Phase 1: Project Setup

- Initialize Next.js App Router with TypeScript.
- Add Tailwind CSS.
- Add shadcn/ui or equivalent components.
- Add Monaco Editor.
- Add SQLite ORM.
- Add lint, typecheck, and test scripts.

## Phase 2: Static App Shell

- Implement header.
- Implement sidebar.
- Implement editor panel.
- Implement right inspector.
- Implement bottom tab panel.
- Match Pencil MCP designs.

## Phase 3: Prompt Editing

- Integrate Monaco.
- Add line numbers, minimap, search, and dark theme.
- Add token/character estimate.
- Add risk phrase highlights.
- Add draft persistence.

## Phase 4: Mock Test Runs

- Add model catalog.
- Add model selector.
- Add run settings.
- Implement mock provider.
- Implement results matrix.

## Phase 5: Persistence

- Add database schema.
- Persist prompt projects.
- Persist prompt versions.
- Persist runs and model results.
- Implement version timeline.

## Phase 6: Diff And Risk

- Add side-by-side diff viewer.
- Add result delta summaries.
- Add deterministic risk inspector.
- Link findings to editor lines.

## Phase 7: Real Providers

- Add provider adapter interface.
- Add configured providers incrementally.
- Keep credentials server-side.
- Normalize responses.
- Add opt-in live tests.

## Phase 8: Polish And Verification

- Responsive layout.
- Keyboard navigation.
- Loading states.
- Error states.
- Playwright workflow tests.
- Browser screenshot verification.
