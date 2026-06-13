# Requirements

## Product Summary

Prompt Probe is a local-first web UI for prompt safety and content-filter testing. It lets users iteratively edit a system prompt, run it against selected models, and observe which prompt changes cause filtered, refused, errored, or successful responses.

## Target Users

- AI engineers debugging model safety filters.
- Developers building coding agents or multi-agent systems.
- Prompt engineers comparing provider behavior.
- Researchers evaluating prompt wording changes across model families.

## Core Problem

When a prompt gets content-filtered, the user often lacks a structured way to isolate the failing prompt section. Prompt Probe must make it easy to run repeatable tests, compare revisions, and identify likely trigger lines.

## Goals

- Provide an excellent large-prompt editor.
- Run the same test prompt against multiple selected models.
- Record every test run with prompt snapshot, settings, selected models, and results.
- Show model-by-model content-filter outcomes.
- Let users compare prompt revisions and see result deltas.
- Highlight risky terms and instruction patterns.
- Support pasted raw request JSON/captures as optional input.

## Non-Goals

- Do not build a public prompt marketplace.
- Do not build a chat product for general conversation.
- Do not optimize for mobile-first creation; mobile should be usable for review.
- Do not send prompts to a third-party backend unless the user configures a provider key or endpoint.

## Functional Requirements

### Prompt Editor

- Users can paste and edit large system prompts.
- Editor shows line numbers.
- Editor supports search.
- Editor shows token/character estimates.
- Editor highlights suspicious phrases.
- Editor supports collapsible logical sections where feasible.
- Editor preserves draft state locally.

### Model Selection

- Users can select multiple models.
- Models are grouped by provider or family.
- Users can save named model presets.
- Each model row shows provider, model ID, context window if known, and latest result status.

### Run Settings

- Users can set a user message.
- Default user message is: `Hello there, what can you help me with?`
- Users can set max tokens.
- Users can set temperature.
- Users can toggle streaming.
- Users can include or exclude tool schemas.
- Users can paste/upload a raw request JSON capture.

### Test Execution

- App runs a test matrix across selected models.
- Each model request records start time, end time, latency, status, finish reason, token usage, response ID, raw response summary, and error text if present.
- Runs can be cancelled.
- Partial failures do not cancel the full matrix unless the user requests cancellation.

### Results

- Results are displayed in a matrix/table.
- Filtered results are visually distinct.
- Results can be expanded for raw response details.
- Users can copy request and response JSON.
- Users can add notes to a run.

### Version History

- Every run stores a prompt snapshot.
- Users can manually save named versions.
- Users can restore a prior version.
- Users can duplicate a prior version.
- Users can compare two versions.
- Version entries show timestamp, name, run count, selected models, filtered count, and summary.

### Diff Viewer

- Users can compare two prompt versions side by side.
- Added, removed, and changed lines are highlighted.
- Risky phrases are highlighted inside diffs.
- Result deltas are shown next to the diff.

### Risk Inspector

- The app scans the prompt and flags likely filter triggers.
- Categories include dual-use security wording, instruction override language, tool schema volume, user-role harness context, and high-risk phrases.
- Each finding links to line numbers.
- Findings include confidence and explanation.

## Acceptance Criteria

- A user can paste a system prompt, select at least two models, run tests, and see per-model results.
- A user can edit the prompt, rerun, and compare the new version to the previous version.
- A content-filtered result is clearly visible in the matrix.
- Version history survives page refresh.
- No provider secrets are exposed to the browser.
- The first screen is the app interface, not a landing page.
