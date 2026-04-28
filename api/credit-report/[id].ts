/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * GET /api/credit-report/[id]
 *
 * Returns the full credit_reports row + its credit_report_accounts. Used
 * by the client dashboard (and the admin view) to render the structured
 * credit profile.
 *
 * Auth: Clerk session. Owner reads their own; admin reads any. Uses the
 * service-role client so we can do the join server-side without making
 * the client navigate RLS policies on two tables.
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

  const url = new URL(req.url ?? "/", "http://internal");
  const id = url.searchParams.get("id") ?? url.pathname.split("/").pop();
  if (!id || !/^[0-9a-f-]{8,}$/i.test(id)) {
    return sendJson(res, 400, { error: "invalid_id" });
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

  // Fetch the report + caller's role in parallel — we need role to gate
  // access when the caller isn't the owner.
  const [{ data: report }, { data: me }] = await Promise.all([
    supabase.from("credit_reports").select("*").eq("id", id).single(),
    supabase.from("profiles").select("role").eq("id", callerId).single(),
  ]);
  if (!report) return sendJson(res, 404, { error: "not_found" });

  const isAdmin = me?.role === "admin";
  const isOwner = report.profile_id === callerId;
  if (!isAdmin && !isOwner) {
    return sendJson(res, 403, { error: "forbidden" });
  }

  const { data: accounts } = await supabase
    .from("credit_report_accounts")
    .select("*")
    .eq("credit_report_id", id)
    .order("is_negative", { ascending: false })   // negatives first — most important
    .order("balance", { ascending: false, nullsFirst: false });

  return sendJson(res, 200, { report, accounts: accounts ?? [] });
}
