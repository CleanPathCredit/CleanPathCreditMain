# Content Brief — Clean Path Credit (Brand Memory Vault)

**What this is:** the single source of truth any person *or AI agent* reads **before** writing or generating content for Clean Path Credit. Feed this file (or paste it) to an LLM ahead of any blog post, page, GBP post, ad, or email so output is on-brand, keyword-aware, and CROA-safe by default.

> **The #1 rule for THIS site (read first):** Clean Path Credit is a **YMYL credit-repair** business. Google holds it to the highest content-quality bar, and a flood of generic AI content gets a finance site *demoted*, not ranked. **We do not mass-produce content.** Every piece must be genuinely useful, accurate, and human-quality. Quality and compliance beat volume here, always.

---

## 1. The business (one-liner)
Clean Path Credit is a **Texas credit-services organization**, founded by **Alex Serratos**, that audits consumers' three credit reports, identifies items that appear inaccurate/incomplete/unverifiable, and disputes them under the FCRA — **bilingual (English & Spanish)**, San Antonio–first, serving all of Texas, by appointment.

## 2. Brand voice
- **Tone:** honest, plain-spoken, reassuring, expert-but-accessible. The "straight shooter who knows the law." Never hypey, never salesy-pushy.
- **Do:** explain the *law* and the *process*; be specific; cite statutes (CROA §404/§405, FCRA §611/§623); acknowledge what credit repair can't do; lead with the customer's goal (mortgage, car, stop paying the "bad-credit tax").
- **Don't:** use exclamation-heavy hype, "secret," "guaranteed," "fast/instant results," fake urgency, or emoji spam.
- **Signature framing:** "do exactly what the law allows — and say so plainly."

## 3. NAP — use IDENTICALLY everywhere
```
Clean Path Credit · (346) 399-5606 · serving San Antonio & all of Texas · by appointment
hello@cleanpathcredit.com · https://cleanpathcredit.com
```

## 4. 🚧 Compliance guardrails (HARD RULES — never violate)
- **No advance-fee language** that contradicts CROA §404 (we bill per completed round, never upfront).
- **No guaranteed outcomes** — never promise a specific score, point gain, "removal" of items, or a timeframe ("in 30/45 days," "fast"). CROA §404 + FTC prohibit this.
- **Never say we "remove" negative items.** We *dispute items that appear inaccurate, incomplete, or unverifiable.* Accurate, verifiable info cannot be removed by anyone.
- **Reviews:** ask for **honest** reviews only — never incentivize or gate them (FTC).
- **"Results vary by individual circumstance"** near any outcome-adjacent claim or closing CTA.
- **Texas CSO registration is PENDING** — do not state a registration number until approved.
- **Spanish content** follows the same rules (sin garantías, sin "eliminar," sin cargos por adelantado).

## 5. Keyword map (priority order — winnable first)
1. **Local English:** "credit repair san antonio (tx)", "credit repair near me", "credit repair company texas", "[city] tx credit repair".
2. **🥇 Spanish (lowest competition):** "reparación de crédito san antonio / en texas", "cómo reparar mi crédito", "reparar crédito para comprar casa", "crédito con ITIN".
3. **Long-tail buyer questions:** "are credit repair companies a scam", "do credit repair companies guarantee results", "legitimate credit repair company", "is credit repair worth it", "how long does credit repair take".
4. **Avoid as targets:** head terms ("credit repair"), and anything implying guaranteed results.

## 6. Audience
Texas families preparing to qualify for a **mortgage, auto loan, or business funding** — including credit-challenged and **Spanish-speaking / ITIN** buyers. They're skeptical (often burned before) and value honesty + proof of legitimacy.

## 7. Author / E-E-A-T
Attribute content to **Alex Serratos, Founder** (Person `@id` `https://cleanpathcredit.com/#founder`, bio at `/about`). Blog posts use a visible byline (EN: "By Alex Serratos, Founder" / ES: "Por Alex Serratos, fundador").

## 8. Best existing content (style references + internal-link targets)
- **Pillar/citable:** `/credit-repair-rights-texas` + `/es/tus-derechos-reparacion-credito-texas` (CROA/FCRA/Ch.393 reference — the gold-standard tone).
- **Local:** `/credit-repair-san-antonio`, `/credit-repair-houston`.
- **Trust:** `/faq`, `/about`, `/how-it-works`.
- **Blog:** `/blog/*` (scam, guarantees, legitimate, DIY, how-long + Spanish versions).
- **Internal-link rule:** every new post links to (a) a relevant pillar/city page and (b) `/how-it-works` or the quiz CTA. Spanish posts link to Spanish pages.

## 9. Technical pattern (how content pages are built)
- New page = React page under `src/pages/` using `<Seo title description canonical [alternates]>` + `<JsonLd>` (Article + FAQPage; author = `#founder`).
- Add the route to `src/App.tsx`, the URL to `scripts/prerender.mjs` ROUTES + `public/sitemap.xml`, then `npm run build` (prerenders to crawlable HTML) + `npm run lint` (tsc).
- Spanish pages: `lang="es"`, reciprocal `hreflang` (en/es/x-default), Spanish schema `inLanguage: "es"`.
- After deploy: `npm run indexnow`; Request Indexing in GSC.

## 10. Pre-publish checklist
- [ ] CROA-safe? (no guarantees / "remove" / fixed timeframe / advance-fee claim)
- [ ] Unique, genuinely useful, human-quality (not generic AI filler)?
- [ ] Targets a real keyword from §5; title + H1 + first 60 words answer the query?
- [ ] Author byline (Alex) + internal links (pillar/city + CTA)?
- [ ] NAP exact where used? Spanish rules applied if ES?
- [ ] Schema valid (Article/FAQPage, author `#founder`)?

---

*This vault is the "memory" the AI-SEO videos describe — but built for credit-repair compliance, so generation stays on-brand and legal. Update it as the keyword map, offers, or compliance status (e.g., CSO approval) change.*
