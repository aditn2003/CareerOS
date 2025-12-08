-- Clean, Simple Job Materials Table
-- One table, one row per job, stores current resume and cover letter

CREATE TABLE IF NOT EXISTS job_materials (
    id SERIAL PRIMARY KEY,
    job_id INTEGER NOT NULL UNIQUE REFERENCES jobs(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    resume_id INTEGER REFERENCES resumes(id) ON DELETE SET NULL,
    cover_letter_id INTEGER REFERENCES cover_letters(id) ON DELETE SET NULL,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT unique_job_materials UNIQUE(job_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_job_materials_job_id ON job_materials(job_id);
CREATE INDEX IF NOT EXISTS idx_job_materials_user_id ON job_materials(user_id);
CREATE INDEX IF NOT EXISTS idx_job_materials_resume_id ON job_materials(resume_id);
CREATE INDEX IF NOT EXISTS idx_job_materials_cover_letter_id ON job_materials(cover_letter_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_job_materials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_job_materials_updated_at
    BEFORE UPDATE ON job_materials
    FOR EACH ROW
    EXECUTE FUNCTION update_job_materials_updated_at();

