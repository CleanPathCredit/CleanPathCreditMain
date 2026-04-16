import React, { useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import SignatureCanvas from "react-signature-canvas";
import { FileText, Loader2, CheckCircle2, Eraser } from "lucide-react";
import type { Plan } from "@/types/database";
import {
  getSections,
  AGREEMENT_VERSION,
  PLAN_LABELS,
  PLAN_PRICES,
  type Block,
} from "@/lib/agreementSections";
import { generateAgreementPDF } from "@/lib/generateAgreementPDF";

function BlockRenderer({ block }: { block: Block }) {
  switch (block.type) {
    case "p":
      return <p className="text-sm text-zinc-700 leading-relaxed mb-2">{block.text}</p>;
    case "bold":
      return <p className="text-sm font-bold text-zinc-900 leading-relaxed mb-2">{block.text}</p>;
    case "bullets":
      return (
        <ul className="list-disc list-inside space-y-1 mb-3 ml-2">
          {block.items.map((item, i) => (
            <li key={i} className="text-sm text-zinc-700 leading-relaxed">{item}</li>
          ))}
        </ul>
      );
    case "numbered":
      return (
        <ol className="list-decimal list-inside space-y-1 mb-3 ml-2">
          {block.items.map((item, i) => (
            <li key={i} className="text-sm text-zinc-700 leading-relaxed">{item}</li>
          ))}
        </ol>
      );
  }
}

export function ServiceAgreement() {
  const [searchParams] = useSearchParams();
  const sigRef = useRef<SignatureCanvas>(null);

  const [clientName, setClientName] = useState(searchParams.get("name") ?? "");
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);
  const [error, setError] = useState("");

  const plan = (searchParams.get("plan") ?? "standard") as Plan;
  const email = searchParams.get("email") ?? "";
  const sessionId = searchParams.get("session_id") ?? "";
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  const sections = getSections(plan);
  const price = PLAN_PRICES[plan] ?? "$0";
  const label = PLAN_LABELS[plan] ?? plan;

  async function handleSign() {
    if (!clientName.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (!sigRef.current || sigRef.current.isEmpty()) {
      setError("Please draw your signature.");
      return;
    }

    setError("");
    setSigning(true);

    try {
      const signatureDataUrl = sigRef.current.toDataURL("image/png");

      // Generate PDF
      const pdfBase64 = generateAgreementPDF({
        clientName: clientName.trim(),
        clientEmail: email,
        plan,
        price,
        date: today,
        signatureDataUrl,
      });

      // Send to server
      const res = await fetch("/api/agreements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name: clientName.trim(),
          plan,
          sessionId,
          signatureDataUrl,
          pdfBase64,
          agreementVersion: AGREEMENT_VERSION,
          userAgent: navigator.userAgent,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to store agreement");
      }

      setSigned(true);

      // Redirect to Clerk sign-up after brief success state
      setTimeout(() => {
        const redirectUrl = encodeURIComponent("https://cleanpathcredit.com/dashboard");
        window.location.href = `https://accounts.cleanpathcredit.com/sign-up?redirect_url=${redirectUrl}`;
      }, 2000);
    } catch (err) {
      console.error("Agreement signing failed:", err);
      setError("Something went wrong. Please try again.");
      setSigning(false);
    }
  }

  if (signed) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-zinc-50 to-white px-4">
        <div className="text-center">
          <CheckCircle2 className="mx-auto mb-4 h-16 w-16 text-emerald-500" />
          <h1 className="text-2xl font-bold text-zinc-900">Agreement Signed!</h1>
          <p className="mt-2 text-zinc-500">
            A copy has been sent to {email}. Redirecting to account setup...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white px-4 py-12">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900">
            <FileText className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-zinc-900">Service Agreement</h1>
            <p className="text-xs text-zinc-500">{label} &mdash; Please review and sign below</p>
          </div>
        </div>

        {/* Agreement document */}
        <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
          {/* Document header */}
          <div className="border-b border-zinc-100 px-6 py-5">
            <h2 className="text-xl font-bold text-zinc-900">CLEAN PATH CREDIT</h2>
            <h3 className="mt-1 text-sm font-semibold text-zinc-700">
              CUSTOMER SERVICE AGREEMENT & NON-DISCLOSURE AGREEMENT (NDA)
            </h3>
          </div>

          {/* Preamble */}
          <div className="border-b border-zinc-100 px-6 py-4">
            <p className="text-sm text-zinc-700 leading-relaxed">
              This Customer Service Agreement and Non-Disclosure Agreement
              (&quot;Agreement&quot;) is entered into as of{" "}
              <span className="font-semibold">{today}</span>{" "}
              (&quot;Effective Date&quot;), by and between:
            </p>
            <div className="mt-3 space-y-1 text-sm text-zinc-700">
              <p><strong>Company:</strong> Clean Path Credit (&quot;Company&quot;)</p>
              <p>Website: cleanpathcredit.com</p>
            </div>
            <div className="mt-3 text-sm text-zinc-700">
              <p><strong>Client:</strong>{" "}
                <span className="border-b border-zinc-300">
                  {clientName || "_______________"}
                </span>
                {email && <> ({email})</>}
                {" "}&mdash; (&quot;Client&quot;)
              </p>
            </div>
            <p className="mt-3 text-sm text-zinc-600 italic">
              Collectively referred to as the &quot;Parties.&quot;
            </p>
          </div>

          {/* Sections */}
          <div className="divide-y divide-zinc-100">
            {sections.map((section) => (
              <div key={section.title} className="px-6 py-4">
                <h4 className="mb-3 text-base font-bold text-zinc-900">{section.title}</h4>
                {section.blocks.map((block, i) => (
                  <BlockRenderer key={i} block={block} />
                ))}
              </div>
            ))}
          </div>

          {/* Signature Section */}
          <div className="border-t-2 border-zinc-200 px-6 py-6">
            <h4 className="mb-4 text-base font-bold text-zinc-900">13. SIGNATURES</h4>
            <p className="mb-6 text-sm text-zinc-700">
              By signing below, both Parties agree to all terms outlined above.
            </p>

            {/* Name input */}
            <div className="mb-4">
              <label className="mb-1 block text-xs font-medium text-zinc-500">
                Full Legal Name
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Signature canvas */}
            <div className="mb-2">
              <label className="mb-1 block text-xs font-medium text-zinc-500">
                Signature
              </label>
              <div className="rounded-lg border-2 border-dashed border-zinc-300 bg-zinc-50">
                <SignatureCanvas
                  ref={sigRef}
                  canvasProps={{
                    className: "w-full rounded-lg",
                    style: { width: "100%", height: "150px" },
                  }}
                  penColor="#18181b"
                  backgroundColor="rgba(0,0,0,0)"
                />
              </div>
              <div className="mt-1 flex items-center justify-between">
                <p className="text-xs text-zinc-400">Draw your signature above</p>
                <button
                  type="button"
                  onClick={() => sigRef.current?.clear()}
                  className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-700"
                >
                  <Eraser className="h-3 w-3" /> Clear
                </button>
              </div>
            </div>

            {/* Date */}
            <div className="mb-6">
              <label className="mb-1 block text-xs font-medium text-zinc-500">Date</label>
              <p className="text-sm text-zinc-700">{today}</p>
            </div>

            {/* Error */}
            {error && (
              <p className="mb-4 text-sm text-red-600">{error}</p>
            )}

            {/* Sign button */}
            <button
              onClick={handleSign}
              disabled={signing}
              className="h-12 w-full rounded-full bg-zinc-900 font-semibold text-white transition-all hover:bg-zinc-800 disabled:bg-zinc-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {signing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing...
                </>
              ) : (
                "Sign Agreement & Continue →"
              )}
            </button>
          </div>
        </div>

        {/* CROA cancellation notice */}
        <div className="mt-6 rounded-xl bg-zinc-50 p-4">
          <p className="text-[11px] text-zinc-500 leading-relaxed text-center">
            Under the Credit Repair Organizations Act (CROA), you have the right to cancel this
            agreement within 3 business days of signing without penalty. To cancel, email{" "}
            <a href="mailto:support@cleanpathcredit.com" className="text-emerald-600 underline">
              support@cleanpathcredit.com
            </a>{" "}
            with your name and &quot;Cancel Agreement&quot; in the subject line.
          </p>
        </div>

        <p className="mt-4 text-center text-[10px] text-zinc-400">
          Agreement version: {AGREEMENT_VERSION}
        </p>
      </div>
    </div>
  );
}
