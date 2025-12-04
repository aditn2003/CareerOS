-- Cleanup script to fix invalid resume_id and cover_letter_id references in jobs table
-- This sets invalid references to NULL to prevent foreign key constraint violations

-- Fix invalid resume_id references
UPDATE jobs j
SET resume_id = NULL
WHERE j.resume_id IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 FROM resumes r WHERE r.id = j.resume_id AND r.user_id = j.user_id
  );

-- Fix invalid cover_letter_id references
UPDATE jobs j
SET cover_letter_id = NULL
WHERE j.cover_letter_id IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 FROM cover_letters cl WHERE cl.id = j.cover_letter_id AND cl.user_id = j.user_id
  );

-- Also clean up application_materials_history if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'application_materials_history') THEN
        -- Fix invalid resume_id references in history
        UPDATE application_materials_history amh
        SET resume_id = NULL
        WHERE amh.resume_id IS NOT NULL 
          AND NOT EXISTS (
            SELECT 1 FROM resumes r WHERE r.id = amh.resume_id AND r.user_id = amh.user_id
          );

        -- Fix invalid cover_letter_id references in history
        UPDATE application_materials_history amh
        SET cover_letter_id = NULL
        WHERE amh.cover_letter_id IS NOT NULL 
          AND NOT EXISTS (
            SELECT 1 FROM cover_letters cl WHERE cl.id = amh.cover_letter_id AND cl.user_id = amh.user_id
          );
    END IF;
END $$;

-- Report what was fixed
SELECT 
    'Invalid resume_id references fixed' AS action,
    COUNT(*) AS count
FROM jobs j
WHERE j.resume_id IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 FROM resumes r WHERE r.id = j.resume_id AND r.user_id = j.user_id
  );

SELECT 
    'Invalid cover_letter_id references fixed' AS action,
    COUNT(*) AS count
FROM jobs j
WHERE j.cover_letter_id IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 FROM cover_letters cl WHERE cl.id = j.cover_letter_id AND cl.user_id = j.user_id
  );

