/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * GET /r/[code]
 *
 * Entry point for every shared referral link ("cleanpathcredit.com/r/CPC-ABC123").
 * Three responsibilities:
 *
 *   1. Look up the referral_code in profiles → find the referrer
 *   2. Insert a `referrals` row (status='pending') capturing the click
 *   3. Set a 90-day cookie (`cpc_ref`) carrying the code so downstream
 *      signup / checkout webhooks can attribute the conversion
 *   4. 302 the visitor onwards — to `?to=<path>` if specified and safe,
 *      else to `/` so cold traffic hits the landing page
 *
 * Deliberately public — no auth required. Anyone with the link can visit
 * it. Rate-limiting is a future concern (~hundreds of clicks per day is
 * not a problem; millions would be).
 *
 * Cookie choices:
 *   - Name: cpc_ref
 *   - Value: the referral code (not the referrer's user_id — codes are
 *     stable, user_ids are Clerk-managed)
 *   - Max-Age: 7776000 (90 days) — longer than typical 30d affiliate
 *     windows because credit repair sales cycles run weeks
 *   - SameSite=Lax so it survives cross-site navigations to the signup
 *     flow (which redirects through Clerk's auth domain)
 *   - HttpOnly so JavaScript can't read it — this cookie is server-only
 *     (Clerk/Stripe webhooks read it server-side)
 *   - Secure in production; omit in dev so localhost testing works
 *
 * Anti-self-referral is NOT enforced at this endpoint — it's enforced
 * when we credit the referral at purchase time (checking referrer ≠
 * referred). Letting clicks through keeps this endpoint simple.
 */

import type { IncomingMessage, ServerResponse } from "http";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../src/types/database";

export const config = { runtime: "nodejs" };

const COOKIE_NAME       = "cpc_ref";
const COOKIE_MAX_AGE    = 90 * 24 * 60 * 60;  // 90 days in seconds

function getClientIp(req: IncomingMessage): string | undefined {
  const xff = req.headers["x-forwarded-for"];
  const header = Array.isArray(xff) ? xff[0] : xff;
  if (!header) return undefined;
  return header.split(",")[0]?.trim() || undefined;
}

/** Validate a redirect target to stop open-redirect attacks. Accept only
 *  same-origin paths that start with a single "/" and don't begin with
 *  "//" (protocol-relative URL) or "/\\" (Windows-style trick). */
function safeRedirectTarget(raw: string | null): string {
  const DEFAULT = "/";
  if (!raw) return DEFAULT;
  if (!raw.startsWith("/")) return DEFAULT;
  if (raw.startsWith("//") || raw.startsWith("/\\")) return DEFAULT;
  return raw;
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.statusCode = 405;
    res.end("Method not allowed");
    return;
  }

  const url = new URL(req.url ?? "/", "http://internal");
  // Vercel populates dynamic path segments into searchParams when using
  // [code].ts filenames; fall back to the last path segment if that's
  // ever not the case.
  const code = (url.searchParams.get("code") ?? url.pathname.split("/").pop() ?? "")
    .trim()
    .toUpperCase();

  // Short-circuit on obviously invalid codes — redirect to home rather
  // than returning 400, so broken links don't feel broken to users.
  if (!/^CPC-[A-Z0-9]{4,}$/i.test(code)) {
    res.statusCode = 302;
    res.setHeader("Location", "/");
    res.end();
    return;
  }

  const target = safeRedirectTarget(url.searchParams.get("to"));

  const supabaseUrl        = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Best-effort click attribution. If Supabase is unreachable we still
  // set the cookie + redirect — losing a row is cheaper than losing
  // the visitor.
  if (supabaseUrl && supabaseServiceKey) {
    try {
      const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data: referrer } = await supabase
        .from("profiles")
        .select("id")
        .eq("referral_code", code)
        .maybeSingle();

      if (referrer) {
        await supabase.from("referrals").insert({
          referrer_profile_id: referrer.id,
          referral_code_used:  code,
          status:              "pending",
          client_ip:           getClientIp(req) ?? null,
          user_agent:          (req.headers["user-agent"] ?? "").slice(0, 500) || null,
        });
      }
      // If referrer is null the code doesn't match anyone. We still set
      // the cookie + redirect — a later signup might be valuable data
      // ("someone visited /r/CPC-FAKE then signed up" is worth logging).
    } catch (err) {
      // Logged, not fatal
      console.error("[/r/:code] click_insert_failed:", err);
    }
  }

  // Set the attribution cookie. Use Secure when the request came in over
  // HTTPS (Vercel always does in production); skip Secure in dev so the
  // cookie works over http://localhost.
  const isHttps = (req.headers["x-forwarded-proto"] ?? "").toString().includes("https");
  const cookieParts = [
    `${COOKIE_NAME}=${encodeURIComponent(code)}`,
    `Max-Age=${COOKIE_MAX_AGE}`,
    "Path=/",
    "SameSite=Lax",
    "HttpOnly",
    isHttps ? "Secure" : "",
  ].filter(Boolean);
  res.setHeader("Set-Cookie", cookieParts.join("; "));

  res.statusCode = 302;
  res.setHeader("Location", target);
  res.end();
}
