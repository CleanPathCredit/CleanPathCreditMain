/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * /partners — public partners page for Track A4/A6 inbound.
 *
 * Single-page marketing + intake form designed to convert mortgage LOs,
 * real estate agents, dealership F&I managers, and bilingual / Latino
 * LOs into the discovery-call funnel without requiring an outbound
 * walk-in. Used as both:
 *   - A standalone URL (cleanpathcredit.com/partners) shared via QR
 *     code on printed leave-behinds, email signature, DMs.
 *   - The destination of the Partners nav link on the main site.
 *
 * Compliance posture (mirror of the LO/F&I one-pagers):
 *   - RESPA §8: no specific dollar referral amounts shown. The page
 *     uses "Partnership terms discussed during onboarding call" as
 *     the placeholder until attorney-reviewed comp structure is in
 *     place.
 *   - CROA §404: no outcome guarantees on consumer side; the page
 *     describes the process, not specific score lifts.
 *   - TCPA: phone field is paired with explicit consent checkbox
 *     before submit.
 *
 * Form posts to /api/partners (separate endpoint from /api/lead so the
 * partner-leads pipeline in GHL stays cleanly separated from quiz
 * leads).
 */

import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import {
  Briefcase,
  Car,
  Languages,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Calendar,
  TrendingUp,
} from "lucide-react";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM",
  "NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA",
  "WV","WI","WY",
];

type Role = "lo" | "broker" | "agent" | "fi" | "other";
type Volume = "under_5" | "5_to_15" | "15_plus";

interface FormState {
  firstName:        string;
  lastName:         string;
  email:            string;
  phone:            string;
  role:             Role | "";
  company:          string;
  nmls:             string;
  state:            string;
  monthlyVolume:    Volume | "";
  spanishSpeaking:  boolean;
  howHeard:         string;
  consent:          boolean;
  // Honeypot — real users never see this field; bots that autofill
  // every input trip it. Wired into form state + posted to the server
  // so /api/partners can detect and silently 200-but-skip the bot's
  // submission.
  website:          string;
}

const INITIAL_FORM: FormState = {
  firstName:        "",
  lastName:         "",
  email:            "",
  phone:            "",
  role:             "",
  company:          "",
  nmls:             "",
  state:            "",
  monthlyVolume:    "",
  spanishSpeaking:  false,
  howHeard:         "",
  consent:          false,
  website:          "",
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const CALENDLY_PARTNERSHIP_URL =
  (import.meta.env.VITE_CALENDLY_PARTNERSHIP_URL as string | undefined) ??
  "https://calendly.com/cleanpathcredit/free-15-min-credit-audit-strategy-call";

function needsNmls(role: Role | ""): boolean {
  return role === "lo" || role === "broker";
}

export function Partners() {
  const [form, setForm]               = useState<FormState>(INITIAL_FORM);
  const [submitting, setSubmitting]   = useState(false);
  const [submitted, setSubmitted]     = useState(false);
  const [error, setError]             = useState<string | null>(null);

  React.useEffect(() => {
    const prevTitle = document.title;
    document.title = "Clean Path Credit | Partner Program for LOs, Agents, and F&I Managers";
    return () => { document.title = prevTitle; };
  }, []);

  const canSubmit =
    form.firstName.trim().length > 0 &&
    EMAIL_REGEX.test(form.email.trim()) &&
    form.phone.trim().length >= 10 &&
    !!form.role &&
    form.company.trim().length > 0 &&
    form.state.length === 2 &&
    !!form.monthlyVolume &&
    form.consent &&
    (!needsNmls(form.role) || form.nmls.trim().length >= 4) &&
    !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/partners", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName:       form.firstName.trim(),
          lastName:        form.lastName.trim() || undefined,
          email:           form.email.trim().toLowerCase(),
          phone:           form.phone.trim(),
          role:            form.role,
          company:         form.company.trim(),
          nmls:            needsNmls(form.role) ? form.nmls.trim() : undefined,
          state:           form.state,
          monthlyVolume:   form.monthlyVolume,
          spanishSpeaking: form.spanishSpeaking,
          howHeard:        form.howHeard.trim() || undefined,
          consent:         form.consent,
          // Honeypot — forwarded so the server-side anti-bot check actually
          // gets the value the bot typed. Without this in the payload, a
          // bot that fills hidden inputs would bypass the check entirely.
          website:         form.website,
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(
          data?.error === "invalid_email" || data?.error === "email_required"
            ? "Please enter a valid email address."
            : data?.error === "invalid_phone"
            ? "That phone number doesn't look right. Please use a US 10-digit number."
            : data?.error === "invalid_role"
            ? "Please select your role."
            : data?.error === "nmls_required"
            ? "NMLS # is required for loan officers and mortgage brokers."
            : data?.error === "upstream_failed"
            ? "We had trouble saving your application. Please try again in a moment."
            : "Submission failed. Please try again.",
        );
        setSubmitting(false);
        return;
      }

      setSubmitted(true);
    } catch (err) {
      console.error("[Partners] submit error:", err);
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative min-h-screen bg-white font-sans text-zinc-900">
      <Navbar />

      <main className="relative pt-24 pb-16">
        {/* Hero */}
        <section className="px-6">
          <div className="mx-auto max-w-4xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 mb-5 text-xs font-semibold uppercase tracking-wider text-emerald-700">
              <Briefcase className="h-3.5 w-3.5" />
              Partner Program
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight text-zinc-900 mb-5 leading-tight">
              Save the buyers you lose to credit.
            </h1>
            <p className="text-lg sm:text-xl text-zinc-600 max-w-2xl mx-auto mb-8">
              Clean Path partners with mortgage LOs, real estate agents, and dealership F&amp;I managers to bring credit-challenged buyers back to mortgage- and loan-ready in 60-90 days. Bilingual, CROA-compliant, San Antonio based.
            </p>
            <a
              href="#apply"
              className="inline-flex items-center justify-center h-12 px-6 rounded-xl bg-emerald-600 text-white text-base font-semibold shadow-md hover:bg-emerald-700 transition-colors"
            >
              Apply for partnership →
            </a>
          </div>
        </section>

        {/* Three-archetype grid */}
        <section className="px-6 mt-20">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-900 mb-3 text-center">
              Built for the partners who lose deals to credit.
            </h2>
            <p className="text-zinc-600 text-center max-w-2xl mx-auto mb-12">
              Three partner types, one playbook. Each gets a free pre-screen on every referral, weekly written updates, and a re-quote handoff when the buyer is ready.
            </p>

            <div className="grid gap-6 md:grid-cols-3">
              {[
                {
                  icon: Briefcase,
                  title: "Mortgage LOs &amp; Real Estate Agents",
                  body: "You lose 25-40% of files to credit denials. We're the recovery channel — 60-90 day average to mortgage-ready, weekly progress reports back to you, files prepared for FICO 10T and VantageScore 4.0.",
                },
                {
                  icon: Car,
                  title: "Dealership F&amp;I Managers",
                  body: "Bumped buyers walk and don't come back. We bring them back re-quote ready in 60-90 days. Bilingual, no cost to the dealership, dealership-branded handoff page keeps the relationship with you.",
                },
                {
                  icon: Languages,
                  title: "Bilingual / Latino LO Partners",
                  body: "Most credit-repair partners are English-only and don't handle ITIN, cash income, or mixed-status families. We do. Spanish-primary intake at /es-comprador for hand-off to your Latino working-class buyers.",
                },
              ].map(({ icon: Icon, title, body }) => (
                <div
                  key={title}
                  className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="inline-flex items-center justify-center h-11 w-11 rounded-xl bg-emerald-100 text-emerald-600 mb-4">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3
                    className="font-semibold text-zinc-900 mb-2"
                    dangerouslySetInnerHTML={{ __html: title }}
                  />
                  <p
                    className="text-sm text-zinc-600 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: body }}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* The opportunity stats */}
        <section className="px-6 mt-20">
          <div className="mx-auto max-w-4xl">
            <div className="rounded-2xl bg-emerald-600 p-8 sm:p-12 text-white">
              <div className="flex items-start gap-3 mb-4">
                <TrendingUp className="h-6 w-6 shrink-0 mt-0.5" />
                <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
                  The opportunity in 2026
                </h2>
              </div>
              <ul className="space-y-3 text-base sm:text-lg">
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-white shrink-0" />
                  <span><strong>24% of US consumers</strong> skipped or underpaid a credit obligation in the last 12 months <span className="opacity-70">(FICO Spring 2026)</span></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-white shrink-0" />
                  <span><strong>The average FICO score is 714</strong>, down 2 points YoY <span className="opacity-70">(FICO Spring 2026)</span></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-white shrink-0" />
                  <span><strong>25.3 million US adults</strong> have no scorable credit record <span className="opacity-70">(CFPB Office of Research, June 2025)</span></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-white shrink-0" />
                  <span><strong>FHFA approved FICO 10T and VantageScore 4.0</strong> for Fannie Mae and Freddie Mac — first major mortgage scoring change in 30+ years; rent and utility history now count</span>
                </li>
              </ul>
              <p className="mt-6 text-base sm:text-lg opacity-90">
                Buyers you said “no” to last year may be 60-90 days from “yes”. We make that path operational.
              </p>
            </div>
          </div>
        </section>

        {/* How the partnership works */}
        <section className="px-6 mt-20">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-900 mb-10 text-center">
              How the partnership works
            </h2>
            <div className="grid gap-6 md:grid-cols-2">
              {[
                {
                  num: "1",
                  title: "You refer the file",
                  body: "Send the borrower to our intake form, hand them off on a warm call, or scan our QR code at the desk. No special process — just a referral.",
                },
                {
                  num: "2",
                  title: "Free 48-hour pre-screen",
                  body: "We tell you whether we believe we can help, what the timeline looks like, and what the file needs. No commitment from your borrower.",
                },
                {
                  num: "3",
                  title: "Program runs 60-90 days",
                  body: "Bilingual. Weekly written progress reports to both you and the borrower. CROA-compliant disputes under FCRA §611 and §623. No advance fees.",
                },
                {
                  num: "4",
                  title: "Re-quote ready handoff",
                  body: "When the file is mortgage- or loan-ready, we coordinate directly with you. The buyer comes back to YOU — the relationship stays with you.",
                },
              ].map(({ num, title, body }) => (
                <div key={num} className="flex gap-4">
                  <div className="shrink-0 inline-flex items-center justify-center h-10 w-10 rounded-full bg-emerald-600 text-white text-base font-bold">
                    {num}
                  </div>
                  <div>
                    <h3 className="font-semibold text-zinc-900 mb-1">{title}</h3>
                    <p className="text-sm text-zinc-600 leading-relaxed">{body}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-10 text-sm text-zinc-500 text-center">
              <strong>Partnership terms discussed during onboarding call.</strong>
            </p>
          </div>
        </section>

        {/* Application form */}
        <section className="px-6 mt-20" id="apply">
          <div className="mx-auto max-w-2xl">
            <div className="text-center mb-10">
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-900 mb-3">
                Apply for partnership
              </h2>
              <p className="text-zinc-600">
                ~60 seconds. We&apos;ll review and reach out within one business day to schedule a 15-minute discovery call.
              </p>
            </div>

            {submitted ? (
              <div className="bg-white rounded-2xl border border-zinc-200 p-8 sm:p-12 shadow-sm text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mb-6">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h3 className="text-xl sm:text-2xl font-semibold text-zinc-900 mb-3">
                  Application received.
                </h3>
                <p className="text-zinc-700 mb-6">
                  Thanks, <strong>{form.firstName}</strong>. We&apos;ve recorded your partnership application and will reach out within one business day.
                </p>
                <p className="text-zinc-600 mb-8">
                  Want to skip the wait and grab a slot now? Book your 15-minute discovery call directly:
                </p>
                <a
                  href={CALENDLY_PARTNERSHIP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center h-12 px-6 rounded-xl bg-emerald-600 text-white text-base font-semibold shadow-md hover:bg-emerald-700 transition-colors"
                >
                  Book the discovery call →
                </a>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="bg-white rounded-2xl border border-zinc-200 p-6 sm:p-8 shadow-sm space-y-5"
              >
                {/* Honeypot — hidden, traps form-fill bots. Controlled input
                    with state binding so the value gets posted to the
                    server, where /api/partners checks for non-empty. */}
                <input
                  type="text"
                  name="website"
                  value={form.website}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
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
                      Last name
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-zinc-900 mb-1">
                      Work email <span className="text-rose-600">*</span>
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
                  </div>
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-zinc-900 mb-1">
                      Mobile phone <span className="text-rose-600">*</span>
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
                  </div>
                </div>

                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-zinc-900 mb-1">
                    Your role <span className="text-rose-600">*</span>
                  </label>
                  <select
                    id="role"
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value as Role | "" })}
                    required
                    className="w-full h-11 px-3 rounded-lg border border-zinc-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none transition-colors bg-white"
                  >
                    <option value="">Select your role…</option>
                    <option value="lo">Loan Officer</option>
                    <option value="broker">Mortgage Broker</option>
                    <option value="agent">Real Estate Agent</option>
                    <option value="fi">Dealership F&amp;I Manager</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="company" className="block text-sm font-medium text-zinc-900 mb-1">
                      Company / brokerage <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      id="company"
                      value={form.company}
                      onChange={(e) => setForm({ ...form, company: e.target.value })}
                      required
                      autoComplete="organization"
                      className="w-full h-11 px-3 rounded-lg border border-zinc-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label htmlFor="state" className="block text-sm font-medium text-zinc-900 mb-1">
                      State <span className="text-rose-600">*</span>
                    </label>
                    <select
                      id="state"
                      value={form.state}
                      onChange={(e) => setForm({ ...form, state: e.target.value })}
                      required
                      className="w-full h-11 px-3 rounded-lg border border-zinc-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none transition-colors bg-white"
                    >
                      <option value="">Select state…</option>
                      {US_STATES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {needsNmls(form.role) && (
                  <div>
                    <label htmlFor="nmls" className="block text-sm font-medium text-zinc-900 mb-1">
                      NMLS # <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      id="nmls"
                      value={form.nmls}
                      onChange={(e) => setForm({ ...form, nmls: e.target.value })}
                      required={needsNmls(form.role)}
                      pattern="[0-9]+"
                      className="w-full h-11 px-3 rounded-lg border border-zinc-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none transition-colors"
                    />
                    <p className="text-xs text-zinc-500 mt-1">
                      Numeric only — we use this to confirm licensure on the discovery call.
                    </p>
                  </div>
                )}

                <div>
                  <label htmlFor="monthlyVolume" className="block text-sm font-medium text-zinc-900 mb-1">
                    Estimated denied / bumped buyers per month <span className="text-rose-600">*</span>
                  </label>
                  <select
                    id="monthlyVolume"
                    value={form.monthlyVolume}
                    onChange={(e) => setForm({ ...form, monthlyVolume: e.target.value as Volume | "" })}
                    required
                    className="w-full h-11 px-3 rounded-lg border border-zinc-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none transition-colors bg-white"
                  >
                    <option value="">Select range…</option>
                    <option value="under_5">Fewer than 5 per month</option>
                    <option value="5_to_15">5 to 15 per month</option>
                    <option value="15_plus">15 or more per month</option>
                  </select>
                </div>

                <div>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.spanishSpeaking}
                      onChange={(e) => setForm({ ...form, spanishSpeaking: e.target.checked })}
                      className="mt-1 h-5 w-5 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-600"
                    />
                    <span className="text-sm text-zinc-700">
                      I speak Spanish and primarily serve Latino borrowers.
                    </span>
                  </label>
                </div>

                <div>
                  <label htmlFor="howHeard" className="block text-sm font-medium text-zinc-900 mb-1">
                    How did you hear about Clean Path?
                  </label>
                  <input
                    type="text"
                    id="howHeard"
                    value={form.howHeard}
                    onChange={(e) => setForm({ ...form, howHeard: e.target.value })}
                    placeholder="Referral, walk-in, Google, LinkedIn, etc."
                    className="w-full h-11 px-3 rounded-lg border border-zinc-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none transition-colors"
                  />
                </div>

                {/* TCPA consent (REQUIRED) */}
                <div className="border-t border-zinc-200 pt-5">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.consent}
                      onChange={(e) => setForm({ ...form, consent: e.target.checked })}
                      required
                      className="mt-1 h-5 w-5 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-600"
                    />
                    <span className="text-sm text-zinc-700 leading-relaxed">
                      I agree to be contacted by Clean Path Credit at the email and phone provided regarding partnership inquiries. Message and data rates may apply. Reply STOP to unsubscribe. <span className="text-rose-600">*</span>
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
                  {submitting ? "Submitting…" : "Submit application"}
                </button>

                <p className="text-xs text-zinc-500 text-center">
                  By submitting, you agree to our{" "}
                  <Link to="/terms" className="text-emerald-700 hover:text-emerald-800 underline">Terms</Link>
                  {" "}and{" "}
                  <Link to="/privacy" className="text-emerald-700 hover:text-emerald-800 underline">Privacy Policy</Link>.
                </p>
              </form>
            )}
          </div>
        </section>

        {/* Compliance footer */}
        <section className="px-6 mt-16">
          <div className="mx-auto max-w-3xl">
            <div className="grid sm:grid-cols-2 gap-4 mb-8">
              <div className="bg-zinc-50 rounded-xl border border-zinc-200 p-4 flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-zinc-900 text-sm">CROA-compliant operation</div>
                  <div className="text-xs text-zinc-600">No advance fees. Required Consumer Credit File Rights notice. Unconditional 3-day right to cancel.</div>
                </div>
              </div>
              <div className="bg-zinc-50 rounded-xl border border-zinc-200 p-4 flex items-start gap-3">
                <Calendar className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-zinc-900 text-sm">Texas CSO registered</div>
                  <div className="text-xs text-zinc-600">Texas Finance Code Chapter 393. Surety bond on file.</div>
                </div>
              </div>
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed text-center">
              Clean Path Credit complies with the Credit Repair Organizations Act (CROA), Fair Credit Reporting Act (FCRA), Real Estate Settlement Procedures Act (RESPA), and Telemarketing Sales Rule (TSR). We do not guarantee any specific score change, item removal, approval outcome, or interest-rate savings. Individual outcomes depend on the accuracy of reported information, creditor and bureau response times, and continued participation in the program.
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
