import type {
  DiffSummary,
  DiffLine,
  DiffOp,
  ResultDelta,
  ModelResultStatus,
  ProviderId,
} from "@/lib/types";
import { lineIsRisky } from "@/lib/risk/phrases";

/**
 * Line-level diff and run-result deltas for Prompt Probe.
 *
 * `diffLines` is a classic LCS line diff: it splits both documents on
 * newlines, finds the longest common subsequence of lines, and emits a
 * stable list of equal / removed / added operations in document order. A
 * changed line surfaces as a removal immediately followed by an addition.
 *
 * Everything here is pure and deterministic — no clocks, no randomness — so
 * the same inputs always yield byte-identical output.
 */

/** Split a document into lines, tolerating both LF and CRLF endings. */
function splitLines(text: string): string[] {
  return text.split(/\r?\n/);
}

/** Compute a classic LCS line diff between two documents. */
export function diffLines(oldText: string, newText: string): DiffSummary {
  const oldLines = splitLines(oldText);
  const newLines = splitLines(newText);
  const m = oldLines.length;
  const n = newLines.length;

  // dp[i][j] = length of the LCS of oldLines[0..i) and newLines[0..j).
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array<number>(n + 1).fill(0),
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack from (m, n), collecting ops in reverse document order. The
  // tie-break favours "add" while walking backwards, which means a changed
  // line emits as remove-then-add once the list is reversed.
  const reversed: Array<{ op: DiffOp; text: string }> = [];
  let i = m;
  let j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      reversed.push({ op: "equal", text: oldLines[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      reversed.push({ op: "add", text: newLines[j - 1] });
      j--;
    } else {
      reversed.push({ op: "remove", text: oldLines[i - 1] });
      i--;
    }
  }

  const lines: DiffLine[] = [];
  let added = 0;
  let removed = 0;
  let unchanged = 0;
  let oldCursor = 1;
  let newCursor = 1;

  for (let k = reversed.length - 1; k >= 0; k--) {
    const { op, text } = reversed[k];
    const risky = lineIsRisky(text);
    if (op === "equal") {
      lines.push({ op, oldLine: oldCursor, newLine: newCursor, text, risky });
      oldCursor++;
      newCursor++;
      unchanged++;
    } else if (op === "remove") {
      lines.push({ op, oldLine: oldCursor, newLine: null, text, risky });
      oldCursor++;
      removed++;
    } else {
      lines.push({ op, oldLine: null, newLine: newCursor, text, risky });
      newCursor++;
      added++;
    }
  }

  return { added, removed, unchanged, lines };
}

interface ModelStatusEntry {
  provider: ProviderId;
  modelId: string;
  status: ModelResultStatus;
}

function deltaKey(provider: ProviderId, modelId: string): string {
  // ProviderId is a closed enum with no ":" character, so the first colon
  // unambiguously separates provider from modelId — no key collisions.
  return `${provider}:${modelId}`;
}

/**
 * Compute per-model status transitions between two runs.
 *
 * The result covers the union of models in `prev` and `next`, keyed by
 * provider + modelId. Models present in `next` come first (in their original
 * order); any models that existed only in `prev` follow. For each model,
 * `from`/`to` are the previous/next status or null when absent, and `changed`
 * is simply `from !== to`. Callers decide which deltas to surface.
 */
export function computeResultDeltas(
  prev: ModelStatusEntry[],
  next: ModelStatusEntry[],
): ResultDelta[] {
  const prevByKey = new Map<string, ModelResultStatus>();
  for (const p of prev) {
    prevByKey.set(deltaKey(p.provider, p.modelId), p.status);
  }

  const deltas: ResultDelta[] = [];
  const seen = new Set<string>();

  for (const nx of next) {
    const key = deltaKey(nx.provider, nx.modelId);
    if (seen.has(key)) continue;
    seen.add(key);
    const fromStatus = prevByKey.get(key);
    const from: ModelResultStatus | null =
      fromStatus === undefined ? null : fromStatus;
    const to = nx.status;
    deltas.push({
      provider: nx.provider,
      modelId: nx.modelId,
      from,
      to,
      changed: from !== to,
    });
  }

  for (const p of prev) {
    const key = deltaKey(p.provider, p.modelId);
    if (seen.has(key)) continue;
    seen.add(key);
    deltas.push({
      provider: p.provider,
      modelId: p.modelId,
      from: p.status,
      to: null,
      changed: p.status !== null,
    });
  }

  return deltas;
}
