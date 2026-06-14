import type {
  ConversationMessage,
  ModelRunInput,
  ModelRunResult,
  ModelSelection,
  ProviderId,
  RunSettings,
  ToolSchema,
} from "@/lib/types";
import { classifyError } from "./normalize";
import { mockProvider } from "./mock";
import type { ModelProvider, RunOptions } from "./types";

export type { ModelProvider, RunOptions } from "./types";
export { mockProvider } from "./mock";

/**
 * Resolve the adapter for a provider. Live adapters are opt-in
 * (PROMPT_PROBE_LIVE_TESTS) and not yet wired, so every call uses the
 * deterministic mock — keeping the app fully usable without credentials
 * (docs/TESTING.md, docs/SECURITY.md).
 */
export function getProvider(_provider: ProviderId): ModelProvider {
  return mockProvider;
}

export interface MatrixInput {
  promptContent: string;
  userMessage: string;
  messages?: ConversationMessage[];
  settings: RunSettings;
  tools: ToolSchema[];
  models: ModelSelection[];
}

function errorResult(
  sel: ModelSelection,
  message: string,
): ModelRunResult {
  const now = Date.now();
  return {
    provider: sel.provider,
    modelId: sel.modelId,
    status: "error",
    finishReason: "error",
    filtered: false,
    refused: false,
    promptTokens: null,
    completionTokens: null,
    totalTokens: null,
    latencyMs: null,
    responseId: null,
    responseText: null,
    requestSummary: { provider: sel.provider, model: sel.modelId },
    rawResponse: null,
    errorType: classifyError(message),
    errorMessage: message,
    startedAt: now,
    finishedAt: now,
  };
}

/**
 * Run the prompt against every selected model. Partial failures never cancel
 * the rest of the matrix (docs/REQUIREMENTS.md): a rejected call becomes a
 * normalized error result. Honors AbortSignal for cancellation.
 */
export async function runMatrix(
  input: MatrixInput,
  opts: RunOptions = {},
): Promise<ModelRunResult[]> {
  // Load the (server-only) Copilot adapter lazily, only when a Copilot model
  // is actually in the matrix — keeps it out of the mock/test/client paths.
  const needsCopilot = input.models.some((m) => m.provider === "copilot");
  const copilot = needsCopilot
    ? (await import("./copilot")).copilotProvider
    : null;

  const settled = await Promise.allSettled(
    input.models.map((sel) => {
      const runInput: ModelRunInput = {
        provider: sel.provider,
        modelId: sel.modelId,
        promptContent: input.promptContent,
        userMessage: input.userMessage,
        messages: input.messages,
        settings: input.settings,
        tools: input.tools,
      };
      const provider =
        sel.provider === "copilot" && copilot ? copilot : getProvider(sel.provider);
      return provider.runPrompt(runInput, opts);
    }),
  );

  return settled.map((res, i) => {
    if (res.status === "fulfilled") return res.value;
    const reason =
      res.reason instanceof Error ? res.reason.message : String(res.reason);
    const sel = input.models[i];
    if (/abort/i.test(reason)) {
      return { ...errorResult(sel, "cancelled"), status: "cancelled" };
    }
    return errorResult(sel, reason);
  });
}
