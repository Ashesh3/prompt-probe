import { ok, jsonError, handleError } from "@/lib/api";
import { cookies } from "next/headers";
import {
  requestDeviceCode,
  pollForToken,
  getGithubUser,
} from "@/lib/copilot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEVICE_COOKIE = "pp_device_code";
const TOKEN_COOKIE = "pp_gh_token";

const secure = process.env.NODE_ENV === "production";

/** GET = login status (does an httpOnly GitHub token cookie exist + valid). */
export async function GET() {
  try {
    const c = await cookies();
    const token = c.get(TOKEN_COOKIE)?.value;
    if (!token) return ok({ loggedIn: false });
    try {
      const user = await getGithubUser(token);
      return ok({ loggedIn: true, user });
    } catch {
      c.delete(TOKEN_COOKIE);
      return ok({ loggedIn: false });
    }
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: Request) {
  try {
    const { action } = (await req.json()) as { action?: string };
    const c = await cookies();

    if (action === "initiate") {
      const dc = await requestDeviceCode();
      c.set(DEVICE_COOKIE, dc.device_code, {
        httpOnly: true,
        sameSite: "lax",
        secure,
        path: "/",
        maxAge: dc.expires_in,
      });
      return ok({
        userCode: dc.user_code,
        verificationUri: dc.verification_uri,
        interval: dc.interval,
        expiresIn: dc.expires_in,
      });
    }

    if (action === "poll") {
      const deviceCode = c.get(DEVICE_COOKIE)?.value;
      if (!deviceCode) return jsonError("No pending login", 400);
      const result = await pollForToken(deviceCode);

      if (result.access_token) {
        c.set(TOKEN_COOKIE, result.access_token, {
          httpOnly: true,
          sameSite: "lax",
          secure,
          path: "/",
          maxAge: 60 * 60 * 24 * 30,
        });
        c.delete(DEVICE_COOKIE);
        let user = null;
        try {
          user = await getGithubUser(result.access_token);
        } catch {
          /* user info is best-effort */
        }
        return ok({ status: "authorized", user });
      }
      if (result.error === "authorization_pending" || result.error === "slow_down") {
        return ok({ status: "pending", slowDown: result.error === "slow_down" });
      }
      c.delete(DEVICE_COOKIE);
      return ok({ status: "error", error: result.error ?? "login_failed" });
    }

    if (action === "logout") {
      c.delete(TOKEN_COOKIE);
      c.delete(DEVICE_COOKIE);
      return ok({ loggedIn: false });
    }

    return jsonError("Invalid action", 400);
  } catch (e) {
    return handleError(e);
  }
}
