-- ======================================
-- UPDATE job_materials TO USE uploaded_cover_letters
-- ======================================
-- This updates the foreign key reference from cover_letters to uploaded_cover_letters

-- Step 1: Clear any existing cover_letter_id values that don't exist in uploaded_cover_letters
-- (since we're switching tables, old references won't be valid)
-- This MUST be done BEFORE updating the foreign key constraint
UPDATE job_materials
SET cover_letter_id = NULL
WHERE cover_letter_id IS NOT NULL 
AND cover_letter_id NOT IN (SELECT id FROM uploaded_cover_letters WHERE id IS NOT NULL);

-- Step 2: Drop the old foreign key constraint
ALTER TABLE job_materials 
DROP CONSTRAINT IF EXISTS job_materials_cover_letter_id_fkey;

-- Step 3: Add new foreign key constraint pointing to uploaded_cover_letters
ALTER TABLE job_materials
ADD CONSTRAINT job_materials_cover_letter_id_fkey 
FOREIGN KEY (cover_letter_id) 
REFERENCES uploaded_cover_letters(id) 
ON DELETE SET NULL;

-- Verification
SELECT 
    '✅ job_materials updated to use uploaded_cover_letters!' AS Status,
    COUNT(*) AS total_job_materials,
    COUNT(CASE WHEN cover_letter_id IS NOT NULL THEN 1 END) AS jobs_with_cover_letter
FROM job_materials;

