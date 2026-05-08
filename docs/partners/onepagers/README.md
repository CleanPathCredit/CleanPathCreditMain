# Partner Channel One-Pagers

Print-ready leave-behinds for the four partner channels. Each is a standalone US Letter, single-sided, designed to be handed to a partner in person or printed for a partner to distribute to declined consumers.

## Files

| File | Audience | Lives at |
|---|---|---|
| `lo-onepager.md` | Mortgage Loan Officers / brokers | LO branch handoff, walk-in calls |
| `re-agent-onepager.md` | Real Estate Agents / brokers | Buyer-consultation deck, brokerage office wall |
| `auto-dealer-onepager.md` | Auto F&I managers / dealership floor | Credit-counter handoff at decline |
| `credit-union-onepager.md` | CU member-services / lending VPs | CU partnership call, branch counter |

A bilingual companion to `lo-onepager.md` lives at `../launch/latino-lo-onepager.md` (English/Spanish, working-class Mexican-American buyer focus).

## Print spec (all four)

- **Size:** US Letter, 8.5" × 11", portrait
- **Sides:** single-sided (back blank for partner notes / co-branding stamp)
- **Color:** emerald (#0a6e3d) accent on black/dark-gray body text on cream / off-white background
- **Typography:** serif headline, sans-serif body. (Source serif: Cormorant Garamond / Lora. Source sans: Inter.)
- **Layout:** two-column, headline + hero block at top, two columns underneath, "Next Step" block at bottom-right with the QR code
- **QR code:** 1.25" × 1.25", high-contrast, points to `cleanpathcredit.com/partners?utm_source=<channel>&utm_medium=print&utm_campaign=onepager`
- **Bleed:** standard print bleed, 0.125"
- **Paper:** 100lb cover or 80lb text. Matte preferred over gloss for in-person handoff feel.

## Pre-print compliance gates

The following MUST be filled in before any of these go to print:

- [ ] **Texas CSO Registration #** (replaces `\[FILL IN AFTER APPROVAL\]` in footer)
- [ ] **Surety bond on file** confirmed (footer reference)
- [ ] **Phone / email / address** verified current (currently `(346) 399-5606` / `hello@cleanpathcredit.com` / San Antonio, TX)
- [ ] **QR code** generated and tested — scan from a real phone to confirm it lands on `/partners`
- [ ] **Attorney sign-off** on the four no-comp / no-guarantee disclaimers in each one-pager (specifically: the "no fees flow between us" sentence and the "we will never" list)
- [ ] **Final compliance footer** matches the language used on the live `/partners` page

## Channel-specific compliance notes

### Loan Officer
- RESPA §8 governs. The "no fees flow between us" sentence is the safe-harbor anchor. Do not let any partner suggest a per-file payment or mention it in conversation — that converts the sheet from compliant to evidence in a §8 enforcement action.
- NMLS license # of the LO partner must be on file before they distribute the sheet (Schedule A.1 of the partner agreement).

### Real Estate Agent
- RE brokerage IS a settlement service under RESPA §3(3) — same §8 risk as the LO sheet.
- "We will never represent we are a 'preferred' or 'exclusive' partner" — required language under NAR Code of Ethics. Do not soften.
- Affiliated Business Arrangement disclosure NOT required for a no-comp arrangement; flagged in agreement A.2.4.

### Auto Dealer / F&I
- RESPA does NOT apply (auto financing is not a settlement service under RESPA §3(3)).
- Texas CSO Act (Ch. 393) DOES apply.
- The "we will never let any portion of our fee be rolled into a vehicle finance contract" sentence is critical — it blocks the most common F&I-channel compliance trap (financing aftermarket fees alongside the vehicle).
- FTC §5 (UDAAP) governs marketing claims.

### Credit Union
- Member-benefit framework, not a settlement-service referral.
- Three deployment options listed (decline letter / portal / branch leave-behind) — pick one with each CU partner; don't try to ship all three at the same CU.
- GLBA Safeguards Rule applies to the data-handling side (covered in the partner agreement § 5.3 / 5.4).
- Quarterly aggregate report (no PII) is the reporting hook CUs care about — many will route this through their CRA / community-impact reporting.

## Design pass workflow

1. Open Canva (or Figma / Pages / InDesign) and set up a US Letter portrait template with the spec above.
2. Drop the markdown content into the template. Section headers map directly to the layout blocks.
3. Place the QR code in the bottom-right "Next Step" block. Generate one QR per channel with the right `utm_source` so we can attribute scans by channel in PostHog / GA.
4. Apply the brand emerald (#0a6e3d) to the headline accent line and the QR-code frame only — keep the rest two-tone (black body, gray secondary).
5. Export each as PDF/X-1a:2001 (print-safe), 300 DPI, with bleed and trim marks.
6. Soft-proof on a cheap home printer first. The body block must be readable at arm's length without leaning in.
7. Final print run: send to a local print shop that can deliver matte 100lb cover. Avoid online mass printers for the first run — you want to QA the color shift before scaling.

## Distribution sources (per channel)

- **LO:** Walk into 5–10 mortgage branches in San Antonio with the LO sheet stack and the `docs/launch/lo-walk-in-scripts.md` opener. Ask for the branch manager.
- **RE:** Drop at brokerage offices that host weekly pipeline meetings. Ask if you can present 5 minutes during a meeting and leave a stack at sign-in.
- **Auto:** Hand directly to F&I managers at decline-prone subprime-tier dealers — buy-here-pay-here lots and used-car independents have the highest decline-rate concentration.
- **CU:** Email the CU's lending VP / member-services VP first to schedule a 30-min partnership call. Don't cold-walk a CU branch — deck/pitch handoff goes through executives, not the counter.

## Internal tracking

When you order a print run, log it here:

| Channel | Order date | Quantity | Print shop | UTM source |
|---|---|---|---|---|
| LO | — | — | — | `lo-print` |
| RE Agent | — | — | — | `re-print` |
| Auto Dealer | — | — | — | `auto-print` |
| Credit Union | — | — | — | `cu-print` |

After distribution, scan-volume per UTM source surfaces in GA / PostHog → `/partners` page-view events with `?utm_source=<channel>`. Review monthly to decide which channel to double down on.

---

*This README is internal-only and not part of the printed materials.*
