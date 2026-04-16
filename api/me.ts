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
 * Required env:
 *   CLERK_SECRET_KEY              (Clerk Dashboard → API Keys → Secret keys)
 *   SUPABASE_URL                  (Supabase Dashboard → Settings → API)
 *   SUPABASE_SERVICE_ROLE_KEY     (same page → service_role key)
 * Optional env:
 *   CLERK_AUTHORIZED_PARTIES      comma-separated origin allowlist; falls
 *                                 back to the two prod origins below
 */

import { createClient } from "@supabase/supabase-js";
import { verifyToken } from "@clerk/backend";
import type { Database } from "../src/types/database";

export const config = { runtime: "edge" };

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

export default async function handler(req: Request): Promise<Response> {
  const jsonHeaders = { "Content-Type": "application/json" };

  // 1. Extract bearer token
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify(null), { status: 401, headers: jsonHeaders });
  }
  const token = authHeader.slice(7).trim();
  if (!token) {
    return new Response(JSON.stringify(null), { status: 401, headers: jsonHeaders });
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
    return new Response(JSON.stringify({ error: "server_misconfigured" }), {
      status: 500, headers: jsonHeaders,
    });
  }

  // 3. Verify JWT — checks signature, iss, exp, nbf, azp (with 5s skew)
  let userId: string;
  try {
    const payload = await verifyToken(token, {
      secretKey:         clerkSecretKey,
      authorizedParties: getAuthorizedParties(),
    });
    if (typeof payload.sub !== "string" || !payload.sub) {
      return new Response(JSON.stringify(null), { status: 401, headers: jsonHeaders });
    }
    userId = payload.sub;
  } catch {
    // Invalid signature, wrong iss/azp, expired, nbf-in-future, or malformed.
    // Do not echo the reason — callers don't need to know why we rejected.
    return new Response(JSON.stringify(null), { status: 401, headers: jsonHeaders });
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

  return new Response(JSON.stringify(data ?? null), { headers: jsonHeaders });
}
