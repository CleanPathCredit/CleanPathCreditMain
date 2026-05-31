# Testimonial Collection — SMS Templates + GMB Review Flow

Workflow for collecting verified testimonials and Google Business Profile reviews from past Clean Path Credit clients. Designed to replace the fabricated placeholders currently in `Proof.tsx` with real, attributed, FTC-compliant testimonials.

**Goal:** 5-10 verified Google reviews + 3-6 site testimonials in the next 14 days.

**GMB review-form link:** https://g.page/r/CYp-SDplr2wMEBM/review

---

## 1. Pre-Send Checklist

Before you start texting past clients:

- [x] Google Business Profile is verified and review link is live (`https://g.page/r/CYp-SDplr2wMEBM/review`)
- [ ] You have written consent on file from each client to contact them post-engagement (CTIA / TCPA — informational text to past clients is generally allowed, but pull the consent record before you send)
- [ ] You have a method to log who agreed to a public testimonial vs. a private review only (use a simple Google Sheet: name, contact, date asked, response, GMB link sent, GMB review left, site testimonial granted)
- [ ] You're prepared to NOT use any testimonial that mentions specific score numbers, dollar amounts, or guaranteed outcomes — even if the client volunteers them, because under FTC Endorsement Guides and CROA §404, you can only feature outcomes you can substantiate with documentary evidence (screenshots, written client confirmation, dated records)

---

## 2. Three SMS Variants

Send one of these to each past client. Pick the variant that matches your prior relationship style.

### Variant A — warm, casual (best for clients you knew well)

```
Hey [First Name] — Alex from Clean Path Credit. Hope life's been good since we wrapped up your credit work.

Quick favor: would you share a 30-second testimonial about your experience? Just what the process felt like, no specific numbers needed.

We're updating the website with real client voices, and yours would mean a lot. Even a quick Google review would help — link's here: https://g.page/r/CYp-SDplr2wMEBM/review

Appreciate you either way.
```

### Variant B — multi-option (let them pick the easiest path)

```
Hey [First Name], Alex here from Clean Path. I'm collecting client experience stories for the new website (anonymous if you prefer) plus Google reviews. Three ways to do it, whichever's easiest:

1. Reply to this text — even one sentence works
2. 60-second voice memo back
3. Drop a Google review: https://g.page/r/CYp-SDplr2wMEBM/review

No pressure either way. Thanks for trusting me with your credit work.
```

### Variant C — direct ask (best for clients who appreciate brevity)

```
[First Name], hope you're well — Alex from Clean Path. Building out the new website and would love your voice on it.

Two asks, totally optional:

1. Could you leave a Google review? Takes 60 sec: https://g.page/r/CYp-SDplr2wMEBM/review
2. If you're up for it, share what the process felt like for you (any 1-2 sentences I can quote on the site, with first name + city only)

Means a lot. Thanks for being one of the originals.
```

**Tip:** Some carriers strip URL previews from `g.page` links, which can lower tap-rate. If you want a branded short URL, set up a redirect at `cleanpathcredit.com/review` that 301s to `https://g.page/r/CYp-SDplr2wMEBM/review` and use that in the SMS instead. Either works, but the branded one looks less spammy in a bulk send.

---

## 3. The Five Questions to Ask (if they reply "what should I write?")

These are designed to elicit experience-quality testimonials, not outcome-claim testimonials — because experience claims don't require substantiation under FTC Endorsement Guides, while outcome claims do.

1. **What was your situation when you came to Clean Path?** (Frame the emotional or situational starting point, not specific score numbers.)
2. **What was different about working with us vs. other options you'd considered?**
3. **What surprised you most about the process?**
4. **Who would you recommend Clean Path to?**
5. **What's one word you'd use to describe the experience?**

Follow up: "Whatever feels natural to share — even one or two sentences is plenty."

---

## 4. What NOT to Ask For (Compliance Guardrails)

Under FTC Endorsement Guides (16 CFR Part 255, updated 2023) and CROA §404:

- **DON'T** ask for specific point increases ("how many points did your score go up?")
- **DON'T** ask them to claim anything was guaranteed
- **DON'T** ask them to compare you to competitors by name
- **DON'T** offer compensation for the review (FTC Endorsement Guides §255.5 — even a discount or gift card creates a "material connection" you'd have to disclose, and stacking that with credit-repair regulation is asking for a UDAAP investigation)
- **DON'T** edit a client's testimonial in a way that changes its meaning. Trim length, fix typos — don't reshape the substance.
- **DON'T** publish a testimonial without written consent. Get a one-line text or email reply: "Yes, you can publish what I sent on the website with my first name and city." Save it.

---

## 5. If a Client Volunteers Outcome Numbers

If they say in their reply: *"I went from a 540 to a 720 in 90 days,"* you have two options:

**Option 1 (preferred):** Use only the experience-quality portion of the testimonial. *"They explained every step of the process and never made me feel rushed."* Skip the numbers.

**Option 2 (only if you can substantiate):** If you have documentary evidence of the score change (screenshots of the bureau report at intake and at graduation, or the client's written confirmation), you may use the number IF you also display the FTC-required typicality disclaimer near it: *"Individual results vary. Not typical. We do not guarantee any specific score change."*

Default to Option 1 unless you have a complete substantiation file ready to defend in an FTC inquiry.

---

## 6. Google My Business Review Workflow

1. **Review-form link is live:** `https://g.page/r/CYp-SDplr2wMEBM/review` — use this in every outreach SMS.

2. **Optional: branded short URL.** Set up `cleanpathcredit.com/review` to 301-redirect to the GMB link. Looks cleaner in SMS sends and survives carrier URL-stripping better.

3. **Respond to every review** within 48 hours. CROA-compliant response template:

   ```
   Thank you, [First Name]. We're glad the process worked for you. — Alex
   ```

   Don't acknowledge specific score outcomes in your reply (it can be construed as confirming/endorsing the outcome claim). Keep it generic.

4. **Don't gate or filter.** Don't ask for happy reviews only and offer to handle complaints privately — the FTC banned this in 2024 ("review gating" is now prohibited).

5. **Track in a sheet.** Date asked, date GMB review left, star rating, reviewer first name, link to review. Useful for documenting the substantiation file behind the "6+ verified Google reviews" claim you'll eventually make on the site.

---

## 7. Site-Embedded Testimonial Format

Once you have 3-6 written testimonials with consent, the data shape to drop back into `Proof.tsx`:

```typescript
const testimonials = [
  {
    firstName: "[First name only]",
    city: "[City, State]",
    quote: "[Trimmed experience-quality quote, 1-3 sentences, no outcome numbers unless substantiated]",
    consentRecord: "[Date and channel of written consent — internal note, not displayed]",
  },
  // ...
];
```

Match this against the placeholder pillars currently in `Proof.tsx`. When you have enough verified testimonials, replace the pillars with a testimonials grid (the original visual structure) — or run them as a hybrid (3 pillars + 3 testimonials) until both arms are full.

---

## 8. Sample 14-Day Cadence

| Day | Activity                                          | Target |
| --- | ------------------------------------------------- | ------ |
| 1   | Pull past-client list from GHL / records          | 30-50 names |
| 1-2 | Send Variant A/B/C SMS to all                     | 100% sent |
| 3-5 | Reply to inbound responses; send the 5 questions  | 30-50% reply |
| 5-7 | Collect testimonials, log consent in sheet        | 8-12 written |
| 7-9 | Confirm GMB review links clicked                  | 5-10 reviews |
| 10  | Trim testimonials to 1-3 sentences each, log substantiation | — |
| 11  | Get written consent reply: "yes, publish with first name + city" | 100% before publish |
| 12  | Update `Proof.tsx` with verified testimonials     | Replace placeholder pillars |
| 13  | Reply to every Google review                      | 100% |
| 14  | Audit: substantiation file complete for any claims used | — |

If you don't hit 5 reviews and 3 testimonials by Day 14, extend by one week before launching paid traffic against the testimonial section. Don't run Meta ads against the unverified pillars; pillars are fine for organic / referral traffic but paid traffic dramatically increases substantiation exposure if a regulator notices.
