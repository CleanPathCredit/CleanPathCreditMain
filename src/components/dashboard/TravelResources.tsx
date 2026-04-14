/**
 * TravelResources — premium travel rewards section of the Master List.
 * Titles are always visible; content is locked until the user purchases a plan.
 */

import React from "react";
import { Lock, CreditCard, BookOpen, Building2, Plane, Banknote } from "lucide-react";

interface TravelResource {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  categoryColor: string;
  icon: React.ReactNode;
  iconBg: string;
  details: string;
}

const TRAVEL_RESOURCES: TravelResource[] = [
  {
    id: "citi-aadvantage",
    title: "Citi® AAdvantage® Platinum Select® World Mastercard®",
    subtitle: "50,000 bonus miles after $2,500 spend in 3 months",
    category: "Travel Card",
    categoryColor: "bg-red-100 text-red-700",
    icon: <CreditCard className="h-6 w-6" />,
    iconBg: "bg-red-50 text-red-500",
    details: "2x miles on AA purchases, dining & gas. No foreign transaction fees. Use for booking award flights to Tokyo and beyond via the AAdvantage program.",
  },
  {
    id: "ihg-rewards",
    title: "IHG One Rewards Premier Credit Card",
    subtitle: "140,000 points after $3,000 spend in 3 months",
    category: "Hotel Card",
    categoryColor: "bg-blue-100 text-blue-700",
    icon: <Building2 className="h-6 w-6" />,
    iconBg: "bg-blue-50 text-blue-500",
    details: "5x on IHG hotels, 3x on dining & gas. Free night each anniversary. No foreign transaction fees. Covers Tokyo Bay InterContinental and ANA InterContinental stays.",
  },
  {
    id: "capital-one-venture",
    title: "Capital One Venture Rewards Credit Card",
    subtitle: "75,000 miles after $4,000 spend in 3 months",
    category: "Travel Card",
    categoryColor: "bg-indigo-100 text-indigo-700",
    icon: <Plane className="h-6 w-6" />,
    iconBg: "bg-indigo-50 text-indigo-500",
    details: "2x miles on every purchase. No foreign transaction fees. Use this card to cover taxes and surcharges that award travel doesn't pay — worth up to $460 in flexible travel credits.",
  },
  {
    id: "charles-schwab-checking",
    title: "Charles Schwab High Yield Investor Checking",
    subtitle: "Unlimited ATM fee rebates worldwide",
    category: "Banking",
    categoryColor: "bg-emerald-100 text-emerald-700",
    icon: <Banknote className="h-6 w-6" />,
    iconBg: "bg-emerald-50 text-emerald-600",
    details: "No account fees, no minimums. Withdraw cash in Tokyo or anywhere with zero ATM fees — Schwab reimburses all ATM charges at month end. Essential for cash-heavy cities.",
  },
  {
    id: "tokyo-free-guide",
    title: '"How I Traveled to Tokyo for Free!" — Full Guide',
    subtitle: "Step-by-step eBook by Brandon Weaver",
    category: "eBook Guide",
    categoryColor: "bg-amber-100 text-amber-700",
    icon: <BookOpen className="h-6 w-6" />,
    iconBg: "bg-amber-50 text-amber-500",
    details: "Complete walkthrough: set up AAdvantage + IHG accounts, hit minimum spend requirements, book award flights via NARITA/HANEDA, pay zero for hotels with IHG points, and cover taxes with Capital One Venture miles.",
  },
];

interface TravelResourcesProps {
  hasAccess: boolean;
}

export function TravelResources({ hasAccess }: TravelResourcesProps) {
  return (
    <section className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-zinc-200 mt-6">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Travel Rewards & Strategies</h2>
        {!hasAccess && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-500">
            <Lock className="h-3 w-3" />
            Purchase to unlock
          </span>
        )}
      </div>
      <p className="text-sm text-zinc-500 mb-6">
        Use these credit cards and strategies to travel for free once your credit is rebuilt.
      </p>

      <div className="flex flex-col gap-3">
        {TRAVEL_RESOURCES.map((r) => (
          <div
            key={r.id}
            className={`flex items-start gap-4 rounded-xl border p-4 transition-colors ${
              hasAccess
                ? "border-zinc-100 bg-zinc-50 hover:border-emerald-200 hover:bg-emerald-50/30 cursor-pointer"
                : "border-zinc-100 bg-zinc-50 cursor-not-allowed"
            }`}
          >
            {/* Icon */}
            <div className={`flex-shrink-0 flex h-11 w-11 items-center justify-center rounded-xl ${r.iconBg}`}>
              {r.icon}
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-0.5">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${r.categoryColor}`}>
                  {r.category}
                </span>
              </div>
              <h3
                className="text-sm font-bold text-zinc-900 leading-snug select-none"
                style={!hasAccess ? { filter: "blur(5px)", userSelect: "none" } : undefined}
              >{r.title}</h3>
              <p className="text-xs text-zinc-500 mt-0.5">{r.subtitle}</p>

              {/* Details — only shown when unlocked */}
              {hasAccess ? (
                <p className="text-xs text-zinc-600 mt-2 leading-relaxed">{r.details}</p>
              ) : (
                <p className="text-xs text-zinc-300 mt-2 select-none" style={{ filter: "blur(4px)" }}>
                  {r.details}
                </p>
              )}
            </div>

            {/* Lock / Access indicator */}
            <div className="flex-shrink-0 mt-0.5">
              {hasAccess ? (
                <span className="text-xs font-medium text-emerald-600">View →</span>
              ) : (
                <Lock className="h-4 w-4 text-zinc-300" />
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
