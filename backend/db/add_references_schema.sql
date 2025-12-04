-- ============================================================
-- UC-095: Professional Reference Management Schema
-- ============================================================

-- 1. professional_references
-- Stores professional references with contact information
-- ============================================================
CREATE TABLE IF NOT EXISTS professional_references (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Reference Contact Information
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  linkedin_url TEXT,
  
  -- Professional Details
  title VARCHAR(255),
  company VARCHAR(255),
  relationship VARCHAR(100), -- manager, colleague, mentor, client, professor, etc.
  years_known INTEGER,
  
  -- Reference Strength & Notes
  reference_strength VARCHAR(50) DEFAULT 'strong', -- strong, moderate, weak
  key_skills_can_speak_to TEXT, -- JSON array of skills
  notable_projects TEXT, -- JSON array of project names
  reference_notes TEXT,
  
  -- Availability & Usage
  is_available BOOLEAN DEFAULT true,
  last_contacted DATE,
  times_used INTEGER DEFAULT 0,
  preferred_contact_method VARCHAR(50) DEFAULT 'email', -- email, phone, linkedin
  
  -- Reference Types
  reference_type VARCHAR(50) DEFAULT 'professional', -- professional, academic, personal, character
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_references_user ON professional_references(user_id);
CREATE INDEX idx_references_type ON professional_references(reference_type);
CREATE INDEX idx_references_available ON professional_references(is_available);

-- ============================================================
-- 2. reference_requests
-- Tracks when references are requested for specific jobs
-- ============================================================
CREATE TABLE IF NOT EXISTS reference_requests (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reference_id BIGINT NOT NULL REFERENCES professional_references(id) ON DELETE CASCADE,
  job_id BIGINT REFERENCES jobs(id) ON DELETE SET NULL,
  
  -- Request Details
  job_title VARCHAR(255),
  company VARCHAR(255),
  request_date TIMESTAMP DEFAULT NOW(),
  deadline DATE,
  
  -- Preparation Materials
  talking_points TEXT, -- JSON array of talking points
  role_specific_guidance TEXT,
  key_achievements_to_highlight TEXT, -- JSON array
  
  -- Status Tracking
  status VARCHAR(50) DEFAULT 'pending', -- pending, contacted, confirmed, completed, declined
  reference_submitted BOOLEAN DEFAULT false,
  submission_date TIMESTAMP,
  
  -- Feedback
  reference_feedback TEXT,
  quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
  
  -- Communication
  request_message TEXT,
  thank_you_sent BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ref_requests_user ON reference_requests(user_id);
CREATE INDEX idx_ref_requests_reference ON reference_requests(reference_id);
CREATE INDEX idx_ref_requests_status ON reference_requests(status);

-- ============================================================
-- 3. reference_templates
-- Templates for reference request communications
-- ============================================================
CREATE TABLE IF NOT EXISTS reference_templates (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  template_name VARCHAR(255) NOT NULL,
  template_type VARCHAR(50) NOT NULL, -- request, reminder, thank_you, update
  template_subject VARCHAR(255),
  template_body TEXT NOT NULL,
  
  is_default BOOLEAN DEFAULT false,
  use_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ref_templates_user ON reference_templates(user_id);
CREATE INDEX idx_ref_templates_type ON reference_templates(template_type);

-- ============================================================
-- 4. reference_feedback
-- Track feedback received about references
-- ============================================================
CREATE TABLE IF NOT EXISTS reference_feedback (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reference_id BIGINT NOT NULL REFERENCES professional_references(id) ON DELETE CASCADE,
  request_id BIGINT REFERENCES reference_requests(id) ON DELETE SET NULL,
  
  -- Feedback Details
  feedback_source VARCHAR(100), -- employer, recruiter, self_assessment
  feedback_date DATE DEFAULT CURRENT_DATE,
  feedback_text TEXT,
  
  -- Ratings
  overall_rating INTEGER CHECK (overall_rating >= 1 AND overall_rating <= 5),
  helpfulness_rating INTEGER CHECK (helpfulness_rating >= 1 AND helpfulness_rating <= 5),
  timeliness_rating INTEGER CHECK (timeliness_rating >= 1 AND timeliness_rating <= 5),
  
  -- Outcome
  contributed_to_offer BOOLEAN,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ref_feedback_user ON reference_feedback(user_id);
CREATE INDEX idx_ref_feedback_reference ON reference_feedback(reference_id);

-- ============================================================
-- 5. reference_reminders
-- Reminders for reference relationship maintenance
-- ============================================================
CREATE TABLE IF NOT EXISTS reference_reminders (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reference_id BIGINT NOT NULL REFERENCES professional_references(id) ON DELETE CASCADE,
  
  reminder_type VARCHAR(50) NOT NULL, -- check_in, thank_you, update, birthday, work_anniversary
  reminder_date DATE NOT NULL,
  reminder_message TEXT,
  
  is_completed BOOLEAN DEFAULT false,
  completed_date TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ref_reminders_user ON reference_reminders(user_id);
CREATE INDEX idx_ref_reminders_date ON reference_reminders(reminder_date);
CREATE INDEX idx_ref_reminders_completed ON reference_reminders(is_completed);
