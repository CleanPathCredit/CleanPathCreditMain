# mem0 Seed File

Structured memory items for mem0 ingestion. Each `## ` section is a discrete memory designed to be retrieved by semantic similarity. Topics are kept narrow and self-contained so retrieval is precise.

## How to ingest into mem0

From your **local** Claude Code (the one where mem0 MCP is configured), run a prompt like:

```
Read docs/memory/seed.md. For each section under an `## ` H2 heading,
call the mem0 add tool once with:
  - content: the full section text including the heading title
  - metadata: { category: <CATEGORY tag from frontmatter>,
                priority: <PRIORITY tag>,
                last_updated: "<DATE tag>",
                source: "docs/memory/seed.md",
                project: "clean-path-credit" }
Report back which memories were ingested.
```

The cloud sessions used for the credit-repair work (like the one this file was generated in) do NOT have mem0 — only your local Claude Code does. To update memories, edit this file in the repo, then re-run the ingest prompt locally.

## Sensitivity guardrails

Do NOT add to mem0:
- Specific client names, contact info, or financial details (CFPB / Texas privacy)
- Attorney advice (privilege)
- API keys, credentials, surety bond carrier full details
- Anything covered under client-data confidentiality

These stay in the repo or in `~/.claude/CLAUDE.md` only.

---

## Identity — Clean Path Credit

```
CATEGORY: identity
PRIORITY: high
DATE: 2026-05-04
```

Clean Path Credit is a CROA-compliant credit-repair and credit-readiness operation founded by Alex Serratos, based in San Antonio, TX, scaling nationally. Primary repository: `github.com/CleanPathCredit/CleanPathCreditMain`. Stack: React 19 + Vite 6 + Tailwind 4, React Router v7, Clerk for auth, Supabase for data, PostHog for product analytics, Google Analytics (G-DJ5ZCL2L50) for marketing analytics, Stripe for billing, Resend for transactional email, GoHighLevel (GHL) for CRM/SMS. Brand colors: emerald accent (`emerald-500`/`emerald-600`/`emerald-700`), zinc text scale, white backgrounds. UI library: lucide-react icons, motion (formerly Framer Motion) for animations, custom HoverCard component. The company's positioning is the only LO-partnered, real-estate-investor-aligned, bilingual credit-repair shop in San Antonio scaling to a national platform.

---

## Compliance gate map — must clear before launch

```
CATEGORY: compliance
PRIORITY: critical
DATE: 2026-05-04
```

Five regulatory regimes apply to Clean Path Credit's operation. All must be cleared before paid traffic, LO walk-ins, or printed leave-behinds:

1. **RESPA Section 8** — prohibits paying or receiving anything of value for the referral of settlement services in connection with federally-related mortgages. The original plan's "$500–1,000 LO referral split per closed loan" is structured exactly as a prohibited kickback. Until attorney structures the LO comp model (likely as a Marketing Services Agreement at fair market value, or consumer-direct only with no LO payments), all comp language stays as the placeholder "Partnership terms discussed during onboarding call."

2. **TSR §310.4(a)(2)** — credit-repair fees can only be charged after documented results are demonstrated to the consumer. The proposed "$1,500–3,500 program fee" upfront violates this; a monthly subscription billed at month-end may also violate. Fee structure must be per-documented-outcome, attorney-reviewed.

3. **Texas Finance Code Chapter 393 (CSO)** — requires registration with the Texas Secretary of State and a $10,000 surety bond before offering credit-repair services. Soliciting CSO services without registration is itself a violation. Distributing flyers or pointing ads at credit-repair landing pages before registration is a violation.

4. **CROA §404(a)(3)** — prohibits any guarantee of specific score change, item removal, approval outcome, or interest-rate savings. Required Consumer Credit File Rights notice (§405(a)(1)) and 3-day right of cancellation (§405(a)(2)) must be disclosed in the contract.

5. **FTC Endorsement Guides 16 CFR Part 255 (updated 2023)** — prohibits fabricated testimonials. Penalties up to $51,744 per violation. Fabricated testimonials in `Proof.tsx` were replaced with program-pillar cards in PR #15.

6. **CFPB UDAAP guidance on bilingual marketing** — if marketing in Spanish, all consumer disclosures (file rights notice, contract, 3-day cancel) must also be available in Spanish. English-only disclosures with Spanish marketing is a UDAAP risk.

---

## Track A4 — LO/Real Estate Agent referral pipeline (fast-cash)

```
CATEGORY: strategy
PRIORITY: high
DATE: 2026-05-04
```

Track A4 is the primary near-term revenue motion. The pitch: most LOs are losing 25–40% of their files to credit denials and don't have a credit-repair partner they trust. Clean Path solves that gap as a CROA-compliant, bilingual, mortgage-readiness-focused (FICO 10T / VantageScore 4.0) program. Sales motion is in-person walk-ins with breakfast tacos and a one-pager leave-behind in Bexar/Comal/Guadalupe/Wilson counties. Three LO archetypes: independent mortgage broker (motivated by direct commission salvage), brokerage LO at UWM/Movement/Guild/Caliber/Fairway (motivated by filling the gap their corporate channel partner doesn't handle, especially Latino working-class files), dealership F&I manager (motivated by recovering bumped buyers — see Track A6). Walk-in scripts and one-pager source live at `docs/launch/lo-walk-in-scripts.md` and `docs/launch/lo-referral-onepager.md`. Do NOT walk into LO offices until Texas CSO registration is approved AND the LO comp structure has cleared RESPA §8 attorney review.

---

## Track A6 — Dealership F&I Credit Recovery Channel

```
CATEGORY: strategy
PRIORITY: medium
DATE: 2026-05-04
```

Track A6 mirrors A4 but targets dealership F&I managers. The pitch: F&I bumps 25–40% of buyers at the desk for credit; most just walk and never come back. Clean Path is the recovery channel — 60–90 days, mortgage-grade credit-repair, then they come back to the dealership for the auto loan with a score that approves.

Key distinction from A4: most auto loans are NOT federally-related (RESPA only covers mortgage), so RESPA Section 8 generally does NOT apply to a dealership-pays-Clean-Path or Clean-Path-pays-dealership arrangement structured around the auto loan. However, CROA, FCRA permissible-purpose, TILA, and state CSO laws all still apply. The original plan's flyer copy "we save 60–80% in 90 days" violates CROA §404(a)(3) outcome-guarantee — that line gets dropped before printing. Pitch becomes: "Don't lose another deal to credit. Free pre-screen, no upfront fees, CROA-compliant program." Walk-in and flyer assets not yet built; pending LO motion proof points first.

---

## Flagship Track B2 — Clean Path OS

```
CATEGORY: strategy
PRIORITY: high
DATE: 2026-05-04
```

Clean Path OS is the 12–24 month flagship play — a vertical AI-native services platform: an AI-augmented credit-and-mortgage-readiness operating system for credit-invisible and thin-file Latino/working-class buyers in Texas (and nationally). MVP (90 days): mobile-first webapp built with Claude Code on top of the existing Vite + React + Clerk + Supabase + Stripe stack; CROA-compliant Claude-drafted dispute letters; rent-reporting integration via Esusu / Boom / RentReporters API or partner; bureau-pull integration; Stripe subscription billing ($99–149/mo consumer, $99/mo LO seat); in-app Calendly with Spanish-speaking coaches; bilingual UX (English/Spanish); AI coach for credit-building plan. Mortgage close success fee $1,000–2,500 paid by LO out of commission (subject to RESPA §8 structure). Moats: regulatory expertise (CROA, FCRA, Texas wholesaling), proprietary outcome data, LO partner network, brand authority within Latino working-class buyers, ability to sell the underlying property via wholesaling/subject-to. By month 18 target $100K+ MRR with 700–1,500 active subs.

---

## Stop-doing list

```
CATEGORY: strategy
PRIORITY: high
DATE: 2026-05-04
```

Explicitly NOT pursuing:
- Generic "AI agent for everything" outbound to industries with no ICP angle
- Standalone AEO consulting (only as bundle add-on to other offers)
- Fitness coaching brand as a P&L line — demoted to personal-brand asset, 30 min/week max until Q2 2026
- New generic freelance dev-sprint clients — keep cash from existing clients (A Tex Service Co, Alamo City Hitch & Co); convert them to AI Front Desk + AEO + Reactivation packages at higher MRR
- Crypto, NFTs, generic GenAI consulting decks, "build a course about anything" projects
- Healthcare admin agent for solo practitioners (long sales cycle, HIPAA — skip year 1)
- AI insurance broker (licensing required, crowded space)
- Quantum computing, sovereign cloud, ESG compliance reporting (no SMB wallet)

---

## Avatar — Latino working-class first-time buyer

```
CATEGORY: avatar
PRIORITY: high
DATE: 2026-05-04
```

The primary consumer avatar for both Track A4 referrals and the Spanish funnel (`/es-comprador`). Mexican-American, working-class, 28–55 years old, household income $40–80K, often informal income (cash, side jobs, multiple jobs). Renting now ($1,500–2,500/mo); dreams of owning. Credit thin or damaged — often from old medical bills, utilities, phone bills, or never having had cards. May have ITIN rather than SSN. Often supports parents, mixed-status household, may send remittances to family abroad. Speaks Spanish at home, English at work. Trusts in-person and voice over apps. Mistrusts "credit repair" because of scammy bilingual radio ads ($2K upfront then disappear). Cultural touchpoints: family responsibility, generational wealth, escaping the renting trap, providing for parents. Vocabulary: "renting" (not just "alquiler"), "loan officer" (not "oficial de préstamos"), "credit score" (not "puntaje crediticio" alone), "medical bills" (not "facturas médicas"), "biles" alongside "facturas," "side jobs" (not "trabajos secundarios"). Use "tú" (familiar) not "usted" (formal). Houston/SA register but content scales to Phoenix/LA/Chicago/Miami without naming locations. Highest-trust copy moves: explicit acknowledgment of ITIN, cash income, and mixed-status families on the page; "diferentes a las compañías de la radio" trust block citing CROA in plain Spanish.

---

## Substantiation discipline — testimonials and outcome claims

```
CATEGORY: compliance
PRIORITY: critical
DATE: 2026-05-04
```

No fabricated testimonials, anywhere. The original `Proof.tsx` had six attributed fake testimonials (Sarah M., Marcus T., etc.) with specific outcome claims ("up 67 points in 45 days"). These were replaced with six program-pillar cards in PR #15 (CROA compliance, one specialist per file, FCRA dispute strategy, mortgage readiness, bilingual delivery, weekly written updates). Real testimonials are being collected via SMS to past clients and Google Business Profile reviews; workflow at `docs/launch/testimonial-collection-sms.md`. Live GMB review-form link: `https://g.page/r/CYp-SDplr2wMEBM/review`. Live GMB share link: `https://share.google/MNihGGj41IpwKPv0b`. When real testimonials arrive: written consent on file required (one-line text or email reply: "Yes, you can publish what I sent on the website with my first name and city"); no specific outcome numbers unless documented (screenshots, dated records); experience-quality quotes only by default. Outcome guarantees prohibited by CROA §404(a)(3) — avoid "45 days or less," "turn denials into approvals," "proven," "60–80% removal," or any specific score-lift promise. "60 a 90 días en promedio" survives because "en promedio" / "on average" is descriptive, not a guarantee. Don't gate or filter reviews (FTC banned 2024).

---

## Past-client testimonial collection workflow

```
CATEGORY: operations
PRIORITY: medium
DATE: 2026-05-04
```

14-day cadence. Pull past-client list from GHL. Send one of three SMS variants (warm / multi-option / direct) with the GMB review-form link `https://g.page/r/CYp-SDplr2wMEBM/review` inline. If they reply "what should I write?" send the five questions: (1) what was your situation, (2) what was different about working with us, (3) what surprised you most, (4) who would you recommend Clean Path to, (5) what's one word for the experience. Trim responses to 1–3 sentences. Get written consent before publishing ("Yes, you can publish with my first name and city"). Target: 5–10 GMB reviews + 3–6 site testimonials in 14 days. If you don't hit those numbers, extend by a week before launching paid traffic. Don't run Meta/Google ads against the substantiation-free pillar version of `Proof.tsx`; pillars are fine for organic and referral traffic but paid traffic dramatically increases substantiation exposure if a regulator notices. Branded short URL `cleanpathcredit.com/review` recommended for SMS sends (better tap-rate than `g.page` direct).

---

## Spanish marketing — funnel and content sequencing

```
CATEGORY: strategy
PRIORITY: medium
DATE: 2026-05-04
```

Live Spanish landing page at `/es-comprador` (PR #15). Mirrors `docs/launch/spanish-consumer-onepager.md`. Mobile-first, sticky bottom CTA, sets `<html lang="es">` on mount, fires GA event `spanish_funnel_view` for separate funnel attribution. Calendly URL configurable via `VITE_CALENDLY_URL_ES` (falls back to English audit Calendly). 30-video Spanish content plan executes in tranches: 10 scripts shipped first, batched into 2 filming sessions, posted across IG/TikTok/FB over 2 weeks, then iterate with the next 20 scripts in whichever 3 themes hit. Spanish-language credit content has dramatically lower CPM than English on Meta and TikTok — front-load Spanish over English. Page uses "60 a 90 días en promedio" (CROA-safe, not a guarantee). Hard pre-traffic gates: Texas CSO registration filled into footer placeholder, surety bond carrier filled, Spanish CROA disclosures (file rights notice, contract, 3-day cancel) translated and ready, bilingual native-speaker QA pass, smoke-tested funnel end-to-end in Spanish.

---

## Tech stack and project conventions

```
CATEGORY: technical
PRIORITY: medium
DATE: 2026-05-04
```

React 19 + Vite 6 + Tailwind 4. React Router v7 with lazy-loaded pages in `src/pages/`. App entry `src/App.tsx` with all routes. Page convention: each page exports a named function (e.g., `EsComprador`), lazy-imported in App.tsx. Marketing landing pages use a standalone layout (no global Navbar/Footer) following the `/unlock` pattern — ad-conversion focused. Title and language attribute set via `useEffect` (`document.title`, `document.documentElement.lang`); restore on unmount. UI tokens: emerald accent (`emerald-500/600/700`), zinc text scale, rounded-2xl on cards, shadow-sm/md, max-w-4xl/6xl containers. Icons: lucide-react. Animations: motion (Framer Motion successor). Auth: Clerk via ClerkProvider in App.tsx; ProtectedRoute component for gated routes. DB: Supabase. Analytics: PostHog (product), Google Analytics G-DJ5ZCL2L50 (marketing). Stripe for payments via Stripe-buy-button web component. Resend for transactional email. ElevenLabs ConvAI widget loaded globally in `index.html`. Working branch convention: `claude/<short-description>-<random-suffix>`. PRs created via the GitHub MCP server.

---

## PR #15 state — substantiation cleanup + GA + LO docs + Spanish page

```
CATEGORY: live-state
PRIORITY: high
DATE: 2026-05-04
```

Active PR: `cleanpathcredit/cleanpathcreditmain#15` on branch `claude/fix-api-empty-content-sePyK`. Contents: (a) `Proof.tsx` fabricated testimonials replaced with 6 program-pillar cards; (b) `index.html` GA gtag.js installed for G-DJ5ZCL2L50, outcome-guarantee language stripped from meta description, og:description, twitter:description; (c) launch playbook docs at `docs/launch/lo-walk-in-scripts.md`, `docs/launch/lo-referral-onepager.md`, `docs/launch/testimonial-collection-sms.md`, `docs/launch/spanish-consumer-onepager.md`; (d) live page at `/es-comprador` rendering the Spanish consumer one-pager. CI all green (CodeQL, TS lint, Vercel preview). Not yet merged — pending end-to-end smoke test and final review. Pre-merge gates that don't block this PR but block production launch / paid traffic: Texas CSO registration approved, $10K surety bond placed, RESPA §8 LO comp attorney review, TSR §310.4(a)(2) fee-collection timing review, 5+ verified GMB reviews, Resend domain verified.

---

## Active in-flight work and pending decisions

```
CATEGORY: live-state
PRIORITY: medium
DATE: 2026-05-04
```

Deferred work currently parked: (1) Spanish video scripts — 10 starter scripts batched for one filming session, scoped but not yet drafted; (2) F&I dealership flyer + walk-in scripts — to be built once LO motion has proof points; (3) Latino-LO B2B outreach piece — if Alex wants a Spanish version of the LO one-pager for cold-calling Latino mortgage brokers, separate smaller deliverable; (4) Funnel smoke test end-to-end — still the #1 unblocker for any walk-in or paid traffic; only Alex can run this with a real card; (5) Resend domain verification (DKIM/SPF/return-path) for cleanpathcredit.com transactional email; (6) Meta paid ad test — deferred 30 days behind walk-in motion; (7) `cleanpathcredit.com/review` 301 redirect to GMB review-form link for cleaner SMS deliverability; (8) Composio MCP wired locally for GMB / Gmail / GHL / Calendly / Twilio automation; (9) mem0 wired locally for semantic memory across sessions.
