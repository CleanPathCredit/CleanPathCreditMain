# Blog Content Calendar — 40-Topic SEO Roadmap

Source: 40 questions surfaced from r/CRedit, r/povertyfinance, r/personalfinance, r/CreditCards, r/loanoriginators, r/DebtFree via FindQuestions.com (real Reddit search intent, not keyword-tool guesses).

This calendar prioritizes topics by funnel value, then maps each Tier 1 post to a target keyword, search intent, voice-mode prompts to feed AI, compliance landmines, and the funnel page it should link to. Tier 2 + 3 get lighter treatment.

> **Pairs with `docs/launch/meta-ads/`** — blog drives organic discovery, ads drive paid. Both feed the same `/api/lead` quiz form. Internal linking is the leverage.

---

## How to use this calendar

For each Tier 1 topic:

1. Use the FindQuestions hack — feed the post title + voice-mode prompts (below) into ChatGPT or Claude
2. Ask one question at a time, answer in voice mode (the SEO hack — voice answers are unique enough to rank)
3. Run the resulting draft through `/mirofish compliance-validation` before publishing
4. Have an attorney redline the first 3 posts; subsequent posts can ride on the same redline pattern unless they touch new compliance terrain (ITIN, business credit, debt settlement, etc.)
5. Publish on `/blog/<slug>` (infrastructure to be built in a separate PR)
6. Internal-link to the relevant funnel destination (column 5 below)

**Compliance posture for every post:**

- No outcome guarantees (CROA §404)
- No fabricated testimonials (FTC Endorsement Guides 16 CFR Part 255)
- No FICO score numbers in the title or first 200 words (Meta indexes blog posts for ad targeting; numeric score promises trigger Special Ad Category enforcement)
- "Results vary by individual circumstance" disclaimer above any closing CTA
- Texas CSO registration # in footer for any post that mentions Clean Path's services

---

## Tier 1 — Sales-intent (write these first)

These posts are answered by people **actively shopping** for credit-repair help. Highest commercial intent. Highest internal-link leverage to `/quiz` and `/partners`.

| # | Title | Target keyword | Funnel CTA |
|---|---|---|---|
| 1 | Do I Really Need to Hire Someone to Fix My Credit? | "do I need credit repair company" | `/quiz` (with "or DIY using our free guide" exit) |
| 4 | Are Credit Repair Companies Actually a Scam? | "are credit repair companies a scam" | `/quiz` (positions Clean Path as the legit answer) |
| 7 | What Can Credit Repair Companies Actually Do for Me? | "what does credit repair company do" | `/quiz` |
| 8 | Is It Worth Paying for Credit Repair or Should I DIY? | "credit repair worth it" | `/quiz` (lead magnet for DIY path) |
| 13 | Should I Pay Debt or Hire a Credit Repair Company? | "pay debt or credit repair" | `/quiz` |
| 16 | What Should I Do Before Hiring a Credit Repair Company? | "before hiring credit repair company" | `/quiz` (lead-magnet entry point) |
| 19 | Do Credit Repair Companies Guarantee Results? | "credit repair guaranteed results" | `/quiz` (legitimacy story — "no, and that's the point") |
| 25 | Should I Give a Credit Repair Company Access to My Accounts? | "credit repair company account access" | `/quiz` (security positioning) |
| 26 | How Do I Know If a Credit Repair Company Is Legitimate? | "legitimate credit repair company" | `/quiz` (vetting checklist mapping to Clean Path's posture) |

### Tier 1 deep-treatments

#### #1 — Do I Really Need to Hire Someone to Fix My Credit?

- **Search intent:** evaluate-options, near-purchase. Reader is on the fence.
- **Voice-mode prompts to feed AI** (you answer one at a time):
  1. What's the most common reason someone considers hiring a credit-repair company?
  2. Walk me through one client situation where DIY would have been the right call.
  3. Walk me through one situation where DIY would have been a mistake.
  4. What's the realistic time cost of doing this work yourself?
  5. What's the cheapest legitimate version of "hiring help" — and when does it make sense?
  6. What red flags say "this person should NOT hire a credit-repair company"?
  7. What's the most expensive mistake you've seen DIY credit repairers make?
  8. How do you frame the decision for someone with a tight budget?
  9. What's an honest answer to "is your service worth $X/month for me specifically"?
  10. If a reader had to walk away with one decision-tree, what would it look like?
- **Compliance landmines:**
  - Don't claim Clean Path is "always better" than DIY (CROA §404)
  - Be honest about who DIY is right for (FTC §5 — material omissions are deceptive)
- **Internal links:** the e-book lead magnet, `/partners` (for partner discovery), `/quiz`, the FCRA §611 / §623 explainer post (#10)

#### #4 — Are Credit Repair Companies Actually a Scam?

- **Search intent:** skepticism + due diligence. Reader has been burned or seen warning content.
- **Voice-mode prompts:**
  1. What's the actual % of credit-repair companies that are scams in your experience?
  2. What's the most common scam pattern you see, and what makes it identifiable?
  3. What does a legitimate operator do that a scam operator can't replicate?
  4. What does CROA §404 actually require, in plain English?
  5. Tell me about one client who left a bad operator and came to you — what changed?
  6. What's the role of the Texas CSO registration in vetting?
  7. What's the role of the surety bond?
  8. What questions should a consumer ask before signing anything?
  9. What's a fair price range for legitimate credit repair, and why does pricing vary?
  10. If you wanted to scam someone, what would you do? (positions Clean Path as the operator who knows the playbook)
- **Compliance landmines:**
  - Don't disparage specific competitors by name (libel risk)
  - Distinguish "scam" from "low-quality but legal" carefully
- **Internal links:** post #19 (guarantees), post #25 (account access), post #26 (legitimacy checklist), `/quiz`

#### #7 — What Can Credit Repair Companies Actually Do for Me?

- **Search intent:** education, mid-funnel.
- **Voice-mode prompts:**
  1. Walk through a typical 90-day program week-by-week.
  2. What's the ratio of "things you do that I couldn't do myself" vs "things that just take time"?
  3. What's the most common file complexity that DIY doesn't handle well?
  4. What's the FCRA §611 dispute process and what does a credit-repair company add to it?
  5. What's the FCRA §623 furnisher dispute and why does it matter?
  6. What's an example of a creative remedy you've used that a DIYer wouldn't think of?
  7. What's the role of pay-for-delete negotiations?
  8. How do you approach mixed-status families and ITIN files differently?
  9. What does "rent reporting" mean and when is it part of the program?
  10. If you had to summarize the program's actual value in one sentence, what would it be?
- **Compliance landmines:**
  - Pay-for-delete is a contested practice — explain that not all furnishers honor it (no guarantee)
  - Don't claim ability to remove items that are accurate and verifiable (CROA prohibits)
- **Internal links:** post #9 (remove negative items), post #10 (dispute inaccurate items), post #15 (collections), `/quiz`

#### #8 — Is It Worth Paying for Credit Repair or Should I DIY?

- Same shape as #1 but framed as cost-benefit calculator
- **Voice-mode prompts:**
  1. What's the typical hourly rate equivalent of credit repair if you DIY effectively?
  2. What's the failure rate of DIY attempts in your experience? (with caveat — anecdotal)
  3. When does DIY pay for itself in time saved?
  4. What's the opportunity cost of waiting an extra 60-90 days because of DIY mistakes?
  5. Walk through a math example for a buyer trying to qualify for a $300K mortgage
  6. What's the cheapest "hybrid" — DIY with paid coaching/templates?
  7. When does paid handling pay for itself in mortgage rate alone?
  8. What's the worst-case for DIY (legally / score-wise)?
  9. What's the worst-case for paid (financially / refunds)?
  10. Decision tree for a reader at the end?
- **Compliance landmines:** don't claim mortgage rate guarantees ("save $X over the life of the loan" — no, you can't promise)
- **Internal links:** the e-book (DIY path), `/quiz` (paid path)

#### #19 — Do Credit Repair Companies Guarantee Results?

- **The most important post in this entire calendar.** Anchors the legitimacy story for every other post.
- **Search intent:** trust validation. Reader is testing whether the operator is honest.
- **Voice-mode prompts:**
  1. Why is "no guarantee" actually a good sign?
  2. What law specifically prohibits guarantees, and what's the language?
  3. What CAN a credit-repair company honestly promise?
  4. How does Clean Path's pricing reflect the no-guarantee posture? (per-round-after-completion, not upfront)
  5. What's the difference between a money-back guarantee and an outcome guarantee?
  6. Tell me about a client where you couldn't deliver what they hoped — what did that look like?
  7. What's the role of the 3-day cancellation right under CROA §405?
  8. Why are "guaranteed score increases" advertised by some companies illegal?
  9. How should a reader evaluate companies that DO advertise guarantees?
  10. What does a reader do RIGHT NOW with this information?
- **Compliance landmines:** this post itself is the model — the post that says "no guarantee" most clearly is the post that's safest
- **Internal links:** post #4 (scam), post #25 (access), post #26 (legitimacy), `/quiz`

#### #25 — Should I Give a Credit Repair Company Access to My Accounts?

- **Search intent:** security concerns, ID-theft risk awareness.
- **Voice-mode prompts:**
  1. What account access do you actually need, and what do you NOT need?
  2. What's the difference between read-only credit-monitoring access and write access?
  3. What does GLBA Safeguards Rule require of credit-repair companies?
  4. What's a red flag in account-access requests?
  5. How does Clean Path handle credentials specifically? (Clerk-managed, encrypted, never stored in plaintext)
  6. What if a company asks for SSN before signing the contract?
  7. What's the right timing of credit-pull authorization?
  8. What documentation should the consumer keep?
  9. What's a fraud playbook a scammer would use with account access?
  10. Reader checklist before granting access?
- **Compliance landmines:** GLBA Safeguards specifics
- **Internal links:** post #4 (scam), post #26 (legitimacy), `/quiz`, `/privacy`

#### #26 — How Do I Know If a Credit Repair Company Is Legitimate?

- **Voice-mode prompts:**
  1. What's the legitimacy checklist, in priority order?
  2. CSO registration in Texas — what does it mean and why does it matter?
  3. Surety bond — what is it and why does it protect the consumer?
  4. Better Business Bureau accreditation — does it actually mean anything?
  5. NACSO membership — does it matter?
  6. What state-level regulators should the consumer look up?
  7. What does the consumer-credit-file-rights notice look like, and why is it required?
  8. What does the contract have to include under CROA §405?
  9. What's the 3-day cancellation right and what does compliance look like?
  10. Reader: 5-minute vetting checklist before signing anything
- **Compliance landmines:** be careful not to imply BBB / NACSO accreditation guarantees quality (it doesn't)
- **Internal links:** post #4, #19, #25, `/quiz`

(Tier 1 topics #13 and #16 follow the same shape — see the bonus framework at the end of the doc for the boilerplate prompt structure.)

---

## Tier 2 — Educational top-of-funnel (write second)

Mid-funnel discovery. Reader is researching credit topics broadly, not yet shopping for a service. Lower CTA conversion but higher SEO volume + internal-link feeding into Tier 1.

| # | Title | Target keyword | Funnel CTA |
|---|---|---|---|
| 9 | How Do I Remove Negative Items From My Credit Report? | "remove negative items credit report" | E-book → `/quiz` |
| 10 | Can I Get Inaccurate Items Removed From My Credit? | "remove inaccurate credit report" | E-book + dispute templates |
| 11 | What's the Fastest Way to Improve My Credit Score? | "fastest way to improve credit" | E-book |
| 12 | How Long Does It Actually Take to Fix Your Credit? | "how long credit repair" | E-book |
| 14 | Can I Fix My Credit With Collections on My Report? | "fix credit collections" | `/quiz` |
| 15 | How to Get a 700 Credit Score With Collections? | "700 credit score collections" | `/quiz` |
| 17 | How to Dispute Items on Your Credit Report Yourself? | "dispute credit report yourself" | E-book (template chapter) |
| 20 | How to Talk to Creditors About Removing Negative Items? | "negotiate credit removal" | E-book |
| 22 | Can Negative Items Fall Off My Credit Report? | "negative items fall off credit" | E-book |
| 23 | How to Lower Your Credit Utilization Ratio Fast? | "lower credit utilization" | E-book |

**Tier 2 voice-mode prompt boilerplate** (use the same 10-question structure as Tier 1, but pivot the angle):

> *"I'm writing a blog post answering [TITLE]. Ask me 10 questions, one at a time, that will produce a unique post drawing on my experience as a Texas-based CROA-compliant credit-services operator. Focus on practical actionable steps the reader can take TODAY, with realistic expectations and zero outcome guarantees. End with a question about how this connects to the bigger picture of getting mortgage-ready."*

---

## Tier 3 — Broad finance education (write later or batch with AI)

Cast-a-wide-net SEO. Lower commercial intent. Best produced as a batch using AI with light editing. Internal-link to Tier 2 + Tier 1.

#2, #3, #5, #6, #18, #21, #24, #27, #28, #29, #30, #31, #32, #33, #34, #35, #36, #37, #38, #39, #40

These don't need individual deep-treatments. Use the boilerplate prompt:

> *"I'm writing a blog post answering [TITLE]. Ask me 8 questions, one at a time, that will produce a useful but compact post (700-1000 words). Focus on plain explanations, not advanced strategy. End with a CTA paragraph that connects the topic to mortgage readiness and links to our free e-book."*

---

## Bonus topics (the FindQuestions report's "extra ideas" list)

Treat these as a queue to draw from when an event makes one timely (FICO model update, regulator action, market move, etc.). Each gets a Tier 2-equivalent treatment.

- Free credit report resources and where to get them
- Step-by-step dispute letter templates customers can use themselves
- Red flags that indicate a credit repair scam
- How credit scores are calculated and what factors matter most
- Timeline for when negative items fall off your report
- Negotiation scripts for calling creditors directly
- Difference between hard inquiries and soft inquiries
- Building credit with secured credit cards
- How to read your credit report and spot errors
- Best practices for improving credit utilization
- Impact of paying collections vs. letting them age off
- Free credit counseling vs. paid credit repair services

---

## Subreddit monitoring playbook

These communities are where the source questions came from. Monitor for fresh search intent + ad creative ideas + competitive intel.

- **r/CRedit** (highest signal — direct topic)
- **r/povertyfinance** (avatar match — working class, first-time buyer)
- **r/personalfinance** (broad — sample for trend signal, not direct outreach)
- **r/CreditCards** (utilization questions, balance-transfer angles)
- **r/loanoriginators** (B2B partner-channel signal — what LOs are griping about)
- **r/DebtFree** (debt-payoff intersection)
- **r/FinancialCareers** (B2B partner-channel, CU/lending VPs)
- **r/MoneyDiaries** (sample story arc + voice for testimonial framing later)

**Cadence:** scan once weekly. When the same question appears 3+ times in 30 days, write a fresh post or update an existing one.

**Do NOT engage in subreddits as Clean Path** unless you read each subreddit's self-promo policy carefully. r/CRedit specifically prohibits operator self-promotion. Use these for *listening*, not posting.

---

## Publishing pipeline (when blog infra ships)

1. **Draft** in Notion/Google Docs using the voice-mode prompt above
2. **Compliance pass:** `/mirofish compliance-validation` on title + intro + every CTA
3. **Attorney redline** on the first 3 Tier 1 posts; subsequent posts inherit the redline pattern unless new compliance terrain appears
4. **Convert** to MDX for the blog route (infra in a separate PR)
5. **OG image** generated (separate PR — likely uses Vercel OG)
6. **Internal-link audit** — every Tier 2 post should link to at least one Tier 1; every Tier 1 should link to `/quiz`
7. **Publish + sitemap update**
8. **Submit to Google Search Console** for indexing
9. **Share to LinkedIn / GMB / X** with the OG card

---

## Cadence recommendation

- **Weeks 1–2:** Tier 1 posts #19 (no guarantees) and #4 (scam) — these anchor the legitimacy story
- **Weeks 3–6:** Tier 1 posts #1, #7, #8, #25, #26 — round out the buying-decision cluster
- **Weeks 7–10:** Tier 2 batch (10 posts at 1/week) — fill out the educational layer
- **Weeks 11+:** Tier 3 in 2-week sprints, mixed with bonus topics as timely

**Target volume:** 1 post/week sustained = 52 posts/year, enough surface area to dominate "credit repair Texas" + "credit repair San Antonio" within 12 months on a consistent SEO play.

---

## What this calendar does NOT cover

- **Blog infrastructure** — `/blog` route, MDX pipeline, sitemap, RSS, OG image generation. Separate PR.
- **Lead-magnet content** for posts that should gate exit-intent — the e-book pop-up modal already covers this; individual post-level gating not needed unless conversion data warrants it later.
- **Spanish blog** — separate calendar, different keywords, different voice. Not in this PR.
- **Backlink strategy** — separate playbook (HARO, partner cross-posting, GMB).
- **Featured-snippet optimization** — apply opportunistically as posts ship; not worth pre-planning every post for it.

---

*This calendar is a living document. Reorder Tier 1 if a regulator action or news event makes a different post timely. Track CTR + conversion per post in Search Console + PostHog and rotate Tier 3 posts based on what surprises you.*
