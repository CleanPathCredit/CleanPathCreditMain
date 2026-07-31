/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * E-book lead-magnet modal.
 *
 * Trigger logic lives in `src/hooks/useEbookPopup.ts`. This component
 * is purely presentational + form-handling: receives `isOpen` from the
 * hook, posts the form to `/api/ebook` on submit, fires a Meta Pixel
 * `EbookOptin` custom event for retargeting attribution, and closes
 * (sets the 7-day suppression cookie) on success.
 *
 * Honeypot field `website` mirrors the /api/lead.ts + /api/sms-consent
 * pattern. Submitted whether populated or not — the server short-circuits
 * to a silent 200 if non-empty.
 *
 * Compliance posture:
 *   - The e-book is FREE and the form makes no promise of any specific
 *     outcome (CROA §404 safe).
 *   - Email consent is implicit by submission; CAN-SPAM unsubscribe is
 *     handled in the GHL automation footer.
 *   - The privacy policy link is shown above the submit button.
 */

import React, { useEffect, useRef, useState } from "react";
import { X, BookOpen, CheckCircle2 } from "lucide-react";
import { trackCustom } from "@/lib/meta-pixel";
import type { EbookPopupController } from "@/hooks/useEbookPopup";

interface Props {
  controller: EbookPopupController;
}

type Status = "idle" | "submitting" | "success" | "error";

export function EbookModal({ controller }: Props): React.ReactElement | null {
  const { isOpen, triggerSource, dismiss, markSubmitted } = controller;

  const [firstName, setFirstName] = useState("");
  const [email, setEmail]         = useState("");
  const [website, setWebsite]     = useState("");  // honeypot — never display
  const [status, setStatus]       = useState<Status>("idle");
  const [errorMsg, setErrorMsg]   = useState<string>("");

  const dialogRef     = useRef<HTMLDivElement | null>(null);
  const firstInputRef = useRef<HTMLInputElement | null>(null);

  // Reset form state whenever the modal closes so a re-open starts clean.
  useEffect(() => {
    if (!isOpen) {
      setFirstName("");
      setEmail("");
      setWebsite("");
      setStatus("idle");
      setErrorMsg("");
    }
  }, [isOpen]);

  // Focus the first input on open + esc-to-dismiss.
  useEffect(() => {
    if (!isOpen) return;
    firstInputRef.current?.focus();
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape" && status !== "submitting") {
        dismiss();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, status, dismiss]);

  if (!isOpen) return null;

  function readUtm(name: string): string {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get(name) || "";
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (status === "submitting") return;

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setStatus("error");
      setErrorMsg("Please enter a valid email.");
      return;
    }

    setStatus("submitting");
    setErrorMsg("");

    try {
      const resp = await fetch("/api/ebook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName:   firstName.trim(),
          email:       trimmedEmail,
          source:      triggerSource ?? "modal_unspecified",
          referrer:    document.referrer || "",
          utmSource:   readUtm("utm_source"),
          utmMedium:   readUtm("utm_medium"),
          utmCampaign: readUtm("utm_campaign"),
          website,  // honeypot — server silently 200s if non-empty
        }),
      });
      if (!resp.ok) {
        setStatus("error");
        setErrorMsg("Couldn't submit right now. Please try again or email hello@cleanpathcredit.com.");
        return;
      }
    } catch {
      setStatus("error");
      setErrorMsg("Couldn't connect. Please check your internet and try again.");
      return;
    }

    // Pixel custom event — distinct from Lead so the e-book funnel can be
    // optimized / retargeted as its own audience independent of the
    // quiz/form Lead event.
    trackCustom("EbookOptin", {
      content_name: "from_rent_to_mortgage_ebook",
      content_category: "lead_magnet",
      trigger_source: triggerSource ?? "unspecified",
    });

    setStatus("success");
    // Hold success state for ~2.5s so the user sees confirmation, then
    // close + set suppression cookie.
    window.setTimeout(() => {
      markSubmitted();
    }, 2500);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ebook-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 sm:px-6 backdrop-blur-sm bg-black/50"
      onClick={(e) => {
        // Click on backdrop dismisses; click inside dialog does not.
        if (e.target === e.currentTarget && status !== "submitting") {
          dismiss();
        }
      }}
    >
      <div
        ref={dialogRef}
        className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl"
      >
        {/* Close button */}
        <button
          type="button"
          aria-label="Dismiss"
          onClick={dismiss}
          disabled={status === "submitting"}
          className="absolute right-3 top-3 rounded-full p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors disabled:opacity-40"
        >
          <X className="h-4 w-4" />
        </button>

        {status === "success" ? (
          <SuccessBlock />
        ) : (
          <form onSubmit={handleSubmit} className="px-7 py-7 sm:px-9 sm:py-9">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <BookOpen className="h-5 w-5" />
            </div>

            <h2
              id="ebook-modal-title"
              className="text-xl sm:text-2xl font-semibold text-zinc-900 leading-snug"
            >
              From Rent to Mortgage
            </h2>
            <p className="mt-1 text-sm text-zinc-600">
              The 2026 First-Time Homebuyer Credit Playbook
            </p>

            <ul className="mt-5 space-y-2.5 text-sm text-zinc-700">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
                <span>12-item credit self-audit + 90-day readiness calendar</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
                <span>Two free FCRA-backed dispute letter templates</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
                <span>How FICO 10T &amp; VantageScore 4.0 actually read your file</span>
              </li>
            </ul>

            <div className="mt-6 space-y-3">
              <input
                ref={firstInputRef}
                type="text"
                name="firstName"
                placeholder="First name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                disabled={status === "submitting"}
                autoComplete="given-name"
                className="w-full h-11 rounded-lg border border-zinc-200 px-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
              />
              <input
                type="email"
                name="email"
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={status === "submitting"}
                required
                autoComplete="email"
                className="w-full h-11 rounded-lg border border-zinc-200 px-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
              />

              {/* Honeypot — visually hidden, off-screen, no autofill, no
                  tab-stop. Bots that auto-fill all inputs will populate
                  this; humans never see it. Server short-circuits to a
                  silent 200 if non-empty. */}
              <div aria-hidden="true" className="absolute -left-[9999px] -top-[9999px]">
                <label>
                  Website (leave blank)
                  <input
                    type="text"
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                  />
                </label>
              </div>

              {errorMsg && (
                <p className="text-xs text-red-600" role="alert">
                  {errorMsg}
                </p>
              )}

              <button
                type="submit"
                disabled={status === "submitting"}
                className="w-full h-11 rounded-lg bg-zinc-900 text-white text-sm font-semibold hover:bg-zinc-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {status === "submitting" ? "Sending…" : "Send me the e-book"}
              </button>

              <p className="text-[11px] text-zinc-400 leading-relaxed text-center">
                We'll email it now. No outcome guarantees — results vary by
                individual circumstance. See our{" "}
                <a href="/privacy" target="_blank" className="underline hover:text-zinc-600">
                  privacy policy
                </a>
                . Unsubscribe anytime.
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function SuccessBlock(): React.ReactElement {
  return (
    <div className="px-7 py-12 sm:px-9 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
        <CheckCircle2 className="h-6 w-6" />
      </div>
      <h2 className="text-xl font-semibold text-zinc-900">Check your email.</h2>
      <p className="mt-2 text-sm text-zinc-600">
        The e-book is on its way. If it doesn't arrive in 5 minutes, check
        your promotions folder or email{" "}
        <a href="mailto:hello@cleanpathcredit.com" className="text-emerald-600 hover:underline">
          hello@cleanpathcredit.com
        </a>
        .
      </p>
    </div>
  );
}
