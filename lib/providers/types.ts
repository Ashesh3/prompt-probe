import type { ModelRunInput, ModelRunResult, ProviderId } from "@/lib/types";

export type ProviderKind = ProviderId | "mock";

export interface RunOptions {
  signal?: AbortSignal;
  /** Simulate realistic per-model latency (off in tests). */
  simulateDelay?: boolean;
  /** Short-lived Copilot bearer token for real GitHub Copilot calls. */
  copilotToken?: string;
  /**
   * Per-model Copilot endpoint routing, keyed by modelId. Models served only
   * via the Responses API ("responses") are sent there instead of
   * /chat/completions. Defaults to "chat" when a model is absent.
   */
  copilotEndpoints?: Record<string, "chat" | "responses">;
}

/**
 * Shared provider adapter interface (docs/ARCHITECTURE.md).
 * Adapters normalize status, finish reason, content-filter status, token
 * usage, latency, and redacted raw request/response payloads.
 */
export interface ModelProvider {
  id: ProviderKind;
  runPrompt(input: ModelRunInput, opts?: RunOptions): Promise<ModelRunResult>;
}
