/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * PostHog browser client initializer.
 * Call `initPostHog()` once at app startup (main.tsx).
 * Import `posthog` anywhere in the React app to capture events.
 */

import posthog from "posthog-js";

export function initPostHog(): void {
  if (typeof window === "undefined") return;
  posthog.init(import.meta.env.VITE_POSTHOG_KEY as string, {
    api_host:            import.meta.env.VITE_POSTHOG_HOST as string,
    capture_pageview:    true,
    capture_pageleave:   true,
    person_profiles:     "identified_only",
  });
}

export { posthog };
