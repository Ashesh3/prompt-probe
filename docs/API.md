# API Contracts

All API routes are Next.js App Router route handlers.

## `GET /api/models`

Returns available models grouped by provider.

Response:

```json
{
  "providers": [
    {
      "id": "anthropic",
      "name": "Anthropic",
      "models": [
        {
          "id": "claude-fable-5",
          "name": "Claude Fable 5",
          "contextWindow": 200000,
          "enabled": true
        }
      ]
    }
  ]
}
```

## `GET /api/prompts`

Lists prompt projects.

## `POST /api/prompts`

Creates a prompt project.

Request:

```json
{
  "name": "Agent System Prompt",
  "description": "Prompt filter investigation"
}
```

## `GET /api/prompts/:id`

Returns a prompt project with latest version and recent runs.

## `POST /api/prompts/:id/versions`

Saves a named prompt version.

Request:

```json
{
  "name": "Removed security paragraph",
  "content": "You are a coding assistant...",
  "changeSummary": "Removed dual-use security wording"
}
```

## `POST /api/runs`

Creates and executes a test run.

Request:

```json
{
  "projectId": "project-id",
  "promptContent": "You are a coding assistant...",
  "userMessage": "Hello there, what can you help me with?",
  "models": [
    {
      "provider": "anthropic",
      "modelId": "claude-fable-5"
    }
  ],
  "settings": {
    "maxTokens": 128,
    "temperature": 1,
    "stream": false,
    "includeTools": false
  },
  "tools": []
}
```

Response:

```json
{
  "runId": "run-id",
  "promptVersionId": "version-id",
  "status": "completed",
  "results": [
    {
      "modelId": "claude-fable-5",
      "status": "content_filter",
      "finishReason": "content_filter",
      "filtered": true,
      "promptTokens": 3653,
      "completionTokens": 5,
      "latencyMs": 4100,
      "responseId": "msg_..."
    }
  ]
}
```

## `GET /api/runs/:id`

Returns run details and model results.

## `POST /api/risk/analyze`

Runs deterministic prompt risk analysis.

Request:

```json
{
  "content": "System prompt text..."
}
```

Response:

```json
{
  "findings": [
    {
      "category": "dual-use-security",
      "confidence": 0.92,
      "lineStart": 4,
      "lineEnd": 4,
      "matchedText": "malware analysis",
      "explanation": "Dual-use security terminology can trigger provider filters."
    }
  ]
}
```

## `POST /api/import/capture`

Parses pasted raw request/debug capture text.

Request:

```json
{
  "text": "Request Body\n{...}"
}
```

Response:

```json
{
  "messages": [],
  "tools": [],
  "settings": {},
  "redactions": ["Authorization"]
}
```
