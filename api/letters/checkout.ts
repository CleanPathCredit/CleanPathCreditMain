/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * POST /api/letters/checkout
 *
 * Creates a Stripe Checkout Session pre-tagged with
 * `metadata.letter_round_id` so when the customer completes payment,
 * the existing /api/webhooks/stripe handler's round-payment branch
 * flips letter_rounds.payment_cleared_at and unlocks Generate.
 *
 * Two callers, same endpoint:
 *   - Admin in /admin/letters → uses the returned `url` to copy a
 *     payment link they email/text to the customer (admin doesn't pay).
 *   - Customer on /dashboard → opens the URL in a new tab to pay
 *     themselves (DIY self-pay).
 *
 * Either way the customer is identified as `round.profile`, not the
 * caller — so admin-created links charge the customer's card, not the
 * admin's. We pre-fill `customer` (when stripe_customer_id exists from
 * a prior plan purchase) or `customer_email` (first-time payer).
 *
 * Constraints enforced:
 *   - Caller must be admin OR the owner of the round (RLS-style check
 *     done server-side because we use the service-role client below)
 *   - Round must exist and not already be paid (`payment_cleared_at`
 *     null) — re-checkout on a paid round returns 409
 *   - Round letter_type cannot be 623 yet (template not implemented)
 *
 * Required env:
 *   CLERK_SECRET_KEY
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   STRIPE_SECRET_KEY
 *   STRIPE_LETTER_ROUND_PRICE_ID    Stripe Price ID for a single round
 *                                   payment (stable across Stripe
 *                                   Dashboard edits, unlike Buy Button
 *                                   IDs). Find under Products → your
 *                                   "Letter round" product → its Price.
 * Optional env:
 *   APP_URL                         Base URL for success/cancel redirects.
 *                                   Defaults to https://cleanpathcredit.com.
 */

import type { IncomingMessage, ServerResponse } from "http";
import { createClient } from "@supabase/supabase-js";
import { verifyToken } from "@clerk/backend";
import Stripe from "stripe";
import type { Database } from "../../src/types/database";

export const config = { runtime: "nodejs" };

const DEFAULT_APP_URL = "https://cleanpathcredit.com";

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

interface CheckoutRequest {
  letter_round_id: string;
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

  // 2. Env validation (fail closed)
  const clerkSecretKey     = process.env.CLERK_SECRET_KEY;
  const supabaseUrl        = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const stripeSecretKey    = process.env.STRIPE_SECRET_KEY;
  const priceId            = process.env.STRIPE_LETTER_ROUND_PRICE_ID;
  if (!clerkSecretKey || !supabaseUrl || !supabaseServiceKey || !stripeSecretKey) {
    console.error("[/api/letters/checkout] server_misconfigured", {
      CLERK_SECRET_KEY:          !!clerkSecretKey,
      SUPABASE_URL:              !!supabaseUrl,
      SUPABASE_SERVICE_ROLE_KEY: !!supabaseServiceKey,
      STRIPE_SECRET_KEY:         !!stripeSecretKey,
    });
    return sendJson(res, 500, { error: "server_misconfigured" });
  }
  if (!priceId) {
    return sendJson(res, 500, { error: "stripe_price_not_configured" });
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
  const body = await readJsonBody<CheckoutRequest>(req);
  if (!body || typeof body.letter_round_id !== "string") {
    return sendJson(res, 400, { error: "letter_round_id required" });
  }

  const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 5. Load round + caller's role in parallel
  const [{ data: round, error: roundErr }, { data: caller }] = await Promise.all([
    supabase
      .from("letter_rounds")
      .select("id, profile_id, round_number, letter_type, payment_cleared_at")
      .eq("id", body.letter_round_id)
      .single(),
    supabase
      .from("profiles")
      .select("role")
      .eq("id", callerId)
      .single(),
  ]);
  if (roundErr || !round) {
    return sendJson(res, 404, { error: "letter_round_not_found" });
  }

  // 6. Authorization — admin can create checkout for any round; clients only their own
  const isAdmin = caller?.role === "admin";
  const isOwner = round.profile_id === callerId;
  if (!isAdmin && !isOwner) {
    return sendJson(res, 403, { error: "forbidden" });
  }

  // 7. State validation
  if (round.payment_cleared_at) {
    return sendJson(res, 409, {
      error: "already_paid",
      paid_at: round.payment_cleared_at,
    });
  }
  if (round.letter_type === "623") {
    return sendJson(res, 501, { error: "623_template_not_implemented" });
  }

  // 8. Load the round-owner profile for customer pre-fill (always the
  // round's profile — not the caller, so admin-created links still
  // bill the customer, not the admin).
  const { data: ownerProfile } = await supabase
    .from("profiles")
    .select("email, stripe_customer_id")
    .eq("id", round.profile_id)
    .single();
  if (!ownerProfile?.email) {
    return sendJson(res, 500, { error: "owner_email_missing" });
  }

  // 9. Create Stripe Checkout Session.
  // The session's `metadata.letter_round_id` is what the
  // /api/webhooks/stripe round-payment branch reads to flip
  // payment_cleared_at — the round-id contract is here.
  const stripe = new Stripe(stripeSecretKey, { apiVersion: "2026-03-25.dahlia" });
  const appUrl = process.env.APP_URL ?? DEFAULT_APP_URL;

  const successUrl =
    `${appUrl}/dashboard?letter_round=${encodeURIComponent(round.id)}&paid=true`;
  const cancelUrl =
    `${appUrl}/dashboard?letter_round=${encodeURIComponent(round.id)}&canceled=true`;

  // Use stripe_customer_id if we have one (better receipts + dispute
  // history); otherwise let Stripe create one from customer_email.
  const customerFields: Pick<
    Stripe.Checkout.SessionCreateParams,
    "customer" | "customer_email"
  > = ownerProfile.stripe_customer_id
    ? { customer: ownerProfile.stripe_customer_id }
    : { customer_email: ownerProfile.email };

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.create({
      mode:        "payment",
      line_items:  [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url:  cancelUrl,
      ...customerFields,
      metadata: {
        letter_round_id: round.id,
        letter_type:     round.letter_type,
        round_number:    String(round.round_number),
        // The profile being charged. Doesn't have to match the caller —
        // an admin can create a session for a client and email them the
        // URL; on completion the webhook flips THIS round's gate.
        profile_id:      round.profile_id,
      },
    });
  } catch (err) {
    console.error("[/api/letters/checkout] stripe_create_failed", err);
    return sendJson(res, 502, { error: "stripe_create_failed" });
  }

  if (!session.url) {
    return sendJson(res, 502, { error: "stripe_session_url_missing" });
  }

  return sendJson(res, 200, {
    session_id: session.id,
    url:        session.url,
  });
}
