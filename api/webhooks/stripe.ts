/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * Vercel Edge Function: POST /api/webhooks/stripe
 *
 * Handles Stripe checkout.session.completed to:
 *   1. Look up or create a Clerk user by email
 *   2. Set the correct plan tier via Clerk's unsafe_metadata
 *      (the Clerk webhook then syncs it to Supabase profiles)
 *   3. Generate a Clerk "sign-in token" so the /welcome page can
 *      automatically sign the new user in without them setting a password yet
 *
 * Setup (one-time):
 *   1. Stripe Dashboard → Developers → Webhooks → Add endpoint
 *      URL: https://cleanpathcredit.com/api/webhooks/stripe
 *      Events: checkout.session.completed
 *   2. Copy "Signing secret" → STRIPE_WEBHOOK_SECRET in Vercel env
 *   3. Add: STRIPE_SECRET_KEY, CLERK_SECRET_KEY, SUPABASE_URL,
 *            SUPABASE_SERVICE_ROLE_KEY, NOTIFICATION_EMAIL, NOTIFICATION_PHONE
 *
 * Stripe Buy Button price → plan mapping (update with your real Price IDs):
 *   buy_btn_1TKC9sCRvEfUoJHH2j25qlzl  → diy      ($97)
 *   buy_btn_1TKCHQCRvEfUoJHHRsYycHRA  → standard ($497)
 *   buy_btn_1TKCDdCRvEfUoJHHwJwoLyj9  → premium  ($2497)
 */

import Stripe from "stripe";
import { createClerkClient } from "@clerk/backend";
import { createClient } from "@supabase/supabase-js";
import type { Database, Plan } from "../../src/types/database";

// Buy Button ID → plan tier
const BUTTON_PLAN_MAP: Record<string, Plan> = {
  buy_btn_1TKC9sCRvEfUoJHH2j25qlzl: "diy",
  buy_btn_1TKCHQCRvEfUoJHHRsYycHRA: "standard",
  buy_btn_1TKCDdCRvEfUoJHHwJwoLyj9: "premium",
};

// Amount-based fallback (cents)
const AMOUNT_PLAN_MAP: [number, Plan][] = [
  [9700,   "diy"],
  [49700,  "standard"],
  [249700, "premium"],
];

function planFromSession(session: Stripe.Checkout.Session): Plan {
  // Try Buy Button ID first
  const btnId = (session.metadata?.buy_button_id ?? "") as string;
  if (BUTTON_PLAN_MAP[btnId]) return BUTTON_PLAN_MAP[btnId];

  // Fallback: match by amount paid
  const amount = session.amount_total ?? 0;
  for (const [threshold, plan] of AMOUNT_PLAN_MAP) {
    if (amount >= threshold) return plan;
  }
  return "diy";
}

export const config = { runtime: "nodejs" };

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-03-25.dahlia" });
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  const body      = await req.text();
  const signature = req.headers.get("stripe-signature") ?? "";

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    console.error("Stripe signature verification failed:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return new Response("OK", { status: 200 });
  }

  const session   = event.data.object as Stripe.Checkout.Session;
  const email     = session.customer_details?.email;
  const name      = session.customer_details?.name ?? "";
  const plan      = planFromSession(session);
  const customerId = typeof session.customer === "string" ? session.customer : null;

  if (!email) {
    console.error("No email in Stripe session", session.id);
    return new Response("No email", { status: 400 });
  }

  const clerk    = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });
  const supabase = createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  // Find or create the Clerk user
  let clerkUserId: string;
  const existingUsers = await clerk.users.getUserList({ emailAddress: [email] });
  const existingUser  = existingUsers.data[0];

  if (existingUser) {
    clerkUserId = existingUser.id;
    // Update plan on existing user
    await clerk.users.updateUserMetadata(clerkUserId, {
      unsafeMetadata: {
        ...existingUser.unsafeMetadata,
        plan,
        stripe_customer_id:  customerId,
        stripe_session_id:   session.id,
      },
    });
  } else {
    // Create a new Clerk user — they'll set their password via magic link
    const [firstName, ...rest] = name.split(" ");
    const newUser = await clerk.users.createUser({
      emailAddress: [email],
      firstName:    firstName ?? "",
      lastName:     rest.join(" ") || undefined,
      // skipPasswordRequirement: they'll set it via the welcome email
      unsafeMetadata: {
        plan,
        stripe_customer_id:  customerId,
        stripe_session_id:   session.id,
      },
    });
    clerkUserId = newUser.id;
  }

  // Directly upsert Supabase profile (belt-and-suspenders alongside Clerk webhook)
  await supabase.from("profiles").upsert({
    id:                 clerkUserId,
    email,
    full_name:          name || null,
    plan,
    stripe_customer_id: customerId,
    stripe_session_id:  session.id,
  }, { onConflict: "id" });

  // Generate a sign-in token so /welcome can auto-sign-in the user (24hr TTL)
  const signInToken = await clerk.signInTokens.createSignInToken({
    userId:            clerkUserId,
    expiresInSeconds:  86400,
  });

  // Send internal notification (email + SMS via GoHighLevel or direct)
  await notifyOwner({ email, name, plan, sessionId: session.id });

  // The /welcome page reads the token from the redirect URL
  console.log(`Purchase processed: ${email} → ${plan} | token: ${signInToken.token}`);

  return new Response(JSON.stringify({
    ok:    true,
    token: signInToken.token,
    plan,
    userId: clerkUserId,
  }), {
    status:  200,
    headers: { "Content-Type": "application/json" },
  });
}

async function notifyOwner({ email, name, plan, sessionId }: {
  email: string; name: string; plan: Plan; sessionId: string;
}) {
  // Route through your existing GoHighLevel webhook proxy
  const webhookUrl = process.env.VITE_LEAD_WEBHOOK_URL ?? process.env.GHL_WEBHOOK_URL;
  if (!webhookUrl) return;

  try {
    await fetch(webhookUrl, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type:      "purchase",
        email,
        name,
        plan,
        sessionId,
        message:   `New ${plan.toUpperCase()} purchase from ${name} (${email})`,
      }),
    });
  } catch (err) {
    console.error("Owner notification failed:", err);
    // Non-fatal — purchase still processed
  }
}
