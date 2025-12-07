-- ======================================
-- CLEAR ALL MATERIALS DATA
-- ======================================
-- This removes ALL data from job_materials table
-- Keeps the table structure and functionality
-- Allows you to start fresh and test
-- ======================================

-- Delete all existing data from job_materials
DELETE FROM job_materials;

-- Verify it's empty
SELECT 
    'All materials data cleared!' AS status,
    COUNT(*) AS remaining_rows
FROM job_materials;

-- ======================================
-- DONE!
-- ======================================
-- The job_materials table is now empty.
-- You can start adding materials fresh through the UI.
-- All functionality remains intact.
-- ======================================

