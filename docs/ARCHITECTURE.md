# Architecture

## Overview

Prompt Probe is a Next.js App Router application with local persistence and server-side model execution.

The browser owns editing and visualization. Server routes own provider credentials, model calls, run persistence, and raw response handling.

## Recommended Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- Monaco Editor
- SQLite
- Prisma or Drizzle
- Zod for request validation
- Vitest or Jest for unit tests
- Playwright for browser tests

## App Structure

Suggested structure:

```text
app/
  layout.tsx
  page.tsx
  api/
    models/route.ts
    runs/route.ts
    runs/[id]/route.ts
    prompts/route.ts
    prompts/[id]/route.ts
components/
  editor/
  layout/
  models/
  results/
  history/
  diff/
  risk/
lib/
  db/
  models/
  providers/
  risk/
  tokens/
  diff/
  validation/
```

## Data Flow

1. User edits prompt in the client.
2. User selects models and settings.
3. Client sends a run request to `POST /api/runs`.
4. Server validates the request.
5. Server creates a run and prompt version snapshot.
6. Server dispatches model calls through provider adapters.
7. Server records each model result.
8. Client receives progress and final results.
9. UI updates matrix, history, risk inspector, and diff panels.

## Provider Adapter Interface

Define a shared provider interface:

```ts
interface ModelProvider {
  id: string
  listModels(): Promise<ModelInfo[]>
  runPrompt(input: ModelRunInput): Promise<ModelRunResult>
}
```

Each provider adapter must normalize:

- status
- finish reason
- content-filter status
- token usage
- latency
- raw request
- raw response
- provider-specific metadata

## Streaming

Initial implementation may use non-streaming requests for simpler persistence.

Streaming support should:

- Track per-model progress.
- Persist final normalized result.
- Capture content-filter finish reasons from stream events.
- Allow cancellation.

## Persistence

Use SQLite for local-first persistence.

Store:

- prompts
- prompt versions
- runs
- model results
- model presets
- provider configurations

See [DATA_MODEL.md](./DATA_MODEL.md).

## Risk Analysis

Risk analysis is deterministic local scanning first.

Initial risk categories:

- Dual-use security wording
- Instruction override language
- Bypass/compliance wording
- Tool schema volume
- User-role injected harness context
- High-risk model terms

The scanner should return line ranges and matched phrases.

## Request Capture Support

Users may paste raw JSON or debug exports.

The parser should:

- Extract a JSON request body from plain JSON.
- Extract a JSON request body from debug text containing `Request Body`.
- Redact credentials before display or persistence.
- Let users choose which fields to import.

## Security Boundary

Provider credentials must never be exposed to client components.

All model calls must happen server-side.

Raw request/response display must redact:

- Authorization headers
- API keys
- cookies
- access tokens
- refresh tokens

## Error Handling

Normalize model execution errors into:

- network_error
- auth_error
- rate_limited
- provider_error
- validation_error
- cancelled
- unknown

Partial failures should not invalidate a full run.
