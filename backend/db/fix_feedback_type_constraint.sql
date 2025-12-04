-- Quick fix for feedback_type constraint
-- Run this if you're getting constraint violation errors

BEGIN;

-- Drop the existing constraint
ALTER TABLE public.mentor_feedback
DROP CONSTRAINT IF EXISTS mentor_feedback_feedback_type_check;

-- Recreate with correct values
ALTER TABLE public.mentor_feedback
ADD CONSTRAINT mentor_feedback_feedback_type_check
CHECK (feedback_type IN ('job', 'skill', 'general', 'task'));

COMMIT;

