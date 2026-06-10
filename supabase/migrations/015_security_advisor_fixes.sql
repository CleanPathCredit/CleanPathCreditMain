-- 015_security_advisor_fixes.sql
--
-- Fixes the 8 warnings in Supabase Security Advisor (project xmegpgdbehlcnxfgowur,
-- 2026-06-10 screenshot):
--   • 6× "Function Search Path Mutable" (lint 0011)
--   • 2× "SECURITY DEFINER executable by anon / signed-in" on public.is_admin()
--     (lints 0028 / 0029)
--
-- HOW TO APPLY: paste this whole file into the Supabase Dashboard → SQL Editor
-- → Run (or `supabase db push` if the CLI is linked). Then Security Advisor →
-- "Rerun linter" to confirm.
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
-- PART 2 — Lock down EXECUTE on public.is_admin() (lints 0028/0029).
--
-- CONTEXT (verified in the app repo before writing this):
--   • is_admin() is referenced by RLS policies (api/lead.ts: "Admin reads are
--     gated by is_admin() RLS"), and RLS policy expressions check EXECUTE
--     against the QUERYING role — so `authenticated` MUST keep EXECUTE or
--     every admin-gated query breaks for signed-in users (Clerk JWTs map app
--     users to the `authenticated` role via the Supabase JWT template).
--   • Anonymous visitors never query these tables from the browser (leads go
--     through server-side /api/lead with the service key), so `anon` does NOT
--     need it.
--
-- RESULT: the "Public Can Execute" (anon) warning is FIXED. The "Signed-In
-- Users Can Execute" warning will remain — intentionally. It is required for
-- RLS and is harmless: is_admin() only returns a boolean about the caller.
-- Mark it as "accepted" in the Advisor UI rather than revoking.
revoke execute on function public.is_admin() from public, anon;
grant  execute on function public.is_admin() to authenticated, service_role;

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
