-- ======================================
-- SETUP JOB MATERIALS TABLE
-- ======================================
-- Run this file to create the clean job_materials table
-- This replaces all the old complex materials tables

-- Drop old tables first (optional - uncomment if you want to drop them)
-- DROP TABLE IF EXISTS job_application_materials CASCADE;
-- DROP TABLE IF EXISTS application_materials_history CASCADE;

-- ======================================
-- CREATE CLEAN JOB MATERIALS TABLE
-- ======================================
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_job_materials_job_id ON job_materials(job_id);
CREATE INDEX IF NOT EXISTS idx_job_materials_user_id ON job_materials(user_id);
CREATE INDEX IF NOT EXISTS idx_job_materials_resume_id ON job_materials(resume_id);
CREATE INDEX IF NOT EXISTS idx_job_materials_cover_letter_id ON job_materials(cover_letter_id);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_job_materials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_job_materials_updated_at
    BEFORE UPDATE ON job_materials
    FOR EACH ROW
    EXECUTE FUNCTION update_job_materials_updated_at();

-- ======================================
-- MIGRATE EXISTING DATA
-- ======================================
-- Migrate data from jobs table (resume_id and cover_letter_id columns)
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

-- ======================================
-- VERIFY SETUP
-- ======================================
-- Check how many jobs have materials
SELECT 
    'Setup complete!' AS status,
    COUNT(*) AS jobs_with_materials
FROM job_materials;

