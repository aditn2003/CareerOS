-- ======================================
-- UC-125: Multi-Platform Application Tracker
-- Add platform tracking fields to jobs table
-- ======================================

-- Add platform tracking columns to jobs table
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS platform VARCHAR(50), -- 'linkedin', 'indeed', 'glassdoor', 'company_site', 'email_import', 'manual'
ADD COLUMN IF NOT EXISTS source_url TEXT,
ADD COLUMN IF NOT EXISTS external_application_id TEXT, -- Platform-specific application ID
ADD COLUMN IF NOT EXISTS is_imported BOOLEAN DEFAULT FALSE, -- Whether imported from email/external source
ADD COLUMN IF NOT EXISTS imported_at TIMESTAMP, -- When the job was imported
ADD COLUMN IF NOT EXISTS platform_metadata JSONB DEFAULT '{}'::jsonb; -- Store platform-specific data (status, communications, etc.)

-- Add indexes for platform queries
CREATE INDEX IF NOT EXISTS idx_jobs_platform ON jobs(platform);
CREATE INDEX IF NOT EXISTS idx_jobs_is_imported ON jobs(is_imported);
CREATE INDEX IF NOT EXISTS idx_jobs_external_application_id ON jobs(external_application_id);

-- Create table to track multiple platforms for same job (consolidation)
CREATE TABLE IF NOT EXISTS job_platforms (
    id SERIAL PRIMARY KEY,
    job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL, -- 'linkedin', 'indeed', 'glassdoor', etc.
    external_application_id TEXT, -- Platform-specific ID
    source_url TEXT,
    applied_at TIMESTAMP,
    status TEXT, -- Platform-specific status
    platform_metadata JSONB DEFAULT '{}'::jsonb, -- Platform-specific communications/updates
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(job_id, platform) -- One entry per platform per job
);

CREATE INDEX IF NOT EXISTS idx_job_platforms_job_id ON job_platforms(job_id);
CREATE INDEX IF NOT EXISTS idx_job_platforms_platform ON job_platforms(platform);
