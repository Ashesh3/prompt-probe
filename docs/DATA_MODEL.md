# Data Model

## Entities

### PromptProject

Represents a named prompt workspace.

Fields:

- `id`
- `name`
- `description`
- `createdAt`
- `updatedAt`

### PromptVersion

Immutable snapshot of prompt text and settings at a point in time.

Fields:

- `id`
- `projectId`
- `versionNumber`
- `name`
- `content`
- `contentHash`
- `changeSummary`
- `createdAt`
- `createdBy`

### Run

A test matrix execution.

Fields:

- `id`
- `projectId`
- `promptVersionId`
- `status`
- `settingsJson`
- `selectedModelsJson`
- `startedAt`
- `finishedAt`
- `notes`

Status values:

- `queued`
- `running`
- `completed`
- `cancelled`
- `failed`

### ModelResult

One model result inside a run.

Fields:

- `id`
- `runId`
- `provider`
- `modelId`
- `status`
- `finishReason`
- `filtered`
- `refused`
- `promptTokens`
- `completionTokens`
- `totalTokens`
- `latencyMs`
- `responseId`
- `requestSummaryJson`
- `rawResponseJson`
- `errorType`
- `errorMessage`
- `createdAt`

Status values:

- `not_run`
- `running`
- `passed`
- `content_filter`
- `refused`
- `error`
- `cancelled`

### ModelPreset

Named reusable model selection.

Fields:

- `id`
- `name`
- `modelsJson`
- `createdAt`
- `updatedAt`

### ProviderConfig

Server-side provider configuration metadata.

Fields:

- `id`
- `provider`
- `displayName`
- `enabled`
- `baseUrl`
- `encryptedSecretRef`
- `createdAt`
- `updatedAt`

Do not store plaintext secrets if avoidable. For local MVP, environment variables are preferred.

### RiskFinding

Prompt risk scanner output associated with a version.

Fields:

- `id`
- `promptVersionId`
- `category`
- `confidence`
- `lineStart`
- `lineEnd`
- `matchedText`
- `explanation`
- `createdAt`

## Relationships

- PromptProject has many PromptVersions.
- PromptProject has many Runs.
- PromptVersion has many Runs.
- Run has many ModelResults.
- PromptVersion has many RiskFindings.

## Retention

Default local retention should keep all runs until the user deletes them.

Add future settings for:

- max run count
- max raw response size
- raw response retention toggle
