/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * GET /api/me
 *
 * Returns the caller's Supabase `profiles` row using the service-role key
 * (bypasses RLS). Authenticates by verifying the caller's Clerk session JWT
 * with @clerk/backend's verifyToken(), which validates:
 *   - signature (RS256 / ES256) against Clerk's JWKS
 *   - iss  (Clerk instance derived from secretKey)
 *   - exp / nbf with ~5s clock skew
 *   - azp against an explicit authorized-parties allowlist
 *
 * This replaces a previous hand-rolled JWKS + SubtleCrypto path that
 * checked only signature + exp (audit finding C-2).
 *
 * Runs on Node.js serverless runtime because @clerk/backend depends on
 * @clerk/shared modules that Vercel's Edge runtime cannot resolve. Cold
 * starts are ~150ms higher than Edge — acceptable for a low-volume
 * authenticated endpoint.
 *
 * Required env:
 *   CLERK_SECRET_KEY              (Clerk Dashboard → API Keys → Secret keys)
 *   SUPABASE_URL                  (Supabase Dashboard → Settings → API)
 *   SUPABASE_SERVICE_ROLE_KEY     (same page → service_role key)
 * Optional env:
 *   CLERK_AUTHORIZED_PARTIES      comma-separated origin allowlist; falls
 *                                 back to the two prod origins below
 */

import type { IncomingMessage, ServerResponse } from "http";
import { createClient } from "@supabase/supabase-js";
import { verifyToken } from "@clerk/backend";
import type { Database } from "../src/types/database";

// Origins whose Clerk session tokens we accept. Override in prod via
// CLERK_AUTHORIZED_PARTIES="https://cleanpathcredit.com,https://app.example.com".
const DEFAULT_AUTHORIZED_PARTIES = [
  "https://cleanpathcredit.com",
  "https://www.cleanpathcredit.com",
];

function getAuthorizedParties(): string[] {
  const raw = process.env.CLERK_AUTHORIZED_PARTIES;
  if (!raw) return DEFAULT_AUTHORIZED_PARTIES;
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
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
  // 1. Extract bearer token
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return sendJson(res, 401, null);
  }
  const token = authHeader.slice(7).trim();
  if (!token) {
    return sendJson(res, 401, null);
  }

  // 2. Validate env (fail closed)
  const clerkSecretKey     = process.env.CLERK_SECRET_KEY;
  const supabaseUrl        = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!clerkSecretKey || !supabaseUrl || !supabaseServiceKey) {
    console.error("[/api/me] server_misconfigured — missing env", {
      CLERK_SECRET_KEY:          !!clerkSecretKey,
      SUPABASE_URL:              !!supabaseUrl,
      SUPABASE_SERVICE_ROLE_KEY: !!supabaseServiceKey,
    });
    return sendJson(res, 500, { error: "server_misconfigured" });
  }

  // 3. Verify JWT — checks signature, iss, exp, nbf, azp (with 5s skew)
  let userId: string;
  try {
    const payload = await verifyToken(token, {
      secretKey:         clerkSecretKey,
      authorizedParties: getAuthorizedParties(),
    });
    if (typeof payload.sub !== "string" || !payload.sub) {
      return sendJson(res, 401, null);
    }
    userId = payload.sub;
  } catch {
    // Invalid signature, wrong iss/azp, expired, nbf-in-future, or malformed.
    // Do not echo the reason — callers don't need to know why we rejected.
    return sendJson(res, 401, null);
  }

  // 4. Fetch profile with the service-role client (no RLS, scoped by userId)
  const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  return sendJson(res, 200, data ?? null);
}
