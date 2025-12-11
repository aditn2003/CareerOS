-- ============================================================
-- FIX application_materials_history FOREIGN KEY CONSTRAINT
-- ============================================================
-- This script fixes the foreign key constraint on cover_letter_id
-- to reference uploaded_cover_letters instead of cover_letters
-- ============================================================

-- Drop the old foreign key constraint if it exists
ALTER TABLE application_materials_history
DROP CONSTRAINT IF EXISTS application_materials_history_cover_letter_id_fkey;

-- Add the correct foreign key constraint pointing to uploaded_cover_letters
ALTER TABLE application_materials_history
ADD CONSTRAINT application_materials_history_cover_letter_id_fkey
FOREIGN KEY (cover_letter_id)
REFERENCES uploaded_cover_letters(id)
ON DELETE SET NULL;

-- Verify the constraint
SELECT 
    conname AS constraint_name,
    conrelid::regclass AS table_name,
    confrelid::regclass AS referenced_table
FROM pg_constraint
WHERE conname = 'application_materials_history_cover_letter_id_fkey';

-- Success message
SELECT '✅ Foreign key constraint fixed! application_materials_history.cover_letter_id now references uploaded_cover_letters' AS status;

