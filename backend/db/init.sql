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