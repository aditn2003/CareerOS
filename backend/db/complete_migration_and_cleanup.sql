-- ======================================
-- COMPLETE APPLICATION MATERIALS MIGRATION & CLEANUP
-- ======================================
-- This file does EVERYTHING from start to finish:
-- 1. Drops ALL old materials tables
-- 2. Creates new clean job_materials table
-- 3. Migrates existing data from jobs table
-- 4. Removes resume_id, cover_letter_id, and customization columns from jobs table
-- 5. Verifies the setup
--
-- Run this file ONCE to complete the entire migration
-- ======================================

-- ======================================
-- STEP 1: DROP ALL OLD MATERIALS TABLES
-- ======================================
-- Remove all the old/complex materials tables

DROP TABLE IF EXISTS application_materials CASCADE;
DROP TABLE IF EXISTS job_material_history CASCADE;
DROP TABLE IF EXISTS application_materials_history CASCADE;
DROP TABLE IF EXISTS job_application_materials CASCADE;

-- ======================================
-- STEP 2: CREATE NEW CLEAN TABLE
-- ======================================
-- One table, one row per job, stores current resume and cover letter

CREATE TABLE IF NOT EXISTS job_materials (
    id SERIAL PRIMARY KEY,
    job_id INTEGER NOT NULL UNIQUE REFERENCES jobs(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    resume_id INTEGER REFERENCES resumes(id) ON DELETE SET NULL,
    cover_letter_id INTEGER REFERENCES cover_letters(id) ON DELETE SET NULL,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT unique_job_materials UNIQUE(job_id)
);

-- ======================================
-- STEP 3: CREATE INDEXES
-- ======================================
-- For performance

CREATE INDEX IF NOT EXISTS idx_job_materials_job_id ON job_materials(job_id);
CREATE INDEX IF NOT EXISTS idx_job_materials_user_id ON job_materials(user_id);
CREATE INDEX IF NOT EXISTS idx_job_materials_resume_id ON job_materials(resume_id);
CREATE INDEX IF NOT EXISTS idx_job_materials_cover_letter_id ON job_materials(cover_letter_id);

-- ======================================
-- STEP 4: CREATE AUTO-UPDATE TRIGGER
-- ======================================
-- Automatically updates updated_at timestamp when row is updated

CREATE OR REPLACE FUNCTION update_job_materials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_job_materials_updated_at ON job_materials;

CREATE TRIGGER trigger_update_job_materials_updated_at
    BEFORE UPDATE ON job_materials
    FOR EACH ROW
    EXECUTE FUNCTION update_job_materials_updated_at();

-- ======================================
-- STEP 5: MIGRATE EXISTING DATA
-- ======================================
-- Migrate data from jobs table (resume_id and cover_letter_id columns)
-- Only migrates if the columns still exist in jobs table
-- Only migrates valid references (resumes and cover letters that exist)

DO $$
BEGIN
    -- Check if resume_id and cover_letter_id columns exist in jobs table
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'jobs' 
        AND column_name = 'resume_id'
    ) THEN
        -- Migrate data from jobs table
        INSERT INTO job_materials (job_id, user_id, resume_id, cover_letter_id)
        SELECT 
            j.id AS job_id,
            j.user_id,
            CASE 
                WHEN j.resume_id IS NOT NULL AND EXISTS (
                    SELECT 1 FROM resumes r WHERE r.id = j.resume_id AND r.user_id = j.user_id
                ) THEN j.resume_id 
                ELSE NULL 
            END AS resume_id,
            CASE 
                WHEN j.cover_letter_id IS NOT NULL AND EXISTS (
                    SELECT 1 FROM cover_letters cl WHERE cl.id = j.cover_letter_id AND cl.user_id = j.user_id
                ) THEN j.cover_letter_id 
                ELSE NULL 
            END AS cover_letter_id
        FROM jobs j
        WHERE (j.resume_id IS NOT NULL OR j.cover_letter_id IS NOT NULL)
          AND NOT EXISTS (
            SELECT 1 FROM job_materials jm WHERE jm.job_id = j.id
          )
        ON CONFLICT (job_id) DO NOTHING;
        
        RAISE NOTICE 'Migrated data from jobs table';
    ELSE
        RAISE NOTICE 'resume_id and cover_letter_id columns do not exist in jobs table - skipping migration';
    END IF;
END $$;

-- ======================================
-- STEP 6: REMOVE COLUMNS FROM JOBS TABLE
-- ======================================
-- Remove resume_id, cover_letter_id, and customization columns from jobs table
-- All materials are now stored in job_materials table

ALTER TABLE jobs DROP COLUMN IF EXISTS resume_id;
ALTER TABLE jobs DROP COLUMN IF EXISTS cover_letter_id;
ALTER TABLE jobs DROP COLUMN IF EXISTS resume_customization;
ALTER TABLE jobs DROP COLUMN IF EXISTS cover_letter_customization;

-- ======================================
-- STEP 7: VERIFICATION
-- ======================================
-- Show summary of what was migrated and cleaned

SELECT 
    '✅ Migration & Cleanup Complete!' AS status,
    (SELECT COUNT(*) FROM job_materials) AS total_jobs_with_materials,
    (SELECT COUNT(*) FROM job_materials WHERE resume_id IS NOT NULL) AS jobs_with_resume,
    (SELECT COUNT(*) FROM job_materials WHERE cover_letter_id IS NOT NULL) AS jobs_with_cover_letter,
    (SELECT COUNT(*) FROM job_materials WHERE resume_id IS NOT NULL AND cover_letter_id IS NOT NULL) AS jobs_with_both,
    (SELECT COUNT(*) FROM information_schema.columns 
     WHERE table_name = 'jobs' 
     AND column_name IN ('resume_id', 'cover_letter_id', 'resume_customization', 'cover_letter_customization')) AS remaining_columns_in_jobs,
    (SELECT COUNT(*) FROM information_schema.tables 
     WHERE table_name IN ('application_materials', 'job_material_history', 'application_materials_history', 'job_application_materials')) AS remaining_old_tables;

-- ======================================
-- DONE!
-- ======================================
-- The new job_materials table is ready to use.
-- All old tables and columns have been removed.
-- All routes have been updated to use this table.
-- 
-- NEXT STEP: Restart your backend server to apply the changes.
-- ======================================

