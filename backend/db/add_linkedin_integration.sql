-- ======================================
-- LINKEDIN INTEGRATION SCHEMA
-- ======================================

-- Add LinkedIn fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS linkedin_id VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS linkedin_access_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS linkedin_refresh_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS linkedin_token_expiry TIMESTAMP;

-- Add LinkedIn profile fields to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS linkedin_url VARCHAR(500);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS linkedin_headline VARCHAR(255);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS linkedin_summary TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS linkedin_picture_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS linkedin_imported_at TIMESTAMP;

-- LinkedIn optimization tracking table
CREATE TABLE IF NOT EXISTS linkedin_optimization_tracking (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    headline_optimization_score INTEGER DEFAULT 0,
    about_section_optimization_score INTEGER DEFAULT 0,
    skills_optimization_score INTEGER DEFAULT 0,
    recommendations_score INTEGER DEFAULT 0,
    overall_optimization_score INTEGER DEFAULT 0,
    last_analyzed TIMESTAMP,
    optimization_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- LinkedIn message templates table
CREATE TABLE IF NOT EXISTS linkedin_message_templates (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    template_name VARCHAR(255) NOT NULL,
    template_type VARCHAR(50) NOT NULL CHECK (
        template_type IN (
            'connection_request',
            'first_message',
            'follow_up',
            'value_proposition',
            'interview_thank_you',
            'custom'
        )
    ),
    template_content TEXT NOT NULL,
    variables JSONB, -- Store placeholders like {first_name}, {company_name}, etc.
    is_custom BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- LinkedIn networking campaigns table
CREATE TABLE IF NOT EXISTS linkedin_campaigns (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    campaign_name VARCHAR(255) NOT NULL,
    campaign_type VARCHAR(50) NOT NULL CHECK (
        campaign_type IN (
            'outreach',
            'engagement',
            'thought_leadership',
            'job_search',
            'skill_building'
        )
    ),
    target_industry VARCHAR(100),
    target_seniority VARCHAR(50),
    description TEXT,
    status VARCHAR(50) DEFAULT 'draft' CHECK (
        status IN ('draft', 'active', 'paused', 'completed')
    ),
    start_date DATE,
    end_date DATE,
    target_connections INTEGER DEFAULT 0,
    connections_made INTEGER DEFAULT 0,
    engagement_rate DECIMAL(5, 2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- LinkedIn outreach tracking table
CREATE TABLE IF NOT EXISTS linkedin_outreach_log (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER REFERENCES linkedin_campaigns(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_name VARCHAR(255),
    recipient_title VARCHAR(255),
    recipient_company VARCHAR(255),
    recipient_linkedin_url VARCHAR(500),
    outreach_type VARCHAR(50) NOT NULL CHECK (
        outreach_type IN ('connection_request', 'message', 'interaction')
    ),
    message_template_id INTEGER REFERENCES linkedin_message_templates(id),
    custom_message TEXT,
    sent_date TIMESTAMP,
    response_received BOOLEAN DEFAULT FALSE,
    response_date TIMESTAMP,
    response_message TEXT,
    status VARCHAR(50) DEFAULT 'sent' CHECK (
        status IN ('draft', 'sent', 'viewed', 'replied', 'archived')
    ),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- LinkedIn content sharing strategy table
CREATE TABLE IF NOT EXISTS linkedin_content_strategy (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    content_frequency VARCHAR(50), -- 'daily', 'weekly', 'bi-weekly', 'monthly'
    best_posting_times TEXT, -- JSON array of times
    content_types TEXT, -- JSON array of preferred content types
    industry_focus VARCHAR(255),
    target_audience VARCHAR(255),
    key_topics TEXT, -- JSON array of topics to focus on
    visibility_goal VARCHAR(100),
    engagement_target INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_linkedin_optimization_tracking_user_id ON linkedin_optimization_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_linkedin_message_templates_user_id ON linkedin_message_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_linkedin_message_templates_type ON linkedin_message_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_linkedin_campaigns_user_id ON linkedin_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_linkedin_campaigns_status ON linkedin_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_linkedin_outreach_log_campaign_id ON linkedin_outreach_log(campaign_id);
CREATE INDEX IF NOT EXISTS idx_linkedin_outreach_log_user_id ON linkedin_outreach_log(user_id);
CREATE INDEX IF NOT EXISTS idx_linkedin_outreach_log_status ON linkedin_outreach_log(status);
CREATE INDEX IF NOT EXISTS idx_linkedin_content_strategy_user_id ON linkedin_content_strategy(user_id);
