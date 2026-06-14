import { z } from "zod";

export const providerIdSchema = z.enum([
  "anthropic",
  "openai",
  "google",
  "copilot",
]);

export const modelSelectionSchema = z.object({
  provider: providerIdSchema,
  modelId: z.string().min(1),
});

export const conversationMessageSchema = z
  .object({
    role: z.enum(["user", "assistant", "tool"]),
    content: z.string(),
    tool_calls: z.unknown().optional(),
    tool_call_id: z.string().optional(),
    name: z.string().optional(),
  })
  .passthrough();

export const runSettingsSchema = z.object({
  userMessage: z.string().default("Hello there, what can you help me with?"),
  maxTokens: z.number().int().min(1).max(200000).default(256),
  temperature: z.number().min(0).max(2).default(1),
  stream: z.boolean().default(false),
  includeTools: z.boolean().default(false),
});

/**
 * A tool/function schema is opaque data (never executed). Captures arrive in
 * different shapes — Anthropic (`{ name, input_schema }`) and OpenAI
 * (`{ type: "function", function: { name, parameters } }`) — so normalize a
 * top-level `name` before validating, instead of rejecting the run.
 */
export const toolSchema = z.preprocess(
  (val) => {
    if (val && typeof val === "object" && !Array.isArray(val)) {
      const v = { ...(val as Record<string, unknown>) };
      if (typeof v.name !== "string" || v.name.length === 0) {
        const fn = v.function as Record<string, unknown> | undefined;
        const fnName =
          fn && typeof fn.name === "string" && fn.name.length > 0
            ? fn.name
            : undefined;
        v.name = fnName ?? "tool";
      }
      return v;
    }
    return val;
  },
  z
    .object({
      name: z.string(),
      description: z.string().optional(),
      input_schema: z.record(z.string(), z.unknown()).optional(),
    })
    .passthrough(),
);

/* ---- POST /api/prompts ---- */
export const createProjectSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
});

/* ---- POST /api/prompts/:id/versions ---- */
export const createVersionSchema = z.object({
  name: z.string().min(1).max(200),
  content: z.string(),
  changeSummary: z.string().max(2000).optional(),
});

/* ---- POST /api/runs ---- */
export const createRunSchema = z.object({
  projectId: z.string().min(1),
  promptContent: z.string(),
  userMessage: z.string().default("Hello there, what can you help me with?"),
  messages: z.array(conversationMessageSchema).optional(),
  models: z.array(modelSelectionSchema).min(1),
  settings: runSettingsSchema.partial().optional(),
  tools: z.array(toolSchema).default([]),
  versionName: z.string().optional(),
  changeSummary: z.string().optional(),
});

/* ---- POST /api/risk/analyze ---- */
export const analyzeRiskSchema = z.object({
  content: z.string(),
  tools: z.array(toolSchema).optional(),
});

/* ---- POST /api/risk/ai-analyze ---- */
export const aiAnalyzeSchema = z.object({
  content: z.string(),
  model: z.string().min(1),
  tools: z.array(toolSchema).optional(),
});

/* ---- POST /api/import/capture ---- */
export const importCaptureSchema = z.object({
  text: z.string().min(1),
});

/* ---- PATCH run notes / result notes ---- */
export const updateRunSchema = z.object({
  notes: z.string().max(4000).nullable().optional(),
  status: z
    .enum(["queued", "running", "completed", "cancelled", "failed"])
    .optional(),
});

export const createPresetSchema = z.object({
  name: z.string().min(1).max(120),
  models: z.array(modelSelectionSchema).min(1),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type CreateVersionInput = z.infer<typeof createVersionSchema>;
export type CreateRunInput = z.infer<typeof createRunSchema>;
export type AnalyzeRiskInput = z.infer<typeof analyzeRiskSchema>;
export type ImportCaptureInput = z.infer<typeof importCaptureSchema>;
