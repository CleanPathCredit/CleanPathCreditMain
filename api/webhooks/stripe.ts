/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * POST /api/webhooks/stripe
 *
 * Handles Stripe `checkout.session.completed` to:
 *   1. Dedupe the event via public.stripe_webhook_events (migration 004)
 *   2. Look up or create a Clerk user for the payer's email
 *   3. Set plan tier on Clerk metadata (Clerk webhook syncs to Supabase profiles)
 *   4. Generate a Clerk sign-in token so /welcome can auto-sign-in the user
 *
 * Hardening vs prior version (audit finding C-3):
 *   - Node.js runtime with raw-body stream read — fixes TypeError: req.text
 *     is not a function that was 100%-failing prod webhooks.
 *   - Fail-closed env validation — missing var returns 500 {"error":"server_misconfigured"}.
 *   - Idempotent via Stripe event.id unique PK — retries short-circuit to 200.
 *   - Plan mapping via STRIPE_PRICE_PLAN_MAP env (stable Price IDs), not Buy
 *     Button IDs (which rotate whenever a button is rewritten).
 *   - Sign-in token is NOT logged (it is an auth credential).
 *
 * Follow-up hardening tracked separately:
 *   - H-2: migrate `plan` writes from Clerk unsafeMetadata (client-writable)
 *     to privateMetadata (server-only).
 *
 * Required env:
 *   STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, CLERK_SECRET_KEY,
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Optional env:
 *   STRIPE_PRICE_PLAN_MAP    price_abc=diy,price_def=standard,price_ghi=premium
 *   GHL_WEBHOOK_URL          owner-notification webhook (falls back to VITE_LEAD_WEBHOOK_URL)
 */

import type { IncomingMessage, ServerResponse } from "http";
import Stripe from "stripe";
import { createClerkClient } from "@clerk/backend";
import { createClient } from "@supabase/supabase-js";
import type { Database, Plan } from "../../src/types/database";

export const config = { runtime: "nodejs" };

// Ordered high → low so "at least" matching picks the highest qualifying tier.
const AMOUNT_PLAN_MAP: [number, Plan][] = [
  [249700, "premium"],
  [49700,  "standard"],
  [9700,   "diy"],
];

function parsePricePlanMap(raw: string | undefined): Record<string, Plan> {
  if (!raw) return {};
  const validPlans: readonly Plan[] = ["free", "diy", "standard", "premium"] as const;
  const map: Record<string, Plan> = {};
  for (const pair of raw.split(",")) {
    const [priceId, plan] = pair.split("=").map((s) => s.trim());
    if (priceId && plan && (validPlans as readonly string[]).includes(plan)) {
      map[priceId] = plan as Plan;
    }
  }
  return map;
}

async function planFromSession(
  stripe: Stripe,
  session: Stripe.Checkout.Session,
  priceMap: Record<string, Plan>,
): Promise<Plan> {
  // Prefer explicit Price ID mapping (stable identifier)
  try {
    const expanded = await stripe.checkout.sessions.retrieve(session.id, {
      expand: ["line_items.data.price"],
    });
    const priceId = expanded.line_items?.data?.[0]?.price?.id;
    if (priceId && priceMap[priceId]) return priceMap[priceId];
  } catch (err) {
    console.error("[/api/webhooks/stripe] line_items expand failed:", err);
    // Fall through to amount-based
  }
  const amount = session.amount_total ?? 0;
  for (const [threshold, plan] of AMOUNT_PLAN_MAP) {
    if (amount >= threshold) return plan;
  }
  return "diy";
}

async function readRawBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req as unknown as AsyncIterable<Buffer | string>) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString("utf-8");
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

function sendText(res: ServerResponse, status: number, body: string): void {
  res.statusCode = status;
  res.setHeader("Content-Type", "text/plain");
  res.end(body);
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  if (req.method !== "POST") {
    return sendText(res, 405, "Method not allowed");
  }

  // 1. Fail-closed env check
  const {
    STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET,
    CLERK_SECRET_KEY,
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    STRIPE_PRICE_PLAN_MAP,
  } = process.env;
  if (
    !STRIPE_SECRET_KEY ||
    !STRIPE_WEBHOOK_SECRET ||
    !CLERK_SECRET_KEY ||
    !SUPABASE_URL ||
    !SUPABASE_SERVICE_ROLE_KEY
  ) {
    console.error("[/api/webhooks/stripe] server_misconfigured — missing env", {
      STRIPE_SECRET_KEY:         !!STRIPE_SECRET_KEY,
      STRIPE_WEBHOOK_SECRET:     !!STRIPE_WEBHOOK_SECRET,
      CLERK_SECRET_KEY:          !!CLERK_SECRET_KEY,
      SUPABASE_URL:              !!SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!SUPABASE_SERVICE_ROLE_KEY,
    });
    return sendJson(res, 500, { error: "server_misconfigured" });
  }

  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2026-03-25.dahlia" });

  // 2. Read raw body + verify Stripe signature
  let rawBody: string;
  try {
    rawBody = await readRawBody(req);
  } catch (err) {
    console.error("[/api/webhooks/stripe] failed to read body:", err);
    return sendText(res, 400, "Bad request");
  }
  const signature = (req.headers["stripe-signature"] as string | undefined) ?? "";

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("[/api/webhooks/stripe] signature verification failed:", err);
    return sendText(res, 400, "Invalid signature");
  }

  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 3. Idempotency — insert event.id, catch unique_violation (23505)
  {
    const { error: dedupErr } = await supabase
      .from("stripe_webhook_events")
      .insert({ id: event.id, event_type: event.type });
    if (dedupErr) {
      if (dedupErr.code === "23505") {
        return sendText(res, 200, "Already processed");
      }
      console.error("[/api/webhooks/stripe] dedup insert failed:", dedupErr);
      return sendJson(res, 500, { error: "dedup_insert_failed" });
    }
  }

  // 4. Only act on checkout.session.completed; other events are dedupe-stored and ACKed
  if (event.type !== "checkout.session.completed") {
    return sendText(res, 200, "OK");
  }

  const session    = event.data.object as Stripe.Checkout.Session;
  const email      = session.customer_details?.email;
  const name       = session.customer_details?.name ?? "";
  const customerId = typeof session.customer === "string" ? session.customer : null;

  if (!email) {
    console.error("[/api/webhooks/stripe] no email in session", session.id);
    return sendText(res, 400, "No email");
  }

  const priceMap = parsePricePlanMap(STRIPE_PRICE_PLAN_MAP);
  const plan     = await planFromSession(stripe, session, priceMap);

  const clerk = createClerkClient({ secretKey: CLERK_SECRET_KEY });

  // 5. Find or create Clerk user; set plan via metadata
  let clerkUserId: string;
  const existingUsers = await clerk.users.getUserList({ emailAddress: [email] });
  const existingUser  = existingUsers.data[0];

  if (existingUser) {
    clerkUserId = existingUser.id;
    await clerk.users.updateUserMetadata(clerkUserId, {
      // TODO(H-2): migrate to privateMetadata (server-only).
      unsafeMetadata: {
        ...existingUser.unsafeMetadata,
        plan,
        stripe_customer_id: customerId,
        stripe_session_id:  session.id,
      },
    });
  } else {
    const [firstName, ...rest] = name.split(" ");
    const newUser = await clerk.users.createUser({
      emailAddress: [email],
      firstName:    firstName ?? "",
      lastName:     rest.join(" ") || undefined,
      // TODO(H-2): migrate to privateMetadata (server-only).
      unsafeMetadata: {
        plan,
        stripe_customer_id: customerId,
        stripe_session_id:  session.id,
      },
    });
    clerkUserId = newUser.id;
  }

  // 6. Belt-and-suspenders — upsert the Supabase profile row directly
  await supabase.from("profiles").upsert(
    {
      id:                 clerkUserId,
      email,
      full_name:          name || null,
      plan,
      stripe_customer_id: customerId,
      stripe_session_id:  session.id,
    },
    { onConflict: "id" },
  );

  // 7. Sign-in token for /welcome auto-sign-in (24h TTL).
  //    DO NOT log the token — it is an auth credential.
  const signInToken = await clerk.signInTokens.createSignInToken({
    userId:           clerkUserId,
    expiresInSeconds: 86400,
  });

  // 8. Internal notification (fire-and-forget; non-fatal)
  await notifyOwner({ email, name, plan, sessionId: session.id });

  console.log(
    `[/api/webhooks/stripe] purchase processed: email=${email} plan=${plan} userId=${clerkUserId} eventId=${event.id}`,
  );

  return sendJson(res, 200, {
    ok:     true,
    token:  signInToken.token,
    plan,
    userId: clerkUserId,
  });
}

async function notifyOwner({ email, name, plan, sessionId }: {
  email: string; name: string; plan: Plan; sessionId: string;
}) {
  const webhookUrl = process.env.GHL_WEBHOOK_URL ?? process.env.VITE_LEAD_WEBHOOK_URL;
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
    console.error("[/api/webhooks/stripe] owner notification failed:", err);
  }
}
