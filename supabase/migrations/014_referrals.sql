-- =============================================================================
-- Migration 009 — referral program (Stage 0: client-to-client)
--
-- Data model:
--
--   profiles.referral_code  — unique human-readable code per user
--                             (CPC- prefix + 6 alphanumeric chars).
--                             Auto-generated for every new profile;
--                             back-filled for existing profiles below.
--
--   referrals              — one row per referral event. Captures the
--                             full lifecycle: click → signup → purchase →
--                             payout. Denormalized referral_code_used so
--                             the link still works even if the referrer's
--                             profile is later deleted.
--
-- Flow (implemented in code, not DB):
--   1. Visitor hits /r/<code>  → API creates row (status='pending'),
--                                 drops a 90-day cookie, redirects home
--   2. Visitor signs up via Clerk → webhook looks up cookie, marks
--                                   matching row status='signup'
--   3. Visitor pays via Stripe    → webhook marks row 'purchased' +
--                                   sets amount_cents (default $50)
--   4. Admin processes payout     → marks 'paid_out' + paid_out_at
--
-- RLS:
--   - Referrer (self) can read their own referrals: see who they referred
--     (email only, no full PII) + status + amount.
--   - Admins read everything.
--   - Writes: service-role only.
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. Add referral_code to profiles
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists referral_code text unique;

-- Code generator — 6 alphanumeric chars, uppercase, avoiding confusing
-- characters (0/O, 1/I/L). Pl/SQL loop so we can retry on rare collisions.
create or replace function public.generate_referral_code()
returns text
language plpgsql
as $$
declare
  chars     text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';  -- 31 chars (no 0/O/1/I/L)
  candidate text;
  tries     int  := 0;
begin
  loop
    candidate := 'CPC-';
    for i in 1..6 loop
      candidate := candidate || substr(chars, 1 + floor(random() * length(chars))::int, 1);
    end loop;
    -- Uniqueness check — near-miss odds ~1 in 900M, but be paranoid
    if not exists (select 1 from public.profiles where referral_code = candidate) then
      return candidate;
    end if;
    tries := tries + 1;
    if tries > 10 then
      -- Degrade gracefully — append extra chars to eliminate collision risk
      return candidate || substr(md5(random()::text), 1, 4);
    end if;
  end loop;
end;
$$;

-- Back-fill existing profiles that don't have a code yet.
update public.profiles
set referral_code = public.generate_referral_code()
where referral_code is null;

-- Trigger: every new profile gets a code at insert time. Prevents NULLs
-- from sneaking in via the Clerk webhook, which does an upsert without
-- thinking about referral_code.
create or replace function public.set_referral_code_on_insert()
returns trigger
language plpgsql
as $$
begin
  if new.referral_code is null then
    new.referral_code := public.generate_referral_code();
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_set_referral_code on public.profiles;
create trigger profiles_set_referral_code
  before insert on public.profiles
  for each row execute function public.set_referral_code_on_insert();

-- ---------------------------------------------------------------------------
-- 2. referrals table
-- ---------------------------------------------------------------------------
create table if not exists public.referrals (
  id                    uuid primary key default uuid_generate_v4(),

  -- Who referred. Denormalized code captures the referrer even if their
  -- profile is later deleted (ON DELETE SET NULL on profile_id).
  referrer_profile_id   text references public.profiles(id) on delete set null,
  referral_code_used    text not null,

  -- Who was referred. profile_id is null until they sign up. Email is
  -- optional and only populated if we captured it pre-signup (e.g. quiz).
  referred_profile_id   text references public.profiles(id) on delete set null,
  referred_email        text,

  -- Lifecycle
  status                text not null default 'pending'
                          check (status in ('pending', 'signup', 'purchased', 'paid_out', 'void')),
  amount_cents          integer,   -- set when status moves to 'purchased' — default $50 = 5000
  stripe_session_id     text,      -- the checkout session that triggered it

  -- Timestamps, one per state transition — easier to reason about than
  -- a single status_updated_at + status enum.
  clicked_at            timestamptz not null default now(),
  signed_up_at          timestamptz,
  purchased_at          timestamptz,
  paid_out_at           timestamptz,

  -- Tracking metadata
  client_ip             inet,
  user_agent            text,

  created_at            timestamptz not null default now()
);

create index if not exists referrals_referrer_idx  on public.referrals(referrer_profile_id);
create index if not exists referrals_referred_idx  on public.referrals(referred_profile_id);
create index if not exists referrals_code_idx      on public.referrals(referral_code_used);
create index if not exists referrals_status_idx    on public.referrals(status);
-- Newest-first for admin "pending payouts" view
create index if not exists referrals_purchased_idx on public.referrals(purchased_at desc)
  where status = 'purchased';

alter table public.referrals enable row level security;

-- Referrer sees their own rows (to populate their stats on the dashboard).
-- Email of the referred person is shown but not their profile details.
drop policy if exists "referrals: referrer or admin read" on public.referrals;
create policy "referrals: referrer or admin read"
  on public.referrals for select
  using (
    referrer_profile_id = public.clerk_user_id()
    or public.is_admin()
  );

-- No client-side write policy — service-role only (API endpoints write).

commit;
