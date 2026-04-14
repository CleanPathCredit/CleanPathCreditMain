/**
 * MasterList — curated credit-building resources grid.
 * Shown blurred behind PlanGate for non-paying users.
 */

import React from "react";
import {
  CreditCard, FileText, Scale, BookOpen, TrendingUp, Shield, Landmark, FileSearch, Zap, Gavel,
} from "lucide-react";

type ResourceCategory = "Secured Card" | "Credit Builder" | "PDF Guide" | "Legal Guide" | "Strategy";

interface Resource {
  id: string;
  title: string;
  description: string;
  category: ResourceCategory;
  icon: React.ReactNode;
  iconBg: string;
  badge: string;
}

const RESOURCES: Resource[] = [
  {
    id: "discover-secured",
    title: "Discover it® Secured Card",
    description: "Best no-annual-fee secured card. Earns 2% cash back, automatically reviewed for upgrade to unsecured after 7 months. Reports to all 3 bureaus.",
    category: "Secured Card",
    icon: <CreditCard className="h-8 w-8" />,
    iconBg: "bg-orange-50 text-orange-500",
    badge: "Top Pick",
  },
  {
    id: "capital-one-secured",
    title: "Capital One Platinum Secured",
    description: "Low deposit options starting at $49. One of the easiest approval paths for thin or damaged credit. No annual fee and no foreign transaction fees.",
    category: "Secured Card",
    icon: <CreditCard className="h-8 w-8" />,
    iconBg: "bg-blue-50 text-blue-500",
    badge: "Low Deposit",
  },
  {
    id: "opensky-secured",
    title: "OpenSky® Secured Visa®",
    description: "No credit check required — zero hard pull on your report. Ideal for clients with serious derogatory marks or recent bankruptcy. Reports monthly.",
    category: "Secured Card",
    icon: <CreditCard className="h-8 w-8" />,
    iconBg: "bg-sky-50 text-sky-500",
    badge: "No Hard Pull",
  },
  {
    id: "chime-credit-builder",
    title: "Chime Credit Builder Visa®",
    description: "Zero interest, zero fees, zero minimum deposit. Linked to your Chime checking account. One of the fastest ways to build on-time payment history.",
    category: "Credit Builder",
    icon: <Zap className="h-8 w-8" />,
    iconBg: "bg-emerald-50 text-emerald-600",
    badge: "Zero Fees",
  },
  {
    id: "self-credit-builder",
    title: "Self Credit Builder Account",
    description: "Installment loan that reports to all 3 bureaus as on-time payments. At the end you receive the saved funds. Starting at $25/mo — perfect for thin files.",
    category: "Credit Builder",
    icon: <TrendingUp className="h-8 w-8" />,
    iconBg: "bg-violet-50 text-violet-500",
    badge: "3 Bureau Reporting",
  },
  {
    id: "tax-lien-guide",
    title: "How to Remove a Tax Lien",
    description: "Step-by-step IRS Form 12277 process. Includes exact language for the withdrawal request and how to dispute the removed lien from all 3 credit bureaus.",
    category: "PDF Guide",
    icon: <Landmark className="h-8 w-8" />,
    iconBg: "bg-amber-50 text-amber-500",
    badge: "PDF Guide",
  },
  {
    id: "fcra-legal-glossary",
    title: "Legal/Lawsuit Glossary",
    description: "Complete FCRA, FDCPA, and FCBA violation reference. Lists exact fines ($100–$1,000 per violation) and case citations you can use in dispute letters.",
    category: "Legal Guide",
    icon: <Scale className="h-8 w-8" />,
    iconBg: "bg-red-50 text-red-500",
    badge: "Legal Reference",
  },
  {
    id: "sue-without-lawyer",
    title: "How to Sue Creditors Without a Lawyer",
    description: "Exact steps to file in small claims and federal court under the FDCPA. Collectors who violate your rights owe you $1,000+ in statutory damages.",
    category: "Legal Guide",
    icon: <Gavel className="h-8 w-8" />,
    iconBg: "bg-rose-50 text-rose-500",
    badge: "Legal Strategy",
  },
  {
    id: "dispute-tracker-preview",
    title: "Dispute Round Tracker",
    description: "Printable and digital tracker for all 4 dispute rounds. Logs bureau responses, deletion confirmations, and certified mail tracking numbers.",
    category: "PDF Guide",
    icon: <FileSearch className="h-8 w-8" />,
    iconBg: "bg-teal-50 text-teal-500",
    badge: "Tracker Sheet",
  },
  {
    id: "rapid-rescore",
    title: "Rapid Rescore Strategy Guide",
    description: "Insider tactic used by mortgage brokers. Request urgent credit rescores through lenders to reflect deletions in 3–5 days instead of 30–45 days.",
    category: "Strategy",
    icon: <Shield className="h-8 w-8" />,
    iconBg: "bg-indigo-50 text-indigo-500",
    badge: "Insider Tactic",
  },
];

const CATEGORY_COLORS: Record<ResourceCategory, string> = {
  "Secured Card":   "bg-blue-100 text-blue-700",
  "Credit Builder": "bg-emerald-100 text-emerald-700",
  "PDF Guide":      "bg-amber-100 text-amber-700",
  "Legal Guide":    "bg-red-100 text-red-700",
  "Strategy":       "bg-indigo-100 text-indigo-700",
};

export function MasterList() {
  return (
    <section className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-zinc-200">
      <h2 className="text-xl font-bold text-zinc-900 mb-1 tracking-tight">The Master Financial List</h2>
      <p className="text-sm text-zinc-500 mb-6">
        10 curated resources our clients use to rebuild credit fast — secured cards, legal tools, and insider strategies.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {RESOURCES.map((r) => (
          <div
            key={r.id}
            className="relative flex flex-col rounded-xl border border-zinc-100 bg-zinc-50 p-5 hover:shadow-md transition-shadow"
          >
            {/* Icon */}
            <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${r.iconBg}`}>
              {r.icon}
            </div>

            {/* Badge */}
            <span className={`mb-2 inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${CATEGORY_COLORS[r.category]}`}>
              {r.badge}
            </span>

            {/* Content */}
            <h3 className="text-sm font-bold text-zinc-900 mb-1">{r.title}</h3>
            <p className="text-xs text-zinc-500 leading-relaxed flex-1">{r.description}</p>

            {/* CTA row */}
            <div className="mt-4 flex items-center gap-2">
              <span className="text-xs font-medium text-emerald-600">View Resource →</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
