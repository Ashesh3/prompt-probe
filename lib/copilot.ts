import "server-only";
import type { CopilotModel, CopilotUser } from "@/lib/types";

/**
 * GitHub Copilot integration (device-flow OAuth + Copilot token exchange).
 *
 * Mirrors the official Copilot Chat client handshake:
 *   GitHub device flow  ->  user OAuth token (gho_…)
 *   -> exchange at copilot_internal/v2/token  ->  short-lived Copilot token
 *   -> call api.githubcopilot.com (OpenAI-compatible).
 *
 * The user OAuth token is held only in an httpOnly cookie (see the auth route);
 * it never reaches the browser (docs/SECURITY.md).
 */

export const GITHUB_CLIENT_ID = "Iv1.b507a08c87ecfe98"; // GitHub Copilot OAuth app
const COPILOT_VERSION = "0.26.7";
export const EDITOR_VERSION = "vscode/1.104.3";
export const EDITOR_PLUGIN_VERSION = `copilot-chat/${COPILOT_VERSION}`;
export const COPILOT_USER_AGENT = `GitHubCopilotChat/${COPILOT_VERSION}`;
/** GitHub token-exchange / user REST API version. */
export const COPILOT_API_VERSION = "2025-04-01";
/**
 * Data-plane version for `/chat/completions` and `/responses`. Mirrors the
 * current Copilot Chat client; older versions reject newer models served via
 * the Responses API.
 */
export const COPILOT_DATA_API_VERSION = "2026-01-09";
/**
 * Model-listing version. Returns `supported_endpoints` + full `capabilities`,
 * which we use to route each model to the surface it actually supports.
 */
export const COPILOT_MODELS_API_VERSION = "2026-06-01";

const GH = "https://github.com";
const JSON_HEADERS = { "content-type": "application/json", accept: "application/json" };

export function ghAuthHeaders(githubToken: string): Record<string, string> {
  return {
    ...JSON_HEADERS,
    authorization: `token ${githubToken}`,
    "editor-version": EDITOR_VERSION,
    "editor-plugin-version": EDITOR_PLUGIN_VERSION,
    "user-agent": COPILOT_USER_AGENT,
    "x-github-api-version": COPILOT_API_VERSION,
    "x-vscode-user-agent-library-version": "electron-fetch",
  };
}

export function copilotApiHeaders(
  copilotToken: string,
  apiVersion: string = COPILOT_DATA_API_VERSION,
): Record<string, string> {
  return {
    Authorization: `Bearer ${copilotToken}`,
    "content-type": "application/json",
    "copilot-integration-id": "vscode-chat",
    "editor-version": EDITOR_VERSION,
    "editor-plugin-version": EDITOR_PLUGIN_VERSION,
    "user-agent": COPILOT_USER_AGENT,
    "openai-intent": "conversation-panel",
    "x-github-api-version": apiVersion,
  };
}

/* ------------------------------------------------------------------ */
/* Device flow                                                        */
/* ------------------------------------------------------------------ */

export interface DeviceCode {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

export async function requestDeviceCode(): Promise<DeviceCode> {
  const res = await fetch(`${GH}/login/device/code`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ client_id: GITHUB_CLIENT_ID, scope: "read:user" }),
  });
  if (!res.ok) throw new Error(`Device code request failed (${res.status})`);
  return (await res.json()) as DeviceCode;
}

export interface PollResult {
  access_token?: string;
  error?: string;
}

export async function pollForToken(deviceCode: string): Promise<PollResult> {
  const res = await fetch(`${GH}/login/oauth/access_token`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({
      client_id: GITHUB_CLIENT_ID,
      device_code: deviceCode,
      grant_type: "urn:ietf:params:oauth:grant-type:device_code",
    }),
  });
  if (!res.ok) return { error: "poll_failed" };
  return (await res.json()) as PollResult;
}

export async function getGithubUser(githubToken: string): Promise<CopilotUser> {
  const res = await fetch("https://api.github.com/user", {
    headers: { ...JSON_HEADERS, authorization: `token ${githubToken}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch GitHub user (${res.status})`);
  const data = (await res.json()) as { login: string; avatar_url?: string };
  return { login: data.login, avatarUrl: data.avatar_url ?? null };
}

/* ------------------------------------------------------------------ */
/* Copilot token exchange (cached per GitHub token)                   */
/* ------------------------------------------------------------------ */

const tokenCache = new Map<string, { token: string; expiresAt: number }>();

export async function getCopilotToken(githubToken: string): Promise<string> {
  const cached = tokenCache.get(githubToken);
  if (cached && cached.expiresAt - 60 > Math.floor(Date.now() / 1000)) {
    return cached.token;
  }
  const res = await fetch("https://api.github.com/copilot_internal/v2/token", {
    headers: ghAuthHeaders(githubToken),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Copilot token exchange failed (${res.status}): ${text.slice(0, 200)}`);
  }
  const data = (await res.json()) as { token: string; expires_at?: number };
  tokenCache.set(githubToken, {
    token: data.token,
    expiresAt: data.expires_at ?? Math.floor(Date.now() / 1000) + 1500,
  });
  return data.token;
}

/* ------------------------------------------------------------------ */
/* Models                                                             */
/* ------------------------------------------------------------------ */

interface RawCopilotModel {
  id: string;
  name?: string;
  vendor?: string;
  model_picker_enabled?: boolean;
  capabilities?: { type?: string };
  supported_endpoints?: string[];
}

/**
 * Decide which Copilot API surface a model is testable through.
 *
 * The `/models` listing reports `supported_endpoints` per model. Newer models
 * (gpt-5.x, reasoning/internal models) only support `/responses`; embeddings
 * models only support `/embeddings`. Returns null when the model can't run a
 * chat-style prompt at all, so it is excluded from the selectable catalog.
 */
function resolveEndpoint(m: RawCopilotModel): "chat" | "responses" | null {
  const eps = m.supported_endpoints;
  if (eps && eps.length > 0) {
    if (eps.includes("/chat/completions")) return "chat";
    if (eps.includes("/responses")) return "responses";
    return null; // e.g. ["/embeddings"] — not a chat surface
  }
  // Older API responses omit supported_endpoints — fall back to capability type.
  if (m.capabilities?.type && m.capabilities.type !== "chat") return null;
  return "chat";
}

export async function listCopilotModels(githubToken: string): Promise<CopilotModel[]> {
  const copilotToken = await getCopilotToken(githubToken);
  const res = await fetch("https://api.githubcopilot.com/models", {
    headers: copilotApiHeaders(copilotToken, COPILOT_MODELS_API_VERSION),
  });
  if (!res.ok) throw new Error(`Failed to list Copilot models (${res.status})`);
  const data = (await res.json()) as { data?: RawCopilotModel[] };

  const seen = new Set<string>();
  const models: CopilotModel[] = [];
  for (const m of data.data ?? []) {
    if (!m.id) continue;
    if (m.model_picker_enabled === false) continue;
    if (seen.has(m.id)) continue;
    const endpoint = resolveEndpoint(m);
    if (!endpoint) continue; // skip embeddings-only / non-chat models
    seen.add(m.id);
    models.push({
      id: m.id,
      name: m.name ?? m.id,
      vendor: m.vendor ?? "",
      endpoint,
    });
  }
  return models;
}

/**
 * Map of `modelId -> endpoint`, used to route the run matrix server-side so a
 * `/responses`-only model is never sent to `/chat/completions`.
 */
export async function getCopilotEndpointMap(
  githubToken: string,
): Promise<Record<string, "chat" | "responses">> {
  const models = await listCopilotModels(githubToken);
  const map: Record<string, "chat" | "responses"> = {};
  for (const m of models) map[m.id] = m.endpoint;
  return map;
}
