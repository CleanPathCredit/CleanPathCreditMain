-- =============================================================================
-- signed_agreements — immutable record of client-signed service agreements
-- Signed on /agreement page after purchase, before account creation
-- =============================================================================

create table if not exists signed_agreements (
  id                  bigserial    primary key,
  email               text         not null,
  client_name         text         not null,
  plan                text         not null,
  stripe_session_id   text,
  agreement_version   text         not null,
  signature_storage_path text,
  pdf_storage_path    text,
  ip_address          text,
  user_agent          text,
  signed_at           timestamptz  not null default now()
);

-- RLS: only admins read, only service role writes
alter table signed_agreements enable row level security;

create policy "Admins can read signed agreements"
  on signed_agreements for select
  using (
    exists (
      select 1 from profiles
      where profiles.id = clerk_user_id()
        and profiles.role = 'admin'
    )
  );
