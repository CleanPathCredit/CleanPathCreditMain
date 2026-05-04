# Runbook — F&I Tracking Sheet Sync

Automate the daily sync of GHL pipeline entries tagged `F&I-referral` to the F&I Tracking spreadsheet templated in `docs/launch/fi-dealership-walk-in-scripts.md` Section 8. Daily Slack digest of new pre-screens, active engagements, re-quoted closures, and stale files.

**Runs from:** local Claude Code (with Composio MCP authorized).
**Risk level:** Low. Internal-only — no external messaging or borrower communication. Same posture should apply to a parallel LO tracking sync down the road.

---

## Goal

Replace the manual end-of-day spreadsheet update with a daily 7am Composio job that pulls fresh GHL data, updates the tracking sheet, and posts a digest to Slack so you start each day knowing exactly which dealerships need a follow-up call and which files need to be expedited.

---

## Required Composio integrations

1. **GoHighLevel (GHL)** — read pipeline entries tagged `F&I-referral`
2. **Google Sheets** — update F&I Tracking sheet
3. **Slack** — daily digest channel (e.g., `#fi-pipeline`)

---

## Pre-flight gates

- [ ] GHL pipeline contains a tag like `F&I-referral` or `F&I-recovery` (use whichever matches your existing tag schema)
- [ ] Google Sheet "Clean Path > F&I Tracking" exists with the columns from `docs/launch/fi-dealership-walk-in-scripts.md` Section 8
- [ ] Slack channel `#fi-pipeline` exists (or your equivalent)
- [ ] Composio's Google Sheets connector has write access to the sheet
- [ ] Borrower PII handling rule: no full names or full phone numbers in Slack messages — use file ID (GHL contact ID truncated) and last-4 phone digits only

FCRA §616 compliance: never expose specific credit-file details (scores, account numbers, balances) in any Slack channel where unauthorized parties could see them. Internal-only is no excuse — if a contractor leaves and still has Slack access, that's the breach.

---

## Spreadsheet columns (per the F&I walk-in scripts doc)

| Column | Notes |
| ------ | ----- |
| Date contacted | Date you first pitched the dealership |
| Dealership name | Display name only — not legal entity name |
| Archetype | Independent / Franchise / BHPH |
| F&I manager name | First name + last initial only |
| Channel | Cold call / Walk-in / Referral |
| Status | Contacted / Booked / Active partner / Dormant |
| Calendly booked? (Y/N) | Conversion math input |
| Files referred (count) | Active partner health |
| Files where Clean Path pre-screened (count) | Pre-screen funnel |
| Files where Clean Path engaged (count) | Real conversion |
| Files re-quoted at dealership (count) | The metric that matters — 90-day attribution window |
| Notes | Iteration signals |

---

## Workflow logic

```
Daily 7am Central:

  1. Composio: pull GHL pipeline entries tagged "F&I-referral" updated
     in the last 24 hours
  2. For each entry:
       - Look up the parent dealership (custom field on the GHL contact:
         "referring_dealership")
       - Find or create the corresponding row in the F&I Tracking sheet
       - Update fields: pre-screened count, engaged count, re-quoted count,
         notes (latest internal note from GHL)
  3. Compute daily metrics across the full sheet:
       - New pre-screens (last 24h)
       - Active engagements in-program (status: in-progress)
       - Re-quoted at dealership (last 7 days)
       - Stale files (no contact from F&I manager in 30+ days)
       - Dormant partner-dealerships (status: Active partner but 0 files
         referred in 60+ days)
  4. Post Slack digest to #fi-pipeline:
       - Header: "F&I Pipeline — [DATE]"
       - 4 metric lines (the four daily counts)
       - Stale files list (dealership name + days since contact)
       - Dormant partner alert (which Active partners haven't referred
         in 60+ days — these need a re-engagement call)
  5. If any of the daily metrics deviate from the 7-day average by
     more than 50%, append a callout in the Slack message (e.g.,
     "⚠ New pre-screens spiked 80% — check intake form for issues")
```

---

## Implementation prompt for local Claude Code

```
Set up a Composio workflow named "fi-tracking-sync" per the spec in
docs/runbooks/composio-fi-tracking-sync.md.

Before wiring, confirm:
  - GHL has the tag "F&I-referral" (or update the workflow to match
    the actual tag name)
  - Google Sheet "Clean Path > F&I Tracking" exists with the
    columns listed in the runbook
  - Slack channel #fi-pipeline exists

Workflow:
  1. Daily 7am Central, pull GHL contacts tagged "F&I-referral" updated
     in the last 24 hours
  2. For each, find or create row in the tracking sheet keyed on
     dealership name; update pre-screened / engaged / re-quoted counts
     and the notes column
  3. Compute the 5 metrics (new pre-screens, active engagements,
     re-quoted, stale files, dormant partners) across the full sheet
  4. Post a digest to Slack #fi-pipeline with the metrics, stale files
     list, and dormant-partner alerts
  5. Add a deviation callout if any metric is >50% off the 7-day average

PII rules:
  - Never include borrower full names or full phone numbers in Slack
  - Use file ID (GHL contact ID truncated) and last-4 phone only
  - Never include credit scores, balances, or account numbers anywhere
    (FCRA §616)

Start in DRY_RUN: show me the digest format using the current sheet
state before going live.
```

---

## Monitoring

After 30 days of running:

- Average daily pre-screens (baseline for benchmarking)
- Re-quote rate (closed deals / pre-screens) — the partnership ROI metric
- Time-from-bump-to-pre-screen (target: same-day)
- Time-from-pre-screen-to-engagement (target: under 48 hours)
- Stale-file rate (target: under 10% of active partners with stale files at any time)

Log these on a metrics tab in the F&I Tracking sheet.

---

## Failure modes

| Failure | What you'll see | What to do |
| ------- | --------------- | ---------- |
| GHL tag schema changed | Workflow returns 0 entries | Verify tag name; update filter |
| Sheet permission denied | "403 Forbidden" in logs | Re-share sheet with Composio's service account |
| Slack webhook expired | Digest doesn't post | Re-authorize Slack in Composio |
| Dealership name fuzzy match ("Alamo Auto" vs "Alamo City Auto") | Duplicate rows in sheet | Add a normalization step or maintain a mapping table; reconcile manually monthly |
| Stale-file count balloons | More dealerships ignoring follow-up than expected | Likely partner-program issue — review which archetypes are stalling |

---

## Extension — mirror this for the LO motion

Once this workflow is stable, copy it for the LO referral pipeline:

- Same structure
- Sheet: "Clean Path > LO Tracking"
- Tag: `LO-referral`
- Slack channel: `#lo-pipeline`
- Same PII rules

A single GHL pipeline can carry both A4 (LO) and A6 (F&I) referrals as long as the tag schema separates them. Two parallel runbooks, one shared sheet design, two Slack digests.
