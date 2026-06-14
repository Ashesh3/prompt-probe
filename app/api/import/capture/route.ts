import { ok, parseBody, handleError } from "@/lib/api";
import { importCaptureSchema } from "@/lib/validation/schemas";
import { parseCapture } from "@/lib/import/capture";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const parsed = await parseBody(req, importCaptureSchema);
    if (!parsed.ok) return parsed.response;
    const result = parseCapture(parsed.data.text);
    return ok(result);
  } catch (e) {
    return handleError(e);
  }
}
