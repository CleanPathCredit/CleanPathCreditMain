# Meta Ads — Copy Drafts

Ad copy for the first 90 days of Clean Path Credit's Meta (Facebook + Instagram) campaigns. Four campaign types, three or more variations each. All copy is compliance-aware (no outcome guarantees, no advance-fee promises, no fabricated testimonials).

> **Use this with `targeting-spec.md`.** The audience definitions, exclusions, and optimization events for each campaign live there.

> **Before you publish:** every variation must clear the pre-launch checklist in `pre-launch-checklist.md` — specifically the attorney sign-off and the CSO registration footer on the destination page.

---

## Campaign 1 — English consumer cold (top of funnel)

**Audience:** credit-challenged buyers age 25–45, Texas metros (San Antonio, Houston, Dallas, Austin), no special-ad-category restrictions if framed correctly (see `targeting-spec.md`).

**Destination:** `https://cleanpathcredit.com/?utm_source=meta&utm_medium=paid&utm_campaign=en-cold-<variation>`

**Optimization event:** `Lead` (form submission via /api/lead)

### Variation 1A — "Your rent already counts"

**Hook (first line):**
> Your rent already counts.

**Primary text:**
> Fannie Mae and Freddie Mac just approved new credit scoring (FICO 10T and VantageScore 4.0) that includes rent, utility, and BNPL payment history.
>
> If you've been paying $1,500 / $2,000 / $2,500 a month in rent on time — that history can now help you qualify for a mortgage.
>
> Take our 60-second credit readiness check and see where you stand.

**Headline (under the image/video):**
> Find out if you could be mortgage-ready in 60–90 days.

**Description:**
> CROA-compliant. Texas-based. Bilingual.

**CTA button:** Learn More

### Variation 1B — "You weren't told this"

**Hook:**
> Nobody tells you this when you get denied.

**Primary text:**
> The credit scores Fannie Mae and Freddie Mac use just changed for the first time in 30 years. The new models look at rent, utility, and BNPL payment history — not just credit cards.
>
> If a loan officer told you "no" last year, it might be a different answer now.
>
> Take a 60-second readiness check. No credit pull, no commitment.

**Headline:**
> A 60-second check could change your timeline.

**CTA button:** Learn More

### Variation 1C — "From renting to closing"

**Hook:**
> From renting to closing — what changed in 2026.

**Primary text:**
> Mortgage scoring just got a major update. The new FICO 10T and VantageScore 4.0 models — approved for Fannie Mae and Freddie Mac — read your rent, utility, and BNPL history.
>
> Many buyers who couldn't qualify last year now can in 60–90 days, with a focused credit readiness path.
>
> See where you stand. 60-second check. Free.

**Headline:**
> The 30-year scoring update most buyers don't know about.

**CTA button:** Learn More

---

## Campaign 2 — Spanish consumer cold (top of funnel)

**Audience:** Mexican-American working class, age 25–45, Texas metros, Spanish language preference. Avatar matches `docs/launch/spanish-consumer-onepager.md`.

**Destination:** `https://cleanpathcredit.com/es-comprador?utm_source=meta&utm_medium=paid&utm_campaign=es-cold-<variation>`

**Optimization event:** `SpanishFunnelView` (custom Pixel event on /es-comprador) for upper funnel; `Lead` for lower funnel once volume warrants.

> **Translation note:** copy is in *Mexican* Spanish — working-class register, "papás" not "padres", "biles" not "facturas", "loan officer" left in English (commonly used). Reviewed by a bilingual specialist before publish.

### Variación 2A — "Tu renta ya cuenta"

**Hook:**
> Tu renta ya cuenta.

**Texto principal:**
> Fannie Mae y Freddie Mac — los dos prestamistas más grandes del país — están aceptando nuevos puntajes de crédito que sí ven cómo vives. Tu renta, tu luz, tu agua, tu internet, tus biles mensuales: todo eso ahora cuenta.
>
> Llevas años pagando renta. Ese dinero no tiene que perderse para siempre.
>
> Mira dónde estás en 60 segundos. Sin compromiso, sin pull de crédito.

**Encabezado:**
> Aprende lo que cambió para los compradores latinos en 2026.

**Descripción:**
> Programa bilingüe · Texas

**CTA:** Más información

### Variación 2B — "Una casa para tu familia"

**Hook:**
> Una casa para tu familia. Empieza con tu crédito.

**Texto principal:**
> Has trabajado dos turnos. Has cuidado a tus papás, a tus hijos. Has pagado renta de $1,500, $2,000, $2,500 al mes — dinero que no vuelve.
>
> Y cuando llegas con el loan officer, te dicen que tu credit score está muy bajo o que tu ingreso de cash no califica.
>
> Eso está cambiando. Mira dónde estás en 60 segundos.

**Encabezado:**
> No estás solo. Y eso está cambiando.

**CTA:** Más información

### Variación 2C — "Tu primera casa"

**Hook:**
> Tu primera casa puede estar más cerca de lo que crees.

**Texto principal:**
> Por primera vez en más de 30 años, los puntajes de crédito que se usan para calificar una hipoteca cambiaron. Ahora ven tu renta, tu luz, tu agua, tus biles — no solo si tienes tarjetas de crédito.
>
> Si te dijeron "no" el año pasado, ahora puede ser una respuesta diferente.
>
> 60 segundos. En español. Sin compromiso.

**Encabezado:**
> El cambio que muchos compradores no saben.

**CTA:** Más información

---

## Campaign 3 — Warm retargeting (mid funnel)

**Audience:** Site visitors in last 30 days who did NOT submit the form. Pixel-based custom audience.

**Destination:** `https://cleanpathcredit.com/?utm_source=meta&utm_medium=paid&utm_campaign=retarget-<variation>`

**Optimization event:** `Lead`

### Variation 3A — "Still thinking about it?"

**Hook:**
> Still thinking about your credit timeline?

**Primary text:**
> The 60-second readiness check is free, no credit pull, and gives you a real answer instead of a "maybe in a few months."
>
> If you've been on the fence — finish the check. You'll know in 60 seconds whether you're 30, 60, or 90 days away from being mortgage-ready.

**Headline:**
> Where do you actually stand?

**CTA:** Learn More

### Variation 3B — "Specific items, not vague advice"

**Hook:**
> A score isn't a strategy.

**Primary text:**
> Most "credit advice" tells you to "pay your bills on time and wait 6 months." That's not a strategy — that's a stall.
>
> The Clean Path readiness check identifies the *specific* items dragging your score and the order to address them. 60 seconds. Free.

**Headline:**
> Get a specific path, not a generic answer.

**CTA:** Learn More

### Variation 3C — "Talk to a real person"

**Hook:**
> If a quiz feels too impersonal — book a 15-minute call.

**Primary text:**
> Sometimes typing it out doesn't capture the whole picture. Book a free 15-minute call and walk a real specialist through your situation.
>
> No pressure, no pitch. We'll tell you straight whether we can help — and if not, where you'd be better served.

**Headline:**
> 15 minutes. Real specialist. Free.

**CTA:** Book Now

---

## Campaign 4 — B2B partner outreach (LO / RE / F&I)

**Audience:** Loan officers, real estate agents, F&I managers in Texas metros (job titles + interests). NOT consumer-facing.

**Destination:** `https://cleanpathcredit.com/partners?utm_source=meta&utm_medium=paid&utm_campaign=b2b-<variation>`

**Optimization event:** `Lead` on `/api/partners` form completion

> **Compliance note:** B2B partner ads are NOT subject to the consumer-facing CROA §404 outcome-guarantee restrictions to the same degree, but the same posture applies as a brand consistency choice. The "no fees flow between us" RESPA §8 framing is the safe-harbor anchor — keep that in copy.

### Variation 4A — "Stop losing buyers at the credit pull"

**Hook:**
> Stop losing buyers at the credit pull.

**Primary text:**
> 25–40% of mortgage applications are denied or routed deep subprime. Most of those buyers can be in qualifying territory in 60–90 days — with the new FICO 10T / VantageScore 4.0 scoring + a focused readiness path.
>
> Clean Path Credit is a Texas-based CROA-compliant credit readiness program for the buyers your LO desk can't close today. No referral fees exchanged. RESPA §8 safe by design.
>
> Become a partner — 15-minute onboarding call, free.

**Headline:**
> Recapture the buyers your LO desk loses to credit.

**Description:**
> Texas-based · Bilingual · No fees exchanged

**CTA:** Apply Now

### Variation 4B — "RESPA-safe credit referral"

**Hook:**
> The RESPA-safe credit-readiness referral most LOs don't have.

**Primary text:**
> Most credit-repair companies operate as kickback structures that violate RESPA §8. Clean Path Credit is structured as a one-way referral arrangement — no fees flow between us. You regain a buyer who was otherwise lost.
>
> Bilingual. Texas-based. CROA-compliant. Per-file specialist coverage.
>
> 15-minute onboarding call. No commitment.

**Headline:**
> A credit referral path that won't blow up your compliance review.

**CTA:** Apply Now

### Variation 4C — "Bilingual coverage"

**Hook:**
> Bilingual credit readiness — the gap most LOs don't fill.

**Primary text:**
> The Latino buyer pool is the fastest-growing first-time-homebuyer segment in Texas. Most credit-repair shops can't serve them in Spanish — full program, all dispute correspondence, all consumer disclosures.
>
> Clean Path Credit can. Bilingual specialist per file. RESPA-safe partnership structure (no fees exchanged). Texas-based.
>
> 15-minute call to onboard.

**Headline:**
> Reach the buyer pool your competition can't.

**CTA:** Apply Now

---

## Headlines / hook bank (general)

For when you need to refresh creative without rewriting whole ads:

**Pain hooks:**
- "The credit pull came back too low. Now what?"
- "Six months of work — gone at the credit pull."
- "Renting another year while your competition closes."

**Authority hooks:**
- "Fannie Mae and Freddie Mac changed the rules for the first time in 30 years."
- "What FICO 10T and VantageScore 4.0 actually mean for your closing date."
- "Most credit advice is generic. Yours shouldn't be."

**Curiosity hooks:**
- "60 seconds to find out if 60 days from now is realistic."
- "What changes for buyers in 2026."
- "The 30-year scoring update most buyers don't know about."

**Bilingual hooks:**
- "Tu renta ya cuenta."
- "Una casa para tu familia. Empieza con tu crédito."
- "El cambio que muchos compradores no saben."

---

## What you cannot say

Hard rules — every variation must respect these:

- ❌ "Guaranteed approval"
- ❌ "Will raise your score by X points"
- ❌ "Get approved in 30 days"
- ❌ "Remove anything from your credit report"
- ❌ "We've helped X people qualify" (without backed-up substantiation file)
- ❌ "Pay $X today and you'll qualify"
- ❌ Specific FICO score numbers in primary text (triggers Meta special-ad-category restrictions)
- ❌ "Bad credit? No problem!" (FTC has flagged this exact phrase)
- ❌ Implying specific lender approval ("Get approved at [Bank]")
- ❌ Spanish ads pointing to English-only pages or English-only disclosures

## What you CAN say

- ✅ "May" / "could" / "designed to"
- ✅ "Average" / "typical" / "in our program"
- ✅ "60–90 days on average"
- ✅ "Specific items inaccurate or unverifiable on your report can be disputed under FCRA §611 / §623"
- ✅ Real testimonials WITH backed substantiation in `docs/SUBSTANTIATION.md`
- ✅ "FICO 10T and VantageScore 4.0 are now approved by FHFA for Fannie Mae and Freddie Mac" (factual, dated)
- ✅ The CSO registration # in the landing page footer
- ✅ The Spanish disclosures on `/es-comprador`

---

## Refresh cadence

Run 3+ variations of each campaign concurrently. Replace under-performers weekly. Top performers stay live until CTR drops 30% from peak (creative fatigue).

| Performance signal | Action |
|---|---|
| CTR < 0.8% after 1,000 impressions | Pause variation |
| CPM > $30 in Texas geo | Re-target / reduce audience size |
| Frequency > 3.5 in 7 days | Refresh creative |
| Lead → Stripe checkout < 5% | Investigate landing page, not ad |
| Lead → Stripe checkout > 15% | Scale that ad |

---

*All copy in this file is draft. Attorney sign-off required before publish.*
