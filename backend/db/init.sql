-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.application_history (
  id integer NOT NULL DEFAULT nextval('application_history_id_seq'::regclass),
  job_id integer,
  event text,
  timestamp timestamp without time zone DEFAULT now(),
  user_id integer,
  from_status text,
  to_status text,
  meta jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT application_history_pkey PRIMARY KEY (id),
  CONSTRAINT application_history_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id)
);
CREATE TABLE public.application_materials (
  id bigint NOT NULL DEFAULT nextval('application_materials_id_seq'::regclass),
  user_id bigint NOT NULL,
  job_id bigint NOT NULL,
  resume_id bigint,
  cover_letter_id bigint,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT application_materials_pkey PRIMARY KEY (id),
  CONSTRAINT application_materials_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id),
  CONSTRAINT application_materials_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.application_materials_history (
  id bigint NOT NULL DEFAULT nextval('application_materials_history_id_seq'::regclass),
  user_id bigint NOT NULL,
  job_id bigint NOT NULL,
  resume_id bigint,
  cover_letter_id bigint,
  action text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  changed_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT application_materials_history_pkey PRIMARY KEY (id),
  CONSTRAINT application_materials_history_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id),
  CONSTRAINT application_materials_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.certifications (
  id integer NOT NULL DEFAULT nextval('certifications_id_seq'::regclass),
  user_id integer NOT NULL,
  name character varying NOT NULL,
  organization character varying NOT NULL,
  category character varying,
  cert_number character varying,
  date_earned date NOT NULL,
  expiration_date date,
  does_not_expire boolean DEFAULT false,
  document_url text,
  verified boolean DEFAULT false,
  renewal_reminder date,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT certifications_pkey PRIMARY KEY (id),
  CONSTRAINT certifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.companies (
  id integer NOT NULL DEFAULT nextval('companies_id_seq'::regclass),
  name character varying NOT NULL UNIQUE,
  size character varying,
  industry character varying,
  location character varying,
  website text,
  description text,
  mission text,
  news text,
  glassdoor_rating numeric,
  contact_email character varying,
  contact_phone character varying,
  logo_url text,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT companies_pkey PRIMARY KEY (id)
);
CREATE TABLE public.company_research (
  id integer NOT NULL DEFAULT nextval('company_research_id_seq'::regclass),
  company character varying NOT NULL UNIQUE,
  basics jsonb,
  mission_values_culture jsonb,
  executives jsonb,
  products_services jsonb,
  competitive_landscape jsonb,
  summary text,
  news jsonb,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT company_research_pkey PRIMARY KEY (id)
);
CREATE TABLE public.cover_letter_templates (
  id integer NOT NULL DEFAULT nextval('cover_letter_templates_id_seq'::regclass),
  user_id integer,
  name character varying NOT NULL,
  industry character varying,
  category character varying,
  content text NOT NULL,
  is_custom boolean DEFAULT false,
  view_count integer DEFAULT 0,
  use_count integer DEFAULT 0,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT cover_letter_templates_pkey PRIMARY KEY (id),
  CONSTRAINT cover_letter_templates_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.cover_letters (
  id integer NOT NULL DEFAULT nextval('cover_letters_id_seq'::regclass),
  user_id integer,
  name character varying NOT NULL,
  industry character varying,
  category character varying,
  content text NOT NULL,
  is_custom boolean DEFAULT false,
  view_count integer DEFAULT 0,
  use_count integer DEFAULT 0,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT cover_letters_pkey PRIMARY KEY (id),
  CONSTRAINT cover_letters_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.education (
  id integer NOT NULL DEFAULT nextval('education_id_seq'::regclass),
  user_id integer NOT NULL,
  institution character varying NOT NULL,
  degree_type character varying NOT NULL,
  field_of_study character varying NOT NULL,
  graduation_date date,
  currently_enrolled boolean DEFAULT false,
  education_level character varying,
  gpa numeric,
  gpa_private boolean DEFAULT false,
  honors text,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT education_pkey PRIMARY KEY (id),
  CONSTRAINT education_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.employment (
  id integer NOT NULL DEFAULT nextval('employment_id_seq'::regclass),
  user_id integer NOT NULL,
  title character varying NOT NULL,
  company character varying NOT NULL,
  location character varying,
  start_date date NOT NULL,
  end_date date,
  current boolean DEFAULT false,
  description text CHECK (char_length(description) <= 1000),
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT employment_pkey PRIMARY KEY (id),
  CONSTRAINT employment_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.industry_benchmarks (
  id integer NOT NULL DEFAULT nextval('industry_benchmarks_id_seq'::regclass),
  industry character varying NOT NULL,
  metric_name character varying NOT NULL,
  metric_value numeric NOT NULL,
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT industry_benchmarks_pkey PRIMARY KEY (id)
);
CREATE TABLE public.job_descriptions (
  id integer NOT NULL DEFAULT nextval('job_descriptions_id_seq'::regclass),
  user_id integer NOT NULL,
  content text NOT NULL,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT job_descriptions_pkey PRIMARY KEY (id),
  CONSTRAINT job_descriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.job_material_history (
  id integer NOT NULL DEFAULT nextval('job_material_history_id_seq'::regclass),
  job_id integer,
  resume_id integer,
  cover_letter_id integer,
  changed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT job_material_history_pkey PRIMARY KEY (id),
  CONSTRAINT job_material_history_cover_letter_id_fkey FOREIGN KEY (cover_letter_id) REFERENCES public.cover_letter_templates(id),
  CONSTRAINT job_material_history_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id),
  CONSTRAINT job_material_history_resume_id_fkey FOREIGN KEY (resume_id) REFERENCES public.resumes(id)
);
CREATE TABLE public.jobs (
  id integer NOT NULL DEFAULT nextval('jobs_id_seq'::regclass),
  user_id integer NOT NULL,
  title text NOT NULL,
  company text NOT NULL,
  location text,
  salary_min integer,
  salary_max integer,
  url text,
  deadline date,
  description text,
  industry text,
  type text,
  status character varying DEFAULT 'Interested'::character varying,
  status_updated_at timestamp without time zone DEFAULT now(),
  created_at timestamp without time zone DEFAULT now(),
  notes text,
  contact_name text,
  contact_email text,
  contact_phone text,
  salary_notes text,
  interview_notes text,
  application_history jsonb DEFAULT '[]'::jsonb,
  is_archived boolean NOT NULL DEFAULT false,
  isarchived boolean DEFAULT false,
  application_date date,
  applicationDate date,
  offerdate date,
  offerDate date,
  required_skills ARRAY DEFAULT '{}'::text[],
  applied_on date,
  resume_id bigint,
  cover_letter_id bigint,
  isArchived boolean DEFAULT false,
  archiveReason text,
  application_status text,
  response_date timestamp with time zone,
  interview_date timestamp with time zone,
  offer_date timestamp with time zone,
  source text,
  first_response_date timestamp without time zone,
  rejection_date timestamp without time zone,
  target_response_days integer DEFAULT 14,
  CONSTRAINT jobs_pkey PRIMARY KEY (id),
  CONSTRAINT jobs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.match_history (
  id integer NOT NULL DEFAULT nextval('match_history_id_seq'::regclass),
  user_id integer NOT NULL,
  job_id integer NOT NULL,
  match_score integer NOT NULL,
  skills_score integer,
  experience_score integer,
  education_score integer,
  strengths text,
  gaps text,
  improvements text,
  weights jsonb,
  details jsonb,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT match_history_pkey PRIMARY KEY (id)
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