/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * POST /api/admin/lead/[id]/draft-email
 *
 * Generates a personalized follow-up email draft for a specific lead
 * using OpenRouter. Admin-auth required (Clerk session + profiles.role=
 * admin). Returns the drafted subject + body as JSON so the UI can render
 * it in an editable textarea for the admin to tweak before copying.
 *
 * Model choice is env-driven via OPENROUTER_MODEL (default:
 * anthropic/claude-3.5-haiku — cheap + fast + coherent for short copy).
 * Max tokens capped at 700 so cost per draft stays in sub-penny territory
 * even if the admin spams the button.
 *
 * The draft is NOT sent automatically — we return it, admin copies it to
 * their mail client / GHL. Keeps a human in the loop for anything that
 * actually touches a lead's inbox.
 *
 * Required env:
 *   CLERK_SECRET_KEY
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   OPENROUTER_API_KEY
 * Optional:
 *   OPENROUTER_MODEL   (default: anthropic/claude-3.5-haiku)
 */

import type { IncomingMessage, ServerResponse } from "http";
import { createClient } from "@supabase/supabase-js";
import { verifyToken } from "@clerk/backend";
import type { Database, LeadSubmission } from "../../../../src/types/database";

export const config = { runtime: "nodejs" };

const DEFAULT_MODEL = "anthropic/claude-3.5-haiku";
const MAX_TOKENS    = 700;

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

/** Build a tight system + user prompt from the lead row. Deliberately short;
 *  the more structured context I feed the model the less room it leaves for
 *  hallucinated claims ("50-point guaranteed lift!" etc.). */
function buildPrompt(lead: LeadSubmission): { system: string; user: string } {
  const name   = lead.full_name?.split(/\s+/)[0] ?? null;
  const goalText = (() => {
    switch (lead.goal) {
      case "home":     return "buying a home";
      case "car":      return "financing a vehicle";
      case "business": return "securing business funding";
      case "clean":    return "cleaning up their credit profile";
      default:         return lead.goal ?? "their financial goal";
    }
  })();

  const obstaclesText = lead.obstacles && lead.obstacles.length > 0
    ? lead.obstacles.join(", ")
    : "items they haven't pinpointed yet";

  const urgencyText = lead.urgency_tier
    ? `${lead.urgency_tier} priority (urgency score: ${lead.urgency_score ?? "—"}/100)`
    : "unknown priority";

  const system = [
    "You are a credit-repair sales rep at Clean Path Credit writing a warm, personalized follow-up email to a prospect who submitted our free credit quiz.",
    "",
    "Tone: professional, empathetic, concrete. Not salesy. Not hypey. Never promise specific point gains or guaranteed outcomes (FCRA/CROA). Never mention 'AI'.",
    "",
    "Length: 100–160 words. Short paragraphs. One clear call-to-action at the end (book a free 15-minute audit call — include the link [BOOKING_LINK] which the rep will replace).",
    "",
    "Structure:",
    "  1) Acknowledge their goal directly in the first line.",
    "  2) Briefly reflect their biggest obstacle + signal you've helped others with it.",
    "  3) Invite to the call. No pressure.",
    "",
    "Return a JSON object with two keys: 'subject' (under 60 chars, curiosity-forward) and 'body' (plain text, no markdown, no placeholder like [Name] — use the actual name if known or no salutation if not).",
  ].join("\n");

  const user = [
    `Lead info:`,
    `- First name: ${name ?? "(not provided — skip the salutation)"}`,
    `- Goal: ${goalText}`,
    `- Obstacles: ${obstaclesText}`,
    `- Credit score range: ${lead.credit_score_range ?? "—"}`,
    `- Timeline: ${lead.timeline ?? "—"}`,
    `- Urgency: ${urgencyText}`,
    `- Recommended package: ${lead.recommended_offer ?? "—"}`,
    ``,
    `Write the email now. Return ONLY the JSON object, no surrounding prose.`,
  ].join("\n");

  return { system, user };
}

/** Extract {subject, body} from the model's response. Accepts either a
 *  fenced code block, a raw JSON object, or (fallback) treats the whole
 *  text as the body with a generic subject. */
function parseModelOutput(text: string): { subject: string; body: string } {
  // Strip ```json fences if present
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced ? fenced[1] : text).trim();
  try {
    const parsed = JSON.parse(candidate);
    if (parsed && typeof parsed === "object") {
      const subject = typeof parsed.subject === "string" ? parsed.subject.slice(0, 120) : "";
      const body    = typeof parsed.body    === "string" ? parsed.body : "";
      if (subject && body) return { subject, body };
    }
  } catch { /* fall through */ }
  // Fallback: no JSON in response. Use the first line as subject + rest
  // as body so the admin always gets something usable.
  const lines = candidate.split("\n").filter((l) => l.trim().length > 0);
  const subject = lines[0]?.slice(0, 120) || "Quick follow-up";
  const body    = lines.slice(1).join("\n") || candidate;
  return { subject, body };
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "method_not_allowed" });
  }

  const url = new URL(req.url ?? "/", "http://internal");
  const id = url.searchParams.get("id") ?? url.pathname.split("/").filter(Boolean).slice(-2)[0];
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
  const openrouterKey      = process.env.OPENROUTER_API_KEY;
  if (!clerkSecretKey || !supabaseUrl || !supabaseServiceKey) {
    return sendJson(res, 500, { error: "server_misconfigured" });
  }
  if (!openrouterKey) {
    return sendJson(res, 500, { error: "openrouter_not_configured" });
  }

  // Auth: Clerk session → profiles.role='admin'
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
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", callerId)
    .single();
  if (me?.role !== "admin") {
    return sendJson(res, 403, { error: "forbidden" });
  }

  // Fetch the lead
  const { data: lead, error: leadErr } = await supabase
    .from("lead_submissions")
    .select("*")
    .eq("id", id)
    .single();
  if (leadErr || !lead) {
    return sendJson(res, 404, { error: "lead_not_found" });
  }

  // Call OpenRouter
  const model  = process.env.OPENROUTER_MODEL || DEFAULT_MODEL;
  const prompt = buildPrompt(lead as LeadSubmission);

  try {
    const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization:  `Bearer ${openrouterKey}`,
        "Content-Type": "application/json",
        // OpenRouter attribution headers — helps with leaderboard presence
        // and ensures proper rate-limit bucketing.
        "HTTP-Referer": "https://cleanpathcredit.com",
        "X-Title":      "Clean Path Credit Admin",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: prompt.system },
          { role: "user",   content: prompt.user   },
        ],
        max_tokens:  MAX_TOKENS,
        temperature: 0.7,
      }),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      console.error("[/api/admin/lead/:id/draft-email] openrouter_failed status=%d body=%s",
        resp.status, text.slice(0, 300));
      return sendJson(res, 502, { error: "openrouter_failed", status: resp.status });
    }

    const data = await resp.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      console.error("[/api/admin/lead/:id/draft-email] empty_completion");
      return sendJson(res, 502, { error: "empty_completion" });
    }

    const { subject, body } = parseModelOutput(content);
    return sendJson(res, 200, {
      ok: true,
      subject,
      body,
      model,
    });
  } catch (err) {
    console.error("[/api/admin/lead/:id/draft-email] openrouter_error:", err);
    return sendJson(res, 502, { error: "openrouter_error" });
  }
}
