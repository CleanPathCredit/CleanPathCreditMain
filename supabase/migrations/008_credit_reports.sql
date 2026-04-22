-- =============================================================================
-- Migration 008 — credit_reports + credit_report_accounts
--
-- The client uploads a 3-bureau PDF (typically from SmartCredit's Smart 3B
-- view) and the server parses it with Claude vision. Two tables:
--
--   credit_reports          ← one row per uploaded report
--   credit_report_accounts  ← one row per account on that report
--
-- Owner reads their own rows; admins read everything. Writes come from the
-- parser endpoint using the service-role key (RLS bypassed by design).
-- No client-side INSERT policy — nothing good can come of letting clients
-- self-populate credit data.
--
-- SCHEMA DESIGN NOTES
--   - raw_extracted jsonb stores the full LLM output so we can re-normalize
--     later if the structured columns miss a field — avoids having to
--     re-parse + re-spend tokens when we extend the schema.
--   - score_model tracks WHICH score (VantageScore 3.0 vs FICO 8) since
--     SmartCredit serves VantageScore; future integrations may serve FICO
--     and sales needs to know which.
--   - dispute_eligible is set by the parser using FCRA-grounded heuristics
--     (inaccurate, outdated, unverifiable) and re-evaluated by the admin.
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- credit_reports
-- ---------------------------------------------------------------------------
create table if not exists public.credit_reports (
  id                    uuid primary key default uuid_generate_v4(),
  profile_id            text not null references public.profiles(id) on delete cascade,
  document_id           uuid references public.documents(id) on delete set null,

  -- Source + timing
  source                text not null default 'smartcredit',
  report_date           date,
  score_model           text,

  -- 3-bureau scores — nullable because not every source provides all three
  eq_score              integer check (eq_score is null or (eq_score between 300 and 850)),
  tu_score              integer check (tu_score is null or (tu_score between 300 and 850)),
  ex_score              integer check (ex_score is null or (ex_score between 300 and 850)),

  -- Aggregates — precomputed so the dashboard doesn't need to aggregate
  -- hundreds of account rows on every render
  total_accounts        integer,
  open_accounts         integer,
  closed_accounts       integer,
  negative_items_count  integer,
  total_utilization_pct numeric(5,2),
  inquiries_24mo        integer,

  -- Parse pipeline
  raw_extracted         jsonb,
  parse_status          text not null default 'pending'
                          check (parse_status in ('pending', 'processing', 'success', 'failed')),
  parse_error           text,
  parse_model           text,

  created_at            timestamptz not null default now(),
  processed_at          timestamptz
);

create index if not exists credit_reports_profile_idx on public.credit_reports(profile_id);
create index if not exists credit_reports_created_idx on public.credit_reports(created_at desc);

alter table public.credit_reports enable row level security;

drop policy if exists "credit_reports: owner or admin read" on public.credit_reports;
create policy "credit_reports: owner or admin read"
  on public.credit_reports for select
  using (profile_id = public.clerk_user_id() or public.is_admin());

-- No INSERT/UPDATE/DELETE policy — service-role bypasses RLS; anything
-- else is denied. Parser endpoint is the only writer.

-- ---------------------------------------------------------------------------
-- credit_report_accounts
-- Denormalized with profile_id so a single indexed query can fetch all of
-- a user's accounts without joining through credit_reports first.
-- ---------------------------------------------------------------------------
create table if not exists public.credit_report_accounts (
  id                    uuid primary key default uuid_generate_v4(),
  credit_report_id      uuid not null references public.credit_reports(id) on delete cascade,
  profile_id            text not null,

  creditor              text,
  account_number_last4  text,
  account_type          text,   -- 'revolving', 'installment', 'mortgage', 'auto', 'collection', 'student'
  bureau_reporting      text[] not null default '{}',  -- subset of {'eq','tu','ex'}

  status                text,   -- 'open', 'closed', 'paid', 'collection', 'charge-off', 'bankruptcy', 'derogatory'
  balance               numeric(12,2),
  credit_limit          numeric(12,2),
  high_balance          numeric(12,2),
  monthly_payment       numeric(12,2),

  date_opened           date,
  last_reported         date,
  payment_status        text,   -- 'current', '30', '60', '90', '120+', 'collection', etc.

  is_negative           boolean not null default false,
  dispute_eligible      boolean not null default false,
  dispute_reason        text,   -- 'inaccurate', 'outdated', 'unverifiable', 'paid', 'duplicate'

  raw                   jsonb,
  created_at            timestamptz not null default now()
);

create index if not exists credit_report_accounts_report_idx  on public.credit_report_accounts(credit_report_id);
create index if not exists credit_report_accounts_profile_idx on public.credit_report_accounts(profile_id);
create index if not exists credit_report_accounts_neg_idx
  on public.credit_report_accounts(profile_id)
  where is_negative = true;

alter table public.credit_report_accounts enable row level security;

drop policy if exists "credit_report_accounts: owner or admin read" on public.credit_report_accounts;
create policy "credit_report_accounts: owner or admin read"
  on public.credit_report_accounts for select
  using (profile_id = public.clerk_user_id() or public.is_admin());

commit;
