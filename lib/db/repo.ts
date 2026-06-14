import "server-only";
import { randomUUID } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { db, ensureSchema } from "./client";
import {
  modelPresets,
  modelResults,
  promptProjects,
  promptVersions,
  runs,
} from "./schema";
import { contentHash } from "@/lib/hash";
import { DEFAULT_PROMPT_CONTENT, LOCAL_USER } from "@/lib/constants";
import type {
  ModelPreset,
  ModelResult,
  ModelRunResult,
  ModelSelection,
  PromptProject,
  PromptVersion,
  Run,
  RunSettings,
  RunStatus,
} from "@/lib/types";

const now = () => Date.now();
const newId = (prefix: string) =>
  `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 20)}`;

/* ------------------------------------------------------------------ */
/* Seed                                                               */
/* ------------------------------------------------------------------ */

/** Ensure schema + a default project with an initial version exist. */
export async function ensureSeed(): Promise<PromptProject> {
  await ensureSchema();
  const existing = await db
    .select()
    .from(promptProjects)
    .orderBy(promptProjects.createdAt)
    .limit(1);
  if (existing.length > 0) return existing[0] as PromptProject;

  const ts = now();
  const project: PromptProject = {
    id: newId("prj"),
    name: "SecOps Assistant",
    description: "Prompt filter investigation",
    createdAt: ts,
    updatedAt: ts,
  };
  await db.insert(promptProjects).values(project);
  await db.insert(promptVersions).values({
    id: newId("ver"),
    projectId: project.id,
    versionNumber: 1,
    name: "Initial draft",
    content: DEFAULT_PROMPT_CONTENT,
    contentHash: contentHash(DEFAULT_PROMPT_CONTENT),
    changeSummary: "Initial system prompt",
    createdAt: ts,
    createdBy: LOCAL_USER,
  });
  return project;
}

/* ------------------------------------------------------------------ */
/* Projects                                                           */
/* ------------------------------------------------------------------ */

export async function listProjects(): Promise<PromptProject[]> {
  await ensureSchema();
  return (await db
    .select()
    .from(promptProjects)
    .orderBy(desc(promptProjects.updatedAt))) as PromptProject[];
}

export async function createProject(input: {
  name: string;
  description?: string | null;
}): Promise<PromptProject> {
  await ensureSchema();
  const ts = now();
  const project: PromptProject = {
    id: newId("prj"),
    name: input.name,
    description: input.description ?? null,
    createdAt: ts,
    updatedAt: ts,
  };
  await db.insert(promptProjects).values(project);
  // Seed an initial empty version so the project is immediately runnable.
  await db.insert(promptVersions).values({
    id: newId("ver"),
    projectId: project.id,
    versionNumber: 1,
    name: "Initial draft",
    content: DEFAULT_PROMPT_CONTENT,
    contentHash: contentHash(DEFAULT_PROMPT_CONTENT),
    changeSummary: "Initial system prompt",
    createdAt: ts,
    createdBy: LOCAL_USER,
  });
  return project;
}

export async function getProject(id: string): Promise<PromptProject | null> {
  await ensureSchema();
  const rows = await db
    .select()
    .from(promptProjects)
    .where(eq(promptProjects.id, id))
    .limit(1);
  return (rows[0] as PromptProject) ?? null;
}

export async function countProjects(): Promise<number> {
  await ensureSchema();
  return (await db.select().from(promptProjects)).length;
}

/** Delete a project and everything under it (versions, runs, results). */
export async function deleteProject(id: string): Promise<void> {
  await ensureSchema();
  const projectRuns = (await db
    .select()
    .from(runs)
    .where(eq(runs.projectId, id))) as Run[];
  for (const r of projectRuns) {
    await db.delete(modelResults).where(eq(modelResults.runId, r.id));
  }
  await db.delete(runs).where(eq(runs.projectId, id));
  await db.delete(promptVersions).where(eq(promptVersions.projectId, id));
  await db.delete(promptProjects).where(eq(promptProjects.id, id));
}

/* ------------------------------------------------------------------ */
/* Versions                                                           */
/* ------------------------------------------------------------------ */

export async function listVersions(
  projectId: string,
): Promise<PromptVersion[]> {
  await ensureSchema();
  return (await db
    .select()
    .from(promptVersions)
    .where(eq(promptVersions.projectId, projectId))
    .orderBy(desc(promptVersions.versionNumber))) as PromptVersion[];
}

export async function getVersion(id: string): Promise<PromptVersion | null> {
  await ensureSchema();
  const rows = await db
    .select()
    .from(promptVersions)
    .where(eq(promptVersions.id, id))
    .limit(1);
  return (rows[0] as PromptVersion) ?? null;
}

/** Delete a single version and any runs (and their results) that used it. */
export async function deleteVersion(versionId: string): Promise<void> {
  await ensureSchema();
  const versionRuns = (await db
    .select()
    .from(runs)
    .where(eq(runs.promptVersionId, versionId))) as Run[];
  for (const r of versionRuns) {
    await db.delete(modelResults).where(eq(modelResults.runId, r.id));
  }
  await db.delete(runs).where(eq(runs.promptVersionId, versionId));
  await db.delete(promptVersions).where(eq(promptVersions.id, versionId));
}

export async function getLatestVersion(
  projectId: string,
): Promise<PromptVersion | null> {
  const versions = await listVersions(projectId);
  return versions[0] ?? null;
}

async function nextVersionNumber(projectId: string): Promise<number> {
  const latest = await getLatestVersion(projectId);
  return latest ? latest.versionNumber + 1 : 1;
}

export async function createVersion(
  projectId: string,
  input: {
    name: string;
    content: string;
    changeSummary?: string | null;
    createdBy?: string;
  },
): Promise<PromptVersion> {
  await ensureSchema();
  const ts = now();
  const version: PromptVersion = {
    id: newId("ver"),
    projectId,
    versionNumber: await nextVersionNumber(projectId),
    name: input.name,
    content: input.content,
    contentHash: contentHash(input.content),
    changeSummary: input.changeSummary ?? null,
    createdAt: ts,
    createdBy: input.createdBy ?? LOCAL_USER,
  };
  await db.insert(promptVersions).values(version);
  await db
    .update(promptProjects)
    .set({ updatedAt: ts })
    .where(eq(promptProjects.id, projectId));
  return version;
}

/**
 * Resolve a version snapshot for run content. Reuses the latest version when
 * the content is identical; otherwise auto-saves a new snapshot
 * (docs/FEATURES.md — "Auto-save prompt snapshot per run").
 */
export async function snapshotForRun(
  projectId: string,
  content: string,
  meta?: { name?: string; changeSummary?: string },
): Promise<PromptVersion> {
  const latest = await getLatestVersion(projectId);
  if (latest && latest.contentHash === contentHash(content)) {
    return latest;
  }
  const number = latest ? latest.versionNumber + 1 : 1;
  return createVersion(projectId, {
    name: meta?.name ?? `Auto v${number}`,
    content,
    changeSummary: meta?.changeSummary ?? null,
  });
}

/* ------------------------------------------------------------------ */
/* Runs & results                                                     */
/* ------------------------------------------------------------------ */

export async function createRun(input: {
  projectId: string;
  promptVersionId: string;
  status: RunStatus;
  settings: RunSettings;
  selectedModels: ModelSelection[];
}): Promise<Run> {
  await ensureSchema();
  const ts = now();
  const run: Run = {
    id: newId("run"),
    projectId: input.projectId,
    promptVersionId: input.promptVersionId,
    status: input.status,
    settings: input.settings,
    selectedModels: input.selectedModels,
    startedAt: ts,
    finishedAt: null,
    notes: null,
  };
  await db.insert(runs).values(run);
  return run;
}

export async function finishRun(
  runId: string,
  status: RunStatus,
): Promise<void> {
  await ensureSchema();
  await db
    .update(runs)
    .set({ status, finishedAt: now() })
    .where(eq(runs.id, runId));
}

export async function updateRun(
  runId: string,
  patch: { notes?: string | null; status?: RunStatus },
): Promise<void> {
  await ensureSchema();
  await db.update(runs).set(patch).where(eq(runs.id, runId));
}

export async function insertModelResults(
  runId: string,
  results: ModelRunResult[],
): Promise<ModelResult[]> {
  await ensureSchema();
  const ts = now();
  const rows: ModelResult[] = results.map((r) => ({
    id: newId("res"),
    runId,
    provider: r.provider,
    modelId: r.modelId,
    status: r.status,
    finishReason: r.finishReason,
    filtered: r.filtered,
    refused: r.refused,
    promptTokens: r.promptTokens,
    completionTokens: r.completionTokens,
    totalTokens: r.totalTokens,
    latencyMs: r.latencyMs,
    responseId: r.responseId,
    responseText: r.responseText,
    requestSummary: r.requestSummary,
    rawResponse: r.rawResponse,
    errorType: r.errorType,
    errorMessage: r.errorMessage,
    notes: null,
    createdAt: ts,
  }));
  if (rows.length > 0) {
    await db.insert(modelResults).values(rows);
  }
  return rows;
}

export interface RunDetail {
  run: Run;
  version: PromptVersion | null;
  results: ModelResult[];
}

export async function getRun(id: string): Promise<RunDetail | null> {
  await ensureSchema();
  const rows = await db.select().from(runs).where(eq(runs.id, id)).limit(1);
  const run = rows[0] as Run | undefined;
  if (!run) return null;
  const results = (await db
    .select()
    .from(modelResults)
    .where(eq(modelResults.runId, id))
    .orderBy(modelResults.createdAt)) as ModelResult[];
  const version = await getVersion(run.promptVersionId);
  return { run, version, results };
}

export interface RunSummary extends Run {
  filteredCount: number;
  resultCount: number;
}

export async function listRuns(
  projectId: string,
  limit = 20,
): Promise<RunSummary[]> {
  await ensureSchema();
  const runRows = (await db
    .select()
    .from(runs)
    .where(eq(runs.projectId, projectId))
    .orderBy(desc(runs.startedAt))
    .limit(limit)) as Run[];

  const summaries: RunSummary[] = [];
  for (const run of runRows) {
    const results = (await db
      .select()
      .from(modelResults)
      .where(eq(modelResults.runId, run.id))) as ModelResult[];
    summaries.push({
      ...run,
      resultCount: results.length,
      filteredCount: results.filter((r) => r.filtered).length,
    });
  }
  return summaries;
}

/** Latest result status per model across all runs of a project. */
export async function latestStatusByModel(
  projectId: string,
): Promise<Record<string, ModelResult["status"]>> {
  await ensureSchema();
  const projectRuns = (await db
    .select()
    .from(runs)
    .where(eq(runs.projectId, projectId))
    .orderBy(desc(runs.startedAt))) as Run[];

  const map: Record<string, ModelResult["status"]> = {};
  for (const run of projectRuns) {
    const results = (await db
      .select()
      .from(modelResults)
      .where(eq(modelResults.runId, run.id))) as ModelResult[];
    for (const r of results) {
      const key = `${r.provider}:${r.modelId}`;
      if (!(key in map)) map[key] = r.status;
    }
  }
  return map;
}

/* ------------------------------------------------------------------ */
/* Presets                                                            */
/* ------------------------------------------------------------------ */

export async function listPresets(): Promise<ModelPreset[]> {
  await ensureSchema();
  return (await db
    .select()
    .from(modelPresets)
    .orderBy(desc(modelPresets.updatedAt))) as ModelPreset[];
}

export async function createPreset(input: {
  name: string;
  models: ModelSelection[];
}): Promise<ModelPreset> {
  await ensureSchema();
  const ts = now();
  const preset: ModelPreset = {
    id: newId("pre"),
    name: input.name,
    models: input.models,
    createdAt: ts,
    updatedAt: ts,
  };
  await db.insert(modelPresets).values(preset);
  return preset;
}
