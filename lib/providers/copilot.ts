import "server-only";
import type {
  ConversationMessage,
  ErrorType,
  FinishReason,
  ModelRunInput,
  ModelRunResult,
  ToolSchema,
} from "@/lib/types";
import { redactObject } from "@/lib/redact";
import { copilotApiHeaders } from "@/lib/copilot";
import { statusFromFinish } from "./normalize";
import type { ModelProvider, RunOptions } from "./types";

const CHAT_ENDPOINT = "https://api.githubcopilot.com/chat/completions";
const RESPONSES_ENDPOINT = "https://api.githubcopilot.com/responses";

// Copilot/Azure content-management signals (prompt filtered before generation).
const CONTENT_FILTER_RE =
  /content[_\s-]?filter|content management|responsible ai|\brai\b|filtered/i;
// The model is only callable via /responses, not /chat/completions.
const UNSUPPORTED_ENDPOINT_RE =
  /unsupported_api_for_model|not accessible via the \/chat\/completions/i;

/* ------------------------------------------------------------------ */
/* Shared helpers                                                     */
/* ------------------------------------------------------------------ */

/**
 * The conversation turns sent after the system prompt. Falls back to a single
 * user turn from `userMessage` when no explicit conversation was supplied.
 */
function conversation(input: ModelRunInput): ConversationMessage[] {
  if (input.messages && input.messages.length > 0) return input.messages;
  return [{ role: "user", content: input.userMessage }];
}

function baseHeaders(token: string): Record<string, string> {
  return {
    ...copilotApiHeaders(token),
    "x-request-id": crypto.randomUUID(),
    "x-vscode-user-agent-library-version": "electron-fetch",
    "X-Initiator": "user",
  };
}

function classifyHttpError(status: number): ErrorType {
  if (status === 401 || status === 403) return "auth_error";
  if (status === 429) return "rate_limited";
  return "provider_error";
}

function parseErrorBody(text: string, status: number): Record<string, unknown> {
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { status, body: text.slice(0, 1000) };
  }
}

function errorResult(
  input: ModelRunInput,
  startedAt: number,
  latencyMs: number,
  errorType: ModelRunResult["errorType"],
  message: string,
  requestSummary: Record<string, unknown>,
): ModelRunResult {
  return {
    provider: "copilot",
    modelId: input.modelId,
    status: "error",
    finishReason: "error",
    filtered: false,
    refused: false,
    promptTokens: null,
    completionTokens: null,
    totalTokens: null,
    latencyMs,
    responseId: null,
    responseText: null,
    requestSummary,
    rawResponse: null,
    errorType,
    errorMessage: message,
    startedAt,
    finishedAt: startedAt + latencyMs,
  };
}

// The Copilot/Azure proxy returns content-management errors when the *prompt*
// is filtered — surface that as content_filter, not an error.
function filteredResult(
  input: ModelRunInput,
  startedAt: number,
  latencyMs: number,
  requestSummary: Record<string, unknown>,
  raw: Record<string, unknown>,
): ModelRunResult {
  return {
    provider: "copilot",
    modelId: input.modelId,
    status: "content_filter",
    finishReason: "content_filter",
    filtered: true,
    refused: false,
    promptTokens: null,
    completionTokens: 0,
    totalTokens: null,
    latencyMs,
    responseId: null,
    responseText: null,
    requestSummary,
    rawResponse: redactObject(raw),
    errorType: null,
    errorMessage: null,
    startedAt,
    finishedAt: startedAt + latencyMs,
  };
}

function handleCatch(
  e: unknown,
  input: ModelRunInput,
  startedAt: number,
  requestSummary: Record<string, unknown>,
): ModelRunResult {
  const message = e instanceof Error ? e.message : String(e);
  const latencyMs = Date.now() - startedAt;
  if (/abort/i.test(message)) {
    return {
      ...errorResult(input, startedAt, latencyMs, "cancelled", "cancelled", requestSummary),
      status: "cancelled",
    };
  }
  return errorResult(input, startedAt, latencyMs, "network_error", message, requestSummary);
}

/* ------------------------------------------------------------------ */
/* /chat/completions                                                  */
/* ------------------------------------------------------------------ */

function normalizeChatFinish(reason: string | undefined): FinishReason {
  switch (reason) {
    case "stop":
      return "stop";
    case "length":
      return "length";
    case "content_filter":
      return "content_filter";
    case "tool_calls":
    case "function_call":
      return "tool_use";
    default:
      return reason ? "unknown" : "stop";
  }
}

function toOpenAITools(tools: ToolSchema[]): Record<string, unknown>[] {
  return tools.map((t) => ({
    type: "function",
    function: {
      name: t.name,
      description: t.description ?? "",
      parameters: t.input_schema ?? { type: "object", properties: {} },
    },
  }));
}

async function runChat(
  input: ModelRunInput,
  opts: RunOptions,
): Promise<ModelRunResult> {
  const startedAt = Date.now();
  const convo = conversation(input);
  const requestSummary = redactObject({
    provider: "copilot",
    endpoint: "chat/completions",
    model: input.modelId,
    max_tokens: input.settings.maxTokens,
    temperature: input.settings.temperature,
    stream: false,
    system_chars: input.promptContent.length,
    messages: convo,
    tools: input.settings.includeTools ? input.tools.length : 0,
  });

  if (!opts.copilotToken) {
    return errorResult(input, startedAt, 0, "auth_error", "Not connected to GitHub Copilot.", requestSummary);
  }

  const reqBody: Record<string, unknown> = {
    model: input.modelId,
    messages: [
      { role: "system", content: input.promptContent },
      ...convo,
    ],
    temperature: input.settings.temperature,
    max_tokens: input.settings.maxTokens,
  };
  if (input.settings.includeTools && input.tools.length > 0) {
    reqBody.tools = toOpenAITools(input.tools);
  }

  try {
    const res = await fetch(CHAT_ENDPOINT, {
      method: "POST",
      headers: baseHeaders(opts.copilotToken),
      body: JSON.stringify(reqBody),
      signal: opts.signal,
    });
    const latencyMs = Date.now() - startedAt;

    if (!res.ok) {
      const text = await res.text();
      // The model is actually served via /responses — retry there instead of
      // surfacing a confusing "unsupported_api_for_model" error.
      if (res.status === 400 && UNSUPPORTED_ENDPOINT_RE.test(text)) {
        return runResponses(input, opts);
      }
      if (CONTENT_FILTER_RE.test(text)) {
        return filteredResult(input, startedAt, latencyMs, requestSummary, parseErrorBody(text, res.status));
      }
      return errorResult(
        input,
        startedAt,
        latencyMs,
        classifyHttpError(res.status),
        `Copilot API ${res.status}: ${text.slice(0, 200)}`,
        requestSummary,
      );
    }

    const data = (await res.json()) as {
      id?: string;
      choices?: {
        finish_reason?: string;
        message?: { content?: string | null };
      }[];
      usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
      };
    };
    const usage = data.usage ?? {};
    const choice = data.choices?.[0];

    // Copilot returns an empty `choices` array when its output content-management
    // filter blocks the response (notably for Claude models). Surface that as a
    // filter with an explanation instead of a silent pass with no text.
    if (!choice) {
      return {
        provider: "copilot",
        modelId: input.modelId,
        status: "content_filter",
        finishReason: "content_filter",
        filtered: true,
        refused: false,
        promptTokens: usage.prompt_tokens ?? null,
        completionTokens: usage.completion_tokens ?? 0,
        totalTokens: usage.total_tokens ?? null,
        latencyMs,
        responseId: data.id ?? null,
        responseText: null,
        requestSummary,
        rawResponse: redactObject(data as Record<string, unknown>),
        errorType: null,
        errorMessage:
          "Copilot returned no choices (empty completion) — typically an output content-management block.",
        startedAt,
        finishedAt: startedAt + latencyMs,
      };
    }

    const finishReason = normalizeChatFinish(choice.finish_reason);
    const content = choice.message?.content ?? null;
    const status = statusFromFinish(finishReason, {
      filtered: finishReason === "content_filter",
      refused: false,
      errored: false,
    });

    return {
      provider: "copilot",
      modelId: input.modelId,
      status,
      finishReason,
      filtered: status === "content_filter",
      refused: status === "refused",
      promptTokens: usage.prompt_tokens ?? null,
      completionTokens: usage.completion_tokens ?? null,
      totalTokens: usage.total_tokens ?? null,
      latencyMs,
      responseId: data.id ?? null,
      responseText: content,
      requestSummary,
      rawResponse: redactObject(data as Record<string, unknown>),
      errorType: null,
      errorMessage: null,
      startedAt,
      finishedAt: startedAt + latencyMs,
    };
  } catch (e) {
    return handleCatch(e, input, startedAt, requestSummary);
  }
}

/* ------------------------------------------------------------------ */
/* /responses (gpt-5.x, reasoning, internal models)                   */
/* ------------------------------------------------------------------ */

interface ResponsesResult {
  id?: string;
  status?: string;
  output_text?: string;
  output?: Array<{
    type?: string;
    content?: Array<{ type?: string; text?: string; refusal?: string }>;
  }>;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
  };
  incomplete_details?: { reason?: string } | null;
}

function toResponsesTools(tools: ToolSchema[]): Record<string, unknown>[] {
  return tools.map((t) => ({
    type: "function",
    name: t.name,
    description: t.description ?? "",
    parameters: t.input_schema ?? { type: "object", properties: {} },
  }));
}

function collectResponsesText(data: ResponsesResult): {
  text: string | null;
  refused: boolean;
} {
  let text = "";
  let refusal = "";
  for (const item of data.output ?? []) {
    if (item.type !== "message") continue;
    for (const block of item.content ?? []) {
      if (block.type === "output_text" && typeof block.text === "string") {
        text += block.text;
      } else if (block.type === "refusal" && typeof block.refusal === "string") {
        refusal += block.refusal;
      }
    }
  }
  if (!text && typeof data.output_text === "string") text = data.output_text;
  if (refusal && !text) return { text: refusal, refused: true };
  return { text: text || null, refused: refusal.length > 0 };
}

function responsesFinish(data: ResponsesResult, refused: boolean): FinishReason {
  const reason = data.incomplete_details?.reason;
  if (reason === "content_filter") return "content_filter";
  if (reason === "max_output_tokens") return "length";
  if (refused) return "refusal";
  if ((data.output ?? []).some((i) => i.type === "function_call")) return "tool_use";
  return "stop";
}

async function runResponses(
  input: ModelRunInput,
  opts: RunOptions,
): Promise<ModelRunResult> {
  const startedAt = Date.now();
  const convo = conversation(input);
  // Responses-only models are reasoning models: they reject a custom
  // temperature/top_p, and need output headroom beyond the reasoning tokens —
  // so we omit sampling params and floor the budget so a visible answer fits.
  const maxOutputTokens = Math.max(input.settings.maxTokens, 2048);
  const requestSummary = redactObject({
    provider: "copilot",
    endpoint: "responses",
    model: input.modelId,
    max_output_tokens: maxOutputTokens,
    stream: false,
    instructions_chars: input.promptContent.length,
    input: convo,
    tools: input.settings.includeTools ? input.tools.length : 0,
  });

  if (!opts.copilotToken) {
    return errorResult(input, startedAt, 0, "auth_error", "Not connected to GitHub Copilot.", requestSummary);
  }

  const reqBody: Record<string, unknown> = {
    model: input.modelId,
    instructions: input.promptContent,
    input: convo.map((m) => ({
      type: "message",
      // The Responses API has no "tool" input role; fold tool results into a
      // user turn so tool-using captures still replay (best-effort).
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    })),
    max_output_tokens: maxOutputTokens,
    stream: false,
    store: false,
  };
  if (input.settings.includeTools && input.tools.length > 0) {
    reqBody.tools = toResponsesTools(input.tools);
    reqBody.tool_choice = "auto";
  }

  try {
    const res = await fetch(RESPONSES_ENDPOINT, {
      method: "POST",
      headers: baseHeaders(opts.copilotToken),
      body: JSON.stringify(reqBody),
      signal: opts.signal,
    });
    const latencyMs = Date.now() - startedAt;

    if (!res.ok) {
      const text = await res.text();
      if (CONTENT_FILTER_RE.test(text)) {
        return filteredResult(input, startedAt, latencyMs, requestSummary, parseErrorBody(text, res.status));
      }
      return errorResult(
        input,
        startedAt,
        latencyMs,
        classifyHttpError(res.status),
        `Copilot Responses API ${res.status}: ${text.slice(0, 200)}`,
        requestSummary,
      );
    }

    const data = (await res.json()) as ResponsesResult;
    const { text: content, refused } = collectResponsesText(data);
    const finishReason = responsesFinish(data, refused);
    const usage = data.usage ?? {};
    const status = statusFromFinish(finishReason, {
      filtered: finishReason === "content_filter",
      refused,
      errored: false,
    });

    return {
      provider: "copilot",
      modelId: input.modelId,
      status,
      finishReason,
      filtered: status === "content_filter",
      refused: status === "refused",
      promptTokens: usage.input_tokens ?? null,
      completionTokens: usage.output_tokens ?? null,
      totalTokens: usage.total_tokens ?? null,
      latencyMs,
      responseId: data.id ?? null,
      responseText: content,
      requestSummary,
      rawResponse: redactObject(data as Record<string, unknown>),
      errorType: null,
      errorMessage: null,
      startedAt,
      finishedAt: startedAt + latencyMs,
    };
  } catch (e) {
    return handleCatch(e, input, startedAt, requestSummary);
  }
}

/* ------------------------------------------------------------------ */
/* Provider                                                           */
/* ------------------------------------------------------------------ */

export const copilotProvider: ModelProvider = {
  id: "copilot",
  async runPrompt(
    input: ModelRunInput,
    opts: RunOptions = {},
  ): Promise<ModelRunResult> {
    const endpoint = opts.copilotEndpoints?.[input.modelId] ?? "chat";
    if (endpoint === "responses") return runResponses(input, opts);
    return runChat(input, opts);
  },
};
