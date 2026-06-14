# Prompt Probe

<img width="1909" height="942" alt="image" src="https://github.com/user-attachments/assets/3efe3ef8-3131-4126-aaf4-05b01c41baac" />
<img width="1901" height="953" alt="image" src="https://github.com/user-attachments/assets/abebcf68-33dc-4b4c-922e-a2ac85c87dd4" />


Prompt Probe is a Next.js developer console for testing system prompts against
multiple LLM models and tracking content-filter behavior across prompt
revisions. It is a dense, dark-mode debugging tool — not a landing page — built
from the specification in [`docs/`](./docs).

Paste or edit a system prompt in a Monaco editor, select models, run a test
matrix, inspect per-model results (`finish_reason`, filter status, token usage,
latency, response ID, redacted raw payloads), and compare prompt versions with a
side-by-side diff and result deltas. A deterministic risk scanner flags wording
commonly associated with provider content filters.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript** (strict)
- **Tailwind CSS v4** + **shadcn/ui** (base-ui primitives)
- **Monaco Editor** (`@monaco-editor/react`) with custom theme, risk decorations, and minimap
- **SQLite** via **Drizzle ORM** + **@libsql/client** (prebuilt binaries — no native build step)
- **Zod** request validation, **Vitest** unit tests
- A deterministic **mock provider** (real adapters are opt-in; see below)

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
```

The first request seeds a default project; the SQLite database is created at
`./prompt-probe.db` (override with `DATABASE_URL`).

## Commands

```bash
npm run dev        # dev server
npm run build      # production build
npm run start      # serve the production build
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
npm run test       # Vitest (96 tests)
```

## How it works

- **Editing & risk** — The Monaco editor highlights risky lines (and marks them
  in the minimap). The risk scanner (`lib/risk`) deterministically flags
  dual-use, instruction-override, bypass, tool-volume, and role-harness wording.
  All risk language is diagnostic, never instructional ([`docs/SECURITY.md`](./docs/SECURITY.md)).
- **Running** — `POST /api/runs` snapshots the prompt as a version, dispatches a
  matrix across selected models through provider adapters, normalizes each
  result, and persists everything. Partial failures never cancel the matrix.
- **Mock provider** — `lib/providers/mock.ts` is fully deterministic: outcomes
  are a pure function of the prompt, model, and settings. Stricter models filter
  at a lower risk threshold, so adding dual-use/override wording filters the
  strict models first — making the version/diff/delta workflow demonstrable
  without any credentials.
- **Security** — Provider calls happen only in server routes. Raw
  request/response payloads are deep-redacted (`lib/redact.ts`) before display or
  persistence; imported captures are redacted before parsing.

### GitHub Copilot (real models)

Click **Connect GitHub Copilot** in the Models panel to sign in via GitHub's
device flow and run prompts against **any Copilot model** your account exposes
(GPT-5, Claude, Gemini, o-series, …). The flow:

1. The app requests a device code from GitHub and shows you a one-time code.
2. You enter it at `github.com/login/device`.
3. The resulting GitHub OAuth token is stored **only in a server-side httpOnly
   cookie** — it never reaches the browser (docs/SECURITY.md). It is exchanged
   server-side for a short-lived Copilot token (cached) on each run.

Copilot models appear as their own group in the Models panel and run for real
through `lib/providers/copilot.ts`; the static Anthropic/OpenAI/Google entries
keep running on the deterministic mock for offline use. Each model is routed to
the surface it actually supports — newer models (gpt-5.x, reasoning/internal
models) are served only via Copilot's `/responses` API, while the rest use
`/chat/completions`; the listing reports `supported_endpoints` per model and
non-chat models (e.g. embeddings) are filtered out. Copilot's content-filter
responses (`finish_reason: content_filter` / content-management 400s) are
surfaced exactly like any other filtered result.

No setup or API keys required — just a GitHub account with Copilot access.

### Other real providers (opt-in)

Direct Anthropic/OpenAI/Google adapters are scaffolded behind `getProvider()`
and disabled by default; gate them on `PROMPT_PROBE_LIVE_TESTS=1` plus the
relevant keys when you wire them in. No live credentials are needed for normal
use or CI.

## Project structure

```text
app/
  api/            # route handlers: models, prompts, runs, risk, import, presets
  layout.tsx      # fonts, theme + tooltip + toast providers
  page.tsx        # renders the client Workspace
components/
  layout/         # header, sidebar, workspace shell
  editor/         # Monaco wrapper, theme, toolbar, risk hook
  inspector/      # models / settings / latest-results cards
  panel/          # results matrix, diff, history, risk inspector, raw payload
  common/         # status & risk badges, panel card, json block, dialogs
  ui/             # shadcn primitives
lib/
  store.ts        # zustand client store (draft persistence, run flow)
  types.ts        # domain types
  models/         # static model catalog
  risk/           # phrase data + deterministic scanner
  tokens/ diff/ import/   # estimation, line diff, capture parser
  providers/      # adapter interface, mock engine, matrix runner, normalization
  db/             # Drizzle schema, libsql client, repository
docs/             # product spec (requirements, design, architecture, …)
```

## Documentation

The original specification lives in [`docs/`](./docs): requirements, design,
architecture, data model, API contracts, testing strategy, and security notes.

## License

[MIT](./LICENSE) © Ashesh
