/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * Trigger logic for the e-book lead-magnet modal.
 *
 * Surfaces:
 *   - Desktop: exit-intent (cursor leaves the viewport top edge) OR
 *              60% scroll, whichever fires first.
 *   - Mobile:  75% scroll. (Exit-intent is meaningless on mobile —
 *              there's no cursor.)
 *
 * Suppression:
 *   - 7-day cookie `cpc_ebook_seen` set when the modal is dismissed
 *     OR after a successful opt-in. Prevents re-prompting the same
 *     visitor across a week.
 *   - Path suppression: never fires on auth, transactional, or
 *     compliance-flow pages where a popup would be confusing or
 *     drop conversion (see SUPPRESSED_PATHS).
 *   - Existing-customer suppression: if Clerk user is signed-in we
 *     don't fire (they already have a relationship with us).
 *
 * Returns a controller the modal component subscribes to.
 */

import { useEffect, useRef, useState } from "react";
import { useUser } from "@clerk/clerk-react";

const SUPPRESSION_COOKIE      = "cpc_ebook_seen";
const SUPPRESSION_DAYS        = 7;
const DESKTOP_SCROLL_TRIGGER  = 0.6;   // 60%
const MOBILE_SCROLL_TRIGGER   = 0.75;  // 75%
const MOBILE_BREAKPOINT_PX    = 768;
const POST_LOAD_DELAY_MS      = 4000;  // don't fire on first 4s — feels spammy

/**
 * Pages where the popup must NOT appear. These are auth flows,
 * compliance-capture flows, transactional pages, and admin areas.
 * Showing a marketing popup on /sms-consent would tank A2P approval
 * conversion; on /unlock it competes with the actual paywall;
 * on /partners it competes with the partner intake form.
 */
const SUPPRESSED_PATHS = [
  "/sms-consent",
  "/partners",
  "/unlock",
  "/upgrade",
  "/welcome",
  "/login",
  "/register",
  "/dashboard",
  "/admin",
  "/terms",
  "/privacy",
];

function isSuppressedPath(pathname: string): boolean {
  return SUPPRESSED_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp("(?:^|; )" + name.replace(/[.$?*|{}()[\]\\/+^]/g, "\\$&") + "=([^;]*)"),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name: string, value: string, days: number): void {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function isMobileViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.innerWidth < MOBILE_BREAKPOINT_PX;
}

export interface EbookPopupController {
  /** True when the modal should be visible. */
  isOpen: boolean;
  /** Why the modal triggered — passed through to the API as `source`. */
  triggerSource: "modal_exit_intent" | "modal_scroll" | null;
  /** Dismiss the modal and set the 7-day suppression cookie. */
  dismiss: () => void;
  /** Mark the opt-in successful — sets the suppression cookie + closes. */
  markSubmitted: () => void;
}

export function useEbookPopup(): EbookPopupController {
  const [isOpen, setIsOpen]               = useState(false);
  const [triggerSource, setTriggerSource] = useState<EbookPopupController["triggerSource"]>(null);
  const { isSignedIn, isLoaded }          = useUser();

  const firedRef = useRef(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Wait for Clerk to load so we don't fire-and-immediately-suppress.
    if (!isLoaded) return;
    // Don't show to signed-in users.
    if (isSignedIn) return;
    // Cookie suppression — already shown in last 7 days.
    if (readCookie(SUPPRESSION_COOKIE)) return;
    // Path suppression — bail early on auth / compliance / transactional pages.
    if (isSuppressedPath(window.location.pathname)) return;

    let postLoadTimer: number | null = null;
    let allowFire = false;

    const fire = (source: NonNullable<EbookPopupController["triggerSource"]>): void => {
      if (firedRef.current) return;
      if (!allowFire) return;
      firedRef.current = true;
      setTriggerSource(source);
      setIsOpen(true);
      // Tear down listeners — once we've fired we don't need them anymore.
      cleanupRef.current?.();
    };

    const onScroll = (): void => {
      const doc          = document.documentElement;
      const scrollTop    = window.scrollY || doc.scrollTop;
      const scrollHeight = doc.scrollHeight - doc.clientHeight;
      if (scrollHeight <= 0) return;
      const ratio        = scrollTop / scrollHeight;
      const threshold    = isMobileViewport() ? MOBILE_SCROLL_TRIGGER : DESKTOP_SCROLL_TRIGGER;
      if (ratio >= threshold) {
        fire("modal_scroll");
      }
    };

    const onMouseLeave = (event: MouseEvent): void => {
      // Exit-intent: cursor moves above the viewport (e.g. heading to
      // the address bar / close button). e.relatedTarget is null when
      // the cursor leaves the document entirely.
      if (event.clientY > 0) return;
      if (event.relatedTarget !== null) return;
      fire("modal_exit_intent");
    };

    // Don't allow firing for the first POST_LOAD_DELAY_MS after mount.
    // Avoids the case where a returning visitor lands deep on a long
    // page (anchor link, browser scroll restoration) and immediately
    // crosses the scroll threshold before they've had a chance to read.
    postLoadTimer = window.setTimeout(() => {
      allowFire = true;
    }, POST_LOAD_DELAY_MS);

    window.addEventListener("scroll", onScroll, { passive: true });
    if (!isMobileViewport()) {
      document.addEventListener("mouseleave", onMouseLeave);
    }

    const cleanup = (): void => {
      if (postLoadTimer !== null) {
        window.clearTimeout(postLoadTimer);
        postLoadTimer = null;
      }
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("mouseleave", onMouseLeave);
    };
    cleanupRef.current = cleanup;
    return cleanup;
  }, [isLoaded, isSignedIn]);

  const dismiss = (): void => {
    writeCookie(SUPPRESSION_COOKIE, "1", SUPPRESSION_DAYS);
    setIsOpen(false);
  };

  const markSubmitted = (): void => {
    // Submitted users get the same 7-day cookie so they aren't
    // re-prompted. (If they want the e-book again they can re-request
    // from the email, where the link is permanent.)
    writeCookie(SUPPRESSION_COOKIE, "1", SUPPRESSION_DAYS);
    setIsOpen(false);
  };

  return { isOpen, triggerSource, dismiss, markSubmitted };
}
