/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * POST /api/admin/invite-client
 *
 * Sends a Clerk invitation to a prospective client by email. The
 * customer receives a magic link that completes account creation
 * via Clerk's hosted flow; on first sign-in, the existing Clerk
 * webhook (api/webhooks/clerk.ts) creates the Supabase profile row
 * with role='client' and auto-links to a matching lead_submissions
 * row by email (case-insensitive).
 *
 * Two callers, same endpoint:
 *   - Admin clicks "Add Client" in /admin → email + name + phone form
 *   - Admin clicks "Convert to Client" on a lead row → modal opens
 *     pre-filled with the lead's email/name/phone
 *
 * Either way the customer ends up with a Clerk user + Supabase
 * profile linked to whichever lead_submissions row matched their
 * email. No double-entry needed.
 *
 * Auth model:
 *   - Clerk session JWT verified via @clerk/backend
 *   - Caller must be a profile with role='admin'
 *
 * Response:
 *   { ok: true, invitation_url: string, email: string }
 *
 * The admin UI displays invitation_url so the admin can also share
 * the link manually (SMS, copied into a CRM, etc.) — Clerk also
 * sends the email automatically.
 *
 * Required env:
 *   CLERK_SECRET_KEY
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Optional env:
 *   APP_URL  (default: https://cleanpathcredit.com) — used as the
 *            redirect target after the customer accepts the invite
 */

import type { IncomingMessage, ServerResponse } from "http";
import { createClient } from "@supabase/supabase-js";
import { verifyToken, createClerkClient } from "@clerk/backend";
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

interface InviteRequest {
  email:     string;
  fullName?: string;
  phone?:    string;
  /** Optional — when set, recorded on the Clerk invitation's
   *  publicMetadata so the post-signup webhook knows which lead row
   *  to bind to. Auto-link by email also works; this is a precision
   *  hint when multiple leads share an email. */
  lead_id?:  string;
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

  // 2. Env validation
  const clerkSecretKey     = process.env.CLERK_SECRET_KEY;
  const supabaseUrl        = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!clerkSecretKey || !supabaseUrl || !supabaseServiceKey) {
    console.error("[/api/admin/invite-client] server_misconfigured", {
      CLERK_SECRET_KEY:          !!clerkSecretKey,
      SUPABASE_URL:              !!supabaseUrl,
      SUPABASE_SERVICE_ROLE_KEY: !!supabaseServiceKey,
    });
    return sendJson(res, 500, { error: "server_misconfigured" });
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
  const body = await readJsonBody<InviteRequest>(req);
  if (!body || typeof body.email !== "string" || !body.email.includes("@")) {
    return sendJson(res, 400, { error: "valid_email_required" });
  }
  const email    = body.email.trim().toLowerCase();
  const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
  const phone    = typeof body.phone === "string" ? body.phone.trim() : "";
  const leadId   = typeof body.lead_id === "string" ? body.lead_id.trim() : "";

  // 5. Admin gate (service-role lookup)
  const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: caller } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", callerId)
    .single();
  if (caller?.role !== "admin") {
    return sendJson(res, 403, { error: "forbidden" });
  }

  // 6. Don't double-invite an already-registered user. If the email
  // already maps to a Clerk user, we surface that to the admin so they
  // can take a different action (open the existing client's record,
  // resend a sign-in link, etc.).
  const clerk = createClerkClient({ secretKey: clerkSecretKey });
  try {
    const existing = await clerk.users.getUserList({ emailAddress: [email] });
    if (existing.data[0]) {
      return sendJson(res, 409, {
        error: "user_exists",
        clerk_user_id: existing.data[0].id,
        hint: "An account with this email already exists. Open the existing client record instead.",
      });
    }
  } catch (err) {
    console.error("[/api/admin/invite-client] clerk lookup failed:", err);
    return sendJson(res, 502, { error: "clerk_lookup_failed" });
  }

  // 7. Create the Clerk invitation. Clerk emails the recipient
  // automatically; we also surface invitation.url so the admin can
  // share the link via SMS / their preferred channel.
  const appUrl = process.env.APP_URL ?? DEFAULT_APP_URL;
  let invitation: Awaited<ReturnType<typeof clerk.invitations.createInvitation>>;
  try {
    invitation = await clerk.invitations.createInvitation({
      emailAddress:  email,
      // After the recipient clicks the magic link and Clerk completes
      // account creation, send them to /welcome. The Clerk webhook fires
      // user.created in parallel, which creates the profiles row +
      // auto-links to lead_submissions by email.
      redirectUrl:   `${appUrl}/welcome`,
      // Stash the originating lead id (if any) on the invitation so the
      // webhook can use it as a precise binding hint instead of relying
      // on email alone. publicMetadata is read-only from the client and
      // safer than unsafeMetadata for an admin-driven invariant.
      publicMetadata: {
        invited_by:        "admin",
        invited_by_user:   callerId,
        invited_full_name: fullName || undefined,
        invited_phone:     phone    || undefined,
        invited_lead_id:   leadId   || undefined,
      },
    });
  } catch (err) {
    console.error("[/api/admin/invite-client] clerk createInvitation failed:", err);
    return sendJson(res, 502, { error: "clerk_invitation_failed" });
  }

  // 8. If the admin provided a name/phone, write it back to the
  // matching lead row so the lead view stays consistent with what the
  // admin entered. Best-effort — invitation success is what the API
  // promises; this is a UX nicety.
  if (leadId && (fullName || phone)) {
    try {
      const updates: { full_name?: string; phone?: string } = {};
      if (fullName) updates.full_name = fullName;
      if (phone)    updates.phone     = phone;
      await supabase.from("lead_submissions").update(updates).eq("id", leadId);
    } catch (err) {
      console.warn("[/api/admin/invite-client] lead row update failed:", err);
    }
  }

  return sendJson(res, 200, {
    ok:             true,
    invitation_url: invitation.url ?? null,
    invitation_id:  invitation.id,
    email,
  });
}
