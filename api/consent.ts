/**
 * POST /api/consent
 *
 * Logs user consent (Terms + Dispute checkboxes) server-side for Stripe defense.
 * Called from the /welcome page after a paid purchase.
 *
 * Body: { email, plan, sessionId, consentTerms, consentDispute, userAgent, pageUrl }
 *
 * Stores IP address from request headers (Vercel forwards X-Forwarded-For).
 * Uses Supabase service role to bypass RLS — clients cannot read this table.
 */

import { createClient } from "@supabase/supabase-js";

export const config = { runtime: "edge" };

interface ConsentPayload {
  email: string;
  plan: string;
  sessionId: string;
  consentTerms: boolean;
  consentDispute: boolean;
  userAgent: string;
  pageUrl: string;
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let payload: ConsentPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const { email, plan, sessionId, consentTerms, consentDispute, userAgent, pageUrl } = payload;

  if (!email || !consentTerms || !consentDispute) {
    return new Response("Missing required fields", { status: 400 });
  }

  // Extract IP from Vercel headers
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? req.headers.get("x-real-ip")
    ?? "unknown";

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const { error } = await supabase.from("consent_logs").insert({
    email,
    plan,
    stripe_session_id: sessionId || null,
    consent_terms: consentTerms,
    consent_dispute: consentDispute,
    ip_address: ip,
    user_agent: userAgent || null,
    page_url: pageUrl || null,
  });

  if (error) {
    console.error("Failed to log consent:", error);
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
