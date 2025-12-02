-- Migration: Add task/assignment system
-- This migration is idempotent and safe to rerun.
BEGIN;

-- Create tasks table
CREATE TABLE IF NOT EXISTS public.tasks (
  id serial PRIMARY KEY,
  team_id integer NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  mentor_id integer NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  candidate_id integer NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  job_id integer REFERENCES public.jobs(id) ON DELETE SET NULL,
  skill_name text, -- Optional: link to a specific skill
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  due_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- Note: Team membership validation is handled at application level in routes
  CONSTRAINT tasks_mentor_candidate_different CHECK (mentor_id != candidate_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_team_id ON public.tasks(team_id);
CREATE INDEX IF NOT EXISTS idx_tasks_candidate_id ON public.tasks(candidate_id);
CREATE INDEX IF NOT EXISTS idx_tasks_mentor_id ON public.tasks(mentor_id);
CREATE INDEX IF NOT EXISTS idx_tasks_job_id ON public.tasks(job_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS trigger_update_tasks_updated_at ON public.tasks;
CREATE TRIGGER trigger_update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_tasks_updated_at();

COMMIT;

