-- Migration: Add mentor feedback system
-- This migration is idempotent and safe to rerun.
BEGIN;

-- Create mentor_feedback table
CREATE TABLE IF NOT EXISTS public.mentor_feedback (
  id serial PRIMARY KEY,
  team_id integer NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  mentor_id integer NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  candidate_id integer NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  job_id integer REFERENCES public.jobs(id) ON DELETE SET NULL,
  feedback_type text NOT NULL CHECK (feedback_type IN ('job', 'skill', 'general')),
  content text NOT NULL,
  skill_name text, -- Only used when feedback_type = 'skill'
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
  -- Note: Team membership validation is handled at application level in routes
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_mentor_feedback_team_id ON public.mentor_feedback(team_id);
CREATE INDEX IF NOT EXISTS idx_mentor_feedback_candidate_id ON public.mentor_feedback(candidate_id);
CREATE INDEX IF NOT EXISTS idx_mentor_feedback_mentor_id ON public.mentor_feedback(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentor_feedback_job_id ON public.mentor_feedback(job_id);
CREATE INDEX IF NOT EXISTS idx_mentor_feedback_type ON public.mentor_feedback(feedback_type);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_mentor_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS trigger_update_mentor_feedback_updated_at ON public.mentor_feedback;
CREATE TRIGGER trigger_update_mentor_feedback_updated_at
  BEFORE UPDATE ON public.mentor_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_mentor_feedback_updated_at();

COMMIT;

