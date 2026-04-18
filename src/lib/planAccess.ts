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
    heading: "We handle every step for you",
    body:    "Upgrade to Accelerated Audit and we'll manage all 4 rounds of the done-for-you dispute process — you don't lift a finger.",
    cta:     "Get Done-For-You Results →",
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
    heading: "Credit Correction Playbook",
    body:    "Unlock the professional playbook used to remove collections, late payments, and more.",
    cta:     "Get the Playbook →",
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

// Stripe client-side identifiers (audit finding C-5). These are all safe to
// expose — publishable keys and Buy Button IDs are public by design — but
// hardcoding them ties the repo to one Stripe account and blocks test-mode
// previews. Driven by Vite env vars so prod/preview can swap without code
// changes; consumers must handle missing values (PlanGate falls back to a
// plain CTA link when a Buy Button ID is absent).
export const STRIPE_PUBLISHABLE_KEY: string =
  (import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined) ?? "";

const BUY_BUTTON_ENV: Record<"diy" | "standard" | "premium", string | undefined> = {
  diy:      import.meta.env.VITE_STRIPE_BUY_BUTTON_DIY      as string | undefined,
  standard: import.meta.env.VITE_STRIPE_BUY_BUTTON_STANDARD as string | undefined,
  premium:  import.meta.env.VITE_STRIPE_BUY_BUTTON_PREMIUM  as string | undefined,
};

export const UPGRADE_BUY_BUTTONS: Partial<Record<Plan, string>> = Object.fromEntries(
  Object.entries(BUY_BUTTON_ENV).filter(([, id]) => Boolean(id)),
) as Partial<Record<Plan, string>>;
