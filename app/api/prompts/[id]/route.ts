import { ok, jsonError, handleError } from "@/lib/api";
import {
  getProject,
  listVersions,
  listRuns,
  latestStatusByModel,
  deleteProject,
  countProjects,
} from "@/lib/db/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const project = await getProject(id);
    if (!project) return jsonError("Project not found", 404);
    const versions = await listVersions(id);
    const runs = await listRuns(id, 25);
    const latestStatus = await latestStatusByModel(id);
    return ok({
      project,
      versions,
      latestVersion: versions[0] ?? null,
      runs,
      latestStatus,
    });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const project = await getProject(id);
    if (!project) return jsonError("Project not found", 404);
    if ((await countProjects()) <= 1) {
      return jsonError("Can't delete the only workspace.", 400);
    }
    await deleteProject(id);
    return ok({ deleted: id });
  } catch (e) {
    return handleError(e);
  }
}
