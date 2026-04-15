/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * POST /api/admin/delete-client
 *
 * Body: { "clientId": "user_xxx" }
 *
 * Deletes a client completely:
 *   1. Removes all files from the "documents" bucket under their folder
 *   2. Deletes their Supabase profile row (CASCADE → messages, documents)
 *   3. Deletes their Clerk user via Clerk's backend API
 *
 * Auth: caller must present a valid Clerk JWT whose Supabase profile has
 * role='admin'. The endpoint uses the service-role Supabase key so it can
 * operate across all rows regardless of RLS.
 *
 * Required env:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CLERK_SECRET_KEY
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

async function deleteClerkUser(userId: string): Promise<{ ok: boolean; error?: string }> {
  const secret = process.env.CLERK_SECRET_KEY;
  if (!secret) return { ok: false, error: "CLERK_SECRET_KEY not configured" };

  const res = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${secret}` },
  });

  // 404 means the Clerk user is already gone — treat as success so the admin
  // can clean up orphaned Supabase rows.
  if (res.ok || res.status === 404) return { ok: true };
  const text = await res.text();
  return { ok: false, error: `Clerk API ${res.status}: ${text}` };
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  // 1. Verify the caller's JWT
  const callerId = await getClerkUserIdFromRequest(req);
  if (!callerId) return json({ error: "Unauthorized" }, 401);

  // 2. Parse + validate the body
  let body: { clientId?: string };
  try {
    body = (await req.json()) as { clientId?: string };
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  const clientId = body.clientId?.trim();
  if (!clientId) return json({ error: "Missing clientId" }, 400);
  if (clientId === callerId) {
    return json({ error: "You cannot delete your own account" }, 400);
  }

  // 3. Confirm the caller is an admin
  const supabase = createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const { data: caller } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", callerId)
    .single();

  if (caller?.role !== "admin") return json({ error: "Forbidden" }, 403);

  // 4. Best-effort: delete all storage files under documents/{clientId}/
  const { data: files } = await supabase.storage
    .from("documents")
    .list(clientId, { limit: 1000 });

  if (files && files.length > 0) {
    const paths = files.map((f) => `${clientId}/${f.name}`);
    await supabase.storage.from("documents").remove(paths);
  }

  // 5. Delete the Supabase profile (messages + documents cascade)
  const { error: profileError } = await supabase
    .from("profiles")
    .delete()
    .eq("id", clientId);

  if (profileError) {
    console.error("[/api/admin/delete-client] profile delete error:", profileError);
    return json({ error: "Failed to delete client" }, 500);
  }

  // 6. Delete the Clerk user — if this fails, the Supabase data is already gone,
  //    which is the safer direction (no orphaned access to deleted data).
  const clerkResult = await deleteClerkUser(clientId);
  if (!clerkResult.ok) {
    console.error("[/api/admin/delete-client] clerk delete error:", clerkResult.error);
    return json({
      warning: "Supabase data deleted, but Clerk user removal failed.",
    }, 207); // 207 Multi-Status — partial success
  }

  return json({ success: true });
}
