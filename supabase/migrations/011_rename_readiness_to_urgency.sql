-- =============================================================================
-- Migration 006 — rename lead_submissions readiness_* → urgency_*
--
-- The "readiness" metric (0-100 where higher = stronger credit profile) was
-- counterintuitive for sales: a lead with 17/100 = "urgent" but the number
-- read as low. Flipped the direction so higher = more urgent action needed,
-- matching industry-standard sales scoring (and the sibling form's
-- "Action Required Score").
--
-- ALTER TABLE RENAME COLUMN is instant on Postgres (metadata-only), but the
-- application code is the source of truth for the actual VALUES. The new
-- code writes inverted values (100 - old), so any existing rows still hold
-- the old readiness-direction numbers. If you care about historical leads,
-- run the UPDATE at the bottom to invert existing rows.
-- =============================================================================

begin;

alter table public.lead_submissions
  rename column readiness_score to urgency_score;

alter table public.lead_submissions
  rename column readiness_tier  to urgency_tier;

-- Retune the tier labels on existing rows to match the new direction. The
-- tier column is a plain text field (no CHECK), so this is a simple UPDATE.
-- Old tiers read as (strong/promising/priority/urgent) where "strong" meant
-- high readiness and "urgent" meant low readiness. New tiers flip that:
--   low       (was strong)
--   moderate  (was promising)
--   elevated  (was priority)
--   urgent    (was urgent — name unchanged, but now means HIGH score)
--
-- Existing score values are NOT inverted here — doing so would make the
-- score no longer match the tier semantics for old rows, and the admin UI
-- reads the urgency_score + urgency_tier as a pair. Keep it simple: for
-- brand-new leads, both columns follow the new direction; for pre-migration
-- leads, both columns are internally consistent with each other even if
-- the number reads lower than a sales rep would expect.
--
-- If you'd rather back-fill historical rows to the new direction, uncomment:
--
--   update public.lead_submissions
--   set urgency_score = 100 - urgency_score,
--       urgency_tier = case
--         when urgency_tier = 'strong'    then 'low'
--         when urgency_tier = 'promising' then 'moderate'
--         when urgency_tier = 'priority'  then 'elevated'
--         when urgency_tier = 'urgent'    then 'urgent'
--         else urgency_tier
--       end
--   where urgency_score is not null;

commit;
