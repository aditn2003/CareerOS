-- Migration script to populate job_application_materials table from existing data
-- This script migrates existing resume_id and cover_letter_id from jobs table
-- and application_materials_history to the new job_application_materials table

-- First, ensure the table exists (it should be created by init.sql)
-- This is just a safety check

-- Migrate data from jobs table (for jobs that don't have history entries)
-- Only insert if resume_id and cover_letter_id exist in their respective tables
INSERT INTO job_application_materials (job_id, user_id, resume_id, cover_letter_id, resume_customization, cover_letter_customization)
SELECT 
    j.id AS job_id,
    j.user_id,
    CASE 
        WHEN j.resume_id IS NOT NULL AND EXISTS (SELECT 1 FROM resumes r WHERE r.id = j.resume_id AND r.user_id = j.user_id) 
        THEN j.resume_id 
        ELSE NULL 
    END AS resume_id,
    CASE 
        WHEN j.cover_letter_id IS NOT NULL AND EXISTS (SELECT 1 FROM cover_letters cl WHERE cl.id = j.cover_letter_id AND cl.user_id = j.user_id) 
        THEN j.cover_letter_id 
        ELSE NULL 
    END AS cover_letter_id,
    COALESCE(j.resume_customization, 'none') AS resume_customization,
    COALESCE(j.cover_letter_customization, 'none') AS cover_letter_customization
FROM jobs j
WHERE (j.resume_id IS NOT NULL OR j.cover_letter_id IS NOT NULL)
  AND NOT EXISTS (
    SELECT 1 FROM job_application_materials jam WHERE jam.job_id = j.id
  )
  AND (
    -- Only insert if at least one valid material exists
    (j.resume_id IS NOT NULL AND EXISTS (SELECT 1 FROM resumes r WHERE r.id = j.resume_id AND r.user_id = j.user_id))
    OR
    (j.cover_letter_id IS NOT NULL AND EXISTS (SELECT 1 FROM cover_letters cl WHERE cl.id = j.cover_letter_id AND cl.user_id = j.user_id))
  )
ON CONFLICT (job_id) DO NOTHING;

-- Migrate data from application_materials_history (most recent entry per job)
-- This takes priority over jobs table data
-- Only insert if resume_id and cover_letter_id exist in their respective tables
INSERT INTO job_application_materials (job_id, user_id, resume_id, cover_letter_id, resume_customization, cover_letter_customization)
SELECT DISTINCT ON (amh.job_id)
    amh.job_id,
    amh.user_id,
    CASE 
        WHEN amh.resume_id IS NOT NULL AND EXISTS (SELECT 1 FROM resumes r WHERE r.id = amh.resume_id AND r.user_id = amh.user_id) 
        THEN amh.resume_id 
        ELSE NULL 
    END AS resume_id,
    CASE 
        WHEN amh.cover_letter_id IS NOT NULL AND EXISTS (SELECT 1 FROM cover_letters cl WHERE cl.id = amh.cover_letter_id AND cl.user_id = amh.user_id) 
        THEN amh.cover_letter_id 
        ELSE NULL 
    END AS cover_letter_id,
    'none' AS resume_customization,  -- Default since history doesn't store this
    'none' AS cover_letter_customization  -- Default since history doesn't store this
FROM application_materials_history amh
WHERE (amh.resume_id IS NOT NULL OR amh.cover_letter_id IS NOT NULL)
  AND NOT EXISTS (
    SELECT 1 FROM job_application_materials jam WHERE jam.job_id = amh.job_id
  )
  AND (
    -- Only insert if at least one valid material exists
    (amh.resume_id IS NOT NULL AND EXISTS (SELECT 1 FROM resumes r WHERE r.id = amh.resume_id AND r.user_id = amh.user_id))
    OR
    (amh.cover_letter_id IS NOT NULL AND EXISTS (SELECT 1 FROM cover_letters cl WHERE cl.id = amh.cover_letter_id AND cl.user_id = amh.user_id))
  )
ORDER BY amh.job_id, amh.changed_at DESC NULLS LAST, amh.id DESC
ON CONFLICT (job_id) DO UPDATE SET
    resume_id = COALESCE(EXCLUDED.resume_id, job_application_materials.resume_id),
    cover_letter_id = COALESCE(EXCLUDED.cover_letter_id, job_application_materials.cover_letter_id),
    updated_at = NOW();

-- If application_materials_history doesn't have changed_at column, use created_at or id
-- This handles the case where the table structure might be different
DO $$
BEGIN
    -- Try to use changed_at if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'application_materials_history' 
        AND column_name = 'changed_at'
    ) THEN
        -- Already handled above, do nothing
        NULL;
    ELSE
        -- Fallback: use most recent by id
        INSERT INTO job_application_materials (job_id, user_id, resume_id, cover_letter_id, resume_customization, cover_letter_customization)
        SELECT DISTINCT ON (amh.job_id)
            amh.job_id,
            amh.user_id,
            CASE 
                WHEN amh.resume_id IS NOT NULL AND EXISTS (SELECT 1 FROM resumes r WHERE r.id = amh.resume_id AND r.user_id = amh.user_id) 
                THEN amh.resume_id 
                ELSE NULL 
            END AS resume_id,
            CASE 
                WHEN amh.cover_letter_id IS NOT NULL AND EXISTS (SELECT 1 FROM cover_letters cl WHERE cl.id = amh.cover_letter_id AND cl.user_id = amh.user_id) 
                THEN amh.cover_letter_id 
                ELSE NULL 
            END AS cover_letter_id,
            'none' AS resume_customization,
            'none' AS cover_letter_customization
        FROM application_materials_history amh
        WHERE (amh.resume_id IS NOT NULL OR amh.cover_letter_id IS NOT NULL)
          AND NOT EXISTS (
            SELECT 1 FROM job_application_materials jam WHERE jam.job_id = amh.job_id
          )
          AND (
            -- Only insert if at least one valid material exists
            (amh.resume_id IS NOT NULL AND EXISTS (SELECT 1 FROM resumes r WHERE r.id = amh.resume_id AND r.user_id = amh.user_id))
            OR
            (amh.cover_letter_id IS NOT NULL AND EXISTS (SELECT 1 FROM cover_letters cl WHERE cl.id = amh.cover_letter_id AND cl.user_id = amh.user_id))
          )
        ORDER BY amh.job_id, amh.id DESC
        ON CONFLICT (job_id) DO UPDATE SET
            resume_id = COALESCE(EXCLUDED.resume_id, job_application_materials.resume_id),
            cover_letter_id = COALESCE(EXCLUDED.cover_letter_id, job_application_materials.cover_letter_id),
            updated_at = NOW();
    END IF;
END $$;

