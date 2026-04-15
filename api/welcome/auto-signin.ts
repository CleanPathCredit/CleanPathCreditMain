/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * GET /api/welcome/auto-signin?session_id=cs_xxx
 *
 * Called by the /welcome page right after Stripe checkout to bridge the gap
 * between "user just paid" and "user is signed in on cleanpathcredit.com".
 *
 * Flow:
 *   1. Validate the Stripe Checkout Session exists and is paid.
 *   2. Pull the email Stripe collected during checkout.
 *   3. Look up the Clerk user that /api/webhooks/stripe already created
 *      (or create them now as a fallback if the webhook hasn't fired yet).
 *   4. Mint a fresh short-lived Clerk sign-in "ticket" (15 min TTL).
 *   5. Return { token, email, plan } — the client calls
 *      signIn.create({ strategy: 'ticket', ticket: token }) to sign in.
 *
 * Security:
 *   - Stripe session IDs are ~60 random chars — not brute-forceable.
 *   - Token TTL is 15 min, immediate consumption by /welcome.
 *   - Endpoint is useless without a real paid session.
 *   - The Clerk user must already exist (webhook path); if not, we create
 *     them with the same logic the Stripe webhook uses so racing webhooks
 *     don't lock paying users out of their account.
 */

import Stripe from "stripe";
import { createClerkClient } from "@clerk/backend";
import { createClient } from "@supabase/supabase-js";
import type { Database, Plan } from "../../src/types/database";

export const config = { runtime: "nodejs" };

// Same plan-from-session logic as the Stripe webhook — kept in sync here
// so this endpoint can act as a fallback when the webhook hasn't fired.
const BUTTON_PLAN_MAP: Record<string, Plan> = {
  buy_btn_1TKC9sCRvEfUoJHH2j25qlzl: "diy",
  buy_btn_1TKCHQCRvEfUoJHHRsYycHRA: "standard",
  buy_btn_1TKCDdCRvEfUoJHHwJwoLyj9: "premium",
};
const AMOUNT_PLAN_MAP: [number, Plan][] = [
  [9700,   "diy"],
  [49700,  "standard"],
  [249700, "premium"],
];
function planFromSession(session: Stripe.Checkout.Session): Plan {
  const btnId = (session.metadata?.buy_button_id ?? "") as string;
  if (BUTTON_PLAN_MAP[btnId]) return BUTTON_PLAN_MAP[btnId];
  const amount = session.amount_total ?? 0;
  for (const [threshold, plan] of AMOUNT_PLAN_MAP) {
    if (amount >= threshold) return plan;
  }
  return "diy";
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "GET") {
    return json({ error: "Method not allowed" }, 405);
  }

  const url       = new URL(req.url);
  const sessionId = url.searchParams.get("session_id");
  if (!sessionId) return json({ error: "Missing session_id" }, 400);

  // 1. Retrieve + verify the Stripe session
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-03-25.dahlia" });
  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch (err) {
    console.error("[auto-signin] stripe retrieve failed:", err);
    return json({ error: "Invalid session" }, 400);
  }

  const paid = session.payment_status === "paid" || session.status === "complete";
  if (!paid) return json({ error: "Payment not complete" }, 400);

  const email = session.customer_details?.email;
  const name  = session.customer_details?.name ?? "";
  if (!email) return json({ error: "No email on session" }, 400);

  const plan       = planFromSession(session);
  const customerId = typeof session.customer === "string" ? session.customer : null;

  // 2. Find or create the Clerk user (webhook fallback path)
  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });
  const existing = await clerk.users.getUserList({ emailAddress: [email] });
  let userId = existing.data[0]?.id;

  if (!userId) {
    // Webhook hasn't fired yet (or it failed) — create the user ourselves so
    // a paying customer is never locked out waiting on a delayed webhook.
    const [firstName, ...rest] = name.split(" ");
    const newUser = await clerk.users.createUser({
      emailAddress: [email],
      firstName:    firstName ?? "",
      lastName:     rest.join(" ") || undefined,
      unsafeMetadata: {
        plan,
        stripe_customer_id: customerId,
        stripe_session_id:  session.id,
      },
    });
    userId = newUser.id;

    // Best-effort Supabase profile creation (matches webhook behavior).
    // If this fails, the Clerk webhook or /api/me will heal it later.
    try {
      const supabase = createClient<Database>(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false, autoRefreshToken: false } },
      );
      await supabase.from("profiles").upsert({
        id:                 userId,
        email,
        full_name:          name || null,
        plan,
        stripe_customer_id: customerId,
        stripe_session_id:  session.id,
      }, { onConflict: "id" });
    } catch (err) {
      console.error("[auto-signin] supabase upsert failed (non-fatal):", err);
    }
  }

  // 3. Mint a fresh, short-lived sign-in ticket for the /welcome page
  const signInToken = await clerk.signInTokens.createSignInToken({
    userId,
    expiresInSeconds: 900, // 15 min
  });

  return json({
    token: signInToken.token,
    email,
    plan,
  });
}
