# Substantiation working folder

This folder holds the per-client backing evidence for testimonials
displayed on cleanpathcredit.com. It is intentionally **not** committed
to git for any client whose docs contain unredacted PII.

## Folder layout

```
docs/substantiation/
├─ README.md                    ← this file
├─ _template_release.md         ← the release form clients sign
├─ <initials>/                  ← one folder per testifying client
│  ├─ 2025-MM-DD_release.pdf
│  ├─ 2025-MM-DD_before.pdf
│  ├─ 2025-MM-DD_after.pdf
│  └─ 2025-MM-DD_approval.pdf
└─ ...
```

Naming: `<initials>` matches the display attribution in `Proof.tsx`
(e.g. "Sarah M." → `SM/`). If two clients share initials, append a
disambiguator (`SM-2/`).

## What goes in each client folder

1. **Signed release form** — the document at `_template_release.md`,
   filled in, signed, and dated. PDF preferred.
2. **Before/after credit reports** — for any "items removed" / "score
   change" claim. PII redacted (SSN, full DOB, full account numbers
   masked to last 4).
3. **Approval / closing / refi documents** — for any approval or
   savings claim. PII redacted same as above.
4. **Channel-of-origin record** — a short note (.md or .txt) describing
   how the quote was collected: in-app survey response, email reply,
   transcript of recorded call (with consent), client-recorded video,
   etc. If from a recording, link to the source file (e.g. internal
   Drive path or a cold-storage S3 key) — not the file itself in this
   folder.

## What does NOT belong here

- Unredacted PII (full SSN, full DOB, full account numbers, full address)
- Photos of physical IDs
- Anything covered by the GLBA Safeguards Rule that we wouldn't want in
  a backup tape if this folder accidentally got committed

## Git policy

This folder is checked in for the README + template only. Per-client
subdirectories should be excluded via `.gitignore`. See the rule at the
repo root.
