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
import { Resend } from "resend";
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

  // Send purchase confirmation email to customer (Stripe defense evidence)
  await sendPurchaseConfirmation({ email, name, plan });

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

const PLAN_LABELS: Record<Plan, string> = {
  free:     "Free",
  diy:      "DIY Blueprint",
  standard: "Credit Correction System",
  premium:  "Executive System",
};

async function sendPurchaseConfirmation({ email, name, plan }: {
  email: string; name: string; plan: Plan;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from   = process.env.RESEND_FROM_EMAIL ?? "Clean Path Credit <noreply@cleanpathcredit.com>";
  if (!apiKey) {
    console.warn("RESEND_API_KEY not set — skipping purchase confirmation email");
    return;
  }

  const resend    = new Resend(apiKey);
  const planLabel = PLAN_LABELS[plan] ?? plan;
  const firstName = name.split(" ")[0] || "there";

  try {
    await resend.emails.send({
      from,
      to: email,
      subject: `Your ${planLabel} Is Ready — Welcome to Clean Path Credit`,
      html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f9fafb;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
    <div style="text-align:center;margin-bottom:32px;">
      <img src="https://cleanpathcredit.com/logo.png" alt="Clean Path Credit" width="48" height="48" style="border-radius:8px;"/>
    </div>
    <div style="background:#fff;border-radius:12px;padding:32px;border:1px solid #e5e7eb;">
      <h1 style="margin:0 0 8px;font-size:22px;color:#18181b;">Hey ${firstName}, You're All Set!</h1>
      <p style="margin:0 0 24px;color:#71717a;font-size:15px;line-height:1.6;">
        Your <strong>${planLabel}</strong> purchase is confirmed. Your credit correction system is ready and waiting for you.
      </p>

      <div style="background:#f0fdf4;border-radius:8px;padding:16px;margin-bottom:24px;">
        <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#166534;">What happens next:</p>
        <ol style="margin:0;padding-left:20px;color:#15803d;font-size:14px;line-height:1.8;">
          <li>Create your account (if you haven't already)</li>
          <li>Access your personalized dashboard</li>
          <li>Follow your step-by-step action plan</li>
        </ol>
      </div>

      <div style="text-align:center;margin-bottom:24px;">
        <a href="https://cleanpathcredit.com/dashboard"
           style="display:inline-block;background:#18181b;color:#fff;padding:12px 32px;border-radius:999px;text-decoration:none;font-weight:600;font-size:15px;">
          Access My Dashboard →
        </a>
      </div>

      <p style="margin:0;color:#a1a1aa;font-size:12px;line-height:1.6;">
        This email confirms your purchase and that digital product access has been delivered.
        If you have any questions, reply to this email or contact
        <a href="mailto:support@cleanpathcredit.com" style="color:#059669;">support@cleanpathcredit.com</a>.
      </p>
    </div>

    <div style="text-align:center;margin-top:24px;">
      <p style="color:#d4d4d8;font-size:11px;line-height:1.6;">
        &copy; ${new Date().getFullYear()} Clean Path Credit. All rights reserved.<br/>
        You received this email because you purchased the ${planLabel}.<br/>
        <a href="https://cleanpathcredit.com/terms" style="color:#a1a1aa;">Terms</a> &middot;
        <a href="https://cleanpathcredit.com/privacy" style="color:#a1a1aa;">Privacy</a>
      </p>
    </div>
  </div>
</body>
</html>`.trim(),
    });
    console.log(`Purchase confirmation sent to ${email}`);
  } catch (err) {
    console.error("Failed to send purchase confirmation:", err);
    // Non-fatal — purchase still processed
  }
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
