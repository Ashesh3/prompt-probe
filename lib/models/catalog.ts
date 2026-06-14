import type { ModelInfo, ModelSelection, ProviderGroup, ProviderId } from "@/lib/types";

/**
 * Static model catalog. Model ids follow the families referenced in
 * docs/PENCIL_PROMPT.md and docs/API.md. The mock provider can execute any of
 * these without credentials; real adapters are opt-in (docs/TESTING.md).
 */
export const PROVIDER_GROUPS: ProviderGroup[] = [
  {
    id: "anthropic",
    name: "Anthropic",
    models: [
      {
        id: "claude-fable-5",
        name: "Claude Fable 5",
        provider: "anthropic",
        family: "Claude",
        contextWindow: 200000,
        enabled: true,
      },
      {
        id: "claude-opus-4-8",
        name: "Claude Opus 4.8",
        provider: "anthropic",
        family: "Claude",
        contextWindow: 200000,
        enabled: true,
      },
      {
        id: "claude-sonnet-4-6",
        name: "Claude Sonnet 4.6",
        provider: "anthropic",
        family: "Claude",
        contextWindow: 200000,
        enabled: true,
      },
      {
        id: "claude-haiku-4-5",
        name: "Claude Haiku 4.5",
        provider: "anthropic",
        family: "Claude",
        contextWindow: 200000,
        enabled: true,
      },
    ],
  },
  {
    id: "openai",
    name: "OpenAI",
    models: [
      {
        id: "gpt-5",
        name: "GPT-5",
        provider: "openai",
        family: "GPT",
        contextWindow: 400000,
        enabled: true,
      },
      {
        id: "gpt-5-mini",
        name: "GPT-5 Mini",
        provider: "openai",
        family: "GPT",
        contextWindow: 400000,
        enabled: true,
      },
    ],
  },
  {
    id: "google",
    name: "Google",
    models: [
      {
        id: "gemini-2.5-pro",
        name: "Gemini 2.5 Pro",
        provider: "google",
        family: "Gemini",
        contextWindow: 1000000,
        enabled: true,
      },
    ],
  },
];

export const ALL_MODELS: ModelInfo[] = PROVIDER_GROUPS.flatMap((g) => g.models);

const MODEL_INDEX = new Map<string, ModelInfo>(
  ALL_MODELS.map((m) => [`${m.provider}:${m.id}`, m]),
);

export function findModel(
  provider: ProviderId,
  modelId: string,
): ModelInfo | undefined {
  return MODEL_INDEX.get(`${provider}:${modelId}`);
}

export function modelKey(sel: ModelSelection): string {
  return `${sel.provider}:${sel.modelId}`;
}

/** Default selection shown on first load: one model per provider. */
export const DEFAULT_SELECTION: ModelSelection[] = [
  { provider: "anthropic", modelId: "claude-fable-5" },
  { provider: "anthropic", modelId: "claude-opus-4-8" },
  { provider: "openai", modelId: "gpt-5" },
  { provider: "google", modelId: "gemini-2.5-pro" },
];

export const PROVIDER_LABEL: Record<ProviderId, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  google: "Google",
  copilot: "GitHub Copilot",
};
