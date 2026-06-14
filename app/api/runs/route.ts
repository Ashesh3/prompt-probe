import { ok, parseBody, handleError } from "@/lib/api";
import { createRunSchema } from "@/lib/validation/schemas";
import {
  getProject,
  ensureSeed,
  snapshotForRun,
  createRun,
  finishRun,
  insertModelResults,
} from "@/lib/db/repo";
import { runMatrix } from "@/lib/providers";
import { getCopilotToken, getCopilotEndpointMap } from "@/lib/copilot";
import { cookies } from "next/headers";
import { DEFAULT_SETTINGS } from "@/lib/constants";
import type { RunSettings, RunStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const parsed = await parseBody(req, createRunSchema);
    if (!parsed.ok) return parsed.response;
    const body = parsed.data;

    const project = (await getProject(body.projectId)) ?? (await ensureSeed());

    // The conversation (user/assistant turns) is the real input; userMessage is
    // kept as the first user turn for the run record and the deterministic mock.
    const firstUser = body.messages?.find((m) => m.role === "user")?.content;
    const settings: RunSettings = {
      ...DEFAULT_SETTINGS,
      ...(body.settings ?? {}),
      userMessage:
        firstUser ??
        body.userMessage ??
        body.settings?.userMessage ??
        DEFAULT_SETTINGS.userMessage,
    };

    const version = await snapshotForRun(project.id, body.promptContent, {
      name: body.versionName,
      changeSummary: body.changeSummary,
    });

    const run = await createRun({
      projectId: project.id,
      promptVersionId: version.id,
      status: "running",
      settings,
      selectedModels: body.models,
    });

    // Exchange the GitHub OAuth token (httpOnly cookie) for a Copilot token
    // when any selected model is a real Copilot model, and resolve each
    // model's endpoint so /responses-only models are routed correctly.
    let copilotToken: string | undefined;
    let copilotEndpoints: Record<string, "chat" | "responses"> | undefined;
    if (body.models.some((m) => m.provider === "copilot")) {
      const ghToken = (await cookies()).get("pp_gh_token")?.value;
      if (ghToken) {
        try {
          copilotToken = await getCopilotToken(ghToken);
          copilotEndpoints = await getCopilotEndpointMap(ghToken);
        } catch {
          // Leave undefined — the adapter returns a normalized auth_error.
        }
      }
    }

    const results = await runMatrix(
      {
        promptContent: body.promptContent,
        userMessage: settings.userMessage,
        messages: body.messages,
        settings,
        tools: body.tools,
        models: body.models,
      },
      { simulateDelay: true, signal: req.signal, copilotToken, copilotEndpoints },
    );

    const stored = await insertModelResults(run.id, results);
    const status: RunStatus = results.some((r) => r.status === "cancelled")
      ? "cancelled"
      : "completed";
    await finishRun(run.id, status);

    return ok({
      runId: run.id,
      promptVersionId: version.id,
      version: {
        id: version.id,
        versionNumber: version.versionNumber,
        name: version.name,
        contentHash: version.contentHash,
      },
      status,
      startedAt: run.startedAt,
      finishedAt: Date.now(),
      results: stored,
    });
  } catch (e) {
    return handleError(e);
  }
}
