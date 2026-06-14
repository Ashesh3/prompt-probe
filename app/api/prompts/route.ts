import { ok, parseBody, handleError } from "@/lib/api";
import { createProjectSchema } from "@/lib/validation/schemas";
import { createProject, ensureSeed, listProjects } from "@/lib/db/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureSeed();
    const projects = await listProjects();
    return ok({ projects });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: Request) {
  try {
    const parsed = await parseBody(req, createProjectSchema);
    if (!parsed.ok) return parsed.response;
    const project = await createProject(parsed.data);
    return ok({ project }, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
