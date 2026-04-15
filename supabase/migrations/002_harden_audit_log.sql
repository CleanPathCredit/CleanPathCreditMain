-- =============================================================================
-- Harden audit logging
--
-- The initial schema exposed public.log_audit_event() as SECURITY DEFINER
-- callable by any authenticated client. Because it writes actor_id from the
-- JWT, clients couldn't frame another user — but they COULD fabricate
-- arbitrary action strings and metadata for themselves, poisoning the audit
-- trail and muddling incident response.
--
-- This migration:
--   1. Revokes EXECUTE on log_audit_event from `anon` and `authenticated`.
--   2. Grants EXECUTE only to `service_role` (server-side API endpoints using
--      SUPABASE_SERVICE_ROLE_KEY).
--   3. Pins the function's search_path so it can't be shadowed by a hostile
--      schema in an extension install path.
--
-- After this migration, any client code calling
--   supabase.rpc("log_audit_event", {...})
-- from the browser will fail with a permission error. All audit-worthy
-- actions must be logged from a server-side endpoint.
-- =============================================================================

-- Re-declare the function with an explicit search_path for hygiene.
create or replace function public.log_audit_event(
  p_action   text,
  p_target   text default null,
  p_metadata jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_log(actor_id, action, target_id, metadata)
  values (clerk_user_id(), p_action, p_target, p_metadata);
end;
$$;

-- Lock down execution. Supabase grants EXECUTE on functions to `public` by
-- default, so we have to revoke from both `public` and the two authenticated
-- roles explicitly.
revoke execute on function public.log_audit_event(text, text, jsonb) from public;
revoke execute on function public.log_audit_event(text, text, jsonb) from anon;
revoke execute on function public.log_audit_event(text, text, jsonb) from authenticated;

-- Only server-side code (service-role key) may log audit events.
grant execute on function public.log_audit_event(text, text, jsonb) to service_role;

-- Pin search_path on the updated_at trigger too (hygiene, not security).
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
