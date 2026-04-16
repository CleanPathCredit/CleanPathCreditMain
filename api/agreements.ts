/**
 * POST /api/agreements
 *
 * Stores a signed service agreement:
 *   1. Uploads the signed PDF to Supabase Storage (documents bucket)
 *   2. Uploads the signature image to Supabase Storage
 *   3. Inserts metadata into signed_agreements table
 *   4. Sends a copy of the signed agreement to the client via Resend
 *
 * Called from the /agreement page after the client signs.
 * Uses service role — client has no auth at this point (pre-sign-up).
 */

import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

export const config = { runtime: "nodejs" };

interface AgreementPayload {
  email: string;
  name: string;
  plan: string;
  sessionId: string;
  signatureDataUrl: string;
  pdfBase64: string;
  agreementVersion: string;
  userAgent: string;
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let payload: AgreementPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const { email, name, plan, sessionId, signatureDataUrl, pdfBase64, agreementVersion, userAgent } = payload;

  if (!email || !name || !signatureDataUrl || !pdfBase64) {
    return new Response("Missing required fields", { status: 400 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? req.headers.get("x-real-ip")
    ?? "unknown";

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const filePrefix = `agreements/${sessionId || Date.now()}`;
  const pdfPath = `${filePrefix}/agreement.pdf`;
  const sigPath = `${filePrefix}/signature.png`;

  // Upload PDF
  const pdfBuffer = Buffer.from(pdfBase64, "base64");
  const { error: pdfErr } = await supabase.storage
    .from("documents")
    .upload(pdfPath, pdfBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (pdfErr) {
    console.error("Failed to upload PDF:", pdfErr);
  }

  // Upload signature image
  const sigBase64 = signatureDataUrl.replace(/^data:image\/png;base64,/, "");
  const sigBuffer = Buffer.from(sigBase64, "base64");
  const { error: sigErr } = await supabase.storage
    .from("documents")
    .upload(sigPath, sigBuffer, {
      contentType: "image/png",
      upsert: true,
    });

  if (sigErr) {
    console.error("Failed to upload signature:", sigErr);
  }

  // Insert metadata record
  const { error: dbErr } = await supabase.from("signed_agreements").insert({
    email,
    client_name: name,
    plan,
    stripe_session_id: sessionId || null,
    agreement_version: agreementVersion,
    signature_storage_path: sigPath,
    pdf_storage_path: pdfPath,
    ip_address: ip,
    user_agent: userAgent || null,
  });

  if (dbErr) {
    console.error("Failed to insert agreement record:", dbErr);
    return new Response(JSON.stringify({ ok: false, error: dbErr.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Send copy to client via Resend
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    try {
      const resend = new Resend(resendKey);
      const from = process.env.RESEND_FROM_EMAIL ?? "Clean Path Credit <noreply@cleanpathcredit.com>";
      await resend.emails.send({
        from,
        to: email,
        subject: "Your Signed Service Agreement — Clean Path Credit",
        html: `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;">
  <p style="font-size:15px;color:#18181b;">Hi ${name.split(" ")[0] || "there"},</p>
  <p style="font-size:14px;color:#52525b;line-height:1.6;">
    Attached is a copy of your signed Customer Service Agreement with Clean Path Credit for your records.
  </p>
  <p style="font-size:14px;color:#52525b;line-height:1.6;">
    If you have any questions, reply to this email or contact
    <a href="mailto:support@cleanpathcredit.com" style="color:#059669;">support@cleanpathcredit.com</a>.
  </p>
  <p style="font-size:12px;color:#a1a1aa;margin-top:24px;">
    &copy; ${new Date().getFullYear()} Clean Path Credit. All rights reserved.
  </p>
</div>`.trim(),
        attachments: [{
          filename: `CleanPathCredit_Agreement_${plan}.pdf`,
          content: Buffer.from(pdfBase64, "base64"),
        }],
      });
    } catch (err) {
      console.error("Failed to send agreement email:", err);
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
