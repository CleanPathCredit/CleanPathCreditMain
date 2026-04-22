/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * /api/admin/client/[id]
 *   PATCH  — edit name/phone/address/goal/challenge/plan/status/progress
 *   DELETE — remove the Clerk user AND the Supabase profile row (cascades
 *            to messages + documents). IRREVERSIBLE.
 *
 * Uses the Supabase service-role key so column allow-listing is enforced
 * in code here rather than via RLS. Clerk user deletion goes through
 * createClerkClient.users.deleteUser().
 *
 * Side effects NOT handled here (deliberate — flag separately if you
 * want admin-initiated cleanup of them too):
 *   - Stripe subscriptions: any active subscription on the deleted user
 *     is NOT auto-canceled; admin should cancel in Stripe if needed.
 *   - Supabase Storage files: the `documents` table cascade removes
 *     rows, but the underlying files in Storage stay until a cleanup
 *     job removes them.
 *   - GHL contact: left alone by design. GHL is the marketing/sales
 *     system of record; deleting here shouldn't wipe it there.
 */

import type { IncomingMessage, ServerResponse } from "http";
import { createClient } from "@supabase/supabase-js";
import { verifyToken, createClerkClient } from "@clerk/backend";
import type { Database, Plan, ClientStatus } from "../../../src/types/database";

export const config = { runtime: "nodejs" };

const GHL_API_BASE    = "https://services.leadconnectorhq.com";
const GHL_API_VERSION = "2021-07-28";

/**
 * Fire-and-forget: add a `granted:<tier>` tag to the client's GHL contact
 * when an admin manually changes their plan. Lets the user build
 * tag-triggered GHL workflows (welcome sequence for comped accounts,
 * upsell drip from lower to higher tier, etc.) without the backend
 * needing to know anything about the specific automations.
 *
 * Two API calls:
 *   1. GET /contacts/search/duplicate — find the contactId by email
 *      (cheapest lookup GHL exposes; doesn't create one if missing).
 *   2. POST /contacts/:id/tags — APPEND the tag. Intentionally not
 *      POST /contacts/upsert because that endpoint REPLACES the tags
 *      array, which would nuke every other tag on the contact.
 *
 * Best-effort: every failure is logged and swallowed. Admin's Supabase
 * update has already succeeded by the time this runs — we won't roll
 * that back just because GHL had a blip.
 */
async function addGHLPlanTag(email: string, plan: Plan): Promise<void> {
  const token      = process.env.GHL_PRIVATE_INTEGRATION_TOKEN;
  const locationId = process.env.GHL_LOCATION_ID;
  if (!token || !locationId || !email) return;

  try {
    // 1. Find the contact id by email. search/duplicate is the v2
    //    lookup for "is there already a contact with this email at
    //    this location?" — perfect for our use case.
    const searchUrl =
      `${GHL_API_BASE}/contacts/search/duplicate` +
      `?locationId=${encodeURIComponent(locationId)}` +
      `&email=${encodeURIComponent(email)}`;
    const searchResp = await fetch(searchUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Version:       GHL_API_VERSION,
        Accept:        "application/json",
      },
    });
    if (!searchResp.ok) {
      const body = await searchResp.text().catch(() => "");
      console.error("[/api/admin/client/:id] ghl_search_failed status=%d body=%s",
        searchResp.status, body.slice(0, 200));
      return;
    }
    const data = await searchResp.json().catch(() => ({} as Record<string, unknown>));
    const contact = (data as { contact?: { id?: string } }).contact;
    if (!contact?.id) {
      // No GHL contact yet — that's normal for admins who created the
      // profile manually without ever going through /api/lead. Skip.
      return;
    }

    // 2. Append the tag. granted:<tier> is distinct from plan:<tier>
    //    (which the Clerk webhook sets on signup) so GHL workflows can
    //    filter for "admin-granted" vs "paid-for" segments.
    const tagResp = await fetch(`${GHL_API_BASE}/contacts/${contact.id}/tags`, {
      method: "POST",
      headers: {
        Authorization:  `Bearer ${token}`,
        Version:        GHL_API_VERSION,
        Accept:         "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ tags: [`granted:${plan}`] }),
    });
    if (!tagResp.ok) {
      const body = await tagResp.text().catch(() => "");
      console.error("[/api/admin/client/:id] ghl_tag_failed status=%d body=%s",
        tagResp.status, body.slice(0, 200));
    }
  } catch (err) {
    console.error("[/api/admin/client/:id] ghl_tag_error:", err);
  }
}

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

interface EditableClientFields {
  full_name?:   unknown;
  phone?:       unknown;
  address?:     unknown;
  goal?:        unknown;
  challenge?:   unknown;
  plan?:        unknown;
  status?:      unknown;
  progress?:    unknown;
  admin_notes?: unknown;
}

const VALID_PLANS:   Plan[]         = ["free", "diy", "standard", "premium"];
const VALID_STATUSES: ClientStatus[] = [
  "pending_connection", "missing_id", "ready_for_audit",
  "audit_in_progress", "audit_complete", "disputes_drafted",
  "disputes_sent", "waiting_on_bureau", "bureau_responded",
  "results_received", "complete",
];

function buildUpdate(raw: EditableClientFields): Record<string, unknown> | null {
  const update: Record<string, unknown> = {};

  if ("full_name" in raw)   update.full_name   = str(raw.full_name);
  if ("phone" in raw)       update.phone       = str(raw.phone);
  if ("address" in raw)     update.address     = str(raw.address);
  if ("goal" in raw)        update.goal        = str(raw.goal);
  if ("challenge" in raw)   update.challenge   = str(raw.challenge);
  if ("admin_notes" in raw) update.admin_notes = str(raw.admin_notes);

  if ("plan" in raw) {
    if (typeof raw.plan !== "string" || !VALID_PLANS.includes(raw.plan as Plan)) return null;
    update.plan = raw.plan;
  }

  if ("status" in raw) {
    if (typeof raw.status !== "string" || !VALID_STATUSES.includes(raw.status as ClientStatus)) return null;
    update.status = raw.status;
  }

  if ("progress" in raw) {
    if (typeof raw.progress !== "number" || !Number.isFinite(raw.progress)) return null;
    update.progress = Math.max(0, Math.min(100, Math.round(raw.progress)));
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

  const url = new URL(req.url ?? "/", "http://internal");
  const id = url.searchParams.get("id") ?? url.pathname.split("/").pop();
  // Clerk user ids are like "user_2abc..." — validate loosely so we don't
  // reject future Clerk id formats, but block obviously garbage input.
  if (!id || !/^[A-Za-z0-9_-]{4,}$/.test(id)) {
    return sendJson(res, 400, { error: "invalid_id" });
  }

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

  let callerId: string;
  try {
    const payload = await verifyToken(token, {
      secretKey:         clerkSecretKey,
      authorizedParties: getAuthorizedParties(),
    });
    if (typeof payload.sub !== "string" || !payload.sub) {
      return sendJson(res, 401, { error: "unauthorized" });
    }
    callerId = payload.sub;
  } catch {
    return sendJson(res, 401, { error: "unauthorized" });
  }

  const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", callerId)
    .single();
  if (me?.role !== "admin") {
    return sendJson(res, 403, { error: "forbidden" });
  }

  // ── DELETE ─────────────────────────────────────────────────────────────
  if (req.method === "DELETE") {
    // Self-delete guard: an admin hitting the delete button on their own
    // profile row would nuke their own auth + lock themselves out of the
    // dashboard mid-session. 400 at this layer is cleaner than letting it
    // succeed and leaving behind a confused admin.
    if (id === callerId) {
      return sendJson(res, 400, { error: "cannot_delete_self" });
    }

    // 1. Delete the Clerk user first (auth is the primary identity). If
    //    this succeeds the user can no longer sign in even if the
    //    Supabase delete fails — the profile row becomes orphaned data,
    //    which is recoverable. The reverse (Supabase first) would leave
    //    a signed-in user staring at a broken dashboard.
    try {
      const clerk = createClerkClient({ secretKey: clerkSecretKey });
      await clerk.users.deleteUser(id);
    } catch (err) {
      // Clerk returns 404 if the user is already gone — treat that as
      // success and continue to Supabase cleanup. Any other error is
      // fatal: abort so the operator can investigate.
      const status = (err as { status?: number } | null)?.status;
      if (status !== 404) {
        console.error("[/api/admin/client/:id DELETE] clerk_delete_failed:", err);
        return sendJson(res, 502, { error: "clerk_delete_failed" });
      }
    }

    // 2. Delete the Supabase profile. Foreign keys on messages +
    //    documents are ON DELETE CASCADE (migration 001), so those
    //    rows go with it. Supabase Storage files are NOT cleaned up
    //    here — any orphaned objects sit in the `documents` bucket
    //    until a scheduled cleanup picks them up.
    const { error: delErr } = await supabase
      .from("profiles")
      .delete()
      .eq("id", id);
    if (delErr) {
      console.error("[/api/admin/client/:id DELETE] supabase_delete_failed:", delErr.message);
      return sendJson(res, 500, { error: "supabase_delete_failed" });
    }

    return sendEmpty(res, 204);
  }

  // ── PATCH ──────────────────────────────────────────────────────────────
  const body = await readJsonBody<EditableClientFields>(req);
  if (!body) return sendJson(res, 400, { error: "invalid_body" });

  const update = buildUpdate(body);
  if (update === null)                   return sendJson(res, 400, { error: "invalid_fields" });
  if (Object.keys(update).length === 0)  return sendJson(res, 400, { error: "no_updates" });

  // Fetch current plan + email BEFORE applying the update so we can detect
  // plan-change events and tag the GHL contact downstream. One extra round
  // trip, but it's cheap (~30ms) and keeps the update atomic-ish.
  const { data: pre } = await supabase
    .from("profiles")
    .select("plan, email")
    .eq("id", id)
    .single();

  const { data, error } = await supabase
    .from("profiles")
    .update(update as Database["public"]["Tables"]["profiles"]["Update"])
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[/api/admin/client/:id PATCH] failed:", error.message);
    return sendJson(res, 500, { error: "update_failed" });
  }

  // Plan-change side effect: append a `granted:<tier>` tag to the matching
  // GHL contact so user-built workflows can trigger on admin-initiated
  // plan changes (welcome-to-access drip, upsell follow-ups, comp
  // acknowledgement emails, etc.). Fire-and-forget — the HTTP response
  // shouldn't block on GHL availability.
  const newPlan = update.plan as Plan | undefined;
  if (newPlan && pre?.plan !== newPlan && pre?.email) {
    addGHLPlanTag(pre.email, newPlan).catch(() => { /* already logged */ });
  }

  return sendJson(res, 200, { ok: true, client: data });
}
