# Testimonial Substantiation File

**Purpose.** Per the FTC Endorsement Guides (16 CFR Part 255) and CROA §404,
every outcome claim that appears in a testimonial must be backed by
contemporaneous evidence that the endorsement is genuine and that the
described outcome actually occurred. This file is the tracking sheet for
every claim Clean Path Credit publishes. **No claim moves to paid traffic
until its row in this file shows `verified=yes`.**

**Status as of file creation:** all current testimonials in
`src/components/sections/Proof.tsx` are marked `verified=no`. They were
written for narrative copy, not from collected evidence. Either:

1. Replace each with a verified outcome from a real client (preferred), or
2. Edit the language so no specific numeric outcome is claimed (e.g.
   "Clean Path was easy to work with" — opinion, not outcome — needs no
   substantiation beyond a release form), or
3. Pull the testimonial section entirely until at least one verified row
   exists.

**Owner.** [Name to fill in] — admin@cleanpathcredit.com.

**Review cadence.** Before any paid traffic spend over $500/month, this
file must show at least N verified rows where N ≥ number of testimonials
displayed on the live site. Re-review quarterly.

---

## What counts as substantiation

For each numeric outcome claim, the file at `docs/substantiation/<initials>/`
must contain:

| Claim type                              | Required evidence                                                                                                  |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| "X items removed" / "deleted"           | Before + after credit reports (or bureau response letters) within 90 days of the claimed event                     |
| Score change ("up N points")            | Pre + post FICO/Vantage screenshots from the same source (Credit Karma → Credit Karma, not Credit Karma → myFICO)  |
| Approval claims ("closed on a home")    | Closing disclosure / loan funding doc / signed approval letter — copy with PII redacted (full name, SSN, full DOB) |
| Interest-rate savings                   | Old loan agreement + new loan agreement showing the rate delta. PII redacted.                                      |
| Funding amount ("$50k business line")   | Approval letter / lender notification with amount visible. PII redacted.                                           |
| Generic "great service" (no number)     | Signed release form is enough. No outcome claim → no outcome substantiation.                                       |

Plus, for **every** testimonial regardless of claim:

- **Signed release form** (`docs/substantiation/_template_release.md`) granting permission to use first name + last initial + city/profession + the specific quoted text. Dated.
- **Channel of origin** — was this collected via an in-app survey, an email reply, a recorded call (with consent), a video the client filmed for us, etc.? Recorded so we can produce the original if challenged.
- **Date collected.**

---

## Current testimonial roster

Source: `src/components/sections/Proof.tsx` as of this commit.

| ID | Display name        | Title                                    | Outcome claims (extracted)                                                            | Evidence required                                                              | Verified? | Notes                          |
| -- | ------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | --------- | ------------------------------ |
| 01 | Sarah M.            | First-Time Homebuyer — Dallas, TX        | "removed 4 collections in under 60 days"; "I closed on my home last month"            | Before/after report showing ≥4 collections deleted within 60 days; closing doc | **NO**    | needs collection + verification |
| 02 | Marcus T.           | Restaurant Owner — Chicago, IL           | "reporting errors I'd had for 8 years … Gone in 5 weeks"; "$50k business line of credit" | Before/after report showing the items dated 8+ years deleted within 5 weeks; lender approval | **NO**    | needs collection + verification |
| 03 | Aisha R.            | Registered Nurse — Atlanta, GA           | "got it removed completely"; "Up 67 points in 45 days"                                | Before/after report showing the medical collection removed; pre/post FICO from same source | **NO**    | needs collection + verification |
| 04 | Kevin L.            | Small Business Owner — Phoenix, AZ       | "23% → 6.9% auto refi after 90 days"; "$4,000 back in my pocket"                      | Original auto loan + refi loan with rate delta visible; payment-savings calc          | **NO**    | needs collection + verification |
| 05 | Vanessa B.          | Marketing Manager — Houston, TX          | (no numeric outcome — opinion only)                                                   | Signed release form only                                                       | **NO**    | release form not on file          |
| 06 | James H.            | Real Estate Investor — Miami, FL         | "got three of them deleted"                                                           | Before/after report showing the 3 items removed                                | **NO**    | needs collection + verification |

---

## Process for adding a NEW testimonial

1. **Get the outcome documentation first.** Don't write the testimonial
   from memory. Pull the credit reports / loan docs / approval letters and
   confirm the numbers match what the client claims.
2. **Copy the docs into `docs/substantiation/<initials>/`.** Redact PII
   (full SSN, DOB, full account numbers — show last 4 if needed for
   identification, mask the rest). Filename convention:
   `<YYYY-MM-DD>_<artifact-type>.pdf`, e.g. `2025-03-12_before-after-equifax.pdf`.
3. **Have the client sign the release form** (`_template_release.md`).
   Save under the same folder as `<YYYY-MM-DD>_release.pdf`.
4. **Quote the client verbatim.** No paraphrasing of outcome numbers. If
   the client said "around 60 points", don't round to "67 points". The
   text in `Proof.tsx` must match the source verbatim, modulo trimming for
   length (cuts must not change meaning).
5. **Add a row to the table above** with `Verified? = YES` and the date.
6. **Only then** add the testimonial to `Proof.tsx`.

If a client is later proven wrong about a claimed outcome (e.g. the
collection wasn't actually deleted, or it came back), pull the
testimonial within 7 days. Per FTC guidance, a misleading endorsement
must be corrected promptly — leaving it up after we know it's wrong is
the part that turns into a fine.

---

## Disclaimers we already display

The block at `src/components/sections/Proof.tsx:63-65` already includes
the standard FTC "results not typical / individual experience" disclaimer.
That disclaimer **does not exempt us** from substantiating each individual
outcome claim — it exempts us from claiming the outcome is typical. Both
must be true: each row backed by evidence, AND the disclaimer present.

The section heading reads "Real people. Real stories." (not "Real
results"). That phrasing was chosen deliberately so the headline isn't
itself an outcome claim — see the compliance copy sweep PR for context.

---

## Related compliance documents

- `src/pages/Terms.tsx` — Terms of Service (CROA §404 + §407 verbatim;
  not yet attorney-reviewed; trigger first $10K month or first 25 paying
  clients).
- `docs/SESSION_LOG.md` — running log of compliance-related decisions
  including why specific guarantee language was removed.
