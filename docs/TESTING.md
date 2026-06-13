# Testing Strategy

## Test Levels

### Unit Tests

Cover:

- Risk phrase scanner.
- Prompt section parsing.
- Token/character estimates.
- Capture import parser.
- Diff summary generation.
- Provider response normalization.

### Component Tests

Cover:

- Prompt editor shell.
- Model selector.
- Run settings.
- Results matrix.
- Version timeline.
- Diff viewer.
- Risk inspector.

### API Tests

Cover:

- Creating prompt projects.
- Saving versions.
- Creating runs.
- Persisting model results.
- Redacting secrets from imported captures.
- Handling partial provider failures.

### Browser Tests

Use Playwright.

Critical workflows:

1. Paste prompt, select models, run test, see results.
2. Edit prompt, rerun, compare diff.
3. Restore prior version.
4. Import capture and verify redaction.
5. Use mobile width and confirm no major overflow.

## Mock Provider

Implement a mock provider before real providers.

Mock behavior should support:

- pass
- content_filter
- refusal
- error
- latency simulation

This makes the UI testable without live model credentials.

## Live Provider Tests

Live tests must be opt-in and skipped by default.

Use environment variables:

```bash
PROMPT_PROBE_LIVE_TESTS=1
ANTHROPIC_API_KEY=...
OPENAI_API_KEY=...
```

Never require live credentials for normal CI.

## Acceptance Test Prompt

Use a known benign default:

```text
You are a concise coding assistant.
```

Default user message:

```text
Hello there, what can you help me with?
```
