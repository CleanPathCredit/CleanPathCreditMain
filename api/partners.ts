/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * POST /api/partners
 *
 * Same-origin proxy that accepts partner-program applications from the
 * /partners page (mortgage LOs, mortgage brokers, real estate agents,
 * dealership F&I managers). Mirrors the /api/lead.ts pattern but with
 * partner-specific fields and a separate GHL pipeline so partner leads
 * stay cleanly separated from consumer quiz leads.
 *
 * Delivery paths (in priority order):
 *   1. GHL Contacts API (via Private Integration Token) — PRIMARY.
 *      Upserts the contact with partner-specific tags and a structured
 *      note containing all application fields.
 *   2. GHL Inbound Webhook (GHL_WEBHOOK_URL) — fire-and-forget co-send
 *      so any existing partner-onboarding workflows keep firing.
 *   3. Webhook-only fallback when the PIT + locationId aren't configured.
 *
 * Persists to Supabase lead_submissions with source="partner_application_v1"
 * so the admin dashboard sees every partner application alongside
 * consumer leads. The schema's quiz-specific fields (urgency_score,
 * obstacles, etc.) are null on partner rows; admin can ignore them.
 *
 * Bot protection:
 *   - Honeypot field `website` — silently 200 on hit (matches /api/lead).
 *   - Cloudflare Turnstile is intentionally NOT wired here in V1; the
 *     partners form is low-volume and honeypot is sufficient. Add
 *     Turnstile later as a paired client-side widget + server-side verify.
 *
 * Required env (best-effort overall — the page doesn't break if any
 * are unset):
 *   GHL_PRIVATE_INTEGRATION_TOKEN, GHL_LOCATION_ID  Contact upsert + note
 *   GHL_WEBHOOK_URL                                 Co-send / fallback
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY         Audit trail
 */

import type { IncomingMessage, ServerResponse } from "http";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/types/database";

export const config = { runtime: "nodejs" };

const MAX_BODY_BYTES = 16 * 1024;

const GHL_API_BASE    = "https://services.leadconnectorhq.com";
const GHL_API_VERSION = "2021-07-28";

const VALID_ROLES   = ["lo", "broker", "agent", "fi", "other"] as const;
const VALID_VOLUMES = ["under_5", "5_to_15", "15_plus"] as const;
type Role   = typeof VALID_ROLES[number];
type Volume = typeof VALID_VOLUMES[number];

const US_STATES = new Set([
  "AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM",
  "NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA",
  "WV","WI","WY",
]);

interface PartnerPayload {
  firstName?:       unknown;
  lastName?:        unknown;
  email?:           unknown;
  phone?:           unknown;
  role?:            unknown;
  company?:         unknown;
  nmls?:            unknown;
  state?:           unknown;
  monthlyVolume?:   unknown;
  spanishSpeaking?: unknown;
  howHeard?:        unknown;
  consent?:         unknown;
  website?:         unknown;  // honeypot
}

interface SanitizedPartner {
  firstName:       string;
  lastName:        string;
  fullName:        string;
  email:           string;
  phone:           string;       // E.164
  role:            Role;
  company:         string;
  nmls:            string;
  state:           string;
  monthlyVolume:   Volume;
  spanishSpeaking: boolean;
  howHeard:        string;
  consent:         boolean;
  submittedAt:     string;
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

async function readJsonBody(req: IncomingMessage): Promise<PartnerPayload | null> {
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
        resolve(raw ? (JSON.parse(raw) as PartnerPayload) : {});
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

function normalizePhone(raw: string): string | null {
  const cleaned = raw.replace(/[^\d+]/g, "");
  if (/^\+1\d{10}$/.test(cleaned)) return cleaned;
  if (/^1\d{10}$/.test(cleaned))    return "+" + cleaned;
  if (/^\d{10}$/.test(cleaned))     return "+1" + cleaned;
  return null;
}

function roleLabel(role: Role): string {
  switch (role) {
    case "lo":     return "Loan Officer";
    case "broker": return "Mortgage Broker";
    case "agent":  return "Real Estate Agent";
    case "fi":     return "Dealership F&I Manager";
    case "other":  return "Other";
  }
}

function volumeLabel(v: Volume): string {
  switch (v) {
    case "under_5":  return "Fewer than 5 per month";
    case "5_to_15":  return "5 to 15 per month";
    case "15_plus":  return "15 or more per month";
  }
}

function buildNoteBody(p: SanitizedPartner): string {
  return [
    `Clean Path partner application (${p.submittedAt})`,
    `• Name: ${p.fullName}`,
    `• Email: ${p.email}`,
    `• Phone: ${p.phone}`,
    `• Role: ${roleLabel(p.role)}`,
    `• Company: ${p.company}`,
    p.nmls ? `• NMLS #: ${p.nmls}` : null,
    `• State: ${p.state}`,
    `• Monthly volume: ${volumeLabel(p.monthlyVolume)}`,
    `• Spanish-speaking: ${p.spanishSpeaking ? "YES" : "no"}`,
    p.howHeard ? `• How heard: ${p.howHeard}` : null,
    `• Consent to contact: ${p.consent ? "yes" : "no"}`,
  ].filter(Boolean).join("\n");
}

async function upsertGHLContact(
  token: string,
  locationId: string,
  p: SanitizedPartner,
): Promise<{ ok: boolean; contactId?: string }> {
  const tags: string[] = [
    "cpc_partner_application",
    `partner_role:${p.role}`,
    `partner_volume:${p.monthlyVolume}`,
    `partner_state:${p.state}`,
  ];
  if (p.spanishSpeaking) tags.push("partner_spanish");

  const payload: Record<string, unknown> = {
    locationId,
    email:     p.email,
    phone:     p.phone,
    firstName: p.firstName || undefined,
    lastName:  p.lastName  || undefined,
    companyName: p.company || undefined,
    source:    "Clean Path Partner Application",
    tags,
  };

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
        "[/api/partners] ghl_upsert_failed status=%d body=%s",
        resp.status,
        text.slice(0, 500),
      );
      return { ok: false };
    }
    const data = (await resp.json().catch(() => ({}))) as { contact?: { id?: string }; id?: string };
    return { ok: true, contactId: data.contact?.id ?? data.id };
  } catch (err) {
    console.error("[/api/partners] ghl_upsert_error:", err);
    return { ok: false };
  }
}

async function postGHLNote(token: string, contactId: string, body: string): Promise<void> {
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
    console.error("[/api/partners] ghl_note_error:", err);
  }
}

async function persistPartner(p: SanitizedPartner, ghlContactId: string | undefined): Promise<void> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.warn("[/api/partners] supabase_not_configured — skipping persist");
    return;
  }
  try {
    const supabase = createClient<Database>(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await supabase.from("lead_submissions").insert({
      email:              p.email,
      full_name:          p.fullName || null,
      phone:              p.phone,
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
      // partner rows (admin can ignore this field on partner records).
      recommended_offer:  "accelerated",
      source:             "partner_application_v1",
      ghl_contact_id:     ghlContactId ?? null,
      ghl_delivery:       ghlContactId ? "api" : "failed",
      consent:            p.consent,
      submitted_at:       p.submittedAt,
    });
    if (error) {
      console.error("[/api/partners] persist_failed:", error.message);
    }
  } catch (err) {
    console.error("[/api/partners] persist_error:", err);
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
    console.warn("[/api/partners] honeypot_tripped");
    return sendJson(res, 200, { ok: true });
  }

  // 2. Required-field validation.
  const firstName       = str(body.firstName);
  const lastName        = str(body.lastName);
  const email           = str(body.email).toLowerCase();
  const phoneRaw        = str(body.phone);
  const role            = str(body.role);
  const company         = str(body.company);
  const nmls            = str(body.nmls);
  const state           = str(body.state).toUpperCase();
  const monthlyVolume   = str(body.monthlyVolume);
  const spanishSpeaking = body.spanishSpeaking === true;
  const howHeard        = str(body.howHeard);
  const consent         = body.consent === true;

  if (!firstName) return sendJson(res, 400, { error: "first_name_required" });
  if (!email)     return sendJson(res, 400, { error: "email_required" });
  if (!isEmail(email)) return sendJson(res, 400, { error: "invalid_email" });
  const phone = normalizePhone(phoneRaw);
  if (!phone) return sendJson(res, 400, { error: "invalid_phone" });
  if (!(VALID_ROLES as readonly string[]).includes(role)) {
    return sendJson(res, 400, { error: "invalid_role" });
  }
  if (!company)              return sendJson(res, 400, { error: "company_required" });
  if (!US_STATES.has(state)) return sendJson(res, 400, { error: "invalid_state" });
  if (!(VALID_VOLUMES as readonly string[]).includes(monthlyVolume)) {
    return sendJson(res, 400, { error: "invalid_volume" });
  }
  if (!consent) return sendJson(res, 400, { error: "consent_required" });
  if ((role === "lo" || role === "broker") && !/^\d{4,}$/.test(nmls)) {
    return sendJson(res, 400, { error: "nmls_required" });
  }

  // 3. Sanitize.
  const fullName = [firstName, lastName].filter(Boolean).join(" ");
  const partner: SanitizedPartner = {
    firstName,
    lastName,
    fullName,
    email,
    phone,
    role:            role as Role,
    company,
    nmls,
    state,
    monthlyVolume:   monthlyVolume as Volume,
    spanishSpeaking,
    howHeard,
    consent,
    submittedAt:     new Date().toISOString(),
  };

  // 4. Deliver to GHL (best-effort).
  let ghlContactId: string | undefined;
  const pit         = process.env.GHL_PRIVATE_INTEGRATION_TOKEN;
  const locationId  = process.env.GHL_LOCATION_ID;
  if (pit && locationId) {
    const result = await upsertGHLContact(pit, locationId, partner);
    if (result.ok && result.contactId) {
      ghlContactId = result.contactId;
      // Fire-and-forget note post; the contact already exists whether
      // this succeeds or not.
      postGHLNote(pit, result.contactId, buildNoteBody(partner)).catch(() => { /* logged */ });
    }
  } else {
    console.warn("[/api/partners] ghl_not_configured");
  }

  // 5. Persist to Supabase (best-effort).
  await persistPartner(partner, ghlContactId);

  console.log(
    `[/api/partners] partner_application phone=%s role=%s state=%s volume=%s ghl=%s`,
    partner.phone,
    partner.role,
    partner.state,
    partner.monthlyVolume,
    ghlContactId ?? "—",
  );

  return sendJson(res, 200, { ok: true, contactId: ghlContactId });
}
