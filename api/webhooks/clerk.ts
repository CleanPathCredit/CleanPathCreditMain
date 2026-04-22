/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * Vercel Edge Function: POST /api/webhooks/clerk
 *
 * Handles Clerk's user.created webhook to auto-create a Supabase profile row.
 * Every new Clerk user — whether they sign up free on cleanpathcredit.com or
 * get created programmatically after a Stripe purchase — gets a profile row
 * with the correct plan tier.
 *
 * Also best-effort upserts the user into GoHighLevel (Contacts API) so
 * direct-signup leads populate with name + phone, not just email. Runs
 * alongside /api/lead's upsert — GHL dedupes by email so the second call
 * merges into the existing contact record. Best-effort: if GHL is
 * misconfigured or unreachable, the Supabase write still succeeds (Clerk
 * webhook must return 2xx or Clerk will retry + eventually pause signups).
 *
 * Setup (one-time):
 *   1. Clerk Dashboard → Webhooks → Add endpoint
 *      URL: https://cleanpathcredit.com/api/webhooks/clerk
 *      Events: user.created, user.updated
 *   2. Copy the "Signing Secret" → add to Vercel env:
 *      CLERK_WEBHOOK_SECRET=whsec_xxx
 *   3. Add to Vercel env:
 *      SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *      GHL_PRIVATE_INTEGRATION_TOKEN, GHL_LOCATION_ID (for the GHL upsert)
 */

import { Webhook } from "svix";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../src/types/database";

// Service-role client bypasses RLS — only used server-side in webhooks.
function getServiceClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

const GHL_API_BASE    = "https://services.leadconnectorhq.com";
const GHL_API_VERSION = "2021-07-28";

/**
 * Best-effort upsert into GHL so direct-signup contacts (no prior quiz)
 * land with real name + phone, not just email. Matches the /api/lead
 * upsert shape so both paths merge into the same contact record per
 * account-level dedup.
 */
async function upsertGHLFromClerk(input: {
  email:     string;
  fullName:  string | null;
  phone:     string | null;
  plan:      string;
}): Promise<void> {
  const token      = process.env.GHL_PRIVATE_INTEGRATION_TOKEN;
  const locationId = process.env.GHL_LOCATION_ID;
  if (!token || !locationId || !input.email) return;

  const parts     = (input.fullName ?? "").split(/\s+/).filter(Boolean);
  const firstName = parts[0];
  const lastName  = parts.length > 1 ? parts.slice(1).join(" ") : undefined;

  const tags: string[] = ["cpc_registered_user", `plan:${input.plan}`];

  const payload: Record<string, unknown> = {
    locationId,
    email:  input.email,
    source: "Clean Path Account Signup",
    tags,
  };
  if (firstName)   payload.firstName = firstName;
  if (lastName)    payload.lastName  = lastName;
  if (input.phone) payload.phone     = input.phone;

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
      console.error("[/api/webhooks/clerk] ghl_upsert_failed status=%d body=%s",
        resp.status, text.slice(0, 300));
    }
  } catch (err) {
    // Swallow — Clerk must get a 2xx or it retries endlessly. The user is
    // still in our Supabase profiles table; sales can be reconciled later.
    console.error("[/api/webhooks/clerk] ghl_upsert_error:", err);
  }
}

export const config = { runtime: "edge" };

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // Verify Svix signature from Clerk
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("CLERK_WEBHOOK_SECRET not set");
    return new Response("Webhook secret not configured", { status: 500 });
  }

  const svixId        = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("Missing svix headers", { status: 400 });
  }

  const body = await req.text();
  const wh   = new Webhook(webhookSecret);
  let event: { type: string; data: Record<string, unknown> };

  try {
    event = wh.verify(body, {
      "svix-id":        svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as typeof event;
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  const supabase = getServiceClient();

  if (event.type === "user.created") {
    const user      = event.data as {
      id: string;
      email_addresses: { email_address: string; id: string }[];
      primary_email_address_id: string;
      first_name: string | null;
      last_name: string | null;
      phone_numbers: { phone_number: string }[];
      unsafe_metadata?: { plan?: string; stripe_session_id?: string; stripe_customer_id?: string; quiz_data?: Record<string, unknown> };
    };

    const primaryEmail = user.email_addresses.find(
      (e) => e.id === user.primary_email_address_id
    )?.email_address ?? user.email_addresses[0]?.email_address ?? "";

    const fullName    = [user.first_name, user.last_name].filter(Boolean).join(" ") || null;
    const phone       = user.phone_numbers[0]?.phone_number ?? null;
    const meta        = user.unsafe_metadata ?? {};
    const plan        = (meta.plan as string) || "free";

    // Stitch this signup to their most-recent pre-registration quiz lead
    // (matched case-insensitively on email). Profiles doesn't have
    // urgency/tier columns of its own, so we fold them into quiz_data
    // along with the obstacles + score/income/timeline ranges — gives the
    // admin the full funnel context the moment the user registers,
    // without a separate dashboard lookup.
    let linkedLead: {
      goal:              string | null;
      challenge:         string | null;
      quiz_data:         Record<string, unknown> | null;
    } | null = null;
    try {
      const { data: leadMatch } = await supabase
        .from("lead_submissions")
        .select("*")
        .ilike("email", primaryEmail)   // case-insensitive equality
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (leadMatch) {
        linkedLead = {
          goal:      leadMatch.goal ?? null,
          challenge: leadMatch.obstacles && leadMatch.obstacles.length > 0
                       ? leadMatch.obstacles.join(", ")
                       : null,
          quiz_data: {
            // Namespace under "lead" so future fields from signup flow
            // (ads, referrer, etc.) don't collide.
            lead: {
              id:                 leadMatch.id,
              urgency_score:      leadMatch.urgency_score,
              urgency_tier:       leadMatch.urgency_tier,
              recommended_offer:  leadMatch.recommended_offer,
              obstacles:          leadMatch.obstacles,
              credit_score_range: leadMatch.credit_score_range,
              income_range:       leadMatch.income_range,
              ideal_score:        leadMatch.ideal_score,
              timeline:           leadMatch.timeline,
              source:             leadMatch.source,
              submitted_at:       leadMatch.submitted_at,
            },
          },
        };
      }
    } catch (err) {
      // Non-fatal — registration proceeds even if the link lookup fails.
      console.error("Lead auto-link lookup failed:", err);
    }

    // Merge explicit Clerk metadata quiz_data (from in-product flows) over
    // the linked-lead quiz_data. If both exist, the in-product one wins
    // for any overlapping keys but the lead context is preserved under
    // `lead` namespace.
    const mergedQuizData = (() => {
      const base = linkedLead?.quiz_data ?? null;
      const meta_qd = (meta.quiz_data as Record<string, unknown> | undefined) ?? null;
      if (!base && !meta_qd) return null;
      if (!base) return meta_qd;
      if (!meta_qd) return base;
      return { ...base, ...meta_qd };
    })();

    const { error } = await supabase.from("profiles").upsert({
      id:                 user.id,
      email:              primaryEmail,
      full_name:          fullName,
      phone,
      role:               process.env.ADMIN_EMAIL?.toLowerCase() === primaryEmail.toLowerCase() ? "admin" : "client",
      plan:               plan as "free" | "diy" | "standard" | "premium",
      stripe_session_id:  meta.stripe_session_id ?? null,
      stripe_customer_id: meta.stripe_customer_id ?? null,
      goal:               linkedLead?.goal ?? null,
      challenge:          linkedLead?.challenge ?? null,
      quiz_data:          mergedQuizData,
    }, { onConflict: "id" });

    if (error) {
      console.error("Failed to upsert profile:", error.message);
      return new Response("Database error", { status: 500 });
    }

    // Mirror the signup into GHL so direct-signup leads (no prior quiz
    // submission) land with name + phone populated. Awaited so the 2xx
    // only fires after the GHL call settles — this is an edge fn with a
    // ~25s budget, the upsert completes in <500ms. If GHL fails we still
    // 200 to Clerk (the user exists in Supabase regardless).
    await upsertGHLFromClerk({
      email:    primaryEmail,
      fullName,
      phone,
      plan,
    });
  }

  if (event.type === "user.updated") {
    const user = event.data as {
      id: string;
      unsafe_metadata?: { plan?: string; stripe_customer_id?: string };
    };
    const meta = user.unsafe_metadata ?? {};

    if (meta.plan) {
      await supabase.from("profiles")
        .update({
          plan: meta.plan as "free" | "diy" | "standard" | "premium",
          stripe_customer_id: meta.stripe_customer_id ?? null,
        })
        .eq("id", user.id);
    }
  }

  return new Response("OK", { status: 200 });
}
