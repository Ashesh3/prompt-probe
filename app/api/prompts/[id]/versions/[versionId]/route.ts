import { ok, jsonError, handleError } from "@/lib/api";
import { getVersion, deleteVersion } from "@/lib/db/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; versionId: string }> },
) {
  try {
    const { versionId } = await params;
    const version = await getVersion(versionId);
    if (!version) return jsonError("Version not found", 404);
    await deleteVersion(versionId);
    return ok({ deleted: versionId });
  } catch (e) {
    return handleError(e);
  }
}
