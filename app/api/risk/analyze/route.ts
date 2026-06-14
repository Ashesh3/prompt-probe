import { ok, parseBody, handleError } from "@/lib/api";
import { analyzeRiskSchema } from "@/lib/validation/schemas";
import { analyzeRisk } from "@/lib/risk/scanner";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const parsed = await parseBody(req, analyzeRiskSchema);
    if (!parsed.ok) return parsed.response;
    const findings = analyzeRisk(parsed.data.content, parsed.data.tools);
    return ok({ findings });
  } catch (e) {
    return handleError(e);
  }
}
