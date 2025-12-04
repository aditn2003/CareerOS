-- New Job Application Materials Table
-- This table stores the current application materials (resume and cover letter) for each job
-- One row per job, updated when materials change

CREATE TABLE IF NOT EXISTS job_application_materials (
    id SERIAL PRIMARY KEY,
    job_id INTEGER NOT NULL UNIQUE REFERENCES jobs(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    resume_id INTEGER REFERENCES resumes(id) ON DELETE SET NULL,
    cover_letter_id INTEGER REFERENCES cover_letters(id) ON DELETE SET NULL,
    
    -- Additional metadata
    resume_customization VARCHAR(50) DEFAULT 'none',
    cover_letter_customization VARCHAR(50) DEFAULT 'none',
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Ensure one row per job
    CONSTRAINT unique_job_materials UNIQUE(job_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_job_application_materials_job_id ON job_application_materials(job_id);
CREATE INDEX IF NOT EXISTS idx_job_application_materials_user_id ON job_application_materials(user_id);
CREATE INDEX IF NOT EXISTS idx_job_application_materials_resume_id ON job_application_materials(resume_id);
CREATE INDEX IF NOT EXISTS idx_job_application_materials_cover_letter_id ON job_application_materials(cover_letter_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_job_application_materials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER trigger_update_job_application_materials_updated_at
    BEFORE UPDATE ON job_application_materials
    FOR EACH ROW
    EXECUTE FUNCTION update_job_application_materials_updated_at();

