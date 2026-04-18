/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * /api/admin/lead/[id]
 *   PATCH  — edit any subset of a lead_submissions row
 *   DELETE — permanently remove the row (irreversible)
 *
 * Admin-auth required via Clerk session (same verifyToken pattern as
 * /api/me and /api/admin/lead). Non-admin tokens get 403, missing/
 * invalid tokens get 401.
 *
 * Uses the Supabase service-role key so RLS isn't in play — all mutation
 * policy lives in the explicit auth check at the top of the handler.
 *
 * NOTE — we currently do NOT propagate edits/deletes back to GoHighLevel.
 * GHL is treated as the source of truth for sales + marketing
 * automations; the admin dashboard is the source of truth for in-product
 * triage. If an admin wants to sync (e.g. fix a typo in GHL too), they
 * update the contact directly there. Future work: mirror the delete via
 * a DELETE /contacts/:contactId call.
 */

import type { IncomingMessage, ServerResponse } from "http";
import { createClient } from "@supabase/supabase-js";
import { verifyToken } from "@clerk/backend";
import type { Database, UrgencyTier, RecommendedOffer } from "../../../src/types/database";

export const config = { runtime: "nodejs" };

const MAX_BODY_BYTES = 16 * 1024;

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
function sendEmpty(res: ServerResponse, status: number): void {
  res.statusCode = status;
  res.end();
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

function str(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length === 0 ? null : t;
}
function isEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

// Narrow the PATCH body into the exact columns we allow admins to mutate.
// Unknown keys are silently dropped so a malicious caller can't sneak in
// something like id, source, or ghl_contact_id.
interface EditableLeadFields {
  full_name?:          unknown;
  email?:              unknown;
  phone?:              unknown;
  goal?:               unknown;
  obstacles?:          unknown;
  credit_score_range?: unknown;
  income_range?:       unknown;
  ideal_score?:        unknown;
  timeline?:           unknown;
  urgency_score?:      unknown;
  urgency_tier?:       unknown;
  recommended_offer?:  unknown;
}

const VALID_TIERS: UrgencyTier[] = ["low", "moderate", "elevated", "urgent"];
const VALID_OFFERS: RecommendedOffer[] = ["diy", "accelerated", "executive"];

function buildUpdate(raw: EditableLeadFields): Record<string, unknown> | null {
  const update: Record<string, unknown> = {};

  if ("full_name" in raw)          update.full_name          = str(raw.full_name);
  if ("phone" in raw)              update.phone              = str(raw.phone);
  if ("goal" in raw)               update.goal               = str(raw.goal);
  if ("credit_score_range" in raw) update.credit_score_range = str(raw.credit_score_range);
  if ("income_range" in raw)       update.income_range       = str(raw.income_range);
  if ("ideal_score" in raw)        update.ideal_score        = str(raw.ideal_score);
  if ("timeline" in raw)           update.timeline           = str(raw.timeline);

  if ("email" in raw) {
    const e = str(raw.email);
    if (!e || !isEmail(e)) return null;  // email is the only field we hard-validate
    update.email = e;
  }

  if ("obstacles" in raw) {
    if (!Array.isArray(raw.obstacles)) return null;
    update.obstacles = raw.obstacles
      .filter((x): x is string => typeof x === "string")
      .map((x) => x.trim())
      .filter((x) => x.length > 0 && x.length <= 64)
      .slice(0, 10);
  }

  if ("urgency_score" in raw) {
    if (raw.urgency_score === null) {
      update.urgency_score = null;
    } else if (typeof raw.urgency_score === "number" && Number.isFinite(raw.urgency_score)) {
      update.urgency_score = Math.max(0, Math.min(100, Math.round(raw.urgency_score)));
    } else {
      return null;
    }
  }

  if ("urgency_tier" in raw) {
    if (raw.urgency_tier === null) {
      update.urgency_tier = null;
    } else if (typeof raw.urgency_tier === "string" && VALID_TIERS.includes(raw.urgency_tier as UrgencyTier)) {
      update.urgency_tier = raw.urgency_tier;
    } else {
      return null;
    }
  }

  if ("recommended_offer" in raw) {
    if (raw.recommended_offer === null) {
      update.recommended_offer = null;
    } else if (typeof raw.recommended_offer === "string" && VALID_OFFERS.includes(raw.recommended_offer as RecommendedOffer)) {
      update.recommended_offer = raw.recommended_offer;
    } else {
      return null;
    }
  }

  return update;
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  if (req.method !== "PATCH" && req.method !== "DELETE") {
    res.setHeader("Allow", "PATCH, DELETE");
    return sendJson(res, 405, { error: "method_not_allowed" });
  }

  // 1. Parse lead id from URL (Vercel populates req.url with query string).
  const url = new URL(req.url ?? "/", "http://internal");
  // Vercel puts [id] into the query under the filename's bracket token.
  const id = url.searchParams.get("id") ?? url.pathname.split("/").pop();
  if (!id || !/^[0-9a-f-]{8,}$/i.test(id)) {
    return sendJson(res, 400, { error: "invalid_id" });
  }

  // 2. Auth — Clerk session → profiles.role='admin'.
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return sendJson(res, 401, { error: "unauthorized" });
  }
  const token = authHeader.slice(7).trim();
  if (!token) return sendJson(res, 401, { error: "unauthorized" });

  const clerkSecretKey     = process.env.CLERK_SECRET_KEY;
  const supabaseUrl        = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!clerkSecretKey || !supabaseUrl || !supabaseServiceKey) {
    return sendJson(res, 500, { error: "server_misconfigured" });
  }

  let userId: string;
  try {
    const payload = await verifyToken(token, {
      secretKey:         clerkSecretKey,
      authorizedParties: getAuthorizedParties(),
    });
    if (typeof payload.sub !== "string" || !payload.sub) {
      return sendJson(res, 401, { error: "unauthorized" });
    }
    userId = payload.sub;
  } catch {
    return sendJson(res, 401, { error: "unauthorized" });
  }

  const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
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

  // 3. DELETE — hard delete, no soft-delete / tombstone. Row is gone from
  //    the admin UI on the next realtime event.
  if (req.method === "DELETE") {
    const { error } = await supabase
      .from("lead_submissions")
      .delete()
      .eq("id", id);
    if (error) {
      console.error("[/api/admin/lead/:id DELETE] failed:", error.message);
      return sendJson(res, 500, { error: "delete_failed" });
    }
    return sendEmpty(res, 204);
  }

  // 4. PATCH — validate body, build allow-listed UPDATE, apply.
  const body = await readJsonBody<EditableLeadFields>(req);
  if (!body) return sendJson(res, 400, { error: "invalid_body" });

  const update = buildUpdate(body);
  if (update === null)              return sendJson(res, 400, { error: "invalid_fields" });
  if (Object.keys(update).length === 0) return sendJson(res, 400, { error: "no_updates" });

  // Intentionally not calling supabase.from(...).update(...).select().single()
  // here — the admin's realtime INSERT channel already covers creates, but
  // UPDATE events aren't subscribed. Return the fresh row so the modal can
  // optimistically apply it and the admin sees the change without a refetch.
  const { data, error } = await supabase
    .from("lead_submissions")
    .update(update as Database["public"]["Tables"]["lead_submissions"]["Update"])
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[/api/admin/lead/:id PATCH] failed:", error.message);
    return sendJson(res, 500, { error: "update_failed" });
  }
  return sendJson(res, 200, { ok: true, lead: data });
}
