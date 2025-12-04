-- Migration: Add application_material feedback type and material_type column
-- This migration is idempotent and safe to rerun.
BEGIN;

-- Add material_type column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'mentor_feedback' 
                 AND column_name = 'material_type') THEN
    ALTER TABLE public.mentor_feedback 
    ADD COLUMN material_type text CHECK (material_type IN ('resume', 'cover_letter'));
  END IF;
END $$;

-- Update feedback_type constraint to include 'application_material'
DO $$
BEGIN
  -- Drop existing constraint if it exists
  ALTER TABLE public.mentor_feedback
  DROP CONSTRAINT IF EXISTS mentor_feedback_feedback_type_check;
  
  -- Check if task_id column exists to determine if we should include 'task' in the constraint
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_schema = 'public' 
             AND table_name = 'mentor_feedback' 
             AND column_name = 'task_id') THEN
    -- Include 'task' and 'application_material' in the constraint
    ALTER TABLE public.mentor_feedback
    ADD CONSTRAINT mentor_feedback_feedback_type_check
    CHECK (feedback_type IN ('job', 'skill', 'general', 'task', 'application_material'));
  ELSE
    -- Don't include 'task' if task_id column doesn't exist, but include 'application_material'
    ALTER TABLE public.mentor_feedback
    ADD CONSTRAINT mentor_feedback_feedback_type_check
    CHECK (feedback_type IN ('job', 'skill', 'general', 'application_material'));
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- If constraint creation fails, try with just the basic types plus application_material
    ALTER TABLE public.mentor_feedback
    DROP CONSTRAINT IF EXISTS mentor_feedback_feedback_type_check;
    ALTER TABLE public.mentor_feedback
    ADD CONSTRAINT mentor_feedback_feedback_type_check
    CHECK (feedback_type IN ('job', 'skill', 'general', 'application_material'));
END $$;

COMMIT;

