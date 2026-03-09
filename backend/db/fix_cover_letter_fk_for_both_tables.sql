-- ============================================================
-- FIX: Allow cover_letter_id to reference BOTH tables
-- ============================================================
-- The job_materials.cover_letter_id currently only references uploaded_cover_letters
-- But we also have AI-generated cover letters in the cover_letters table
-- This migration removes the foreign key constraint to allow linking both types
-- ============================================================

-- Step 1: Drop the foreign key constraint from job_materials
ALTER TABLE job_materials
DROP CONSTRAINT IF EXISTS job_materials_cover_letter_id_fkey;

-- Step 2: Also drop from application_materials_history if exists
ALTER TABLE application_materials_history
DROP CONSTRAINT IF EXISTS application_materials_history_cover_letter_id_fkey;

-- Verification - show that constraints are dropped
SELECT 
    'job_materials constraints' AS table_name,
    COUNT(*) AS constraint_count
FROM pg_constraint 
WHERE conrelid = 'job_materials'::regclass 
AND conname LIKE '%cover_letter%';

SELECT 
    'application_materials_history constraints' AS table_name,
    COUNT(*) AS constraint_count
FROM pg_constraint 
WHERE conrelid = 'application_materials_history'::regclass 
AND conname LIKE '%cover_letter%';

-- Add comment explaining why FK is removed
COMMENT ON COLUMN job_materials.cover_letter_id IS 
  'Cover letter ID - can reference either uploaded_cover_letters or cover_letters table. FK constraint removed to support both.';

SELECT '✅ Foreign key constraints removed! cover_letter_id can now reference either table.' AS status;
