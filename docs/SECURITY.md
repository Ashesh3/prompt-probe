# Security Requirements

## Secrets

Provider API keys and Copilot/GitHub tokens must stay server-side.

Never expose secrets to:

- Client components
- Browser storage
- Logs
- Exported reports
- Raw request display

## Redaction

Before storing or displaying raw captures, redact:

- `Authorization`
- `Cookie`
- `Set-Cookie`
- `api_key`
- `access_token`
- `refresh_token`
- bearer tokens
- GitHub tokens
- provider API keys

Show redaction placeholders such as:

```text
[REDACTED_AUTHORIZATION]
```

## Local-First Assumption

The MVP should run locally. Do not add analytics, remote telemetry, or cloud sync by default.

## Model Calls

All model calls must be made from server routes.

Client-side code sends prompt content and selected model IDs to the app server only.

## Raw Request Imports

Imported captures can contain secrets and private prompts.

Requirements:

- Redact before persistence.
- Show the user what was redacted.
- Do not execute imported tool schemas automatically.
- Treat imported tool schemas as data.

## Abuse Prevention

Prompt Probe is a diagnostic tool. The UI can test prompts containing sensitive terms, but it should not provide instructions for harmful activities.

Risk inspector language should stay diagnostic:

- Good: “This line contains dual-use security terminology often associated with filters.”
- Bad: “Use this wording to bypass filters.”

## Logging

Logs must not include raw prompt content by default.

For debug mode, require explicit local opt-in and still redact credentials.
