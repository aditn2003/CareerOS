-- ======================================
-- ENHANCE RESUME VERSIONS SCHEMA
-- ======================================
-- Add new columns to support comprehensive version control features:
-- - Description for detailed change notes
-- - Job linking for application tracking
-- - Default/master version flag
-- - Archiving for soft deletes
-- - Parent version tracking for lineage
-- - Tags for categorization
-- ======================================

-- Add new columns to resume_versions table
ALTER TABLE resume_versions
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS job_id INTEGER REFERENCES jobs(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS parent_version_number INTEGER,
ADD COLUMN IF NOT EXISTS tags TEXT[];

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_resume_versions_job_id ON resume_versions(job_id);
CREATE INDEX IF NOT EXISTS idx_resume_versions_is_default ON resume_versions(resume_id, is_default) WHERE is_default = TRUE;
CREATE INDEX IF NOT EXISTS idx_resume_versions_is_archived ON resume_versions(resume_id, is_archived) WHERE is_archived = FALSE;
CREATE INDEX IF NOT EXISTS idx_resume_versions_parent_version ON resume_versions(resume_id, parent_version_number);

-- Ensure only one default version per resume
CREATE UNIQUE INDEX IF NOT EXISTS idx_resume_versions_unique_default 
ON resume_versions(resume_id) 
WHERE is_default = TRUE;

-- Add comment to change_summary to clarify it's for brief summary
COMMENT ON COLUMN resume_versions.change_summary IS 'Brief summary of changes (one line)';
COMMENT ON COLUMN resume_versions.description IS 'Detailed description of changes and customization';
COMMENT ON COLUMN resume_versions.job_id IS 'Linked job application this version is tailored for';
COMMENT ON COLUMN resume_versions.is_default IS 'True if this is the master/default version';
COMMENT ON COLUMN resume_versions.is_archived IS 'True if version is archived (soft delete)';
COMMENT ON COLUMN resume_versions.parent_version_number IS 'Version number this was created from';
COMMENT ON COLUMN resume_versions.tags IS 'Array of tags for categorization (e.g., "software-engineer", "data-science")';

