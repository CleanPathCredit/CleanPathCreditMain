-- =============================================================================
-- consent_logs — immutable server-side record of user consent for Stripe defense
-- Logged when a paid user checks both consent boxes on /welcome
-- =============================================================================

create table if not exists consent_logs (
  id              bigserial    primary key,
  email           text         not null,
  plan            text         not null,
  stripe_session_id text,
  consent_terms   boolean      not null default false,
  consent_dispute boolean      not null default false,
  ip_address      text,
  user_agent      text,
  page_url        text,
  created_at      timestamptz  not null default now()
);

-- No RLS needed — this table is written only by the server (service role)
-- and never read by clients. Admins can query it in Supabase dashboard.
alter table consent_logs enable row level security;

-- Admin read-only policy (for dashboard queries)
create policy "Admins can read consent logs"
  on consent_logs for select
  using (
    exists (
      select 1 from profiles
      where profiles.id = clerk_user_id()
        and profiles.role = 'admin'
    )
  );

-- No insert/update/delete policies for clients — only service role can write
