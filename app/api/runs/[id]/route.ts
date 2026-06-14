import { ok, jsonError, parseBody, handleError } from "@/lib/api";
import { updateRunSchema } from "@/lib/validation/schemas";
import { getRun, updateRun } from "@/lib/db/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const detail = await getRun(id);
    if (!detail) return jsonError("Run not found", 404);
    return ok(detail);
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const parsed = await parseBody(req, updateRunSchema);
    if (!parsed.ok) return parsed.response;
    await updateRun(id, parsed.data);
    const detail = await getRun(id);
    if (!detail) return jsonError("Run not found", 404);
    return ok(detail);
  } catch (e) {
    return handleError(e);
  }
}
