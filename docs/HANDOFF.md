# Handoff — current chat state

**Last updated:** 2026-04-28
**Maintained by:** rolling — overwritten each session, not appended.
**Companion doc:** `docs/SESSION_LOG.md` (historical record). Read both — they're for different purposes.

> If you (the assistant in a fresh session) have just been pointed here:
>
> 1. Read this whole file
> 2. Read `docs/SESSION_LOG.md` for the longer history
> 3. Run `gh pr list --state open` (or use the GitHub MCP) to confirm what's still open
> 4. Ask the user what they want to work on — don't assume

---

## Where things stand RIGHT NOW

### Open PRs in `cleanpathcredit/cleanpathcreditmain` (last verified: 2026-04-28)

| # | Branch | Theme | CI | Reviews |
|---|---|---|---|---|
| 11 | `claude/ghl-inbound-lead-sync-sePyK` | GHL inbound contact sync webhook | Vercel ✓, CodeQL pending | none |
| 12 | `claude/data-retention-and-resend-sePyK` | Data-retention purge cron + resend invitation flow | Vercel ✓, CodeQL pending | none |
| 13 | `claude/substantiation-file-sePyK` | Testimonial substantiation file + release template (docs only) | Vercel ✓, CodeQL pending | none |
| 14 | `claude/session-log-update-sePyK` | Session log + operator environment block + this handoff doc | Vercel ✓, CodeQL pending | none |

None merged yet. Standing instruction from user is "merge when green" — but the user has been doing tooling setup (Ghost, godmode), not actively babysitting these PRs.

**On a fresh session, first ask:** "Are PRs #11-#14 still open or have any merged? Any new review comments?" Don't assume.

### Active environment + tooling

- User is on Windows 10 / HP Pavilion m6-1035dx / `C:\Users\serra\` / PowerShell.
- **Claude Code runs in TWO places:**
  - **This session** — Anthropic cloud sandbox, Linux, working dir `/home/user/cleanpathcreditmain`
  - **User's local laptop** — Windows, has the Ghost MCP loaded
- These are different machines. Tools installed in one are NOT visible to the other. Don't try to `ghost mcp` from this session — won't work.
- User has installed **godmode** (multi-model: Codex / Gemini / DeepSeek). Useful for independent code review of PRs before merge. **Loaded in their LOCAL Claude Code only — NOT in this cloud session.** Confirmed via `ToolSearch` (no godmode/gemini/codex tools visible here). Don't try to invoke it from this session — recommend the user run godmode prompts in their local session and paste results back.
- User has a NotebookLM notebook called "Clean Path Credit". They upload `docs/SESSION_LOG.md` to it as a source. Don't pretend to "save to NotebookLM" — there's no API.

### Highest-value godmode prompts to run in local session

**Independent PR review (especially PR #12 — security-relevant):**

> Use godmode (Gemini and Codex independently — don't show them each other's responses). Pull the diff for cleanpathcredit/cleanpathcreditmain PR #12. Critique it as a senior engineer reviewing a security-relevant change. Concerns to address per model:
> 1. Auth model on `/api/cron/data-retention-purge` — is the timing-safe Bearer compare correct?
> 2. The SECURITY DEFINER RPC `purge_profile_pii` — any privilege-escalation or search_path issues?
> 3. The order of operations in `purge_profile_pii` (return query before subsequent statements) — does plpgsql actually run the post-RETURN-QUERY statements, or is this a bug?
> 4. Storage delete error handling — can it leave orphans we'd never find?

**Compliance copy tiebreaker:**

> Use godmode to ask Gemini whether \[specific line\] is sufficient as an FTC outcome-disclaimer. Counter-argue, don't validate.

**Bulk arbitrage:**

> Use godmode to route this task to Gemini Flash: \[task\]. Don't use Opus.

### Ghost (project tracker DB) — work delegated to local session

- DB created: `cpc-tracker` (Timescale Cloud Postgres, `tsdb` database, host `yxfdzka03r.ocsmr2h9ze.tsdb.cloud.timescale.com`).
- Connection string was pasted in chat once — credentials should be rotated post-session via `ghost password cpc-tracker`.
- Schema bootstrap was delegated to the user's **local** Claude Code session (which has Ghost MCP loaded). Tables planned: `prs`, `decisions`, `backlog`, `compliance`, `testimonials`, `env_vars`. Hypertables (TimescaleDB) on time-series rows.
- This session does NOT drive Ghost. If user asks for Ghost work here, recommend they do it in their local session, OR offer to drive via `psql` over Bash if they paste the connection string.

---

## Pending / in-flight items NOT yet committed or merged

| Item | State | Where |
|---|---|---|
| **VSL script v2** for dashboard onboarding video | Drafted in chat, NOT saved to a file. User went through ChatGPT review + I produced v2. Awaiting user "save it" before committing | (chat history only) |
| **Dashboard FAQ** for round-by-round timing details | Offered, not started. Was going to be a destination for the detail cut from VSL v2 | (not started) |
| **Substantiation file** | Shipped in PR #13 but all 6 testimonials still flagged `verified=NO`. User hasn't decided: (a) collect evidence for ≥1, (b) soften copy, (c) pull section. **Blocker for paid traffic >$500/month** | `docs/SUBSTANTIATION.md` |
| **623 letter template** | Pending screenshot from user — was deferred from session 1 | (waiting) |
| **Migration 015 deployment** to staging Supabase | Code shipped in PR #12, deploy step pending. Local Ghost DB sandbox is the recommended dry-run venue | (deploy step) |
| **New env vars to set in Vercel before merging #11/#12** | `GHL_WEBHOOK_SECRET`, `CRON_SECRET`. Generate with `openssl rand -hex 32` | (deploy step) |
| **GHL Workflow → Webhook setup** in GoHighLevel admin | Step-by-step in `.env.example` and SESSION_LOG. User does this manually in GHL | (deploy step) |
| **Resend domain verification** | Still pending from session 1 | (waiting) |

---

## Compliance posture (don't regress this in a new session)

The following are LOAD-BEARING. If a new session is asked to write copy or code that conflicts with these, push back hard:

1. **No outcome guarantees.** Never write "will remove," "guaranteed," "X points in N days," approval-rate stats. Use "challenge inaccurate or unverifiable items."
2. **Per-round-after-completion billing.** Not upfront. This is the structural TSR §310.4(a)(2) fix. Don't suggest "charge upfront because you're software" — that's a CROA enforcement trigger.
3. **3-business-day CROA cancellation right** is stated verbatim in `Terms.tsx` §18 and on the dashboard VSL.
4. **Money-back guarantee language was removed.** Don't reintroduce.
5. **Texas CSO registration:** deferred decision, trigger ~$25K-50K total revenue.
6. **Attorney review of ToS:** deferred, trigger first $10K month or first 25 paying clients.
7. **All AI calls touching PII go through direct Anthropic SDK,** never OpenRouter.
8. **Testimonial outcome claims:** see `docs/SUBSTANTIATION.md` — don't add new numeric outcome claims to copy unless backed by a verified row.

---

## How the user works (operating preferences)

- **Concise > verbose.** They want answers, not essays. Two paragraphs beats six.
- **Push back when wrong.** They've explicitly tested whether you'll cave to incorrect ChatGPT advice. Don't cave. Cite the specific regulation when you disagree.
- **They ask for "feedback and suggestions" often.** Give honest assessment, not validation. Say what you'd do differently and why.
- **They run drafts past ChatGPT Plus** for second opinions. Don't be defensive when they bring back a critique — engage with it.
- **Merge approval is verbal.** "Merge when green," "yes," "go ahead" are all valid. They expect you to act on it.
- **Commits land unsigned.** The local SSH signing service has been 400-ing throughout. User has authorized `-c commit.gpgsign=false` for this project. Don't ask each time.

---

## Standing instructions for this session

1. **PR webhook subscriptions are active for #11, #12, #13, #14.** When CI events or review comments come in, investigate; fix if confident, ask if ambiguous, skip if no action needed.
2. **Don't push to other branches** without permission. Designated branches are listed in the system prompt.
3. **Don't create PRs unprompted.** User asks for PRs explicitly.
4. **Use TodoWrite for multi-step tasks.** It's how the user sees progress.
5. **The 623 letter template is the next major code milestone** when the user provides the screenshot.

---

## Quick paste for a fresh chat

If a new chat session is starting cold and you want to bootstrap fast, paste this:

> I'm working on `cleanpathcredit/cleanpathcreditmain`. Read `docs/HANDOFF.md` and `docs/SESSION_LOG.md` for current state. Then run `gh pr list --state open` (or GitHub MCP equivalent) to confirm which PRs are still open before doing anything else. Then ask me what I want to work on.
