-- =============================================================================
-- CleanPathCredit — initial schema
-- Auth provider: Clerk  (user IDs are Clerk user_id strings, e.g. "user_2abc...")
-- All tables use TEXT primary keys that match Clerk's user_id format.
-- RLS is enabled on every table; policies use auth.jwt() ->> 'sub' to resolve
-- the Clerk user ID that was minted via the Supabase JWT template.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "uuid-ossp";
-- pgsodium / vault for SSN encryption is provisioned at the project level;
-- the application writes an encrypted blob — see supabase/vault_setup.sql

-- ---------------------------------------------------------------------------
-- Helper function: current Clerk user ID from JWT
-- ---------------------------------------------------------------------------
create or replace function clerk_user_id()
returns text
language sql stable
as $$
  select coalesce(
    auth.jwt() ->> 'sub',
    current_setting('app.user_id', true)
  );
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- One row per Clerk user, created by the Clerk webhook on user.created.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id              text primary key,          -- Clerk user_id
  email           text not null,
  full_name       text,
  phone           text,
  address         text,
  goal            text,
  challenge       text,
  role            text not null default 'client'
                    check (role in ('client', 'admin')),
  -- Subscription tier — controls dashboard feature access
  plan            text not null default 'free'
                    check (plan in ('free','diy','standard','premium')),
  -- Quiz answers stored for personalization
  quiz_data       jsonb,
  -- Stripe session/customer IDs for billing lookups
  stripe_customer_id  text,
  stripe_session_id   text,
  status          text not null default 'pending_connection'
                    check (status in (
                      'pending_connection','missing_id','ready_for_audit',
                      'audit_in_progress','audit_complete','disputes_drafted',
                      'disputes_sent','waiting_on_bureau','bureau_responded',
                      'results_received','complete'
                    )),
  progress        integer not null default 0 check (progress between 0 and 100),
  id_uploaded     boolean not null default false,
  ssn_uploaded    boolean not null default false,
  video_verified  boolean not null default false,
  -- Encrypted SSN — store the vault secret ID, not the plaintext value.
  -- Write via: select vault.create_secret('123-45-6789', 'ssn_<user_id>');
  ssn_secret_id   uuid,
  negative_items  integer,
  dispute_probability integer,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Clients read/update their own row; admins read/update all rows.
create policy "profiles: owner read"
  on public.profiles for select
  using (id = clerk_user_id() or exists (
    select 1 from public.profiles p
    where p.id = clerk_user_id() and p.role = 'admin'
  ));

create policy "profiles: owner insert"
  on public.profiles for insert
  with check (id = clerk_user_id() and role = 'client');

create policy "profiles: owner update non-role fields"
  on public.profiles for update
  using (id = clerk_user_id())
  with check (role = (select role from public.profiles where id = clerk_user_id()));

create policy "profiles: admin full access"
  on public.profiles for all
  using (exists (
    select 1 from public.profiles p
    where p.id = clerk_user_id() and p.role = 'admin'
  ));

-- Keep updated_at in sync automatically
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- messages
-- Two-way messaging between admin and client.
-- ---------------------------------------------------------------------------
create table public.messages (
  id          uuid primary key default uuid_generate_v4(),
  profile_id  text not null references public.profiles(id) on delete cascade,
  sender      text not null check (sender in ('admin','client')),
  body        text not null,
  created_at  timestamptz not null default now()
);

create index messages_profile_id_idx on public.messages(profile_id);

alter table public.messages enable row level security;

create policy "messages: client reads own thread"
  on public.messages for select
  using (profile_id = clerk_user_id() or exists (
    select 1 from public.profiles p
    where p.id = clerk_user_id() and p.role = 'admin'
  ));

create policy "messages: client inserts own messages"
  on public.messages for insert
  with check (
    profile_id = clerk_user_id() and sender = 'client'
  );

create policy "messages: admin full access"
  on public.messages for all
  using (exists (
    select 1 from public.profiles p
    where p.id = clerk_user_id() and p.role = 'admin'
  ));

-- ---------------------------------------------------------------------------
-- documents
-- Metadata only — actual files live in Supabase Storage bucket "documents".
-- ---------------------------------------------------------------------------
create table public.documents (
  id          uuid primary key default uuid_generate_v4(),
  profile_id  text not null references public.profiles(id) on delete cascade,
  name        text not null,
  storage_path text not null,   -- path inside the "documents" bucket
  mime_type   text not null,
  size_bytes  integer,
  category    text not null check (category in ('id','ssn','credit_report','other')),
  status      text not null default 'pending'
                check (status in ('pending','verified','rejected')),
  created_at  timestamptz not null default now()
);

create index documents_profile_id_idx on public.documents(profile_id);

alter table public.documents enable row level security;

create policy "documents: owner read"
  on public.documents for select
  using (profile_id = clerk_user_id() or exists (
    select 1 from public.profiles p
    where p.id = clerk_user_id() and p.role = 'admin'
  ));

create policy "documents: owner insert"
  on public.documents for insert
  with check (profile_id = clerk_user_id());

create policy "documents: admin full access"
  on public.documents for all
  using (exists (
    select 1 from public.profiles p
    where p.id = clerk_user_id() and p.role = 'admin'
  ));

-- ---------------------------------------------------------------------------
-- audit_log
-- Immutable append-only log of sensitive data access.
-- ---------------------------------------------------------------------------
create table public.audit_log (
  id          bigserial primary key,
  actor_id    text not null,              -- Clerk user_id of who did the action
  action      text not null,              -- e.g. 'document.view', 'ssn.read'
  target_id   text,                       -- profile_id or document_id being accessed
  metadata    jsonb,
  created_at  timestamptz not null default now()
);

create index audit_log_actor_idx   on public.audit_log(actor_id);
create index audit_log_target_idx  on public.audit_log(target_id);
create index audit_log_created_idx on public.audit_log(created_at);

alter table public.audit_log enable row level security;

-- Only admins can read the audit log; inserts go through a security-definer fn.
create policy "audit_log: admin read"
  on public.audit_log for select
  using (exists (
    select 1 from public.profiles p
    where p.id = clerk_user_id() and p.role = 'admin'
  ));

-- Security-definer function so clients can write audit entries without
-- needing direct INSERT permission on the table.
create or replace function public.log_audit_event(
  p_action   text,
  p_target   text default null,
  p_metadata jsonb default null
)
returns void
language plpgsql security definer
as $$
begin
  insert into public.audit_log(actor_id, action, target_id, metadata)
  values (clerk_user_id(), p_action, p_target, p_metadata);
end;
$$;

-- ---------------------------------------------------------------------------
-- Storage — "documents" bucket
-- Private bucket; files stored at  documents/{clerk_user_id}/{category}_{ts}.{ext}
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents',
  'documents',
  false,
  8388608,   -- 8 MB hard limit matches DocumentVault.tsx MAX_FILE_BYTES
  array['image/jpeg','image/png','image/webp','application/pdf']
) on conflict (id) do nothing;

-- Enable RLS on storage objects (it's off by default)
alter table storage.objects enable row level security;

-- Clients may upload only into their own folder
create policy "storage: owner upload"
  on storage.objects for insert
  with check (
    bucket_id = 'documents'
    and name like 'documents/' || public.clerk_user_id() || '/%'
  );

-- Clients read their own files; admins read everything in the bucket
create policy "storage: owner read"
  on storage.objects for select
  using (
    bucket_id = 'documents'
    and (
      name like 'documents/' || public.clerk_user_id() || '/%'
      or exists (
        select 1 from public.profiles p
        where p.id = public.clerk_user_id() and p.role = 'admin'
      )
    )
  );

-- Admins can delete / update documents
create policy "storage: admin write"
  on storage.objects for all
  using (
    bucket_id = 'documents'
    and exists (
      select 1 from public.profiles p
      where p.id = public.clerk_user_id() and p.role = 'admin'
    )
  );
