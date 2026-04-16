-- Migration 003: track whether a paid user has booked their onboarding call.
--
-- onboarding_call_booked is set to true by /api/profile/mark-onboarding-booked
-- when Calendly fires the calendly.event_scheduled postMessage on the dashboard.
-- The dashboard onboarding card is hidden for any user where this is true.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_call_booked boolean NOT NULL DEFAULT false;
