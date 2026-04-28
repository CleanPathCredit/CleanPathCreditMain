-- =============================================================================
-- Migration 007 — admin_notes on lead_submissions + profiles
--
-- A free-form text column for the sales team to jot context that doesn't
-- fit the structured fields: "left voicemail 4/22", "referred by XYZ",
-- "wants Executive but waiting on spouse", etc.
--
-- Writes go through /api/admin/lead/[id] and /api/admin/client/[id] PATCH
-- endpoints — which use the service-role key so RLS is bypassed. No RLS
-- changes needed.
--
-- Separate from the `notes` body already sent to GHL contacts on creation:
-- that's a one-shot record of the quiz answers at submission time, while
-- this column is living admin notes that grow over the lifetime of the
-- contact.
-- =============================================================================

begin;

alter table public.lead_submissions
  add column if not exists admin_notes text;

alter table public.profiles
  add column if not exists admin_notes text;

commit;
