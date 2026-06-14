import { ok, handleError } from "@/lib/api";
import { cookies } from "next/headers";
import { listCopilotModels } from "@/lib/copilot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Lists Copilot models available to the logged-in user. */
export async function GET() {
  try {
    const token = (await cookies()).get("pp_gh_token")?.value;
    if (!token) return ok({ loggedIn: false, models: [] });
    const models = await listCopilotModels(token);
    return ok({ loggedIn: true, models });
  } catch (e) {
    return handleError(e);
  }
}
