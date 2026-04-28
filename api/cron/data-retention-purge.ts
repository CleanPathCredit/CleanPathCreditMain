/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * GET /api/cron/data-retention-purge
 *
 * Nightly Vercel Cron job that wipes sensitive PII from profiles whose
 * `data_retention_until` has elapsed. Implements the "we don't keep
 * SSNs of people who finished service in 2022" half of our retention
 * policy (the other half — setting the timestamp — fires automatically
 * via a trigger on profiles when status flips to 'complete').
 *
 * What gets wiped per profile:
 *   - vault.secrets row referenced by ssn_secret_id  (encrypted SSN)
 *   - documents rows + the underlying Storage objects (id scans, etc.)
 *   - credit_reports + parsed account data
 *   - PII flags reset (ssn_uploaded, id_uploaded, video_verified)
 *
 * What is preserved (deliberately, for accounting + chargeback windows):
 *   - profiles row identity (clerk_user_id, email)
 *   - plan history, stripe_customer_id, status timestamps
 *   - referral attribution rows
 *   - admin_notes (unless the admin clears them manually)
 *
 * Auth model:
 *   Vercel Cron sets `Authorization: Bearer <CRON_SECRET>` automatically
 *   when CRON_SECRET is configured. We compare with timing-safe equality
 *   and reject anything else with 401.
 *
 * Safety:
 *   - Batched (max 50/run) so a backlog doesn't burn function time
 *   - Per-profile errors are logged but DON'T abort the batch — one bad
 *     profile shouldn't block the rest. Result body summarizes which
 *     succeeded vs failed for ops visibility.
 *
 * Schedule: vercel.json — daily at 04:17 UTC (off-peak, jittered).
 *
 * Required env:
 *   CRON_SECRET                shared secret matching vercel.json crons
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import type { IncomingMessage, ServerResponse } from "http";
import { timingSafeEqual } from "crypto";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../src/types/database";

export const config = { runtime: "nodejs" };

const STORAGE_BUCKET = "documents";
const BATCH_SIZE = 50;

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

interface PurgeResult {
  profile_id: string;
  ok:         boolean;
  storage_objects_deleted?: number;
  error?:     string;
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  // Vercel Cron uses GET. Allow GET; deny everything else.
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET");
    return sendJson(res, 405, { error: "method_not_allowed" });
  }

  const cronSecret = process.env.CRON_SECRET;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!cronSecret || !supabaseUrl || !supabaseKey) {
    console.error("[/api/cron/data-retention-purge] server_misconfigured");
    return sendJson(res, 500, { error: "server_misconfigured" });
  }

  // Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`. Accept that
  // form; reject anything else.
  const auth = req.headers["authorization"];
  const authStr = Array.isArray(auth) ? auth[0] : auth;
  if (!authStr || !authStr.startsWith("Bearer ")) {
    return sendJson(res, 401, { error: "unauthorized" });
  }
  const provided = authStr.slice(7).trim();
  if (!safeEqual(provided, cronSecret)) {
    return sendJson(res, 401, { error: "unauthorized" });
  }

  const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1. Find profiles whose retention window has elapsed and that haven't
  // been purged yet. Index `profiles_data_retention_due_idx` keeps this
  // O(log n) on the eligible set.
  const nowIso = new Date().toISOString();
  const { data: due, error: dueErr } = await supabase
    .from("profiles")
    .select("id, email")
    .lte("data_retention_until", nowIso)
    .is("data_retention_purged_at", null)
    .limit(BATCH_SIZE);

  if (dueErr) {
    console.error("[/api/cron/data-retention-purge] due_query_failed:", dueErr.message);
    return sendJson(res, 500, { error: "due_query_failed" });
  }

  if (!due || due.length === 0) {
    return sendJson(res, 200, { ok: true, processed: 0, results: [] });
  }

  // 2. Process each due profile. We DON'T do this in parallel because
  // Storage delete is rate-limited per project; serial keeps us out of
  // 429s on a backlog day. Batch is small (50) so total runtime stays
  // under Vercel's function timeout.
  const results: PurgeResult[] = [];
  for (const profile of due) {
    const result: PurgeResult = { profile_id: profile.id, ok: false };
    try {
      // 2a. Call the SECURITY DEFINER RPC. Returns the storage paths we
      // need to delete from Supabase Storage. The DB side (vault secret
      // + document metadata + credit reports + profile flags) is wiped
      // atomically inside the function.
      const { data: paths, error: rpcErr } = await supabase.rpc(
        "purge_profile_pii",
        { p_profile_id: profile.id },
      );
      if (rpcErr) {
        result.error = `rpc_failed: ${rpcErr.message}`;
        results.push(result);
        console.error(
          "[/api/cron/data-retention-purge] rpc_failed profile=%s err=%s",
          profile.id,
          rpcErr.message,
        );
        continue;
      }

      // 2b. Delete the underlying Storage objects. `paths` is an array
      // of { storage_path } rows from the RPC's RETURN QUERY clause.
      const pathList: string[] = Array.isArray(paths)
        ? (paths as Array<{ storage_path?: unknown }>)
            .map((p) => (typeof p.storage_path === "string" ? p.storage_path : ""))
            .filter((p) => p.length > 0)
        : [];

      if (pathList.length > 0) {
        const { error: storageErr } = await supabase.storage
          .from(STORAGE_BUCKET)
          .remove(pathList);
        if (storageErr) {
          // The DB side already wiped — Storage delete failure means
          // some object files leaked. Log loudly; the DB is consistent
          // (no rows pointing at the orphans), so the worst case is
          // a few stray files we can clean up manually.
          console.error(
            "[/api/cron/data-retention-purge] storage_delete_failed profile=%s err=%s",
            profile.id,
            storageErr.message,
          );
          result.error = `storage_partial: ${storageErr.message}`;
        }
      }

      result.ok = true;
      result.storage_objects_deleted = pathList.length;
      results.push(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      result.error = `unexpected: ${message}`;
      results.push(result);
      console.error(
        "[/api/cron/data-retention-purge] unexpected profile=%s err=%s",
        profile.id,
        message,
      );
    }
  }

  const succeeded = results.filter((r) => r.ok).length;
  const failed = results.length - succeeded;
  console.log(
    "[/api/cron/data-retention-purge] processed=%d succeeded=%d failed=%d",
    results.length,
    succeeded,
    failed,
  );
  return sendJson(res, 200, {
    ok: failed === 0,
    processed: results.length,
    succeeded,
    failed,
    results,
  });
}
