/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * POST /api/sms-consent
 *
 * Captures explicit prior-express-written-consent for SMS messaging from
 * Clean Path Credit, per TCPA / CTIA / 47 CFR § 64.1200 requirements.
 *
 * Submissions land in two places (best-effort — either may be unset):
 *   1. Supabase lead_submissions table — source="sms_consent_v1",
 *      consent=true. Permanent audit trail readable from the admin
 *      dashboard.
 *   2. GoHighLevel — contact upsert with cpc_sms_consent_v1 + sms_consent
 *      (always) and sms_marketing_opt_in (if checked) tags, plus a
 *      detailed note containing IP, user agent, exact consent text
 *      snapshot, and consent version. Drives downstream automation
 *      (welcome SMS once A2P 10DLC campaign is live).
 *
 * IMPORTANT: CONSENT_TEXT_V1 below MUST stay in lockstep with:
 *   - src/pages/SmsConsent.tsx (the text shown to the consumer)
 *   - The opt-in language registered in Twilio A2P 10DLC
 * If you update one, update all three. Twilio A2P reviewers verify the
 * registered language matches what's on the live form.
 *
 * Bot protection:
 *   - Honeypot field `website` — if non-empty we silently 200 (mirrors
 *     /api/lead.ts pattern).
 *   - Cloudflare Turnstile — if TURNSTILE_SECRET_KEY is configured, we
 *     verify cf_turnstile_token. Missing/invalid token returns 400.
 *
 * Required env (best-effort — any missing channel is logged and skipped):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  Persistent audit trail
 *   GHL_PRIVATE_INTEGRATION_TOKEN, GHL_LOCATION_ID  Contact upsert + note
 * Optional:
 *   TURNSTILE_SECRET_KEY  Cloudflare Turnstile bot-verify
 *
 * NOTE: This endpoint accepts submissions BEFORE A2P 10DLC is approved.
 * No SMS is sent until the campaign is live; the welcome message after
 * approval will re-confirm opt-in and list STOP/HELP keywords.
 */

import type { IncomingMessage, ServerResponse } from "http";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/types/database";

export const config = { runtime: "nodejs" };

const MAX_BODY_BYTES = 16 * 1024;

const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const GHL_API_BASE         = "https://services.leadconnectorhq.com";
const GHL_API_VERSION      = "2021-07-28";

// MUST match the text rendered next to the service-consent checkbox in
// SmsConsent.tsx and the opt-in language registered in Twilio A2P. If you
// update this string, update both other locations in lockstep or A2P
// review will reject the registration.
const CONSENT_TEXT_V1 =
  "I agree to receive text messages from Clean Path Credit at the number provided. " +
  "Message and data rates may apply. Message frequency varies. " +
  "Reply STOP to unsubscribe, HELP for help.";

interface ConsentPayload {
  firstName?:          unknown;
  lastName?:           unknown;
  phone?:              unknown;
  email?:              unknown;
  serviceConsent?:     unknown;
  marketingConsent?:   unknown;
  consentVersion?:     unknown;
  website?:            unknown;  // honeypot
  cf_turnstile_token?: unknown;
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

async function readJsonBody(req: IncomingMessage): Promise<ConsentPayload | null> {
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
        resolve(raw ? (JSON.parse(raw) as ConsentPayload) : {});
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

/**
 * Normalize a US phone number to E.164. Accepts:
 *   - Already E.164: +13465550100
 *   - 11 digits with leading 1: 13465550100
 *   - 10-digit US: 3465550100
 *   - Anything with separators: (346) 555-0100, 346-555-0100, etc.
 * Returns null for anything else (international non-US, too short, etc.).
 */
function normalizePhone(raw: string): string | null {
  const cleaned = raw.replace(/[^\d+]/g, "");
  if (/^\+1\d{10}$/.test(cleaned)) return cleaned;
  if (/^1\d{10}$/.test(cleaned))    return "+" + cleaned;
  if (/^\d{10}$/.test(cleaned))     return "+1" + cleaned;
  return null;
}

async function verifyTurnstile(
  token: string,
  secret: string,
  remoteIp: string | undefined,
): Promise<boolean> {
  const form = new URLSearchParams();
  form.set("secret", secret);
  form.set("response", token);
  if (remoteIp) form.set("remoteip", remoteIp);
  try {
    const resp = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
    if (!resp.ok) return false;
    const data = (await resp.json()) as { success?: boolean };
    return data.success === true;
  } catch (err) {
    console.error("[/api/sms-consent] turnstile_verify_failed:", err);
    return false;
  }
}

interface ConsentRecord {
  firstName:        string;
  lastName:         string;
  fullName:         string;
  phone:            string;       // E.164
  email:            string;
  serviceConsent:   boolean;
  marketingConsent: boolean;
  consentText:      string;
  consentVersion:   string;
  ipAddress:        string | undefined;
  userAgent:        string;
  consentedAt:      string;
}

async function upsertGHLContact(
  token: string,
  locationId: string,
  record: ConsentRecord,
): Promise<{ ok: boolean; contactId?: string }> {
  const tags: string[] = ["cpc_sms_consent_v1"];
  if (record.serviceConsent)   tags.push("sms_consent");
  if (record.marketingConsent) tags.push("sms_marketing_opt_in");

  const payload: Record<string, unknown> = {
    locationId,
    phone:  record.phone,
    source: "Clean Path SMS Consent",
    tags,
  };
  if (record.email)     payload.email     = record.email;
  if (record.firstName) payload.firstName = record.firstName;
  if (record.lastName)  payload.lastName  = record.lastName;

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
        "[/api/sms-consent] ghl_upsert_failed status=%d body=%s",
        resp.status,
        text.slice(0, 300),
      );
      return { ok: false };
    }
    const data = (await resp.json().catch(() => ({}))) as { contact?: { id?: string }; id?: string };
    return { ok: true, contactId: data.contact?.id ?? data.id };
  } catch (err) {
    console.error("[/api/sms-consent] ghl_upsert_error:", err);
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
    console.error("[/api/sms-consent] ghl_note_error:", err);
  }
}

function buildNoteBody(record: ConsentRecord): string {
  return [
    `SMS Consent — ${record.consentVersion}`,
    `Recorded: ${record.consentedAt}`,
    `Phone: ${record.phone}`,
    `Email: ${record.email || "—"}`,
    `Name: ${record.fullName}`,
    `Service consent: ${record.serviceConsent ? "YES" : "no"}`,
    `Marketing consent: ${record.marketingConsent ? "yes (opted in)" : "no (declined)"}`,
    `IP: ${record.ipAddress || "—"}`,
    `User Agent: ${record.userAgent || "—"}`,
    ``,
    `Consent text shown to consumer:`,
    `"${record.consentText}"`,
  ].join("\n");
}

async function persistConsent(record: ConsentRecord, ghlContactId: string | undefined): Promise<void> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.warn("[/api/sms-consent] supabase_not_configured — skipping persist");
    return;
  }
  try {
    const supabase = createClient<Database>(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await supabase.from("lead_submissions").insert({
      email:              record.email || null,
      full_name:          record.fullName || null,
      phone:              record.phone,
      goal:               null,
      obstacles:          [],
      credit_score_range: null,
      income_range:       null,
      ideal_score:        null,
      timeline:           null,
      urgency_score:      null,
      urgency_tier:       null,
      // recommended_offer is non-null in the schema; "accelerated" matches
      // the default fallback in /api/lead.ts and is not meaningful for
      // pure-consent records (admin can ignore the field on these rows).
      recommended_offer:  "accelerated",
      source:             "sms_consent_v1",
      ghl_contact_id:     ghlContactId ?? null,
      ghl_delivery:       ghlContactId ? "api" : "failed",
      consent:            record.serviceConsent,
      submitted_at:       record.consentedAt,
    });
    if (error) {
      console.error("[/api/sms-consent] persist_failed:", error.message);
    }
  } catch (err) {
    console.error("[/api/sms-consent] persist_error:", err);
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

  // 1. Honeypot — silently 200 so bots think they succeeded.
  if (str(body.website) !== "") {
    console.warn("[/api/sms-consent] honeypot_tripped");
    return sendJson(res, 200, { ok: true });
  }

  // 2. Required-field validation (mirror client-side validation; we re-
  //    check because the endpoint is publicly reachable).
  const firstName        = str(body.firstName);
  const lastName         = str(body.lastName);
  const phoneRaw         = str(body.phone);
  const email            = str(body.email).toLowerCase();
  const serviceConsent   = body.serviceConsent === true;
  const marketingConsent = body.marketingConsent === true;
  const consentVersion   = str(body.consentVersion) || "v1";

  if (!firstName) {
    return sendJson(res, 400, { error: "first_name_required" });
  }
  if (!serviceConsent) {
    return sendJson(res, 400, { error: "service_consent_required" });
  }
  const phone = normalizePhone(phoneRaw);
  if (!phone) {
    return sendJson(res, 400, { error: "invalid_phone" });
  }
  if (email && !isEmail(email)) {
    return sendJson(res, 400, { error: "invalid_email" });
  }

  // 3. Turnstile (optional). Skip when no secret is configured — useful
  //    for environments where the site key is also absent. In production
  //    the secret MUST be set; otherwise we silently accept submissions
  //    behind only the honeypot.
  const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
  if (turnstileSecret) {
    const token = str(body.cf_turnstile_token);
    if (!token) {
      return sendJson(res, 400, { error: "turnstile_missing" });
    }
    const ok = await verifyTurnstile(token, turnstileSecret, getClientIp(req));
    if (!ok) {
      return sendJson(res, 400, { error: "turnstile_failed" });
    }
  }

  // 4. Build the consent record.
  const fullName = [firstName, lastName].filter(Boolean).join(" ");
  const record: ConsentRecord = {
    firstName,
    lastName,
    fullName,
    phone,
    email,
    serviceConsent,
    marketingConsent,
    consentText:    CONSENT_TEXT_V1,
    consentVersion,
    ipAddress:      getClientIp(req),
    userAgent:      str(req.headers["user-agent"]),
    consentedAt:    new Date().toISOString(),
  };

  // 5. Deliver to GHL (best-effort).
  let ghlContactId: string | undefined;
  const pit         = process.env.GHL_PRIVATE_INTEGRATION_TOKEN;
  const locationId  = process.env.GHL_LOCATION_ID;
  if (pit && locationId) {
    const result = await upsertGHLContact(pit, locationId, record);
    if (result.ok && result.contactId) {
      ghlContactId = result.contactId;
      // Fire-and-forget note post (don't block on it; if it fails we keep
      // the audit trail in Supabase via persistConsent below).
      postGHLNote(pit, result.contactId, buildNoteBody(record)).catch(() => { /* logged in fn */ });
    }
  } else {
    console.warn("[/api/sms-consent] ghl_not_configured");
  }

  // 6. Persist to Supabase (best-effort).
  await persistConsent(record, ghlContactId);

  console.log(
    `[/api/sms-consent] consent_recorded phone=%s marketing=%s ghl_contact_id=%s`,
    record.phone,
    record.marketingConsent,
    ghlContactId ?? "—",
  );

  return sendJson(res, 200, { ok: true });
}
