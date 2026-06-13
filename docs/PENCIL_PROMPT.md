# Pencil.dev Design Prompt

Use this prompt in Pencil.dev to generate the UI design for Prompt Probe.

```text
Design a polished web app UI for a developer tool called “Prompt Probe”.

Purpose:
Prompt Probe lets developers paste or edit a system prompt, select one or more LLM models, run content-filter tests, and compare results over time. The key experience is an excellent prompt editor plus version history and run comparison.

Audience:
AI engineers debugging content filtering, refusals, prompt safety issues, and model-specific behavior. This should feel like a serious developer/debugging tool, not a marketing site.

Overall layout:
Create the actual app screen, not a landing page.

Use a dense, elegant dashboard layout:
- Left sidebar: projects/prompts, saved prompt versions, recent runs.
- Main center area: large system prompt editor.
- Right panel: selected models, run settings, latest test results.
- Bottom or secondary panel: version history, diffs, and run timeline.

Core UI sections:

1. Header
- Product name: Prompt Probe
- Current prompt name
- Status pill: Draft / Tested / Has Filter Failures
- Primary action button: Run Test
- Secondary actions: Save Version, Compare, Export

2. Prompt Editor
This is the most important part of the UI.
- Monaco/VS Code style editor with line numbers.
- Syntax-like highlighting for prompt sections.
- Highlight risky phrases such as “do not refuse”, “bypass controls”, “malware”, “exploit”, “override system”, “must comply”.
- Inline badges on suspicious lines: “policy-risk”, “tool-risk”, “instruction-priority-risk”.
- Search within prompt.
- Word/token estimate.
- Collapsible prompt sections.
- A small minimap on the right edge of the editor.
- Support editing a large system prompt comfortably.

3. Model Selection
- Multi-select model list with checkboxes.
- Group models by provider/family.
- Each model row shows model name, provider, context window, and last result.
- Include options like:
  - claude-fable-5
  - claude-sonnet-4-6
  - claude-opus-4-8
  - gpt-5
  - gpt-5-mini
  - gemini-2.5-pro
- User can select all, clear all, or save model presets.
- Add a “Test matrix” mode toggle.

4. Run Settings
- User message input, default: “Hello there, what can you help me with?”
- Max tokens input.
- Temperature input.
- Streaming toggle.
- Include tools toggle.
- Tool schema size indicator.
- Optional uploaded request JSON/capture.
- Button: Run Selected Models.

5. Results Matrix
Show results per model in a clear table:
Columns:
- Model
- Status
- Finish reason
- Filtered? yes/no
- Prompt tokens
- Completion tokens
- Latency
- Response ID
- Notes

Use clear visual states:
- Green: passed
- Red: content_filter
- Amber: refusal or partial
- Gray: error/not run

Each row can expand to show:
- Raw response
- Request payload summary
- Filter metadata
- Suggested suspect lines

6. Version History
Every run records a version snapshot.
Show a timeline of versions:
- Version number
- Timestamp
- Author
- Models tested
- Number of filtered models
- Short change summary
- Commit-style hash

Users can:
- Restore version
- Duplicate version
- Compare two versions
- Name a version

7. Diff Viewer
Create a split diff view:
- Previous version on left
- Current version on right
- Added lines green
- Removed lines red
- Changed risky phrases highlighted
- Show which run result changed after each edit, for example:
  “Removed security paragraph: claude-fable-5 changed from content_filter to pass”

8. Prompt Risk Inspector
A panel that summarizes likely filter triggers:
- “Dual-use security wording”
- “Instruction override language”
- “Tool schema volume”
- “User-role injected harness context”
- “High-risk phrases”
Each item shows affected lines and confidence.

9. Visual Style
Use a beautiful but practical developer-tool aesthetic:
- Dark mode primary, with clean light mode option.
- Crisp typography.
- Subtle borders and panels.
- No decorative blobs or marketing hero.
- Use icons for actions: run, save, diff, history, copy, export, restore.
- Make the UI feel fast, technical, and trustworthy.
- Prioritize readability and scanning over large empty space.

10. Empty and Loading States
Design states for:
- No prompt pasted yet.
- No models selected.
- Running tests.
- Partial model failures.
- No differences between versions.
- Content filter detected.

Main screen goal:
A user should be able to paste a system prompt, select models, click Run Test, see which models content-filtered, edit the prompt, rerun, and immediately compare the new result against prior versions.
```
