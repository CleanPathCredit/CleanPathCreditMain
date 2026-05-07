-- =============================================================================
-- Migration 015 — data retention policy
--
-- Per Clean Path Credit's privacy policy + GLBA Safeguards Rule + Texas
-- BCC §1306.052 (records retention not longer than necessary), we don't
-- keep PII forever after a client finishes service. This migration adds
-- two timestamps on profiles that drive a nightly purge cron:
--
--   data_retention_until    — when the cron should purge this profile's
--                             sensitive PII (SSN secret, document files,
--                             credit reports). Default: 2 years after the
--                             client moves to status='complete'. Admin can
--                             override via UI.
--                             NULL means "indefinite" — used for active
--                             clients and admin accounts.
--
--   data_retention_purged_at — set by the cron when the purge runs so we
--                              can prove the wipe happened. Profile row
--                              itself is not deleted (keeps audit trail
--                              + Stripe customer linkage); only the
--                              sensitive bits are nulled.
--
-- The profile row itself stays — basic identity (clerk_user_id, email,
-- plan history) is retained for accounting + chargeback investigation.
-- Sensitive material (SSN, uploaded docs, parsed credit data) is what
-- gets wiped.
-- =============================================================================

alter table public.profiles
  add column if not exists data_retention_until    timestamptz,
  add column if not exists data_retention_purged_at timestamptz;

-- Default: when status flips to 'complete', schedule a purge for 2 years
-- out unless the admin already set a date manually. 2 years is long enough
-- to support post-service questions and chargeback windows; short enough
-- that we're not warehousing SSNs of people who left service in 2022.
create or replace function public.set_data_retention_on_complete()
returns trigger language plpgsql as $$
begin
  if new.status = 'complete'
     and old.status is distinct from 'complete'
     and new.data_retention_until is null
     and new.data_retention_purged_at is null
  then
    new.data_retention_until := now() + interval '2 years';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_set_data_retention on public.profiles;
create trigger profiles_set_data_retention
  before update on public.profiles
  for each row execute function public.set_data_retention_on_complete();

-- Index the purge target so the cron's "what's due" lookup stays fast
-- as the profiles table grows. Only rows that haven't been purged yet
-- need scanning.
create index if not exists profiles_data_retention_due_idx
  on public.profiles (data_retention_until)
  where data_retention_until is not null
    and data_retention_purged_at is null;

-- ---------------------------------------------------------------------------
-- purge_profile_pii(profile_id)
--
-- SECURITY DEFINER helper called by /api/cron/data-retention-purge for one
-- profile at a time. Wraps the cross-schema work that the application
-- service-role key alone can't do cleanly:
--
--   1. Delete the SSN vault secret (vault.secrets is a privileged schema)
--   2. Null ssn_secret_id, flip ssn_uploaded to false
--   3. Delete credit_reports rows for the profile (cascades onto credit
--      report tables in migration 013)
--   4. Stamp data_retention_purged_at
--
-- The endpoint still handles Storage object deletion separately because
-- Storage objects live in a different system (Supabase Storage API, not
-- Postgres) and can't be removed from a SQL function.
--
-- Returns the array of documents.storage_path values that the endpoint
-- should pass to the Storage delete API. The documents rows themselves
-- ARE deleted here, since once the storage objects go the metadata is
-- meaningless.
-- ---------------------------------------------------------------------------
create or replace function public.purge_profile_pii(p_profile_id text)
returns table (storage_path text)
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_secret_id uuid;
begin
  -- 1. Capture and clear the vault secret
  select ssn_secret_id into v_secret_id
    from public.profiles
    where id = p_profile_id;

  if v_secret_id is not null then
    -- vault.secrets lives in a privileged schema; SECURITY DEFINER lets
    -- us delete it without granting the service role broad vault access.
    delete from vault.secrets where id = v_secret_id;
  end if;

  -- 2. Return the storage paths so the caller can purge Storage objects,
  -- then delete the document metadata rows.
  return query
    delete from public.documents
    where profile_id = p_profile_id
    returning documents.storage_path;

  -- 3. Drop credit-report data (raw + parsed).
  delete from public.credit_reports where profile_id = p_profile_id;

  -- 4. Clear PII flags and stamp the purge timestamp.
  update public.profiles
     set ssn_secret_id            = null,
         ssn_uploaded             = false,
         id_uploaded              = false,
         video_verified           = false,
         data_retention_purged_at = now()
   where id = p_profile_id;
end;
$$;

-- The application service role calls this RPC; no other roles need it.
revoke all on function public.purge_profile_pii(text) from public;
grant execute on function public.purge_profile_pii(text) to service_role;
