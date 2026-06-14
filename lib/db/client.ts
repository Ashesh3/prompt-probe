import "server-only";
import { drizzle } from "drizzle-orm/libsql";
import { createClient, type Client } from "@libsql/client";
import * as schema from "./schema";

const url = process.env.DATABASE_URL ?? "file:./prompt-probe.db";

// Reuse the client across Next.js hot reloads / route invocations.
const globalForDb = globalThis as unknown as {
  __ppClient?: Client;
  __ppSchemaReady?: Promise<void>;
};

const client = globalForDb.__ppClient ?? createClient({ url });
if (process.env.NODE_ENV !== "production") globalForDb.__ppClient = client;

export const db = drizzle(client, { schema });

const DDL = `
CREATE TABLE IF NOT EXISTS prompt_projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS prompt_versions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  change_summary TEXT,
  created_at INTEGER NOT NULL,
  created_by TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_versions_project ON prompt_versions (project_id);

CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  prompt_version_id TEXT NOT NULL,
  status TEXT NOT NULL,
  settings_json TEXT NOT NULL,
  selected_models_json TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  finished_at INTEGER,
  notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_runs_project ON runs (project_id);
CREATE INDEX IF NOT EXISTS idx_runs_version ON runs (prompt_version_id);

CREATE TABLE IF NOT EXISTS model_results (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  model_id TEXT NOT NULL,
  status TEXT NOT NULL,
  finish_reason TEXT NOT NULL,
  filtered INTEGER NOT NULL,
  refused INTEGER NOT NULL,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  total_tokens INTEGER,
  latency_ms INTEGER,
  response_id TEXT,
  response_text TEXT,
  request_summary_json TEXT,
  raw_response_json TEXT,
  error_type TEXT,
  error_message TEXT,
  notes TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_results_run ON model_results (run_id);

CREATE TABLE IF NOT EXISTS model_presets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  models_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS risk_findings (
  id TEXT PRIMARY KEY,
  prompt_version_id TEXT NOT NULL,
  category TEXT NOT NULL,
  confidence REAL NOT NULL,
  line_start INTEGER NOT NULL,
  line_end INTEGER NOT NULL,
  matched_text TEXT NOT NULL,
  explanation TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_findings_version ON risk_findings (prompt_version_id);
`;

/** Idempotently create tables. Cached so it runs at most once per process. */
export function ensureSchema(): Promise<void> {
  if (!globalForDb.__ppSchemaReady) {
    globalForDb.__ppSchemaReady = client.executeMultiple(DDL);
  }
  return globalForDb.__ppSchemaReady;
}

export { client };
