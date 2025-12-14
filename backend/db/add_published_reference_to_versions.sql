-- ============================================================
-- ADD PUBLISHED DOCUMENT REFERENCES TO VERSION TABLES
-- ============================================================
-- Track which published standalone document came from each version
-- ============================================================

-- Add published_resume_id to resume_versions (references the published standalone resume)
ALTER TABLE resume_versions
ADD COLUMN IF NOT EXISTS published_resume_id INTEGER REFERENCES resumes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_resume_versions_published_resume_id 
ON resume_versions(published_resume_id) 
WHERE published_resume_id IS NOT NULL;

COMMENT ON COLUMN resume_versions.published_resume_id IS 'Reference to the published standalone resume created from this version';

-- Add published_cover_letter_id to cover_letter_versions (references the published standalone cover letter)
ALTER TABLE cover_letter_versions
ADD COLUMN IF NOT EXISTS published_cover_letter_id INTEGER REFERENCES uploaded_cover_letters(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_cover_letter_versions_published_cl_id 
ON cover_letter_versions(published_cover_letter_id) 
WHERE published_cover_letter_id IS NOT NULL;

COMMENT ON COLUMN cover_letter_versions.published_cover_letter_id IS 'Reference to the published standalone cover letter created from this version';

