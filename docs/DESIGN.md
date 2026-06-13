# Design Specification

## Design Source of Truth

Use Pencil MCP to read and inspect the Pencil.dev design for Prompt Probe before implementing UI. Match the Pencil layout, spacing, visual hierarchy, and component intent.

If Pencil MCP is unavailable, use this file as the fallback design specification.

## Product Feel

Prompt Probe should feel like a serious debugging console for AI engineers: dense, precise, fast, and polished.

Avoid marketing-page composition. The first screen must be the usable app.

## Layout

Use a four-zone application layout:

- Header: app identity, current prompt name, status, primary actions.
- Left sidebar: prompt projects, versions, and recent runs.
- Main center: Monaco prompt editor.
- Right inspector: model selection, run settings, and latest result summary.
- Bottom panel: results matrix, version timeline, diff viewer, or risk inspector tabs.

## Header

Header contents:

- Product name: Prompt Probe
- Current prompt title
- Status pill: Draft, Running, Tested, Has Filter Failures
- Primary button: Run Test
- Secondary buttons: Save Version, Compare, Export

Use compact icon buttons where appropriate. Include tooltips for icon-only actions.

## Prompt Editor

The editor is the key UI.

Required elements:

- Monaco-style editor with line numbers.
- Dark theme by default.
- Search command.
- Token and character estimate.
- Minimap.
- Risk highlights.
- Inline risk badges.
- Prompt section outline.
- Unsaved changes indicator.

Risk badge examples:

- `policy-risk`
- `tool-risk`
- `override-risk`
- `dual-use-risk`
- `role-risk`

The editor must support large prompts without layout jank.

## Left Sidebar

Sections:

- Projects
- Prompt versions
- Recent runs

Each version row:

- Version name or number
- Timestamp
- Filtered model count
- Small status indicator

Actions:

- New prompt
- Duplicate prompt
- Rename
- Restore version

## Right Inspector

Tabs or stacked panels:

- Models
- Settings
- Latest

### Models Panel

- Multi-select list with checkboxes.
- Group by provider/family.
- Show model ID, provider, context window, and latest result.
- Actions: Select all, Clear, Save preset.

### Settings Panel

- User message input.
- Max tokens numeric input.
- Temperature input.
- Streaming toggle.
- Include tools toggle.
- Tool schema size indicator.
- Raw request JSON upload/paste action.

### Latest Panel

- Summary counters: passed, filtered, refused, errored, not run.
- Latest latency range.
- Latest token usage.
- Link to raw details.

## Bottom Panel

Use tabs:

- Results
- Diff
- History
- Risk Inspector
- Raw Payload

### Results Matrix

Columns:

- Model
- Status
- Finish reason
- Filtered
- Prompt tokens
- Completion tokens
- Latency
- Response ID
- Notes

Visual states:

- Pass: green
- Content filter: red
- Refusal/partial: amber
- Error: gray
- Running: blue

Rows expand to show:

- Raw response
- Request summary
- Filter metadata
- Suspect lines

### Diff View

- Split pane.
- Old version left.
- New version right.
- Additions green.
- Deletions red.
- Risky changed phrases highlighted.
- Result deltas shown above or beside diff.

### History

Timeline list:

- Version number
- Timestamp
- Author/local user
- Models tested
- Filtered count
- Change summary
- Hash-like short ID

### Risk Inspector

List risk findings with:

- Category
- Confidence
- Line references
- Matched phrase
- Explanation

## Visual Style

- Dark mode primary.
- Light mode optional.
- Neutral background with restrained accent colors.
- Crisp borders.
- 8px or smaller radius unless component library defaults require otherwise.
- No decorative blobs, bokeh, or oversized gradients.
- Use compact cards only for repeated items and panels.
- No card-inside-card layouts.

## Responsive Behavior

Desktop:

- Full multi-pane layout.

Tablet:

- Sidebar collapses.
- Right inspector can become a drawer.

Mobile:

- Editor first.
- Models/settings/results accessible via tabs or drawers.
- Tables become stacked result cards.

All text must fit inside containers at supported viewport sizes.
