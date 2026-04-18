/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * POST /api/lead
 *
 * Same-origin proxy that accepts quiz submissions from the marketing site,
 * verifies bot-protection signals server-side, then forwards the sanitized
 * payload to the GoHighLevel inbound webhook (GHL_WEBHOOK_URL). Exists so the
 * real GHL URL is never embedded in the client bundle — anyone with DevTools
 * could otherwise spam it directly.
 *
 * Bot protection (audit finding C-4):
 *   - Honeypot field `website` — if non-empty we silently 200 so bots think
 *     the submission succeeded and don't adapt. Nothing is forwarded to GHL.
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
 * Required env:
 *   GHL_WEBHOOK_URL               GoHighLevel inbound webhook URL
 * Optional env:
 *   TURNSTILE_SECRET_KEY          Cloudflare Turnstile secret (enables verify)
 */

import type { IncomingMessage, ServerResponse } from "http";

export const config = { runtime: "nodejs" };

// Cap body size to prevent a single misbehaving client from pinning the
// function with a multi-MB upload — quiz payloads are well under 4 KB.
const MAX_BODY_BYTES = 16 * 1024;

const TURNSTILE_VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

interface LeadPayload {
  fullName?: unknown;
  email?: unknown;
  phone?: unknown;
  consent?: unknown;
  creditScore?: unknown;
  income?: unknown;
  idealScore?: unknown;
  timeline?: unknown;
  goal?: unknown;
  obstacle?: unknown;
  website?: unknown;
  cf_turnstile_token?: unknown;
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

  // 4. Forward sanitized payload to GHL. We deliberately re-build the object
  // from known keys so we never forward the honeypot, the Turnstile token,
  // or anything else the caller tried to smuggle through.
  const ghlUrl = process.env.GHL_WEBHOOK_URL;
  if (!ghlUrl) {
    console.error("[/api/lead] server_misconfigured — GHL_WEBHOOK_URL unset");
    return sendJson(res, 500, { error: "server_misconfigured" });
  }

  const sanitized = {
    fullName:    str(body.fullName),
    email,
    phone,
    consent,
    creditScore: str(body.creditScore),
    income:      str(body.income),
    idealScore:  str(body.idealScore),
    timeline:    str(body.timeline),
    goal:        str(body.goal),
    obstacle:    str(body.obstacle),
    source:      "quiz_funnel",
    submittedAt: new Date().toISOString(),
  };

  try {
    const forward = await fetch(ghlUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sanitized),
    });
    if (!forward.ok) {
      console.error("[/api/lead] ghl_forward_failed status=%d", forward.status);
      return sendJson(res, 502, { error: "upstream_failed" });
    }
  } catch (err) {
    console.error("[/api/lead] ghl_forward_error:", err);
    return sendJson(res, 502, { error: "upstream_unreachable" });
  }

  return sendJson(res, 200, { ok: true });
}
