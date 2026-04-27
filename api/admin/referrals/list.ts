/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * GET /api/admin/referrals
 *
 * Admin-only list of every referral row, joined with the referrer's name
 * + email so the dashboard can show "Jane Doe (jane@…) referred al****@…"
 * without an N+1 client-side lookup.
 *
 * Returns a flat array shaped for the admin table:
 *   { id, status, referrer: {id,full_name,email,referral_code}, referred_email,
 *     referred_profile_id, amount_cents, clicked_at, signed_up_at,
 *     purchased_at, paid_out_at, stripe_session_id }
 *
 * Plus an aggregate `summary` object for the page header tiles.
 *
 * Caps at 500 rows newest-first — the admin can filter client-side.
 * Beyond 500 we'd need a pagination layer, but referrals at $50 a pop will
 * take a while to outgrow that.
 */

import type { IncomingMessage, ServerResponse } from "http";
import { createClient } from "@supabase/supabase-js";
import { verifyToken } from "@clerk/backend";
import type { Database } from "../../../src/types/database";

export const config = { runtime: "nodejs" };

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
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendJson(res, 405, { error: "method_not_allowed" });
  }

  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return sendJson(res, 401, { error: "unauthorized" });
  }
  const token = authHeader.slice(7).trim();
  if (!token) return sendJson(res, 401, { error: "unauthorized" });

  const { CLERK_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!CLERK_SECRET_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return sendJson(res, 500, { error: "server_misconfigured" });
  }

  let userId: string;
  try {
    const payload = await verifyToken(token, {
      secretKey:         CLERK_SECRET_KEY,
      authorizedParties: getAuthorizedParties(),
    });
    if (typeof payload.sub !== "string" || !payload.sub) {
      return sendJson(res, 401, { error: "unauthorized" });
    }
    userId = payload.sub;
  } catch {
    return sendJson(res, 401, { error: "unauthorized" });
  }

  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
  if (me?.role !== "admin") {
    return sendJson(res, 403, { error: "forbidden" });
  }

  // 1. Pull referrals (newest first, capped). PostgREST select with
  // referrer:profiles!... resolves the referrer_profile_id FK in one hop.
  const { data: rows, error } = await supabase
    .from("referrals")
    .select(`
      id,
      referrer_profile_id,
      referral_code_used,
      referred_profile_id,
      referred_email,
      status,
      amount_cents,
      stripe_session_id,
      clicked_at,
      signed_up_at,
      purchased_at,
      paid_out_at,
      client_ip,
      user_agent
    `)
    .order("clicked_at", { ascending: false })
    .limit(500);

  if (error) {
    console.error("[/api/admin/referrals] referrals fetch failed:", error.message);
    return sendJson(res, 500, { error: "fetch_failed" });
  }

  const referralRows = rows ?? [];

  // 2. Batch-resolve referrer profile metadata to avoid PostgREST relation
  // ambiguity (referrals has two FKs to profiles).
  const referrerIds = Array.from(
    new Set(referralRows.map((r) => r.referrer_profile_id).filter((v): v is string => !!v)),
  );

  type ReferrerInfo = { id: string; full_name: string | null; email: string; referral_code: string | null };
  let referrerMap = new Map<string, ReferrerInfo>();
  if (referrerIds.length > 0) {
    const { data: referrers, error: refErr } = await supabase
      .from("profiles")
      .select("id, full_name, email, referral_code")
      .in("id", referrerIds);
    if (refErr) {
      console.error("[/api/admin/referrals] referrer fetch failed:", refErr.message);
    } else {
      referrerMap = new Map((referrers ?? []).map((p) => [p.id, p as ReferrerInfo]));
    }
  }

  // 3. Shape the response
  const list = referralRows.map((r) => ({
    id:                  r.id,
    status:              r.status,
    referrer:            r.referrer_profile_id ? referrerMap.get(r.referrer_profile_id) ?? null : null,
    referrer_profile_id: r.referrer_profile_id,
    referral_code_used:  r.referral_code_used,
    referred_profile_id: r.referred_profile_id,
    referred_email:      r.referred_email,
    amount_cents:        r.amount_cents,
    stripe_session_id:   r.stripe_session_id,
    clicked_at:          r.clicked_at,
    signed_up_at:        r.signed_up_at,
    purchased_at:        r.purchased_at,
    paid_out_at:         r.paid_out_at,
    client_ip:           r.client_ip,
    user_agent:          r.user_agent,
  }));

  // 4. Aggregate summary
  let pendingCents  = 0;
  let paidOutCents  = 0;
  let purchasedCount = 0;
  let signupCount    = 0;
  let pendingCount   = 0;
  let paidOutCount   = 0;
  let voidCount      = 0;
  for (const r of referralRows) {
    if (r.status === "pending")   pendingCount   += 1;
    if (r.status === "signup")    signupCount    += 1;
    if (r.status === "purchased") {
      purchasedCount += 1;
      pendingCents   += r.amount_cents ?? 0;
    }
    if (r.status === "paid_out")  {
      paidOutCount += 1;
      paidOutCents += r.amount_cents ?? 0;
    }
    if (r.status === "void") voidCount += 1;
  }

  return sendJson(res, 200, {
    referrals: list,
    summary: {
      total:           referralRows.length,
      pending_count:   pendingCount,
      signup_count:    signupCount,
      purchased_count: purchasedCount,
      paid_out_count:  paidOutCount,
      void_count:      voidCount,
      pending_cents:   pendingCents,
      paid_out_cents:  paidOutCents,
    },
  });
}
