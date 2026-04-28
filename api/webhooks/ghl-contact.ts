/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * POST /api/webhooks/ghl-contact
 *
 * Inbound sync from GoHighLevel. Lets a GHL Workflow → Webhook action push
 * a contact into our `lead_submissions` table whenever someone is added /
 * tagged in GHL through a non-quiz channel (manual entry, imported list,
 * other landing page, SMS keyword opt-in, etc.). Without this endpoint,
 * GHL is the source of truth for those leads but they never appear on
 * the admin dashboard, so dispute follow-up gets dropped.
 *
 * Security model:
 *   - Shared secret in `x-cpc-ghl-secret` header (env: GHL_WEBHOOK_SECRET).
 *     GHL Webhook actions support custom headers, so the secret never rides
 *     in the URL or body. Compared with `crypto.timingSafeEqual` to avoid
 *     timing oracles on header inspection.
 *   - Fail-closed on missing env: returns 500 server_misconfigured rather
 *     than accepting unauthenticated traffic.
 *   - Body cap (16 KB) — GHL contact payloads are well under 4 KB.
 *
 * Idempotency:
 *   - Upsert by case-insensitive email. Re-sending the same contact updates
 *     the existing row (last writer wins) instead of duplicating it.
 *   - We never overwrite a row that originated from /api/lead (source =
 *     'quiz_funnel'); the GHL push only fills in missing fields. This
 *     preserves the urgency_score/recommended_offer that the quiz funnel
 *     computed — those are derived from quiz answers we don't have here.
 *
 * Required env:
 *   GHL_WEBHOOK_SECRET            shared secret matching GHL Workflow header
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * GHL setup (admin one-time, documented in .env.example):
 *   1. Workflow → add "Webhook" action
 *   2. URL: https://<deployment>/api/webhooks/ghl-contact
 *   3. Method: POST
 *   4. Custom Header: x-cpc-ghl-secret = <GHL_WEBHOOK_SECRET value>
 *   5. Body (Custom JSON): map GHL fields to the contract below
 */

import type { IncomingMessage, ServerResponse } from "http";
import { timingSafeEqual } from "crypto";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../src/types/database";

export const config = { runtime: "nodejs" };

const MAX_BODY_BYTES = 16 * 1024;

// Contract we accept from GHL. Keys are camelCase to match the rest of our
// API surface; the GHL admin maps from GHL's `{{contact.field}}` tokens to
// these keys in the Workflow → Webhook action body editor.
interface GHLContactPayload {
  // Identity
  email?:         unknown;
  phone?:         unknown;
  fullName?:      unknown;  // GHL: {{contact.full_name}}
  firstName?:     unknown;  // fallback if fullName is empty
  lastName?:      unknown;
  contactId?:     unknown;  // GHL: {{contact.id}} — useful for cross-reference
  // Optional context
  source?:        unknown;  // free-form, e.g. "manual_entry", "facebook_lead"
  tags?:          unknown;  // string[] — passed through if provided
  consent?:       unknown;  // bool — defaults true (GHL contacts are opted-in)
}

interface SanitizedGHLContact {
  email:      string;
  phone:      string;
  fullName:   string;
  contactId:  string;
  source:     string;
  consent:    boolean;
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

async function readJsonBody(req: IncomingMessage): Promise<GHLContactPayload | null> {
  return new Promise((resolve) => {
    let received = 0;
    const chunks: Buffer[] = [];
    let aborted = false;
    req.on("data", (chunk: Buffer) => {
      if (aborted) return;
      received += chunk.length;
      if (received > MAX_BODY_BYTES) {
        aborted = true;
        resolve(null);
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (aborted) return;
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve(raw ? (JSON.parse(raw) as GHLContactPayload) : {});
      } catch {
        resolve(null);
      }
    });
    req.on("error", () => resolve(null));
  });
}

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

// Constant-time compare — guards against timing-oracle attacks on the
// shared secret header. Different-length inputs short-circuit to false
// before timingSafeEqual would throw.
function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

function joinName(first: string, last: string): string {
  return [first, last].filter(Boolean).join(" ").trim();
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "method_not_allowed" });
  }

  // 1. Auth — shared secret in custom header. Fail-closed on missing env so
  // we never silently accept unauthenticated GHL traffic in production.
  const expected = process.env.GHL_WEBHOOK_SECRET;
  if (!expected) {
    console.error("[/api/webhooks/ghl-contact] server_misconfigured — GHL_WEBHOOK_SECRET unset");
    return sendJson(res, 500, { error: "server_misconfigured" });
  }
  const provided = req.headers["x-cpc-ghl-secret"];
  const providedStr = Array.isArray(provided) ? provided[0] : provided;
  if (!providedStr || !safeEqual(providedStr, expected)) {
    return sendJson(res, 401, { error: "unauthorized" });
  }

  // 2. Body
  const body = await readJsonBody(req);
  if (!body) {
    return sendJson(res, 400, { error: "invalid_body" });
  }

  // 3. Validate + sanitize
  const email = str(body.email).toLowerCase();
  if (!email || !isEmail(email)) {
    return sendJson(res, 400, { error: "invalid_email" });
  }
  const fullName =
    str(body.fullName) ||
    joinName(str(body.firstName), str(body.lastName));
  const contact: SanitizedGHLContact = {
    email,
    phone:     str(body.phone),
    fullName,
    contactId: str(body.contactId),
    // Free-form, namespaced so admin can filter "where did this lead come
    // from" without colliding with the quiz_funnel/manual_admin sources.
    source:    str(body.source) || "ghl_workflow",
    // GHL contacts are opted-in by definition (they exist in GHL because
    // someone added them), so default true unless the workflow explicitly
    // sends false. Honors hard-coded false from custom-fields if needed.
    consent:   body.consent !== false,
  };

  // 4. Persist. We can't bail on missing Supabase env here — unlike
  // /api/lead, GHL IS the source of truth for these contacts already.
  // Returning 200 with a warning lets the workflow keep running; the row
  // just won't appear on the admin dashboard until env is fixed.
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("[/api/webhooks/ghl-contact] supabase_not_configured");
    return sendJson(res, 500, { error: "server_misconfigured" });
  }

  try {
    const supabase = createClient<Database>(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Look up an existing row by case-insensitive email so we can decide
    // whether to insert vs update without overwriting quiz-funnel data.
    const { data: existing, error: lookupErr } = await supabase
      .from("lead_submissions")
      .select("id, source, full_name, phone, ghl_contact_id")
      .ilike("email", email)
      .maybeSingle();

    if (lookupErr) {
      console.error("[/api/webhooks/ghl-contact] lookup_failed:", lookupErr.message);
      return sendJson(res, 500, { error: "lookup_failed" });
    }

    if (existing) {
      // Quiz_funnel rows already carry rich context (urgency_score,
      // obstacles, etc.) that GHL doesn't have. Only fill in fields the
      // existing row is missing — last-writer-wins would clobber them.
      const update: Database["public"]["Tables"]["lead_submissions"]["Update"] = {};
      if (!existing.full_name && contact.fullName) update.full_name = contact.fullName;
      if (!existing.phone && contact.phone)        update.phone = contact.phone;
      if (!existing.ghl_contact_id && contact.contactId) {
        update.ghl_contact_id = contact.contactId;
      }
      if (Object.keys(update).length === 0) {
        // Nothing to backfill — treat as a no-op success so GHL doesn't
        // retry. Still 200 so the workflow continues.
        return sendJson(res, 200, { ok: true, action: "noop", id: existing.id });
      }
      const { error: updateErr } = await supabase
        .from("lead_submissions")
        .update(update)
        .eq("id", existing.id);
      if (updateErr) {
        console.error("[/api/webhooks/ghl-contact] update_failed:", updateErr.message);
        return sendJson(res, 500, { error: "update_failed" });
      }
      return sendJson(res, 200, { ok: true, action: "updated", id: existing.id });
    }

    // New row. obstacles defaults to [] in the schema; everything else is
    // nullable. urgency_score / recommended_offer stay null because we
    // don't have the quiz signals to compute them.
    const { data: inserted, error: insertErr } = await supabase
      .from("lead_submissions")
      .insert({
        email,
        full_name:      contact.fullName || null,
        phone:          contact.phone    || null,
        source:         contact.source,
        ghl_contact_id: contact.contactId || null,
        // Already in GHL by definition, so the most accurate label is
        // 'api' — if a row originated from us calling GHL we'd mark
        // 'api' too. 'webhook_fallback' is reserved for /api/lead's
        // co-send path, which has different semantics.
        ghl_delivery:   "api",
        consent:        contact.consent,
        submitted_at:   new Date().toISOString(),
      })
      .select("id")
      .single();
    if (insertErr) {
      console.error("[/api/webhooks/ghl-contact] insert_failed:", insertErr.message);
      return sendJson(res, 500, { error: "insert_failed" });
    }
    return sendJson(res, 200, { ok: true, action: "inserted", id: inserted?.id });
  } catch (err) {
    console.error("[/api/webhooks/ghl-contact] unexpected:", err);
    return sendJson(res, 500, { error: "internal_error" });
  }
}
