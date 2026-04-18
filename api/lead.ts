/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * POST /api/lead
 *
 * Proxies QuizFunnel (and any other lead-capture) submissions from
 * cleanpathcredit.com to the GoHighLevel inbound webhook.
 *
 * Previously QuizFunnel posted directly to an env-configured URL, but the
 * env var was unset in production, so every quiz completion was silently
 * dropped. Adding this proxy gives us the same security posture the
 * form.cleanpathcredit.com `/api/submit` endpoint has (audit finding C-4).
 *
 * Hardening:
 *   1. Strict origin check. The Origin header is parsed as a URL and the
 *      hostname is compared against an exact-match allowlist. No substring
 *      tricks like https://evil.com/cleanpathcredit.com/ sneaking through.
 *   2. Localhost is ONLY accepted when CORS_ALLOWED_DEV_ORIGIN is set.
 *   3. Server-side honeypot. Hidden fields (website/company_website/fax)
 *      that real users never fill. If any arrive populated we silently 200
 *      so bots can't tell they were detected.
 *   4. Cloudflare Turnstile. When TURNSTILE_SECRET_KEY is set the POST
 *      MUST carry cf_turnstile_token which we verify server-side before
 *      forwarding anything to the CRM. Leave the env unset to deploy the
 *      backend ahead of the frontend widget (backwards-compatible).
 *   5. Origin-aware CORS. OPTIONS preflight echoes Allow-Origin only when
 *      the origin passes the same allowlist.
 *   6. Fail-closed on missing GHL_WEBHOOK_URL — returns 500 rather than
 *      200-ing a request we didn't actually deliver.
 *
 * Follow-up (tracked, not in this PR): IP-based rate limiting via
 * @upstash/ratelimit + Vercel KV. Requires a KV store to be provisioned.
 *
 * Required env:
 *   GHL_WEBHOOK_URL           GoHighLevel inbound webhook URL
 * Optional env:
 *   TURNSTILE_SECRET_KEY      Cloudflare Turnstile server secret. When set,
 *                             cf_turnstile_token is REQUIRED in the body.
 *   CORS_ALLOWED_ORIGINS      CSV of allowed hostnames (overrides defaults).
 *   CORS_ALLOWED_DEV_ORIGIN   Single dev hostname to allow (e.g. "localhost").
 */

import type { IncomingMessage, ServerResponse } from "http";

export const config = { runtime: "nodejs" };

const DEFAULT_ALLOWED_HOSTS = [
  "cleanpathcredit.com",
  "www.cleanpathcredit.com",
];

// Fields we will forward to GoHighLevel. Anything else is stripped.
const ALLOWED_FIELDS = new Set<string>([
  // QuizFunnel primary fields
  "fullName", "email", "phone", "consent",
  "creditScore", "income", "idealScore", "timeline",
  "goal", "obstacle",
  // Future-proof: match form.cleanpathcredit.com shape so a single GHL
  // workflow can accept leads from either origin.
  "first_name", "last_name", "full_name",
  "situation", "score", "blocker",
  "profile", "painLevel", "urgency",
  "leadScore", "leadTier", "recommendedOffer",
]);

// Hidden field names real users never fill. Any non-empty value = bot.
const HONEYPOT_FIELDS = ["website", "company_website", "fax"];

const MAX_BODY_SIZE = 4096; // bytes
const MAX_FIELD_LENGTH = 500; // chars per string field

const TURNSTILE_VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

function getAllowedHosts(): string[] {
  const raw = process.env.CORS_ALLOWED_ORIGINS;
  if (!raw) return DEFAULT_ALLOWED_HOSTS;
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

function isAllowedOrigin(originHeader: string | undefined): boolean {
  if (!originHeader) return false;
  let hostname: string;
  try {
    hostname = new URL(originHeader).hostname;
  } catch {
    return false;
  }
  if (getAllowedHosts().includes(hostname)) return true;

  const devOrigin = process.env.CORS_ALLOWED_DEV_ORIGIN;
  if (devOrigin) {
    const devHost = devOrigin.split(":")[0];
    if (hostname === devHost) return true;
  }
  return false;
}

function sanitizeBody(body: unknown): Record<string, unknown> | null {
  if (!body || typeof body !== "object") return null;
  const input = body as Record<string, unknown>;
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (!ALLOWED_FIELDS.has(key)) continue;
    if (typeof value === "string") {
      clean[key] = value.slice(0, MAX_FIELD_LENGTH);
    } else if (typeof value === "number" && Number.isFinite(value)) {
      clean[key] = value;
    } else if (typeof value === "boolean") {
      clean[key] = value;
    }
  }
  return Object.keys(clean).length > 0 ? clean : null;
}

function tripsHoneypot(body: unknown): boolean {
  if (!body || typeof body !== "object") return false;
  const input = body as Record<string, unknown>;
  return HONEYPOT_FIELDS.some((f) => {
    const v = input[f];
    return typeof v === "string" && v.trim().length > 0;
  });
}

function getClientIp(req: IncomingMessage): string {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.length > 0) {
    return fwd.split(",")[0].trim();
  }
  const real = req.headers["x-real-ip"];
  if (typeof real === "string") return real;
  return req.socket?.remoteAddress ?? "";
}

type TurnstileVerifyResult =
  | { ok: true; skipped?: boolean }
  | { ok: false; reason: string; codes?: string[] };

async function verifyTurnstile(
  token: unknown,
  remoteIp: string,
): Promise<TurnstileVerifyResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return { ok: true, skipped: true };
  if (!token || typeof token !== "string") {
    return { ok: false, reason: "missing_token" };
  }

  const params = new URLSearchParams({ secret, response: token });
  if (remoteIp) params.append("remoteip", remoteIp);

  try {
    const r = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    const data = (await r.json()) as {
      success: boolean;
      "error-codes"?: string[];
    };
    if (!data.success) {
      return {
        ok: false,
        reason: "verify_failed",
        codes: data["error-codes"],
      };
    }
    return { ok: true };
  } catch (err) {
    console.error("[/api/lead] Turnstile verify threw:", err);
    return { ok: false, reason: "verify_error" };
  }
}

function applyCorsHeaders(res: ServerResponse, origin: string): void {
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Vary", "Origin");
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of req as unknown as AsyncIterable<Buffer | string>) {
    const buf = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
    total += buf.length;
    if (total > MAX_BODY_SIZE) {
      throw new Error("payload_too_large");
    }
    chunks.push(buf);
  }
  const raw = Buffer.concat(chunks).toString("utf-8");
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("invalid_json");
  }
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const origin = (req.headers.origin as string | undefined) ?? "";

  // CORS preflight
  if (req.method === "OPTIONS") {
    if (isAllowedOrigin(origin)) {
      applyCorsHeaders(res, origin);
      res.setHeader("Access-Control-Max-Age", "86400");
    }
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  if (!isAllowedOrigin(origin)) {
    return sendJson(res, 403, { error: "Forbidden" });
  }
  applyCorsHeaders(res, origin);

  // Body parse + size guard
  let body: unknown;
  try {
    body = await readJsonBody(req);
  } catch (err) {
    const reason = (err as Error).message;
    if (reason === "payload_too_large") {
      return sendJson(res, 413, { error: "Payload too large" });
    }
    return sendJson(res, 400, { error: "Invalid JSON" });
  }

  // Honeypot — silently 200 so bots don't learn they were caught
  if (tripsHoneypot(body)) {
    console.log("[/api/lead] honeypot tripped from", getClientIp(req));
    return sendJson(res, 200, { success: true });
  }

  // Turnstile verification (before sanitize so the token field isn't stripped)
  const token = (body as Record<string, unknown> | null)?.cf_turnstile_token;
  const turnstile = await verifyTurnstile(token, getClientIp(req));
  if (!turnstile.ok) {
    console.error(
      "[/api/lead] Turnstile rejected:",
      turnstile.reason,
      turnstile.codes,
    );
    return sendJson(res, 400, { error: "Verification required" });
  }

  // Sanitize + minimal validation
  const clean = sanitizeBody(body);
  if (!clean) {
    return sendJson(res, 400, { error: "Invalid request body" });
  }
  const email = typeof clean.email === "string" ? clean.email : "";
  if (!email || !email.includes("@")) {
    return sendJson(res, 400, { error: "Valid email required" });
  }

  // Fail closed on missing CRM webhook URL
  const webhookUrl = process.env.GHL_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error("[/api/lead] GHL_WEBHOOK_URL not configured");
    return sendJson(res, 500, { error: "server_misconfigured" });
  }

  // Forward to GHL
  try {
    const upstream = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "lead", source: "quiz_funnel", ...clean }),
    });
    return sendJson(res, upstream.ok ? 200 : 502, { success: upstream.ok });
  } catch (err) {
    console.error("[/api/lead] proxy error:", err);
    return sendJson(res, 502, { error: "Failed to reach CRM" });
  }
}
