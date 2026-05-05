# Runbook — GMB Review Monitor + Draft Replies

Automate the GMB review-response loop documented in `docs/launch/testimonial-collection-sms.md` Section 6. New reviews on the Clean Path Credit Google Business Profile listing get pulled, scored, drafted with a CROA-compliant reply, and surfaced in Slack for one-click human approval.

**Runs from:** local Claude Code (with Composio MCP authorized).
**Risk level:** Low. No external action is taken without explicit human approval.

---

## Goal

Close the 48-hour response SLA on every new GMB review without you manually checking the dashboard. Maintain CROA §404(a)(3) safety on every reply (no acknowledgment of specific score outcomes, no endorsement of outcome claims by the reviewer).

---

## Required Composio integrations

Authorize these connectors in your local Composio dashboard (or via first-tool-call OAuth handshake):

1. **Google Business Profile** — read reviews, post replies
2. **Slack** — send draft notification + approval channel
3. **Google Sheets** (optional but recommended) — log every reply for the substantiation file

If Slack isn't your preferred notification channel, swap in Gmail. The runbook works the same with either.

---

## Pre-flight gates

Do NOT enable this workflow until:

- [ ] Google Business Profile is verified for cleanpathcredit.com
- [ ] You're listed as a manager / owner of the GMB profile (Composio can only act on profiles you have permission for)
- [ ] A dedicated Slack channel exists (e.g., `#gmb-reviews`) where draft replies will land
- [ ] You've read and agreed to the CROA-compliant reply templates in this runbook — if you ever want to deviate from them, attorney sign-off first
- [ ] FTC §465.2 understanding: do not gate or filter reviews; do not offer compensation for reviews; do not edit a reviewer's words

---

## Workflow logic

```
Every 30 minutes:
  1. Composio: list GMB reviews for the Clean Path Credit profile
  2. Filter: reviews created in the last 24 hours that don't yet have a reply
  3. For each new review:
       a. Score by star rating (5 / 4 / 1-3 paths)
       b. Generate draft reply using the CROA-safe template for that score
       c. Detect any outcome-claim language in the review (e.g., "score went up
          50 points") and flag it — those reviews need extra care
       d. Post to Slack #gmb-reviews channel with: review excerpt, rating,
          reviewer first name, draft reply, and an "Approve & Reply" button
       e. Log to Google Sheet (Clean Path > GMB Reviews) with status="pending"
  4. When user clicks "Approve & Reply":
       a. Composio: post the approved reply to GMB
       b. Update sheet status="replied"
       c. Confirm in Slack thread
  5. If a review is older than 36 hours and still pending in the sheet,
     send a reminder ping to Slack (don't auto-reply — the human gate
     stays in place)
```

No auto-reply, ever. The gate is intentional.

---

## CROA-safe reply templates

### 5-star review

```
Thank you, [First Name]. We're glad the process worked for you. — Alex
```

**Why this template:** No acknowledgment of specific outcomes, no endorsement of any claim the reviewer made about score / approval / dollars. "The process worked" is generic enough to be CROA-safe regardless of what the reviewer said about results.

### 4-star review

```
Thank you, [First Name] — we appreciate the feedback. If anything fell
short, we'd love to hear specifics so we can keep improving. — Alex
```

### 1-3 star review

```
Thank you for the feedback, [First Name]. We'd like to understand what
fell short and make it right. Please reach me directly at
hello@cleanpathcredit.com or (346) 399-5606 so we can discuss. — Alex
```

**Why this template:** Don't argue in public. Don't acknowledge specific complaints in writing (FCRA §616 risk if it discloses anything about a real client file). Route to private channel where the conversation can be handled with the actual file in front of you.

### Reviews containing specific outcome claims (any star rating)

If the review says something like *"my score went up 80 points!"* or *"removed 5 collections in 30 days!"*:

Draft the appropriate-rating template above, but the Slack notification flags this with `⚠ OUTCOME CLAIM DETECTED — review carefully before approving`. The reviewer may have stated something Clean Path can't substantiate — a public reply that endorses or thanks them for that specific outcome amplifies the substantiation exposure.

**Decision rule for outcome-claim reviews:** use the standard star-rating template (which doesn't mention the outcome). Don't say "yes, we got you that lift!" Even if it's true.

### Spanish-language reviews

Mirror the same structure but in Spanish:

- 5-star: `Gracias, [Primer Nombre]. Nos alegra que el proceso te haya funcionado. — Alex`
- 4-star: `Gracias, [Primer Nombre] — valoramos tu feedback. Si algo se quedó corto, nos gustaría entender los detalles para seguir mejorando. — Alex`
- 1-3 star: `Gracias por el feedback, [Primer Nombre]. Nos gustaría entender qué se quedó corto. Contáctame directo a hello@cleanpathcredit.com o (346) 399-5606 para platicarlo. — Alex`

---

## Implementation prompt for local Claude Code

Copy this into your local Claude Code (with Composio MCP loaded):

```
Set up a recurring Composio workflow named "gmb-review-monitor" with the
following logic. Read docs/runbooks/composio-gmb-review-monitor.md for
the full spec.

Workflow:
  1. Every 30 minutes, list new GMB reviews on the Clean Path Credit
     listing (place ID from VITE_GMB_PLACE_ID env var, or hardcoded).
  2. For each review created in the last 24 hours without a reply:
     - Generate a draft reply using the templates in the runbook
       (5-star / 4-star / 1-3 star paths, with outcome-claim detection)
     - Post to Slack #gmb-reviews with: review excerpt, rating,
       reviewer first name, draft reply, and an "Approve & Reply" button
     - Log to Google Sheet ("Clean Path > GMB Reviews") with status=pending
  3. When user clicks "Approve & Reply" in Slack:
     - Use Composio's GMB tool to post the approved reply
     - Update the sheet row status to "replied"
     - Post a confirmation in the Slack thread
  4. If a review has been pending in the sheet for 36+ hours, send a
     reminder ping to Slack. Do NOT auto-reply.

Safety:
  - Never auto-reply without human approval
  - Detect outcome-claim language in reviews and flag with ⚠ in Slack
  - Don't include any specific credit-file details in the Slack message
  - Honor Spanish-language reviews with Spanish reply templates

Start in DRY_RUN mode — log what would happen but don't post replies
or send Slack messages. Show me the dry-run output before we go live.
```

---

## Monitoring

After 7 days of production:

- Median time-to-reply (target: under 12 hours, hard cap: 36 hours)
- % of replies you approved as-drafted vs. edited
- Any reviews that hit the 36-hour reminder ping (means you missed Slack pings — add an email backup)
- Any reviews where outcome-claim detection fired (use these to update the substantiation file)

Log these to the same Google Sheet as a separate metrics tab.

---

## Failure modes and how to handle them

| Failure | What you'll see | What to do |
| ------- | --------------- | ---------- |
| GMB API rate limit | "429 too many requests" in logs | Composio handles backoff. If persistent, increase polling interval to 60 min. |
| Composio Slack auth expired | Slack notification doesn't arrive | Re-authorize Slack in Composio dashboard. |
| Draft reply has wrong reviewer name | Manual flag in Slack | Approve with edited name; underlying name parser may need update. |
| Reviewer responds to your reply | Notification — secondary thread on the original review | Don't loop the auto-workflow on responses; handle manually. |
| 1-star review with libelous content | Manual flag | Reply with the standard 1-3 star template. Do NOT engage with specifics. Talk to attorney about Google review removal request only if it's clearly defamatory. |
