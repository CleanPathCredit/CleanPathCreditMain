/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * POST /api/meta-capi
 *
 * Meta Conversions API endpoint — forwards events to Meta server-side
 * to recover ~25-40% of conversions blocked by iOS 14+ browser-side
 * Pixel restrictions and ad-blockers.
 *
 * SERVER-TO-SERVER ONLY. Internet-facing but not browser-callable.
 * Codex review on PR #20 (P1) flagged the unauthenticated original —
 * any internet caller could inject arbitrary Lead/Purchase events using
 * our Pixel credentials and poison attribution/optimization data. The
 * fix: require X-Internal-Secret header that matches
 * META_CAPI_INTERNAL_SECRET env var. The known callers
 * (api/webhooks/stripe.ts, api/lead.ts, etc.) include the header;
 * anyone hitting the endpoint from a browser or third-party gets 403.
 *
 * Why server-side:
 *   - iOS 14+ Mail Privacy Protection + ITP block the Pixel cookie
 *   - Browser ad-blockers strip the Pixel script entirely
 *   - CAPI uses email/phone/external_id (SHA-256 hashed) for deterministic match
 *   - Meta deduplicates by event_id when the same event fires both
 *     Pixel + CAPI, so no double-counting
 *
 * Callers (current + planned) — each must include the X-Internal-Secret
 * header on their fetch:
 *   - api/webhooks/stripe.ts  → Purchase event after checkout completes
 *   - api/lead.ts              → Lead event after form submit
 *   - Composio runbook         → backfill batches (server-side cron)
 *   NOTE: src/pages/EsComprador.tsx and other browser pages MUST NOT
 *   call this endpoint directly — the secret would be exposed in the
 *   client bundle. Browser-side events go through the Pixel only.
 *
 * Required env (set in Vercel):
 *   META_CAPI_ACCESS_TOKEN     System User access token from Meta Business
 *                              Manager → Settings → Users → System Users
 *                              → generate token with `ads_management` and
 *                              `business_management` scopes.
 *   META_PIXEL_ID              Numeric Pixel ID (same as VITE_META_PIXEL_ID).
 *   META_CAPI_INTERNAL_SECRET  Random high-entropy string. Required to
 *                              authenticate calls from our own server
 *                              functions; without it, the endpoint
 *                              returns 500 server_misconfigured even if
 *                              ACCESS_TOKEN + PIXEL_ID are set.
 *                              Generate with: `openssl rand -hex 32`
 *
 * Optional env:
 *   META_CAPI_TEST_EVENT_CODE  Pass-through to Meta's Test Events tab so
 *                              you can verify deliveries without
 *                              polluting prod attribution. Format: TEST12345
 *
 * Compliance posture:
 *   - All PII (email, phone) is SHA-256 hashed BEFORE leaving this
 *     function. Meta requires hashed user_data and rejects raw PII.
 *   - external_id is treated as opaque (not re-hashed if it already
 *     looks like a SHA-256 hex string — case-insensitive). Pre-hashed
 *     values are normalized to lowercase before send because Meta
 *     requires lowercase hex on the wire.
 *   - No raw PII is logged. On failure, only HTTP status + truncated
 *     response body are logged.
 *   - Access token is sent via Authorization: Bearer header, NOT as a
 *     query string param — prevents the secret from leaking into URL
 *     logs, error telemetry, and intermediary traces (Codex P2).
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
 *                                          // (case-insensitive); else hashed
 *       fbp?:               string,        // _fbp cookie value (raw, not hashed)
 *       fbc?:               string,        // _fbc cookie value (raw, not hashed)
 *       client_user_agent?: string,
 *       client_ip_address?: string,
 *     },
 *     custom_data?: { ... }                // pass-through to Meta (currency,
 *                                          // value, content_ids, etc.)
 *   }
 *
 * Required header:
 *   X-Internal-Secret: <META_CAPI_INTERNAL_SECRET value>
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

/**
 * If `value` already looks like a SHA-256 hex string, pass through
 * (normalized to lowercase since Meta requires lowercase hex on the wire
 * and is case-sensitive on hash matching). Otherwise, hash it.
 *
 * The regex is case-insensitive so uppercase SHA-256 values from upstream
 * systems (e.g. SQL Server's UPPER(HASHBYTES('SHA2_256',...)) are not
 * re-hashed — re-hashing an already-hashed value would produce a
 * different identifier and break Meta's deterministic match / dedup.
 */
async function hashIfPresent(value: string | undefined): Promise<string | undefined> {
  if (!value) return undefined;
  if (/^[a-f0-9]{64}$/i.test(value)) return value.toLowerCase();
  return await sha256(value);
}

function normalizePhone(phone: string): string {
  // Meta expects E.164 without leading + or any non-digit chars
  return phone.replace(/[^\d]/g, "");
}

/**
 * Constant-time-ish string comparison. Falls back to length check + char-
 * by-char xor accumulation so a timing attack can't determine the secret
 * one character at a time. We're on edge runtime without
 * crypto.timingSafeEqual; this is the standard JS approximation.
 */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const accessToken    = process.env.META_CAPI_ACCESS_TOKEN;
  const pixelId        = process.env.META_PIXEL_ID;
  const internalSecret = process.env.META_CAPI_INTERNAL_SECRET;
  const testCode       = process.env.META_CAPI_TEST_EVENT_CODE;

  if (!accessToken || !pixelId) {
    // Fail-open for partial config — log and ack 200 so callers don't
    // retry. Meta CAPI is supplemental; the Pixel is the primary signal.
    // This branch is reached when the env was never set up (e.g., a
    // staging deploy without Meta), not when the secret is misconfigured.
    console.warn("[/api/meta-capi] disabled — missing META_CAPI_ACCESS_TOKEN or META_PIXEL_ID");
    return new Response(JSON.stringify({ ok: false, reason: "not_configured" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!internalSecret) {
    // META is configured BUT the internal-secret gate isn't — fail closed.
    // Without the secret, anyone on the internet could POST and forward
    // events to Meta using our credentials. The endpoint stays unusable
    // until the operator sets META_CAPI_INTERNAL_SECRET in Vercel env.
    console.error("[/api/meta-capi] server_misconfigured — missing META_CAPI_INTERNAL_SECRET");
    return new Response(JSON.stringify({ ok: false, reason: "server_misconfigured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Authentication: require the X-Internal-Secret header. Server-to-server
  // callers (api/webhooks/stripe.ts, api/lead.ts) include this. Without
  // a valid header the request is rejected as forbidden.
  const providedSecret = req.headers.get("x-internal-secret");
  if (!providedSecret || !safeEqual(providedSecret, internalSecret)) {
    return new Response(JSON.stringify({ ok: false, reason: "forbidden" }), {
      status: 403,
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
    // Access token is sent in the Authorization header (Bearer scheme),
    // NOT as a ?access_token=... query param — prevents URL logging
    // (Vercel logs, Sentry breadcrumbs, ingress traces) from capturing
    // the secret. Codex P2 fix.
    const url = `https://graph.facebook.com/${META_API_VERSION}/${pixelId}/events`;
    const resp = await fetch(url, {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
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
