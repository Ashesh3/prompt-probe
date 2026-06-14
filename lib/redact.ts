/**
 * Deep secret redaction used before any raw request/response is displayed,
 * returned by the API, or persisted (docs/SECURITY.md).
 */

export const REDACTION_KEYS = [
  "authorization",
  "cookie",
  "set-cookie",
  "api_key",
  "api-key",
  "x-api-key",
  "access_token",
  "refresh_token",
  "client_secret",
];

const SECRET_PATTERNS: { re: RegExp; label: string }[] = [
  { re: /\bBearer\s+[\w.\-]+/gi, label: "bearer" },
  { re: /\bsk-[A-Za-z0-9_\-]{10,}/g, label: "api_key" },
  { re: /\bgh[pousr]_[A-Za-z0-9]{10,}/g, label: "github_token" },
  { re: /\bxox[baprs]-[A-Za-z0-9\-]{10,}/g, label: "slack_token" },
];

function redactString(input: string, found: Set<string>): string {
  let out = input;
  for (const { re, label } of SECRET_PATTERNS) {
    if (re.test(out)) {
      found.add(label);
      out = out.replace(re, `[REDACTED_${label.toUpperCase()}]`);
    }
    re.lastIndex = 0;
  }
  return out;
}

function walk(value: unknown, found: Set<string>): unknown {
  if (typeof value === "string") return redactString(value, found);
  if (Array.isArray(value)) return value.map((v) => walk(v, found));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (REDACTION_KEYS.includes(k.toLowerCase())) {
        found.add(k.toLowerCase());
        out[k] = `[REDACTED_${k.toUpperCase().replace(/-/g, "_")}]`;
      } else {
        out[k] = walk(v, found);
      }
    }
    return out;
  }
  return value;
}

export function redactValue(input: unknown): {
  value: unknown;
  redactions: string[];
} {
  const found = new Set<string>();
  const value = walk(input, found);
  return { value, redactions: [...found].sort() };
}

/** Convenience wrapper that returns a redacted plain object. */
export function redactObject(
  input: Record<string, unknown>,
): Record<string, unknown> {
  return redactValue(input).value as Record<string, unknown>;
}
