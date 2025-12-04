-- ======================================
-- REFERRAL REQUEST MANAGEMENT SCHEMA
-- ======================================

-- Referral requests table
CREATE TABLE IF NOT EXISTS referral_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contact_id INTEGER NOT NULL REFERENCES professional_contacts(id) ON DELETE CASCADE,
    job_id INTEGER REFERENCES jobs(id) ON DELETE SET NULL,
    job_title VARCHAR(255) NOT NULL,
    company VARCHAR(255) NOT NULL,
    -- Status: pending, accepted, referred, rejected, withdrawn, completed
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (
        status IN (
            'pending',
            'accepted',
            'referred',
            'rejected',
            'withdrawn',
            'completed'
        )
    ),
    -- Request timing and follow-ups
    requested_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    response_date TIMESTAMP,
    referral_submitted_date TIMESTAMP,
    first_followup_date TIMESTAMP,
    second_followup_date TIMESTAMP,
    -- Request details
    referral_message TEXT,
    why_good_fit TEXT,
    industry_keywords TEXT,
    -- Relationship impact tracking
    relationship_strength_before INTEGER CHECK (relationship_strength_before BETWEEN 1 AND 5),
    relationship_strength_after INTEGER CHECK (relationship_strength_after BETWEEN 1 AND 5),
    relationship_impact VARCHAR(50) CHECK (
        relationship_impact IN (
            'positive',
            'neutral',
            'negative',
            'unknown'
        )
    ),
    -- Success tracking
    referral_outcome VARCHAR(50) CHECK (
        referral_outcome IN (
            'interview_scheduled',
            'job_offer',
            'rejected',
            'in_progress',
            'unknown'
        )
    ),
    -- Etiquette and best practices
    request_timing_score INTEGER CHECK (request_timing_score BETWEEN 1 AND 10),
    personalization_score INTEGER CHECK (personalization_score BETWEEN 1 AND 10),
    followup_score INTEGER CHECK (followup_score BETWEEN 1 AND 10),
    gratitude_expressed BOOLEAN DEFAULT FALSE,
    -- Additional tracking
    notes TEXT,
    referrer_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Referral follow-ups table (tracks individual follow-up messages)
CREATE TABLE IF NOT EXISTS referral_followups (
    id SERIAL PRIMARY KEY,
    referral_request_id INTEGER NOT NULL REFERENCES referral_requests(id) ON DELETE CASCADE,
    followup_type VARCHAR(50) NOT NULL CHECK (
        followup_type IN (
            'check_in',
            'reminder',
            'gratitude',
            'outcome_update',
            'custom'
        )
    ),
    followup_message TEXT,
    followup_date DATE NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    completed_date TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Referral templates for personalized messages
CREATE TABLE IF NOT EXISTS referral_templates (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    template_name VARCHAR(255) NOT NULL,
    template_type VARCHAR(50) NOT NULL CHECK (
        template_type IN (
            'initial_request',
            'followup',
            'gratitude',
            'rejection_handling'
        )
    ),
    template_text TEXT NOT NULL,
    industry_focus VARCHAR(255),
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, template_name)
);

-- Referral statistics and relationship health tracking
CREATE TABLE IF NOT EXISTS referral_statistics (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    total_requests INTEGER DEFAULT 0,
    successful_referrals INTEGER DEFAULT 0,
    referrals_resulted_in_interview INTEGER DEFAULT 0,
    referrals_resulted_in_offer INTEGER DEFAULT 0,
    average_response_time_days INTEGER,
    average_relationship_impact_score DECIMAL(3, 2),
    total_interviews_from_referrals INTEGER DEFAULT 0,
    total_offers_from_referrals INTEGER DEFAULT 0,
    most_helpful_industry VARCHAR(255),
    most_helpful_contact_id INTEGER REFERENCES professional_contacts(id),
    last_referral_date TIMESTAMP,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_referral_requests_user_id ON referral_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_requests_contact_id ON referral_requests(contact_id);
CREATE INDEX IF NOT EXISTS idx_referral_requests_job_id ON referral_requests(job_id);
CREATE INDEX IF NOT EXISTS idx_referral_requests_status ON referral_requests(status);
CREATE INDEX IF NOT EXISTS idx_referral_requests_requested_date ON referral_requests(requested_date);
CREATE INDEX IF NOT EXISTS idx_referral_followups_referral_request_id ON referral_followups(referral_request_id);
CREATE INDEX IF NOT EXISTS idx_referral_followups_followup_date ON referral_followups(followup_date);
CREATE INDEX IF NOT EXISTS idx_referral_templates_user_id ON referral_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_statistics_user_id ON referral_statistics(user_id);
