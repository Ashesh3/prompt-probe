import { NextResponse } from "next/server";
import { ZodError, type ZodType, type z } from "zod";

export function ok<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json(data, init);
}

export function jsonError(
  message: string,
  status = 400,
  extra?: Record<string, unknown>,
): NextResponse {
  return NextResponse.json({ error: message, ...extra }, { status });
}

/** Parse + validate a JSON request body against a Zod schema. */
export async function parseBody<S extends ZodType>(
  req: Request,
  schema: S,
): Promise<
  { ok: true; data: z.infer<S> } | { ok: false; response: NextResponse }
> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { ok: false, response: jsonError("Invalid JSON body", 400) };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      response: jsonError("Validation failed", 422, {
        issues: parsed.error.issues,
      }),
    };
  }
  return { ok: true, data: parsed.data };
}

/** Wrap a handler so thrown errors return a normalized 500 (no secrets). */
export function handleError(e: unknown): NextResponse {
  if (e instanceof ZodError) {
    return jsonError("Validation failed", 422, { issues: e.issues });
  }
  const message = e instanceof Error ? e.message : "Unknown error";
  return jsonError(message, 500);
}
