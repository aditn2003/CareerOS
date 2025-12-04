-- Fix foreign key constraints for mentor_feedback table
-- The mentor_id and candidate_id should reference users table, not mentors table

BEGIN;

-- Drop existing incorrect foreign key constraints if they exist
ALTER TABLE public.mentor_feedback
DROP CONSTRAINT IF EXISTS mentor_feedback_mentor_id_fkey;

ALTER TABLE public.mentor_feedback
DROP CONSTRAINT IF EXISTS mentor_feedback_candidate_id_fkey;

-- Recreate with correct references to users table
ALTER TABLE public.mentor_feedback
ADD CONSTRAINT mentor_feedback_mentor_id_fkey
FOREIGN KEY (mentor_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.mentor_feedback
ADD CONSTRAINT mentor_feedback_candidate_id_fkey
FOREIGN KEY (candidate_id) REFERENCES public.users(id) ON DELETE CASCADE;

COMMIT;

