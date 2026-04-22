/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * POST /api/credit-report/parse
 *
 * Given an already-uploaded credit report document (PDF in the
 * `documents` Supabase Storage bucket), send it to Claude Sonnet via
 * OpenRouter and extract structured data into public.credit_reports +
 * public.credit_report_accounts.
 *
 * Synchronous — the request blocks until the parse finishes (typically
 * 15–30s for a 20-page SmartCredit 3B PDF). Vercel function maxDuration
 * is set to 60s to accommodate outliers. Clients show a progress card
 * during the wait.
 *
 * Auth model:
 *   - Clerk session required
 *   - Caller must own the document_id (same profile_id on the documents
 *     row) OR be a profile with role='admin'
 *   - Service-role Supabase client writes the parsed rows, bypassing RLS
 *     (the only writer by design)
 *
 * Side-effect safety:
 *   - credit_reports row is created immediately with parse_status=
 *     'processing' so the client can poll if the HTTP connection drops
 *   - On success: rows written, status flips to 'success'
 *   - On failure: parse_error captured (sanitized), status='failed'
 *   - We DO NOT log raw extracted content anywhere (PII guard) — only
 *     status codes, token sizes, and error categories
 *
 * Required env:
 *   CLERK_SECRET_KEY
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   OPENROUTER_API_KEY
 * Optional env:
 *   OPENROUTER_CREDIT_PARSER_MODEL  (default: anthropic/claude-sonnet-4-6)
 */

import type { IncomingMessage, ServerResponse } from "http";
import { createClient } from "@supabase/supabase-js";
import { verifyToken } from "@clerk/backend";
import type {
  Database, CreditReport, CreditReportParseStatus,
} from "../../src/types/database";

// Bump beyond the 10s default — a 30-page PDF with Sonnet can push 30s+
// and we'd rather occasionally wait a full minute than truncate a parse.
export const config = { runtime: "nodejs", maxDuration: 60 };

const DEFAULT_PARSER_MODEL = "anthropic/claude-sonnet-4-6";
const MAX_BODY_BYTES       = 4 * 1024;   // request body is tiny — just a document_id
const MAX_OUTPUT_TOKENS    = 8000;       // large credit reports have long account lists

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
  return new Promise((resolve) => {
    let received = 0;
    const chunks: Buffer[] = [];
    let aborted = false;
    req.on("data", (chunk: Buffer) => {
      if (aborted) return;
      received += chunk.length;
      if (received > MAX_BODY_BYTES) { aborted = true; resolve(null); return; }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (aborted) return;
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve(raw ? (JSON.parse(raw) as T) : ({} as T));
      } catch { resolve(null); }
    });
    req.on("error", () => resolve(null));
  });
}

/**
 * Strip obvious PII from error messages before we log them. Cheap best-
 * effort scrub — we never log error bodies that contain full account
 * records. This just catches accidental snippets in API error strings.
 */
function sanitizeError(s: string): string {
  return s
    .replace(/\b\d{3}-?\d{2}-?\d{4}\b/g, "[ssn-redacted]")   // full SSN
    .replace(/\b\d{13,19}\b/g, "[card-redacted]")            // card numbers
    .slice(0, 500);
}

// ---------------------------------------------------------------------------
// LLM prompt + output schema
// ---------------------------------------------------------------------------
const SYSTEM_PROMPT = `You are a credit-report data extractor for a credit repair company. Given a 3-bureau credit report PDF (typically from SmartCredit, but any format is acceptable), extract structured data as JSON.

STRICT OUTPUT RULES:
- Output ONLY a single valid JSON object. No prose, no markdown fences, no explanation before or after.
- If a field isn't present in the report, use null. Do NOT hallucinate data.
- Monetary values as numbers (no "$" or ","). Dates as "YYYY-MM-DD" or null.
- Bureau reporting: subset of ["eq", "tu", "ex"] — only include bureaus that are actively reporting the account.

OUTPUT SCHEMA:
{
  "source": "smartcredit" | "annualcreditreport" | "idiq" | "other",
  "score_model": "VantageScore 3.0" | "FICO 8" | string | null,
  "report_date": "YYYY-MM-DD" | null,
  "scores": {
    "eq": number | null,  // Equifax score 300-850
    "tu": number | null,  // TransUnion score 300-850
    "ex": number | null   // Experian score 300-850
  },
  "accounts": [
    {
      "creditor": string,
      "account_number_last4": string | null,
      "account_type": "revolving" | "installment" | "mortgage" | "auto" | "student" | "collection" | "other",
      "bureau_reporting": ["eq"|"tu"|"ex"],
      "status": "open" | "closed" | "paid" | "collection" | "charge-off" | "bankruptcy" | "derogatory" | string,
      "balance": number | null,
      "credit_limit": number | null,
      "high_balance": number | null,
      "monthly_payment": number | null,
      "date_opened": string | null,
      "last_reported": string | null,
      "payment_status": "current" | "30" | "60" | "90" | "120+" | "collection" | string | null,
      "is_negative": boolean,
      "dispute_eligible": boolean,
      "dispute_reason": "inaccurate" | "outdated" | "unverifiable" | "duplicate" | "paid" | null
    }
  ],
  "aggregates": {
    "total_accounts": number,
    "open_accounts": number,
    "closed_accounts": number,
    "negative_items_count": number,
    "total_utilization_pct": number | null,
    "inquiries_24mo": number | null
  }
}

SCORING RULES for is_negative and dispute_eligible:
- is_negative = true if: charge-off, collection, bankruptcy, repossession, foreclosure, 30+ day late in last 24 months, or balance > 90% of limit on revolving
- dispute_eligible = true if the item is negative AND any of: (a) account info seems inconsistent across bureaus, (b) over 7 years old, (c) unverified fields (missing dates, placeholder creditor names), (d) paid collection still reporting, (e) duplicate of another account
- dispute_reason should match the strongest reason when dispute_eligible=true

Under FCRA, we can only challenge items that are inaccurate, outdated, or unverifiable. Do NOT flag legitimate recent accurate negatives as dispute_eligible.`;

const USER_PROMPT = `Extract structured credit report data from this PDF. Return ONLY the JSON object matching the schema. Begin your response with \`{\` and end with \`}\`. No markdown, no prose.`;

// ---------------------------------------------------------------------------
// Types for the LLM output — mirror the schema above
// ---------------------------------------------------------------------------
interface ParsedScores {
  eq: number | null;
  tu: number | null;
  ex: number | null;
}
interface ParsedAccount {
  creditor: string;
  account_number_last4: string | null;
  account_type: string | null;
  bureau_reporting: string[];
  status: string | null;
  balance: number | null;
  credit_limit: number | null;
  high_balance: number | null;
  monthly_payment: number | null;
  date_opened: string | null;
  last_reported: string | null;
  payment_status: string | null;
  is_negative: boolean;
  dispute_eligible: boolean;
  dispute_reason: string | null;
}
interface ParsedAggregates {
  total_accounts: number | null;
  open_accounts: number | null;
  closed_accounts: number | null;
  negative_items_count: number | null;
  total_utilization_pct: number | null;
  inquiries_24mo: number | null;
}
interface ParsedReport {
  source: string | null;
  score_model: string | null;
  report_date: string | null;
  scores: ParsedScores;
  accounts: ParsedAccount[];
  aggregates: ParsedAggregates;
}

function extractJson(raw: string): ParsedReport | null {
  // Strip ```json fences if the model insists on them despite the prompt
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced ? fenced[1] : raw).trim();
  try {
    return JSON.parse(candidate) as ParsedReport;
  } catch { /* fall through */ }
  // Last-ditch: find the first { and last } in the string
  const first = candidate.indexOf("{");
  const last  = candidate.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) return null;
  try {
    return JSON.parse(candidate.slice(first, last + 1)) as ParsedReport;
  } catch { return null; }
}

function clampScore(n: unknown): number | null {
  if (typeof n !== "number" || !Number.isFinite(n)) return null;
  if (n < 300 || n > 850) return null;
  return Math.round(n);
}
function toNum(n: unknown): number | null {
  if (typeof n !== "number" || !Number.isFinite(n)) return null;
  return n;
}
function toDate(s: unknown): string | null {
  if (typeof s !== "string") return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "method_not_allowed" });
  }

  // 1. Auth
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return sendJson(res, 401, { error: "unauthorized" });
  }
  const token = authHeader.slice(7).trim();
  if (!token) return sendJson(res, 401, { error: "unauthorized" });

  const clerkSecretKey     = process.env.CLERK_SECRET_KEY;
  const supabaseUrl        = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const openrouterKey      = process.env.OPENROUTER_API_KEY;
  if (!clerkSecretKey || !supabaseUrl || !supabaseServiceKey) {
    return sendJson(res, 500, { error: "server_misconfigured" });
  }
  if (!openrouterKey) {
    return sendJson(res, 500, { error: "openrouter_not_configured" });
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

  // 2. Parse body
  const body = await readJsonBody<{ document_id?: unknown }>(req);
  const documentId = typeof body?.document_id === "string" ? body.document_id.trim() : "";
  if (!documentId || !/^[0-9a-f-]{8,}$/i.test(documentId)) {
    return sendJson(res, 400, { error: "invalid_document_id" });
  }

  const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 3. Authorization — fetch the document + caller's role
  const [{ data: document }, { data: caller }] = await Promise.all([
    supabase.from("documents").select("*").eq("id", documentId).single(),
    supabase.from("profiles").select("role").eq("id", callerId).single(),
  ]);
  if (!document) {
    return sendJson(res, 404, { error: "document_not_found" });
  }
  const isAdmin  = caller?.role === "admin";
  const isOwner  = document.profile_id === callerId;
  if (!isAdmin && !isOwner) {
    return sendJson(res, 403, { error: "forbidden" });
  }

  // 4. Download the PDF from Storage — base64-encode for Claude
  const { data: blob, error: downloadErr } = await supabase
    .storage
    .from("documents")
    .download(document.storage_path);
  if (downloadErr || !blob) {
    console.error("[/api/credit-report/parse] storage_download_failed:",
      sanitizeError(downloadErr?.message ?? "unknown"));
    return sendJson(res, 502, { error: "document_download_failed" });
  }
  const pdfBuffer = Buffer.from(await blob.arrayBuffer());
  const pdfBase64 = pdfBuffer.toString("base64");

  // 5. Create the credit_reports row in 'processing' state so the client
  //    (or a subsequent GET poll) can see the work is in flight.
  const reportInsert = await supabase
    .from("credit_reports")
    .insert({
      profile_id:   document.profile_id,
      document_id:  documentId,
      source:       "smartcredit",   // overwritten after parse if the LLM says different
      parse_status: "processing" as CreditReportParseStatus,
      parse_model:  process.env.OPENROUTER_CREDIT_PARSER_MODEL || DEFAULT_PARSER_MODEL,
    })
    .select()
    .single();
  if (reportInsert.error || !reportInsert.data) {
    console.error("[/api/credit-report/parse] row_create_failed:",
      sanitizeError(reportInsert.error?.message ?? "unknown"));
    return sendJson(res, 500, { error: "row_create_failed" });
  }
  const reportId = reportInsert.data.id;

  // 6. Call OpenRouter → Claude Sonnet with the PDF as a document block.
  const model = process.env.OPENROUTER_CREDIT_PARSER_MODEL || DEFAULT_PARSER_MODEL;

  let llmContent = "";
  try {
    const llmResp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization:  `Bearer ${openrouterKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://cleanpathcredit.com",
        "X-Title":      "Clean Path Credit — Credit Report Parser",
      },
      body: JSON.stringify({
        model,
        max_tokens:  MAX_OUTPUT_TOKENS,
        temperature: 0,   // deterministic extraction, not creative writing
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              {
                type: "file",
                file: {
                  filename:  document.name || "credit-report.pdf",
                  file_data: `data:application/pdf;base64,${pdfBase64}`,
                },
              },
              { type: "text", text: USER_PROMPT },
            ],
          },
        ],
      }),
    });
    if (!llmResp.ok) {
      const text = await llmResp.text().catch(() => "");
      const msg  = `openrouter_http_${llmResp.status}: ${sanitizeError(text)}`;
      await markFailed(supabase, reportId, msg);
      return sendJson(res, 502, { error: "openrouter_failed", status: llmResp.status });
    }
    const llmJson = await llmResp.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    llmContent = llmJson.choices?.[0]?.message?.content ?? "";
    if (!llmContent) {
      await markFailed(supabase, reportId, "empty_completion");
      return sendJson(res, 502, { error: "empty_completion" });
    }
  } catch (err) {
    const msg = sanitizeError(err instanceof Error ? err.message : String(err));
    await markFailed(supabase, reportId, msg);
    return sendJson(res, 502, { error: "openrouter_error" });
  }

  // 7. Parse the LLM output
  const parsed = extractJson(llmContent);
  if (!parsed) {
    await markFailed(supabase, reportId, "llm_output_unparseable");
    return sendJson(res, 502, { error: "llm_output_unparseable" });
  }

  // 8. Write structured data — update the credit_reports row + batch
  //    insert credit_report_accounts rows. If anything fails here the
  //    row stays 'processing' and can be retried; acceptable for MVP.
  const eq = clampScore(parsed.scores?.eq);
  const tu = clampScore(parsed.scores?.tu);
  const ex = clampScore(parsed.scores?.ex);

  const updateErr = await supabase
    .from("credit_reports")
    .update({
      source:                parsed.source      || "smartcredit",
      score_model:           parsed.score_model || null,
      report_date:           toDate(parsed.report_date),
      eq_score:              eq,
      tu_score:              tu,
      ex_score:              ex,
      total_accounts:        toNum(parsed.aggregates?.total_accounts),
      open_accounts:         toNum(parsed.aggregates?.open_accounts),
      closed_accounts:       toNum(parsed.aggregates?.closed_accounts),
      negative_items_count:  toNum(parsed.aggregates?.negative_items_count),
      total_utilization_pct: toNum(parsed.aggregates?.total_utilization_pct),
      inquiries_24mo:        toNum(parsed.aggregates?.inquiries_24mo),
      raw_extracted:         parsed as unknown as Record<string, unknown>,
      parse_status:          "success" as CreditReportParseStatus,
      processed_at:          new Date().toISOString(),
    })
    .eq("id", reportId);
  if (updateErr.error) {
    console.error("[/api/credit-report/parse] row_update_failed:",
      sanitizeError(updateErr.error.message));
    await markFailed(supabase, reportId, "row_update_failed");
    return sendJson(res, 500, { error: "row_update_failed" });
  }

  if (Array.isArray(parsed.accounts) && parsed.accounts.length > 0) {
    const accountRows = parsed.accounts.slice(0, 500).map((a) => ({
      credit_report_id:     reportId,
      profile_id:           document.profile_id,
      creditor:             typeof a.creditor === "string" ? a.creditor.slice(0, 200) : null,
      account_number_last4: typeof a.account_number_last4 === "string" ? a.account_number_last4.slice(0, 8) : null,
      account_type:         typeof a.account_type === "string" ? a.account_type.slice(0, 40) : null,
      bureau_reporting:     Array.isArray(a.bureau_reporting)
                              ? a.bureau_reporting.filter((b): b is string => typeof b === "string" && ["eq","tu","ex"].includes(b))
                              : [],
      status:               typeof a.status === "string" ? a.status.slice(0, 40) : null,
      balance:              toNum(a.balance),
      credit_limit:         toNum(a.credit_limit),
      high_balance:         toNum(a.high_balance),
      monthly_payment:      toNum(a.monthly_payment),
      date_opened:          toDate(a.date_opened),
      last_reported:        toDate(a.last_reported),
      payment_status:       typeof a.payment_status === "string" ? a.payment_status.slice(0, 40) : null,
      is_negative:          Boolean(a.is_negative),
      dispute_eligible:     Boolean(a.dispute_eligible),
      dispute_reason:       typeof a.dispute_reason === "string" ? a.dispute_reason.slice(0, 40) : null,
      raw:                  a as unknown as Record<string, unknown>,
    }));
    const { error: accErr } = await supabase
      .from("credit_report_accounts")
      .insert(accountRows);
    if (accErr) {
      console.error("[/api/credit-report/parse] accounts_insert_failed:",
        sanitizeError(accErr.message));
      // Don't fail the whole request — the report row is already marked success
      // with the scores. Account insert failure is recoverable via re-parse.
    }
  }

  return sendJson(res, 200, {
    ok: true,
    report_id: reportId,
    status: "success",
    scores: { eq, tu, ex },
    aggregates: {
      total_accounts:       toNum(parsed.aggregates?.total_accounts),
      negative_items_count: toNum(parsed.aggregates?.negative_items_count),
    },
  });
}

async function markFailed(
  supabase: ReturnType<typeof createClient<Database>>,
  reportId: string,
  errorMessage: string,
): Promise<void> {
  try {
    await supabase
      .from("credit_reports")
      .update({
        parse_status: "failed" as CreditReportParseStatus,
        parse_error:  errorMessage,
        processed_at: new Date().toISOString(),
      })
      .eq("id", reportId);
  } catch {
    // Nothing we can do — logged already upstream.
  }
}

// Re-export for testing / narrow external use
export type { ParsedReport };
export type _Unused = CreditReport;  // keep import live if the type moves