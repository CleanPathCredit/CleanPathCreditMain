/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * /sms-consent — public A2P 10DLC opt-in capture page.
 *
 * Built specifically to satisfy Twilio A2P 10DLC review requirements:
 *   - Publicly accessible (no auth)
 *   - Brand identification clearly visible
 *   - Service-consent checkbox UNCHECKED by default (TCPA prior-express-
 *     written-consent)
 *   - Exact opt-in language verbatim (must match the text registered with
 *     Twilio A2P; see CONSENT_TEXT below)
 *   - Separate marketing-consent checkbox (CTIA Messaging Principles
 *     require service vs marketing be separately opted in)
 *   - Privacy + Terms links
 *   - STOP / HELP keyword instructions visible
 *   - Frequency disclosure
 *   - "Msg & data rates may apply" disclosure
 *
 * Indexing: <meta name="robots" content="noindex,nofollow"> is injected on
 * mount so this compliance page doesn't surface in Google. A2P reviewers
 * reach it via the URL we register, not search.
 *
 * IMPORTANT: the consent text rendered next to the service checkbox must
 * stay in lockstep with:
 *   - api/sms-consent.ts CONSENT_TEXT_V1 (the snapshot we record)
 *   - The opt-in language registered in Twilio A2P
 * If you update one, update all three.
 */

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  MessageSquare,
  ShieldCheck,
  Calendar,
  AlertCircle,
} from "lucide-react";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

interface FormState {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  serviceConsent: boolean;
  marketingConsent: boolean;
}

const INITIAL_FORM: FormState = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  serviceConsent: false,
  marketingConsent: false,
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function SmsConsent() {
  const [form, setForm]               = useState<FormState>(INITIAL_FORM);
  const [submitting, setSubmitting]   = useState(false);
  const [submitted, setSubmitted]     = useState(false);
  const [submittedPhone, setSubmittedPhone] = useState("");
  const [error, setError]             = useState<string | null>(null);

  useEffect(() => {
    const prevTitle = document.title;
    document.title = "Clean Path Credit | SMS Consent";

    // Inject noindex/nofollow so this compliance page doesn't surface
    // in Google. A2P reviewers reach it directly.
    const robotsMeta = document.createElement("meta");
    robotsMeta.name = "robots";
    robotsMeta.content = "noindex,nofollow";
    document.head.appendChild(robotsMeta);

    return () => {
      document.title = prevTitle;
      if (robotsMeta.parentNode) robotsMeta.parentNode.removeChild(robotsMeta);
    };
  }, []);

  const canSubmit =
    form.firstName.trim().length > 0 &&
    form.phone.trim().length >= 10 &&
    EMAIL_REGEX.test(form.email.trim()) &&
    form.serviceConsent &&
    !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/sms-consent", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName:        form.firstName.trim(),
          lastName:         form.lastName.trim() || undefined,
          phone:            form.phone.trim(),
          email:            form.email.trim().toLowerCase(),
          serviceConsent:   form.serviceConsent,
          marketingConsent: form.marketingConsent,
          consentVersion:   "v1",
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        setError(
          data?.error === "invalid_phone"
            ? "That phone number doesn't look right. Please use a US 10-digit number."
            : data?.error === "invalid_email" || data?.error === "email_required"
            ? "Please enter a valid email address."
            : data?.error === "service_consent_required"
            ? "Please check the box agreeing to receive text messages."
            : data?.error === "first_name_required"
            ? "Please enter your first name."
            : "Submission failed. Please try again.",
        );
        setSubmitting(false);
        return;
      }

      // Track success in GA — the gtag call is global, set up by index.html
      if (typeof window.gtag === "function") {
        window.gtag("event", "sms_consent_submitted", {
          marketing_opt_in: form.marketingConsent,
        });
      }

      setSubmittedPhone(form.phone);
      setSubmitted(true);
    } catch (err) {
      console.error("[SmsConsent] submit error:", err);
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col">
        <header className="border-b border-zinc-200 bg-white">
          <div className="mx-auto max-w-4xl px-6 py-4 flex items-center">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Clean Path Credit
            </Link>
          </div>
        </header>
        <main className="mx-auto max-w-2xl px-6 py-16 sm:py-24 flex-1">
          <div className="bg-white rounded-2xl border border-zinc-200 p-8 sm:p-12 shadow-sm text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mb-6">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-zinc-900 mb-3">
              You're opted in.
            </h1>
            <p className="text-lg text-zinc-700 mb-6">
              We've recorded your consent to receive text messages from Clean Path Credit at <strong>{submittedPhone}</strong>.
            </p>
            <p className="text-zinc-600 mb-2">
              You'll receive a welcome text once our SMS service is fully active (typically within 5–7 business days while we complete carrier registration).
            </p>
            <p className="text-zinc-600 mb-8">
              You can opt out anytime by replying <strong>STOP</strong> to any message we send.
            </p>
            <Link
              to="/"
              className="inline-flex items-center justify-center h-12 px-6 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors"
            >
              Back to Clean Path Credit
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto max-w-4xl px-6 py-4 flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Clean Path Credit
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-12 sm:py-16">
        {/* Hero */}
        <section className="mb-10 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 mb-4">
            <MessageSquare className="h-7 w-7" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-zinc-900 mb-3">
            Get text updates from Clean Path Credit
          </h1>
          <p className="text-lg text-zinc-600 max-w-md mx-auto">
            Stay in the loop on your credit-readiness program with concise, no-spam text messages.
          </p>
        </section>

        {/* What you'll receive */}
        <section className="bg-white rounded-2xl border border-zinc-200 p-6 sm:p-8 shadow-sm mb-6">
          <h2 className="text-lg font-semibold text-zinc-900 mb-4">What you'll receive</h2>
          <ul className="space-y-3 text-zinc-700">
            <li className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <span>Appointment confirmations and consultation reminders</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <span>Weekly written progress updates while your dispute rounds are active</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <span>Document-request notifications when we need information from you</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <span>Status updates as your file moves through each round</span>
            </li>
          </ul>
        </section>

        {/* Frequency */}
        <section className="bg-white rounded-2xl border border-zinc-200 p-6 sm:p-8 shadow-sm mb-6">
          <h2 className="text-lg font-semibold text-zinc-900 mb-3">Frequency</h2>
          <p className="text-zinc-700">
            Typically <strong>2–6 messages per month</strong> per active client, peaking at 8–10 during active dispute rounds. Marketing-opted-in subscribers receive no more than 4 promotional messages per month.
          </p>
        </section>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border border-zinc-200 p-6 sm:p-8 shadow-sm space-y-5"
        >
          {/* Honeypot — hidden, traps form-fill bots */}
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-zinc-900 mb-1">
                First name <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                id="firstName"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                required
                autoComplete="given-name"
                className="w-full h-11 px-3 rounded-lg border border-zinc-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none transition-colors"
              />
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-zinc-900 mb-1">
                Last name <span className="text-zinc-400">(optional)</span>
              </label>
              <input
                type="text"
                id="lastName"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                autoComplete="family-name"
                className="w-full h-11 px-3 rounded-lg border border-zinc-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-zinc-900 mb-1">
              Mobile phone number <span className="text-rose-600">*</span>
            </label>
            <input
              type="tel"
              id="phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              required
              autoComplete="tel"
              placeholder="(346) 555-0100"
              className="w-full h-11 px-3 rounded-lg border border-zinc-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none transition-colors"
            />
            <p className="text-xs text-zinc-500 mt-1">
              US numbers only. We'll text this number; standard message and data rates may apply.
            </p>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-zinc-900 mb-1">
              Email <span className="text-rose-600">*</span>
            </label>
            <input
              type="email"
              id="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              autoComplete="email"
              className="w-full h-11 px-3 rounded-lg border border-zinc-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none transition-colors"
            />
            <p className="text-xs text-zinc-500 mt-1">
              Used to confirm your opt-in and as a backup channel if your phone changes.
            </p>
          </div>

          {/* Service consent (REQUIRED) — EXACT TEXT MUST MATCH api/sms-consent.ts CONSENT_TEXT_V1 */}
          <div className="border-t border-zinc-200 pt-5">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.serviceConsent}
                onChange={(e) => setForm({ ...form, serviceConsent: e.target.checked })}
                required
                className="mt-1 h-5 w-5 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-600"
              />
              <span className="text-sm text-zinc-700 leading-relaxed">
                <strong className="text-zinc-900">I agree to receive text messages</strong> from Clean Path Credit at the number provided. Message and data rates may apply. Message frequency varies. Reply <strong>STOP</strong> to unsubscribe, <strong>HELP</strong> for help. <span className="text-rose-600">*</span>
              </span>
            </label>
          </div>

          {/* Marketing consent (OPTIONAL — separate per CTIA Messaging Principles) */}
          <div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.marketingConsent}
                onChange={(e) => setForm({ ...form, marketingConsent: e.target.checked })}
                className="mt-1 h-5 w-5 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-600"
              />
              <span className="text-sm text-zinc-700 leading-relaxed">
                Optionally, I also agree to receive <strong>promotional and educational messages</strong> (webinars, program updates, special offers). I can opt out of marketing while still receiving service messages.
              </span>
            </label>
          </div>

          {error && (
            <div className="flex items-start gap-3 bg-rose-50 border border-rose-200 rounded-lg p-3 text-sm text-rose-800">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full h-12 rounded-xl bg-emerald-600 text-white text-base font-semibold shadow-md hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Submitting…" : "Confirm SMS opt-in"}
          </button>

          <p className="text-xs text-zinc-500 text-center">
            By clicking Confirm, you agree to our{" "}
            <Link to="/terms" className="text-emerald-700 hover:text-emerald-800 underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link to="/privacy" className="text-emerald-700 hover:text-emerald-800 underline">
              Privacy Policy
            </Link>
            .
          </p>
        </form>

        {/* STOP / HELP cards */}
        <section className="mt-8 grid sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-zinc-200 p-4 flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-zinc-900 text-sm">Reply STOP to opt out</div>
              <div className="text-xs text-zinc-600">Anytime, no penalty. We honor STOP, UNSUBSCRIBE, CANCEL, END, and QUIT instantly.</div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-zinc-200 p-4 flex items-start gap-3">
            <Calendar className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-zinc-900 text-sm">Reply HELP for assistance</div>
              <div className="text-xs text-zinc-600">Returns brand contact information and re-confirms opt-out instructions.</div>
            </div>
          </div>
        </section>

        <p className="mt-8 text-xs text-zinc-500 leading-relaxed">
          Clean Path Credit complies with the Telephone Consumer Protection Act (TCPA), CTIA Messaging Principles and Best Practices, and the Credit Repair Organizations Act (CROA). Texas Credit Services Organization Registration: <strong>#[pending approval]</strong>.
        </p>
      </main>
    </div>
  );
}
