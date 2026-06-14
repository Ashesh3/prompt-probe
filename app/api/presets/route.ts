import { ok, parseBody, handleError } from "@/lib/api";
import { createPresetSchema } from "@/lib/validation/schemas";
import { createPreset, listPresets } from "@/lib/db/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return ok({ presets: await listPresets() });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: Request) {
  try {
    const parsed = await parseBody(req, createPresetSchema);
    if (!parsed.ok) return parsed.response;
    const preset = await createPreset(parsed.data);
    return ok({ preset }, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
