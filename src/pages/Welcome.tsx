/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * /welcome — post-purchase landing page.
 *
 * Stripe Buy Buttons redirect here after checkout:
 *   https://cleanpathcredit.com/welcome?plan=standard&session_id=cs_xxx
 *
 * This page:
 *   1. Shows a congratulations message with plan-specific copy
 *   2. If the user is already signed in → goes straight to /dashboard
 *   3. If not signed in → shows Clerk <SignUp> / <SignIn> with email pre-filled
 *      (Stripe already collected it, we pass it via URL or Clerk magic link)
 */

import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { CheckCircle2, Star, Zap, Shield } from "lucide-react";
import type { Plan } from "@/types/database";

const PLAN_COPY: Record<Plan, {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  features: string[];
}> = {
  free: {
    title: "Welcome to CleanPath Credit",
    subtitle: "Your free account gives you access to credit insights and educational guides.",
    icon: <Shield className="h-8 w-8" />,
    color: "text-zinc-600",
    features: ["Credit score overview", "Basic credit guides", "Upgrade anytime"],
  },
  diy: {
    title: "DIY Blueprint — Activated!",
    subtitle: "You now have everything you need to challenge and remove negative items yourself.",
    icon: <Zap className="h-8 w-8" />,
    color: "text-emerald-600",
    features: [
      "Proven legal challenge playbook",
      "Round-by-round action guide",
      "Downloadable tracking spreadsheet",
      "Lifetime access",
    ],
  },
  standard: {
    title: "Accelerated Audit — Let's Go!",
    subtitle: "Your credit repair journey starts now. We handle everything.",
    icon: <Star className="h-8 w-8" />,
    color: "text-emerald-600",
    features: [
      "Done-for-you 4-round credit correction system",
      "Full submission handling included",
      "Document vault access",
      "Direct messaging with your advisor",
      "120-day money-back guarantee",
    ],
  },
  premium: {
    title: "Executive Funding Audit — Welcome to the Top!",
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
  const [showAuth, setShowAuth] = useState(false);

  const plan      = (searchParams.get("plan") ?? "free") as Plan;
  const sessionId = searchParams.get("session_id");
  const copy      = PLAN_COPY[plan] ?? PLAN_COPY.free;

  // Already signed in → go straight to dashboard (only when Clerk loads)
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      navigate("/dashboard", { replace: true });
    }
  }, [isLoaded, isSignedIn, navigate]);

  // Don't block rendering on Clerk — show content immediately.
  // If Clerk fails to load (DNS/CORS issues), the page still works.

  // Redirect to Clerk's hosted sign-up page (served directly by Clerk,
  // bypasses any local JS loading issues)
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
        <div className="mb-2 flex items-center justify-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          <span className="text-sm font-medium text-emerald-600">Payment Confirmed</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
          {copy.title}
        </h1>
        <p className="mt-3 max-w-md text-base text-zinc-500">{copy.subtitle}</p>
      </div>

      {/* Feature list */}
      <div className="mb-10 w-full max-w-sm rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm">
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
      </div>

      {/* CTA */}
      <div className="flex w-full max-w-sm flex-col gap-3">
        <button
          onClick={() => setShowAuth(true)}
          className="h-12 w-full rounded-full bg-zinc-900 font-semibold text-white transition-colors hover:bg-zinc-800"
        >
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
    </div>
  );
}
