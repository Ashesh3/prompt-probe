import { ok } from "@/lib/api";
import { PROVIDER_GROUPS } from "@/lib/models/catalog";

export const runtime = "nodejs";

export async function GET() {
  return ok({ providers: PROVIDER_GROUPS });
}
