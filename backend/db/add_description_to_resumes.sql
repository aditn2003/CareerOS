-- ======================================
-- ADD description COLUMN TO resumes TABLE
-- ======================================
-- This adds a description column to the resumes table to store metadata
-- about published versions (e.g., "Published from [Title] - Version [N]")

ALTER TABLE resumes
ADD COLUMN IF NOT EXISTS description TEXT;

COMMENT ON COLUMN resumes.description IS 'Description or summary of the resume, can be used for published versions metadata.';

