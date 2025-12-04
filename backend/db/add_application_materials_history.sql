-- Application Materials History Table
-- Tracks changes to resumes and cover letters used for each job application
-- This matches the Supabase schema

CREATE TABLE IF NOT EXISTS application_materials_history (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_id BIGINT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    
    resume_id BIGINT REFERENCES resumes(id) ON DELETE SET NULL,
    cover_letter_id BIGINT REFERENCES cover_letters(id) ON DELETE SET NULL,
    
    action TEXT NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS ix_am_hist_job_id ON application_materials_history(job_id);
CREATE INDEX IF NOT EXISTS ix_am_hist_user_id ON application_materials_history(user_id);
CREATE INDEX IF NOT EXISTS idx_application_materials_history_user_id ON application_materials_history(user_id);
CREATE INDEX IF NOT EXISTS idx_application_materials_history_job_id ON application_materials_history(job_id);
CREATE INDEX IF NOT EXISTS idx_application_materials_history_changed_at ON application_materials_history(changed_at);

