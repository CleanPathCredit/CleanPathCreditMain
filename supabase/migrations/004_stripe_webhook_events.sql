-- =============================================================================
-- Migration 004 — Stripe webhook idempotency store (audit finding C-3)
--
-- PURPOSE
-- The /api/webhooks/stripe handler inserts `event.id` as the primary key at
-- the start of processing. Stripe's automatic retries will hit a
-- unique_violation on the second delivery and short-circuit with HTTP 200,
-- preventing double-application of:
--   - Clerk user metadata updates
--   - profile upserts
--   - sign-in tokens
--   - owner notifications to GoHighLevel
--
-- ACCESS MODEL
-- - Writes only from the webhook handler via the service-role key (bypasses
--   RLS). No RLS policies are defined — the table is intentionally
--   inaccessible from authenticated/anon contexts.
-- - Admins can query via service-role from Supabase SQL Editor.
--
-- RETENTION
-- No automatic cleanup. If volume becomes a concern, add a retention cron
-- (delete where received_at < now() - interval '90 days') in a follow-up.
-- =============================================================================

create table public.stripe_webhook_events (
  id          text primary key,            -- Stripe event.id (evt_*)
  event_type  text not null,
  received_at timestamptz not null default now()
);

create index stripe_webhook_events_received_idx
  on public.stripe_webhook_events (received_at desc);

alter table public.stripe_webhook_events enable row level security;
-- No policies intentionally — service-role writes only.
