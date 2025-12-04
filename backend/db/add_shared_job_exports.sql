-- Migration: Add shared_job_exports table to track candidate exports
-- This migration is idempotent and safe to rerun.
BEGIN;

-- Create shared_job_exports table
CREATE TABLE IF NOT EXISTS public.shared_job_exports (
  id serial PRIMARY KEY,
  shared_job_id integer NOT NULL REFERENCES public.shared_jobs(id) ON DELETE CASCADE,
  candidate_id integer NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  exported_job_id integer REFERENCES public.jobs(id) ON DELETE SET NULL, -- The job created in candidate's pipeline
  exported_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(shared_job_id, candidate_id) -- Prevent duplicate exports
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_shared_job_exports_shared_job_id ON public.shared_job_exports(shared_job_id);
CREATE INDEX IF NOT EXISTS idx_shared_job_exports_candidate_id ON public.shared_job_exports(candidate_id);
CREATE INDEX IF NOT EXISTS idx_shared_job_exports_exported_at ON public.shared_job_exports(exported_at DESC);

COMMIT;

