import type {
  ModelResultStatus,
  RunSettings,
  RiskColor,
} from "@/lib/types";

/** docs/REQUIREMENTS.md — default user message. */
export const DEFAULT_USER_MESSAGE = "Hello there, what can you help me with?";

/** docs/TESTING.md — known-benign acceptance prompt. */
export const DEFAULT_PROMPT_CONTENT = `You are a concise coding assistant.

Help the user write, debug, and reason about code. Prefer small, focused
examples. Ask a clarifying question only when the request is ambiguous.`;

export const DEFAULT_SETTINGS: RunSettings = {
  userMessage: DEFAULT_USER_MESSAGE,
  maxTokens: 256,
  temperature: 1,
  stream: false,
  includeTools: false,
};

export const LOCAL_USER = "local";

/** Keys used to persist the working draft in the browser. */
export const DRAFT_STORAGE_KEY = "prompt-probe:draft:v1";

/* ------------------------------------------------------------------ */
/* Status presentation                                                */
/* ------------------------------------------------------------------ */

export interface StatusMeta {
  label: string;
  /** Tailwind color tokens defined in app/globals.css. */
  fg: string;
  bg: string;
  border: string;
  dot: string;
  /** lucide-react icon name. */
  icon: string;
}

export const STATUS_META: Record<ModelResultStatus, StatusMeta> = {
  passed: {
    label: "Passed",
    fg: "text-pass",
    bg: "bg-pass-bg",
    border: "border-pass/30",
    dot: "bg-pass",
    icon: "check-circle-2",
  },
  content_filter: {
    label: "Content filter",
    fg: "text-filter",
    bg: "bg-filter-bg",
    border: "border-filter/40",
    dot: "bg-filter",
    icon: "shield-alert",
  },
  refused: {
    label: "Refused",
    fg: "text-refusal",
    bg: "bg-refusal-bg",
    border: "border-refusal/40",
    dot: "bg-refusal",
    icon: "ban",
  },
  error: {
    label: "Error",
    fg: "text-faint",
    bg: "bg-notrun-bg",
    border: "border-strong",
    dot: "bg-faint",
    icon: "triangle-alert",
  },
  running: {
    label: "Running",
    fg: "text-running",
    bg: "bg-running-bg",
    border: "border-running/40",
    dot: "bg-running",
    icon: "loader",
  },
  cancelled: {
    label: "Cancelled",
    fg: "text-faint",
    bg: "bg-notrun-bg",
    border: "border-strong",
    dot: "bg-faint",
    icon: "circle-slash",
  },
  not_run: {
    label: "Not run",
    fg: "text-faint",
    bg: "bg-notrun-bg",
    border: "border-strong",
    dot: "bg-faint",
    icon: "circle-dashed",
  },
};

/** Risk color family → Tailwind token + lucide icon. */
export const RISK_COLOR_META: Record<
  RiskColor,
  { fg: string; bg: string; border: string; icon: string }
> = {
  policy: {
    fg: "text-risk-policy",
    bg: "bg-risk-policy/12",
    border: "border-risk-policy/40",
    icon: "shield-alert",
  },
  instruction: {
    fg: "text-risk-instruction",
    bg: "bg-risk-instruction/12",
    border: "border-risk-instruction/40",
    icon: "octagon-alert",
  },
  tool: {
    fg: "text-risk-tool",
    bg: "bg-risk-tool/12",
    border: "border-risk-tool/40",
    icon: "wrench",
  },
  override: {
    fg: "text-risk-override",
    bg: "bg-risk-override/12",
    border: "border-risk-override/40",
    icon: "arrow-up-narrow-wide",
  },
  role: {
    fg: "text-risk-role",
    bg: "bg-risk-role/12",
    border: "border-risk-role/40",
    icon: "user-cog",
  },
};
