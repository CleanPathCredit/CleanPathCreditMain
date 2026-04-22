/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * OnboardingWizard — 3-step "get your credit profile into the system"
 * flow that renders at the top of the Dashboard for users who haven't
 * uploaded a credit report yet.
 *
 *   Step 1: VSL — explainer video on how the process works
 *   Step 2: SmartCredit affiliate link (user earns commission, client
 *           gets the 3B side-by-side report)
 *   Step 3: PDF upload + parser kickoff
 *
 * Visibility logic lives in the parent: render this when the user has
 * zero successful credit_reports. Once a parse succeeds, hide it
 * permanently for that user.
 *
 * The wizard manages its own upload → document-row → parser-call pipeline
 * rather than going through DocumentVault. That keeps the onboarding UX
 * focused ("upload your credit report" is more explicit than "upload any
 * document") and lets us fire the /api/credit-report/parse call
 * immediately after upload without coordinating with the vault.
 */

import React, { useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSession } from "@clerk/clerk-react";
import { useSupabaseClient } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import {
  ArrowRight, CheckCircle2, Upload, FileText, ExternalLink,
  Loader2, Sparkles, AlertTriangle,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const VSL_EMBED_URL = import.meta.env.VITE_VSL_EMBED_URL as string | undefined;
const SMARTCREDIT_AFFILIATE_URL = "https://www.smartcredit.com/join/?pid=96593";
const MAX_FILE_BYTES = 12 * 1024 * 1024;   // 12 MB — typical 3B PDF is 1–4 MB

type Step   = 1 | 2 | 3;
type Status =
  | "idle"
  | "uploading"
  | "parsing"
  | "success"
  | "error";

interface OnboardingWizardProps {
  /** Called with the newly-created credit_reports row id after a parse
   *  succeeds — lets the parent navigate or refresh data. */
  onComplete?: (reportId: string) => void;
  /** Optional "do this later" link — lets users skip. The wizard reappears
   *  next dashboard load until a report exists. */
  onDismiss?: () => void;
}

export function OnboardingWizard({ onComplete, onDismiss }: OnboardingWizardProps) {
  const { clerkUser } = useAuth();
  const { session }   = useSession();
  const supabase      = useSupabaseClient();

  const [step, setStep]     = useState<Step>(1);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError]   = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const advance = () => setStep((s) => (s === 3 ? 3 : ((s + 1) as Step)));
  const back    = () => setStep((s) => (s === 1 ? 1 : ((s - 1) as Step)));

  const pickFile = () => fileInputRef.current?.click();

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset the input so re-picking the same file fires onChange again.
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!file || !clerkUser || !session) return;

    setError(null);
    if (file.type !== "application/pdf") {
      setError("Please upload a PDF. Other formats aren't supported yet.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError("File is larger than 12 MB. Try downloading a fresh PDF from SmartCredit.");
      return;
    }

    setFileName(file.name);
    setStatus("uploading");
    try {
      // 1. Upload the PDF to Storage. Path format mirrors DocumentVault's
      //    convention so the bucket's RLS ("owner-only under your folder")
      //    matches.
      const ts       = Date.now();
      const storagePath = `documents/${clerkUser.id}/credit_report_${ts}.pdf`;
      const { error: upErr } = await supabase
        .storage
        .from("documents")
        .upload(storagePath, file, {
          contentType: "application/pdf",
          cacheControl: "3600",
          upsert: false,
        });
      if (upErr) {
        setError("Upload failed. Please try again.");
        setStatus("error");
        return;
      }

      // 2. Create the documents row pointing at the uploaded file. Category
      //    = 'credit_report' so admin tooling and future cleanup jobs can
      //    distinguish it from ID / SSN docs.
      const { data: docRow, error: docErr } = await supabase
        .from("documents")
        .insert({
          profile_id:   clerkUser.id,
          name:         file.name,
          storage_path: storagePath,
          mime_type:    "application/pdf",
          size_bytes:   file.size,
          category:     "credit_report",
        })
        .select()
        .single();
      if (docErr || !docRow) {
        setError("Couldn't register the document. Please try again.");
        setStatus("error");
        return;
      }

      // 3. Kick off the parser. This call blocks until Claude Sonnet
      //    finishes — typically 15–30s. We show "Analyzing…" UI during
      //    the wait.
      setStatus("parsing");
      const token = await session.getToken();
      if (!token) {
        setError("Session expired. Please reload and try again.");
        setStatus("error");
        return;
      }
      const resp = await fetch("/api/credit-report/parse", {
        method: "POST",
        headers: {
          "Content-Type":  "application/json",
          Authorization:   `Bearer ${token}`,
        },
        body: JSON.stringify({ document_id: docRow.id }),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({} as { error?: string }));
        setError(
          data.error === "openrouter_not_configured"
            ? "Report parser isn't configured on the server yet. Your file is uploaded; admin will process it."
            : "Couldn't analyze the report. The file is saved — you can retry from the dashboard.",
        );
        setStatus("error");
        return;
      }
      const data = await resp.json() as { ok: true; report_id: string };
      setStatus("success");
      onComplete?.(data.report_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
      setStatus("error");
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/80 via-white to-white shadow-sm">
      {/* Header + progress */}
      <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-emerald-100 bg-white/60">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-600" />
            <div className="text-xs font-semibold tracking-[0.14em] uppercase text-emerald-700">
              Get Started
            </div>
          </div>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-xs text-zinc-500 hover:text-zinc-800 underline underline-offset-2"
            >
              I'll do this later
            </button>
          )}
        </div>
        <h2 className="text-lg sm:text-xl font-semibold text-zinc-900">
          Get your credit profile into your dashboard
        </h2>
        <p className="text-sm text-zinc-600 mt-1">
          Three steps. Takes about 10 minutes. Most of it is waiting on SmartCredit.
        </p>

        {/* Progress dots */}
        <div className="flex items-center gap-2 mt-4">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className={`h-1.5 rounded-full transition-all ${
                n === step
                  ? "w-8 bg-emerald-600"
                  : n < step
                    ? "w-4 bg-emerald-400"
                    : "w-4 bg-zinc-200"
              }`}
            />
          ))}
          <span className="ml-2 text-xs text-zinc-500">Step {step} of 3</span>
        </div>
      </div>

      {/* Body */}
      <div className="p-5 sm:p-6">
        <AnimatePresence mode="wait">
          {/* ── Step 1 — VSL ───────────────────────────────────────────── */}
          {step === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <h3 className="text-base font-semibold text-zinc-900 mb-1">How this works (3 min)</h3>
              <p className="text-sm text-zinc-600 mb-4">
                Quick walk-through of the process — where you'll get your report, what we do with it, and what happens next.
              </p>

              <div
                className="relative w-full rounded-xl overflow-hidden border border-zinc-200 bg-zinc-900"
                style={{ aspectRatio: "16 / 9" }}
              >
                {VSL_EMBED_URL ? (
                  <iframe
                    src={VSL_EMBED_URL}
                    title="Clean Path Credit — Onboarding"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="absolute inset-0 w-full h-full"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-zinc-400 text-center p-6">
                    <div>
                      <div className="text-sm font-semibold uppercase tracking-wider mb-2">Video coming soon</div>
                      <p className="text-xs">You can skip ahead while we finalize the walk-through.</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-5 flex justify-end">
                <Button onClick={advance} className="h-10 px-5 bg-emerald-600 hover:bg-emerald-700 text-white">
                  Next — get your report <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* ── Step 2 — SmartCredit affiliate ─────────────────────────── */}
          {step === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <h3 className="text-base font-semibold text-zinc-900 mb-1">Pull your 3-bureau report + scores</h3>
              <p className="text-sm text-zinc-600 mb-5">
                SmartCredit is the simplest way to get all three bureaus + VantageScores in one place. You'll download a single PDF that has everything we need.
              </p>

              <div className="rounded-xl border border-zinc-200 bg-white p-5 mb-5">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                    <FileText className="h-5 w-5 text-emerald-700" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-zinc-900 mb-0.5">SmartCredit 3B Report</div>
                    <p className="text-xs text-zinc-600 leading-relaxed">
                      Sign up → open the Smart 3B view → print to PDF (or use the built-in download). You'll have the file ready to upload in the next step.
                    </p>
                  </div>
                </div>

                <a
                  href={SMARTCREDIT_AFFILIATE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium shadow-sm transition-colors"
                >
                  Sign up at SmartCredit
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>

              <details className="mb-5 text-sm text-zinc-600">
                <summary className="cursor-pointer text-emerald-700 hover:text-emerald-900 underline underline-offset-2">
                  Already have an account or a report PDF?
                </summary>
                <p className="mt-2 ml-1 text-xs leading-relaxed">
                  Skip straight to the upload step. Any 3-bureau PDF works (SmartCredit, AnnualCreditReport.com, IDIQ) — SmartCredit's "Smart 3B" view is the easiest to parse because it's all in one file.
                </p>
              </details>

              <div className="flex justify-between">
                <Button variant="outline" onClick={back} className="h-10 px-5">
                  Back
                </Button>
                <Button onClick={advance} className="h-10 px-5 bg-emerald-600 hover:bg-emerald-700 text-white">
                  I have my report — upload it <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* ── Step 3 — Upload + parse ───────────────────────────────── */}
          {step === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <h3 className="text-base font-semibold text-zinc-900 mb-1">Upload your credit report PDF</h3>
              <p className="text-sm text-zinc-600 mb-5">
                We'll analyze your report, extract your scores + accounts, and populate your dashboard. Takes about 20 seconds.
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handleFileSelected}
              />

              {/* Dropzone / idle state */}
              {status === "idle" && (
                <button
                  onClick={pickFile}
                  className="w-full rounded-xl border-2 border-dashed border-emerald-300 bg-white hover:bg-emerald-50/50 py-8 flex flex-col items-center gap-2 text-zinc-700 hover:text-zinc-900 transition-colors"
                >
                  <Upload className="h-6 w-6 text-emerald-600" />
                  <span className="text-sm font-medium">Select your PDF</span>
                  <span className="text-xs text-zinc-500">Up to 12 MB</span>
                </button>
              )}

              {/* Uploading */}
              {status === "uploading" && (
                <div className="rounded-xl border border-zinc-200 bg-white p-6 flex items-center gap-3">
                  <Loader2 className="h-5 w-5 text-emerald-600 animate-spin" />
                  <div className="text-sm">
                    <div className="font-medium text-zinc-900">Uploading {fileName}…</div>
                    <div className="text-xs text-zinc-500">Securely storing your file.</div>
                  </div>
                </div>
              )}

              {/* Parsing — longest phase, show calming UX */}
              {status === "parsing" && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <Loader2 className="h-5 w-5 text-emerald-600 animate-spin" />
                    <div className="text-sm">
                      <div className="font-medium text-zinc-900">Analyzing your report…</div>
                      <div className="text-xs text-zinc-600">Extracting scores, accounts, and flagging disputable items. About 20–30 seconds.</div>
                    </div>
                  </div>
                  <ul className="text-xs text-zinc-600 space-y-1 ml-1">
                    <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-emerald-500" /> Upload complete</li>
                    <li className="flex items-center gap-2"><Loader2 className="h-3 w-3 text-emerald-500 animate-spin" /> Extracting bureau scores</li>
                    <li className="flex items-center gap-2 opacity-50"><div className="h-3 w-3 rounded-full border border-zinc-300" /> Identifying negative items</li>
                    <li className="flex items-center gap-2 opacity-50"><div className="h-3 w-3 rounded-full border border-zinc-300" /> Finalizing your profile</li>
                  </ul>
                </div>
              )}

              {/* Success */}
              {status === "success" && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-6 text-center">
                  <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto mb-2" />
                  <div className="text-base font-semibold text-zinc-900">You're all set.</div>
                  <p className="text-sm text-zinc-600 mt-1">
                    Your credit profile is loaded. Scroll down to see your scores, accounts, and which items we flagged for dispute.
                  </p>
                </div>
              )}

              {/* Error — always offer a retry */}
              {status === "error" && error && (
                <div className="rounded-xl border border-red-200 bg-red-50/70 p-4 flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-red-900">{error}</div>
                    <button
                      onClick={() => { setStatus("idle"); setError(null); }}
                      className="mt-2 text-xs text-red-700 underline underline-offset-2 hover:text-red-900"
                    >
                      Try again
                    </button>
                  </div>
                </div>
              )}

              {/* Back button — disabled mid-upload / mid-parse so user can't
                  navigate away from an in-flight job. */}
              <div className="mt-5 flex justify-between">
                <Button
                  variant="outline"
                  onClick={back}
                  disabled={status === "uploading" || status === "parsing"}
                  className="h-10 px-5"
                >
                  Back
                </Button>
                {status === "idle" && (
                  <p className="text-[11px] text-zinc-400 self-end">
                    Don't have it yet? <button onClick={back} className="underline">Go back to Step 2</button>.
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
