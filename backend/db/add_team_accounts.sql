-- Migration: add account types and team data model
-- This migration is idempotent and safe to rerun.
BEGIN;

-- 1. Ensure users.account_type exists with constraint
ALTER TABLE IF EXISTS public.users
  ADD COLUMN IF NOT EXISTS account_type text NOT NULL DEFAULT 'candidate';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_account_type_check'
      AND conrelid = 'public.users'::regclass
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_account_type_check
      CHECK (account_type IN ('candidate', 'team_admin'));
  END IF;
END;
$$;

-- 2. Teams table
CREATE TABLE IF NOT EXISTS public.teams (
  id serial PRIMARY KEY,
  name text NOT NULL,
  owner_id integer NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Team members table
CREATE TABLE IF NOT EXISTS public.team_members (
  id serial PRIMARY KEY,
  team_id integer NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id integer NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin', 'mentor', 'candidate')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('invited', 'active', 'removed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT team_members_team_user_unique UNIQUE (team_id, user_id)
);

COMMIT;

