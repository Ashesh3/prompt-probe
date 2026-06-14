import { ok, parseBody, handleError } from "@/lib/api";
import { createVersionSchema } from "@/lib/validation/schemas";
import { createVersion, listVersions } from "@/lib/db/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    return ok({ versions: await listVersions(id) });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const parsed = await parseBody(req, createVersionSchema);
    if (!parsed.ok) return parsed.response;
    const version = await createVersion(id, parsed.data);
    return ok({ version }, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
