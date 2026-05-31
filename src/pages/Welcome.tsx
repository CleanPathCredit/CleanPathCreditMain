/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * /welcome — post-purchase landing page with consent gate.
 *
 * Stripe Buy Buttons redirect here after checkout:
 *   https://cleanpathcredit.com/welcome?plan=standard&session_id=cs_xxx
 *
 * Flow:
 *   1. Shows congratulations + what's unlocked
 *   2. Requires TWO consent checkboxes before account creation
 *   3. Logs consent (timestamp, IP proxy, plan, session) for Stripe defense
 *   4. If already signed in → dashboard
 */

import React, { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { CheckCircle2, Star, Zap, Shield, Lock } from "lucide-react";
import type { Plan } from "@/types/database";
import { posthog } from "@/lib/posthog-client";
import { trackStandard } from "@/lib/meta-pixel";

const PLAN_COPY: Record<Plan, {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  features: string[];
}> = {
  free: {
    title: "Welcome to Clean Path Credit",
    subtitle: "Your free account gives you access to credit insights and educational guides.",
    icon: <Shield className="h-8 w-8" />,
    color: "text-zinc-600",
    features: ["Credit score overview", "Basic credit guides", "Upgrade anytime"],
  },
  diy: {
    title: "DIY Blueprint — Activated!",
    subtitle: "You've unlocked the tools and strategy to challenge inaccurate or unverifiable items yourself.",
    icon: <Zap className="h-8 w-8" />,
    color: "text-emerald-600",
    features: [
      "Proven Credit Correction Playbook",
      "Round-by-round action guide",
      "Downloadable tracking spreadsheet",
      "Lifetime access",
    ],
  },
  standard: {
    title: "You've Unlocked the Clean Path Credit System",
    subtitle: "Your credit correction journey starts now. We handle everything.",
    icon: <Star className="h-8 w-8" />,
    color: "text-emerald-600",
    features: [
      "4-round structured credit-improvement workflow",
      "Full submission handling included",
      "Document vault access",
      "Direct messaging with your advisor",
      "Cancel anytime — billed per round after completion",
    ],
  },
  premium: {
    title: "Executive System — Welcome to the Top!",
    subtitle: "Priority handling, monthly strategy calls, and business credit positioning.",
    icon: <Star className="h-8 w-8 text-yellow-500" />,
    color: "text-yellow-600",
    features: [
      "Everything in Accelerated",
      "Monthly 1-on-1 strategy calls",
      "Business credit blueprint",
      "Priority advisor access",
      "Personal & business credit roadmap",
    ],
  },
};

export function Welcome() {
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();
  const { isSignedIn, isLoaded } = useUser();

  const [showAuth, setShowAuth]           = useState(false);
  const [consentTerms, setConsentTerms]   = useState(false);
  const [consentDispute, setConsentDispute] = useState(false);

  const plan      = (searchParams.get("plan") ?? "free") as Plan;
  const sessionId = searchParams.get("session_id");
  const copy      = PLAN_COPY[plan] ?? PLAN_COPY.free;

  const bothChecked = consentTerms && consentDispute;
  const isPaidPlan  = plan !== "free";

  // Already signed in → go straight to dashboard
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      navigate("/dashboard", { replace: true });
    }
  }, [isLoaded, isSignedIn, navigate]);

  // Browser-side Meta Pixel `Purchase` — paired with the server-side
  // CAPI fire in api/webhooks/stripe.ts. eventID = Stripe session ID
  // so Meta deduplicates against the server event. Server-side carries
  // the authoritative value/currency from the Stripe Checkout Session,
  // so we don't include them here (the page only knows `plan`).
  // sessionStorage guard prevents a refresh on /welcome from
  // double-firing within the same browser session.
  const purchaseFiredRef = useRef(false);
  useEffect(() => {
    if (!isPaidPlan || !sessionId) return;
    if (purchaseFiredRef.current) return;
    const dedupKey = `cpc_pixel_purchase_${sessionId}`;
    try {
      if (sessionStorage.getItem(dedupKey)) return;
      sessionStorage.setItem(dedupKey, "1");
    } catch { /* sessionStorage unavailable — fall through and fire once per mount */ }
    purchaseFiredRef.current = true;
    trackStandard(
      "Purchase",
      { content_name: plan, content_type: "product" },
      { eventID: sessionId },
    );
  }, [isPaidPlan, sessionId, plan]);

  /** Log consent data for Stripe dispute defense */
  function logConsent() {
    const consentRecord = {
      timestamp: new Date().toISOString(),
      plan,
      sessionId: sessionId ?? "none",
      consentTerms: true,
      consentDispute: true,
      userAgent: navigator.userAgent,
      url: window.location.href,
    };
    // Store locally — can be sent to Supabase in a future iteration
    try {
      localStorage.setItem("cpc_consent", JSON.stringify(consentRecord));
    } catch { /* localStorage unavailable — graceful fallback */ }
  }

  function handleProceed() {
    if (isPaidPlan && !bothChecked) return;
    logConsent();
    posthog.capture('welcome_consent_completed', {
      plan,
      stripe_session_id: sessionId ?? undefined,
      is_paid_plan:      isPaidPlan,
    });
    setShowAuth(true);
  }

  // Redirect to Clerk's hosted sign-up page
  if (showAuth) {
    const redirectUrl = encodeURIComponent("https://cleanpathcredit.com/dashboard");
    window.location.href = `https://accounts.cleanpathcredit.com/sign-up?redirect_url=${redirectUrl}`;
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-zinc-50 to-white px-4 py-16">
      {/* Celebration header */}
      <div className="mb-8 text-center">
        <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 ${copy.color}`}>
          {copy.icon}
        </div>
        {isPaidPlan && (
          <div className="mb-2 flex items-center justify-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            <span className="text-sm font-medium text-emerald-600">Payment Confirmed</span>
          </div>
        )}
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
          {copy.title}
        </h1>
        <p className="mt-3 max-w-md text-base text-zinc-500">{copy.subtitle}</p>
      </div>

      {/* What's unlocked */}
      <div className="mb-6 w-full max-w-sm rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-zinc-400">
          What&apos;s unlocked
        </p>
        <ul className="space-y-3">
          {copy.features.map((f) => (
            <li key={f} className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
              <span className="text-sm text-zinc-700">{f}</span>
            </li>
          ))}
        </ul>
        {isPaidPlan && (
          <p className="mt-4 text-xs text-zinc-400 leading-relaxed">
            Delivery is considered complete upon account access. You will receive instant dashboard access, your personalized strategy, and a step-by-step action plan.
          </p>
        )}
      </div>

      {/* Consent checkboxes — only for paid plans */}
      {isPaidPlan && (
        <div className="mb-6 w-full max-w-sm space-y-4">
          {/* Checkbox 1: Terms consent */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={consentTerms}
              onChange={(e) => setConsentTerms(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
            />
            <span className="text-xs text-zinc-600 leading-relaxed group-hover:text-zinc-900 transition-colors">
              I agree to the{" "}
              <a href="/terms" target="_blank" className="text-emerald-600 underline hover:text-emerald-700">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="/privacy" target="_blank" className="text-emerald-600 underline hover:text-emerald-700">
                Privacy Policy
              </a>.
              I understand this is a digital product with immediate access and that results are not guaranteed.
            </span>
          </label>

          {/* Checkbox 2: Chargeback / dispute protection */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={consentDispute}
              onChange={(e) => setConsentDispute(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
            />
            <span className="text-xs text-zinc-600 leading-relaxed group-hover:text-zinc-900 transition-colors">
              I agree to contact support before filing any payment dispute and understand that system access constitutes product delivery.
            </span>
          </label>
        </div>
      )}

      {/* CTA */}
      <div className="flex w-full max-w-sm flex-col gap-3">
        <button
          onClick={handleProceed}
          disabled={isPaidPlan && !bothChecked}
          className={`h-12 w-full rounded-full font-semibold text-white transition-all flex items-center justify-center gap-2 ${
            !isPaidPlan || bothChecked
              ? "bg-zinc-900 hover:bg-zinc-800 cursor-pointer"
              : "bg-zinc-300 cursor-not-allowed"
          }`}
        >
          {isPaidPlan && !bothChecked && <Lock className="h-4 w-4" />}
          Create My Account &amp; Access Dashboard →
        </button>

        <p className="text-center text-xs text-zinc-400">
          Already have an account?{" "}
          <a href="/login" className="text-emerald-600 hover:underline">Sign in</a>
        </p>

        {sessionId && (
          <p className="text-center text-xs text-zinc-300">
            Order #{sessionId.slice(-8).toUpperCase()}
          </p>
        )}
      </div>

      {/* CROA disclosure + footer legal */}
      {isPaidPlan && (
        <div className="mt-8 w-full max-w-sm">
          <p className="text-[10px] text-zinc-400 leading-relaxed text-center">
            You have the right to dispute inaccurate information on your credit report on your own at no cost.
            Clean Path Credit does not guarantee specific results and does not provide legal advice.
            By completing this purchase, you agree to the{" "}
            <a href="/terms" target="_blank" className="underline">Terms of Service</a>,{" "}
            <a href="/privacy" target="_blank" className="underline">Privacy Policy</a>, and refund policy.
            This is a digital product — no physical item will be shipped.
          </p>
        </div>
      )}
    </div>
  );
}
