-- ============================================================
-- ADD PUBLISHED FLAG TO VERSION TABLES
-- ============================================================
-- Track which versions have been published using the publish button
-- ============================================================

-- Add is_published column to resume_versions
ALTER TABLE resume_versions
ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_resume_versions_is_published 
ON resume_versions(is_published) 
WHERE is_published = TRUE;

COMMENT ON COLUMN resume_versions.is_published IS 'Indicates if this version was published using the publish button';

-- Add is_published column to cover_letter_versions
ALTER TABLE cover_letter_versions
ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_cover_letter_versions_is_published 
ON cover_letter_versions(is_published) 
WHERE is_published = TRUE;

COMMENT ON COLUMN cover_letter_versions.is_published IS 'Indicates if this version was published using the publish button';

