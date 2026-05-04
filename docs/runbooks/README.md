# Composio Workflow Runbooks

This directory contains operational runbooks for automations that run via Composio MCP from your **local** Claude Code (not from cloud sessions). Each runbook is self-contained: required integrations, auth steps, workflow logic, compliance gates, and a copy-paste prompt template you give to local Claude Code to execute.

## How to use a runbook

1. **Read the full runbook.** Each one has a "Pre-flight gates" section listing hard NO-GO conditions. Don't skip these — the legal exposure is real and concentrated on the SMS / external-action runbooks.
2. **Authorize the listed Composio integrations.** First time you call any Composio tool, you'll get an OAuth handshake. Each integration is auth'd separately.
3. **From your local Claude Code, run the implementation prompt.** Each runbook ends with a copy-paste prompt template that walks Claude through the wiring step-by-step.
4. **Test the workflow in dry-run mode first.** Every runbook has a `DRY_RUN=true` toggle that logs what would happen without taking external actions.
5. **Move to production only after the dry-run output looks correct AND all pre-flight gates are satisfied.**

## Runbooks in this directory

| File | Purpose | Risk level | Pre-flight gates |
| ---- | ------- | ---------- | ---------------- |
| `composio-gmb-review-monitor.md` | Pull new GMB reviews, draft CROA-safe replies, Slack notification for human approval | Low (no external action without approval) | GMB + Slack auth |
| `composio-past-client-sms-automation.md` | Pull past-client list from GHL, send testimonial-collection SMS via Twilio, log to Google Sheet | **HIGH** (TCPA / CTIA / A2P 10DLC) | A2P 10DLC approved, TCPA consent file, GHL + Twilio auth |
| `composio-fi-tracking-sync.md` | Daily sync GHL pipeline "F&I-referral" entries to tracking spreadsheet, Slack digest of stale files | Low (internal-only, no external messaging) | GHL + Google Sheets + Slack auth |

## General compliance posture

All Composio runbooks for Clean Path Credit operate under the same compliance discipline as the rest of the codebase:

- **CROA §404(a)(3):** no outcome guarantees in any drafted response, ever
- **TCPA / CTIA:** no SMS to anyone without prior express consent on file
- **A2P 10DLC:** Twilio campaign must be registered + approved before sending
- **CFPB UDAAP:** if marketing in Spanish, all consumer disclosures available in Spanish
- **CROA §404(b):** no advance fees referenced in any automated message
- **FCRA §616:** never share specific credit-file details in Slack / email / sheets where unauthorized parties could see them
- **Spirit of "don't auto-take external actions":** every runbook routes through human approval before publishing externally. No auto-replies on GMB, no auto-sends on Twilio without batch-confirm, no auto-posts anywhere.

If you ever extend a runbook to remove the human-approval gate, run that change past your attorney first.

## Maintenance

- When a new Composio integration is added (e.g., Calendly, Resend), and an automation makes sense for it, write a new runbook here following the same pattern.
- When a runbook's compliance posture changes (e.g., A2P 10DLC gets approved, attorney clears a comp structure), update the "Pre-flight gates" section in the affected runbook AND the corresponding row in this index.
- After 30 days of running a workflow in production, audit the metrics in the runbook's "Monitoring" section and adjust thresholds as needed.
