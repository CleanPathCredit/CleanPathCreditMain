# Citations & NAP Execution Kit — Clean Path Credit

**Date:** 2026-06-08
**Purpose:** build a consistent, authoritative citation footprint so Google trusts the business's *prominence* and *consistency* — the two off-site local-ranking signals the site itself can't generate. Pairs with `gbp-social-content-kit.md` (the paste-ready copy); this is the **target list + strategy + tracker**.

> **Why this matters:** a `site:cleanpathcredit.com` check (2026-06-08) returned **0 indexed pages**, and a "credit repair San Antonio" search showed **zero presence** for Clean Path Credit — competitors own the results with Yelp/BBB listings + reviews. The site is technically perfect but has **no off-site footprint**. Citations + GBP + reviews are now the highest-leverage work, and none of it can be faked into the codebase — it's claim-and-verify execution.

---

## 🔑 Canonical NAP — use these EXACT values everywhere

Inconsistent NAP (different phone format, name suffix, or email across directories) actively *suppresses* local ranking. Copy this block verbatim into every listing.

```
Name:        Clean Path Credit
Phone:       (346) 399-5606
Website:     https://cleanpathcredit.com
Public email: hello@cleanpathcredit.com
Service area: San Antonio, TX (serving all of Texas)
Hours:       By appointment
Languages:   English, Spanish
Category:    Credit repair service
```

**NAP-consistency audit (2026-06-08): ✅ CLEAN.** Across the codebase the phone digits (346·399·5606) are identical everywhere — display format `(346) 399-5606`, schema E.164 `+1-346-399-5606`, and `tel:` link all match. Name is uniformly "Clean Path Credit." The only `555` numbers in the repo are HTML input `placeholder=` hints (correct). `support@` appears only on Privacy/Terms (legal contact) — keep `hello@` as the public/citation email.

> **Decisions to lock before submitting (do NOT vary these once you start):**
> 1. **Phone display format** → use `(346) 399-5606` everywhere a directory shows a formatted number.
> 2. **Service-area business (SAB) address** → Clean Path is by-appointment with no public storefront. On directories that *require* a street address, use your real business/mailing address but **set it to "hidden / service-area"** wherever the platform allows (GBP, Bing, Apple all support hidden SAB addresses). Never invent a fake address, and never use two different addresses.
> 3. **Public email** → `hello@cleanpathcredit.com` (not support@).

---

## The GBP category nuance (important)

Google has **no exact "Credit repair service" category** in some category sets — the closest options are:
- **Primary:** `Credit counseling service` is what's currently set, but it implies a *different* service (debt management, not FCRA disputes). If `Credit repair service` is available in your GBP category picker, switch to it. If it's not offered, the best-fit primary is `Financial consultant`.
- **Secondary (add up to 9, only if accurate):** `Financial consultant`, `Loan agency`, `Mortgage broker` (only if you actually broker), `Bankruptcy service` (only if accurate).

The category change is the single biggest GBP lever — it determines which "near me" searches you're even eligible for.

---

## Citation targets — work top-down (Tier 0 first)

### Tier 0 — SERP-derived: the sites that ACTUALLY own page 1 (checked 2026-07-27)

A live search for the money keyword (**"credit repair San Antonio"**) returned a page 1 with
**almost no individual credit-repair companies on it.** It is owned end-to-end by directories
and "best of" listicles:

| Ranking page | Type | How you get on it |
|---|---|---|
| Yelp — "Top 10 Best Credit Repair in San Antonio" | Directory | Claim/add a free business listing |
| BBB — Credit Repair Services near San Antonio | Directory | bbb.org/get-listed (accreditation optional) |
| Expertise.com — "11 Best San Antonio Credit Repair Companies" | Editorial listicle | Free nomination form / editorial pitch |
| management.org — "5 Best San Antonio Credit Repair Companies" | Editorial listicle | Email the editor |
| zogby.com — "2026 Top Credit Repair Companies in San Antonio" | Editorial listicle | Email the editor |
| botw.org (Best of the Web) — Texas credit repair | Paid directory | Paid submission |
| gocleancredit.com — "Top 5 Credit Repair Companies in SA" | Competitor listicle | Editorial pitch (they list rivals) |

**Why this reframes the whole strategy:** these are high-authority aggregators. A brand-new
domain does not out-rank them on the head keyword in any realistic timeframe — that is not a
content-quality problem, it is a domain-authority problem, and no amount of on-site work fixes
it. So the three genuinely winnable paths are:

1. **The local pack (GBP)** — renders *above* all of these organic results, and is scored on
   proximity + relevance + prominence rather than domain authority. This is the single biggest
   available win and it is 100% gated on GBP verification + the category fix.
2. **Get listed *inside* the pages that already rank** — each listing is simultaneously a
   citation (consistency), a backlink (PageRank — the one ranking system we feed nothing), and
   a referral-traffic source. Being #4 on a page-1 listicle beats being #40 on your own URL.
3. **Long-tail queries the aggregators don't target** — exactly what the blog cluster is built
   for ("what credit score to buy a house in Texas", "is credit repair a scam", the Spanish
   set). This is where the on-site work pays off, not on the head term.

> **Do not** chase the head keyword organically with more content. The SERP says the slot
> doesn't exist. Chase the local pack + inclusion + long-tail instead.

### Tier 1 — Core (do these first; they're the ones Google weighs most)
| # | Directory | URL | Notes |
|---|-----------|-----|-------|
| 1 | **Google Business Profile** | business.google.com | THE priority. Verify + fix category + add services + 1 post/week. |
| 2 | **Bing Places** | bingplaces.com | Powers Bing + ChatGPT/Copilot local. Can import from GBP. |
| 3 | **Apple Business Connect** | businessconnect.apple.com | Apple Maps/Siri. SAB supported. Free. |
| 4 | **Yelp** | biz.yelp.com | High domain authority; competitors all here. SAB ok. |
| 5 | **Better Business Bureau** | bbb.org/get-accredited (or get-listed) | Strong trust signal for a YMYL/financial service. |
| 6 | **Facebook Page** | facebook.com/pages/create | Doubles as a citation + social. Copy in GBP kit §2. |

### Tier 2 — Data aggregators (the multiplier — each feeds hundreds of downstream sites)
| # | Aggregator | URL | Notes |
|---|-----------|-----|-------|
| 7 | **Data Axle** | data-axle.com / expressupdate | Feeds many GPS/voice/directory systems. |
| 8 | **Foursquare** | foursquare.com/products/places (business claim) | Feeds Apple, Uber, Samsung, etc. |
| 9 | **Localeze / Neustar** | neustarlocaleze.biz | Major aggregator. |
| — | *Shortcut:* a paid service (Yext, BrightLocal, Moz Local, Whitespark) pushes all aggregators at once for ~$100–250/yr — worth it to avoid manual aggregator submissions. |

### Tier 3 — Niche + local (San Antonio / financial)
| # | Directory | URL | Notes |
|---|-----------|-----|-------|
| 10 | YellowPages | yellowpages.com | General, still indexed. |
| 11 | Manta | manta.com | Small-business directory. |
| 12 | Hotfrog | hotfrog.com | General. |
| 13 | Nextdoor Business | nextdoor.com/business | Hyper-local San Antonio neighborhoods. |
| 14 | San Antonio Hispanic Chamber of Commerce | sahcc.org | Local + bilingual fit; real local relevance. |
| 15 | Greater SA Chamber | sachamber.org | Local authority. |
| 16 | Chamber of Commerce (national) | chamberofcommerce.com | Free listing. |

---

## Suggested order of execution (1–2 sittings)
1. **GBP** (verify + category + services + first post) — unblocks everything; ~30 min.
2. **Bing Places + Apple Business Connect** (can import from GBP) — ~20 min.
3. **Yelp + BBB + Facebook** — ~30 min.
4. **One aggregator pass** — either submit to Data Axle + Foursquare + Localeze manually, OR buy a Yext/BrightLocal/Moz Local subscription and let it fan out (recommended — saves hours and keeps NAP locked).
5. **Tier 3 niche/local** — spread over a couple weeks; the SA Hispanic Chamber is the highest-value local one given the bilingual angle.

**Pace note:** don't submit all 16 in one hour. A natural drip over 2–4 weeks looks more organic than a single-day blast.

---

## What I (Claude) can and can't automate here — honest
- ❌ **I cannot create/claim listings for you.** Every Tier 1–3 directory requires an account + phone/email/postcard verification tied to you as the owner. There is no API to mass-create business listings (Composio's Google Maps tools *search* places; they don't create GBP profiles).
- ✅ **I can keep NAP consistent in code** (done — audit above) and update the site's `sameAs` schema the moment your Facebook/LinkedIn/Yelp URLs exist (send them and I'll wire them in — this links all your profiles into one entity Google recognizes, a real E-E-A-T/knowledge-graph win).
- ✅ **I can draft the exact paste copy** for any specific directory's form fields on request.
- ✅ **I can re-run the NAP-consistency audit** any time the site copy changes.

---

## After listings exist — close the loop
Send me your live profile URLs (GBP, Facebook, LinkedIn, Yelp, BBB) and I'll add them to the `Organization.sameAs` array in `index.html`'s JSON-LD. Right now `sameAs` has only the Google knowledge-graph entity; every verified profile you add strengthens the entity Google ties your reviews and rankings to.
