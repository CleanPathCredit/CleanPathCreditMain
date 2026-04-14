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
 * Setup (one-time):
 *   1. Clerk Dashboard → Webhooks → Add endpoint
 *      URL: https://cleanpathcredit.com/api/webhooks/clerk
 *      Events: user.created, user.updated
 *   2. Copy the "Signing Secret" → add to Vercel env:
 *      CLERK_WEBHOOK_SECRET=whsec_xxx
 *   3. Add to Vercel env:
 *      SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
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

    const { error } = await supabase.from("profiles").upsert({
      id:                 user.id,
      email:              primaryEmail,
      full_name:          fullName,
      phone,
      role:               process.env.ADMIN_EMAIL?.toLowerCase() === primaryEmail.toLowerCase() ? "admin" : "client",
      plan:               plan as "free" | "diy" | "standard" | "premium",
      stripe_session_id:  meta.stripe_session_id ?? null,
      stripe_customer_id: meta.stripe_customer_id ?? null,
      quiz_data:          meta.quiz_data ?? null,
    }, { onConflict: "id" });

    if (error) {
      console.error("Failed to upsert profile:", error.message);
      return new Response("Database error", { status: 500 });
    }
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
