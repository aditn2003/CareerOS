-- ======================================
-- DATABASE INITIALIZATION SCRIPT (init.sql)
-- ======================================
-- USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    provider TEXT DEFAULT 'local',
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
-- PROFILES TABLE
CREATE TABLE IF NOT EXISTS profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    full_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    location VARCHAR(255),
    title VARCHAR(255),
    bio TEXT,
    industry VARCHAR(255),
    experience VARCHAR(50),
    picture_url TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
-- EDUCATION TABLE
CREATE TABLE IF NOT EXISTS education (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    institution VARCHAR(150) NOT NULL,
    degree_type VARCHAR(100) NOT NULL,
    field_of_study VARCHAR(100) NOT NULL,
    graduation_date DATE,
    currently_enrolled BOOLEAN DEFAULT FALSE,
    education_level VARCHAR(50),
    gpa NUMERIC(3, 2),
    gpa_private BOOLEAN DEFAULT FALSE,
    honors TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
-- EMPLOYMENT TABLE
CREATE TABLE IF NOT EXISTS employment (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    company VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    start_date DATE NOT NULL,
    end_date DATE,
    current BOOLEAN DEFAULT FALSE,
    description TEXT CHECK (char_length(description) <= 1000),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);
-- PROJECTS TABLE
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    role VARCHAR(255) NOT NULL,
    start_date DATE,
    end_date DATE,
    technologies TEXT [],
    repository_link TEXT,
    team_size INTEGER,
    collaboration_details TEXT,
    outcomes TEXT,
    industry VARCHAR(100),
    project_type VARCHAR(100),
    media_url TEXT,
    status VARCHAR(50) DEFAULT 'Planned' CHECK (status IN ('Completed', 'Ongoing', 'Planned')),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
-- SKILLS TABLE
CREATE TABLE IF NOT EXISTS skills (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (
        category IN (
            'Technical',
            'Soft Skills',
            'Languages',
            'Industry-Specific'
        )
    ),
    proficiency VARCHAR(20) NOT NULL CHECK (
        proficiency IN ('Beginner', 'Intermediate', 'Advanced', 'Expert')
    ),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, name)
);
-- CERTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS certifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    organization VARCHAR(255) NOT NULL,
    category VARCHAR(255),
    cert_number VARCHAR(100),
    date_earned DATE NOT NULL,
    expiration_date DATE,
    does_not_expire BOOLEAN DEFAULT FALSE,
    document_url TEXT,
    verified BOOLEAN DEFAULT FALSE,
    renewal_reminder DATE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
-- JOBS TABLE
CREATE TABLE IF NOT EXISTS jobs (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    location TEXT,
    salary_min INT,
    salary_max INT,
    url TEXT,
    deadline DATE,
    description TEXT,
    industry TEXT,
    type TEXT,
    status VARCHAR(50) DEFAULT 'Interested',
    status_updated_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    notes TEXT,
    contact_name TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    salary_notes TEXT,
    interview_notes TEXT,
    application_history JSONB DEFAULT '[]'::jsonb
);
-- JOBS INDEXES
CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE TABLE IF NOT EXISTS companies (
CREATE TABLE IF NOT EXISTS companies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    size VARCHAR(100),
    industry VARCHAR(100),
    location VARCHAR(255),
    website TEXT,
    description TEXT,
    mission TEXT,
    news TEXT,
    glassdoor_rating DECIMAL(2, 1),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    logo_url TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
-- resume_templates table
CREATE TABLE IF NOT EXISTS resume_templates (
CREATE TABLE IF NOT EXISTS resume_templates (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    layout_type VARCHAR(50) NOT NULL,
    -- e.g. 'chronological', 'functional', 'hybrid'
    font VARCHAR(50) DEFAULT 'Inter',
    color_scheme VARCHAR(50) DEFAULT 'blue',
    preview_url TEXT,
    -- optional: screenshot or preview image
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS resumes (
CREATE TABLE IF NOT EXISTS resumes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    template_id INTEGER,
    format VARCHAR(10) DEFAULT 'pdf',
    sections JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
INSERT INTO resume_templates (
        user_id,
        name,
        layout_type,
        font,
        color_scheme,
        is_default
    )
VALUES (
        NULL,
        'Chronological',
        'chronological',
        'Inter',
        'blue',
        true
    ),
    (
        NULL,
        'Functional',
        'functional',
        'Arial',
        'green',
        false
    ),
    (
        NULL,
        'Hybrid',
        'hybrid',
        'Roboto',
        'purple',
        false
    ) ON CONFLICT DO NOTHING;


CREATE TABLE IF NOT EXISTS resume_presets (
CREATE TABLE IF NOT EXISTS resume_presets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    section_order TEXT [],
    -- e.g. ['profile', 'education', 'skills', 'projects']
    visible_sections JSONB,
    -- { "profile": true, "skills": false, ... }
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS section_presets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    section_name VARCHAR(100) NOT NULL,         -- e.g. "education", "skills"
    preset_name VARCHAR(100) NOT NULL,          -- e.g. "Short Internship Version"
    section_data JSONB NOT NULL,                -- stores the actual data (entries or object)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS job_descriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS company_research (
  id SERIAL PRIMARY KEY,
  company VARCHAR(255) UNIQUE NOT NULL,
  basics JSONB,
  mission_values_culture JSONB,
  executives JSONB,
  products_services JSONB,
  competitive_landscape JSONB,
  summary TEXT,
  news JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE resumes
ADD COLUMN IF NOT EXISTS preview_url TEXT,
ADD COLUMN IF NOT EXISTS format TEXT DEFAULT 'pdf',
ADD COLUMN IF NOT EXISTS template_name TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS "offerDate" DATE;

CREATE TABLE IF NOT EXISTS match_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  job_id INTEGER NOT NULL,
  match_score INTEGER NOT NULL,
  skills_score INTEGER,
  experience_score INTEGER,
  education_score INTEGER,
  strengths TEXT,
  gaps TEXT,
  improvements TEXT,
  weights JSONB,         -- stores personalized weighting used
  details JSONB,         -- raw AI response for future use
  created_at TIMESTAMP DEFAULT NOW()
);
-- ======================================
-- COVER LETTER TEMPLATES (UC-055)
-- ======================================

CREATE TABLE IF NOT EXISTS cover_letter_templates (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL, 
    name VARCHAR(255) NOT NULL,
    industry VARCHAR(255),
    category VARCHAR(50),
    content TEXT NOT NULL,
    is_custom BOOLEAN DEFAULT FALSE,
    view_count INTEGER DEFAULT 0,
    use_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Seed global templates (shown to EVERY user)
INSERT INTO cover_letter_templates 
    (user_id, name, industry, category, content, is_custom)
VALUES
    (
        NULL,
        'Formal Software Engineer',
        'Software Engineering',
        'Formal',
        'Dear Hiring Manager,\n\nI am writing to express my interest in the Software Engineer position at {{company}}. With {{years_experience}} years of experience in full-stack development and a strong background in {{skills}}, I am confident in my ability to contribute to your team.\n\nSincerely,\n{{your_name}}',
        FALSE
    ),
    (
        NULL,
        'Technical Cybersecurity Analyst',
        'Cybersecurity',
        'Technical',
        'Dear {{company}} Security Team,\n\nAs a cybersecurity enthusiast with hands-on experience in incident response, log analysis, and vulnerability management, I am excited to apply for the Cybersecurity Analyst role. In my recent work, I have used tools such as {{tools}} to detect and remediate threats.\n\nBest regards,\n{{your_name}}',
        FALSE
    ),
    (
        NULL,
        'Creative Marketing Cover Letter',
        'Marketing',
        'Creative',
        'Hi {{company}} Team,\n\nI am thrilled to apply for the Marketing position at {{company}}. I love telling stories with data and design, and I have led campaigns that increased engagement by {{metric}}.\n\nCheers,\n{{your_name}}',
        FALSE
    )
ON CONFLICT DO NOTHING;

ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS "offerDate" DATE;

CREATE TABLE IF NOT EXISTS match_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  job_id INTEGER NOT NULL,
  match_score INTEGER NOT NULL,
  skills_score INTEGER,
  experience_score INTEGER,
  education_score INTEGER,
  strengths TEXT,
  gaps TEXT,
  improvements TEXT,
  weights JSONB,         -- stores personalized weighting used
  details JSONB,         -- raw AI response for future use
  created_at TIMESTAMP DEFAULT NOW()
);
ALTER TABLE jobs
ADD COLUMN required_skills TEXT[];

