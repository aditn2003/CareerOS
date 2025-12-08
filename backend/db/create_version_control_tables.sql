-- ======================================
-- VERSION CONTROL TABLES
-- ======================================
-- Track versions of resumes and cover letters

CREATE TABLE IF NOT EXISTS resume_versions (
    id SERIAL PRIMARY KEY,
    resume_id INTEGER NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    sections JSONB DEFAULT '{}'::jsonb,
    format VARCHAR(10) DEFAULT 'pdf',
    file_url TEXT,
    change_summary TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id),
    UNIQUE(resume_id, version_number)
);

CREATE TABLE IF NOT EXISTS cover_letter_versions (
    id SERIAL PRIMARY KEY,
    cover_letter_id INTEGER NOT NULL REFERENCES uploaded_cover_letters(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    format VARCHAR(10) DEFAULT 'pdf',
    file_url TEXT,
    change_summary TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id),
    UNIQUE(cover_letter_id, version_number)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_resume_versions_resume_id ON resume_versions(resume_id);
CREATE INDEX IF NOT EXISTS idx_resume_versions_user_id ON resume_versions(user_id);
CREATE INDEX IF NOT EXISTS idx_cover_letter_versions_cover_letter_id ON cover_letter_versions(cover_letter_id);
CREATE INDEX IF NOT EXISTS idx_cover_letter_versions_user_id ON cover_letter_versions(user_id);

