/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * GET  /api/messages          — fetch all messages for the caller
 * POST /api/messages          — send a new message as the caller
 *
 * Uses the service-role key so RLS is bypassed entirely. Auth is handled
 * by verifying the Clerk JWT — no Clerk→Supabase JWT template required.
 * This replaces the direct supabase.from("messages") calls in Dashboard.tsx
 * which were failing with 500s due to the JWT mismatch.
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/types/database";
import { getClerkUserIdFromRequest } from "./_lib/clerk-jwt";

export const config = { runtime: "edge" };

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function supabaseAdmin() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export default async function handler(req: Request): Promise<Response> {
  const userId = await getClerkUserIdFromRequest(req);
  if (!userId) return json({ error: "Unauthorized" }, 401);

  const db = supabaseAdmin();

  // ── GET — return all messages for this user ──────────────────────────────
  if (req.method === "GET") {
    const { data, error } = await db
      .from("messages")
      .select("*")
      .eq("profile_id", userId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[/api/messages GET] supabase error:", error);
      return json({ error: "Failed to fetch messages" }, 500);
    }
    return json(data ?? []);
  }

  // ── POST — insert a new user message ────────────────────────────────────
  if (req.method === "POST") {
    let body: { body?: string };
    try {
      body = (await req.json()) as { body?: string };
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }

    const text = typeof body.body === "string" ? body.body.trim() : "";
    if (!text) return json({ error: "Message body is required" }, 400);

    const { data, error } = await db
      .from("messages")
      .insert({ profile_id: userId, sender: "user", body: text })
      .select()
      .single();

    if (error) {
      console.error("[/api/messages POST] supabase error:", error);
      return json({ error: "Failed to send message" }, 500);
    }
    return json(data, 201);
  }

  return json({ error: "Method not allowed" }, 405);
}
