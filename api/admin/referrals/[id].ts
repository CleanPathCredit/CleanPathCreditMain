/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * PATCH /api/admin/referrals/[id]
 *
 * Admin-only mutator for a single referrals row. Allowlisted fields:
 *   - status        ('paid_out' | 'void' — narrow set of safe transitions)
 *   - amount_cents  (override the default $50 commission)
 *
 * Status transitions are gated:
 *   - Any → 'void'         (always allowed; e.g. fraud, chargeback)
 *   - 'purchased' → 'paid_out'  (the normal payout flow)
 *
 * Other transitions return 400 — they should only happen via webhooks
 * (signup via /api/referrals/attribute, purchased via Stripe webhook).
 *
 * Side effect: when status moves to 'paid_out' the server also stamps
 * paid_out_at = now(). When it moves to 'void' the row is left otherwise
 * intact so the audit trail survives.
 */

import type { IncomingMessage, ServerResponse } from "http";
import { createClient } from "@supabase/supabase-js";
import { verifyToken } from "@clerk/backend";
import type { Database, ReferralStatus } from "../../../src/types/database";

export const config = { runtime: "nodejs" };

const MAX_BODY_BYTES = 4 * 1024;

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

async function readJsonBody<T>(req: IncomingMessage): Promise<T | null> {
  return new Promise((resolve) => {
    let received = 0;
    const chunks: Buffer[] = [];
    let aborted = false;
    req.on("data", (chunk: Buffer) => {
      if (aborted) return;
      received += chunk.length;
      if (received > MAX_BODY_BYTES) { aborted = true; resolve(null); return; }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (aborted) return;
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve(raw ? (JSON.parse(raw) as T) : ({} as T));
      } catch { resolve(null); }
    });
    req.on("error", () => resolve(null));
  });
}

interface PatchBody {
  status?:       unknown;
  amount_cents?: unknown;
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  if (req.method !== "PATCH") {
    res.setHeader("Allow", "PATCH");
    return sendJson(res, 405, { error: "method_not_allowed" });
  }

  const url = new URL(req.url ?? "/", "http://internal");
  const id  = url.searchParams.get("id") ?? url.pathname.split("/").pop();
  if (!id || !/^[0-9a-f-]{8,}$/i.test(id)) {
    return sendJson(res, 400, { error: "invalid_id" });
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

  const body = await readJsonBody<PatchBody>(req);
  if (!body) return sendJson(res, 400, { error: "invalid_body" });

  // Fetch current row so we can validate the status transition.
  const { data: current, error: fetchErr } = await supabase
    .from("referrals")
    .select("id, status, amount_cents")
    .eq("id", id)
    .maybeSingle();
  if (fetchErr) {
    console.error("[/api/admin/referrals/:id] fetch failed:", fetchErr.message);
    return sendJson(res, 500, { error: "fetch_failed" });
  }
  if (!current) return sendJson(res, 404, { error: "not_found" });

  const update: Database["public"]["Tables"]["referrals"]["Update"] = {};

  if ("status" in body) {
    const next = typeof body.status === "string" ? (body.status as ReferralStatus) : null;
    if (next !== "paid_out" && next !== "void") {
      return sendJson(res, 400, { error: "invalid_status_transition" });
    }
    if (next === "paid_out" && current.status !== "purchased") {
      // Only purchased rows can be marked paid_out — prevents accidentally
      // paying a referral whose Stripe purchase event never landed.
      return sendJson(res, 400, { error: "must_be_purchased_first" });
    }
    update.status = next;
    if (next === "paid_out") {
      update.paid_out_at = new Date().toISOString();
    }
  }

  if ("amount_cents" in body) {
    if (body.amount_cents === null) {
      update.amount_cents = null;
    } else if (
      typeof body.amount_cents === "number" &&
      Number.isFinite(body.amount_cents) &&
      body.amount_cents >= 0 &&
      body.amount_cents <= 1_000_000  // $10k ceiling — stops fat-finger payouts
    ) {
      update.amount_cents = Math.round(body.amount_cents);
    } else {
      return sendJson(res, 400, { error: "invalid_amount" });
    }
  }

  if (Object.keys(update).length === 0) {
    return sendJson(res, 400, { error: "no_updates" });
  }

  const { data, error } = await supabase
    .from("referrals")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[/api/admin/referrals/:id PATCH] failed:", error.message);
    return sendJson(res, 500, { error: "update_failed" });
  }

  console.log(`[/api/admin/referrals/:id] updated by admin=${userId} rowId=${id} update=${JSON.stringify(update)}`);
  return sendJson(res, 200, { ok: true, referral: data });
}
