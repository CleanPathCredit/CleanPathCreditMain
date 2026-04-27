/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * PostHog OpenTelemetry setup for Google Gen AI (Gemini) tracing.
 *
 * Import and call `initPostHogOtel()` at the top of any Vercel serverless
 * function (api/*.ts) that creates a GoogleGenAI client. It must run before
 * the GoogleGenAI SDK is imported so the instrumentation can patch it.
 *
 * Usage:
 *   import { initPostHogOtel } from '../../src/lib/posthog-otel';
 *   initPostHogOtel();           // call once at module level, not inside handler
 *   const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY! });
 *
 * Every `generateContent` call will automatically emit a `$ai_generation`
 * event to PostHog with model, tokens, latency, and cost.
 *
 * To associate generations with a specific user, pass `posthog.distinct_id`
 * as a resource attribute or set it per-request via the `withContext` wrapper:
 *   import { posthog } from './posthog-server';
 *   posthog.withContext({ distinctId: clerkUserId }, async () => {
 *     await ai.models.generateContent(...);
 *   });
 */

import { NodeSDK } from "@opentelemetry/sdk-node";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { PostHogSpanProcessor } from "@posthog/ai/otel";
import { GenAIInstrumentation } from "@traceloop/instrumentation-google-generativeai";

let _initialized = false;

export function initPostHogOtel(): void {
  if (_initialized) return;
  _initialized = true;

  const sdk = new NodeSDK({
    resource: resourceFromAttributes({
      "service.name": "clean-path-credit-api",
    }),
    spanProcessors: [
      new PostHogSpanProcessor({
        apiKey:  process.env.POSTHOG_API_KEY!,
        host:    process.env.POSTHOG_HOST,
      }),
    ],
    instrumentations: [new GenAIInstrumentation()],
  });

  sdk.start();
}
