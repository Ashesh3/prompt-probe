import type { ModelRunInput, ModelRunResult } from "@/lib/types";
import { cyrb53, contentHash } from "@/lib/hash";
import { riskyMatchesInLine } from "@/lib/risk/phrases";
import { redactObject } from "@/lib/redact";
import type { ModelProvider, RunOptions } from "./types";

/**
 * Deterministic mock provider (docs/TESTING.md).
 *
 * Outcomes are a pure function of (modelId, prompt content, user message,
 * settings, tools): identical inputs always yield identical results, while
 * editing the prompt or switching models changes outcomes — which is what
 * makes the version/diff/delta workflow demonstrable without live credentials.
 *
 * Stricter models filter at a lower risk threshold, so adding dual-use or
 * override wording filters on the strict models first.
 */

const MODEL_STRICTNESS: Record<string, number> = {
  "claude-fable-5": 0.95,
  "claude-opus-4-8": 0.82,
  "claude-sonnet-4-6": 0.7,
  "claude-haiku-4-5": 0.58,
  "gpt-5": 0.66,
  "gpt-5-mini": 0.5,
  "gemini-2.5-pro": 0.56,
};

const FILTER_CUTOFF = 1.0;
const REFUSAL_CUTOFF = 0.6;

function riskScore(input: ModelRunInput): number {
  let score = 0;
  for (const line of input.promptContent.split(/\r?\n/)) {
    for (const match of riskyMatchesInLine(line)) {
      score += match.confidence;
      if (
        match.category === "instruction-override" ||
        match.category === "bypass-compliance"
      ) {
        score += 0.15; // override/bypass weigh a little heavier
      }
    }
  }
  if (input.settings.includeTools && input.tools.length >= 5) {
    score += 0.4 + Math.min(input.tools.length, 12) * 0.04;
  }
  return score;
}

/** Stable 0..1 pseudo-random jitter per (model, content, message). */
function jitter01(input: ModelRunInput): number {
  const key = `${input.provider}:${input.modelId}|${contentHash(
    input.promptContent,
  )}|${input.userMessage}|${input.settings.maxTokens}`;
  return (cyrb53(key) % 100000) / 100000;
}

function estTokens(s: string): number {
  const t = s.trim();
  if (!t) return 0;
  return Math.max(t.split(/\s+/).length, Math.ceil(s.length / 4));
}

function hasCategory(input: ModelRunInput, cats: string[]): boolean {
  for (const line of input.promptContent.split(/\r?\n/)) {
    for (const m of riskyMatchesInLine(line)) {
      if (cats.includes(m.category)) return true;
    }
  }
  return false;
}

const PASS_REPLY =
  "I can help you write, debug, and reason about code. Tell me what you're working on — a snippet, an error message, or the behavior you're trying to get — and I'll take it from there.";
const REFUSAL_REPLY =
  "I can't help with that request as written. If this is for authorized testing, let me know the context and I can help with the defensive or diagnostic parts.";

function buildRawResponse(
  input: ModelRunInput,
  args: {
    responseId: string;
    finishReason: string;
    text: string | null;
    promptTokens: number;
    completionTokens: number;
  },
): Record<string, unknown> {
  const { responseId, finishReason, text, promptTokens, completionTokens } =
    args;
  if (input.provider === "openai") {
    return {
      id: responseId,
      object: "chat.completion",
      model: input.modelId,
      choices: [
        {
          index: 0,
          finish_reason: finishReason,
          message: { role: "assistant", content: text ?? "" },
        },
      ],
      usage: {
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: promptTokens + completionTokens,
      },
    };
  }
  if (input.provider === "google") {
    return {
      responseId,
      modelVersion: input.modelId,
      candidates: [
        {
          finishReason: finishReason.toUpperCase(),
          content: { role: "model", parts: [{ text: text ?? "" }] },
        },
      ],
      usageMetadata: {
        promptTokenCount: promptTokens,
        candidatesTokenCount: completionTokens,
        totalTokenCount: promptTokens + completionTokens,
      },
    };
  }
  // anthropic-style default
  return {
    id: responseId,
    type: "message",
    role: "assistant",
    model: input.modelId,
    stop_reason: finishReason,
    content: text ? [{ type: "text", text }] : [],
    usage: { input_tokens: promptTokens, output_tokens: completionTokens },
  };
}

function idPrefix(provider: string): string {
  if (provider === "openai") return "chatcmpl";
  if (provider === "google") return "gen";
  return "msg";
}

function compute(input: ModelRunInput): ModelRunResult {
  const startedAt = Date.now();
  const j = jitter01(input);
  const strictness = MODEL_STRICTNESS[input.modelId] ?? 0.6;
  const score = riskScore(input);
  const effective = score * strictness;

  const promptTokens =
    estTokens(input.promptContent) +
    estTokens(input.userMessage) +
    (input.settings.includeTools ? estTokens(JSON.stringify(input.tools)) : 0);

  const hex = cyrb53(
    `${input.modelId}:${contentHash(input.promptContent)}:${input.userMessage}`,
  )
    .toString(16)
    .padStart(12, "0");
  const responseId = `${idPrefix(input.provider)}_${hex}`;

  // Decide outcome.
  let status: ModelRunResult["status"];
  let finishReason: ModelRunResult["finishReason"];
  let text: string | null;
  let completionTokens: number;
  let errorType: ModelRunResult["errorType"] = null;
  let errorMessage: ModelRunResult["errorMessage"] = null;

  if (j > 0.965 && score > 0.3) {
    // Rare, deterministic transient error on non-trivial prompts — partial
    // failures must not cancel the rest of the matrix (docs/REQUIREMENTS.md).
    status = "error";
    finishReason = "error";
    text = null;
    completionTokens = 0;
    errorType = j > 0.985 ? "rate_limited" : "network_error";
    errorMessage =
      errorType === "rate_limited"
        ? "429 Too Many Requests: rate limit reached for this model."
        : "Network error: upstream connection reset before response completed.";
  } else if (effective >= FILTER_CUTOFF) {
    status = "content_filter";
    finishReason = "content_filter";
    text = null;
    completionTokens = Math.floor(j * 5);
  } else if (
    effective >= REFUSAL_CUTOFF &&
    hasCategory(input, ["instruction-override", "bypass-compliance"])
  ) {
    status = "refused";
    finishReason = "refusal";
    text = REFUSAL_REPLY;
    completionTokens = estTokens(REFUSAL_REPLY);
  } else {
    status = "passed";
    const wanted = 40 + Math.floor(j * 90);
    completionTokens = Math.min(input.settings.maxTokens, wanted);
    finishReason =
      completionTokens >= input.settings.maxTokens ? "length" : "stop";
    text = PASS_REPLY;
  }

  // Latency: filters tend to short-circuit fast; errors fail quickly.
  let latencyMs: number;
  if (status === "content_filter") latencyMs = Math.round(380 + j * 600);
  else if (status === "error") latencyMs = Math.round(200 + j * 400);
  else latencyMs = Math.round(650 + score * 220 + j * 1400);

  const totalTokens =
    status === "error" ? null : promptTokens + completionTokens;

  const requestSummary = redactObject({
    provider: input.provider,
    model: input.modelId,
    max_tokens: input.settings.maxTokens,
    temperature: input.settings.temperature,
    stream: input.settings.stream,
    system_chars: input.promptContent.length,
    messages: [{ role: "user", content: input.userMessage }],
    tools: input.settings.includeTools ? input.tools.length : 0,
  });

  const rawResponse =
    status === "error"
      ? null
      : redactObject(
          buildRawResponse(input, {
            responseId,
            finishReason,
            text,
            promptTokens,
            completionTokens,
          }),
        );

  return {
    provider: input.provider,
    modelId: input.modelId,
    status,
    finishReason,
    filtered: status === "content_filter",
    refused: status === "refused",
    promptTokens: status === "error" ? null : promptTokens,
    completionTokens: status === "error" ? null : completionTokens,
    totalTokens,
    latencyMs,
    responseId: status === "error" ? null : responseId,
    responseText: text,
    requestSummary,
    rawResponse,
    errorType,
    errorMessage,
    startedAt,
    finishedAt: startedAt + latencyMs,
  };
}

export const mockProvider: ModelProvider = {
  id: "mock",
  async runPrompt(
    input: ModelRunInput,
    opts: RunOptions = {},
  ): Promise<ModelRunResult> {
    const result = compute(input);
    if (opts.simulateDelay) {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, Math.min(result.latencyMs ?? 0, 2200));
        if (opts.signal) {
          opts.signal.addEventListener(
            "abort",
            () => {
              clearTimeout(timer);
              reject(new DOMException("Aborted", "AbortError"));
            },
            { once: true },
          );
        }
      });
    }
    return result;
  },
};
