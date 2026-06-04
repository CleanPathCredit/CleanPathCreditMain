# Review + GBP + Citation Engine — Turnkey Execution Pack

**Date:** 2026-06-04
**Purpose:** Copy-paste-ready assets for the three off-site levers that decide local ranking. On-page SEO is done (16 PRs, live). These levers are what move you into the local pack — and they're execution + time, not code.

> **The ranking math (from live competitive analysis):** English San Antonio pack floor ≈ **85–110 reviews**. Spanish pack ("reparación de crédito san antonio") ≈ **30–50** and wide open. You're at **1**. Target: **8–12 genuine reviews/month at 5.0★**, asked in the client's language. That single habit is the highest-leverage thing in this whole project.

---

## PART 1 — Review Engine (lever #1)

### One-time setup
1. Google Business Profile → **"Ask for reviews"** → copy the short link (looks like `https://g.page/r/XXXX/review`).
2. Paste it into **Vercel → Project → Environment Variables** as `GBP_REVIEW_URL` (powers the `/api/admin/review-request` email), and use it as `[REVIEW_LINK]` in the texts below.

### When to ask (timing beats everything)
Ask **right after a visible win** — a deleted/updated item, a completed dispute round, or a mortgage pre-approval. Sentiment peaks there. Don't batch-blast; ask as wins happen, in the client's language.

### SMS — English
**Initial:**
> Hi [Name], it's Alex at Clean Path Credit. If you've got 30 seconds, an honest Google review really helps other San Antonio families find us: [REVIEW_LINK]. Thank you either way!

**Follow-up (+4 days, once, only if no review):**
> Hi [Name], no pressure at all — just circling back in case the link got buried: [REVIEW_LINK]. Glad to have helped either way!

### SMS — Spanish
**Inicial:**
> Hola [Name], soy Alex de Clean Path Credit. Si tienes 30 segundos, una reseña honesta en Google ayuda a otras familias de San Antonio a encontrarnos: [REVIEW_LINK]. ¡Gracias de todas formas!

**Seguimiento (+4 días, una vez):**
> Hola [Name], sin presión — solo por si el enlace se perdió: [REVIEW_LINK]. ¡Un gusto haberte ayudado!

### Email
Use the shipped tool: `POST /api/admin/review-request` with `{ email, firstName, lang }` (admin-only) — subject auto-selects EN "A quick favor?" / ES "¿Nos harías un pequeño favor?". Requires `RESEND_API_KEY` + `GBP_REVIEW_URL` set in Vercel.

### Responding to reviews (within 24–48h — response velocity is itself a ranking signal)
- **Positive (EN):** "Thank you, [Name] — it was a pleasure helping you get mortgage-ready. — Alex"
- **Positive (ES):** "¡Gracias, [Name]! Fue un gusto ayudarte a prepararte para tu meta. — Alex"
- **Negative:** stay calm, **never reference any client detail** (privacy/CROA), and move it offline: "I'm sorry your experience fell short, [Name]. I'd like to make it right — please reach me directly at hello@cleanpathcredit.com. — Alex"

> ⚠️ **FTC (16 CFR Part 255):** never offer money/discounts for a review; never ask *only* happy clients. Ask everyone, for an honest review. Cherry-picking is itself deceptive.

---

## PART 2 — GBP Posting Calendar (lever #2)

Post **≥1×/week** (2× ideal). An active profile ranks better. Alternate EN/ES. Each post = text + the page to link.

| Wk | Lang | Post text | Link |
|----|------|-----------|------|
| 1 | EN | Wondering if a credit-repair company is even legit? Here's the 5-point checklist we tell every caller to use before signing anything. | /faq |
| 1 | ES | ¿La reparación de crédito es una estafa? Cómo distinguir una empresa legítima usando la ley — en 5 puntos. | /blog/es/reparacion-de-credito-es-estafa |
| 2 | EN | Buying a home in San Antonio? Your credit file decides your rate. Here's how the dispute process actually works — no upfront fees. | /credit-repair-san-antonio |
| 2 | ES | ¿Comprando casa en San Antonio? Tu crédito decide tu tasa. Servicio completo en español, sin cargos por adelantado. | /es/reparacion-de-credito-san-antonio |
| 3 | EN | "How long does credit repair take?" The honest answer — the FCRA's 30-day window and why most files take a few rounds. | /blog/how-long-does-credit-repair-take |
| 3 | ES | ¿Tienes ITIN y quieres comprar casa? Sí se puede reparar y construir crédito. Te explicamos cómo. | /blog/es/reparar-credito-con-itin |
| 4 | EN | How to choose a credit repair company in San Antonio: the 7 things to check before you sign. | /blog/how-to-choose-credit-repair-company-san-antonio |
| 4 | ES | ¿Cuánto tiempo tarda la reparación de crédito? Expectativas reales, sin promesas falsas. | /blog/es/cuanto-tiempo-tarda-reparacion-credito |
| 5 | EN | Do credit-repair companies guarantee results? No honest one does — and here's why that's the green flag you want. | /blog/do-credit-repair-companies-guarantee-results |
| 5 | ES | Reparación de crédito en San Antonio — en tu idioma, con tus derechos explicados. Auditoría gratis de 15 minutos. | /es/reparacion-de-credito-san-antonio |
| 6 | EN | Can you fix your credit yourself? You have the same FCRA rights we use — here's the DIY path, and when help pays off. | /blog/can-i-fix-my-credit-myself |
| 6 | ES | ¿Reparación de crédito legítima? Verifica el registro CSO de Texas y que no te cobren por adelantado. | /faq |

Rules for any post: no score promises, no "we'll remove X," no specific timeframes. Process + rights + free-audit CTA only.

---

## PART 3 — Citation Tracker (lever #3)

**Paste this NAP block byte-identical everywhere** (consistency is the ranking signal):
```
Clean Path Credit
(346) 399-5606
San Antonio, TX — serving all of Texas
https://cleanpathcredit.com
hello@cleanpathcredit.com
```
Category everywhere: **Credit repair service**. Hours: **By appointment**. Service-area business (no street address).

### Tier 1 — do first (free, high authority)
| Directory | Submit URL | Done |
|---|---|---|
| Google Business Profile | business.google.com | ☐ |
| Bing Places | bingplaces.com | ☐ |
| Apple Business Connect | businessconnect.apple.com | ☐ |
| Yelp for Business | biz.yelp.com | ☐ |
| BBB (get A+ / accreditation) | bbb.org/get-accredited | ☐ |
| Facebook Page | facebook.com/business | ☐ |
| Nextdoor Business | business.nextdoor.com | ☐ |

### Tier 2 — local + listicle land-grabs (analysis found openings)
| Directory | Submit URL / note | Done |
|---|---|---|
| **Three Best Rated** (no credit-repair-SA page exists yet — be first) | threebestrated.com | ☐ |
| Expertise.com (San Antonio credit repair) | expertise.com — "Update/Add listing" footer link | ☐ |
| San Antonio Hispanic Chamber | sahcc.org (member directory) | ☐ |
| San Antonio Chamber of Commerce | sachamber.org | ☐ |
| Yellow Pages | yellowpages.com | ☐ |
| Manta | manta.com | ☐ |

---

## Priority order (if you do nothing else)
1. **GBP category → "Credit repair service"** (5 min, biggest relevance factor)
2. **Set `GBP_REVIEW_URL`, start the review SMS on every client win** (biggest prominence factor)
3. **GSC: submit sitemap + Request Indexing** on the money pages
4. **Tier-1 citations** (one evening), then weekly GBP posts + steady reviews

Track Google Search Console impressions/positions weekly. Expect movement on Spanish + long-tail terms in **~1–3 months** with reviews flowing; broader terms over 6–12.
