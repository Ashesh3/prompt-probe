/**
 * Token / character estimation utilities for Prompt Probe.
 *
 * These are deterministic heuristics used for UI display (badges, counters)
 * — NOT a real tokenizer. They never call out to a provider and contain no
 * randomness or time dependence, so identical input always yields identical
 * output.
 */

/**
 * Approximate the number of LLM tokens a string would consume.
 *
 * Uses a deterministic blend of two signals:
 *  - `ceil(chars / 4)` — the common "~4 chars per token" rule of thumb.
 *  - whitespace-delimited word count — so a small number of very long words
 *    (which the char heuristic would undercount per word) never drops below
 *    one-token-per-word.
 *
 * Empty or whitespace-only input estimates to 0.
 */
export function estimateTokens(text: string): number {
  const trimmed = text.trim();
  if (trimmed === "") return 0;
  const words = trimmed.split(/\s+/).length;
  return Math.max(words, Math.ceil(text.length / 4));
}

/** Raw character count of the string. */
export function countChars(text: string): number {
  return text.length;
}

/** Comma-grouped integer, e.g. 1284 -> "1,284". */
export function formatCount(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

/**
 * Compact, human-friendly magnitude.
 *  - < 1,000        -> the rounded integer, e.g. 950 -> "950"
 *  - < 1,000,000    -> one decimal + "k" (trailing ".0" trimmed), 5900 -> "5.9k"
 *  - >= 1,000,000   -> one decimal + "M" (trailing ".0" trimmed), 1.2M etc.
 */
export function formatCompact(n: number): string {
  const abs = Math.abs(n);
  if (abs < 1_000) return String(Math.round(n));
  if (abs < 1_000_000) return trimDecimal((n / 1_000).toFixed(1)) + "k";
  return trimDecimal((n / 1_000_000).toFixed(1)) + "M";
}

/** Drop a trailing ".0" so 1.0 -> "1" while 1.2 stays "1.2". */
function trimDecimal(fixed: string): string {
  return fixed.replace(/\.0$/, "");
}
