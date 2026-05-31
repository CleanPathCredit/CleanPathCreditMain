/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * Typed wrappers around the Meta Pixel `fbq` global initialized in
 * index.html. The Pixel base code is loaded conditionally — if
 * VITE_META_PIXEL_ID is unset or doesn't match `^\d+$`, the snippet
 * skips initialization and `window.fbq` is undefined. These helpers
 * fail silently in that case so call sites can fire events without
 * a guard.
 *
 * Browser-side events MUST share the same `eventID` as their CAPI
 * counterpart so Meta deduplicates the pair. See:
 *   - api/webhooks/stripe.ts → fireMetaCapiPurchase (event_id = session.id)
 *   - api/lead.ts            → fireMetaCapiLead     (event_id = lead-...)
 */

type FbqFn = (...args: unknown[]) => void;

declare global {
  interface Window {
    fbq?: FbqFn;
  }
}

function fbqAvailable(): FbqFn | null {
  if (typeof window === "undefined") return null;
  return typeof window.fbq === "function" ? window.fbq : null;
}

/**
 * Standard event — Meta has built-in attribution + reporting for these
 * names (Purchase, Lead, CompleteRegistration, etc.). Use
 * `trackCustom` for anything outside the standard set.
 */
export function trackStandard(
  eventName: string,
  params?: Record<string, unknown>,
  options?: { eventID?: string },
): void {
  const fbq = fbqAvailable();
  if (!fbq) return;
  if (options?.eventID) {
    fbq("track", eventName, params ?? {}, { eventID: options.eventID });
  } else {
    fbq("track", eventName, params ?? {});
  }
}

/** Custom event — surfaces in Ads Manager but no automatic optimization. */
export function trackCustom(
  eventName: string,
  params?: Record<string, unknown>,
  options?: { eventID?: string },
): void {
  const fbq = fbqAvailable();
  if (!fbq) return;
  if (options?.eventID) {
    fbq("trackCustom", eventName, params ?? {}, { eventID: options.eventID });
  } else {
    fbq("trackCustom", eventName, params ?? {});
  }
}
