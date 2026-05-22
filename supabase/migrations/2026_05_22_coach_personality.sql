-- Add coach personality preference to profiles.
-- Idempotent — safe to re-run.

alter table public.profiles
  add column if not exists coach_personality text default 'motivator';

-- Backfill any existing null values.
update public.profiles
   set coach_personality = 'motivator'
 where coach_personality is null;
