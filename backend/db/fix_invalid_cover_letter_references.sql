-- ======================================
-- FIX INVALID cover_letter_id REFERENCES
-- ======================================
-- This script clears any cover_letter_id values in job_materials
-- that don't exist in the uploaded_cover_letters table

-- Step 1: Show current invalid references
SELECT 
    'Current invalid cover_letter_id references:' AS Status,
    COUNT(*) AS invalid_count
FROM job_materials jm
WHERE jm.cover_letter_id IS NOT NULL
AND jm.cover_letter_id NOT IN (SELECT id FROM uploaded_cover_letters);

-- Step 2: Clear invalid cover_letter_id references
UPDATE job_materials
SET cover_letter_id = NULL
WHERE cover_letter_id IS NOT NULL
AND cover_letter_id NOT IN (SELECT id FROM uploaded_cover_letters);

-- Step 3: Verification
SELECT 
    '✅ Invalid cover_letter_id references cleared!' AS Status,
    COUNT(*) AS total_job_materials,
    COUNT(CASE WHEN cover_letter_id IS NOT NULL THEN 1 END) AS jobs_with_valid_cover_letter,
    COUNT(CASE WHEN cover_letter_id IS NOT NULL 
              AND cover_letter_id IN (SELECT id FROM uploaded_cover_letters) 
         THEN 1 END) AS jobs_with_valid_uploaded_cover_letter
FROM job_materials;

