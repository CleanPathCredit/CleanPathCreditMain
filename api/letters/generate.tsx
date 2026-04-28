/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * POST /api/letters/generate
 *
 * Renders the appropriate dispute letter template for every bureau
 * report in a given letter round, uploads the PDFs to Supabase Storage,
 * creates `documents` + `letter_packets` rows, and returns signed URLs
 * the admin UI can use for download/preview.
 *
 * Auth: Clerk-issued bearer JWT (verified with @clerk/backend), plus a
 * server-side admin-role check via the service-role Supabase client.
 *
 * Request body:
 *   {
 *     letter_round_id: string,         // uuid of the letter_rounds row
 *     consumer?: {
 *       fullName?:    string,
 *       addressLines?: string[],
 *       ssnLast4?:    string,
 *       dateOfBirth?: string,          // free-form, e.g. "1/1/1970"
 *     }
 *   }
 *
 * Response 200:
 *   {
 *     letter_round_id: string,
 *     packets: Array<{
 *       bureau:        "equifax"|"transunion"|"experian",
 *       document_id:   string,
 *       letter_packet_id: string,
 *       signed_url:    string,        // 15-min signed Storage URL
 *       version:       number,
 *     }>
 *   }
 *
 * Behavior:
 *   - Items are filtered with `isDisputable` (charge_off, collection,
 *     not_in_good_standing). Bureaus with zero disputable items are
 *     skipped — no empty packet generated for them.
 *   - Re-running on the same round bumps `letter_packets.version` and
 *     marks the prior version `is_current=false` so the audit trail
 *     survives.
 *   - On success the round's status is advanced to `letters_generated`
 *     and `letters_generated_at` is set.
 *   - 623 letters are not yet supported; the handler returns 501 if
 *     the round's letter_type is "623".
 */

import type { IncomingMessage, ServerResponse } from "http";
import { createClient } from "@supabase/supabase-js";
import { verifyToken } from "@clerk/backend";
import { pdf } from "@react-pdf/renderer";
import type { Database, Bureau, LetterType } from "../../src/types/database";
import { Letter609Round1 } from "../../src/components/letters/Letter609Round1";
import { Letter609Round2 } from "../../src/components/letters/Letter609Round2";
import { Letter609Round3 } from "../../src/components/letters/Letter609Round3";
import { Letter609Round4 } from "../../src/components/letters/Letter609Round4";
import { Letter611 } from "../../src/components/letters/Letter611";
import { BUREAU_ADDRESSES } from "../../src/lib/letters/bureaus";
import { isDisputable } from "../../src/lib/letters/filtering";
import { isInCroaHold, croaHoldUntil } from "../../src/lib/letters/croaHold";
import { sendLettersReadyEmail } from "../lib/email";
import type {
  ConsumerIdentity,
  LetterRenderInput,
} from "../../src/lib/letters/types";
import type { Letter611Input } from "../../src/components/letters/Letter611";

// Mirrors api/me.ts
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

async function streamToBuffer(
  stream: NodeJS.ReadableStream,
): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks);
}

interface RenderRequest {
  letter_round_id: string;
  consumer?: Partial<ConsumerIdentity>;
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
  const clerkSecretKey = process.env.CLERK_SECRET_KEY;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!clerkSecretKey || !supabaseUrl || !supabaseServiceKey) {
    console.error("[/api/letters/generate] server_misconfigured", {
      CLERK_SECRET_KEY: !!clerkSecretKey,
      SUPABASE_URL: !!supabaseUrl,
      SUPABASE_SERVICE_ROLE_KEY: !!supabaseServiceKey,
    });
    return sendJson(res, 500, { error: "server_misconfigured" });
  }

  // 3. Verify Clerk JWT
  let userId: string;
  try {
    const payload = await verifyToken(token, {
      secretKey: clerkSecretKey,
      authorizedParties: getAuthorizedParties(),
    });
    if (typeof payload.sub !== "string" || !payload.sub) {
      return sendJson(res, 401, null);
    }
    userId = payload.sub;
  } catch {
    return sendJson(res, 401, null);
  }

  // 4. Parse + validate body
  const body = await readJsonBody<RenderRequest>(req);
  if (!body || typeof body.letter_round_id !== "string") {
    return sendJson(res, 400, { error: "letter_round_id required" });
  }

  const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 5. Admin gate
  const { data: caller } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
  if (caller?.role !== "admin") {
    return sendJson(res, 403, { error: "forbidden" });
  }

  // 6. Load the round
  const { data: round, error: roundErr } = await supabase
    .from("letter_rounds")
    .select("*")
    .eq("id", body.letter_round_id)
    .single();
  if (roundErr || !round) {
    return sendJson(res, 404, { error: "letter_round_not_found" });
  }

  if (round.letter_type === "623") {
    return sendJson(res, 501, { error: "623_template_not_implemented" });
  }

  // 7. Load case profile (for consumer identity defaults + CROA contract date)
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email, plan, address, created_at")
    .eq("id", round.profile_id)
    .single();
  if (!profile) {
    return sendJson(res, 500, { error: "profile_missing" });
  }

  // 7a. CROA §407 — Round 1 cannot be generated inside the
  // 3-business-day cancellation window. Subsequent rounds are exempt.
  const contractDate = new Date(profile.created_at);
  if (isInCroaHold(contractDate, round.round_number)) {
    const until = croaHoldUntil(contractDate, round.round_number);
    return sendJson(res, 423, {
      error: "croa_hold_active",
      hold_until: until?.toISOString(),
      hint: "Letters cannot be generated during the 3-business-day CROA cancellation window.",
    });
  }

  // 7b. Payment status — informational only, NOT a hard gate.
  //
  // CROA §404(b) and TSR §310.4(a)(2) prohibit advance fees for
  // credit-repair services. The CROA-safe operating model is to
  // perform each round and bill the customer AFTER the work is done
  // (generate → notarize → mail → send payment link). Hard-blocking
  // generation on `payment_cleared_at` would force the *opposite*
  // (charge first, perform later), which is what we're trying to
  // avoid. So payment status flows through to the response and the
  // admin UI surfaces a "send payment link" reminder, but generation
  // itself is never blocked on payment.
  //
  // `payment_cleared_at` is still flipped by:
  //   - the Stripe webhook when a checkout session completes with
  //     `metadata.letter_round_id = round.id`, or
  //   - the admin clicking "Mark as paid" in /admin/letters (manual
  //     offline-payment recording — same column, same effect).
  const billedAfterCompletion = !round.payment_cleared_at;

  // Consumer identity — body overrides win, then profile, then placeholder.
  const consumer: ConsumerIdentity = {
    fullName: body.consumer?.fullName ?? profile.full_name ?? "",
    addressLines:
      body.consumer?.addressLines ??
      (profile.address ? profile.address.split("\n") : []),
    ssnLast4: body.consumer?.ssnLast4 ?? "0000",
    dateOfBirth: body.consumer?.dateOfBirth ?? "",
  };

  // 8. Load every bureau_report on this round + their items
  const { data: bureauReports } = await supabase
    .from("bureau_reports")
    .select("id, bureau")
    .eq("letter_round_id", round.id);
  if (!bureauReports || bureauReports.length === 0) {
    return sendJson(res, 400, {
      error: "no_bureau_reports",
      hint: "Add at least one bureau report with negative items before generating.",
    });
  }

  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const packetsOut: Array<{
    bureau: Bureau;
    document_id: string;
    letter_packet_id: string;
    signed_url: string;
    version: number;
  }> = [];

  for (const br of bureauReports) {
    const bureauKey = br.bureau as Bureau;

    // Load + filter items
    const { data: rawItems } = await supabase
      .from("negative_items")
      .select("*")
      .eq("bureau_report_id", br.id)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true });

    const items = (rawItems ?? []).filter((i) => isDisputable(i));
    if (items.length === 0) continue; // skip bureaus with no disputable items

    // Build the right input shape for the chosen template
    const docElement = buildLetterElement(
      round.letter_type as LetterType,
      round.round_number,
      {
        consumer,
        bureau: bureauKey,
        bureauAddress: BUREAU_ADDRESSES[bureauKey],
        round: {
          letterType: round.letter_type as LetterType,
          roundNumber: round.round_number,
        },
        letterDate: today,
        rows: items.map((it) => ({
          accountName: it.account_name,
          accountNumber: it.account_number,
          verificationLabel: "Unverified Account",
        })),
      },
      {
        consumer,
        bureauAddress: BUREAU_ADDRESSES[bureauKey],
        letterDate: today,
        rows: items.map((it) => ({
          accountName: it.account_name,
          accountNumber: it.account_number,
          disputeReason: it.dispute_reason ?? "Inaccurate information",
          believedCorrect: it.believed_correct ?? "",
        })),
      },
    );
    if (!docElement) {
      return sendJson(res, 501, {
        error: "template_not_implemented",
        letter_type: round.letter_type,
        round_number: round.round_number,
      });
    }

    // Render PDF to Buffer
    const stream = await pdf(docElement).toBuffer();
    const buf = await streamToBuffer(stream);

    // Compute next version + storage path
    const { data: existing } = await supabase
      .from("letter_packets")
      .select("version")
      .eq("letter_round_id", round.id)
      .eq("target_type", "bureau")
      .eq("bureau", bureauKey)
      .order("version", { ascending: false })
      .limit(1);
    const nextVersion = (existing?.[0]?.version ?? 0) + 1;

    const storagePath = `documents/${round.profile_id}/dispute_letter_${round.letter_type}_r${round.round_number}_${bureauKey}_v${nextVersion}.pdf`;

    // Upload to Storage
    const { error: uploadErr } = await supabase.storage
      .from("documents")
      .upload(storagePath, buf, {
        contentType: "application/pdf",
        upsert: true,
      });
    if (uploadErr) {
      console.error("[/api/letters/generate] upload failed", uploadErr);
      return sendJson(res, 500, { error: "storage_upload_failed" });
    }

    // documents row
    const { data: docRow, error: docErr } = await supabase
      .from("documents")
      .insert({
        profile_id: round.profile_id,
        name: `${round.letter_type} R${round.round_number} ${bureauKey} (v${nextVersion}).pdf`,
        storage_path: storagePath,
        mime_type: "application/pdf",
        size_bytes: buf.byteLength,
        category: "dispute_letter",
      })
      .select("id")
      .single();
    if (docErr || !docRow) {
      console.error("[/api/letters/generate] documents insert failed", docErr);
      return sendJson(res, 500, { error: "documents_insert_failed" });
    }

    // Mark prior is_current=false
    await supabase
      .from("letter_packets")
      .update({ is_current: false })
      .eq("letter_round_id", round.id)
      .eq("target_type", "bureau")
      .eq("bureau", bureauKey)
      .eq("is_current", true);

    // Insert new letter_packets row
    const { data: packetRow, error: packetErr } = await supabase
      .from("letter_packets")
      .insert({
        letter_round_id: round.id,
        target_type: "bureau",
        bureau: bureauKey,
        document_id: docRow.id,
        version: nextVersion,
        is_current: true,
      })
      .select("id")
      .single();
    if (packetErr || !packetRow) {
      console.error("[/api/letters/generate] letter_packets insert failed", packetErr);
      return sendJson(res, 500, { error: "letter_packets_insert_failed" });
    }

    // Signed URL for immediate download
    const { data: signed } = await supabase.storage
      .from("documents")
      .createSignedUrl(storagePath, 900);

    packetsOut.push({
      bureau: bureauKey,
      document_id: docRow.id,
      letter_packet_id: packetRow.id,
      signed_url: signed?.signedUrl ?? "",
      version: nextVersion,
    });
  }

  // Advance round status if anything was actually rendered
  if (packetsOut.length > 0) {
    await supabase
      .from("letter_rounds")
      .update({
        status: "letters_generated",
        letters_generated_at: new Date().toISOString(),
      })
      .eq("id", round.id);

    // DIY notification — email the client that their letters are ready
    // (no PDFs attached; link back to the dashboard). Fire-and-forget:
    // a Resend failure must not turn a successful generation into a 500.
    // Standard / premium clients are admin-driven — admin handles their
    // mailing, no auto-email needed.
    if (profile.plan === "diy" && profile.email) {
      const firstName = profile.full_name?.split(" ")[0] ?? null;
      sendLettersReadyEmail({
        to:               profile.email,
        firstName,
        letterType:       round.letter_type,
        roundNumber:      round.round_number,
        bureausIncluded:  packetsOut.map((p) => p.bureau),
        // 609s require notarization; 611 + 623 don't.
        needsNotary:      round.letter_type === "609",
      }).catch((err) =>
        console.error("[/api/letters/generate] letters-ready email failed", err),
      );
    }
  }

  return sendJson(res, 200, {
    letter_round_id: round.id,
    packets: packetsOut,
    // Tells the caller (admin UI) whether this round was generated
    // without prior payment. When true the UI should remind the
    // admin to copy the payment link and send it to the customer
    // before mailing the letters out.
    billed_after_completion: billedAfterCompletion,
  });
}

/**
 * Pick the right React-PDF document element for (letter_type, round_number).
 * Returns null when no template is registered for the combination.
 *
 * 609 templates use `LetterRenderInput`; 611 uses `Letter611Input`.
 */
function buildLetterElement(
  letterType: LetterType,
  roundNumber: number,
  input609: LetterRenderInput,
  input611: Letter611Input,
) {
  if (letterType === "609") {
    if (roundNumber === 1) return <Letter609Round1 input={input609} />;
    if (roundNumber === 2) return <Letter609Round2 input={input609} />;
    if (roundNumber === 3) return <Letter609Round3 input={input609} />;
    if (roundNumber === 4) return <Letter609Round4 input={input609} />;
  }
  if (letterType === "611") return <Letter611 input={input611} />;
  return null;
}
