-- Migration: Add task_id field to mentor_feedback to link feedback to tasks
-- This migration is idempotent and safe to rerun.
BEGIN;

-- Add task_id column to mentor_feedback table
ALTER TABLE public.mentor_feedback
ADD COLUMN IF NOT EXISTS task_id integer REFERENCES public.tasks(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_mentor_feedback_task_id ON public.mentor_feedback(task_id);

-- Update feedback_type CHECK constraint to include 'task'
ALTER TABLE public.mentor_feedback
DROP CONSTRAINT IF EXISTS mentor_feedback_feedback_type_check;

ALTER TABLE public.mentor_feedback
ADD CONSTRAINT mentor_feedback_feedback_type_check
CHECK (feedback_type IN ('job', 'skill', 'general', 'task'));

COMMIT;

