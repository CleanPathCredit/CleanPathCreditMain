-- 015_security_advisor_fixes.sql
--
-- Resolves the 8 warnings in Supabase Security Advisor (project
-- xmegpgdbehlcnxfgowur, 2026-06-10):
--   • 6× "Function Search Path Mutable" (lint 0011) → FIXED by Part 1
--   • 2× "SECURITY DEFINER executable" on public.is_admin() (lints 0028/0029)
--     → ACCEPTED as intentional, see Part 2 (revoking breaks RLS for anon —
--       proven by live test)
--
-- STATUS: Part 1 was applied to production on 2026-06-10 via the Supabase MCP
-- (migration `security_advisor_search_path_pins`); advisor re-run confirmed
-- all 6 search_path warnings cleared. This file is the canonical record —
-- re-running it is harmless (the DO block is idempotent).
--
-- ─────────────────────────────────────────────────────────────────────────────
-- PART 1 — Pin search_path on the 6 flagged functions (lint 0011).
--
-- WHY: a function without a pinned search_path resolves table/function names
-- using the CALLER's search_path — a caller who can create objects in an
-- earlier schema could shadow a table the function references and hijack what
-- it reads/writes (worst for SECURITY DEFINER trigger/util functions).
--
-- The DO block discovers each function's exact signature from pg_proc, so it
-- works regardless of argument lists and skips anything already dropped.
-- Pins preserve current behavior: public fns resolve public + extensions
-- (Supabase installs pgcrypto etc. into `extensions`); stripe fns also see
-- their own schema first.
do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as sig, n.nspname as schema_name
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where (n.nspname, p.proname) in (
      ('public', 'generate_referral_code'),
      ('public', 'set_referral_code_on_insert'),
      ('public', 'clerk_user_id'),
      ('stripe', 'set_updated_at'),
      ('stripe', 'set_updated_at_metadata'),
      ('stripe', 'check_rate_limit'))
  loop
    if f.schema_name = 'public' then
      execute format('alter function %s set search_path = public, extensions', f.sig);
    else
      execute format('alter function %s set search_path = stripe, public, extensions', f.sig);
    end if;
    raise notice 'pinned search_path on %', f.sig;
  end loop;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- PART 2 — public.is_admin() EXECUTE (lints 0028/0029): ACCEPTED, NOT REVOKED.
--
-- The advisor suggests revoking EXECUTE from anon/authenticated. DO NOT.
-- This was tested live on 2026-06-10 inside a rolled-back transaction:
--
--     begin;
--     revoke execute on function public.is_admin() from public, anon;
--     set local role anon;
--     select count(*) from public.profiles;
--     rollback;
--     -- → ERROR 42501: permission denied for function is_admin
--
-- WHY IT BREAKS: 23 RLS policies (audit_log, profiles, documents, messages,
-- letter_rounds/packets, credit_reports, referrals, storage.objects, …) call
-- is_admin() and apply to role {public} — i.e. every role including anon.
-- RLS policy expressions execute with the QUERYING role's privileges, and
-- src/lib/supabase.ts intentionally hands out an anon-role client pre-auth
-- ("RLS will block all writes" — reads silently return empty). Revoking
-- anon's EXECUTE turns those silent-empty reads into hard 42501 errors.
--
-- RISK ASSESSMENT of leaving EXECUTE in place: is_admin() is a STABLE
-- boolean predicate about the caller (anon → always false). Calling it via
-- /rest/v1/rpc/is_admin discloses nothing. Mark both advisor warnings as
-- "accepted" in the dashboard UI.
--
-- FUTURE HARDENING (optional, larger change): split each policy into a
-- client-facing policy (TO authenticated, owner check only) and an admin
-- policy (TO authenticated ... using is_admin()), then revoke anon. Touches
-- all 23 policies — do it deliberately, with the transactional test above as
-- the acceptance gate.

-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFY (optional) — run after applying; both should return the pinned paths
-- and the trimmed ACL:
--
--   select p.oid::regprocedure as fn, p.proconfig
--   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--   where (n.nspname, p.proname) in (('public','generate_referral_code'),
--     ('public','set_referral_code_on_insert'), ('public','clerk_user_id'),
--     ('stripe','set_updated_at'), ('stripe','set_updated_at_metadata'),
--     ('stripe','check_rate_limit'), ('public','is_admin'));
--
--   select proacl from pg_proc where proname = 'is_admin';
--
-- SAFETY CHECK (run BEFORE applying if unsure) — lists every RLS policy that
-- references is_admin and which roles it applies to; confirm none applies to
-- `anon`:
--
--   select schemaname, tablename, policyname, roles
--   from pg_policies
--   where qual ilike '%is_admin%' or with_check ilike '%is_admin%';
