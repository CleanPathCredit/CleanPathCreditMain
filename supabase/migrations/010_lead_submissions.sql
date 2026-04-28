-- =============================================================================
-- Migration 005 — lead_submissions
--
-- Persists every quiz-funnel submission, regardless of whether the lead later
-- creates a Clerk account. Lets the admin dashboard see the full funnel
-- (not just registered clients) and surfaces the readiness score + quiz
-- answers next to each user for sales triage.
--
-- WRITES
--   Only via /api/lead using the Supabase service-role key, which bypasses
--   RLS by design. No end-user should ever INSERT into this table directly.
--
-- READS
--   Admin-only via public.is_admin() (added in migration 003). No client-
--   owned rows — leads belong to "the business," not a user.
--
-- JOIN STRATEGY
--   email is the only stable identifier between a pre-registration lead and
--   a registered profile (Clerk user_ids are created AFTER the quiz fires).
--   Case-insensitive index lets the admin UI quickly find the lead history
--   for a given registered client's email.
-- =============================================================================

begin;

create table if not exists public.lead_submissions (
  id                  uuid primary key default uuid_generate_v4(),
  -- Contact fields (mirror /api/lead's sanitized payload)
  email               text not null,
  full_name           text,
  phone               text,
  -- Quiz dimensions
  goal                text,                          -- home / car / business / clean
  obstacles           text[] not null default '{}',  -- stacked pain points from step 2
  credit_score_range  text,                          -- e.g. '550-619'
  income_range        text,
  ideal_score         text,
  timeline            text,                          -- 'asap' / '3-6-months' / '6-12-months'
  -- Derived scoring — frozen at submission time, so admin sees the same
  -- number the user saw on the results page even if the model changes later.
  readiness_score     integer
                        check (readiness_score is null
                               or (readiness_score between 0 and 100)),
  readiness_tier      text,                          -- 'strong' | 'promising' | 'priority' | 'urgent'
  recommended_offer   text,                          -- 'diy' | 'accelerated' | 'executive'
  -- Routing / audit
  source              text not null default 'quiz_funnel',
  ghl_contact_id      text,                          -- returned by GHL upsert API
  ghl_delivery        text,                          -- 'api' | 'webhook_fallback' | 'failed'
  consent             boolean not null default false,
  submitted_at        timestamptz not null default now(),
  created_at          timestamptz not null default now()
);

-- Case-insensitive email lookups for "what was this registered user's
-- quiz history?" joins.
create index if not exists lead_submissions_email_idx
  on public.lead_submissions (lower(email));

-- Newest-first listing (the admin's default view).
create index if not exists lead_submissions_created_idx
  on public.lead_submissions (created_at desc);

alter table public.lead_submissions enable row level security;

-- Admin-read only. Writes go through the service-role key (RLS bypass by
-- design) from the /api/lead serverless function.
drop policy if exists "lead_submissions: admin read" on public.lead_submissions;
create policy "lead_submissions: admin read"
  on public.lead_submissions for select
  using (public.is_admin());

commit;
