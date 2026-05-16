# Meta Ads — Pre-Launch Checklist

Hard gates before the first dollar of ad spend hits Meta. The order matters — earlier items unblock later ones.

> Spending on ads before these gates clear is the fastest path to:
> 1. A Texas Office of Consumer Credit Commissioner enforcement letter
> 2. A Meta ad account ban
> 3. A wave of dead leads with no working SMS / email automation
> 4. A pile of Stripe charges that have to be refunded
>
> Skip nothing.

---

## Tier 1 — Legal / regulatory (block on these)

### ☐ Texas CSO registration approved
- **Owner:** Alex
- **Process:** Texas Secretary of State, Statutory Documents Section. Tex. Fin. Code Ch. 393.
- **Bond:** $10,000 surety bond posted with the application.
- **What it unblocks:** ALL credit-services solicitation in Texas. Without it, every ad is itself a violation.
- **Confirmation evidence:** registration certificate + registration number on file.

### ☐ Texas CSO registration number filled into every consumer touchpoint
- `index.html` → Spanish disclosure meta
- `src/pages/EsComprador.tsx` → footer
- `src/pages/Welcome.tsx` → footer
- `src/components/sections/*.tsx` → any place referencing services
- `docs/launch/*.md` → all printed leave-behinds
- `docs/partners/onepagers/print/*.html` → footer of each print sheet
- All ad copy attribution lines

### ☐ Attorney sign-off on ad copy
- **Owner:** Alex's attorney
- **What:** review `ad-copy.md` for CROA §404, FTC §5 (UDAAP), Spanish translation accuracy, and substantiation backing for any factual claim.
- **Output:** redlined copy accepted as final.

### ☐ Mirofish `/mirofish compliance-validation` pass on every ad variation
- **Owner:** Alex
- **What:** before publishing a variation, paste the **headline + primary text + CTA** into the Mirofish slash command `/mirofish compliance-validation`. The simulation flags overpromise / regulator-trigger language an attorney would catch on a second pass.
- **Cadence:** every variation, including weekly creative refreshes — not just the first launch batch.
- **Output:** save the Mirofish output alongside the attorney redline so you have a two-stage review trail per variation.
- **Rationale:** Mirofish is a faster, cheaper second opinion than re-engaging the attorney for each refresh. Does NOT replace attorney sign-off on the first batch — it augments ongoing creative refresh.

### ☐ Attorney sign-off on partner agreement template (PR #26)
- **Owner:** Alex's attorney
- **What:** review `docs/partners/referral-agreement-template.md` and the four printed one-pagers before any partner outreach starts.

### ☐ Substantiation file populated for any testimonial used in creative
- **Owner:** Alex
- **File:** `docs/SUBSTANTIATION.md`
- **Required for:** every numeric claim in any testimonial (item-deletion counts, score changes, qualification outcomes).
- **Posture:** if no testimonial is fully substantiated yet, use ONLY the framework / FICO-10T / authority hooks (no testimonial-based ads) for Phase 0–1.

### ☐ Spanish disclosures live on /es-comprador
- Statement of Consumer Credit File Rights (Spanish)
- Consumer contract template (Spanish)
- 3-day cancellation notice (Spanish)
- All reviewed by bilingual specialist

---

## Tier 2 — Funnel infrastructure (block on these)

### ☐ Twilio A2P 10DLC approved (or SMS automations disabled)
- **Owner:** Alex (in progress with GHL)
- **What it unblocks:** SMS inside the GHL workflow that follows form submission. Without it, SMS automations either don't fire or fire and rack up carrier fees + violations.
- **Workaround if delayed:** disable SMS steps in the GHL workflow until A2P approves. Email-only follow-up still works.

### ☐ Pixel + CAPI test events green in Meta Events Manager
- **Verify:**
  - `PageView` fires on every page
  - `Lead` fires on form submit (browser-side AND server-side via CAPI — should dedupe to 1)
  - `Purchase` fires on Stripe checkout completion (browser-side AND server-side via CAPI — should dedupe to 1)
  - `SpanishFunnelView` fires on `/es-comprador` mount
- **Tool:** Meta Events Manager → Test Events tab → enter your IP / use the test_event_code env var.
- **Expected dedup:** for Purchase and Lead, Test Events should show "1 event, dedup count 1" — meaning both halves arrived and Meta merged them. If you see 2 separate events, eventID isn't matching.

### ☐ End-to-end smoke test of the funnel
- Submit a test quiz → confirm:
  - GHL contact created with right tags
  - Supabase `lead_submissions` row created
  - Stripe Checkout link works
  - Stripe webhook fires (check Stripe → Webhooks → Recent Deliveries)
  - Welcome page reached with `?session_id=cs_xxx`
  - Browser-side Purchase event fired (Network tab → fbevents.js)
  - Clerk account creation works
  - Dashboard loads
- **Use:** Stripe test mode keys for the smoke test. Switch back to live before launch.

### ☐ Vercel env vars confirmed in Production
- `VITE_META_PIXEL_ID` (Pixel ID, numeric)
- `VITE_META_DOMAIN_VERIFICATION` (Meta Business Manager domain verification token)
- `META_CAPI_ACCESS_TOKEN` (from Meta Events Manager → Settings → CAPI)
- `META_CAPI_INTERNAL_SECRET` (random secret, used by stripe.ts and lead.ts to call /api/meta-capi)
- `META_CAPI_TEST_EVENT_CODE` (only set during testing; remove for production)
- `STRIPE_WEBHOOK_SECRET`, `STRIPE_SECRET_KEY` (live keys)
- `CLERK_SECRET_KEY` (live)
- `GHL_PRIVATE_INTEGRATION_TOKEN`, `GHL_LOCATION_ID`
- `SUPABASE_SERVICE_ROLE_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

### ☐ Domain verification on Meta Business Manager
- Brand Safety → Domains → Verify `cleanpathcredit.com`
- Method: meta tag (already wired via `VITE_META_DOMAIN_VERIFICATION`)

### ☐ Aggregated Event Measurement priorities configured
- Meta Events Manager → AEM → Configure Web Events
- Order from `targeting-spec.md`:
  1. Purchase
  2. Lead
  3. CompleteRegistration
  4. SpanishFunnelView
  5. ViewContent
  6. Subscribe
  7. AddToCart
  8. PageView

### ☐ Meta Pixel + CAPI dedup confirmed for all three events
- Run Test Events with Pixel + CAPI both firing
- Confirm event count = 1 (deduplicated) for: `Lead`, `Purchase`, and `SpanishFunnelView`
- If dedup count > 1: eventID mismatch — investigate before launch

---

## Tier 3 — Audience pre-population (do these before launch)

### ☐ Custom Audience seed lists uploaded
- CA1 (existing leads from Supabase) — at least the last 12 months
- CA2 (Stripe customers) — full list, even if small
- CA5 (Spanish funnel viewers — Pixel-based, will populate organically)

### ☐ Lookalike audiences built (will be Special Ad Audiences)
- LAL-1% TX from CA2 (Customers)
- LAL-1% TX from CA1 (Leads) — backup if Customer list is too small
- LAL-3% TX from CA2 (for Phase 2)

### ☐ Exclusion audience saved + applied
- CA1 + CA2 + CA3 + 65+ + /welcome visitors (last 30 days) + employee list
- Save as "EXCL — Cold Campaign Standard" for re-use

---

## Tier 4 — Creative + ops

### ☐ Three or more variations per campaign saved as drafts
- English cold (1A, 1B, 1C)
- Spanish cold (2A, 2B, 2C) — translation reviewed
- Warm retargeting (3A, 3B, 3C)
- B2B partner (4A, 4B, 4C)

### ☐ UTM params populated on all ad URLs
- `?utm_source=meta&utm_medium=paid&utm_campaign=<campaign>&utm_content=<variation>`

### ☐ Daily Composio digest configured
- See `docs/runbooks/composio-meta-ad-digest.md` (to be drafted)
- Pulls daily: spend, impressions, CTR, CPL, frequency from Meta Marketing API
- Cross-checks Pixel Lead count vs. CAPI Lead count vs. Supabase `lead_submissions` count
- Posts daily summary to email or Slack

### ☐ Stripe → Meta CAPI event flow tested with a live test purchase
- Use a $5 test plan in Stripe live mode (or low-value test product)
- Run end-to-end: ad click → form → checkout → webhook → CAPI → Test Events
- Confirm Purchase event arrives in Meta with correct value/currency

### ☐ Refund / chargeback workflow tested
- If you refund a Stripe charge, Meta does NOT automatically subtract that conversion. Document the manual step: Events Manager → Custom Conversions → can add a deduplication overlay if refund volume gets material.

---

## Tier 5 — Soft launch (Phase 0)

Once all Tier 1–4 are checked:

### ☐ Phase 0 launched at $25/day for 7 days
- 1 campaign (English cold)
- 1 ad set
- 3 variations
- $25/day budget
- **Goal:** confirm the funnel works end-to-end at low spend before scaling. Expect 1–2 leads.

### ☐ After 7 days at $25/day:
- [ ] Pixel + CAPI dedup count is 1 for all Lead events (no dupes)
- [ ] Supabase `lead_submissions` matches Meta-reported Lead count within 5%
- [ ] Email automation fired for every lead
- [ ] No CSO compliance issues raised by any reviewer
- [ ] If all green → proceed to Phase 1 ($100/day)

---

## Tier 6 — Phase 1 launch readiness

Phase 1 = $100/day across English + Spanish + B2B.

### ☐ Spanish creative reviewed by bilingual specialist
- Translation accuracy
- Cultural register (Mexican working-class, NOT Argentine or Spanish-Spanish)
- Compliance: same posture as English

### ☐ B2B partner ad creative differentiated from consumer ads
- B2B is NOT in Special Ad Category — confirm correct category selection in Ads Manager
- Job-title targeting verified

### ☐ Composio digest running for 7 days with no false alarms
- Confirm the digest correctly pulls Meta data + Supabase + Stripe and reports in human-readable format
- If digest is broken, fix BEFORE scaling spend (you'll need it at higher budgets)

---

## What to do if a gate fails

| Gate failed | Don't | Do |
|---|---|---|
| CSO not approved | Run any ad | Wait. Period. Revisit ETA with TX SoS. |
| Attorney rejects copy | Argue | Redline → re-submit. Compliance > urgency. |
| Twilio A2P delayed | Skip SMS step | Disable SMS in GHL workflow; email-only until approval |
| Pixel + CAPI dedup broken | Launch anyway | Debug eventID match. Don't burn ad spend on broken attribution. |
| Stripe live webhook fails | Switch to test mode for "now" | Fix the webhook. No conversions = no growth signal. |
| Smoke test reveals broken email automation | Launch on email-broken funnel | Fix automation first. Half-broken funnel costs more than the delay. |

---

## Rollback plan

If something goes wrong post-launch:

1. **Pause all ads immediately** in Ads Manager (top-right toggle)
2. **Disable form submissions** at `api/lead.ts` if needed (wrap in feature flag)
3. **Issue refunds** for any Stripe charges that came through the broken funnel (via Stripe Dashboard or programmatically)
4. **Notify** any leads who submitted but didn't get the right follow-up (manual outreach via GHL or email)
5. **Document** the failure in `docs/SESSION_LOG.md` with cause + fix + delta to checklist

---

## Sign-off

This checklist is the final gate before paid traffic. Owner check-off + date below.

- [ ] Tier 1 — Legal / regulatory  ▢ ____________  Date: __________
- [ ] Tier 2 — Funnel infrastructure  ▢ ____________  Date: __________
- [ ] Tier 3 — Audience seeding  ▢ ____________  Date: __________
- [ ] Tier 4 — Creative + ops  ▢ ____________  Date: __________
- [ ] Tier 5 — Soft launch (Phase 0) complete  ▢ ____________  Date: __________
- [ ] Tier 6 — Phase 1 readiness  ▢ ____________  Date: __________

---

*Compliance gates here are non-negotiable. Operational gates can be re-sequenced if necessary, but the order above minimizes risk.*
