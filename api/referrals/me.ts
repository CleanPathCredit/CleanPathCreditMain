/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * GET /api/referrals/me
 *
 * Returns the caller's referral code, share URL, lifecycle stats, and a
 * trimmed list of recent referrals for the dashboard ReferralCard.
 *
 * Stats are computed in two queries:
 *   1. profiles.referral_code (single row) — the user's code
 *   2. referrals where referrer_profile_id = userId — bucketed by status
 *
 * Could be done with a Postgres view + RLS, but for ~tens of rows per user
 * the cost is identical and a server-computed shape is easier to evolve
 * (e.g. add lifetime_cents without a migration).
 *
 * Recent referrals expose only:
 *   - id, status, signed_up_at, purchased_at, paid_out_at, amount_cents
 *   - referred_email (for "you referred jane@…" UI; PII but it was the
 *     referrer's own contact who signed up via their link, so OK to surface)
 *
 * Hidden from the response: client_ip, user_agent, full referred profile.
 */

import type { IncomingMessage, ServerResponse } from "http";
import { verifyToken } from "@clerk/backend";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../src/types/database";

export const config = { runtime: "nodejs" };

const DEFAULT_AUTHORIZED_PARTIES = [
  "https://cleanpathcredit.com",
  "https://www.cleanpathcredit.com",
];

// Used to build the share URL. Override in env if the apex domain ever
// changes (or for staging).
const PUBLIC_SITE_ORIGIN = process.env.PUBLIC_SITE_ORIGIN ?? "https://cleanpathcredit.com";

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

interface ReferralRowPublic {
  id: string;
  status: string;
  referred_email: string | null;
  amount_cents: number | null;
  signed_up_at: string | null;
  purchased_at: string | null;
  paid_out_at: string | null;
  clicked_at: string;
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendJson(res, 405, { error: "method_not_allowed" });
  }

  const { CLERK_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!CLERK_SECRET_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("[/api/referrals/me] server_misconfigured");
    return sendJson(res, 500, { error: "server_misconfigured" });
  }

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

  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1. Look up the caller's referral_code
  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("referral_code")
    .eq("id", userId)
    .maybeSingle();

  if (profileErr) {
    console.error("[/api/referrals/me] profile lookup failed:", profileErr);
    return sendJson(res, 500, { error: "profile_lookup_failed" });
  }
  if (!profile?.referral_code) {
    // Trigger should always assign one on insert. If we land here, the
    // user pre-dates migration 009's back-fill OR the trigger missed.
    return sendJson(res, 200, {
      code:        null,
      shareUrl:    null,
      stats:       { clicks: 0, signups: 0, purchases: 0, pending_cents: 0, paid_out_cents: 0 },
      recent:      [],
    });
  }

  const code     = profile.referral_code;
  const shareUrl = `${PUBLIC_SITE_ORIGIN}/r/${code}`;

  // 2. Pull all referral rows for this referrer. With ~tens of rows per
  // user this is cheap; bucket aggregation in JS keeps the SQL trivial.
  const { data: rows, error: rowsErr } = await supabase
    .from("referrals")
    .select("id, status, referred_email, amount_cents, clicked_at, signed_up_at, purchased_at, paid_out_at")
    .eq("referrer_profile_id", userId)
    .order("clicked_at", { ascending: false });

  if (rowsErr) {
    console.error("[/api/referrals/me] referrals lookup failed:", rowsErr);
    return sendJson(res, 500, { error: "referrals_lookup_failed" });
  }

  const referrals = (rows ?? []) as ReferralRowPublic[];

  // Stats — one pass through the rows.
  let clicks         = 0;  // every row counts as a click (status='pending' or beyond)
  let signups        = 0;  // signed_up_at is set
  let purchases      = 0;  // purchased_at is set
  let pendingCents   = 0;  // amount_cents on rows that are 'purchased' but not yet paid out
  let paidOutCents   = 0;  // amount_cents on rows in 'paid_out'

  for (const r of referrals) {
    if (r.status !== "void") clicks += 1;
    if (r.signed_up_at)      signups += 1;
    if (r.purchased_at)      purchases += 1;
    if (r.status === "purchased" && r.amount_cents) pendingCents += r.amount_cents;
    if (r.status === "paid_out"  && r.amount_cents) paidOutCents += r.amount_cents;
  }

  // Trim recent list to 10 most-recent so the dashboard payload stays small.
  const recent = referrals.slice(0, 10).map((r) => ({
    id:             r.id,
    status:         r.status,
    referred_email: r.referred_email,
    amount_cents:   r.amount_cents,
    clicked_at:     r.clicked_at,
    signed_up_at:   r.signed_up_at,
    purchased_at:   r.purchased_at,
    paid_out_at:    r.paid_out_at,
  }));

  return sendJson(res, 200, {
    code,
    shareUrl,
    stats: {
      clicks,
      signups,
      purchases,
      pending_cents:  pendingCents,
      paid_out_cents: paidOutCents,
    },
    recent,
  });
}
