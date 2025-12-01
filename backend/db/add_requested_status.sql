-- Migration: Add 'requested' status for team join requests
-- This allows candidates to request to join teams, which must be approved by mentors/admins

BEGIN;

-- Drop and recreate the constraint to include 'requested' status
DO $$
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'team_members_status_check'
      AND conrelid = 'public.team_members'::regclass
  ) THEN
    ALTER TABLE public.team_members
      DROP CONSTRAINT team_members_status_check;
  END IF;

  -- Add new constraint with 'requested' status
  ALTER TABLE public.team_members
    ADD CONSTRAINT team_members_status_check
    CHECK (status IN ('requested', 'invited', 'active', 'removed'));
END;
$$;

COMMIT;

