-- Add original_resume_id to resumes table to track version relationships
-- This allows each version to be a full resume record while maintaining the link to the original

ALTER TABLE resumes
ADD COLUMN IF NOT EXISTS original_resume_id INTEGER REFERENCES resumes(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS version_number INTEGER,
ADD COLUMN IF NOT EXISTS is_version BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_resumes_original_resume_id ON resumes(original_resume_id);
CREATE INDEX IF NOT EXISTS idx_resumes_is_version ON resumes(is_version) WHERE is_version = TRUE;

COMMENT ON COLUMN resumes.original_resume_id IS 'If this is a version, points to the original resume';
COMMENT ON COLUMN resumes.version_number IS 'Version number if this is a version';
COMMENT ON COLUMN resumes.is_version IS 'True if this resume is a version of another resume';

