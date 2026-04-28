/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * POST /api/admin/lead
 *
 * Admin-authenticated lead entry — lets a signed-in admin manually create
 * a lead from the admin dashboard (e.g. after a cold phone call) without
 * going through the public quiz funnel. Skips Turnstile + honeypot because
 * the caller is a verified admin session, not untrusted public traffic.
 *
 * Delivery matches /api/lead:
 *   - Upserts into GoHighLevel via the Contacts API (same standard fields,
 *     same tag scheme — minus the urgency-tier tag since manual leads
 *     typically won't have quiz answers)
 *   - Writes a row to public.lead_submissions so the lead surfaces on the
 *     admin dashboard's Leads tab alongside quiz-funnel leads
 *
 * Auth — Clerk session token in the Authorization header, same pattern as
 * /api/me. After verifying the JWT we cross-check role='admin' in the
 * Supabase profiles table (service-role lookup, bypasses RLS). Non-admin
 * tokens get 403.
 *
 * Required env:
 *   CLERK_SECRET_KEY              (JWT verification)
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   GHL_PRIVATE_INTEGRATION_TOKEN, GHL_LOCATION_ID
 */

import type { IncomingMessage, ServerResponse } from "http";
import { createClient } from "@supabase/supabase-js";
import { verifyToken } from "@clerk/backend";
import type { Database, UrgencyTier, RecommendedOffer, GHLDelivery } from "../../src/types/database";

export const config = { runtime: "nodejs" };

const MAX_BODY_BYTES = 16 * 1024;

const GHL_API_BASE    = "https://services.leadconnectorhq.com";
const GHL_API_VERSION = "2021-07-28";

const DEFAULT_AUTHORIZED_PARTIES = [
  "https://cleanpathcredit.com",
  "https://www.cleanpathcredit.com",
];
function getAuthorizedParties(): string[] {
  const raw = process.env.CLERK_AUTHORIZED_PARTIES;
  if (!raw) return DEFAULT_AUTHORIZED_PARTIES;
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

interface ManualLeadPayload {
  fullName?:  unknown;
  email?:     unknown;
  phone?:     unknown;
  goal?:      unknown;
  obstacles?: unknown;
  creditScore?: unknown;
  income?:      unknown;
  idealScore?:  unknown;
  timeline?:    unknown;
  urgencyScore?: unknown;
  notes?:        unknown;  // free-text context from the admin (e.g. call notes)
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

async function readJsonBody(req: IncomingMessage): Promise<ManualLeadPayload | null> {
  return new Promise((resolve) => {
    let received = 0;
    const chunks: Buffer[] = [];
    let aborted = false;
    req.on("data", (chunk: Buffer) => {
      if (aborted) return;
      received += chunk.length;
      if (received > MAX_BODY_BYTES) { aborted = true; resolve(null); return; }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (aborted) return;
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve(raw ? (JSON.parse(raw) as ManualLeadPayload) : {});
      } catch { resolve(null); }
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
function splitName(full: string): { firstName?: string; lastName?: string } {
  const parts = full.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return {};
  if (parts.length === 1) return { firstName: parts[0] };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

// Mirrors /api/lead tier + recommendation derivation so manual leads show
// the same UI state as quiz-funnel leads when urgency is provided.
function tierFromScore(score: number | null): UrgencyTier | null {
  if (score === null) return null;
  if (score >= 70) return "urgent";
  if (score >= 50) return "elevated";
  if (score >= 30) return "moderate";
  return "low";
}
function recommendedOfferFrom(urgency: number | null, obstacles: string[]): RecommendedOffer {
  const hasHeavy = obstacles.some((o) => o === "bankruptcies" || o === "late");
  if ((urgency !== null && urgency >= 70) && obstacles.length >= 2) return "executive";
  if (obstacles.length >= 3 && hasHeavy)                            return "executive";
  if (urgency !== null && urgency >= 80)                            return "executive";
  return "accelerated";
}

/**
 * Upsert a manual admin-entered contact into GHL. Duplicates the shape
 * used by /api/lead#upsertGHLContact — a single shared helper would be
 * cleaner, but the two endpoints live in different folders and Vercel's
 * function bundler won't dedupe across them anyway. Kept in sync by
 * code review rather than import.
 */
async function upsertGHLContact(
  token: string,
  locationId: string,
  lead: {
    fullName:  string;
    email:     string;
    phone:     string;
    goal:      string;
    obstacles: string[];
    timeline:  string;
    urgencyScore: number | null;
  },
): Promise<{ ok: boolean; contactId?: string; status?: number }> {
  const { firstName, lastName } = splitName(lead.fullName);

  const tags: string[] = ["cpc_manual_lead"];
  if (lead.goal)     tags.push(`goal:${lead.goal}`);
  for (const o of lead.obstacles) tags.push(`obstacle:${o}`);
  if (lead.timeline) tags.push(`timeline:${lead.timeline}`);
  const urgencyBucket = tierFromScore(lead.urgencyScore);
  if (urgencyBucket) tags.push(`urgency:${urgencyBucket}`);

  const payload: Record<string, unknown> = {
    locationId,
    email:  lead.email,
    source: "Clean Path Manual (Admin)",
    tags,
  };
  if (firstName)  payload.firstName = firstName;
  if (lastName)   payload.lastName  = lastName;
  if (lead.phone) payload.phone     = lead.phone;

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
      console.error("[/api/admin/lead] ghl_upsert_failed status=%d body=%s",
        resp.status, text.slice(0, 300));
      return { ok: false, status: resp.status };
    }
    const data = (await resp.json().catch(() => ({}))) as {
      contact?: { id?: string };
      id?: string;
    };
    return { ok: true, contactId: data.contact?.id ?? data.id };
  } catch (err) {
    console.error("[/api/admin/lead] ghl_upsert_error:", err);
    return { ok: false };
  }
}

async function postGHLNote(token: string, contactId: string, body: string): Promise<void> {
  try {
    const resp = await fetch(`${GHL_API_BASE}/contacts/${contactId}/notes`, {
      method: "POST",
      headers: {
        Authorization:  `Bearer ${token}`,
        Version:        GHL_API_VERSION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ body }),
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      console.error("[/api/admin/lead] ghl_note_failed status=%d body=%s",
        resp.status, text.slice(0, 300));
    }
  } catch (err) {
    console.error("[/api/admin/lead] ghl_note_error:", err);
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

  // 1. Clerk session token — same verify path /api/me uses.
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return sendJson(res, 401, { error: "unauthorized" });
  }
  const token = authHeader.slice(7).trim();
  if (!token) return sendJson(res, 401, { error: "unauthorized" });

  const clerkSecretKey     = process.env.CLERK_SECRET_KEY;
  const supabaseUrl        = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!clerkSecretKey || !supabaseUrl || !supabaseServiceKey) {
    console.error("[/api/admin/lead] server_misconfigured — missing core env");
    return sendJson(res, 500, { error: "server_misconfigured" });
  }

  let userId: string;
  try {
    const payload = await verifyToken(token, {
      secretKey:         clerkSecretKey,
      authorizedParties: getAuthorizedParties(),
    });
    if (typeof payload.sub !== "string" || !payload.sub) {
      return sendJson(res, 401, { error: "unauthorized" });
    }
    userId = payload.sub;
  } catch {
    return sendJson(res, 401, { error: "unauthorized" });
  }

  // 2. Role check — must be admin per Supabase profiles.
  const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
  if (me?.role !== "admin") {
    return sendJson(res, 403, { error: "forbidden" });
  }

  // 3. Parse + validate body
  const body = await readJsonBody(req);
  if (!body) return sendJson(res, 400, { error: "invalid_body" });

  const email = str(body.email);
  if (!email || !isEmail(email)) {
    return sendJson(res, 400, { error: "invalid_email" });
  }
  const fullName = str(body.fullName);
  const phone    = str(body.phone);
  const goal     = str(body.goal);
  const timeline = str(body.timeline);

  const obstaclesArr: string[] = Array.isArray(body.obstacles)
    ? body.obstacles
        .filter((x): x is string => typeof x === "string")
        .map((x) => x.trim())
        .filter((x) => x.length > 0 && x.length <= 64)
        .slice(0, 10)
    : [];

  const urgencyRaw =
    typeof body.urgencyScore === "number" ? body.urgencyScore : null;
  const urgencyScore =
    urgencyRaw !== null && Number.isFinite(urgencyRaw)
      ? Math.max(0, Math.min(100, Math.round(urgencyRaw)))
      : null;

  const notes = str(body.notes);

  // 4. GHL upsert (primary). Non-fatal on failure — still persist locally.
  const ghlToken    = process.env.GHL_PRIVATE_INTEGRATION_TOKEN;
  const ghlLocation = process.env.GHL_LOCATION_ID;
  let   ghlContactId: string | undefined;
  let   ghlDelivery: GHLDelivery = "failed";

  if (ghlToken && ghlLocation) {
    const result = await upsertGHLContact(ghlToken, ghlLocation, {
      fullName, email, phone, goal, obstacles: obstaclesArr, timeline, urgencyScore,
    });
    if (result.ok) {
      ghlContactId = result.contactId;
      ghlDelivery  = "api";
      if (ghlContactId) {
        const noteBody = [
          `Manual admin entry (${new Date().toISOString()} UTC)`,
          `• Name: ${fullName || "—"}`,
          `• Phone: ${phone || "—"}`,
          `• Goal: ${goal || "—"}`,
          `• Obstacles: ${obstaclesArr.length ? obstaclesArr.join(", ") : "—"}`,
          `• Credit score range: ${str(body.creditScore) || "—"}`,
          `• Annual income range: ${str(body.income) || "—"}`,
          `• Ideal credit score: ${str(body.idealScore) || "—"}`,
          `• Timeline: ${timeline || "—"}`,
          `• Urgency score: ${urgencyScore !== null ? `${urgencyScore}/100 (higher = hotter)` : "—"}`,
          notes ? `• Admin notes:\n${notes}` : undefined,
        ].filter(Boolean).join("\n");
        postGHLNote(ghlToken, ghlContactId, noteBody).catch(() => { /* already logged */ });
      }
    }
  }

  // 5. Persist to Supabase lead_submissions so it shows on the admin's
  // Leads tab immediately via the realtime INSERT subscription.
  const { error: insertErr } = await supabase.from("lead_submissions").insert({
    email,
    full_name:          fullName || null,
    phone:              phone    || null,
    goal:               goal     || null,
    obstacles:          obstaclesArr,
    credit_score_range: str(body.creditScore) || null,
    income_range:       str(body.income)      || null,
    ideal_score:        str(body.idealScore)  || null,
    timeline:           timeline || null,
    urgency_score:      urgencyScore,
    urgency_tier:       tierFromScore(urgencyScore),
    recommended_offer:  recommendedOfferFrom(urgencyScore, obstaclesArr),
    source:             "admin_manual",
    ghl_contact_id:     ghlContactId ?? null,
    ghl_delivery:       ghlDelivery,
    consent:            true,  // admin entered this on behalf of lead — assume consent captured offline
  });
  if (insertErr) {
    console.error("[/api/admin/lead] persist_failed:", insertErr.message);
    return sendJson(res, 500, { error: "persist_failed" });
  }

  return sendJson(res, 200, { ok: true, contactId: ghlContactId ?? null });
}
