# Organic SEO Strategy — Low-Hanging-Fruit Ranking Plan

**Date:** 2026-05-31
**Site:** cleanpathcredit.com (credit repair / restoration — **YMYL** niche)
**Goal:** Rank page 1 for **winnable, zero-paid-spend** keywords. Build toward competitive terms over time.
**Pairs with:** `docs/launch/blog-content-calendar.md` (40-topic calendar) — this doc adds the keyword map, the technical gate, the local play, and the backlink playbook the calendar deferred.

> **Reality check on "#1 for credit repair":** Credit repair is among Google's most scrutinized YMYL categories. A young domain will not rank #1 for head terms ("credit repair") for a long time, regardless of effort. **We don't chase those.** We win local, Spanish-language, and long-tail buyer-intent terms — fast — and compound authority toward the harder terms. Every volume number below is a **rough estimate pending live SERP/keyword-tool validation** (see Phase 0).

---

## The gate: nothing ranks until pages ship crawlable HTML

The site is a client-rendered SPA — crawlers receive `<div id="root"></div>`. For a low-authority YMYL site, JS-rendered content is a severe ranking handicap, and Bing/AI engines barely render JS at all.

**Decision (recommended): `vite-react-ssg` prerender of public routes only.** Authed app (Dashboard/Admin/Letters) stays client-rendered via `ClientOnly`. Public routes (Landing, `/how-it-works`, `/unlock`, `/privacy`, `/terms`, `/blog/*`) bake to static HTML with per-route `<Head>` meta. **Until this ships, the keyword work below cannot convert to rankings.**

---

## Keyword Opportunity Map

Difficulty = rough estimate (Low = a new site can realistically rank in 3–6 mo with one good page + minimal links). Validate in Phase 0.

### Tier 0A — Local English (FASTEST wins — pair with GBP + city pages)

| Keyword | Intent | Est. difficulty | Target page |
|---|---|---|---|
| credit repair san antonio | commercial-local | Low–Med | `/` + San Antonio city page |
| credit repair san antonio tx | commercial-local | Low | city page |
| credit repair [Austin/Houston/Dallas/Fort Worth] tx | commercial-local | Low–Med | per-city page |
| credit repair near me | commercial-local | Med (GBP-driven) | GBP + `/` |
| credit repair company texas | commercial-local | Med | `/` |
| best credit repair san antonio | commercial-local | Low–Med | city page + reviews |
| how to fix my credit in texas | informational-local | Low | blog → `/quiz` |

### Tier 0B — Spanish (BIGGEST low-competition opportunity — funnel already exists)

| Keyword | Intent | Est. difficulty | Target page |
|---|---|---|---|
| reparación de crédito san antonio | commercial-local | **Low** | `/es-comprador` + ES city page |
| reparación de crédito en texas | commercial-local | **Low** | `/es-comprador` |
| cómo reparar mi crédito | informational | Low–Med | ES blog → `/es-comprador` |
| reparar crédito para comprar casa | commercial | **Low** | `/es-comprador` (mortgage angle) |
| crédito con ITIN | informational-commercial | **Low** | ES blog (ITIN file) |
| arreglar mi crédito rápido | informational | Low | ES blog |

> Spanish credit-repair SERPs are far less contested than English, and the buyer intent (mortgage-ready, ITIN files) matches the existing Latino-LO / `/es-comprador` assets. **Highest ROI per post.**

### Tier 1 — Long-tail buyer-intent questions (from the content calendar)

| Keyword | Intent | Est. difficulty | Target |
|---|---|---|---|
| are credit repair companies a scam | trust / near-purchase | Low–Med | blog #4 → `/quiz` |
| do credit repair companies guarantee results | trust | Low | blog #19 → `/quiz` |
| legitimate credit repair company / how to know | vetting | Low–Med | blog #26 → `/quiz` |
| is credit repair worth it / worth paying | cost-benefit | Med | blog #8 → `/quiz` |
| should I give a credit repair company account access | security | Low | blog #25 → `/quiz` |
| do I need a credit repair company | evaluate | Low–Med | blog #1 → `/quiz` |

### Tier 2 — Educational top-of-funnel (volume + internal-link fuel)

`remove negative items from credit report`, `how long does credit repair take`, `fastest way to improve credit score`, `lower credit utilization fast`, `fix credit with collections`, `dispute credit report yourself`, `700 credit score with collections` → blog Tier 2 posts → e-book → `/quiz`.

---

## Sequenced Roadmap

### Phase 0 — Measure & validate (do first, ~half day)
- [ ] **Verify Google Search Console** (DNS or HTML tag) — submit `sitemap.xml`. Without GSC we're flying blind.
- [ ] Validate Tier 0/1 keyword difficulty + volume (seo-cluster SERP analysis, or DataForSEO/Ahrefs/SEMrush if available). Confirm "low-hanging fruit" against actual page-1 results.
- [ ] Baseline current rankings/impressions.

### Phase 1 — Technical foundation (the gate, ~1–2 days)
- [ ] `vite-react-ssg` prerender of public routes; `ClientOnly` for authed widgets.
- [ ] Per-route `<Head>` (unique title + meta + canonical) for all public routes — closes audit P1-3.
- [ ] JSON-LD: `Organization` + `Service` (sitewide), `LocalBusiness` (with TX address/area) — closes audit P1-2.
- [ ] Confirm `view-source` shows real HTML on every public route.

### Phase 2 — Local (fastest wins, ~2–3 days)
- [ ] Create/verify **Google Business Profile** (service-area business; confirm eligibility). Complete every field, categories, services, photos.
- [ ] Build 1 city page per target metro (San Antonio first) — unique content, not doorway pages (respect quality-gate thresholds).
- [ ] `LocalBusiness` schema per city page; NAP consistent everywhere.
- [ ] Seed **NAP citations** (Tier-1: Google, Bing Places, Apple Maps, Yelp, BBB, chamber of commerce).

### Phase 3 — Content engine (ongoing, 1 post/week)
- [ ] Build `/blog` infra (MDX + prerendered + `Article` schema + per-post `<Head>` + OG image).
- [ ] Publish calendar Tier 1 #19 + #4 first (anchor the legitimacy story), then the buying-decision cluster.
- [ ] Launch the **Spanish blog** (own keyword set — Tier 0B) — lowest competition, build in parallel.
- [ ] Internal-link discipline: every Tier 2 → a Tier 1; every Tier 1 → `/quiz`.

### Phase 4 — Authority / backlinks (ongoing — see playbook below)

---

## Backlink Playbook (LEGITIMATE only)

> ⚠️ **For a YMYL finance site, link schemes are existential risk.** No PBNs, no bought links, no link farms, no comment/forum spam. A manual action or algorithmic demotion on a credit-repair domain is catastrophic and slow to recover. Every tactic below is white-hat.

**Tier 1 — Citations & profiles (do first, easy, local-SEO double-duty):**
- Google Business Profile, Bing Places, Apple Business Connect, Yelp, BBB, Yellow Pages, local Texas/San Antonio chamber of commerce, industry directories (NACSO if member).

**Tier 2 — Earned / relationship:**
- **Partner cross-links** — you already have loan-officer + F&I-dealership partner materials (`docs/launch/`). Partner pages linking to `/partners` = relevant, authoritative, free.
- **HARO / Connectively / Qwoted** — respond to journalist queries on credit/personal-finance; earns high-DA editorial links. Founder quotes, CROA-compliant.
- **Guest posts** on personal-finance / real-estate / local-Texas blogs (with the legitimacy/no-guarantee angle).
- **Local PR** — Texas business journals, "local expert" columns.

**Tier 3 — Content-driven (compounds):**
- Linkable assets: free dispute-letter templates, a "is this credit-repair company legit?" vetting checklist, an ITIN-credit guide (Spanish) — the kind of thing other sites cite.

**Anchor-text hygiene:** mostly branded ("Clean Path Credit") + naked URL + generic ("learn more"); avoid over-optimized exact-match anchors (a spam signal).

---

## What success looks like (honest timeline)
- **Month 1–2:** GSC live, foundation shipped, GBP verified, first Spanish + Tier 1 posts indexed.
- **Month 3–6:** page-1 for several Tier 0B (Spanish) + local + long-tail terms; local pack presence for San Antonio.
- **Month 6–12:** broader long-tail dominance; begin competing for mid-difficulty commercial terms.
- **Head terms ("credit repair"):** a 12–24 mo authority game, not a low-hanging-fruit target.
