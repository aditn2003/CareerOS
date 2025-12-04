-- ======================================
-- UC-090: Informational Interview Management Schema
-- ======================================

-- Drop existing tables if they exist (in reverse dependency order)
DROP TABLE IF EXISTS interview_insights CASCADE;
DROP TABLE IF EXISTS interview_followup CASCADE;
DROP TABLE IF EXISTS interview_preparation CASCADE;
DROP TABLE IF EXISTS informational_interviews CASCADE;
DROP TABLE IF EXISTS interview_candidates CASCADE;

-- Create interview candidates table
CREATE TABLE IF NOT EXISTS interview_candidates (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    company VARCHAR(255),
    title VARCHAR(255),
    industry VARCHAR(100),
    expertise_areas TEXT, -- comma-separated
    linkedin_url TEXT,
    source VARCHAR(100), -- how found: LinkedIn, referral, company website, networking event, etc.
    notes TEXT,
    status VARCHAR(50) DEFAULT 'identified' CHECK (
        status IN ('identified', 'contacted', 'interested', 'scheduled', 'completed', 'not_interested')
    ),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create informational interviews table
CREATE TABLE IF NOT EXISTS informational_interviews (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    candidate_id BIGINT NOT NULL REFERENCES interview_candidates(id) ON DELETE CASCADE,
    interview_type VARCHAR(50) DEFAULT 'video' CHECK (
        interview_type IN ('phone', 'video', 'coffee', 'email')
    ),
    scheduled_date TIMESTAMP,
    duration_minutes INTEGER,
    location_or_platform VARCHAR(255), -- Zoom link, coffee shop, etc.
    status VARCHAR(50) DEFAULT 'pending' CHECK (
        status IN ('pending', 'scheduled', 'completed', 'cancelled', 'rescheduled')
    ),
    key_topics TEXT, -- comma-separated: company culture, role expectations, career path, industry trends
    preparation_framework_used VARCHAR(100), -- reference to template used
    notes_before TEXT,
    notes_after TEXT,
    interviewer_insights TEXT, -- what was learned
    relationship_value VARCHAR(50) DEFAULT 'neutral' CHECK (
        relationship_value IN ('low', 'neutral', 'high', 'mentor_potential')
    ),
    opportunity_identified BOOLEAN DEFAULT FALSE,
    opportunity_description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create interview preparation table
CREATE TABLE IF NOT EXISTS interview_preparation (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    interview_id BIGINT REFERENCES informational_interviews(id) ON DELETE CASCADE,
    framework_type VARCHAR(100), -- STAR, SITUATION-CONTEXT-ACTION-RESULT, SUCCESS_STORY, QUESTION_PREP
    title VARCHAR(255),
    company_research TEXT, -- company background, products, culture
    role_research TEXT, -- role description, requirements, career path
    personal_preparation TEXT, -- questions to ask, stories to share
    conversation_starters TEXT, -- opening questions and discussion points
    industry_trends TEXT, -- industry context and insights
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create interview follow-up table
CREATE TABLE IF NOT EXISTS interview_followup (
    id BIGSERIAL PRIMARY KEY,
    interview_id BIGINT NOT NULL REFERENCES informational_interviews(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    followup_type VARCHAR(50) DEFAULT 'thank_you' CHECK (
        followup_type IN ('thank_you', 'additional_question', 'connection_request', 'opportunity_discussion', 'general_check_in')
    ),
    template_used VARCHAR(100),
    message_content TEXT,
    sent_at TIMESTAMP,
    response_received BOOLEAN DEFAULT FALSE,
    response_content TEXT,
    responded_at TIMESTAMP,
    action_items TEXT, -- comma-separated next steps from conversation
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create interview insights table for tracking outcomes
CREATE TABLE IF NOT EXISTS interview_insights (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    interview_id BIGINT REFERENCES informational_interviews(id) ON DELETE CASCADE,
    insight_type VARCHAR(255),
    title VARCHAR(255),
    description TEXT,
    impact_on_search VARCHAR(100), -- high, medium, low
    related_opportunities TEXT, -- any job opportunities identified
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_interview_candidates_user ON interview_candidates(user_id);
CREATE INDEX IF NOT EXISTS idx_interview_candidates_status ON interview_candidates(status);
CREATE INDEX IF NOT EXISTS idx_informational_interviews_user ON informational_interviews(user_id);
CREATE INDEX IF NOT EXISTS idx_informational_interviews_candidate ON informational_interviews(candidate_id);
CREATE INDEX IF NOT EXISTS idx_informational_interviews_status ON informational_interviews(status);
CREATE INDEX IF NOT EXISTS idx_interview_preparation_user ON interview_preparation(user_id);
CREATE INDEX IF NOT EXISTS idx_interview_preparation_interview ON interview_preparation(interview_id);
CREATE INDEX IF NOT EXISTS idx_interview_followup_interview ON interview_followup(interview_id);
CREATE INDEX IF NOT EXISTS idx_interview_followup_user ON interview_followup(user_id);
CREATE INDEX IF NOT EXISTS idx_interview_insights_user ON interview_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_interview_insights_interview ON interview_insights(interview_id);
