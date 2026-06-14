import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import type {
  ModelSelection,
  RunSettings,
  RunStatus,
  ModelResultStatus,
  FinishReason,
  ErrorType,
  ProviderId,
  RiskCategory,
} from "@/lib/types";

export const promptProjects = sqliteTable("prompt_projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const promptVersions = sqliteTable("prompt_versions", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  versionNumber: integer("version_number").notNull(),
  name: text("name").notNull(),
  content: text("content").notNull(),
  contentHash: text("content_hash").notNull(),
  changeSummary: text("change_summary"),
  createdAt: integer("created_at").notNull(),
  createdBy: text("created_by").notNull(),
});

export const runs = sqliteTable("runs", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  promptVersionId: text("prompt_version_id").notNull(),
  status: text("status").$type<RunStatus>().notNull(),
  settings: text("settings_json", { mode: "json" })
    .$type<RunSettings>()
    .notNull(),
  selectedModels: text("selected_models_json", { mode: "json" })
    .$type<ModelSelection[]>()
    .notNull(),
  startedAt: integer("started_at").notNull(),
  finishedAt: integer("finished_at"),
  notes: text("notes"),
});

export const modelResults = sqliteTable("model_results", {
  id: text("id").primaryKey(),
  runId: text("run_id").notNull(),
  provider: text("provider").$type<ProviderId>().notNull(),
  modelId: text("model_id").notNull(),
  status: text("status").$type<ModelResultStatus>().notNull(),
  finishReason: text("finish_reason").$type<FinishReason>().notNull(),
  filtered: integer("filtered", { mode: "boolean" }).notNull(),
  refused: integer("refused", { mode: "boolean" }).notNull(),
  promptTokens: integer("prompt_tokens"),
  completionTokens: integer("completion_tokens"),
  totalTokens: integer("total_tokens"),
  latencyMs: integer("latency_ms"),
  responseId: text("response_id"),
  responseText: text("response_text"),
  requestSummary: text("request_summary_json", { mode: "json" }).$type<
    Record<string, unknown>
  >(),
  rawResponse: text("raw_response_json", { mode: "json" }).$type<
    Record<string, unknown>
  >(),
  errorType: text("error_type").$type<ErrorType>(),
  errorMessage: text("error_message"),
  notes: text("notes"),
  createdAt: integer("created_at").notNull(),
});

export const modelPresets = sqliteTable("model_presets", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  models: text("models_json", { mode: "json" })
    .$type<ModelSelection[]>()
    .notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const riskFindings = sqliteTable("risk_findings", {
  id: text("id").primaryKey(),
  promptVersionId: text("prompt_version_id").notNull(),
  category: text("category").$type<RiskCategory>().notNull(),
  confidence: real("confidence").notNull(),
  lineStart: integer("line_start").notNull(),
  lineEnd: integer("line_end").notNull(),
  matchedText: text("matched_text").notNull(),
  explanation: text("explanation").notNull(),
  createdAt: integer("created_at").notNull(),
});
