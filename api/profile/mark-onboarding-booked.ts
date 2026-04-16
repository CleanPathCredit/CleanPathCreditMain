/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * POST /api/profile/mark-onboarding-booked
 *
 * Called by the dashboard's onboarding card when Calendly fires the
 * `calendly.event_scheduled` postMessage. Flips `onboarding_call_booked`
 * to true so the card is permanently hidden for this user on any device.
 *
 * Auth: requires a valid Clerk JWT in the Authorization header.
 * No request body needed — we derive the user from the JWT.
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
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const userId = await getClerkUserIdFromRequest(req);
  if (!userId) return json({ error: "Unauthorized" }, 401);

  const supabase = createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const { error } = await supabase
    .from("profiles")
    .update({ onboarding_call_booked: true })
    .eq("id", userId);

  if (error) {
    console.error("[mark-onboarding-booked] supabase update failed:", error);
    return json({ error: "Failed to update profile" }, 500);
  }

  return json({ ok: true });
}
