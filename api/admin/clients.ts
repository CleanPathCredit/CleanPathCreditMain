/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * GET /api/admin/clients
 *
 * Returns every profile with role='client'. Uses the Supabase service-role
 * key to bypass RLS entirely — same trick as /api/me — so the admin dashboard
 * doesn't depend on the Clerk→Supabase JWT template being perfectly wired.
 *
 * Auth: caller must present a valid Clerk JWT whose Supabase profile has
 * role='admin'.
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../src/types/database";
import { getClerkUserIdFromRequest } from "../_lib/clerk-jwt";

export const config = { runtime: "edge" };

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "GET") {
    return json({ error: "Method not allowed" }, 405);
  }

  const callerId = await getClerkUserIdFromRequest(req);
  if (!callerId) return json({ error: "Unauthorized" }, 401);

  const supabase = createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  // Confirm caller is admin
  const { data: caller } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", callerId)
    .single();

  if (caller?.role !== "admin") return json({ error: "Forbidden" }, 403);

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "client")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[/api/admin/clients] supabase error:", error);
    return json({ error: "Failed to fetch clients" }, 500);
  }

  return json(data ?? []);
}
