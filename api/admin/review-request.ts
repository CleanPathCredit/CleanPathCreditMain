/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * POST /api/admin/review-request
 *
 * Sends a bilingual, FTC-safe Google review request to a client. Reviews
 * are the single biggest local-SEO lever (review count × rating × velocity
 * gate the Google local pack), so this gives the admin a one-call way to ask
 * a client right after a visible win.
 *
 * Auth model (same as invite-client):
 *   - Clerk session JWT verified via @clerk/backend
 *   - Caller must be a profile with role='admin'
 *
 * Body: { email: string, firstName?: string, lang?: "en" | "es" }
 * Response: { ok: true, sent: boolean, email: string }
 *
 * FTC note (16 CFR Part 255): send to ALL clients, not just happy ones, and
 * never offer an incentive. The email copy asks for an honest review either
 * way — keep it that way.
 *
 * Required env:
 *   CLERK_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY
 * Optional env:
 *   GBP_REVIEW_URL  (the Google "write a review" link; falls back to the
 *                    public profile search if unset)
 */

import type { IncomingMessage, ServerResponse } from "http";
import { createClient } from "@supabase/supabase-js";
import { verifyToken } from "@clerk/backend";
import type { Database } from "../../src/types/database";
import { sendReviewRequestEmail } from "../lib/email";

export const config = { runtime: "nodejs" };

const DEFAULT_AUTHORIZED_PARTIES = [
  "https://cleanpathcredit.com",
  "https://www.cleanpathcredit.com",
];
function getAuthorizedParties(): string[] {
  const raw = process.env.CLERK_AUTHORIZED_PARTIES;
  if (!raw) return DEFAULT_AUTHORIZED_PARTIES;
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

async function readJsonBody<T>(req: IncomingMessage): Promise<T | null> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  if (chunks.length === 0) return null;
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as T;
  } catch {
    return null;
  }
}

interface ReviewReq {
  email: string;
  firstName?: string;
  lang?: "en" | "es";
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  // 1. Bearer extraction
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return sendJson(res, 401, null);
  }
  const token = authHeader.slice(7).trim();
  if (!token) return sendJson(res, 401, null);

  // 2. Env validation
  const clerkSecretKey     = process.env.CLERK_SECRET_KEY;
  const supabaseUrl        = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!clerkSecretKey || !supabaseUrl || !supabaseServiceKey) {
    console.error("[/api/admin/review-request] server_misconfigured");
    return sendJson(res, 500, { error: "server_misconfigured" });
  }

  // 3. Verify Clerk JWT
  let callerId: string;
  try {
    const payload = await verifyToken(token, {
      secretKey:         clerkSecretKey,
      authorizedParties: getAuthorizedParties(),
    });
    if (typeof payload.sub !== "string" || !payload.sub) {
      return sendJson(res, 401, null);
    }
    callerId = payload.sub;
  } catch {
    return sendJson(res, 401, null);
  }

  // 4. Parse + validate body
  const body = await readJsonBody<ReviewReq>(req);
  if (!body || typeof body.email !== "string" || !body.email.includes("@")) {
    return sendJson(res, 400, { error: "valid_email_required" });
  }
  const email     = body.email.trim().toLowerCase();
  const firstName = typeof body.firstName === "string" ? body.firstName.trim() : "";
  const lang      = body.lang === "es" ? "es" : "en";

  // 5. Admin gate (service-role lookup)
  const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: caller } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", callerId)
    .single();
  if (caller?.role !== "admin") {
    return sendJson(res, 403, { error: "forbidden" });
  }

  // 6. Send the review request (no-ops to sent:false if RESEND_API_KEY unset)
  const sent = await sendReviewRequestEmail({
    to:        email,
    firstName: firstName || undefined,
    lang,
  });

  return sendJson(res, 200, { ok: true, sent, email });
}
