/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * /welcome — post-purchase landing page.
 *
 * Stripe Buy Buttons (on cleanpathcredit.com AND form.cleanpathcredit.com)
 * redirect here after checkout:
 *   https://cleanpathcredit.com/welcome?plan=standard&session_id=cs_xxx
 *
 * Flow:
 *   1. Already signed in → go straight to /dashboard.
 *   2. Has session_id → call /api/welcome/auto-signin, exchange the ticket
 *      for a Clerk session, drop the user into /dashboard signed-in.
 *      No sign-up form, no password reset, no email verification round-trip.
 *   3. No session_id (someone hit /welcome directly) → show the legacy
 *      "Create My Account" CTA that sends them to Clerk's hosted sign-up.
 */

import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useUser, useSignIn } from "@clerk/clerk-react";
import { CheckCircle2, Star, Zap, Shield, Loader2, AlertCircle } from "lucide-react";
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
    subtitle: "You now have everything you need to dispute negative items yourself.",
    icon: <Zap className="h-8 w-8" />,
    color: "text-emerald-600",
    features: [
      "609 & 623 dispute letter templates",
      "Round-by-round mailing guide",
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
      "Done-for-you 4-round dispute system",
      "Certified mail included",
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

type Phase = "idle" | "signing-in" | "done" | "manual" | "error";

export function Welcome() {
  const [searchParams]             = useSearchParams();
  const navigate                   = useNavigate();
  const { isSignedIn, isLoaded }   = useUser();
  const { signIn, setActive, isLoaded: signInLoaded } = useSignIn();

  const plan      = (searchParams.get("plan") ?? "free") as Plan;
  const sessionId = searchParams.get("session_id");
  const copy      = PLAN_COPY[plan] ?? PLAN_COPY.free;

  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);

  // Already signed in → straight to dashboard.
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      navigate("/dashboard", { replace: true });
    }
  }, [isLoaded, isSignedIn, navigate]);

  // Auto-sign-in bridge: session_id in URL + not signed in + Clerk ready
  // → fetch ticket → activate Clerk session → redirect to dashboard.
  useEffect(() => {
    if (!isLoaded || isSignedIn) return;
    if (!signInLoaded || !signIn || !setActive) return;
    if (!sessionId) return;
    if (phase !== "idle") return;

    let cancelled = false;

    async function run() {
      setPhase("signing-in");
      try {
        // 1. Swap session_id for a Clerk ticket
        const res = await fetch(
          `/api/welcome/auto-signin?session_id=${encodeURIComponent(sessionId!)}`,
        );
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }
        const { token } = (await res.json()) as { token: string };
        if (cancelled) return;

        // 2. Exchange ticket for a Clerk session
        const attempt = await signIn!.create({ strategy: "ticket", ticket: token });
        if (cancelled) return;

        if (attempt.status !== "complete" || !attempt.createdSessionId) {
          throw new Error(`Unexpected sign-in status: ${attempt.status}`);
        }

        // 3. Activate the session and go to dashboard
        await setActive!({ session: attempt.createdSessionId });
        if (cancelled) return;
        setPhase("done");
        navigate("/dashboard", { replace: true });
      } catch (err) {
        if (cancelled) return;
        console.error("[/welcome] auto-signin failed:", err);
        setError(err instanceof Error ? err.message : "Sign-in failed");
        setPhase("error");
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, signInLoaded, signIn, setActive, sessionId, phase, navigate]);

  // Someone who hit /welcome without a session_id: legacy manual path
  const goToClerkSignup = () => {
    const redirectUrl = encodeURIComponent("https://cleanpathcredit.com/dashboard");
    window.location.href = `https://accounts.cleanpathcredit.com/sign-up?redirect_url=${redirectUrl}`;
  };

  const showAutoSigninSpinner = phase === "signing-in" || phase === "done";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-zinc-50 to-white px-4 py-16">
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

      <div className="flex w-full max-w-sm flex-col gap-3">
        {showAutoSigninSpinner && (
          <div className="flex items-center justify-center gap-3 rounded-full bg-zinc-900 px-6 py-3 text-white">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm font-medium">Setting up your dashboard...</span>
          </div>
        )}

        {phase === "error" && (
          <>
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-left">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" />
              <p className="text-xs text-amber-800">
                We couldn&apos;t sign you in automatically
                {error ? ` (${error})` : ""}. No worries — create your account below
                using the same email and everything will sync up.
              </p>
            </div>
            <button
              onClick={goToClerkSignup}
              className="h-12 w-full rounded-full bg-zinc-900 font-semibold text-white transition-colors hover:bg-zinc-800"
            >
              Create My Account &amp; Access Dashboard →
            </button>
          </>
        )}

        {phase === "idle" && !sessionId && (
          <>
            <button
              onClick={goToClerkSignup}
              className="h-12 w-full rounded-full bg-zinc-900 font-semibold text-white transition-colors hover:bg-zinc-800"
            >
              Create My Account &amp; Access Dashboard →
            </button>
            <p className="text-center text-xs text-zinc-400">
              Already have an account?{" "}
              <a href="/login" className="text-emerald-600 hover:underline">Sign in</a>
            </p>
          </>
        )}

        {sessionId && (
          <p className="text-center text-xs text-zinc-300">
            Order #{sessionId.slice(-8).toUpperCase()}
          </p>
        )}
      </div>
    </div>
  );
}
