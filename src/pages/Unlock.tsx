/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * /unlock — universal upgrade destination.
 *
 * Reached from: admin-sent emails to legacy customers, post-grant drip
 * sequences in GHL, dashboard "Upgrade" CTAs, and paid ads. Structure is
 * deliberately conversion-focused:
 *
 *   1. VSL slot (YouTube / Vimeo / custom embed — URL comes from env
 *      via VITE_VSL_EMBED_URL so you can swap without a code change)
 *   2. Social-proof / trust line
 *   3. Three tiers, Premium → Accelerated → DIY (anchor-high pricing)
 *   4. Guarantee + FAQ-lite
 *
 * Reuses UPGRADE_BUY_BUTTONS + STRIPE_PUBLISHABLE_KEY from planAccess so
 * button IDs stay in sync with the rest of the app and env-based tier
 * swapping Just Works.
 */

import React from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, ShieldCheck, Clock, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { UPGRADE_BUY_BUTTONS, STRIPE_PUBLISHABLE_KEY, PLAN_LABEL } from "@/lib/planAccess";
import type { Plan } from "@/types/database";

// VSL video URL — set VITE_VSL_EMBED_URL in Vercel env to the embed URL
// of your hosted video (YouTube, Vimeo, Wistia, etc.). If unset, the
// page renders a graceful "video coming soon" placeholder so the route
// never ships with a broken iframe.
const VSL_EMBED_URL = import.meta.env.VITE_VSL_EMBED_URL as string | undefined;

interface TierConfig {
  plan:     Plan;
  label:    string;
  tagline:  string;
  price:    string;
  cadence:  string;
  fitFor:   string;
  features: string[];
  highlighted?: boolean;
}

// DOM order = visual order. Premium first anchors the price range high so
// Accelerated reads as the sensible middle, DIY as the self-managed
// fallback. Same pattern as the form results page post-commit cabf36a.
const TIERS: TierConfig[] = [
  {
    plan:     "premium",
    label:    "Executive Funding Audit",
    tagline:  "Personal + business credit — comprehensive strategy.",
    price:    "$2,497",
    cadence:  "Priority handling · monthly strategy calls included",
    fitFor:   "Business owners + high-intent buyers who want a full-spectrum personal and business credit strategy with direct access to expert support.",
    features: [
      "Priority document prep",
      "1-on-1 monthly strategy calls",
      "Authorized user tradeline analysis",
      "$50K+ business credit blueprint",
      "SBA & lender-ready positioning",
    ],
  },
  {
    plan:     "standard",
    label:    "Accelerated Audit",
    tagline:  "Professional dispute strategy, executed for you.",
    price:    "$497",
    cadence:  "Full 4-round correction cycle · everything handled for you",
    fitFor:   "People who are serious about fixing their credit and want a done-for-you approach — no research, no paperwork, no follow-up required on your end.",
    features: [
      "Full 4-round credit correction process",
      "Done-for-you dispute handling",
      "Legally-documented submission",
      "Score sequencing strategy",
      "120-day money-back guarantee",
    ],
    highlighted: true,   // Most-common pick — emerald ring to draw the eye
  },
  {
    plan:     "diy",
    label:    "Clean Path DIY Blueprint",
    tagline:  "Understand the process. Take control yourself.",
    price:    "$97",
    cadence:  "Instant access · self-mailing required",
    fitFor:   "People who want to understand the credit correction process and handle it themselves with professional-grade tools.",
    features: [
      "Proven credit correction playbook",
      "Step-by-step checklist",
      "Bureau-specific action guide",
      "Credit-building sequencing map",
      "Lifetime access",
    ],
  },
];

export function Unlock() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white sticky top-0 z-20">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900">
            <ArrowLeft className="h-4 w-4" />
            Clean Path Credit
          </Link>
          <Link to="/login" className="text-sm text-zinc-500 hover:text-zinc-900">Sign in</Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12 sm:py-16 space-y-12 sm:space-y-16">
        {/* 1. Hook + VSL */}
        <section className="text-center max-w-3xl mx-auto">
          <div className="text-xs font-semibold tracking-[0.14em] uppercase text-emerald-600 mb-3">
            Your credit unlock
          </div>
          <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight text-zinc-900 leading-tight mb-4">
            Watch this first, then pick the path that fits your situation.
          </h1>
          <p className="text-zinc-600 text-base sm:text-lg mb-8">
            5 minutes that will change how you think about your credit — and show you exactly what Clean Path does differently.
          </p>

          <div className="relative w-full rounded-2xl overflow-hidden border border-zinc-200 bg-zinc-900 shadow-xl"
               style={{ aspectRatio: "16 / 9" }}>
            {VSL_EMBED_URL ? (
              // Generic iframe so YouTube / Vimeo / Wistia / Loom all work.
              // Host must provide an embed-friendly URL (e.g. youtube.com/embed/ID).
              <iframe
                src={VSL_EMBED_URL}
                title="Clean Path Credit VSL"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-zinc-400">
                <div className="text-center">
                  <div className="text-sm font-semibold uppercase tracking-wider mb-2">Video coming soon</div>
                  <p className="text-xs max-w-xs">Set VITE_VSL_EMBED_URL in Vercel to your hosted video's embed URL.</p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* 2. Trust strip */}
        <section className="flex flex-wrap justify-center gap-6 text-sm text-zinc-600 border-y border-zinc-200 py-4">
          <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-emerald-500" />FCRA + FDCPA grounded</span>
          <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-500" />120-day Accelerated guarantee</span>
          <span className="inline-flex items-center gap-1.5"><Clock   className="h-4 w-4 text-emerald-500" />Most see movement in 30–45 days</span>
        </section>

        {/* 3. Pricing */}
        <section>
          <div className="text-center max-w-2xl mx-auto mb-10">
            <div className="text-xs font-semibold tracking-[0.14em] uppercase text-emerald-600 mb-2">
              Choose your path
            </div>
            <h2 className="text-2xl sm:text-4xl font-semibold text-zinc-900 mb-3">
              Pick the tier that matches where you are.
            </h2>
            <p className="text-zinc-600">
              Every tier works the same laws. The difference is how much we handle for you.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3 items-stretch">
            {TIERS.map((tier) => {
              const buyButtonId = UPGRADE_BUY_BUTTONS[tier.plan];
              const canBuy = Boolean(buyButtonId && STRIPE_PUBLISHABLE_KEY);
              return (
                <div
                  key={tier.plan}
                  className={`flex flex-col rounded-2xl bg-white border p-6 shadow-sm transition-shadow hover:shadow-md ${
                    tier.highlighted
                      ? "border-emerald-300 ring-2 ring-emerald-500/20"
                      : "border-zinc-200"
                  }`}
                >
                  {tier.highlighted && (
                    <div className="mb-2 text-[11px] font-semibold tracking-[0.12em] uppercase text-emerald-700">
                      Most common pick
                    </div>
                  )}
                  <div className="text-sm text-zinc-500 mb-1">{PLAN_LABEL[tier.plan]}</div>
                  <h3 className="text-xl font-semibold text-zinc-900 mb-1">{tier.label}</h3>
                  <p className="text-sm text-zinc-600 mb-4">{tier.tagline}</p>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-3xl font-bold text-zinc-900">{tier.price}</span>
                    <span className="text-xs text-zinc-500">one-time</span>
                  </div>
                  <div className="text-[11px] text-zinc-500 mb-4">{tier.cadence}</div>
                  <hr className="border-zinc-100 my-2" />
                  <p className="text-sm text-zinc-700 mb-3"><strong>Best for:</strong> {tier.fitFor}</p>
                  <ul className="space-y-2 mb-5 text-sm text-zinc-700">
                    {tier.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto">
                    {canBuy ? (
                      // Stripe Buy Button — rendered via createElement so no
                      // type declaration is needed for the custom element.
                      React.createElement("stripe-buy-button", {
                        "buy-button-id":    buyButtonId,
                        "publishable-key":  STRIPE_PUBLISHABLE_KEY,
                      })
                    ) : (
                      <Button disabled variant="outline" className="w-full h-12">
                        Stripe not configured
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-center text-[11px] text-zinc-400 mt-6 max-w-lg mx-auto">
            Every plan is backed by federal consumer protection law. No legitimate credit service can promise a specific score number — we build the plan; you see the movement.
          </p>
        </section>

        {/* 4. Guarantee panel */}
        <section className="rounded-2xl bg-emerald-50/60 border border-emerald-100 p-6 sm:p-8 max-w-3xl mx-auto">
          <div className="flex items-start gap-4">
            <ShieldCheck className="h-8 w-8 text-emerald-600 shrink-0" />
            <div>
              <div className="text-xs font-semibold tracking-[0.14em] uppercase text-emerald-700 mb-2">
                120-day Clean Path promise
              </div>
              <h3 className="text-lg font-semibold text-zinc-900 mb-2">If we don't remove a single item, you don't pay.</h3>
              <p className="text-sm text-zinc-700">
                The Accelerated Audit includes four full rounds of strategically crafted credit corrections over 120 days. If we complete the full cycle and fail to secure the removal of a single inaccurate, unverified, or obsolete item, you receive a full refund. No questions.
              </p>
            </div>
          </div>
        </section>

        {/* 5. Secondary CTA — back to booking */}
        <section className="text-center max-w-2xl mx-auto pb-8">
          <p className="text-sm text-zinc-500 mb-3">Not ready to pick? Start with a free 15-minute credit audit instead.</p>
          <a
            href="https://calendly.com/cleanpathcredit/free-15-min-credit-audit-strategy-call"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 underline underline-offset-2"
          >
            Book the free audit call →
          </a>
        </section>
      </main>
    </div>
  );
}
