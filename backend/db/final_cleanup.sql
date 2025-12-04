-- ======================================
-- FINAL CLEANUP: Remove Everything Old
-- ======================================
-- Run this AFTER running complete_materials_migration.sql
-- This removes all old tables and columns
-- ======================================

-- STEP 1: Drop ALL old materials tables
DROP TABLE IF EXISTS application_materials CASCADE;
DROP TABLE IF EXISTS job_material_history CASCADE;
DROP TABLE IF EXISTS application_materials_history CASCADE;
DROP TABLE IF EXISTS job_application_materials CASCADE;

-- Keep ONLY job_materials (the new clean table)

-- STEP 2: Remove columns from jobs table
ALTER TABLE jobs DROP COLUMN IF EXISTS resume_id;
ALTER TABLE jobs DROP COLUMN IF EXISTS cover_letter_id;
ALTER TABLE jobs DROP COLUMN IF EXISTS resume_customization;
ALTER TABLE jobs DROP COLUMN IF EXISTS cover_letter_customization;

-- STEP 3: Verify cleanup
SELECT 
    'Final Cleanup Complete!' AS status,
    (SELECT COUNT(*) FROM job_materials) AS jobs_in_materials_table,
    (SELECT COUNT(*) FROM information_schema.columns 
     WHERE table_name = 'jobs' 
     AND column_name IN ('resume_id', 'cover_letter_id', 'resume_customization', 'cover_letter_customization')) AS remaining_columns_in_jobs,
    (SELECT COUNT(*) FROM information_schema.tables 
     WHERE table_name IN ('application_materials', 'job_material_history', 'application_materials_history', 'job_application_materials')) AS remaining_old_tables;

