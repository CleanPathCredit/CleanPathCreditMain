# Runbook — Past-Client SMS Automation

Automate the 14-day past-client testimonial-collection cadence documented in `docs/launch/testimonial-collection-sms.md`. Pulls past-client list from GHL, sends one of three SMS variants via Twilio, logs to Google Sheet, routes inbound responses to a triage queue.

**Runs from:** local Claude Code (with Composio MCP authorized).
**Risk level:** ⚠️ **HIGH.** TCPA / CTIA / A2P 10DLC apply to every SMS sent. One careless mass-send can trigger four-figure-per-message TCPA penalties. **Read the pre-flight gates before doing anything else.**

---

## Goal

Replace the manual SMS cadence (open Twilio dashboard, copy-paste templates, message-by-message send) with a single Claude-orchestrated job that does it in compliance with TCPA / CTIA, with a human approval gate before the batch goes out.

---

## Required Composio integrations

1. **GoHighLevel (GHL)** — read past-client list and tags
2. **Twilio** — send SMS, manage A2P 10DLC, handle STOP / HELP
3. **Google Sheets** — log sends and inbound responses
4. **Slack** (optional) — alert when inbound responses arrive for triage

---

## Pre-flight gates

**HARD NO-GO conditions — if any of these is unchecked, do not run this workflow even in dry-run mode:**

- [ ] **Twilio A2P 10DLC campaign registered AND approved.** This is the 1-4 week wait you started during Week 1 of the LO motion. Without it, US carriers heavily filter or outright reject your messages and Twilio can suspend the account.
- [ ] **Twilio Brand registered.** Required for A2P 10DLC.
- [ ] **Sample messages submitted to Twilio campaign approved.** Specifically: avoid the literal phrase "credit repair" in registered samples — Twilio's SHAFT scrubbing flags it. Use "credit-readiness" or "financial education" framing in registration. Production messages can still mention credit work; the registration is what the carrier reviews.
- [ ] **TCPA consent file pulled and verified.** For each past client, you have on record: (a) the phone number, (b) prior express consent to receive marketing/informational text from Clean Path, (c) date and channel of consent. Without this, do not text — it's a TCPA violation regardless of the content.
- [ ] **GHL tag schema confirmed.** You have a tag like `graduated` or `program_complete` that identifies past clients. The workflow filters on this tag.
- [ ] **STOP / HELP keyword handling configured in Twilio.** Twilio handles these natively but verify before sending. Honor STOP immediately, no exceptions.
- [ ] **No-recontact list maintained.** Anyone who replied STOP to any prior Clean Path message is excluded.
- [ ] **Time-of-day window enforced.** TCPA requires 8am-9pm in the recipient's local time. The workflow MUST respect this.
- [ ] **Daily send cap configured.** Maximum 50 sends per day to avoid carrier filtering and respect CTIA capacity guidelines.
- [ ] **Spanish-language handling.** Clients tagged with Spanish preference get Spanish variants of the SMS templates (see Section below).
- [ ] **Substantiation reminder.** This workflow does not collect testimonial CONTENT — it just asks for it. Make sure your inbound triage knows to apply the "what NOT to ask" rules from `testimonial-collection-sms.md` Section 4 when responding to inbound testimonials.

If any of the above is unchecked: stop here, fix the gap, then return.

---

## Workflow logic

```
Daily 9am (after TCPA quiet hours end nationally):

  1. Composio: pull GHL contacts with tag "graduated" or "program_complete"
     filtered by:
       - has phone number with country_code US/CA
       - has TCPA consent timestamp within last 24 months
       - has not been contacted in last 60 days
       - is not on the no-recontact list (STOP'd previously)
  2. For each candidate (cap at 50 per day):
       - Pick SMS variant (A/B/C) based on tag or rotation
       - If client preferred-language tag is "es", use Spanish variant
       - Personalize with first_name
       - Convert phone number to E.164 format
  3. Compose batch preview: list of (name, phone, variant, language)
     post to Slack as a single approval message with "Send Batch" button
  4. ON HUMAN APPROVAL ONLY:
       - For each candidate:
           a. Verify recipient timezone, calculate local-time send window
              (8am-9pm in their timezone)
           b. If outside window, queue for next day's window
           c. If in window, Composio: send via Twilio with the registered
              campaign / brand
           d. Log to Google Sheet (Clean Path > Past-Client SMS Log) with
              client_id, phone (last-4 only), variant, language, sent_at
  5. Inbound response handler (always-on):
       - Twilio webhook → Composio receives inbound message
       - If "STOP" / "UNSUBSCRIBE" / equivalent: add to no-recontact list,
         log to sheet, send confirmation. NO further messages, EVER.
       - If "HELP" / "INFO": auto-reply Twilio's standard help message
       - Otherwise: post inbound to Slack #testimonial-triage channel for
         manual response. Do NOT auto-reply.
```

---

## SMS variants — EXACT text to send

These match `docs/launch/testimonial-collection-sms.md` Section 2. **Do not modify without re-submitting samples to Twilio for A2P 10DLC compliance.**

### English variants

**Variant A — warm:**
```
Hey [First Name] — Alex from Clean Path. Hope life's been good since we wrapped up. Quick favor: would you share a 30-sec testimonial about your experience? Just what the process felt like. Even a Google review would help: https://g.page/r/CYp-SDplr2wMEBM/review Reply STOP to opt out.
```

**Variant B — multi-option:**
```
Hey [First Name], Alex here from Clean Path. Collecting client experience stories for the new website. Three ways: 1) reply to this text, 2) 60-sec voice memo back, 3) Google review: https://g.page/r/CYp-SDplr2wMEBM/review No pressure. Reply STOP to opt out.
```

**Variant C — direct:**
```
[First Name], Alex from Clean Path. Building the new website — two asks, optional: 1) Google review (60 sec): https://g.page/r/CYp-SDplr2wMEBM/review 2) 1-2 sentences I can quote (first name + city only). Means a lot. Reply STOP to opt out.
```

### Spanish variants

**Variante A — cálida:**
```
Qué tal [Primer Nombre] — Alex de Clean Path. Espero todo bien desde que terminamos. Un favor: ¿me compartes 30 seg sobre tu experiencia? Solo cómo se sintió el proceso. O una reseña en Google: https://g.page/r/CYp-SDplr2wMEBM/review Responde STOP para no recibir más.
```

**Variante B — multi-opción:**
```
Hola [Primer Nombre], Alex de Clean Path. Recopilando historias de clientes para la web. Tres formas: 1) responde a este texto, 2) audio de 60 seg, 3) reseña Google: https://g.page/r/CYp-SDplr2wMEBM/review Sin compromiso. Responde STOP para no recibir más.
```

**Variante C — directa:**
```
[Primer Nombre], Alex de Clean Path. Construyendo la web nueva — dos peticiones opcionales: 1) Reseña en Google (60 seg): https://g.page/r/CYp-SDplr2wMEBM/review 2) 1-2 oraciones para citar (primer nombre + ciudad). Significa mucho. STOP para no recibir más.
```

**SMS rules:**
- Each variant ends with `Reply STOP to opt out` (English) or `Responde STOP para no recibir más` (Spanish) — CTIA opt-out requirement
- Each variant is under 160 GSM characters where possible (avoids multi-segment billing). Variants A and B are slightly over; that's acceptable but watch the count if you edit.
- Don't shorten the GMB URL via bit.ly — carrier filtering treats shortened links as spam-adjacent. The `g.page` domain is Google-owned and trusted.

---

## Implementation prompt for local Claude Code

```
Set up a Composio workflow named "past-client-sms-automation" per the
spec in docs/runbooks/composio-past-client-sms-automation.md.

Before touching anything, confirm out loud that all 11 pre-flight gates
are satisfied. If any are unchecked, stop and tell me which ones —
DO NOT proceed.

Workflow (when gates pass):
  1. Daily 9am, pull GHL past-client list with tag "graduated" or
     "program_complete" filtered by phone present, TCPA consent within
     24 months, not contacted in last 60 days, not on no-recontact list.
     Cap at 50 candidates per day.
  2. For each, pick SMS variant (A/B/C rotation or tag-based) and
     language (English/Spanish based on preferred-language tag).
  3. Post a batch preview to Slack #ops-approvals with the candidate
     list (last-4 phone digits only, never full numbers in Slack) and
     a "Send Batch" button.
  4. ON APPROVAL: send via Twilio respecting recipient-timezone
     8am-9pm send window. Queue out-of-window for next day.
  5. Log every send to Google Sheet (Clean Path > Past-Client SMS Log).
  6. Inbound handler:
     - STOP/UNSUBSCRIBE: add to no-recontact list, log, confirm,
       NEVER text again
     - HELP: Twilio default reply
     - Other: post to Slack #testimonial-triage for manual response

Use the EXACT SMS text in the runbook — do not edit, those texts
match what was registered with Twilio for A2P 10DLC compliance.

Start in DRY_RUN mode. Show me the first batch preview — 50 names,
phone last-4, variant, language — before any send.
```

---

## Monitoring

After the first production batch:

- Reply rate (target: 20-30%)
- STOP rate (concerning if > 3%; investigate sample frame for consent issues)
- Google review rate (target: 10-15% of sent)
- Site testimonial rate (target: 5-10% of sent, with explicit consent to publish)
- Twilio campaign delivery rate (target: > 95% delivered; lower indicates carrier filtering)
- Inbound triage time (target: replies within 4 hours during business hours)

Log these as a metrics tab in the same Google Sheet.

---

## Failure modes

| Failure | What you'll see | What to do |
| ------- | --------------- | ---------- |
| Twilio rejects A2P 10DLC | "30007: Carrier violation" errors | Check campaign approval status. Contact Twilio support if stuck. **Stop sending until resolved.** |
| Spike in STOP replies | More than 3% STOP rate | Investigate — likely a consent-frame issue (you texted people who didn't actually consent). Stop the workflow until consent file is re-verified. |
| Carrier filtering | Delivery rate < 90% | Check for spam-trigger words ("credit" filtering can be aggressive). Adjust language. NOT "credit repair" or "clean credit" verbatim. |
| Recipient timezone unknown | Default to Central Time (US Texas operation) | Acceptable fallback but log it. |
| GHL tag schema changed | Workflow returns 0 candidates | Re-verify the tag exists; update the workflow filter. |
| Twilio account suspended | All sends fail | Read suspension reason. Most common: brand or campaign de-registration. Resolve before sending. |
