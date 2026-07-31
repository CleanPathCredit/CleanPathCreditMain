/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * POST /api/ebook
 *
 * E-book lead-magnet opt-in capture. Visitor enters email + first name in
 * the EbookModal popup; this endpoint persists to Supabase + tags the
 * GoHighLevel contact with `cpc_ebook_optin` so the GHL email automation
 * (PDF attachment + 14-day drip) can fire.
 *
 * The actual PDF delivery happens server-side in GHL — we do NOT attach
 * the PDF here. Keeping that separation means swapping the e-book file or
 * tweaking the drip cadence is a GHL-only change.
 *
 * Submissions land in two places (best-effort — either may be unset):
 *   1. Supabase lead_submissions — source="ebook_optin_v1", consent=true.
 *      Same table as quiz funnel + sms-consent for unified admin view.
 *      lead_submissions.email is NOT NULL (enforced at validation).
 *   2. GoHighLevel — contact upsert with cpc_ebook_optin tag (drives the
 *      automation) plus a note logging IP/UA/referrer for audit.
 *
 * Bot protection (mirrors /api/sms-consent.ts):
 *   - Honeypot field `website` — non-empty silently 200s.
 *   - No Cloudflare Turnstile. Honeypot is sufficient for this low-stakes
 *     low-volume form. If/when ebook spam becomes a real signal, wire
 *     Turnstile here AND in the modal client at the same time.
 *
 * Compliance posture:
 *   - The e-book is FREE and no purchase is offered through this endpoint,
 *     so CROA §404(b) advance-fee restrictions don't apply.
 *   - Email collection requires CAN-SPAM-compliant unsubscribe (handled by
 *     GHL email automation footer).
 *   - Texas CSO registration must be approved before this endpoint is
 *     publicly advertised — soliciting CSO services in Texas without
 *     registration is itself a violation, and the e-book funnel is
 *     designed to convert e-book readers into CSO clients downstream.
 *
 * Required env (best-effort — any missing channel logs and skips):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  Persistent audit trail
 *   GHL_PRIVATE_INTEGRATION_TOKEN, GHL_LOCATION_ID  Contact + tag + note
 */

import type { IncomingMessage, ServerResponse } from "http";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/types/database";

export const config = { runtime: "nodejs" };

const MAX_BODY_BYTES = 16 * 1024;

const GHL_API_BASE    = "https://services.leadconnectorhq.com";
const GHL_API_VERSION = "2021-07-28";

interface EbookPayload {
  firstName?: unknown;
  email?:     unknown;
  source?:    unknown;  // 'modal_exit_intent' | 'modal_scroll' | 'inline'
  referrer?:  unknown;
  utmSource?: unknown;
  utmMedium?: unknown;
  utmCampaign?: unknown;
  website?:   unknown;  // honeypot
}

interface EbookRecord {
  firstName:    string;
  email:        string;       // required, lowercase
  triggerSource: string;      // 'modal_exit_intent' | 'modal_scroll' | 'inline'
  referrer:     string;
  utmSource:    string;
  utmMedium:    string;
  utmCampaign:  string;
  ipAddress:    string | undefined;
  userAgent:    string;
  submittedAt:  string;
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

async function readJsonBody(req: IncomingMessage): Promise<EbookPayload | null> {
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
        resolve(raw ? (JSON.parse(raw) as EbookPayload) : {});
      } catch {
        resolve(null);
      }
    });
    req.on("error", () => resolve(null));
  });
}

function getClientIp(req: IncomingMessage): string | undefined {
  const xff = req.headers["x-forwarded-for"];
  const header = Array.isArray(xff) ? xff[0] : xff;
  if (!header) return undefined;
  const first = header.split(",")[0]?.trim();
  return first || undefined;
}

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function upsertGHLContact(
  token: string,
  locationId: string,
  record: EbookRecord,
): Promise<{ ok: boolean; contactId?: string }> {
  const tags: string[] = ["cpc_ebook_optin"];
  // Append the trigger source so GHL workflows can branch on which
  // surface produced the opt-in (exit-intent vs. mid-scroll vs. inline
  // CTA). Useful for content optimization, not for compliance.
  if (record.triggerSource) tags.push(`ebook_source:${record.triggerSource}`);

  const payload: Record<string, unknown> = {
    locationId,
    email:  record.email,
    source: "Clean Path E-book Opt-in",
    tags,
  };
  if (record.firstName) payload.firstName = record.firstName;

  try {
    const resp = await fetch(`${GHL_API_BASE}/contacts/upsert`, {
      method: "POST",
      headers: {
        Authorization:  `Bearer ${token}`,
        Version:        GHL_API_VERSION,
        Accept:         "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      console.error(
        "[/api/ebook] ghl_upsert_failed status=%d body=%s",
        resp.status,
        text.slice(0, 300),
      );
      return { ok: false };
    }
    const data = (await resp.json().catch(() => ({}))) as {
      contact?: { id?: string };
      id?: string;
    };
    return { ok: true, contactId: data.contact?.id ?? data.id };
  } catch (err) {
    console.error("[/api/ebook] ghl_upsert_error:", err);
    return { ok: false };
  }
}

async function postGHLNote(
  token: string,
  contactId: string,
  body: string,
): Promise<void> {
  try {
    await fetch(`${GHL_API_BASE}/contacts/${contactId}/notes`, {
      method: "POST",
      headers: {
        Authorization:  `Bearer ${token}`,
        Version:        GHL_API_VERSION,
        Accept:         "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ body }),
    });
  } catch (err) {
    console.error("[/api/ebook] ghl_note_error:", err);
  }
}

function buildNoteBody(record: EbookRecord): string {
  return [
    `E-book opt-in`,
    `Recorded: ${record.submittedAt}`,
    `Email: ${record.email}`,
    `First name: ${record.firstName || "—"}`,
    `Trigger: ${record.triggerSource || "—"}`,
    `Referrer: ${record.referrer || "—"}`,
    `UTM: source=${record.utmSource || "—"} medium=${record.utmMedium || "—"} campaign=${record.utmCampaign || "—"}`,
    `IP: ${record.ipAddress || "—"}`,
    `UA: ${record.userAgent || "—"}`,
  ].join("\n");
}

async function persistOptIn(
  record: EbookRecord,
  ghlContactId: string | undefined,
): Promise<void> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.warn("[/api/ebook] supabase_not_configured — skipping persist");
    return;
  }
  try {
    const supabase = createClient<Database>(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await supabase.from("lead_submissions").insert({
      email:              record.email,
      full_name:          record.firstName || null,
      source:             "ebook_optin_v1",
      ghl_contact_id:     ghlContactId ?? null,
      ghl_delivery:       ghlContactId ? "api" : "failed",
      consent:            true,  // explicit opt-in by submitting the form
      submitted_at:       record.submittedAt,
    });
    if (error) {
      console.error("[/api/ebook] persist_failed:", error.message);
    }
  } catch (err) {
    console.error("[/api/ebook] persist_error:", err);
  }
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "method_not_allowed" });
  }

  const body = await readJsonBody(req);
  if (!body) {
    return sendJson(res, 400, { error: "invalid_body" });
  }

  // Honeypot — silently 200 so bots think they succeeded.
  if (str(body.website) !== "") {
    console.warn("[/api/ebook] honeypot_tripped");
    return sendJson(res, 200, { ok: true });
  }

  // Required-field validation.
  const firstName = str(body.firstName);
  const email     = str(body.email).toLowerCase();
  if (!email) {
    return sendJson(res, 400, { error: "email_required" });
  }
  if (!isEmail(email)) {
    return sendJson(res, 400, { error: "email_invalid" });
  }

  const record: EbookRecord = {
    firstName,
    email,
    triggerSource: str(body.source) || "modal_unspecified",
    referrer:      str(body.referrer),
    utmSource:     str(body.utmSource),
    utmMedium:     str(body.utmMedium),
    utmCampaign:   str(body.utmCampaign),
    ipAddress:     getClientIp(req),
    userAgent:     str(req.headers["user-agent"]) || "",
    submittedAt:   new Date().toISOString(),
  };

  // GHL upsert (best effort — failure is logged but not fatal).
  let ghlContactId: string | undefined;
  const ghlToken      = process.env.GHL_PRIVATE_INTEGRATION_TOKEN;
  const ghlLocationId = process.env.GHL_LOCATION_ID;
  if (ghlToken && ghlLocationId) {
    const result = await upsertGHLContact(ghlToken, ghlLocationId, record);
    if (result.ok && result.contactId) {
      ghlContactId = result.contactId;
      // Note write is fire-and-forget — never block the response on it.
      void postGHLNote(ghlToken, result.contactId, buildNoteBody(record));
    }
  } else {
    console.warn("[/api/ebook] ghl_not_configured — skipping upsert");
  }

  // Supabase persist (best effort).
  await persistOptIn(record, ghlContactId);

  // Always 2xx so the modal can show the success state. The PDF delivery
  // is GHL's responsibility; if GHL is mis-configured that surfaces in the
  // GHL workflow logs, not as a 5xx here.
  return sendJson(res, 200, { ok: true });
}
