/**
 * PlanGate — wraps any dashboard section with a lock overlay when the
 * user's plan doesn't include the required feature.
 *
 * Usage:
 *   <PlanGate feature="dispute_tracker" plan={profile?.plan}>
 *     <DisputeTracker />
 *   </PlanGate>
 */

import React from "react";
import { Lock, Zap } from "lucide-react";
import { canAccess, UPGRADE_COPY, UPGRADE_TARGET, UPGRADE_BUY_BUTTONS, STRIPE_PUBLISHABLE_KEY } from "@/lib/planAccess";
import type { Feature } from "@/lib/planAccess";
import type { Plan } from "@/types/database";

interface PlanGateProps {
  feature: Feature;
  plan: Plan | null | undefined;
  children: React.ReactNode;
  /** Optional override: blur the children instead of hiding completely */
  blurChildren?: boolean;
  /** Use a lighter blur so content is more visible (e.g. dispute tracker) */
  lightBlur?: boolean;
}

export function PlanGate({ feature, plan, children, blurChildren = true, lightBlur = false }: PlanGateProps) {
  const currentPlan   = (plan ?? "free") as Plan;
  const hasAccess     = canAccess(currentPlan, feature);
  const copy          = UPGRADE_COPY[feature];
  const upgradePlan   = UPGRADE_TARGET[currentPlan];
  const buyButtonId   = upgradePlan ? UPGRADE_BUY_BUTTONS[upgradePlan] : null;

  if (hasAccess) return <>{children}</>;

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Blurred preview of actual content — visible but not readable */}
      {blurChildren && (
        <div
          className="pointer-events-none select-none"
          style={lightBlur
            ? { filter: "blur(1px)", opacity: 0.82 }
            : { filter: "blur(3px)", opacity: 0.65 }}
        >
          {children}
        </div>
      )}

      {/* Gradient overlay — transparent at top so cards are visible, fades to white at bottom where CTA sits */}
      <div className={`${blurChildren ? "absolute inset-0" : ""} flex flex-col items-end justify-end rounded-2xl border border-zinc-200 text-center min-h-[240px]`}
           style={blurChildren ? { background: "linear-gradient(to bottom, transparent 0%, transparent 35%, rgba(255,255,255,0.92) 60%, #ffffff 80%)" } : { background: "#ffffff", padding: "2rem" }}>
        <div className="w-full flex flex-col items-center pb-8 px-8">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100">
          <Lock className="h-6 w-6 text-zinc-400" />
        </div>
        <h3 className="text-lg font-bold text-zinc-900 mb-2">{copy.heading}</h3>
        <p className="text-sm text-zinc-500 max-w-xs mb-6">{copy.body}</p>

        {buyButtonId ? (
          <div className="flex flex-col items-center gap-3">
            {/* Stripe Buy Button for inline upgrade */}
            <div dangerouslySetInnerHTML={{
              __html: `<stripe-buy-button
                buy-button-id="${buyButtonId}"
                publishable-key="${STRIPE_PUBLISHABLE_KEY}"
              ></stripe-buy-button>`
            }} />
            <p className="text-xs text-zinc-400">Instant access after checkout</p>
          </div>
        ) : (
          <a
            href="https://form.cleanpathcredit.com"
            className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white hover:bg-zinc-800 transition-colors"
          >
            <Zap className="h-4 w-4" />
            {copy.cta}
          </a>
        )}
        </div>
      </div>
    </div>
  );
}
