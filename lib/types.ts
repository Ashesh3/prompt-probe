/**
 * Core domain types for Prompt Probe.
 *
 * Framework-agnostic. Safe to import from server routes, client components,
 * and unit tests. Mirrors docs/DATA_MODEL.md and docs/API.md.
 */

/* ------------------------------------------------------------------ */
/* Providers & models                                                 */
/* ------------------------------------------------------------------ */

export type ProviderId = "anthropic" | "openai" | "google" | "copilot";

/** A model exposed by the GitHub Copilot API for the logged-in user. */
export interface CopilotModel {
  id: string;
  name: string;
  vendor: string;
  /**
   * Which Copilot API surface the model is callable through. Newer models
   * (e.g. gpt-5.x, reasoning/internal models) are only served via `/responses`,
   * not `/chat/completions`; the provider routes accordingly.
   */
  endpoint: "chat" | "responses";
}

export interface CopilotUser {
  login: string;
  avatarUrl: string | null;
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: ProviderId;
  family: string;
  contextWindow?: number;
  enabled: boolean;
}

export interface ProviderGroup {
  id: ProviderId;
  name: string;
  models: ModelInfo[];
}

export interface ModelSelection {
  provider: ProviderId;
  modelId: string;
}

/* ------------------------------------------------------------------ */
/* Run settings & tools                                               */
/* ------------------------------------------------------------------ */

export interface RunSettings {
  userMessage: string;
  maxTokens: number;
  temperature: number;
  stream: boolean;
  includeTools: boolean;
}

/**
 * A single conversation turn sent after the system prompt. The system prompt
 * itself is the editor content (promptContent); the conversation models the
 * user/assistant/tool turns that follow it. Mirrors the OpenAI/Anthropic
 * messages array (docs/API.md) — content is opaque text, never executed.
 *
 * `tool_calls` / `tool_call_id` are preserved verbatim from imported captures
 * so a tool-using agent conversation replays faithfully; the UI only edits
 * `role` and `content`.
 */
export type ConversationRole = "user" | "assistant" | "tool";

export interface ConversationMessage {
  role: ConversationRole;
  content: string;
  tool_calls?: unknown;
  tool_call_id?: string;
  name?: string;
}

/** A tool schema is treated purely as opaque data — never executed. */
export interface ToolSchema {
  name: string;
  description?: string;
  // JSON Schema-ish object; kept generic on purpose.
  input_schema?: Record<string, unknown>;
  [key: string]: unknown;
}

/* ------------------------------------------------------------------ */
/* Execution                                                          */
/* ------------------------------------------------------------------ */

export type ModelResultStatus =
  | "not_run"
  | "running"
  | "passed"
  | "content_filter"
  | "refused"
  | "error"
  | "cancelled";

export type RunStatus =
  | "queued"
  | "running"
  | "completed"
  | "cancelled"
  | "failed";

export type FinishReason =
  | "stop"
  | "length"
  | "content_filter"
  | "tool_use"
  | "refusal"
  | "error"
  | "unknown";

export type ErrorType =
  | "network_error"
  | "auth_error"
  | "rate_limited"
  | "provider_error"
  | "validation_error"
  | "cancelled"
  | "unknown";

export interface ModelRunInput {
  provider: ProviderId;
  modelId: string;
  promptContent: string;
  userMessage: string;
  /**
   * Full conversation (user/assistant turns) sent after the system prompt.
   * When omitted/empty, providers fall back to a single user turn built from
   * `userMessage` (which also drives the deterministic mock).
   */
  messages?: ConversationMessage[];
  settings: RunSettings;
  tools: ToolSchema[];
}

/** Normalized result a provider adapter returns for a single model call. */
export interface ModelRunResult {
  provider: ProviderId;
  modelId: string;
  status: ModelResultStatus;
  finishReason: FinishReason;
  filtered: boolean;
  refused: boolean;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  latencyMs: number | null;
  responseId: string | null;
  responseText: string | null;
  /** Redacted, safe-to-display summary of the outbound request. */
  requestSummary: Record<string, unknown>;
  /** Redacted, safe-to-display raw response payload. */
  rawResponse: Record<string, unknown> | null;
  errorType: ErrorType | null;
  errorMessage: string | null;
  startedAt: number;
  finishedAt: number;
}

/* ------------------------------------------------------------------ */
/* Persistence entities (docs/DATA_MODEL.md)                          */
/* ------------------------------------------------------------------ */

export interface PromptProject {
  id: string;
  name: string;
  description: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface PromptVersion {
  id: string;
  projectId: string;
  versionNumber: number;
  name: string;
  content: string;
  contentHash: string;
  changeSummary: string | null;
  createdAt: number;
  createdBy: string;
}

export interface Run {
  id: string;
  projectId: string;
  promptVersionId: string;
  status: RunStatus;
  settings: RunSettings;
  selectedModels: ModelSelection[];
  startedAt: number;
  finishedAt: number | null;
  notes: string | null;
}

export interface ModelResult
  extends Omit<ModelRunResult, "startedAt" | "finishedAt"> {
  id: string;
  runId: string;
  createdAt: number;
  notes: string | null;
}

export interface ModelPreset {
  id: string;
  name: string;
  models: ModelSelection[];
  createdAt: number;
  updatedAt: number;
}

/** A run plus aggregate counts, used in lists/timelines. */
export interface RunSummary extends Run {
  filteredCount: number;
  resultCount: number;
}

/** A run with its version and full model results. */
export interface RunDetail {
  run: Run;
  version: PromptVersion | null;
  results: ModelResult[];
}

/* ------------------------------------------------------------------ */
/* Risk analysis                                                      */
/* ------------------------------------------------------------------ */

export type RiskCategory =
  | "dual-use-security"
  | "instruction-override"
  | "bypass-compliance"
  | "tool-volume"
  | "role-harness"
  | "high-risk-term";

/** Visual family used for badges/highlights, mapped to a CSS color token. */
export type RiskColor = "policy" | "instruction" | "tool" | "override" | "role";

export interface RiskFinding {
  category: RiskCategory;
  confidence: number; // 0..1
  lineStart: number; // 1-based
  lineEnd: number; // 1-based, inclusive
  /** Character offset within lineStart where the match begins (0-based). */
  columnStart?: number;
  columnEnd?: number;
  matchedText: string;
  explanation: string;
  /** AI-only: a safer rephrasing of `matchedText` that preserves intent. */
  suggestion?: string;
}

export interface RiskCategoryMeta {
  label: string;
  badge: string;
  color: RiskColor;
  description: string;
}

export const RISK_CATEGORY_META: Record<RiskCategory, RiskCategoryMeta> = {
  "dual-use-security": {
    label: "Dual-use security wording",
    badge: "dual-use-risk",
    color: "policy",
    description:
      "Security / offensive-security terminology often associated with provider content filters.",
  },
  "high-risk-term": {
    label: "High-risk phrases",
    badge: "policy-risk",
    color: "policy",
    description:
      "Individual terms providers frequently flag regardless of surrounding context.",
  },
  "instruction-override": {
    label: "Instruction override language",
    badge: "override-risk",
    color: "override",
    description:
      "Language that asserts priority over, or overrides, system or safety instructions.",
  },
  "bypass-compliance": {
    label: "Bypass / compliance wording",
    badge: "policy-risk",
    color: "instruction",
    description:
      "Phrasing that instructs the model to bypass controls or comply unconditionally.",
  },
  "tool-volume": {
    label: "Tool schema volume",
    badge: "tool-risk",
    color: "tool",
    description:
      "Large or numerous tool/function schemas that inflate the request and can trip filters.",
  },
  "role-harness": {
    label: "User-role injected harness context",
    badge: "role-risk",
    color: "role",
    description:
      "Harness / agent scaffolding injected as user-role context that can read as roleplay.",
  },
};

/* ------------------------------------------------------------------ */
/* Capture import (docs/SECURITY.md)                                  */
/* ------------------------------------------------------------------ */

export interface CaptureMessage {
  role: string;
  content: string;
  tool_calls?: unknown;
  tool_call_id?: string;
  name?: string;
}

export interface ParsedCapture {
  systemPrompt: string | null;
  messages: CaptureMessage[];
  tools: ToolSchema[];
  settings: Partial<RunSettings>;
  /** Header/field names that were redacted before display or persistence. */
  redactions: string[];
}

/* ------------------------------------------------------------------ */
/* Diff                                                               */
/* ------------------------------------------------------------------ */

export type DiffOp = "equal" | "add" | "remove";

export interface DiffLine {
  op: DiffOp;
  /** Line number in the old document (null for additions). */
  oldLine: number | null;
  /** Line number in the new document (null for removals). */
  newLine: number | null;
  text: string;
  /** True when the line contains risky phrasing worth highlighting in a diff. */
  risky: boolean;
}

export interface DiffSummary {
  added: number;
  removed: number;
  unchanged: number;
  lines: DiffLine[];
}

/** A single model's status change between two runs. */
export interface ResultDelta {
  modelId: string;
  provider: ProviderId;
  from: ModelResultStatus | null;
  to: ModelResultStatus | null;
  changed: boolean;
}
