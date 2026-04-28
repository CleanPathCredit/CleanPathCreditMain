# Session Log — Letter system, audit P0s, compliance pass

**Period:** 2026-04-26 → 2026-04-28
**Repos touched:** `cleanpathcredit/cleanpathcreditmain`, `cleanpathcredit/cleanpathcreditfreeanalysisform`

This document captures everything that landed across the 9-PR work cycle that rebuilt the dispute-letter system, swept compliance copy, and unblocked CI. Use it as the cold-start brief for a fresh chat session.

---

## Summary of what shipped

### `cleanpathcreditmain` — 6 PRs merged

| PR | Branch | Theme | Squash SHA |
|----|--------|-------|------------|
| #4 | `claude/add-turnstile-honeypot-pWQ0L` | 5 weeks of dashboard/admin/funnel work that had never been PRed (turnstile, onboarding wizard, admin preview toolbar, credit-report parser, referrals, GHL contacts API, lead leaderboard, AI-drafted email, /unlock VSL, PostHog) + last-minute swap of OpenRouter → direct Anthropic SDK for the AI calls that touch PII (credit-report parser, admin email drafter) | `b4a1d8f` |
| #5 | `claude/fix-api-empty-content-sePyK` | Full FCRA dispute-letter system: 5 React-PDF templates (609 R1-R4, 611), migration 005, admin Letters UI, generate API with Clerk auth + admin gate, CROA 3-day hold, client-facing DisputeLettersPanel with plan gating, Stripe webhook round-payment branch, Resend "letters ready" email | `071bb60` |
| #6 | `claude/audit-p0-fixes-sePyK` | TS easing fix in `Details.tsx` (`steps(1)` → stepped-keyframe equivalent) — unblocked `npm run lint` after PR #4 brought the broken code to main | `f75d4e4` |
| #7 | `claude/letters-stripe-checkout-sePyK` | `POST /api/letters/checkout` creates a Stripe Checkout Session pre-tagged with `metadata.letter_round_id`. Closes the loop on the round-payment gate. Admin "Copy payment link" + client "Pay for Round N" UI surfaces | `ce2be6d` |
| #8 | `claude/compliance-copy-sweep-sePyK` | CROA-aligned copy sweep across Hero/Welcome/Unlock/Methodology/QuizFunnel/Proof. Full Terms.tsx rewrite. Per-round-after-completion billing model. Generate API gate softened to allow perform-then-charge | `fcf1840` |
| (this) | `claude/session-log-and-followups-sePyK` | Session log + small post-smoke-test fixes |  |

### `cleanpathcreditfreeanalysisform` — 1 PR merged

| PR | Branch | Theme | Squash SHA |
|----|--------|-------|------------|
| #4 | `claude/audit-p0-fixes-sePyK` | Funnel-form blocking-submit + inline error UI. Fixed silent lead-loss bug where the form redirected to results regardless of `/api/submit` success. Also extracted ~700 lines of inline `<script>` into `quiz.js` (precondition for being able to push the change via the GitHub API; side-benefit: browser cache, easier diff review) | `068a836` |

---

## The dispute-letter system — architecture as it stands today

### Tables (Supabase, all RLS-enabled)

| Table | Purpose | Migration |
|---|---|---|
| `letter_rounds` | One row per (profile, round_number, letter_type). Tracks payment, drafting, notary, dispatch state | 005 |
| `bureau_reports` | One row per (round, bureau). Source credit report for that bureau in that round | 005 |
| `creditors` | Per-profile furnisher directory used by 623 letters | 005 |
| `negative_items` | The actual disputed accounts. One row per item per bureau report | 005 |
| `letter_packets` | Generated PDF references, versioned, owner+admin RLS | 005 |

`documents.category` enum was extended to include `dispute_letter`, `bureau_response`, `notarized_letter`.

### Letter templates (`@react-pdf/renderer`)

| File | Letter | Notarized? |
|---|---|---|
| `Letter609Round1.tsx` | Verifiable-proof demand under §609(a)(1)(A) | ✅ |
| `Letter609Round2.tsx` | Second written request, §611(a)(1)(A) + §617 escalation | ✅ |
| `Letter609Round3.tsx` | Third written request and final warning, §616/§617 | ✅ |
| `Letter609Round4.tsx` | NOTICE OF PENDING LITIGATION + offer of settlement | ✅ |
| `Letter611.tsx` | Per-item dispute under §611, conversational | ❌ |
| `Letter623.tsx` | **NOT YET BUILT** — pending the user's screenshot | ❌ (no notary; goes to creditor not bureau) |

Shared components: `LetterShell` (header + footer), `DisputeTable`, `NotaryPage`, `styles.ts`. Pure logic in `src/lib/letters/`: `bureaus.ts` (dispute addresses), `filtering.ts` (`isDisputable`, `groupByBureau`), `croaHold.ts` (3-business-day cancellation hold helper), `types.ts`.

### API endpoints

| Endpoint | Auth | Purpose |
|---|---|---|
| `POST /api/letters/generate` | Clerk JWT + admin role | Renders PDFs for every bureau on a round, uploads to Supabase Storage, creates `letter_packets` rows, advances round status, fires Resend email for DIY plan |
| `POST /api/letters/checkout` | Clerk JWT + admin OR round-owner | Creates a Stripe Checkout Session with `metadata.letter_round_id`. URL is copied by admin (paste into email/SMS) or directly opened by client |
| `POST /api/webhooks/stripe` (existing, extended) | Stripe signature | Round-payment branch detects `metadata.letter_round_id` and flips `letter_rounds.payment_cleared_at` |

### Flow (per CROA-safe operating procedure)

1. Customer signs up free (creates Clerk user + `profiles` row via Clerk webhook)
2. Admin creates `letter_round` for them (initially `pending_payment`)
3. CROA 3-business-day hold runs from `profiles.created_at` (Round 1 only)
4. Admin enters negative items per bureau in `/admin/letters`
5. Admin clicks **Generate (bill after)** → API renders PDFs, stores them, advances round to `letters_generated`
6. Admin notarizes (if 609) and mails certified return-receipt
7. Admin clicks **Copy payment link** → pastes Stripe URL into outreach (email/SMS)
8. Customer pays via Stripe checkout → webhook flips `payment_cleared_at`
9. Round complete; round 2 starts the cycle over (no CROA hold on rounds 2+)

For DIY clients: client gets a "letters ready" Resend email after step 5; clicks through to `/dashboard` → `Dispute Letters` tab → downloads packets via signed URLs; client pays via "Pay for Round N" button on the same panel.

### Compliance shape (post PR #8)

- **Per-round-after-completion billing.** TSR §310.4(a)(2) safe.
- **No outcome guarantees** anywhere in user-facing copy (CROA §404(c) compliant).
- **Verbatim CROA 3-day cancellation language** in Terms §18 (statute-required, not paraphrased).
- **FTC Endorsement Guides disclaimer** above testimonials.
- **`/api/letters/generate` is admin-only.** Customers cannot self-generate.
- **SSN handling:** vault `ssn_secret_id` on profiles (pgsodium). Discarded on service end via TODO retention job.
- **Clerk + Supabase RLS:** every new table has owner-or-admin SELECT, service-role-only writes.

---

## Operational checklist — what needs to be configured outside the code

### Required Vercel env vars

```
ANTHROPIC_API_KEY               (credit-report parser + admin email drafter)
RESEND_API_KEY                  (DIY letters-ready notifications)
STRIPE_LETTER_ROUND_PRICE_ID    (per-round Stripe Price ID — required for /api/letters/checkout)
```

Optional:

```
RESEND_FROM                     (default: Clean Path Credit <noreply@cleanpathcredit.com>)
APP_URL                         (default: https://cleanpathcredit.com)
ANTHROPIC_CREDIT_PARSER_MODEL   (default: claude-sonnet-4-6)
ANTHROPIC_DRAFT_EMAIL_MODEL     (default: claude-haiku-4-5)
```

### Stripe setup

1. Create a Product called something like "Letter round" in Stripe Dashboard → Products
2. Add a Price (one-time, USD) for the per-round amount
3. Copy the Price ID (starts with `price_`) into `STRIPE_LETTER_ROUND_PRICE_ID`
4. Webhook endpoint should already be configured at `/api/webhooks/stripe` — same one handles plan-purchase and round-payment events via the `metadata.letter_round_id` discriminator

### Resend setup

1. Verify your sending domain in Resend dashboard (otherwise emails go to spam)
2. Default sender is `Clean Path Credit <noreply@cleanpathcredit.com>` — must match the verified domain

### Migrations applied (all live on Supabase)

001-005 + 010-014. Numbering note: `005_dispute_letters.sql` (this branch's letter system) and the originally-named `005_lead_submissions.sql` (turnstile branch) collided during the merge. The lead-submissions one was renumbered to 010 and the rest of turnstile's 006-009 were shifted to 011-014. The 011 (rename readiness→urgency) was a no-op when applied because the table was created with the new column names directly.

### GitHub secret-scanning alerts (still open as of last check)

- **Stripe webhook signing secret** in `.env.example:23` — false positive (placeholder `whsec_xxxxxxxxxxxx`, not a real secret). Dismiss as "false positive" in GitHub UI.
- **Google API Key** (Firebase Web API Key) in `firebase-applet-config.json:4` — real, in git history from the pre-Clerk era. Firebase Web API Keys are designed to be public, but verify the project (`leadsgorilla360-337519`) is fully decommissioned in Firebase console, then dismiss.

---

## What's still on the backlog

In rough priority:

### Immediate next steps for the user (out-of-codebase)

1. **Visual smoke-test of production** — confirm the post-#8 deploy renders correctly. Punch list lives in chat history; main checks: Hero has no "guaranteed" banner, Unlock has new "process commitment" panel, Terms has the verbatim CROA cancellation language at §18.
2. **Set Vercel env vars** (above)
3. **Create the Stripe Price for the letter round** + put the Price ID in `STRIPE_LETTER_ROUND_PRICE_ID`
4. **Verify Texas CSO registration status** with TX SOS Business & Public Filings (512-463-5555). Document and decide whether to register now or defer until ~$25K-50K total revenue.
5. **Resend domain verification** (otherwise emails are junked)

### Code work still to do

| Item | Why | Trigger |
|---|---|---|
| **`Letter623.tsx` template** | Final dispute letter type. Goes to creditor (furnisher) not bureau — needs the per-creditor address from `creditors` table. No notary | When user provides the screenshot |
| **Admin "Add Client" flow** | Currently no way for admin to create a client without a Clerk signup. Workaround: admin signs up with `name+test@email.com` Gmail-alias to create a test client | Before client onboarding scales |
| **Lead → Client conversion** | No "convert this lead to a client" button on the admin leads tab. Workflow: admin clicks → creates Clerk invitation → customer signs up via magic link → Clerk webhook creates profile + auto-links to lead (the auto-link is already implemented) | Soon — blocks any non-self-serve onboarding |
| **GHL inbound lead sync** | Currently we push contacts TO GHL on signup; we don't pull from GHL. User wants the admin leads tab to show GHL contacts too | Defer — significant feature work |
| **Calendly embed not populating** on the post-quiz results page | Live-deploy issue. Calendar widget shows nothing; "Trouble booking?" fallback link visible | Investigate next |
| **Soften "Hand you the exact removal plan" copy** | Still uses "removal" framing, slipped through the compliance sweep | Quick fix |
| **Data-retention purge job** | Nightly cron that wipes SSN secrets + per-case PII when service ends or subscription lapses (CROA + general-PII hygiene) | Before scaling beyond a handful of clients |
| **Substantiation file or copy rewrite for testimonial outcome claims** | The disclaimer above the grid (PR #8) helps but doesn't fully insulate the specific "67 points in 45 days" claims in individual quotes. Either document substantiation OR rewrite to softer language | Before paid-traffic scale |
| **Attorney review of full ToS** | This ToS was written by Claude + adapted from a ChatGPT draft. Has not been reviewed by a Texas-licensed attorney. **Required before scaling traffic** | First $10K month or first 25 paying clients (whichever comes first) |
| **Stripe `unsafe_metadata.plan` → `private_metadata.plan`** (audit C-3 outstanding TODO) | Still client-writable in Clerk. Allows a determined user to self-upgrade their plan via `unsafe_metadata` | Whenever |
| **PII out of URL query strings on funnel results page** | `?name=...&goal=...` was an audit P1; defer until other higher-impact items land | Whenever |
| **Reconcile Hero "guaranteed" copy with Terms** | Done in PR #8 — both now align on no-guarantee | (closed) |
| **Unsigned commits** | The local SSH-signing service was returning HTTP 400 throughout this session. All my commits in this branch landed unsigned with explicit user authorization. The service may have recovered by next session | Check at session start |

---

## How to pick this up in a fresh chat

Paste the following into a new chat to bootstrap the next session:

> I'm working on `cleanpathcredit/cleanpathcreditmain` (and the funnel-form sub-repo). Read `docs/SESSION_LOG.md` on `main` for the full project state. The dispute-letter system is built and live; the compliance copy sweep is done. Today I want to work on: \[name a backlog item from the table above].

Anyone picking it up should:

1. Read this file.
2. `git pull origin main` to get the latest.
3. Check `git status` for any uncommitted state from a paused session.
4. Check open PRs on both repos via the GitHub MCP tools.
5. Verify the open GitHub secret-scanning alerts haven't grown.

---

## Pattern observations from this session

A few things that came up repeatedly and are worth flagging for future sessions:

- **ChatGPT-generated audits/copy/legal docs** consistently mix 80% useful direction with 10-20% confidently-wrong claims (e.g. "you can charge upfront if you call yourself software" — a CROA violation). Treat them as starting points for review, never as instructions to execute.
- **Compliance is structural, not stylistic.** The single most impactful compliance move was switching billing from upfront-per-round to after-each-round-completion. Copy edits help but don't fix the underlying TSR §310.4(a)(2) violation.
- **The signed-commit infrastructure was broken** for the entire session. All commits landed unsigned with explicit auth. If you care about a clean signed-history audit trail, file a ticket on whatever signing service is running.
- **Branch hygiene**: PRs that sit unmerged for weeks accumulate conflicts and migration-number collisions. The turnstile branch was 5 weeks old when we landed it; the merge required renumbering migrations 005-009 → 010-014.
- **GitHub MCP tools have content-size limits** — pushing files >25K tokens via `push_files` or `create_or_update_file` can timeout or fail. Local `git push` with a configured PAT is more reliable for big diffs. The PAT path was set up mid-session via credential-helper + `~/.git-credentials`.
