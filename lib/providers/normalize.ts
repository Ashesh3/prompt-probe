import type {
  ErrorType,
  FinishReason,
  ModelResultStatus,
} from "@/lib/types";

/** Detect content-filter-flavored finish reasons across providers. */
export function isFilterFinish(reason: string): boolean {
  return /content[_\-\s]?filter|safety|blocked|recitation/i.test(reason);
}

/** Detect refusal-flavored finish reasons. */
export function isRefusalFinish(reason: string): boolean {
  return /refus|declin/i.test(reason);
}

/** Map a normalized finish reason + flags to a ModelResultStatus. */
export function statusFromFinish(
  finishReason: FinishReason,
  flags: { filtered: boolean; refused: boolean; errored: boolean },
): ModelResultStatus {
  if (flags.errored) return "error";
  if (flags.filtered || isFilterFinish(finishReason)) return "content_filter";
  if (flags.refused || isRefusalFinish(finishReason)) return "refused";
  return "passed";
}

/** Classify a raw error message into a normalized ErrorType. */
export function classifyError(message: string): ErrorType {
  const m = message.toLowerCase();
  if (/(401|403|unauthor|invalid api key|forbidden|permission)/.test(m))
    return "auth_error";
  if (/(429|rate limit|too many requests|quota)/.test(m)) return "rate_limited";
  if (/(network|fetch failed|econn|enotfound|timeout|timed out|socket)/.test(m))
    return "network_error";
  if (/(400|422|invalid request|validation)/.test(m)) return "validation_error";
  if (/cancel|abort/.test(m)) return "cancelled";
  if (m) return "provider_error";
  return "unknown";
}
