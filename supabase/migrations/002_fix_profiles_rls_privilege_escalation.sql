-- =============================================================================
-- 002_fix_profiles_rls_privilege_escalation.sql
--
-- Security fix (audit finding C-1): the original
--   "profiles: owner update non-role fields"
-- policy only constrained `role`. Every other privileged column
--   plan, status, progress, email, stripe_customer_id, stripe_session_id,
--   ssn_secret_id, negative_items, dispute_probability, video_verified
-- was client-writable. A signed-in user could run
--   supabase.from('profiles').update({ plan: 'premium', status: 'complete' })
-- from the browser to unlock paid features or mark themselves finished,
-- and there is no server-side guard because the client uses RLS directly.
--
-- This migration replaces the policy with a strict per-column guard that
-- pins every privileged column to its existing value using
--   `new_col IS NOT DISTINCT FROM (select existing_col from profiles ...)`.
-- `role` is also locked here for defense-in-depth, independent of any
-- Postgres WITH CHECK subquery-visibility nuance.
--
-- Admin writes continue through the unchanged
--   "profiles: admin full access"
-- policy. Server webhooks (Clerk, Stripe, /api/me) use the service-role
-- key which bypasses RLS entirely and are unaffected.
--
-- Columns a non-admin caller MAY still update on their own row:
--   full_name, phone, address, goal, challenge, quiz_data,
--   id_uploaded, ssn_uploaded
-- Columns a non-admin caller MAY NOT update (pinned):
--   id, email, role, plan, status, progress, stripe_customer_id,
--   stripe_session_id, ssn_secret_id, negative_items, dispute_probability,
--   video_verified, created_at, updated_at
-- =============================================================================

drop policy if exists "profiles: owner update non-role fields" on public.profiles;

create policy "profiles: owner update self"
  on public.profiles for update
  using (id = clerk_user_id())
  with check (
    id = clerk_user_id()
    and role                is not distinct from (select p.role                from public.profiles p where p.id = clerk_user_id())
    and plan                is not distinct from (select p.plan                from public.profiles p where p.id = clerk_user_id())
    and status              is not distinct from (select p.status              from public.profiles p where p.id = clerk_user_id())
    and progress            is not distinct from (select p.progress            from public.profiles p where p.id = clerk_user_id())
    and email               is not distinct from (select p.email               from public.profiles p where p.id = clerk_user_id())
    and stripe_customer_id  is not distinct from (select p.stripe_customer_id  from public.profiles p where p.id = clerk_user_id())
    and stripe_session_id   is not distinct from (select p.stripe_session_id   from public.profiles p where p.id = clerk_user_id())
    and ssn_secret_id       is not distinct from (select p.ssn_secret_id       from public.profiles p where p.id = clerk_user_id())
    and negative_items      is not distinct from (select p.negative_items      from public.profiles p where p.id = clerk_user_id())
    and dispute_probability is not distinct from (select p.dispute_probability from public.profiles p where p.id = clerk_user_id())
    and video_verified      is not distinct from (select p.video_verified      from public.profiles p where p.id = clerk_user_id())
  );
