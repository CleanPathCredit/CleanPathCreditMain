/**
 * Plan access logic — single source of truth for feature gating.
 * Import `canAccess` wherever you need to check permissions.
 */

import type { Plan } from "@/types/database";

export type Feature =
  | "dispute_tracker"   // Live admin-managed dispute progress
  | "document_vault"    // Upload ID/SSN/credit reports to us
  | "master_list"       // Curated credit-building tools
  | "support_chat"      // Direct specialist messaging
  | "diy_templates"     // 609/623 dispute letter templates
  | "all_guides"        // Full resource library
  | "credit_score"      // Simulated credit score widget (all tiers)
  | "basic_guides"      // 2 free educational resources
  | "strategy_calls";   // Monthly 1-on-1 calls (premium only)

/** Which plans unlock each feature (left = lowest that qualifies). */
const ACCESS_MAP: Record<Feature, Plan[]> = {
  credit_score:    ["free", "diy", "standard", "premium"],
  basic_guides:    ["free", "diy", "standard", "premium"],
  diy_templates:   ["diy",  "standard", "premium"],
  all_guides:      ["diy",  "standard", "premium"],
  master_list:     ["diy",  "standard", "premium"],
  dispute_tracker: ["standard", "premium"],
  document_vault:  ["standard", "premium"],
  support_chat:    ["standard", "premium"],
  strategy_calls:  ["premium"],
};

export function canAccess(plan: Plan | null | undefined, feature: Feature): boolean {
  return ACCESS_MAP[feature].includes((plan ?? "free") as Plan);
}

/** Human-readable plan label */
export const PLAN_LABEL: Record<Plan, string> = {
  free:     "Free",
  diy:      "DIY Blueprint",
  standard: "Accelerated Audit",
  premium:  "Executive Funding",
};

/** The upgrade target for a given plan */
export const UPGRADE_TARGET: Record<Plan, Plan | null> = {
  free:     "standard",
  diy:      "standard",
  standard: "premium",
  premium:  null,
};

/** CTA copy shown in upgrade prompts per feature */
export const UPGRADE_COPY: Record<Feature, { heading: string; body: string; cta: string }> = {
  dispute_tracker: {
    heading: "We handle every dispute for you",
    body:    "Upgrade to Accelerated Audit and we'll manage all 4 rounds of disputes, including certified mail.",
    cta:     "Get Done-For-You Disputes →",
  },
  document_vault: {
    heading: "Secure document upload required",
    body:    "Your Accelerated Audit includes a private encrypted vault to send us your ID and SSN card.",
    cta:     "Upgrade to Unlock →",
  },
  master_list: {
    heading: "Your personalized financial master list",
    body:    "Unlock the curated list of secured cards, credit-builder tools, and lender shortcuts our clients use.",
    cta:     "Unlock the Master List →",
  },
  support_chat: {
    heading: "Direct access to your specialist",
    body:    "Upgrade to message your credit specialist directly and get real-time updates on your case.",
    cta:     "Unlock Specialist Chat →",
  },
  diy_templates: {
    heading: "609 & 623 dispute letter templates",
    body:    "Unlock professional dispute letter templates used to remove collections, late payments, and more.",
    cta:     "Get the Templates →",
  },
  all_guides: {
    heading: "Full resource library",
    body:    "Access every guide, cheatsheet, and action plan in the Clean Path library.",
    cta:     "Unlock Everything →",
  },
  strategy_calls: {
    heading: "Monthly strategy calls",
    body:    "Upgrade to Executive Funding for monthly 1-on-1 calls and a business credit blueprint.",
    cta:     "Go Premium →",
  },
  credit_score:  { heading: "", body: "", cta: "" },
  basic_guides:  { heading: "", body: "", cta: "" },
};

/** Stripe Buy Button IDs — used in upgrade CTAs */
export const UPGRADE_BUY_BUTTONS: Partial<Record<Plan, string>> = {
  diy:      "buy_btn_1TKC9sCRvEfUoJHH2j25qlzl",
  standard: "buy_btn_1TKCHQCRvEfUoJHHRsYycHRA",
  premium:  "buy_btn_1TKCDdCRvEfUoJHHwJwoLyj9",
};

// Read from Vite env so rotation doesn't require a code change.
// pk_live_ / pk_test_ keys are designed to be public-safe, but keeping them
// out of source keeps rotation, staging/prod splits, and audit trails clean.
export const STRIPE_PUBLISHABLE_KEY =
  (import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined) ?? "";

if (!STRIPE_PUBLISHABLE_KEY && import.meta.env.PROD) {
  // Fail loud in production so a misconfigured deploy can't silently ship a
  // broken Stripe Buy Button.
  // eslint-disable-next-line no-console
  console.error("VITE_STRIPE_PUBLISHABLE_KEY is not set — Stripe buy buttons will not render.");
}
