/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * POST /api/lead
 *
 * Same-origin proxy that accepts quiz submissions from the marketing site,
 * verifies bot-protection signals server-side, then delivers the lead to
 * GoHighLevel. Exists so no GHL credential ever ships to the client bundle —
 * anyone with DevTools could otherwise replay the upstream URL directly.
 *
 * Delivery paths (in priority order):
 *   1. GHL Contacts API (via Private Integration Token) — PRIMARY. Upserts
 *      the contact with standard fields, tags, and a formatted note. Gives
 *      us real HTTP errors + the contact ID back for attribution.
 *   2. GHL Inbound Webhook (GHL_WEBHOOK_URL) — FIRE-AND-FORGET co-send, so
 *      any existing "Inbound Webhook"-triggered workflows (SMS automations,
 *      pipeline entries, etc.) keep firing exactly as they did before.
 *   3. Webhook-only FALLBACK when the PIT + locationId aren't configured OR
 *      the API call fails. Preserves revert safety: unset the PIT env var
 *      and behavior reverts to the prior webhook-only flow.
 *
 * After successful delivery, fires a Meta Conversions API `Lead` event
 * server-side for ad attribution. _fbp and _fbc cookies (set client-side
 * by the Meta Pixel) are captured from the request and forwarded so Meta
 * can match the lead back to the original ad click. Best-effort — failure
 * is logged but never blocks the lead submission ack. Fired fire-and-
 * forget so a slow/hung Meta call doesn't delay the 200 to the client.
 *
 * Bot protection (audit finding C-4):
 *   - Honeypot field `website` — if non-empty we silently 200 so bots think
 *     the submission succeeded and don't adapt. Nothing is forwarded.
 *   - Cloudflare Turnstile — if TURNSTILE_SECRET_KEY is configured, we verify
 *     the `cf_turnstile_token` with Cloudflare's siteverify API before
 *     forwarding. Missing / invalid token returns 400 so the client UI stays
 *     on the form.
 *
 * Response contract (consumed by QuizFunnel.tsx):
 *   - 2xx → client advances to the success step
 *   - 4xx/5xx → client blocks the redirect and shows a retry prompt
 *   - Honeypot hit → 200 (intentional — looks identical to a real success)
 *
 * Required env (pick one delivery path; both preferred):
 *   GHL_PRIVATE_INTEGRATION_TOKEN   PIT from GHL → Settings → Private
 *                                   Integrations (starts with "pit-")
 *   GHL_LOCATION_ID                 Sub-account location ID
 *   GHL_WEBHOOK_URL                 Legacy inbound webhook URL (for existing
 *                                   workflow automations — co-sent alongside
 *                                   the API call)
 * Optional env:
 *   TURNSTILE_SECRET_KEY            Cloudflare Turnstile secret (enables verify)
 *   META_CAPI_INTERNAL_SECRET       Required to fire CAPI Lead events.
 *                                   Without it, the Meta call is silently
 *                                   skipped (logged as info, not error).
 *   META_CAPI_BASE_URL              Base URL for the /api/meta-capi endpoint.
 *                                   Defaults to https://cleanpathcredit.com.
 */

import type { IncomingMessage, ServerResponse } from "http";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { waitUntil } from "@vercel/functions";
import type { Database, UrgencyTier, RecommendedOffer, GHLDelivery } from "../src/types/database";

export const config = { runtime: "nodejs" };

// Cap body size to prevent a single misbehaving client from pinning the
// function with a multi-MB upload — quiz payloads are well under 4 KB.
const MAX_BODY_BYTES = 16 * 1024;

const TURNSTILE_VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

const GHL_API_BASE = "https://services.leadconnectorhq.com";
const GHL_API_VERSION = "2021-07-28";

interface LeadPayload {
  fullName?:           unknown;
  email?:              unknown;
  phone?:              unknown;
  consent?:            unknown;
  creditScore?:        unknown;
  income?:             unknown;
  idealScore?:         unknown;
  timeline?:           unknown;
  goal?:               unknown;
  obstacle?:           unknown;  // legacy/compat: comma-joined string
  obstacles?:          unknown;  // current: string[] (multi-select)
  urgencyScore?:       unknown;  // client-computed 0–100, higher = hotter lead
  readinessScore?:     unknown;  // legacy field from pre-flip clients; inverted if present
  website?:            unknown;  // honeypot
  cf_turnstile_token?: unknown;
}

interface SanitizedLead {
  fullName:      string;
  email:         string;
  phone:         string;
  consent:       boolean;
  creditScore:   string;
  income:        string;
  idealScore:    string;
  timeline:      string;
  goal:          string;
  obstacle:      string;
  obstacles:     string[];
  urgencyScore:  number | null;
  source:        string;
  submittedAt:   string;
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

async function readJsonBody(req: IncomingMessage): Promise<LeadPayload | null> {
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
        resolve(raw ? (JSON.parse(raw) as LeadPayload) : {});
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
  // First entry in the XFF chain is the original client on Vercel.
  const first = header.split(",")[0]?.trim();
  return first || undefined;
}

/**
 * Parse the request's Cookie header into a name→value map. We only need
 * Meta's _fbp / _fbc cookies for CAPI attribution, but the helper is
 * generic so it can be reused if other server-side cookie reads are
 * needed later.
 */
function parseCookies(req: IncomingMessage): Record<string, string> {
  const header = req.headers.cookie;
  if (!header) return {};
  const out: Record<string, string> = {};
  for (const pair of header.split(";")) {
    const idx = pair.indexOf("=");
    if (idx < 0) continue;
    const name = pair.slice(0, idx).trim();
    const val  = pair.slice(idx + 1).trim();
    if (!name) continue;
    try {
      out[name] = decodeURIComponent(val);
    } catch {
      // Malformed percent-encoding — keep the raw value rather than drop.
      out[name] = val;
    }
  }
  return out;
}

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isEmail(value: string): boolean {
  // Deliberately loose — GHL does its own validation. We only reject obvious
  // garbage so we don't forward it.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
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
    console.error("[/api/lead] turnstile_verify_failed:", err);
    return false;
  }
}

function splitName(full: string): { firstName?: string; lastName?: string } {
  const parts = full.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return {};
  if (parts.length === 1) return { firstName: parts[0] };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

// Bucket the 0–100 urgency score into the same 4 tiers the results page
// (QuizFunnel.tsx#urgencyTier) renders, so admin dashboard tags match
// exactly what the lead saw after submitting. Higher = more urgent.
function tierFromScore(score: number | null): UrgencyTier | null {
  if (score === null) return null;
  if (score >= 70) return "urgent";
  if (score >= 50) return "elevated";
  if (score >= 30) return "moderate";
  return "low";
}

// Derive which package to recommend from the urgency tier + obstacle
// density. Kept server-side so admin and lead see the same recommendation,
// and so the logic lives in one place. Per product decision, we never
// recommend DIY — every lead gets Accelerated or Executive as the
// default "right fit" offer; DIY stays in the catalog as an option
// they can pick themselves but we don't steer them there.
function recommendedOfferFrom(
  urgency:   number | null,
  obstacles: string[],
): RecommendedOffer {
  const hasHeavy = obstacles.some((o) => o === "bankruptcies" || o === "late");
  // Executive: the high-complexity profiles where done-for-you + business
  // credit positioning pays for itself.
  if ((urgency !== null && urgency >= 70) && obstacles.length >= 2) return "executive";
  if (obstacles.length >= 3 && hasHeavy)                            return "executive";
  if (urgency !== null && urgency >= 80)                            return "executive";
  return "accelerated";
}

function buildNoteBody(lead: SanitizedLead): string {
  const when = new Date(lead.submittedAt).toISOString();
  const lines: string[] = [
    `Clean Path quiz submission (${when} UTC)`,
    `• Goal: ${lead.goal || "—"}`,
    `• Obstacles: ${lead.obstacles.length ? lead.obstacles.join(", ") : "—"}`,
    `• Credit score range: ${lead.creditScore || "—"}`,
    `• Annual income range: ${lead.income || "—"}`,
    `• Ideal credit score: ${lead.idealScore || "—"}`,
    `• Timeline: ${lead.timeline || "—"}`,
    `• Urgency score: ${lead.urgencyScore !== null ? `${lead.urgencyScore}/100 (higher = hotter)` : "—"}`,
    `• Consent to contact: ${lead.consent ? "yes" : "no"}`,
  ];
  return lines.join("\n");
}

/**
 * Upsert a contact via the GHL v2 Contacts API. Dedupes by email/phone at
 * the location level per the account's "Allow Duplicate Contact" setting.
 * Returns the contact ID on success for downstream note posting.
 */
async function upsertGHLContact(
  token: string,
  locationId: string,
  lead: SanitizedLead,
): Promise<{ ok: boolean; contactId?: string; status?: number; errorText?: string }> {
  const { firstName, lastName } = splitName(lead.fullName);

  // Tags drive workflow automations. Prefix-namespaced so sales can filter
  // quiz leads + build funnel-stage segments without custom fields.
  const tags: string[] = ["cpc_quiz_lead"];
  if (lead.goal)      tags.push(`goal:${lead.goal}`);
  for (const o of lead.obstacles) tags.push(`obstacle:${o}`);
  if (lead.timeline)  tags.push(`timeline:${lead.timeline}`);
  const urgencyBucket = tierFromScore(lead.urgencyScore);
  if (urgencyBucket) tags.push(`urgency:${urgencyBucket}`);

  const payload: Record<string, unknown> = {
    locationId,
    email:  lead.email,
    phone:  lead.phone,
    source: "Clean Path Quiz",
    tags,
  };
  if (firstName) payload.firstName = firstName;
  if (lastName)  payload.lastName  = lastName;

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
      const errorText = await resp.text().catch(() => "");
      console.error(
        "[/api/lead] ghl_upsert_failed status=%d body=%s",
        resp.status,
        errorText.slice(0, 500),
      );
      return { ok: false, status: resp.status, errorText: errorText.slice(0, 500) };
    }
    const data = (await resp.json().catch(() => ({}))) as {
      contact?: { id?: string };
      id?: string;
    };
    const contactId = data.contact?.id ?? data.id;
    return { ok: true, contactId };
  } catch (err) {
    console.error("[/api/lead] ghl_upsert_error:", err);
    return { ok: false };
  }
}

/**
 * Post a note with the full quiz answers to the contact. Best-effort — the
 * contact exists whether this succeeds or not, so a failure here only loses
 * the audit log, not the lead.
 */
async function postGHLNote(
  token: string,
  contactId: string,
  body: string,
): Promise<void> {
  try {
    const resp = await fetch(`${GHL_API_BASE}/contacts/${contactId}/notes`, {
      method: "POST",
      headers: {
        Authorization:  `Bearer ${token}`,
        Version:        GHL_API_VERSION,
        Accept:         "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ body }),
    });
    if (!resp.ok) {
      const errorText = await resp.text().catch(() => "");
      console.error(
        "[/api/lead] ghl_note_failed status=%d body=%s",
        resp.status,
        errorText.slice(0, 300),
      );
    }
  } catch (err) {
    console.error("[/api/lead] ghl_note_error:", err);
  }
}

/**
 * Persist the lead to Supabase so it shows up on the admin dashboard even
 * if the lead never registers. Admin reads are gated by is_admin() RLS;
 * we write with the service-role key which bypasses RLS. Best-effort: if
 * Supabase is down or env is unset, we still forward to GHL. Logs are
 * kept terse so the CloudWatch-equivalent view stays clean.
 */
async function persistLeadSubmission(
  lead: SanitizedLead,
  ghlContactId: string | undefined,
  ghlDelivery: GHLDelivery,
): Promise<void> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    // Supabase isn't provisioned for this env — GHL is still the source of
    // truth, the dashboard view just misses this submission.
    console.warn("[/api/lead] supabase_not_configured — skipping persist");
    return;
  }
  try {
    const supabase = createClient<Database>(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await supabase.from("lead_submissions").insert({
      email:              lead.email,
      full_name:          lead.fullName || null,
      phone:              lead.phone    || null,
      goal:               lead.goal     || null,
      obstacles:          lead.obstacles,
      credit_score_range: lead.creditScore || null,
      income_range:       lead.income      || null,
      ideal_score:        lead.idealScore  || null,
      timeline:           lead.timeline    || null,
      urgency_score:      lead.urgencyScore,
      urgency_tier:       tierFromScore(lead.urgencyScore),
      recommended_offer:  recommendedOfferFrom(lead.urgencyScore, lead.obstacles),
      source:             lead.source,
      ghl_contact_id:     ghlContactId ?? null,
      ghl_delivery:       ghlDelivery,
      consent:            lead.consent,
      submitted_at:       lead.submittedAt,
    });
    if (error) {
      console.error("[/api/lead] persist_failed:", error.message);
    }
  } catch (err) {
    console.error("[/api/lead] persist_error:", err);
  }
}

/**
 * Co-send to the legacy inbound webhook so existing workflow automations
 * (SMS drips, pipeline stage moves, etc.) keep firing. Fire-and-forget —
 * we don't fail the lead submission if the webhook is slow or down.
 */
async function coSendWebhook(webhookUrl: string, lead: SanitizedLead): Promise<boolean> {
  try {
    const resp = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(lead),
    });
    if (!resp.ok) {
      console.error("[/api/lead] ghl_webhook_failed status=%d", resp.status);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[/api/lead] ghl_webhook_error:", err);
    return false;
  }
}

/**
 * Build a deterministic event_id for Meta CAPI Lead events.
 *
 * Constraints:
 *   - Must NOT contain raw PII (email, phone, name). Meta receives event_id
 *     unchanged and we already SHA-256-hash everything in user_data; the
 *     event_id field needs the same posture.
 *   - Must be reproducible client-side so a future browser-side Pixel can
 *     fire the same event_id and let Meta dedupe the two events against
 *     each other.
 *
 * Strategy:
 *   - When a GHL contact ID is available (API delivery path), use it
 *     directly — it's an opaque server-generated identifier with no PII.
 *   - When only the webhook-fallback path is available, hash
 *     `email||submittedAt` with SHA-256 and use the hex digest. The
 *     browser-side Pixel can compute the same hash with Web Crypto's
 *     subtle.digest("SHA-256", ...) and produce the same event_id for
 *     dedup.
 */
function buildLeadEventId(args: { ghlContactId?: string; email: string; submittedAt: string }): string {
  if (args.ghlContactId) {
    return `lead-${args.ghlContactId}-${args.submittedAt}`;
  }
  const hash = crypto
    .createHash("sha256")
    .update(`${args.email}||${args.submittedAt}`)
    .digest("hex");
  return `lead-${hash}`;
}

/**
 * Fire a Meta Conversions API Lead event server-side.
 *
 * Best-effort. Failure is logged but never blocks the lead submission —
 * Meta CAPI is supplemental to the browser-side Pixel, not load-bearing.
 * Designed to be invoked fire-and-forget by the caller (no await, with
 * a `.catch()` to swallow unhandled rejections) so submit latency isn't
 * gated on attribution delivery.
 *
 * event_id design (see buildLeadEventId):
 *   - GHL contact ID when available; SHA-256(email||submittedAt) otherwise.
 *   - Never contains raw email or other PII.
 *
 * _fbp / _fbc cookie capture:
 *   - The Meta Pixel sets _fbp on first page-load and _fbc when the
 *     visitor lands with ?fbclid=... from a Meta ad. Without these,
 *     server-side Lead events have a much lower chance of attributing
 *     back to the originating ad click.
 *   - Caller passes both from req.cookies; we forward unchanged.
 *
 * Calls /api/meta-capi over HTTP with the X-Internal-Secret header so
 * the same auth gate that protects the proxy from public abuse covers
 * this internal call. Response parsing matches the Stripe webhook
 * pattern: log success only when body.ok === true.
 */
async function fireMetaCapiLead(args: {
  lead:          SanitizedLead;
  ghlContactId?: string;
  fbp?:          string;
  fbc?:          string;
  ipAddress?:    string;
  userAgent?:    string;
}): Promise<void> {
  const internalSecret = process.env.META_CAPI_INTERNAL_SECRET;
  if (!internalSecret) {
    console.info("[/api/lead] meta_capi_skip — no META_CAPI_INTERNAL_SECRET");
    return;
  }

  const baseUrl = process.env.META_CAPI_BASE_URL ?? "https://cleanpathcredit.com";
  const url     = `${baseUrl}/api/meta-capi`;

  const eventId = buildLeadEventId({
    ghlContactId: args.ghlContactId,
    email:        args.lead.email,
    submittedAt:  args.lead.submittedAt,
  });

  try {
    const resp = await fetch(url, {
      method:  "POST",
      headers: {
        "Content-Type":      "application/json",
        "X-Internal-Secret": internalSecret,
      },
      body: JSON.stringify({
        event_name:    "Lead",
        event_id:      eventId,
        action_source: "website",
        user_data: {
          email:             args.lead.email,
          phone:             args.lead.phone || undefined,
          external_id:       args.ghlContactId,
          fbp:               args.fbp,
          fbc:               args.fbc,
          client_ip_address: args.ipAddress,
          client_user_agent: args.userAgent,
        },
        custom_data: {
          // Meta Lead events don't have a fixed value field; we surface
          // the funnel context via content_name (goal) and
          // content_category (the first obstacle) so segments can be
          // built in Ads Manager based on lead intent.
          content_name:     args.lead.goal || undefined,
          content_category: args.lead.obstacles[0] || undefined,
        },
      }),
    });

    const respBody = (await resp.json().catch(() => ({}))) as {
      ok?: boolean;
      reason?: string;
      status?: number;
      event_id?: string;
    };

    if (!resp.ok || respBody.ok !== true) {
      console.warn(
        "[/api/lead] meta_capi_lead_not_delivered http_status=%d ok=%s reason=%s upstream_status=%s",
        resp.status,
        respBody.ok,
        respBody.reason ?? "—",
        respBody.status ?? "—",
      );
      return;
    }

    console.log(
      `[/api/lead] meta_capi_lead_fired event_id=${eventId} fbp=${args.fbp ? "yes" : "no"} fbc=${args.fbc ? "yes" : "no"}`,
    );
  } catch (err) {
    console.error("[/api/lead] meta_capi_lead_error:", err);
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

  // 1. Honeypot. Real users never see this field; bots that scrape-and-fill
  // every input trip it. Return 200 to avoid teaching the bot our signal.
  if (str(body.website) !== "") {
    console.warn("[/api/lead] honeypot_tripped");
    return sendJson(res, 200, { ok: true });
  }

  // 2. Required-field validation. Client already enforces these; we re-check
  // because the proxy is publicly reachable.
  const email = str(body.email);
  const phone = str(body.phone);
  const consent = body.consent === true;
  if (!email || !isEmail(email) || !phone || !consent) {
    return sendJson(res, 400, { error: "invalid_fields" });
  }

  // 3. Turnstile. Skip verification only when no secret is configured —
  // useful for local dev where the site key is absent too. In production
  // the secret MUST be set; otherwise we silently accept every submission.
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

  // 4. Sanitize. Rebuild from known keys only — no honeypot, no token, no
  // smuggled fields make it into the downstream payload.
  const obstaclesArr: string[] = Array.isArray(body.obstacles)
    ? body.obstacles
        .filter((x): x is string => typeof x === "string")
        .map((x) => x.trim())
        .filter((x) => x.length > 0 && x.length <= 64)
        .slice(0, 10)
    : [];
  const obstacleStr = obstaclesArr.length > 0 ? obstaclesArr.join(", ") : str(body.obstacle);

  // Urgency score: higher = hotter lead. Accept either `urgencyScore`
  // (current client) or `readinessScore` (legacy pre-flip client) — the
  // latter is inverted via (100 - n) so data stays consistent in the
  // rare window when an old cached tab hits the new server.
  let urgencyScore: number | null = null;
  const urgencyRaw = typeof body.urgencyScore === "number" ? body.urgencyScore : null;
  if (urgencyRaw !== null && Number.isFinite(urgencyRaw)) {
    urgencyScore = Math.max(0, Math.min(100, Math.round(urgencyRaw)));
  } else {
    const readinessRaw = typeof body.readinessScore === "number" ? body.readinessScore : null;
    if (readinessRaw !== null && Number.isFinite(readinessRaw)) {
      urgencyScore = Math.max(0, Math.min(100, Math.round(100 - readinessRaw)));
    }
  }

  const lead: SanitizedLead = {
    fullName:      str(body.fullName),
    email,
    phone,
    consent,
    creditScore:   str(body.creditScore),
    income:        str(body.income),
    idealScore:    str(body.idealScore),
    timeline:      str(body.timeline),
    goal:          str(body.goal),
    obstacle:      obstacleStr,
    obstacles:     obstaclesArr,
    urgencyScore,
    source:        "quiz_funnel",
    submittedAt:   new Date().toISOString(),
  };

  // 5. Deliver. API upsert is primary; webhook co-send preserves existing
  // automations; webhook-only fallback kicks in if the API route isn't
  // configured or fails.
  const pit         = process.env.GHL_PRIVATE_INTEGRATION_TOKEN;
  const locationId  = process.env.GHL_LOCATION_ID;
  const webhookUrl  = process.env.GHL_WEBHOOK_URL;
  const hasApi      = Boolean(pit && locationId);

  if (!hasApi && !webhookUrl) {
    console.error("[/api/lead] server_misconfigured — no GHL route configured");
    return sendJson(res, 500, { error: "server_misconfigured" });
  }

  let apiResult: Awaited<ReturnType<typeof upsertGHLContact>> | null = null;
  if (hasApi) {
    apiResult = await upsertGHLContact(pit!, locationId!, lead);
    if (apiResult.ok && apiResult.contactId) {
      // Post the detailed note in the background so the user's submission
      // doesn't block on GHL's second call. If it fails, the contact is
      // still there — we just lose the structured audit trail.
      postGHLNote(pit!, apiResult.contactId, buildNoteBody(lead)).catch(() => { /* already logged */ });
    }
  }

  // Co-send or fallback to webhook.
  let webhookOk = false;
  if (webhookUrl) {
    webhookOk = await coSendWebhook(webhookUrl, lead);
  }

  // Success if ANY delivery channel confirmed. Only fail the request when
  // every configured channel failed — otherwise the lead would bounce in
  // the UI despite having landed somewhere.
  const delivered = (apiResult?.ok === true) || webhookOk;
  if (!delivered) {
    // Still persist the attempt so the admin dashboard can see submissions
    // that failed delivery — otherwise these leads would vanish without a
    // trace. Delivery status marks them as 'failed' so sales can follow up.
    await persistLeadSubmission(lead, undefined, "failed");
    return sendJson(res, 502, {
      error: "upstream_failed",
      // Surface the GHL status so front-end debugging in DevTools shows
      // the specific reason without having to dig through Vercel logs.
      ghl_status: apiResult?.status,
    });
  }

  // Persist to Supabase for the admin dashboard. Await so a batch of rapid
  // submissions can't race — the write is cheap (~50ms) and we want the
  // admin to see the row immediately on the next dashboard refresh.
  const delivery: GHLDelivery = apiResult?.ok === true ? "api" : "webhook_fallback";
  await persistLeadSubmission(lead, apiResult?.contactId, delivery);

  // Fire Meta CAPI Lead event for ad attribution. FIRE-AND-FORGET — we
  // don't await so the 200 ack to the client isn't gated on Meta's
  // response time. Meta CAPI is supplemental; failure or slowness here
  // must not regress submit latency. The promise has its own try/catch
  // internally; the outer .catch() is a defensive net for anything
  // unexpected (e.g. a synchronous throw before the try block).
  //
  // _fbp / _fbc cookies are read off the request: the Meta Pixel sets
  // _fbp on first page-load and _fbc when the visitor lands with
  // ?fbclid=... from an ad. Without these, server-side Lead events have
  // a much lower chance of matching back to the original ad click.
  //
  // Wrapped in waitUntil() so Vercel keeps the function alive past
  // res.end() until the Meta call completes. Without waitUntil, the
  // bare fire-and-forget promise can be frozen/cancelled when the
  // function returns and Lead events get dropped intermittently
  // (https://vercel.com/docs/functions/functions-api-reference/vercel-functions-package).
  const cookies   = parseCookies(req);
  const userAgent = req.headers["user-agent"];
  waitUntil(
    fireMetaCapiLead({
      lead,
      ghlContactId: apiResult?.contactId,
      fbp:          cookies._fbp,
      fbc:          cookies._fbc,
      ipAddress:    getClientIp(req),
      userAgent:    typeof userAgent === "string" ? userAgent : undefined,
    }).catch((err) => {
      console.error("[/api/lead] meta_capi_lead_unhandled_error:", err);
    }),
  );

  return sendJson(res, 200, {
    ok: true,
    contactId: apiResult?.contactId,
  });
}
