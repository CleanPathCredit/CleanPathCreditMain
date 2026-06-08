# GO-LIVE: Off-Site Action Sheet (P0–P3)

**Date:** 2026-06-08
**Why:** the site is technically maxed out but **not yet indexed** (`site:cleanpathcredit.com` = 0 pages) and has **zero off-site footprint**. These are the only things left that move the ranking needle, and they're all on your side (10–30 min each). Do them top-down — P0 first, it gates everything.

---

## ⚠️ FIRST: the two-domain decision (`form.cleanpathcredit.com`)

You have a second property — `form.cleanpathcredit.com` ("Free Credit Analysis" funnel, on Vercel). Right now it's **indexable** (robots `Allow: /`, no `noindex`, self-canonical). That splits your SEO authority between two brand properties that target the same terms.

**Recommendation:** make the funnel **`noindex`** so all organic authority consolidates on `cleanpathcredit.com`. The funnel is a *paid-traffic* landing page (ads/SMS point to it) — it doesn't need to rank, and a thin funnel page competing with your main domain only dilutes you.

**Exact fix (in the form. repo):** add to the funnel's `index.html` `<head>`:
```html
<meta name="robots" content="noindex,follow" />
```
(or set an `X-Robots-Tag: noindex` header in its `vercel.json`). Keep `follow` so any links still pass value. **Do NOT** `Disallow` it in robots.txt instead — that blocks crawling but can still leave a URL-only listing in the index; the meta tag is the correct tool.

> If you *intend* the funnel to rank organically as a separate property, tell me and we'll point its canonical at the main site's matching page instead. Default plan = noindex.

**Everywhere you list the business (GBP, citations, social), use `https://cleanpathcredit.com`** — never the form. subdomain.

---

## P0 — Get indexed (THE gate; ~10 min) 🔴

Google has not crawled the site yet. This is mostly waiting on Google, but you can dramatically accelerate it in Search Console.

### Step 1 — Confirm the property is verified
1. Go to **search.google.com/search-console**.
2. If `cleanpathcredit.com` isn't listed: **Add property → Domain → `cleanpathcredit.com`** (the verification `<meta>` tag is already on the homepage, so the alternate **URL-prefix** method `https://cleanpathcredit.com/` will verify instantly via the existing HTML tag).

### Step 2 — Submit the sitemap
1. Left sidebar → **Sitemaps**.
2. Enter `sitemap.xml` → **Submit**. (Full URL: `https://cleanpathcredit.com/sitemap.xml` — it's live, returns 30 URLs.)
3. Status should move to "Success" within a day.

### Step 3 — Request Indexing on the top 10 URLs
For each URL below: paste it into the **search bar at the very top of GSC** ("Inspect any URL") → wait for the check → click **Request Indexing**. (Google rate-limits this to ~10–12/day — that's why it's a top-10 list; the rest get crawled via the sitemap.)

Priority order (money + authority pages first):
1. `https://cleanpathcredit.com/`
2. `https://cleanpathcredit.com/credit-repair-san-antonio`
3. `https://cleanpathcredit.com/credit-repair-rights-texas`
4. `https://cleanpathcredit.com/how-it-works`
5. `https://cleanpathcredit.com/credit-repair-houston`
6. `https://cleanpathcredit.com/blog/how-to-fix-your-credit-to-buy-a-house-texas`
7. `https://cleanpathcredit.com/faq`
8. `https://cleanpathcredit.com/about`
9. `https://cleanpathcredit.com/blog/credit-repair-vs-credit-counseling-vs-debt-settlement`
10. `https://cleanpathcredit.com/es/reparacion-de-credito-san-antonio`

> Bing/ChatGPT side is already handled — IndexNow has submitted all 30 URLs (HTTP 200). This step is the Google half.

**Expected:** first pages indexed in 2–7 days; full crawl over 2–4 weeks. Check **GSC → Pages** to watch the indexed count climb.

---

## P1 — Google Business Profile (~30 min) 🔴 — biggest local-pack lever

All copy is paste-ready in `gbp-social-content-kit.md`. The clicks:
1. **business.google.com** → manage/claim **Clean Path Credit** (or create it).
2. **Complete verification** (video or postcard — start it now, it's the slowest part).
3. **Edit profile → Category → Primary:** change from `Credit counseling service` to **`Credit repair service`** if offered; if not, `Financial consultant`. (This is the single highest-impact GBP edit — it decides which searches you're eligible for.)
4. **Add secondary categories** (only if accurate): `Financial consultant`, `Loan agency`.
5. **Service area:** San Antonio + surrounding; **hide the address** (you're an SAB/by-appointment).
6. **Website field:** point to `https://cleanpathcredit.com/credit-repair-san-antonio` (your strongest local page — *not* the homepage, and *not* form.).
7. **Description + Services:** paste from `gbp-social-content-kit.md` §1.
8. **Post #1** from the kit (post 1/week — GBP posts feed the local pack).

---

## P2 — Reviews 1 → 25 🔴 — top-3 local factor + your #1 conversion lever

Competitors have 44–369× your review count; this is the biggest single gap. **System (FTC-compliant — no incentives, ever):**

1. **Get your review short-link:** GBP → **"Ask for reviews"** → copy the `g.page/r/...` link.
2. **Ask at the moment of a win** (a deletion posts, a client gets approved, end of a good call). That timing doubles response rates.
3. **Send the request** (templates below — pick SMS or email; SMS gets ~5× the response).
4. **One follow-up** 3–4 days later if no response. Then stop.
5. **Track** in your command-center sheet (who asked / responded / left review).
6. **Reply to every review** (even 5-stars) — Google rewards owner engagement.

**SMS (highest response):**
> Hi [First Name] — it was a pleasure helping you with your credit. If you have a sec, an honest Google review would mean a lot and helps other San Antonio families find us: [review link]. No pressure, and thank you either way. — Alex, Clean Path Credit

**Email:** the longer version is in `gbp-social-content-kit.md` §5.

> **What I can do for you here:** once you send me your GBP review link, I'll (a) drop these into ready-to-send Gmail drafts via Composio, and (b) wire the link into the command-center sheet. Just paste the link.

**Compliance:** never offer anything in exchange for a review, never review your own business, never gate the ask to only-happy clients. Honest asks only (FTC 2024 rule — fake/incentivized reviews carry real penalties).

---

## P3 — Citations (drip over 2–4 weeks) 🟡

Full tiered list + canonical NAP in `citations-nap.md`. **Start with these three this week:**
1. **Bing Places** (bingplaces.com) — can import from GBP once GBP is live.
2. **Apple Business Connect** (businessconnect.apple.com).
3. **BBB** (bbb.org/get-listed) — strong trust signal for a financial service.

Then either drip the rest manually or buy **Yext / BrightLocal / Moz Local (~$150/yr)** to fan out the data aggregators automatically (keeps NAP locked).

**Use the canonical NAP from `citations-nap.md` verbatim** — consistency is the whole point.

---

## After listings exist — send me the URLs
The moment your GBP, Facebook, LinkedIn, Yelp, and BBB profiles are live, paste the URLs here and I'll add them to the `Organization.sameAs` array in the site's schema. That links every profile into one entity Google recognizes — a real knowledge-graph / E-E-A-T win that ties your reviews and citations back to the site.

---

## Sequencing (one focused session + a drip)
**Today (~45 min):** P0 (GSC sitemap + request-index top 10) → start P1 GBP verification (it's the slowest to approve, so kick it off first).
**This week:** finish GBP, Bing + Apple + BBB, send me your review link.
**Ongoing:** P2 review asks after every client win; P3 citation drip; 1 GBP post/week.
**Me, in parallel:** P4 conversion/speed (done this round); `sameAs` wiring when URLs arrive; the funnel `noindex` if you want me to find/touch that repo.
