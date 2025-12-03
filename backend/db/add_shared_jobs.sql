-- Migration: Add shared_jobs table for mentor job sharing
-- This migration is idempotent and safe to rerun.
BEGIN;

-- Create shared_jobs table
CREATE TABLE IF NOT EXISTS public.shared_jobs (
  id serial PRIMARY KEY,
  team_id integer NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  job_id integer NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  shared_by_mentor_id integer NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  comments text, -- Mentor's collaborative comments and recommendations
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_shared_jobs_team_id ON public.shared_jobs(team_id);
CREATE INDEX IF NOT EXISTS idx_shared_jobs_job_id ON public.shared_jobs(job_id);
CREATE INDEX IF NOT EXISTS idx_shared_jobs_mentor_id ON public.shared_jobs(shared_by_mentor_id);
CREATE INDEX IF NOT EXISTS idx_shared_jobs_created_at ON public.shared_jobs(created_at DESC);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_shared_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS trigger_update_shared_jobs_updated_at ON public.shared_jobs;
CREATE TRIGGER trigger_update_shared_jobs_updated_at
  BEFORE UPDATE ON public.shared_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_shared_jobs_updated_at();

COMMIT;

