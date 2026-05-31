# Pre-Ads Audit Report — cleanpathcredit.com

**Date:** 2026-05-31
**Scope:** Trimmed `existing-web-project` Phase 1 audit (technical, SEO, CRO, compliance/ad-readiness, security). Intake interview and proposal/deposit gate skipped — this is the owner's own site, audited specifically to de-risk an imminent **paid-ads push**.
**Method:** Code-level review of the live repo + live diagnostics against production (`https://cleanpathcredit.com`).

---

## Verdict: **Path A — Optimize** · Overall score **72 / 100**

This is a **well-built site that needs targeted fixes, not a rebuild.** The funnel is sophisticated, the security posture is above-average, and the head metadata is solid. The issues blocking a clean ad launch are concentrated, cheap to fix, and mostly about *ad-platform approval* and *crawlability* — not structural quality.

| Dimension | Score | One-line |
|---|---|---|
| Technical foundation | 70 | Solid Vercel SPA; client-render limits crawlability + per-route SEO |
| SEO | 62 | Great `<head>`; broken OG image, thin sitemap, no structured data, identical per-route meta |
| CRO / Funnel | 88 | Genuinely strong — goal-personalized, cost-of-inaction math, urgency scoring |
| **Compliance / Ad-readiness** | **55** | **Meta + some copy still make "remove/45 days" claims that risk ad rejection** |
| Security | 78 | Strong CSP & headers; `unsafe-inline`/`unsafe-eval` weaken script protection |
| Performance | *not measured* | Structural risk: SPA + 2 global third-party embeds; needs a real Lighthouse/CrUX pull |

---

## 🔴 P0 — Fix BEFORE spending $1 on ads

### P0-1 · Outcome-promising claims in meta + copy (ad-rejection + CROA risk)
- **Live `<head>` meta description:** *"…turn denials into approvals in 45 days or less."*
- **OG description:** *"Remove negative items fast with proven FCRA-backed dispute strategies."*
- **`QuizFunnel.tsx:66`** urgent tier: *"a fully done-for-you **removal** system."*
- **Why it's P0:** Google & Meta credit-repair ad policies reject landing pages making removal/guarantee/specific-timeframe claims. This *also* contradicts the CROA-safe on-page sweep (PR #8) — the sweep fixed the body, the head was left behind.
- **Fix:** Rewrite `index.html` meta description + OG/Twitter descriptions to process-not-outcome language; change "removal system" → "dispute system" / "done-for-you dispute process." ~30 min.

### P0-2 · `og-image.png` is missing (broken social/link previews)
- `index.html` references `https://cleanpathcredit.com/og-image.png`, but the file isn't in `public/` — the URL returns the SPA HTML fallback (`text/html`, not a PNG).
- **Why it's P0:** Every shared link / ad preview / iMessage card shows a blank or broken image. Kills CTR on exactly the channels the ad push will use.
- **Fix:** Generate a 1200×630 branded OG image → `public/og-image.png`. ~20 min (image-gen skill available).

---

## 🟡 P1 — High value, do soon

### P1-1 · Sitemap is missing public pages
- `sitemap.xml` lists only `/`, `/how-it-works`, `/login`, `/register`.
- **Missing:** `/terms`, `/privacy` (YMYL trust signals Google weighs), `/unlock` (a sales page).
- `/login` + `/register` arguably shouldn't be indexed.
- **Fix:** Rewrite sitemap to include the indexable public set; drop auth utility pages. ~15 min.

### P1-2 · No structured data (JSON-LD) — YMYL E-E-A-T gap
- Zero Schema.org markup. For a credit-repair (YMYL) site, missing `Organization`/`LocalBusiness`, `Service`, and `FAQPage` schema is a real organic + rich-result handicap.
- **Fix:** Add JSON-LD to `index.html` (Organization + Service) and a FAQ block. ~45 min.

### P1-3 · Identical meta on every route (SPA limitation)
- The `vercel.json` SPA rewrite serves the same `index.html` (same title/description) for `/how-it-works`, `/unlock`, `/terms`, etc.
- **Fix options:** client-side `<head>` management (react-helmet — fast, but bots may not run it) **or** per-route prerendering (`vite-plugin-ssg`/prerender — better for SEO + ad bots). Decision needed. ~2–4 hrs depending on path.

---

## 🟢 P2 — Worth doing, not blocking

- **P2-1 · CSP hardening:** remove `'unsafe-inline'`/`'unsafe-eval'` from `script-src` (nonce/hash-based). Higher effort; meaningful for an SSN-handling site. *(Note: this finding sits alongside the open audit item to move `unsafe_metadata.plan` → `private_metadata.plan`.)*
- **P2-2 · Performance baseline:** run Lighthouse + pull CrUX field data. Measure LCP impact of the global ElevenLabs (`unpkg`) + Stripe buy-button embeds; consider deferring/lazy-loading the voice widget off the funnel path.
- **P2-3 · Confirm Calendly is *not* broken in production:** live diagnostics cleared CSP and the event URL (both pass), so the "won't populate" report is almost certainly a local privacy-extension block — i.e. **working as designed** for real visitors. Confirm with one clean-browser walk to step 5, then close the backlog item.

---

## What the live diagnostics proved

| Check | Result | Meaning |
|---|---|---|
| CSP `frame-src`/`script-src` for Calendly | ✅ allows `*.calendly.com` | Not a CSP block |
| Calendly event URL | ✅ HTTP 200 | Booking page exists & published |
| `og-image.png` | ❌ returns `text/html` | File missing |
| `robots.txt` / `sitemap.xml` | ✅ 200 | Present (but sitemap thin) |
| Response headers | ✅ HSTS, X-Frame-Options DENY, nosniff, Permissions-Policy | Strong baseline |

---

## Recommended fix order (fastest path to ad-ready)
1. **P0-1** rewrite meta/OG + "removal" copy (ad approval) — 30 min
2. **P0-2** generate `og-image.png` — 20 min
3. **P1-1** fix sitemap — 15 min
4. **P1-2** add JSON-LD structured data — 45 min
5. *Then decide* **P1-3** (per-route meta strategy) and **P2** items.

**P0-1 + P0-2 + P1-1 are ~65 minutes of work and clear the actual blockers to launching paid traffic.**
