/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * POST /api/referrals/attribute
 *
 * Server-side referral attribution triggered once per session after a user
 * signs in for the first time. The cpc_ref cookie is HttpOnly so JavaScript
 * cannot read it — this endpoint runs on the server and reads it directly
 * from the Cookie request header.
 *
 * Flow:
 *   1. Verify Clerk Bearer token → get userId
 *   2. Parse cpc_ref cookie from Cookie header
 *   3. Find the most-recent 'pending' referral row for that code
 *   4. Guard: referrer != referred (no self-referral)
 *   5. Update row: status='signup', referred_profile_id=userId, signed_up_at=now()
 *   6. Clear the cookie via Set-Cookie (Max-Age=0) so repeat calls are cheap
 *
 * Best-effort: returns 200 even when no referral row matches (the cookie may
 * have been set by a code that didn't correspond to any profile). The client
 * treats any non-2xx as a transient error and retries once; it should not
 * block the user experience.
 *
 * Idempotent: if the referred_profile_id is already set on a row we skip the
 * update and just clear the cookie — safe to call multiple times.
 */

import type { IncomingMessage, ServerResponse } from "http";
import { verifyToken } from "@clerk/backend";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../src/types/database";

const DEFAULT_AUTHORIZED_PARTIES = [
  "https://cleanpathcredit.com",
  "https://www.cleanpathcredit.com",
];

function getAuthorizedParties(): string[] {
  const raw = process.env.CLERK_AUTHORIZED_PARTIES;
  if (!raw) return DEFAULT_AUTHORIZED_PARTIES;
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

export const config = { runtime: "nodejs" };

const COOKIE_NAME = "cpc_ref";

function parseCpcRefCookie(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key?.trim() === COOKIE_NAME) {
      const raw = rest.join("=").trim();
      try {
        return decodeURIComponent(raw).toUpperCase() || null;
      } catch {
        return null;
      }
    }
  }
  return null;
}

function clearCpcRefCookieSecure(res: ServerResponse, https: boolean): void {
  const parts = [`${COOKIE_NAME}=`, "Max-Age=0", "Path=/", "SameSite=Lax", "HttpOnly"];
  if (https) parts.push("Secure");
  res.setHeader("Set-Cookie", parts.join("; "));
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "method_not_allowed" });
  }

  // 1. Env check
  const { CLERK_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!CLERK_SECRET_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("[/api/referrals/attribute] server_misconfigured");
    return sendJson(res, 500, { error: "server_misconfigured" });
  }

  // 2. Verify Clerk Bearer token
  const authHeader = (req.headers["authorization"] ?? "") as string;
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  if (!token) {
    return sendJson(res, 401, { error: "unauthorized" });
  }

  let userId: string;
  try {
    const payload = await verifyToken(token, {
      secretKey:         CLERK_SECRET_KEY,
      authorizedParties: getAuthorizedParties(),
    });
    if (typeof payload.sub !== "string" || !payload.sub) {
      return sendJson(res, 401, { error: "invalid_token" });
    }
    userId = payload.sub;
  } catch {
    return sendJson(res, 401, { error: "invalid_token" });
  }

  // 3. Parse cpc_ref from Cookie header
  const cookieHeader = req.headers["cookie"] as string | undefined;
  const code = parseCpcRefCookie(cookieHeader);

  const isHttps = (req.headers["x-forwarded-proto"] ?? "").toString().includes("https");

  if (!code || !/^CPC-[A-Z0-9]{4,}$/i.test(code)) {
    // No valid cookie — nothing to attribute. 200 so client doesn't retry.
    clearCpcRefCookieSecure(res, isHttps);
    return sendJson(res, 200, { attributed: false, reason: "no_cookie" });
  }

  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 4. Find matching pending referral row
  const { data: existing } = await supabase
    .from("referrals")
    .select("id, referrer_profile_id, referred_profile_id, status")
    .eq("referral_code_used", code)
    .in("status", ["pending", "signup"])
    .order("clicked_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  clearCpcRefCookieSecure(res, isHttps);

  if (!existing) {
    return sendJson(res, 200, { attributed: false, reason: "no_referral_row" });
  }

  // Idempotent: already attributed to this user
  if (existing.referred_profile_id === userId) {
    return sendJson(res, 200, { attributed: true, reason: "already_attributed" });
  }

  // 5. Self-referral guard
  if (existing.referrer_profile_id === userId) {
    return sendJson(res, 200, { attributed: false, reason: "self_referral" });
  }

  // 6. Update to 'signup'
  const { error: updateErr } = await supabase
    .from("referrals")
    .update({
      status:              "signup",
      referred_profile_id: userId,
      signed_up_at:        new Date().toISOString(),
    })
    .eq("id", existing.id)
    .eq("status", "pending"); // only advance from pending → signup

  if (updateErr) {
    console.error("[/api/referrals/attribute] update failed:", updateErr);
    // Don't expose DB errors to client; cookie was already cleared
    return sendJson(res, 200, { attributed: false, reason: "db_error" });
  }

  console.log(`[/api/referrals/attribute] attributed: userId=${userId} code=${code} rowId=${existing.id}`);
  return sendJson(res, 200, { attributed: true });
}
