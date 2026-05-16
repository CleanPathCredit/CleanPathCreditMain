# Meta Ads — Lane B Launch Pack

Practical playbook for the first 90 days of paid Meta (Facebook + Instagram) traffic for Clean Path Credit.

## What's in this folder

| File | What it covers |
|---|---|
| `ad-copy.md` | Hooks, headlines, primary text, and CTAs for the four campaign types |
| `targeting-spec.md` | Custom audiences, lookalikes, cold targeting, exclusions, optimization events, budget ladder |
| `pre-launch-checklist.md` | Sequencing — what must be done before the first dollar of ad spend |

## How the campaigns map to the funnel

```
COLD TRAFFIC                     RETARGETING               POST-CONVERSION
─────────────────                ─────────────             ────────────────
English credit-challenged   ┐
Spanish working-class buyer ┼──► /  or  /es-comprador  ──► Pixel + form     ┐
LO/RE/F&I (B2B mention)     ┘                              submit          │
                                                                            │
                            ┌──► quiz completers (form fill, no checkout) ──┤
                            │                                                ▼
Site visitors no-action  ──┤    re-engage with new angle or social proof  Stripe checkout
                            │                                                ▼
                            └──► /partners visitors no-app  ──► partner re-engagement
                                                                            │
                                                                          /welcome
                                                                       Purchase event
                                                                            │
                                                                            ▼
                                                              Look-alike seed for next cohort
```

## Compliance posture for every ad

- **No outcome guarantees** anywhere in copy or creative. CROA §404(a)(3). Use "may", "average", "designed to", "could" — never "will", "guaranteed", "in 30 days".
- **No fabricated testimonials.** FTC Endorsement Guides (16 CFR Part 255). Real testimonials with substantiation file required (`docs/SUBSTANTIATION.md`).
- **Spanish ads → Spanish landing page → Spanish disclosures.** CFPB UDAAP rule.
- **Texas CSO registration #** must be in the landing page footer before any ad runs.
- **No advance-fee promises.** TSR §310.4(a)(2). The funnel is consultation-led — never "$X today and you'll qualify in 30 days."
- **Meta-specific copy rules.** Don't reference FICO score numbers in primary text — Meta's special-ad-categories policy can flag credit-related ads as "Credit Opportunities" and force special-ad-category targeting (no demographic/zip targeting). See `targeting-spec.md` for the special-ad-category posture.

## Budget posture (recap of `targeting-spec.md`)

| Phase | Daily budget | Goal | Ship-when |
|---|---|---|---|
| 0. Soft launch | $25/day | 7-day Pixel learning phase, 1–2 leads to validate funnel | CSO + A2P approved, Pixel test events green |
| 1. Validate | $100/day | 5–10 quiz submits/day, $50–$150 CPL benchmark | Soft-launch CPL within 3× target |
| 2. Scale | $250/day | 15+ quiz submits/day, lookalike seed cohort built | Validate-phase CPL stable for 14 days |
| 3. Cohort | $500–1000/day | Lookalike-driven, multi-creative testing | Cohort of 50+ Stripe purchases for lookalike seed |

## Pre-launch gates (in `pre-launch-checklist.md`)

The launch sequence has hard gates — don't skip any of them:

1. Texas CSO registration approved + bond posted
2. Twilio A2P 10DLC approved (or SMS automations disabled in workflow)
3. Pixel + CAPI test events green in Meta Events Manager
4. Custom audience seed lists uploaded (existing leads + clients)
5. Attorney sign-off on ad copy
6. Spanish disclosures live on `/es-comprador`
7. End-to-end smoke test of the funnel (form → Stripe → /welcome → /dashboard)
8. Daily Composio digest configured

## What this pack does NOT include

- **Creative assets** (video, image, graphics) — those are produced separately with a designer / video editor. This pack is copy + targeting strategy only.
- **Google Ads / TikTok / YouTube** — Meta only for now. Cross-channel can be a separate pack once Meta is profitable.
- **Email / SMS lifecycle inside the funnel** — that's GHL workflow content, lives in `docs/runbooks/`.
- **Influencer / affiliate** — separate playbook.

---

*This pack is operational guidance, not legal advice. Compliance gates listed above must be cleared with an attorney + the Texas Secretary of State CSO division before any ad spend. CROA §404, FTC Endorsement Guides, and Texas Finance Code Ch. 393 all apply.*
