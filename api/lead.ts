/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * POST /api/lead
 *
 * Server-side proxy for lead capture. Receives quiz form submissions from the
 * main-site QuizFunnel and forwards them to GoHighLevel CRM.
 *
 * Why a server-side proxy:
 *   - Keeps the GHL webhook URL out of the browser bundle (no VITE_ prefix)
 *   - Lets us validate and sanitize before forwarding
 *   - Single place to add future CRM integrations (HubSpot, Klaviyo, etc.)
 *
 * Required env var (server-side only):
 *   GHL_WEBHOOK_URL — the GoHighLevel inbound webhook URL
 */

export const config = { runtime: "edge" };

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

interface LeadPayload {
  fullName?: string;
  email?: string;
  phone?: string;
  creditScore?: string;
  income?: string;
  idealScore?: string;
  timeline?: string;
  goal?: string;
  obstacle?: string;
  consent?: boolean;
  source?: string;
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let payload: LeadPayload;
  try {
    payload = (await req.json()) as LeadPayload;
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  // Basic validation — must have email and explicit consent
  if (!payload.email || typeof payload.email !== "string") {
    return json({ error: "email is required" }, 400);
  }
  if (!payload.consent) {
    return json({ error: "consent is required" }, 400);
  }

  const ghlUrl = process.env.GHL_WEBHOOK_URL;
  if (!ghlUrl) {
    console.error("[/api/lead] GHL_WEBHOOK_URL env var not set");
    // Don't block the user — log and continue. Lead data is not lost if we add
    // a fallback storage mechanism later.
    return json({ ok: true });
  }

  // Split full name into first/last for GHL field mapping
  const nameParts = (payload.fullName ?? "").trim().split(/\s+/);
  const firstName = nameParts[0] ?? "";
  const lastName  = nameParts.slice(1).join(" ") || "";

  const ghlPayload = {
    firstName,
    lastName,
    email:       payload.email.trim().toLowerCase(),
    phone:       payload.phone ?? "",
    // Custom fields — adjust field keys to match your GHL pipeline setup
    credit_score:  payload.creditScore  ?? "",
    income:        payload.income       ?? "",
    ideal_score:   payload.idealScore   ?? "",
    timeline:      payload.timeline     ?? "",
    goal:          payload.goal         ?? "",
    obstacle:      payload.obstacle     ?? "",
    source:        payload.source       ?? "cleanpathcredit.com/quiz",
    consent:       "true",
  };

  try {
    const res = await fetch(ghlUrl, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(ghlPayload),
    });

    if (!res.ok) {
      console.error(`[/api/lead] GHL responded ${res.status}`);
      // Still return 200 to the client — CRM errors shouldn't block the funnel
    }
  } catch (err) {
    console.error("[/api/lead] GHL fetch failed:", err);
    // Non-fatal — same reasoning as above
  }

  return json({ ok: true });
}
