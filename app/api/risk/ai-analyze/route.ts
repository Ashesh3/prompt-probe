import { ok, parseBody, jsonError, handleError } from "@/lib/api";
import { aiAnalyzeSchema } from "@/lib/validation/schemas";
import { cookies } from "next/headers";
import { getCopilotToken, getCopilotEndpointMap } from "@/lib/copilot";
import { analyzeWithModel } from "@/lib/risk/ai-analyze";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * AI-assisted risk analysis. Runs the active prompt/message through a Copilot
 * model and returns flagged spans. The GitHub token stays in its httpOnly
 * cookie and is exchanged server-side (docs/SECURITY.md).
 */
export async function POST(req: Request) {
  try {
    const parsed = await parseBody(req, aiAnalyzeSchema);
    if (!parsed.ok) return parsed.response;
    const { content, model } = parsed.data;
    if (!content.trim()) return ok({ findings: [], model });

    const ghToken = (await cookies()).get("pp_gh_token")?.value;
    if (!ghToken) {
      return jsonError("Connect GitHub Copilot to use AI analysis.", 401);
    }

    const token = await getCopilotToken(ghToken);
    let endpoint: "chat" | "responses" = "chat";
    try {
      const endpoints = await getCopilotEndpointMap(ghToken);
      endpoint = endpoints[model] ?? "chat";
    } catch {
      // Fall back to chat (with the adapter's reactive /responses fallback).
    }

    const findings = await analyzeWithModel(content, model, token, endpoint);
    return ok({ findings, model });
  } catch (e) {
    return handleError(e);
  }
}
