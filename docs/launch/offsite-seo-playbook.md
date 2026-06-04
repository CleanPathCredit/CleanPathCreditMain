# Off-Site SEO Execution Playbook — Getting to #1 Locally

**Date:** 2026-06-03
**Status:** On-page/technical SEO is complete (12 PRs shipped). This playbook covers the **off-site** work that on-page changes can't buy: Google Business Profile optimization, reviews, citations, and backlinks. These are the levers that decide local-pack ranking for "credit repair San Antonio" and similar.

> **Why this matters:** For a local service business, the **local pack** (the map + 3 listings) is where most clicks go, and it ranks on three factors: **Relevance** (GBP category + content), **Distance** (your service area), and **Prominence** (reviews + citations + backlinks). On-page work covers Relevance. Everything below builds **Prominence** — the hardest factor to fake and the one competitors win on.

---

## 1. Google Business Profile — do these TODAY (biggest local lever)

### 1.1 🔴 Primary category → "Credit repair service"
Your GBP primary category is currently **"Credit counseling service"** — a *different* service category in Google's taxonomy. The primary category is the **single strongest local-ranking factor**. "Credit counseling" (often nonprofit debt counseling) does not surface for "credit repair" searches.
- **Action:** GBP → Edit profile → Category → primary = **"Credit repair service"**.
- Add secondary categories: **Financial consultant**, **Loan agency** (if offered via partners).
- *(Compliance note: you operate as a Texas CSO — "credit repair service" is the accurate category, and it matches your CROA/Ch. 393 posture better than "counseling.")*

### 1.2 Complete every field
- **Services:** add each as a GBP service with a 1–2 sentence description: Credit Report Audit, FCRA Dispute Letters, Credit Bureau Disputes (§611), Furnisher Disputes (§623), Mortgage-Readiness Credit Prep, Spanish-Language Credit Repair (Reparación de Crédito).
- **Service area:** San Antonio (primary), then add Houston, then "Texas." Don't list a fake address — keep it a Service-Area Business.
- **Attributes:** "Online appointments," "Language assistance: Spanish," "Identifies as Latino-owned" (if applicable and true).
- **Hours:** "By appointment."
- **Description (750 chars):** lead with "Credit repair service in San Antonio, TX… FCRA-backed dispute process, no advance fees, bilingual (English/Spanish)." No outcome promises.
- **Photos:** add ≥5 — logo, a headshot of Alex (matches the /about page), and simple branded graphics. Photos correlate with GBP engagement.

### 1.3 GBP Posts (weekly — keeps the profile "active")
Post 1×/week. Three CROA-safe drafts to start:
1. *"Wondering if a credit-repair company is even legit? Here's the 5-point checklist we tell every caller to use before signing anything → [link to /faq]"*
2. *"Preparing to buy a home in San Antonio? Your credit file decides your rate. Here's how the dispute process actually works → [link to /how-it-works]"*
3. *"Servicio en español: ayudamos a familias en Texas a entender y disputar errores en su crédito. Agenda una auditoría gratis → [link to /es-comprador]"*

---

## 2. Reviews — the prominence multiplier (you have 1; target 10+ fast)

Reviews are the #2 local-pack factor after category. Volume, velocity, and recency all matter. You're at 5★/1 review — getting to **10 genuine reviews** moves the needle hard.

### 2.1 The ask (every satisfied client, at the right moment)
Ask right after a visible win (a deleted item, a closed dispute round, a mortgage pre-approval). Send your GBP review short-link.

**SMS template (CROA/FTC-safe — no incentive, ask for honest feedback only):**
> "Hi [Name], it's Alex at Clean Path Credit. If you've got 30 seconds, an honest Google review really helps other families find us: [GBP review link]. Thank you either way!"

**Email subject:** "A quick favor, [Name]?"
> "Working with you has been a pleasure. If you're comfortable, would you share an honest review of your experience on Google? It helps other San Antonio families decide. [Review link]. No pressure at all — and thank you."

> ⚠️ **FTC:** never offer payment/discount for a review, and never gate (asking only happy clients) — ask everyone. Respond to every review (positive and negative), professionally and without sharing any client detail.

### 2.2 Set up the review link
GBP → Ask for reviews → copy the short link (`g.page/r/...`). Put it in: the SMS/email above, your email signature, and a thank-you page after a completed round.

---

## 3. NAP Citations — consistency = trust (Tier 1 first)

**NAP must be byte-identical everywhere:** `Clean Path Credit` · `(346) 399-5606` · service-area: San Antonio, TX · `https://cleanpathcredit.com`. Inconsistent NAP suppresses local rank.

### Tier 1 — do these first (free, high-authority)
| Directory | URL |
|---|---|
| Google Business Profile | business.google.com |
| Bing Places | bingplaces.com |
| Apple Business Connect | businessconnect.apple.com |
| Yelp for Business | biz.yelp.com |
| Better Business Bureau | bbb.org/get-listed |
| Facebook Page | facebook.com/business |
| Nextdoor Business | business.nextdoor.com |

### Tier 2 — local + industry
- San Antonio Hispanic Chamber of Commerce (member directory) — strong local + Latino-market signal.
- San Antonio Chamber of Commerce.
- Yellow Pages, Manta, Hotfrog, Cylex, Chamber of Commerce (.com).
- NACSO directory (if/when you join).

**Tip:** keep a spreadsheet (Directory · URL · username · NAP used · live URL) so audits are easy and you never submit inconsistent info.

---

## 4. Backlinks — white-hat only (YMYL = link schemes are existential risk)

> No PBNs, no bought links, no link farms. A manual action on a credit-repair domain is catastrophic. Every tactic below is legitimate.

1. **Partner cross-links (highest ROI, you already have the relationships):** your loan-officer / real-estate / F&I partners (see `docs/launch/`) link to `/partners` from their sites; you link back from a partner page. Relevant, authoritative, free.
2. **HARO / Connectively / Qwoted:** answer journalist queries on credit/personal-finance/home-buying as "Alex Serratos, founder & credit-repair specialist." Earns high-DA editorial links + reinforces the named-author E-E-A-T. ~15 min/day.
3. **Local PR:** offer a "credit-readiness for first-time buyers" guest column to San Antonio business journals / real-estate blogs / Spanish-language outlets.
4. **Linkable assets (already on-site):** the `/faq`, the free-dispute-letter angle, the ITIN-credit Spanish guide — pitch these to personal-finance writers as citable resources.
5. **Reviews-as-links bonus:** BBB, Yelp, chamber listings double as citations *and* low-level links.

**Anchor hygiene:** mostly branded ("Clean Path Credit") + naked URLs + generic ("learn more"). Avoid exact-match ("credit repair san antonio") anchors — over-optimization is a spam signal.

---

## 5. Execution Sequence (first 30 days)

**Week 1 (highest leverage):**
- [ ] GBP primary category → "Credit repair service" (§1.1)
- [ ] Complete GBP services, service area, attributes, description, 5 photos (§1.2)
- [ ] GSC: verify ✓, submit sitemap, Request Indexing on the money pages
- [ ] Run `npm run indexnow` to push all URLs to Bing
- [ ] Ask your 3–5 most recent happy clients for reviews (§2)

**Week 2:**
- [ ] Tier 1 citations (7 directories, §3) — identical NAP
- [ ] First GBP post; set a weekly reminder
- [ ] Set up HARO/Connectively account; start answering 1 query/day

**Weeks 3–4:**
- [ ] Tier 2 citations (chambers first — Hispanic Chamber is high-value)
- [ ] Reach out to 5 partners for cross-links to /partners
- [ ] Keep review velocity (aim +1–2/week); respond to all
- [ ] Re-run `npm run indexnow` after any new blog post

**Ongoing:** 1 blog post/week (calendar in `blog-content-calendar.md`), 1 GBP post/week, steady reviews, monitor GSC for impressions/positions.

---

## What's already done (on-page — don't redo)
Prerendered crawlable HTML · per-route metadata · Organization/LocalBusiness/Service/Person/FAQ/Article schema · San Antonio + Houston location pages · FAQ page · 8 blog posts (EN+ES) · named author (Alex Serratos) · robots.txt + sitemap + llms.txt · GSC verification · IndexNow.

**The on-page game is won. Ranking now depends on the off-site work above + time for Google to crawl, index, and trust the domain.**
