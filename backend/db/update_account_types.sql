-- Migration: Update account types from team_admin to mentor
-- This migration removes team_admin and adds mentor account type
-- Run this migration to update your database schema

BEGIN;

-- Step 1: Drop the existing constraint FIRST (before updating data)
-- This allows us to update the data without constraint violations
DO $$
BEGIN
  -- Check if constraint exists and drop it
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_account_type_check'
      AND conrelid = 'public.users'::regclass
  ) THEN
    ALTER TABLE public.users
      DROP CONSTRAINT users_account_type_check;
    RAISE NOTICE 'Dropped existing users_account_type_check constraint';
  ELSE
    RAISE NOTICE 'Constraint users_account_type_check does not exist, skipping drop';
  END IF;
END $$;

-- Step 2: Update existing team_admin users to mentor (now safe since constraint is dropped)
UPDATE public.users
SET account_type = 'mentor'
WHERE account_type = 'team_admin';

-- Step 3: Add new constraint with mentor instead of team_admin
ALTER TABLE public.users
  ADD CONSTRAINT users_account_type_check
  CHECK (account_type IN ('candidate', 'mentor'));

-- Step 4: Update team_members: change admin role to mentor for users who are mentors
-- This ensures team_members table is consistent with the new account types
UPDATE public.team_members
SET role = 'mentor'
WHERE role = 'admin'
  AND user_id IN (SELECT id FROM public.users WHERE account_type = 'mentor');

COMMIT;

-- Verification query (uncomment to run after migration):
-- SELECT account_type, COUNT(*) as count FROM users GROUP BY account_type;
-- SELECT role, COUNT(*) as count FROM team_members GROUP BY role;
