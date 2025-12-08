-- ======================================
-- ADD file_url COLUMN TO resumes TABLE
-- ======================================
-- This ensures the resumes table has a file_url column for uploaded files

-- Add file_url column if it doesn't exist
ALTER TABLE resumes 
ADD COLUMN IF NOT EXISTS file_url TEXT;

-- Verification
SELECT 
    '✅ file_url column added to resumes table!' AS Status,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'resumes' AND column_name = 'file_url';

