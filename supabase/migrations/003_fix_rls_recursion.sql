-- =============================================================================
-- Migration 003 — Fix RLS infinite recursion on profiles/messages/documents/
-- audit_log/storage.
--
-- ROOT CAUSE
-- Several policies from migration 001 check admin status via an inline
--   EXISTS (SELECT 1 FROM public.profiles p
--           WHERE p.id = clerk_user_id() AND p.role = 'admin')
-- PostgreSQL detects the circular reference (policy on profiles whose USING
-- clause scans profiles) and aborts query planning with:
--   ERROR: 42P17: infinite recursion detected in policy for relation "profiles"
--
-- IMPACT
-- Any client-side query that does not short-circuit on `id = clerk_user_id()`
-- returns HTTP 500. Reproduced in prod on 2026-04-17 via a fresh signup:
--   GET /rest/v1/messages?profile_id=eq.<user>  ->  500
-- The dashboard's messaging and document-list panels are broken for every
-- authenticated user. Admin-side browser queries would also recurse.
--
-- FIX
-- Move the admin-status check into a SECURITY DEFINER helper function. Such a
-- function runs as its owner (postgres) with RLS bypassed, so the subquery no
-- longer re-enters the policy that called it. Rewrite every recursive policy
-- to call `public.is_admin()` in place of the inline EXISTS.
--
-- SEMANTICS PRESERVED EXACTLY
--   - An admin still has full access to profiles/messages/documents/audit_log
--     /storage.
--   - A client still reads only their own rows + files, and writes with the
--     existing per-column pins from migration 002 (unaffected here).
--
-- This migration is idempotent: re-running DROP POLICY IF EXISTS + CREATE
-- yields the same state.
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. is_admin() — SECURITY DEFINER breaks the recursion
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role from public.profiles where id = clerk_user_id()),
    'client'
  ) = 'admin';
$$;

-- Lock down execute; only roles that actually evaluate RLS need it.
-- service_role and postgres bypass RLS so they never invoke it from policies.
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated, anon;

-- ---------------------------------------------------------------------------
-- 2. profiles
-- ---------------------------------------------------------------------------
drop policy if exists "profiles: owner read" on public.profiles;
create policy "profiles: owner read"
  on public.profiles for select
  using (id = clerk_user_id() or public.is_admin());

drop policy if exists "profiles: admin full access" on public.profiles;
create policy "profiles: admin full access"
  on public.profiles for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 3. messages
-- ---------------------------------------------------------------------------
drop policy if exists "messages: client reads own thread" on public.messages;
create policy "messages: client reads own thread"
  on public.messages for select
  using (profile_id = clerk_user_id() or public.is_admin());

drop policy if exists "messages: admin full access" on public.messages;
create policy "messages: admin full access"
  on public.messages for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 4. documents
-- ---------------------------------------------------------------------------
drop policy if exists "documents: owner read" on public.documents;
create policy "documents: owner read"
  on public.documents for select
  using (profile_id = clerk_user_id() or public.is_admin());

drop policy if exists "documents: admin full access" on public.documents;
create policy "documents: admin full access"
  on public.documents for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 5. audit_log
-- ---------------------------------------------------------------------------
drop policy if exists "audit_log: admin read" on public.audit_log;
create policy "audit_log: admin read"
  on public.audit_log for select
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- 6. storage.objects — documents bucket
-- ---------------------------------------------------------------------------
drop policy if exists "storage: owner read" on storage.objects;
create policy "storage: owner read"
  on storage.objects for select
  using (
    bucket_id = 'documents'
    and (
      name like 'documents/' || public.clerk_user_id() || '/%'
      or public.is_admin()
    )
  );

drop policy if exists "storage: admin write" on storage.objects;
create policy "storage: admin write"
  on storage.objects for all
  using (
    bucket_id = 'documents'
    and public.is_admin()
  )
  with check (
    bucket_id = 'documents'
    and public.is_admin()
  );

commit;
