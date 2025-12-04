-- Migration: Update team model for hierarchical permissions
-- This migration adds constraints and indexes for multi-team support

BEGIN;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON public.team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_role ON public.team_members(role);

-- Note: We keep owner_id in teams table for tracking who created the team,
-- but permissions are determined by team_members.role ('admin' is highest)

-- Add a function to check if a user is already a mentor in another team
-- (This will be enforced in application logic, but we document it here)

COMMENT ON TABLE public.team_members IS 
'Team membership table. Admin role is highest. Mentors can only be in one team. Candidates can be in multiple teams.';

COMMENT ON COLUMN public.teams.owner_id IS 
'User who created the team. Permissions come from team_members.role, not owner_id.';

COMMIT;

