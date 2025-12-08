-- Migrate existing data to the new clean table
-- This pulls from jobs table (resume_id and cover_letter_id columns)

INSERT INTO job_materials (job_id, user_id, resume_id, cover_letter_id)
SELECT 
    j.id AS job_id,
    j.user_id,
    j.resume_id,
    j.cover_letter_id
FROM jobs j
WHERE (j.resume_id IS NOT NULL OR j.cover_letter_id IS NOT NULL)
  AND NOT EXISTS (
    SELECT 1 FROM job_materials jm WHERE jm.job_id = j.id
  )
ON CONFLICT (job_id) DO NOTHING;

