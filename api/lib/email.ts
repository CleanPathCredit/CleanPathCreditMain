/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * Server-side email helpers (Resend).
 *
 * DESIGN NOTE — why no PDF attachments
 *
 * The dispute letters carry the consumer's full identity block (name,
 * address, SSN line, DOB) plus per-account numbers. Emailing those
 * artifacts directly — even via Resend, even to the client themselves
 * — puts PII in the recipient's mail provider's storage indefinitely
 * (Gmail, Outlook, ProtonMail) and on every relay hop in between.
 * That's both a CROA-adjacent risk and a regulatory risk if the
 * recipient's account is ever breached.
 *
 * The pattern here is *notification only*: tell the client their
 * letters are ready and link them back to the authenticated dashboard
 * where the PDFs live behind Clerk auth + Supabase RLS + 15-minute
 * signed URLs. Same artifact, much smaller blast radius.
 *
 * Required env to actually send:
 *   RESEND_API_KEY
 * Optional env:
 *   RESEND_FROM            "Clean Path Credit <noreply@cleanpathcredit.com>"
 *   APP_URL                base URL used in dashboard links (default https://cleanpathcredit.com)
 *
 * If RESEND_API_KEY is unset the helpers no-op and log; useful for
 * preview deploys where no real email infra is wired up.
 */

import { Resend } from "resend";

const DEFAULT_FROM = "Clean Path Credit <noreply@cleanpathcredit.com>";
const DEFAULT_APP_URL = "https://cleanpathcredit.com";

interface LettersReadyInput {
  to: string;
  firstName?: string | null;
  letterType: string;        // "609" / "611" / "623"
  roundNumber: number;
  bureausIncluded: string[]; // e.g. ["equifax", "transunion"] — what bureaus got a packet
  needsNotary: boolean;      // 609 = true, 611 = false
}

/**
 * Notify a DIY client that their dispute letters are ready in the
 * dashboard. No PDF attached — link only. Safe to call without a
 * configured Resend key (will log + return false rather than throw,
 * so a misconfigured email path never blocks the rest of the
 * letter-generation pipeline).
 */
export async function sendLettersReadyEmail(
  input: LettersReadyInput,
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from   = process.env.RESEND_FROM ?? DEFAULT_FROM;
  const appUrl = process.env.APP_URL     ?? DEFAULT_APP_URL;

  if (!apiKey) {
    console.warn(
      "[email] RESEND_API_KEY not set — skipping letters-ready email to",
      input.to,
    );
    return false;
  }

  const resend  = new Resend(apiKey);
  const subject = `Your ${input.letterType} Round ${input.roundNumber} dispute letters are ready`;
  const greeting = input.firstName ? `Hi ${input.firstName},` : "Hi,";
  const dashboardUrl = `${appUrl}/dashboard`;
  const bureauList = input.bureausIncluded.length === 1
    ? input.bureausIncluded[0]
    : input.bureausIncluded.slice(0, -1).join(", ") + " and " +
      input.bureausIncluded[input.bureausIncluded.length - 1];

  const notaryStep = input.needsNotary
    ? `<li><strong>Get the letters notarized.</strong> All Section 609 letters require notarization. Book a session through your dashboard or use any local notary.</li>`
    : "";

  const html = /* html */ `
<!doctype html>
<html><body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #18181b;">
  <h1 style="font-size: 22px; margin: 0 0 16px;">Your dispute letters are ready</h1>
  <p>${greeting}</p>
  <p>Your ${input.letterType} Round ${input.roundNumber} packet has been generated for <strong>${escapeHtml(bureauList)}</strong>. Each bureau gets its own letter — download them from your dashboard.</p>

  <p style="margin: 24px 0;">
    <a href="${dashboardUrl}" style="display: inline-block; background: #059669; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Open my dashboard</a>
  </p>

  <h2 style="font-size: 16px; margin: 24px 0 8px;">What to do next</h2>
  <ol style="padding-left: 20px; line-height: 1.6;">
    <li><strong>Download each PDF</strong> from the "Dispute Letters" tab in your dashboard. Print on plain white paper.</li>
    ${notaryStep}
    <li><strong>Mail each letter certified, return-receipt requested</strong> to the credit bureau printed on the letter. Keep the green return-receipt cards — they prove the bureau received your dispute.</li>
    <li>Bureaus have <strong>30 days</strong> from receipt to investigate and respond.</li>
  </ol>

  <p style="font-size: 12px; color: #71717a; margin-top: 32px; padding-top: 16px; border-top: 1px solid #e4e4e7;">
    For your security, the letters themselves aren't attached to this email — sign in to your dashboard to download them. Questions? Reply to this email.
  </p>
</body></html>`.trim();

  const text = [
    `${greeting}`,
    "",
    `Your ${input.letterType} Round ${input.roundNumber} packet has been generated for ${bureauList}. Each bureau gets its own letter — download them from your dashboard:`,
    "",
    dashboardUrl,
    "",
    "What to do next:",
    "1. Download each PDF from the 'Dispute Letters' tab and print on plain white paper.",
    input.needsNotary ? "2. Get the letters notarized (required for all 609 letters)." : null,
    `${input.needsNotary ? "3" : "2"}. Mail each letter certified, return-receipt requested. Keep the green cards.`,
    `${input.needsNotary ? "4" : "3"}. Bureaus have 30 days from receipt to investigate and respond.`,
    "",
    "For your security, the letters themselves aren't attached to this email — sign in to your dashboard to download them.",
  ].filter(Boolean).join("\n");

  try {
    const result = await resend.emails.send({
      from,
      to:      input.to,
      subject,
      html,
      text,
    });
    if (result.error) {
      console.error("[email] resend rejected letters-ready", result.error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[email] resend threw on letters-ready", err);
    return false;
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
