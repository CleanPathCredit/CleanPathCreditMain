-- =============================================================================
-- Migration 005 — Dispute letter generation system
--
-- PURPOSE
-- Adds the data model that backs the FCRA dispute-letter generator: per-round
-- payment + status tracking, per-bureau credit-report references, the
-- per-(round, bureau) negative-item list that feeds each letter, an optional
-- per-profile furnisher directory used by 623 letters, and a versioned record
-- of every generated letter PDF (linked back into the existing `documents`
-- table so all generated files live in one place).
--
-- DESIGN NOTES
--
-- 1.  `profiles` is the case. There is no separate `letter_cases` table —
--     a profile already carries the client's identity (name, address, SSN
--     vault id) and status. `letter_rounds` is a child of `profiles`.
--
-- 2.  Bureau addresses and the round → letter-template mapping are baked
--     into application code (src/lib/letters/), not stored here. They almost
--     never change and editing a constant is safer than a DB migration.
--
-- 3.  CROA compliance: `letter_rounds.payment_cleared_at` gates round
--     drafting. The Stripe webhook flips it; the admin draft UI refuses to
--     proceed without it. Round 1 also waits the federally-required 3
--     business days from `profiles.created_at` before letters can be
--     drafted; that gate is enforced in application code.
--
-- 4.  SSN handling unchanged from migration 001 — vault secret id on
--     `profiles`. Discarded on service end via the retention job (TBD).
--
-- 5.  `letter_packets.is_current` lets admins regenerate a letter (typo
--     fix, item added) without losing the prior version's audit trail.
--
-- 6.  RLS uses the `public.is_admin()` helper from migration 003 to avoid
--     the policy-recursion bug fixed there.
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. Extend documents.category to cover the new artefact types.
--    Existing values: 'id', 'ssn', 'credit_report', 'other'
--    Adding:          'bureau_response'  — letters back from the bureau
--                     'dispute_letter'   — generated outbound dispute PDF
--                     'notarized_letter' — scanned, notarized return copy
-- ---------------------------------------------------------------------------
alter table public.documents
  drop constraint if exists documents_category_check;

alter table public.documents
  add constraint documents_category_check
  check (category in (
    'id','ssn','credit_report','bureau_response',
    'dispute_letter','notarized_letter','other'
  ));

-- ---------------------------------------------------------------------------
-- 2. letter_rounds
--    One row per (profile, round_number, letter_type). Tracks payment,
--    drafting, notary, and dispatch state for that round. The
--    payment-gated round trigger (next round only after payment clears)
--    is enforced in /api/letters/* using `payment_cleared_at`.
-- ---------------------------------------------------------------------------
create table public.letter_rounds (
  id              uuid primary key default uuid_generate_v4(),
  profile_id      text not null references public.profiles(id) on delete cascade,
  round_number    integer not null check (round_number between 1 and 4),
  letter_type     text not null
                    check (letter_type in ('609','611','623')),
  payment_cleared_at  timestamptz,
  payment_stripe_id   text,                -- Stripe charge / invoice ID
  drafted_at      timestamptz,             -- admin finished item entry
  letters_generated_at timestamptz,        -- PDFs produced
  notary_booked_at  timestamptz,
  notarized_at    timestamptz,
  sent_at         timestamptz,             -- certified mail dispatched
  status          text not null default 'pending_payment'
                    check (status in (
                      'pending_payment',
                      'pending_report',     -- waiting on customer report upload
                      'drafting',           -- admin entering negative items
                      'letters_generated',  -- PDFs ready, pre-notary
                      'pending_notary',     -- notary booked, not yet completed
                      'notarized',          -- notarized, waiting on mailing
                      'sent',               -- in the mail
                      'complete'            -- bureau response received / round closed
                    )),
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (profile_id, round_number, letter_type)
);

create index letter_rounds_profile_idx on public.letter_rounds(profile_id);
create index letter_rounds_status_idx  on public.letter_rounds(status)
  where status not in ('complete','sent');

alter table public.letter_rounds enable row level security;

create policy "letter_rounds: owner read"
  on public.letter_rounds for select
  using (profile_id = clerk_user_id() or public.is_admin());

create policy "letter_rounds: admin full access"
  on public.letter_rounds for all
  using (public.is_admin())
  with check (public.is_admin());

create trigger letter_rounds_updated_at
  before update on public.letter_rounds
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. bureau_reports
--    The source credit report for one bureau in one round. References a
--    row in `documents` (the uploaded PDF). One per (round, bureau).
-- ---------------------------------------------------------------------------
create table public.bureau_reports (
  id                  uuid primary key default uuid_generate_v4(),
  letter_round_id     uuid not null
                        references public.letter_rounds(id) on delete cascade,
  bureau              text not null
                        check (bureau in ('equifax','transunion','experian')),
  source_document_id  uuid references public.documents(id) on delete set null,
  pulled_at           timestamptz,
  created_at          timestamptz not null default now(),
  unique (letter_round_id, bureau)
);

create index bureau_reports_round_idx on public.bureau_reports(letter_round_id);

alter table public.bureau_reports enable row level security;

create policy "bureau_reports: owner read"
  on public.bureau_reports for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.letter_rounds lr
      where lr.id = letter_round_id and lr.profile_id = clerk_user_id()
    )
  );

create policy "bureau_reports: admin full access"
  on public.bureau_reports for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 4. creditors
--    Per-profile furnisher directory. Reusable across rounds — the same
--    creditor may appear on R1 (609 to bureau) and again on a later round
--    (623 directly to the furnisher). `dispute_address` is the address
--    where 623 letters get mailed; populated by the admin from the
--    creditor's reporting data.
-- ---------------------------------------------------------------------------
create table public.creditors (
  id              uuid primary key default uuid_generate_v4(),
  profile_id      text not null references public.profiles(id) on delete cascade,
  name            text not null,
  dispute_address text,
  city            text,
  state           text,
  zip             text,
  created_at      timestamptz not null default now(),
  unique (profile_id, name)
);

create index creditors_profile_idx on public.creditors(profile_id);

alter table public.creditors enable row level security;

create policy "creditors: owner read"
  on public.creditors for select
  using (profile_id = clerk_user_id() or public.is_admin());

create policy "creditors: admin full access"
  on public.creditors for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 5. negative_items
--    The actual disputed accounts. One row per item per bureau_report —
--    if the same item shows on Equifax and TransUnion, that's two rows
--    (one per bureau report) because account numbers and statuses can
--    differ across bureaus.
--
--    `account_number` preserves asterisks exactly as on the source report.
--    `dispute_reason` and `believed_correct` are 611-specific fields and
--    null for items only being disputed via 609/623.
-- ---------------------------------------------------------------------------
create table public.negative_items (
  id                uuid primary key default uuid_generate_v4(),
  bureau_report_id  uuid not null
                      references public.bureau_reports(id) on delete cascade,
  creditor_id       uuid references public.creditors(id) on delete set null,
  account_name      text not null,
  account_number    text not null,           -- asterisks preserved verbatim
  account_status    text not null
                      check (account_status in (
                        'charge_off','collection','not_in_good_standing'
                      )),
  dispute_reason    text,                    -- 611-only
  believed_correct  text,                    -- 611-only
  display_order     integer not null default 0,
  created_at        timestamptz not null default now()
);

create index negative_items_report_idx on public.negative_items(bureau_report_id);

alter table public.negative_items enable row level security;

create policy "negative_items: owner read"
  on public.negative_items for select
  using (
    public.is_admin()
    or exists (
      select 1
      from public.bureau_reports br
      join public.letter_rounds lr on lr.id = br.letter_round_id
      where br.id = bureau_report_id and lr.profile_id = clerk_user_id()
    )
  );

create policy "negative_items: admin full access"
  on public.negative_items for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 6. letter_packets
--    The generated PDF for one letter (one bureau or one creditor) of one
--    round. `document_id` points at the unsigned generated PDF;
--    `notarized_document_id` points at the scanned-and-notarized return
--    copy uploaded by the notary or admin.
--
--    Versioning: regeneration sets the prior row's `is_current=false` and
--    inserts a new row with `version+1, is_current=true`. Old rows stay
--    queryable for audit.
--
--    `target_type='bureau'` rows have `bureau` set, `creditor_id` null.
--    `target_type='creditor'` rows (623 letters) have `creditor_id` set,
--    `bureau` null. Constraint enforces the XOR.
-- ---------------------------------------------------------------------------
create table public.letter_packets (
  id                      uuid primary key default uuid_generate_v4(),
  letter_round_id         uuid not null
                            references public.letter_rounds(id) on delete cascade,
  target_type             text not null
                            check (target_type in ('bureau','creditor')),
  bureau                  text
                            check (bureau in ('equifax','transunion','experian')),
  creditor_id             uuid references public.creditors(id) on delete set null,
  document_id             uuid references public.documents(id) on delete set null,
  notarized_document_id   uuid references public.documents(id) on delete set null,
  version                 integer not null default 1,
  is_current              boolean not null default true,
  certified_mail_tracking text,
  generated_at            timestamptz not null default now(),
  -- Exactly one of (bureau, creditor_id) is set; the other is null.
  constraint letter_packets_target_xor check (
    (target_type = 'bureau'  and bureau is not null and creditor_id is null) or
    (target_type = 'creditor' and bureau is null    and creditor_id is not null)
  )
);

create index letter_packets_round_idx on public.letter_packets(letter_round_id);
create index letter_packets_current_idx
  on public.letter_packets(letter_round_id, target_type, bureau, creditor_id)
  where is_current = true;

alter table public.letter_packets enable row level security;

create policy "letter_packets: owner read"
  on public.letter_packets for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.letter_rounds lr
      where lr.id = letter_round_id and lr.profile_id = clerk_user_id()
    )
  );

create policy "letter_packets: admin full access"
  on public.letter_packets for all
  using (public.is_admin())
  with check (public.is_admin());

commit;
