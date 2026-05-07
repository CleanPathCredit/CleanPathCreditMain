/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * POST /api/meta-capi
 *
 * Meta Conversions API endpoint — forwards events to Meta server-side
 * to recover ~25-40% of conversions blocked by iOS 14+ browser-side
 * Pixel restrictions and ad-blockers.
 *
 * Why server-side:
 *   - iOS 14+ Mail Privacy Protection + ITP block the Pixel cookie
 *   - Browser ad-blockers strip the Pixel script entirely
 *   - CAPI uses email/phone/external_id (SHA-256 hashed) for deterministic match
 *   - Meta deduplicates by event_id when the same event fires both
 *     Pixel + CAPI, so no double-counting
 *
 * Callers (current + planned):
 *   - api/webhooks/stripe.ts  → Purchase event after checkout completes
 *   - api/lead.ts              → Lead event after form submit
 *   - src/pages/EsComprador.tsx → SpanishFunnelView (browser-side; mirrored
 *                                 here only for Composio runbook driven
 *                                 backfills, not for normal page views)
 *
 * Required env (set in Vercel):
 *   META_CAPI_ACCESS_TOKEN  System User access token from Meta Business
 *                           Manager → Settings → Users → System Users →
 *                           generate token with `ads_management` and
 *                           `business_management` scopes.
 *   META_PIXEL_ID           Numeric Pixel ID (same as VITE_META_PIXEL_ID).
 * Optional env:
 *   META_CAPI_TEST_EVENT_CODE
 *                           Pass-through to Meta's Test Events tab so you
 *                           can verify deliveries without polluting prod
 *                           attribution. Format: TEST12345
 *
 * Compliance posture:
 *   - All PII (email, phone) is SHA-256 hashed BEFORE leaving this
 *     function. Meta requires hashed user_data and rejects raw PII.
 *   - external_id is treated as opaque (not hashed if it already looks
 *     like a SHA-256 hex string).
 *   - No raw PII is logged. On failure, only HTTP status + truncated
 *     response body are logged.
 *   - Edge runtime (no Node `crypto` module). Web Crypto API is used
 *     via globalThis.crypto.subtle.digest('SHA-256', ...).
 *
 * Request body shape (CapiPayload):
 *   {
 *     event_name:     "Lead" | "Purchase" | "PageView" | etc.,
 *     event_id?:      string,             // for dedup vs Pixel; if omitted,
 *                                          // a UUID is generated
 *     event_time?:    number,              // unix seconds; defaults to now
 *     action_source?: "website" | "app" | "email" | "system_generated",
 *     user_data: {
 *       email?:             string,        // hashed before send
 *       phone?:             string,        // E.164 normalized then hashed
 *       external_id?:       string,        // already-hashed values pass through
 *       fbp?:               string,        // _fbp cookie value (raw, not hashed)
 *       fbc?:               string,        // _fbc cookie value (raw, not hashed)
 *       client_user_agent?: string,
 *       client_ip_address?: string,
 *     },
 *     custom_data?: { ... }                // pass-through to Meta (currency,
 *                                          // value, content_ids, etc.)
 *   }
 */

export const config = { runtime: "edge" };

const META_API_VERSION = "v18.0";

interface CapiPayload {
  event_name: string;
  event_id?: string;
  event_time?: number;
  action_source?: "website" | "app" | "email" | "system_generated";
  user_data?: {
    email?: string;
    phone?: string;
    external_id?: string;
    fbp?: string;
    fbc?: string;
    client_user_agent?: string;
    client_ip_address?: string;
  };
  custom_data?: Record<string, unknown>;
}

async function sha256(value: string): Promise<string> {
  const encoder    = new TextEncoder();
  const data       = encoder.encode(value.trim().toLowerCase());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** If `value` already looks like a SHA-256 hex string, pass through; else hash it. */
async function hashIfPresent(value: string | undefined): Promise<string | undefined> {
  if (!value) return undefined;
  if (/^[a-f0-9]{64}$/.test(value)) return value;
  return await sha256(value);
}

function normalizePhone(phone: string): string {
  // Meta expects E.164 without leading + or any non-digit chars
  return phone.replace(/[^\d]/g, "");
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;
  const pixelId     = process.env.META_PIXEL_ID;
  const testCode    = process.env.META_CAPI_TEST_EVENT_CODE;

  if (!accessToken || !pixelId) {
    // Fail-open for partial config — log and ack 200 so callers don't
    // retry. Meta CAPI is supplemental; the Pixel is the primary signal.
    console.warn("[/api/meta-capi] disabled — missing META_CAPI_ACCESS_TOKEN or META_PIXEL_ID");
    return new Response(JSON.stringify({ ok: false, reason: "not_configured" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  let payload: CapiPayload;
  try {
    payload = (await req.json()) as CapiPayload;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  if (!payload.event_name) {
    return new Response("Missing event_name", { status: 400 });
  }

  const userData: Record<string, string> = {};
  const u = payload.user_data ?? {};
  if (u.email) userData.em = await sha256(u.email);
  if (u.phone) userData.ph = await sha256(normalizePhone(u.phone));
  if (u.external_id) {
    const ext = await hashIfPresent(u.external_id);
    if (ext) userData.external_id = ext;
  }
  if (u.fbp)               userData.fbp = u.fbp;
  if (u.fbc)               userData.fbc = u.fbc;
  if (u.client_user_agent) userData.client_user_agent = u.client_user_agent;
  if (u.client_ip_address) userData.client_ip_address = u.client_ip_address;

  const eventTime = payload.event_time ?? Math.floor(Date.now() / 1000);
  const eventId   = payload.event_id ?? crypto.randomUUID();

  const body: Record<string, unknown> = {
    data: [
      {
        event_name:    payload.event_name,
        event_id:      eventId,
        event_time:    eventTime,
        action_source: payload.action_source ?? "website",
        user_data:     userData,
        custom_data:   payload.custom_data,
      },
    ],
  };
  if (testCode) body.test_event_code = testCode;

  try {
    const url = `https://graph.facebook.com/${META_API_VERSION}/${pixelId}/events?access_token=${accessToken}`;
    const resp = await fetch(url, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      console.error(
        "[/api/meta-capi] meta_api_failed status=%d body=%s",
        resp.status,
        text.slice(0, 500),
      );
      // ACK 200 so callers don't retry indefinitely. CAPI failures
      // are non-fatal; Pixel will still attribute browser-side.
      return new Response(JSON.stringify({ ok: false, status: resp.status }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    const data = await resp.json().catch(() => ({}));
    return new Response(JSON.stringify({ ok: true, event_id: eventId, meta: data }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[/api/meta-capi] fetch_error:", err);
    return new Response(JSON.stringify({ ok: false, reason: "fetch_error" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
}
