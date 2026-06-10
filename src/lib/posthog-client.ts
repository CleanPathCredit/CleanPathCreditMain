/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * PostHog browser client — lazy-loaded off the critical path.
 *
 * posthog-js is ~185KB (vendor-analytics chunk). Importing it statically put
 * it on the first-paint path of every marketing page, hurting LCP for zero
 * user-visible benefit. Instead, `initPostHog()` schedules a dynamic import
 * on idle (or after a short timeout), and the exported `posthog` facade
 * queues any capture/identify/reset calls made before the real client is
 * ready, then flushes them in order.
 *
 * Trade-off (accepted): visitors who bounce in the first ~1-3s may not
 * record a pageview. Events fired early (e.g. quiz_started) are never lost —
 * they queue and flush on load.
 *
 * Call `initPostHog()` once at app startup (main.tsx).
 * Import `posthog` anywhere in the React app to capture events — the facade
 * exposes the exact methods used across src/ (capture, identify, reset).
 * Server-side analytics use src/lib/posthog-server.ts, not this module.
 */

import type { PostHog } from "posthog-js";

type Pending = (ph: PostHog) => void;

let client: PostHog | null = null;
let scheduled = false;
const queue: Pending[] = [];

function run(fn: Pending): void {
  if (client) {
    fn(client);
  } else {
    queue.push(fn);
  }
}

export const posthog = {
  capture: (event: string, properties?: Record<string, unknown>): void => {
    run((ph) => {
      ph.capture(event, properties);
    });
  },
  identify: (distinctId: string, properties?: Record<string, unknown>): void => {
    run((ph) => {
      ph.identify(distinctId, properties);
    });
  },
  reset: (): void => {
    run((ph) => {
      ph.reset();
    });
  },
};

export function initPostHog(): void {
  if (typeof window === "undefined" || scheduled) return;
  scheduled = true;

  const load = (): void => {
    void import("posthog-js").then(({ default: ph }) => {
      ph.init(import.meta.env.VITE_POSTHOG_KEY as string, {
        api_host:          import.meta.env.VITE_POSTHOG_HOST as string,
        capture_pageview:  true,
        capture_pageleave: true,
        person_profiles:   "identified_only",
      });
      client = ph;
      // Flush events captured before the client was ready, in order.
      queue.splice(0).forEach((fn) => {
        fn(ph);
      });
    });
  };

  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(load, { timeout: 3000 });
  } else {
    window.setTimeout(load, 1500);
  }
}
