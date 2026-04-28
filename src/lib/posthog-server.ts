/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * Shared PostHog Node.js client for server-side API handlers.
 *
 * These are Vercel serverless functions (short-lived), so we configure
 * flushAt=1 and flushInterval=0 to send events immediately without batching.
 * Always call `await posthog.shutdown()` before returning from a handler.
 */

import { PostHog } from "posthog-node";

export function createPostHogClient(): PostHog {
  return new PostHog(process.env.POSTHOG_API_KEY!, {
    host: process.env.POSTHOG_HOST,
    flushAt: 1,
    flushInterval: 0,
    enableExceptionAutocapture: true,
  });
}
