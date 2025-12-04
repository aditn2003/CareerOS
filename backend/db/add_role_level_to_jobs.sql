-- Add role_level column to jobs table
-- This allows tracking the seniority level of job postings

ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS role_level VARCHAR(50) CHECK (role_level IN ('intern', 'entry', 'junior', 'mid', 'senior', 'staff', 'principal', 'lead', 'manager', 'director', 'vp'));

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_jobs_role_level ON jobs(role_level);

