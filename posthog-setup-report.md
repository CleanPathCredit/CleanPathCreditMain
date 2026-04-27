<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into the Clean Path Credit project, covering both the server-side Node.js API routes (using `posthog-node`) and the client-side React application (using `posthog-js`).

**Packages installed:** `posthog-node@5.30.6`, `posthog-js@1.372.3`, `@posthog/ai@7.16.13`, `@opentelemetry/sdk-node@0.215.0`, `@opentelemetry/resources@2.7.0`, `@traceloop/instrumentation-google-generativeai@0.26.0`

**Environment variables added** (`.env`):
- `POSTHOG_API_KEY` — server-side key for API routes
- `POSTHOG_HOST` — PostHog ingestion host
- `VITE_POSTHOG_KEY` — client-side key for React app
- `VITE_POSTHOG_HOST` — PostHog ingestion host (Vite-exposed)

**New files created:**
- `src/lib/posthog-server.ts` — shared `posthog-node` client factory for serverless API handlers (flushAt=1, flushInterval=0, enableExceptionAutocapture=true)
- `src/lib/posthog-client.ts` — `posthog-js` browser client initializer with `person_profiles: "identified_only"`
- `src/lib/posthog-otel.ts` — OpenTelemetry setup for Google Gen AI (Gemini) LLM tracing via `PostHogSpanProcessor` + `GenAIInstrumentation`

## Events instrumented

| Event | Description | File |
|---|---|---|
| `purchase_completed` | Fired server-side after a Stripe checkout session is fully processed. Includes plan, amount, Stripe session/customer IDs, and whether user is new. | `api/webhooks/stripe.ts` |
| `user_signed_up` | Fired server-side when Clerk creates a new user profile. Identifies the user with email, name, phone, and initial plan. | `api/webhooks/clerk.ts` |
| `plan_upgraded` | Fired server-side when a user's plan metadata is updated via the Clerk webhook. | `api/webhooks/clerk.ts` |
| `quiz_goal_selected` | Fired client-side when a visitor selects their primary financial goal in Step 1 of the quiz funnel. | `src/components/sections/QuizFunnel.tsx` |
| `quiz_obstacle_selected` | Fired client-side when a visitor selects what is holding their score down in Step 2. | `src/components/sections/QuizFunnel.tsx` |
| `quiz_lead_submitted` | Fired client-side when a visitor submits their contact details in Step 4. Also identifies the lead by email. | `src/components/sections/QuizFunnel.tsx` |
| `quiz_booking_clicked` | Fired client-side when the visitor clicks "Book Now" on Step 5 to schedule a credit strategy session. | `src/components/sections/QuizFunnel.tsx` |
| `welcome_consent_completed` | Fired client-side when a post-purchase visitor checks both consent boxes and clicks "Create My Account". | `src/pages/Welcome.tsx` |
| `dashboard_tab_viewed` | Fired client-side when a signed-in user switches between dashboard tabs (dashboard, vault, masterlist, support). | `src/pages/Dashboard.tsx` |
| `support_message_sent` | Fired client-side when a user sends a message to their credit specialist. | `src/pages/Dashboard.tsx` |
| `resource_download_clicked` | Fired client-side when a user clicks the download button on an unlocked resource in the Resource Library. | `src/pages/Dashboard.tsx` |

**User identification:**
- **Server-side:** `posthog.identify()` is called in the Stripe webhook (after purchase) and the Clerk webhook (on user creation) using the Clerk user ID as `distinctId`.
- **Client-side:** `posthog.identify()` is called in `AuthContext.tsx` once the user's Supabase profile is loaded, linking the browser session to the Clerk user ID. `posthog.reset()` is called on logout.
- **Lead identification:** On quiz lead submission, `posthog.identify()` is called with the visitor's email as `distinctId` to correlate anonymous quiz events with future account creation.

**Error tracking:** `posthog.captureException()` is called in the Stripe webhook handler to capture any errors that occur during PostHog event capture.

---

## LLM analytics (Google Gemini via OpenTelemetry)

`@google/genai` is installed as a project dependency. The OpenTelemetry instrumentation infrastructure is set up and ready — every `generateContent` call will automatically emit a `$ai_generation` event to PostHog once wired in.

**How it works:** `@posthog/ai` provides a `PostHogSpanProcessor` that receives OpenTelemetry `gen_ai.*` spans from `@traceloop/instrumentation-google-generativeai` and converts them into PostHog `$ai_generation` events. No manual capture code is needed — the instrumentation patches the Google Gen AI SDK automatically.

**Captured automatically per LLM call:**
- `$ai_model` — model name (e.g. `gemini-2.5-flash`)
- `$ai_input_tokens` / `$ai_output_tokens` — token counts
- `$ai_latency` — wall-clock latency in seconds
- `$ai_total_cost_usd` — estimated cost (PostHog pricing data)
- `$ai_input` / `$ai_output_choices` — full prompt and response

**To use in a new API route:**

```typescript
import { initPostHogOtel } from '../../src/lib/posthog-otel';
// Must be called at module level, before GoogleGenAI is imported
initPostHogOtel();

import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY! });

// All generateContent calls are now auto-traced to PostHog
const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: 'Your prompt here',
});
```

**To link LLM calls to a specific user**, pass `posthog.distinct_id` as a resource attribute in `posthog-otel.ts`, or use `posthog.withContext({ distinctId: clerkUserId }, ...)` around the `generateContent` call.

**Verify:** After your first Gemini call, check **LLM Analytics → Generations** in PostHog at `https://us.posthog.com/llm-analytics/generations`.

## Next steps

The PostHog MCP server was unavailable at report generation time. Create the **"Analytics basics"** dashboard manually in PostHog with these 5 recommended insights:

1. **Quiz-to-Booking Conversion Funnel** — Funnel: `quiz_goal_selected` → `quiz_lead_submitted` → `quiz_booking_clicked`. Shows where visitors drop off in the sales funnel.

2. **Purchases Over Time** — Trend line of `purchase_completed` events, broken down by `plan` property. Shows revenue momentum and plan mix.

3. **User Signups vs. Purchases** — Trend lines for `user_signed_up` and `purchase_completed` side by side. Gap between lines = free accounts; overlap = paid conversions.

4. **Welcome Consent Completion Rate** — Trend of `welcome_consent_completed`. Drop-offs here signal friction in the post-purchase onboarding flow.

5. **Dashboard Feature Engagement** — Bar chart of `dashboard_tab_viewed` broken down by `tab` property. Shows which features (vault, masterlist, support) clients actually use.

### Agent skill

We've left agent skill folders in your project at `.claude/skills/integration-javascript_node/` and `.claude/skills/llm-analytics-setup/`. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
