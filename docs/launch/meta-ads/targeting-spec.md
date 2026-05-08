# Meta Ads — Targeting & Audience Spec

How to set up audiences, exclusions, optimization events, budgets, and the special-ad-category posture for Clean Path Credit's Meta campaigns.

> **Pairs with `ad-copy.md`** — that doc has the creative; this one has the wiring.

---

## The special-ad-category question first (read this before anything else)

Meta's **Special Ad Categories** policy applies to ads about credit (along with employment, housing, insurance, etc.). When you set up a campaign, Meta asks: *"Does this ad relate to credit, employment, housing, social issues, or elections?"*

**The honest answer for Clean Path Credit is YES — credit.** This triggers the Special Ad Category limitations:
- No demographic targeting (age, gender)
- No detailed interest targeting that proxies for protected classes
- 1-mile minimum geographic radius (no zip-code targeting)
- Lookalike audiences become "Special Ad Audiences" (broader, less precise)

**Why declare it:** Meta enforces this with an internal classifier. Ads that don't declare but are detected as credit-related get pulled and the ad account gets a strike. After 2–3 strikes the account can be permanently banned.

**Practical impact:** You're paying a precision tax (broader targeting = higher CPL) but the alternative is account-level risk. **Always declare credit when Meta asks.**

This doc's targeting recommendations assume the Special Ad Category is enabled.

---

## Custom Audiences (CAs) — set these up before any cold campaign launches

Built in Meta Ads Manager → Audiences → Create → Custom Audience.

### CA1 — Existing Lead Submissions (seed list)

- **Source:** Customer File. Upload from Supabase: emails + first names + phones from `lead_submissions` where `created_at > now() - 1 year`.
- **Use for:** retargeting (warm) and Lookalike seed (cold).
- **Refresh:** monthly via Composio export, or manual re-upload.

### CA2 — Stripe Customers

- **Source:** Customer File. Upload from Stripe (Reports → Customer list export). Emails + names of all paid customers.
- **Use for:** Lookalike seed (highest-value seed once you have 50+ customers).
- **Refresh:** monthly.

### CA3 — Pixel Pageview / no-conversion (warm retarget)

- **Source:** Website (Pixel). Visited any page in last 30 days, did NOT trigger `Lead` event.
- **Rule:** All website visitors AND NOT URL `cleanpathcredit.com/welcome` AND NOT event `Lead`.
- **Use for:** Campaign 3 (warm retargeting).
- **Refresh:** automatic (Pixel-based).

### CA4 — Pixel Lead but no Stripe (cart abandon equivalent)

- **Source:** Website (Pixel). Triggered `Lead` but NOT `Purchase` in last 14 days.
- **Use for:** mid-funnel retargeting once form completers exist but haven't checked out.
- **Refresh:** automatic.

### CA5 — Spanish funnel viewers

- **Source:** Website (Pixel). Triggered `SpanishFunnelView` custom event in last 30 days.
- **Use for:** Spanish retargeting + Spanish lookalike seed.
- **Refresh:** automatic.

### CA6 — /partners page visitors

- **Source:** Website (Pixel). Visited `cleanpathcredit.com/partners` in last 60 days.
- **Use for:** B2B retargeting (Campaign 4).
- **Refresh:** automatic.

---

## Lookalikes (LALs)

After CAs are seeded with at least 100 records:

| LAL | Source | Size | Geo | Use |
|---|---|---|---|---|
| LAL-1% TX (Customers) | CA2 | 1% | Texas | Highest-quality cold seed |
| LAL-3% TX (Customers) | CA2 | 3% | Texas | Mid-funnel cold once 1% saturates |
| LAL-1% TX (Leads) | CA1 | 1% | Texas | Cold seed if Customers list <50 |
| LAL-1% TX (Spanish) | CA5 | 1% | Texas | Spanish-funnel cold seed (after CA5 ≥100) |

**Special Ad Category note:** these become "Special Ad Audiences" — Meta uses online behavior similarities only (no demographic proxies), so size targeting is less precise. Plan for it.

---

## Cold targeting — when LALs aren't sized yet

Until LAL audiences are mature (need 100+ in seed CA), use these cold targeting parameters.

### English consumer cold (Campaign 1)

- **Geo:** San Antonio, Houston, Dallas, Austin metros — 25-mile radius from city centers (1-mile minimum required by Special Ad Category)
- **Age:** N/A — Special Ad Category restriction (Meta will use 18–65 by default)
- **Languages:** English
- **Detailed targeting:** very limited under Special Ad Category. Allowed: behaviors like "Frequent international travelers" (proxy for income — Meta still allows broad behaviors). Avoid: anything that could proxy for race/ethnicity/national origin.
- **Estimated audience size:** 2.5–4M

### Spanish consumer cold (Campaign 2)

- **Geo:** Same as English
- **Age:** N/A
- **Languages:** Spanish (Mexico) AND/OR Spanish — Meta has a "Spanish (Mexico)" sub-language tag that targets Mexican-Spanish-language users specifically
- **Detailed targeting:** very limited under Special Ad Category
- **Estimated audience size:** 800K–1.2M

### B2B partner cold (Campaign 4 — NOT subject to Special Ad Category)

This is the one campaign where Special Ad Category does NOT apply, because the *audience* is professionals being recruited as partners, not consumers being marketed credit services.

- **Geo:** Texas metros, 25-mile radius
- **Age:** 28–60
- **Languages:** English, Spanish
- **Job title targeting (allowed because B2B):**
  - Loan Officer / Mortgage Loan Originator / Mortgage Broker / Branch Manager
  - Real Estate Agent / Realtor / Real Estate Broker / Brokerage Owner
  - F&I Manager / Finance Manager / Finance Director
  - Credit Union Lending VP / Member Services VP
- **Interest targeting:** "NMLS", "Mortgage industry", "Real estate brokerage", "F&I"
- **Estimated audience size:** 80–150K

---

## Exclusions (apply to ALL consumer cold campaigns)

Build a saved exclusion audience and apply it everywhere:

- **CA2** (existing customers — don't waste spend re-acquiring)
- **CA1** (existing leads — let warm retarget reach them, not cold)
- **CA3** (recent visitors — let warm retarget reach them)
- People aged 65+ (per Texas CSO best practice — vulnerable-adult sensitivity)
- **/welcome page visitors in last 30 days** (already converted)
- Employees + family of Clean Path Credit (manual exclusion via custom list)

---

## Optimization events

Meta optimizes delivery toward whichever event you tell it to. Pick correctly per campaign:

| Campaign | Event | Why | iOS 14+ priority |
|---|---|---|---|
| 1. English cold | `Lead` | Form submit is the meaningful conversion | Priority 1 |
| 2. Spanish cold (early) | `SpanishFunnelView` | Pageview-level event so Meta can optimize before /es-comprador volume warrants Lead | Priority 4 |
| 2. Spanish cold (mature) | `Lead` | Switch when Spanish funnel hits 50+ form fills/week | Priority 1 |
| 3. Warm retargeting | `Lead` | Same | Priority 1 |
| 4. B2B partner | `Lead` | `/api/partners` form submit | Priority 1 |
| Future. Conversion-stage | `Purchase` | Stripe checkout completion (already wired in `api/webhooks/stripe.ts`) | Priority 2 |

**iOS 14+ Aggregated Event Measurement:** Meta limits each domain to 8 prioritized events. Configure in Events Manager → Aggregated Event Measurement → Configure Web Events. Priority order matters because for iOS users, only the highest-priority event in a session is measured.

**Recommended priority order for cleanpathcredit.com:**
1. Purchase
2. Lead
3. CompleteRegistration (if/when /unlock signup fires it)
4. SpanishFunnelView
5. ViewContent
6. Subscribe (e-book lead magnet, future)
7. AddToCart (not currently used — reserved)
8. PageView

---

## Budget & bid strategy

### Phase 0 — Soft launch ($25/day, 7 days)

- **Goal:** validate Pixel + CAPI fire correctly. End-to-end funnel works. 1–2 leads to confirm GHL/email/Stripe path.
- **Bid:** Lowest cost, no cap.
- **Launch when:** every item in `pre-launch-checklist.md` is checked.

### Phase 1 — Validate ($100/day, 14–21 days)

- **Goal:** establish baseline CPL, refine creative.
- **Bid:** Lowest cost.
- **Campaign budget optimization (CBO):** ON across the 3 English variations.
- **Spanish runs separately** at $30/day inside the $100 (not all $100 to English).
- **B2B partner:** runs separately at $20/day until 5+ partner applications come in.
- **CPL targets:**
  - English consumer: $25–$60
  - Spanish consumer: $30–$70
  - B2B partner: $80–$200

### Phase 2 — Scale ($250/day, 30–60 days)

- **Goal:** scale the validated combinations. Build LAL seed (50+ Stripe purchases).
- **Bid:** Cost cap = 70% of Phase 1 CPL.
- **CBO ON.**
- **Add LAL-1% TX cold campaign** at $50/day once CA2 has 50 customers.

### Phase 3 — Cohort scale ($500–1000/day)

- **Trigger:** 14 days of stable Phase 2 CPL.
- **Add:** LAL-3% TX, Spanish LAL-1%, B2B retargeting.
- **Multi-creative testing:** 5+ variations per audience, weekly refresh.
- **iOS reporting lag:** allow 72-hour attribution window before scaling.

---

## Frequency caps + creative refresh

- **Cold campaigns:** no frequency cap — Meta optimizes.
- **Warm retargeting:** frequency cap 4 impressions / 7 days.
- **Creative refresh:** when frequency hits 3.5 in 7 days, swap one of the three running variations.

---

## Campaign structure in Ads Manager

```
[Campaign: CPC-EN-Cold-Phase1]
  Special Ad Category: Credit
  Buying Type: Auction
  Objective: Sales (Conversions)
  Budget: $70/day CBO
  ├── [Ad Set: EN-Cold-Texas-Lead]
  │     Audience: TX metros + exclusions (above)
  │     Optimization: Lead
  │     Placements: Auto
  │     ├── Ad: 1A "Your rent already counts"
  │     ├── Ad: 1B "Nobody tells you this"
  │     └── Ad: 1C "From renting to closing"
  │
  └── [Ad Set: EN-Warm-Retarget-Lead]
        Audience: CA3 (visitors no-conversion)
        Optimization: Lead
        Placements: Auto
        ├── Ad: 3A "Still thinking about it?"
        ├── Ad: 3B "A score isn't a strategy"
        └── Ad: 3C "Talk to a real person"

[Campaign: CPC-ES-Cold-Phase1]
  Special Ad Category: Credit
  Budget: $30/day
  └── [Ad Set: ES-Cold-Texas-FunnelView]
        Audience: TX metros + Spanish + exclusions
        Optimization: SpanishFunnelView
        Placements: Auto
        ├── Ad: 2A "Tu renta ya cuenta"
        ├── Ad: 2B "Una casa para tu familia"
        └── Ad: 2C "Tu primera casa"

[Campaign: CPC-B2B-Partner-Phase1]
  Special Ad Category: NONE  ← B2B partner recruiting, not consumer credit
  Budget: $20/day
  └── [Ad Set: B2B-Partner-Cold-Lead]
        Audience: TX metros + LO/RE/F&I/CU job titles
        Optimization: Lead
        Placements: Auto
        ├── Ad: 4A "Stop losing buyers"
        ├── Ad: 4B "RESPA-safe credit referral"
        └── Ad: 4C "Bilingual coverage"
```

---

## Reporting — what to watch daily

In Ads Manager, customize columns to show:

| Column | Why |
|---|---|
| Cost per Lead | Primary KPI |
| Lead → Purchase rate (manual calc) | Funnel health below ad layer |
| CTR (link click) | Creative health |
| CPM | Audience saturation signal |
| Frequency | Creative fatigue signal |
| Hook rate (3-sec video views / impressions) | For video creative only |
| Standard event count: Lead | Sanity check vs. Pixel + CAPI |

**Discrepancy check:** Pixel-reported Lead count vs. CAPI-reported Lead count vs. Supabase `lead_submissions` count. They should be within 5%. Larger gap = Pixel blocked or CAPI not firing — investigate immediately. Composio runbook for daily digest covers this.

---

## Compliance review checklist (per ad)

Run through this before clicking "Publish":

- [ ] Special Ad Category declared (Credit) for consumer ads
- [ ] No outcome-guarantee language (CROA §404)
- [ ] No fabricated testimonials (substantiation file required for any claim)
- [ ] Spanish ads → Spanish landing page
- [ ] Landing page has CSO registration # in footer
- [ ] CTA button matches the audience intent (Apply Now for B2B, Learn More for cold consumer)
- [ ] UTM params populated for attribution
- [ ] Pixel + CAPI events confirmed in Meta Test Events tab
- [ ] Disclosure that "results vary" is on the landing page above the fold

---

*Targeting and budget guidance is operational — refine as data comes in. Compliance gates listed above are non-negotiable.*
