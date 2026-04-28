/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * GET /api/credit-report/list
 *
 * Returns the caller's credit_reports (newest first), or — if the caller
 * is an admin — any profile's reports via ?profile_id=<id>. Slim payload:
 * just the credit_reports rows, no accounts. Dashboard uses this to find
 * the most recent report and then fetches its accounts via
 * GET /api/credit-report/[id].
 */

import type { IncomingMessage, ServerResponse } from "http";
import { createClient } from "@supabase/supabase-js";
import { verifyToken } from "@clerk/backend";
import type { Database } from "../../src/types/database";

export const config = { runtime: "nodejs" };

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

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendJson(res, 405, { error: "method_not_allowed" });
  }

  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return sendJson(res, 401, { error: "unauthorized" });
  }
  const token = authHeader.slice(7).trim();
  if (!token) return sendJson(res, 401, { error: "unauthorized" });

  const clerkSecretKey     = process.env.CLERK_SECRET_KEY;
  const supabaseUrl        = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!clerkSecretKey || !supabaseUrl || !supabaseServiceKey) {
    return sendJson(res, 500, { error: "server_misconfigured" });
  }

  let callerId: string;
  try {
    const payload = await verifyToken(token, {
      secretKey:         clerkSecretKey,
      authorizedParties: getAuthorizedParties(),
    });
    if (typeof payload.sub !== "string" || !payload.sub) {
      return sendJson(res, 401, { error: "unauthorized" });
    }
    callerId = payload.sub;
  } catch {
    return sendJson(res, 401, { error: "unauthorized" });
  }

  const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const url = new URL(req.url ?? "/", "http://internal");
  const requestedProfileId = url.searchParams.get("profile_id");

  // Admins can look at anyone's reports; clients can only see their own.
  // profile_id query-param is ignored for non-admins (they always get
  // their own) rather than rejected outright — keeps the client UI
  // simple (one shared fetch path).
  let targetProfileId = callerId;
  if (requestedProfileId && requestedProfileId !== callerId) {
    const { data: me } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", callerId)
      .single();
    if (me?.role === "admin") {
      targetProfileId = requestedProfileId;
    } else {
      return sendJson(res, 403, { error: "forbidden" });
    }
  }

  const { data: reports } = await supabase
    .from("credit_reports")
    .select("*")
    .eq("profile_id", targetProfileId)
    .order("created_at", { ascending: false })
    .limit(20);

  return sendJson(res, 200, { reports: reports ?? [] });
}
