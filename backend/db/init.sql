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
    application_history JSONB DEFAULT '[]'::jsonb,
    resume_customization VARCHAR(20) DEFAULT 'none' CHECK (resume_customization IN ('none', 'light', 'heavy', 'tailored')),
    cover_letter_customization VARCHAR(20) DEFAULT 'none' CHECK (cover_letter_customization IN ('none', 'light', 'heavy', 'tailored'))
);
-- JOBS INDEXES
CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);

-- USER GOALS TABLE (customizable performance targets)
CREATE TABLE IF NOT EXISTS user_goals (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    monthly_applications INT DEFAULT 30,
    interview_rate_target DECIMAL(3,2) DEFAULT 0.30,
    offer_rate_target DECIMAL(3,2) DEFAULT 0.05,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);


-- Contacts/Relationships
CREATE TABLE IF NOT EXISTS networking_contacts (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    company TEXT,
    title TEXT,
    industry TEXT,
    linkedin_url TEXT,
    relationship_strength INT DEFAULT 1 CHECK (relationship_strength BETWEEN 1 AND 10),
    engagement_score DECIMAL(3,2) DEFAULT 0.0 CHECK (engagement_score BETWEEN 0 AND 1),
    reciprocity_score DECIMAL(3,2) DEFAULT 0.0 CHECK (reciprocity_score BETWEEN 0 AND 1),
    last_contact_date TIMESTAMP,
    next_followup_date TIMESTAMP,
    notes TEXT,
    tags TEXT[],
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Networking Activities (outreach, conversations, follow-ups)
CREATE TABLE IF NOT EXISTS networking_activities (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contact_id INT REFERENCES networking_contacts(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL CHECK (activity_type IN (
        'outreach', 'conversation', 'follow_up', 'referral_request', 
        'referral_received', 'event_meeting', 'coffee_chat', 'email', 
        'linkedin_message', 'phone_call', 'introduction'
    )),
    channel VARCHAR(50) CHECK (channel IN (
        'linkedin', 'email', 'phone', 'in_person', 'event', 'referral', 'other'
    )),
    direction VARCHAR(20) DEFAULT 'outbound' CHECK (direction IN ('inbound', 'outbound')),
    subject TEXT,
    notes TEXT,
    outcome VARCHAR(50) CHECK (outcome IN (
        'positive', 'neutral', 'negative', 'no_response', 'referral', 'opportunity'
    )),
    relationship_impact INT DEFAULT 0 CHECK (relationship_impact BETWEEN -2 AND 2),
    time_spent_minutes INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Networking Events
CREATE TABLE IF NOT EXISTS networking_events (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_name TEXT NOT NULL,
    event_type VARCHAR(50) CHECK (event_type IN (
        'conference', 'meetup', 'workshop', 'webinar', 'hackathon', 
        'networking_mixer', 'career_fair', 'alumni_event', 'other'
    )),
    organization TEXT,
    location TEXT,
    event_date DATE NOT NULL,
    duration_hours DECIMAL(4,2) DEFAULT 0,
    cost DECIMAL(10,2) DEFAULT 0,
    contacts_met INT DEFAULT 0,
    opportunities_generated INT DEFAULT 0,
    notes TEXT,
    roi_score DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Referrals Received
CREATE TABLE IF NOT EXISTS networking_referrals (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contact_id INT REFERENCES networking_contacts(id) ON DELETE CASCADE,
    job_id INT REFERENCES jobs(id) ON DELETE SET NULL,
    referral_type VARCHAR(50) CHECK (referral_type IN (
        'warm_introduction', 'direct_referral', 'recommendation', 'internal_referral'
    )),
    referrer_name TEXT,
    referrer_company TEXT,
    company_referred_to TEXT,
    position_referred_for TEXT,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN (
        'pending', 'submitted', 'interview', 'offer', 'rejected', 'accepted'
    )),
    quality_score INT DEFAULT 5 CHECK (quality_score BETWEEN 1 AND 10),
    converted_to_interview BOOLEAN DEFAULT FALSE,
    converted_to_offer BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Event-Contact Relationships (many-to-many)
CREATE TABLE IF NOT EXISTS event_contacts (
    id SERIAL PRIMARY KEY,
    event_id INT NOT NULL REFERENCES networking_events(id) ON DELETE CASCADE,
    contact_id INT NOT NULL REFERENCES networking_contacts(id) ON DELETE CASCADE,
    relationship_boost INT DEFAULT 1 CHECK (relationship_boost BETWEEN 1 AND 3),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(event_id, contact_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_networking_contacts_user_id ON networking_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_networking_activities_user_id ON networking_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_networking_activities_contact_id ON networking_activities(contact_id);
CREATE INDEX IF NOT EXISTS idx_networking_activities_type ON networking_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_networking_events_user_id ON networking_events(user_id);
CREATE INDEX IF NOT EXISTS idx_networking_referrals_user_id ON networking_referrals(user_id);
CREATE INDEX IF NOT EXISTS idx_networking_referrals_contact_id ON networking_referrals(contact_id);
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
CREATE TABLE public.practiced_questions (
  id integer NOT NULL DEFAULT nextval('practiced_questions_id_seq'::regclass),
  user_id integer NOT NULL,
  question_id character varying NOT NULL,
  question_category character varying,
  response text,
  response_length integer DEFAULT 0,
  practiced_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT practiced_questions_pkey PRIMARY KEY (id)
);
CREATE TABLE public.profiles (
  id integer NOT NULL DEFAULT nextval('profiles_id_seq'::regclass),
  user_id integer NOT NULL,
  full_name character varying,
  email character varying,
  phone character varying,
  location character varying,
  title character varying,
  bio text,
  industry character varying,
  experience character varying,
  picture_url text,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.projects (
  id integer NOT NULL DEFAULT nextval('projects_id_seq'::regclass),
  user_id integer NOT NULL,
  name character varying NOT NULL,
  description text NOT NULL,
  role character varying NOT NULL,
  start_date date,
  end_date date,
  technologies ARRAY,
  repository_link text,
  team_size integer,
  collaboration_details text,
  outcomes text,
  industry character varying,
  project_type character varying,
  media_url text,
  status character varying DEFAULT 'Planned'::character varying CHECK (status::text = ANY (ARRAY['Completed'::character varying::text, 'Ongoing'::character varying::text, 'Planned'::character varying::text])),
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT projects_pkey PRIMARY KEY (id),
  CONSTRAINT projects_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.resume_presets (
  id integer NOT NULL DEFAULT nextval('resume_presets_id_seq'::regclass),
  user_id integer NOT NULL,
  name character varying NOT NULL,
  section_order ARRAY,
  visible_sections jsonb,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT resume_presets_pkey PRIMARY KEY (id),
  CONSTRAINT resume_presets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.resume_templates (
  id integer NOT NULL DEFAULT nextval('resume_templates_id_seq'::regclass),
  user_id integer,
  name character varying NOT NULL,
  layout_type character varying NOT NULL,
  font character varying DEFAULT 'Inter'::character varying,
  color_scheme character varying DEFAULT 'blue'::character varying,
  preview_url text,
  is_default boolean DEFAULT false,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT resume_templates_pkey PRIMARY KEY (id),
  CONSTRAINT resume_templates_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.resumes (
  id integer NOT NULL DEFAULT nextval('resumes_id_seq'::regclass),
  user_id integer,
  title character varying NOT NULL,
  template_id integer,
  sections jsonb DEFAULT '{}'::jsonb,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  format character varying DEFAULT 'pdf'::character varying,
  preview_url text,
  template_name text,
  CONSTRAINT resumes_pkey PRIMARY KEY (id),
  CONSTRAINT resumes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.section_presets (
  id integer NOT NULL DEFAULT nextval('section_presets_id_seq'::regclass),
  user_id integer NOT NULL,
  section_name character varying NOT NULL,
  preset_name character varying NOT NULL,
  section_data jsonb NOT NULL,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT section_presets_pkey PRIMARY KEY (id),
  CONSTRAINT section_presets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.skill_progress (
  id integer NOT NULL DEFAULT nextval('skill_progress_id_seq'::regclass),
  user_id integer NOT NULL,
  skill text NOT NULL,
  status text NOT NULL CHECK (status = ANY (ARRAY['not started'::text, 'in progress'::text, 'completed'::text])),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT skill_progress_pkey PRIMARY KEY (id),
  CONSTRAINT skill_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.skills (
  id integer NOT NULL DEFAULT nextval('skills_id_seq'::regclass),
  user_id integer NOT NULL,
  name character varying NOT NULL,
  category character varying NOT NULL CHECK (category::text = ANY (ARRAY['Technical'::character varying::text, 'Soft Skills'::character varying::text, 'Languages'::character varying::text, 'Industry-Specific'::character varying::text])),
  proficiency character varying NOT NULL CHECK (proficiency::text = ANY (ARRAY['Beginner'::character varying::text, 'Intermediate'::character varying::text, 'Advanced'::character varying::text, 'Expert'::character varying::text])),
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT skills_pkey PRIMARY KEY (id),
  CONSTRAINT skills_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.user_job_goals (
  id integer NOT NULL DEFAULT nextval('user_job_goals_id_seq'::regclass),
  user_id integer NOT NULL,
  goal_type character varying NOT NULL,
  target_value integer NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT user_job_goals_pkey PRIMARY KEY (id),
  CONSTRAINT user_job_goals_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.users (
  id integer NOT NULL DEFAULT nextval('users_id_seq'::regclass),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  first_name text,
  last_name text,
  provider text DEFAULT 'local'::text,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT users_pkey PRIMARY KEY (id)
);
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

ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS required_skills TEXT[];

-- ======================================
-- COVER LETTERS TABLE
-- ======================================
CREATE TABLE IF NOT EXISTS cover_letters (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    format VARCHAR(10) DEFAULT 'pdf',
    content TEXT,
    file_url TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cover_letters_user_id ON cover_letters(user_id);

-- ======================================
-- APPLICATION MATERIALS HISTORY TABLE
-- ======================================
CREATE TABLE IF NOT EXISTS application_materials_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    resume_id INTEGER REFERENCES resumes(id) ON DELETE SET NULL,
    cover_letter_id INTEGER REFERENCES cover_letters(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_application_materials_history_user_id ON application_materials_history(user_id);
CREATE INDEX IF NOT EXISTS idx_application_materials_history_job_id ON application_materials_history(job_id);

-- ======================================
-- ADD MISSING COLUMNS TO JOBS TABLE
-- ======================================
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS "applicationDate" DATE,
ADD COLUMN IF NOT EXISTS "isArchived" BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS resume_id INTEGER REFERENCES resumes(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS cover_letter_id INTEGER REFERENCES cover_letters(id) ON DELETE SET NULL;

