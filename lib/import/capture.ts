import type {
  ParsedCapture,
  ToolSchema,
  CaptureMessage,
  RunSettings,
} from "@/lib/types";

/**
 * Raw request / debug-capture import parser with secret redaction.
 *
 * docs/ARCHITECTURE.md "Request Capture Support" + docs/SECURITY.md.
 *
 * DIAGNOSTIC ONLY: this module exists so pasted captures can be inspected
 * safely. It strips credentials *before* any value reaches display or
 * persistence. It never executes tool schemas and never advises bypassing
 * anything — tool schemas are treated purely as opaque data.
 */

/** Header / field names whose string value is always stripped. */
export const REDACTION_KEYS: string[] = [
  "authorization",
  "cookie",
  "set-cookie",
  "api_key",
  "access_token",
  "refresh_token",
  "x-api-key",
  "api-key",
];

/** Placeholder substituted for any in-line secret token. */
const TOKEN_PLACEHOLDER = "[REDACTED_TOKEN]";

/** Secret-token detectors. Each records a stable label when it fires. */
const TOKEN_PATTERNS: { re: RegExp; label: string }[] = [
  { re: /\bBearer\s+[\w.\-]+/gi, label: "bearer" },
  { re: /\bsk-[A-Za-z0-9]{10,}/g, label: "api_key" },
  { re: /\bgh[pousr]_[A-Za-z0-9]{10,}/g, label: "github_token" },
];

type JsonObject = Record<string, unknown>;

const EMPTY_CAPTURE: ParsedCapture = {
  systemPrompt: null,
  messages: [],
  tools: [],
  settings: {},
  redactions: [],
};

/**
 * Parse a pasted capture (plain JSON or a debug export) into a redacted,
 * safe-to-display {@link ParsedCapture}. Never throws: unparseable input
 * yields an empty capture.
 */
export function parseCapture(text: string): ParsedCapture {
  if (typeof text !== "string" || text.trim() === "") {
    return { ...EMPTY_CAPTURE };
  }

  const body = extractBody(text);
  if (!body) {
    return { ...EMPTY_CAPTURE };
  }

  const redactions = new Set<string>();

  // Deep-walk the parsed body, stripping secrets in place. The redacted body
  // is what feeds extraction below, so no secret can leak into outputs.
  redactNode(body, redactions);

  // Also scan the untouched raw text for secrets that live outside the JSON
  // body (e.g. an Authorization header line in a debug dump).
  scanForTokens(text, redactions);

  return {
    systemPrompt: deriveSystemPrompt(body),
    messages: deriveMessages(body),
    tools: deriveTools(body),
    settings: deriveSettings(body),
    redactions: [...redactions],
  };
}

/* ------------------------------------------------------------------ */
/* Body extraction                                                    */
/* ------------------------------------------------------------------ */

function extractBody(text: string): JsonObject | null {
  const trimmed = text.trim();

  // 1. Whole trimmed text is a JSON object.
  const whole = tryParseObject(trimmed);
  if (whole) return whole;

  // 2. Debug export containing a "Request Body" marker.
  const markerIndex = trimmed.toLowerCase().indexOf("request body");
  if (markerIndex !== -1) {
    const afterMarker = findFirstJsonObject(
      trimmed,
      markerIndex + "request body".length,
    );
    if (afterMarker) return afterMarker;
  }

  // 3. First balanced { ... } object found anywhere.
  return findFirstJsonObject(trimmed, 0);
}

/** Walk forward from `fromIndex` returning the first balanced object that
 * parses as a JSON object, or null. */
function findFirstJsonObject(text: string, fromIndex: number): JsonObject | null {
  let searchFrom = Math.max(0, fromIndex);
  while (searchFrom < text.length) {
    const start = text.indexOf("{", searchFrom);
    if (start === -1) return null;
    const candidate = extractBalancedObject(text, start);
    if (candidate) {
      const parsed = tryParseObject(candidate);
      if (parsed) return parsed;
    }
    searchFrom = start + 1;
  }
  return null;
}

/** Slice the balanced `{ ... }` beginning at `start`, respecting string
 * literals and escapes. Returns null if no balanced close exists. */
function extractBalancedObject(text: string, start: number): string | null {
  if (text[start] !== "{") return null;
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
    } else if (ch === "{") {
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }
  return null;
}

function tryParseObject(source: string): JsonObject | null {
  try {
    const value: unknown = JSON.parse(source);
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      return value as JsonObject;
    }
    return null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Redaction                                                          */
/* ------------------------------------------------------------------ */

/** Deep-walk `node`, mutating objects/strings in place to remove secrets. */
function redactNode(node: unknown, redactions: Set<string>): unknown {
  if (typeof node === "string") {
    return redactTokensInString(node, redactions);
  }
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      node[i] = redactNode(node[i], redactions);
    }
    return node;
  }
  if (node !== null && typeof node === "object") {
    const obj = node as JsonObject;
    for (const key of Object.keys(obj)) {
      const lower = key.toLowerCase();
      const value = obj[key];
      if (REDACTION_KEYS.includes(lower) && typeof value === "string") {
        obj[key] = `[REDACTED_${lower.toUpperCase()}]`;
        redactions.add(lower);
      } else {
        obj[key] = redactNode(value, redactions);
      }
    }
    return obj;
  }
  return node;
}

/** Replace any embedded secret token, recording each detector that fired. */
function redactTokensInString(input: string, redactions: Set<string>): string {
  let out = input;
  for (const { re, label } of TOKEN_PATTERNS) {
    re.lastIndex = 0;
    out = out.replace(re, () => {
      redactions.add(label);
      return TOKEN_PLACEHOLDER;
    });
  }
  return out;
}

/** Scan raw capture text for secrets, recording labels only. */
function scanForTokens(text: string, redactions: Set<string>): void {
  for (const { re, label } of TOKEN_PATTERNS) {
    re.lastIndex = 0;
    if (re.test(text)) {
      redactions.add(label);
    }
  }
}

/* ------------------------------------------------------------------ */
/* Field extraction (operates on the already-redacted body)           */
/* ------------------------------------------------------------------ */

function deriveSystemPrompt(body: JsonObject): string | null {
  const system = body.system;
  if (typeof system === "string") {
    return system;
  }
  if (Array.isArray(system)) {
    return joinTextBlocks(system);
  }

  // Fall back to a "system"-role message entry.
  const messages = body.messages;
  if (Array.isArray(messages)) {
    for (const entry of messages) {
      if (isObject(entry) && entry.role === "system") {
        return extractContent(entry.content);
      }
    }
  }
  return null;
}

function deriveMessages(body: JsonObject): CaptureMessage[] {
  const raw = body.messages;
  if (!Array.isArray(raw)) return [];
  return raw.map((entry): CaptureMessage => {
    const obj = isObject(entry) ? entry : {};
    const role = typeof obj.role === "string" ? obj.role : "";
    const msg: CaptureMessage = { role, content: extractContent(obj.content) };
    // Preserve tool-call structure so a captured agent conversation replays.
    if (Array.isArray(obj.tool_calls)) msg.tool_calls = obj.tool_calls;
    if (typeof obj.tool_call_id === "string") msg.tool_call_id = obj.tool_call_id;
    if (typeof obj.name === "string") msg.name = obj.name;
    return msg;
  });
}

function deriveTools(body: JsonObject): ToolSchema[] {
  if (!Array.isArray(body.tools)) return [];
  return body.tools.map((entry): ToolSchema => {
    const obj = isObject(entry) ? entry : {};
    // OpenAI tools nest the definition under `function`; flatten the name etc.
    const fn = isObject(obj.function) ? obj.function : undefined;
    const name =
      (typeof obj.name === "string" && obj.name) ||
      (fn && typeof fn.name === "string" && fn.name) ||
      "tool";
    const description =
      typeof obj.description === "string"
        ? obj.description
        : fn && typeof fn.description === "string"
          ? fn.description
          : undefined;
    const input_schema = isObject(obj.input_schema)
      ? obj.input_schema
      : isObject(obj.parameters)
        ? obj.parameters
        : fn && isObject(fn.parameters)
          ? fn.parameters
          : undefined;
    return {
      ...obj,
      name,
      ...(description !== undefined ? { description } : {}),
      ...(input_schema !== undefined ? { input_schema } : {}),
    } as ToolSchema;
  });
}

function deriveSettings(body: JsonObject): Partial<RunSettings> {
  const settings: Partial<RunSettings> = {};
  const maxTokens = body.max_tokens ?? body.maxTokens;
  if (typeof maxTokens === "number") {
    settings.maxTokens = maxTokens;
  }
  if (typeof body.temperature === "number") {
    settings.temperature = body.temperature;
  }
  if (typeof body.stream === "boolean") {
    settings.stream = body.stream;
  }
  return settings;
}

/** Content is a string verbatim, otherwise the concatenated `.text` of any
 * content blocks, otherwise "". */
function extractContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return joinTextBlocks(content);
  return "";
}

function joinTextBlocks(blocks: unknown[]): string {
  return blocks
    .filter((b): b is JsonObject => isObject(b) && typeof b.text === "string")
    .map((b) => b.text as string)
    .join("");
}

function isObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
