/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * GET /api/me
 *
 * Returns the caller's Supabase profile using the service-role key,
 * bypassing RLS entirely. Authenticates the caller by verifying their
 * standard Clerk JWT (RS256/ES256) against Clerk's JWKS endpoint.
 *
 * This avoids the Clerk→Supabase JWT template mismatch problem.
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/types/database";
import { getClerkUserIdFromRequest } from "./_lib/clerk-jwt";

export const config = { runtime: "edge" };

export default async function handler(req: Request): Promise<Response> {
  const headers = { "Content-Type": "application/json" };

  const userId = await getClerkUserIdFromRequest(req);
  if (!userId) {
    return new Response(JSON.stringify(null), { status: 401, headers });
  }

  const supabase = createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  return new Response(JSON.stringify(data ?? null), { headers });
}
