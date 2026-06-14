import "server-only";
import type { RiskCategory, RiskFinding } from "@/lib/types";
import { copilotApiHeaders } from "@/lib/copilot";

/**
 * AI-assisted risk analysis (server-only).
 *
 * Sends the active prompt/message to a Copilot model and asks it to flag spans
 * whose wording could trigger a provider content filter or a refusal. The model
 * returns structured JSON which we map to {@link RiskFinding}s so the result
 * renders alongside the deterministic scanner.
 *
 * DIAGNOSTIC ONLY (docs/SECURITY.md): the model is asked to *identify and
 * explain* risky wording, never to rewrite it to evade a filter.
 */

const CHAT_ENDPOINT = "https://api.githubcopilot.com/chat/completions";
const RESPONSES_ENDPOINT = "https://api.githubcopilot.com/responses";

const UNSUPPORTED_ENDPOINT_RE =
  /unsupported_api_for_model|not accessible via the \/chat\/completions/i;

const VALID_CATEGORIES: RiskCategory[] = [
  "dual-use-security",
  "instruction-override",
  "bypass-compliance",
  "tool-volume",
  "role-harness",
  "high-risk-term",
];

const SYSTEM_INSTRUCTION = `You are a content-policy risk analyzer for LLM system prompts and conversation turns.
You are given text with each line prefixed by "<n>: ". Identify spans whose wording could cause a provider's content filter to block the request, or cause the model to refuse — for example: dual-use / offensive-security wording, instruction-override ("ignore previous instructions"), demands to bypass safety or comply unconditionally, injected role/agent-harness scaffolding, or individually high-risk terms.

For each finding, also propose a "suggestion": a rephrasing of that exact snippet that preserves the same *legitimate* intent but uses clearer, less charged wording so a content filter is less likely to flag it as a false positive. The suggestion must be a drop-in replacement for the snippet (it will be substituted verbatim). Do not weaken any genuine safety instruction; if a snippet has no safer legitimate phrasing, set "suggestion" to "".

Respond with ONLY a JSON object of this exact shape, and nothing else (no prose, no markdown fences):
{"findings":[{"lineStart":<int>,"lineEnd":<int>,"snippet":"<the exact offending text>","category":"<dual-use-security|instruction-override|bypass-compliance|tool-volume|role-harness|high-risk-term>","severity":<0.0-1.0>,"reason":"<short explanation of why a filter might flag it>","suggestion":"<a safer drop-in rephrasing of the snippet, or empty string>"}]}

Use the provided line numbers (do not include the "<n>: " prefix in the snippet). Keep snippets short and exact. If nothing is risky, return {"findings":[]}.`;

interface RawFinding {
  lineStart?: number;
  lineEnd?: number;
  snippet?: string;
  category?: string;
  severity?: number;
  reason?: string;
  suggestion?: string;
}

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0.6;
  return Math.min(1, Math.max(0, v));
}

function clampLine(v: number, total: number): number {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return 1;
  return Math.min(Math.max(1, n), Math.max(1, total));
}

function numberLines(content: string): string {
  return content
    .split("\n")
    .map((l, i) => `${i + 1}: ${l}`)
    .join("\n");
}

function baseHeaders(token: string): Record<string, string> {
  return {
    ...copilotApiHeaders(token),
    "x-request-id": crypto.randomUUID(),
    "X-Initiator": "user",
  };
}

async function callChat(
  model: string,
  user: string,
  token: string,
): Promise<string> {
  const res = await fetch(CHAT_ENDPOINT, {
    method: "POST",
    headers: baseHeaders(token),
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM_INSTRUCTION },
        { role: "user", content: user },
      ],
      temperature: 0,
      max_tokens: 1500,
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) {
    throw new Error(
      `AI analysis failed (${res.status}): ${(await res.text()).slice(0, 200)}`,
    );
  }
  const data = (await res.json()) as {
    choices?: { message?: { content?: string | null } }[];
  };
  return data.choices?.[0]?.message?.content ?? "";
}

async function callResponses(
  model: string,
  user: string,
  token: string,
): Promise<string> {
  const res = await fetch(RESPONSES_ENDPOINT, {
    method: "POST",
    headers: baseHeaders(token),
    body: JSON.stringify({
      model,
      instructions: SYSTEM_INSTRUCTION,
      input: [{ type: "message", role: "user", content: user }],
      max_output_tokens: 3000,
      stream: false,
      store: false,
    }),
  });
  if (!res.ok) {
    throw new Error(
      `AI analysis failed (${res.status}): ${(await res.text()).slice(0, 200)}`,
    );
  }
  const data = (await res.json()) as {
    output_text?: string;
    output?: { type?: string; content?: { type?: string; text?: string }[] }[];
  };
  if (typeof data.output_text === "string" && data.output_text) {
    return data.output_text;
  }
  let text = "";
  for (const item of data.output ?? []) {
    if (item.type !== "message") continue;
    for (const block of item.content ?? []) {
      if (block.type === "output_text" && typeof block.text === "string") {
        text += block.text;
      }
    }
  }
  return text;
}

/** Best-effort extraction of a JSON object/array from a model response. */
function extractJson(text: string): unknown {
  if (!text) return null;
  const stripped = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const tryParse = (s: string): unknown => {
    try {
      return JSON.parse(s);
    } catch {
      return undefined;
    }
  };
  const whole = tryParse(stripped);
  if (whole !== undefined) return whole;
  const objStart = stripped.indexOf("{");
  const objEnd = stripped.lastIndexOf("}");
  if (objStart >= 0 && objEnd > objStart) {
    const obj = tryParse(stripped.slice(objStart, objEnd + 1));
    if (obj !== undefined) return obj;
  }
  const arrStart = stripped.indexOf("[");
  const arrEnd = stripped.lastIndexOf("]");
  if (arrStart >= 0 && arrEnd > arrStart) {
    const arr = tryParse(stripped.slice(arrStart, arrEnd + 1));
    if (arr !== undefined) return arr;
  }
  return null;
}

function toFindings(raw: RawFinding[], content: string): RiskFinding[] {
  const lines = content.split("\n");
  const out: RiskFinding[] = [];
  for (const r of raw) {
    if (!r || typeof r !== "object") continue;
    const lineStart = clampLine(r.lineStart ?? 1, lines.length);
    const lineEnd = Math.max(lineStart, clampLine(r.lineEnd ?? lineStart, lines.length));
    const category: RiskCategory = VALID_CATEGORIES.includes(
      r.category as RiskCategory,
    )
      ? (r.category as RiskCategory)
      : "high-risk-term";
    const snippet = typeof r.snippet === "string" ? r.snippet.trim() : "";
    const finding: RiskFinding = {
      category,
      confidence: clamp01(typeof r.severity === "number" ? r.severity : 0.6),
      lineStart,
      lineEnd,
      matchedText: snippet || lines[lineStart - 1]?.trim() || `line ${lineStart}`,
      explanation:
        typeof r.reason === "string" && r.reason.trim()
          ? r.reason.trim()
          : "Flagged by AI analysis as potentially filter-triggering.",
    };
    if (snippet && lineStart === lineEnd) {
      const col = lines[lineStart - 1]?.indexOf(snippet) ?? -1;
      if (col >= 0) {
        finding.columnStart = col;
        finding.columnEnd = col + snippet.length;
      }
    }
    // A safer drop-in rewrite (only when it actually differs from the snippet).
    const suggestion =
      typeof r.suggestion === "string" ? r.suggestion.trim() : "";
    if (suggestion && suggestion !== snippet) {
      finding.suggestion = suggestion;
    }
    out.push(finding);
  }
  // Sort by line, then de-dup identical spans.
  out.sort((a, b) =>
    a.lineStart !== b.lineStart
      ? a.lineStart - b.lineStart
      : (a.columnStart ?? 0) - (b.columnStart ?? 0),
  );
  const seen = new Set<string>();
  return out.filter((f) => {
    const key = `${f.category} ${f.lineStart} ${f.matchedText}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function analyzeWithModel(
  content: string,
  model: string,
  copilotToken: string,
  endpoint: "chat" | "responses",
): Promise<RiskFinding[]> {
  const user = numberLines(content);
  let text: string;
  if (endpoint === "responses") {
    text = await callResponses(model, user, copilotToken);
  } else {
    try {
      text = await callChat(model, user, copilotToken);
    } catch (e) {
      // Model is actually a /responses model — retry there.
      if (UNSUPPORTED_ENDPOINT_RE.test(e instanceof Error ? e.message : String(e))) {
        text = await callResponses(model, user, copilotToken);
      } else {
        throw e;
      }
    }
  }
  const parsed = extractJson(text);
  const rawList: RawFinding[] = Array.isArray(parsed)
    ? (parsed as RawFinding[])
    : Array.isArray((parsed as { findings?: unknown })?.findings)
      ? ((parsed as { findings: RawFinding[] }).findings)
      : [];
  return toFindings(rawList, content);
}
