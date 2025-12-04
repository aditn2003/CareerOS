-- ======================================
-- NETWORKING EVENT MANAGEMENT SCHEMA
-- ======================================

-- Networking events table
CREATE TABLE IF NOT EXISTS networking_events (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_name VARCHAR(255) NOT NULL,
    event_type VARCHAR(50) NOT NULL CHECK (
        event_type IN (
            'conference',
            'meetup',
            'webinar',
            'workshop',
            'virtual',
            'social',
            'trade_show',
            'panel_discussion',
            'networking_mixer',
            'industry_event'
        )
    ),
    location VARCHAR(255),
    is_virtual BOOLEAN DEFAULT FALSE,
    -- Event dates and times
    event_date DATE NOT NULL,
    event_start_time TIME,
    event_end_time TIME,
    registration_deadline DATE,
    -- Event details
    description TEXT,
    industry VARCHAR(100),
    target_audience TEXT,
    registration_url VARCHAR(500),
    cost DECIMAL(10, 2) DEFAULT 0,
    -- Pre-event preparation
    research_status VARCHAR(50) DEFAULT 'not_started' CHECK (
        research_status IN ('not_started', 'in_progress', 'completed')
    ),
    preparation_notes TEXT,
    goal_count INTEGER DEFAULT 0,
    -- Attendance tracking
    status VARCHAR(50) NOT NULL DEFAULT 'registered' CHECK (
        status IN (
            'interested',
            'registered',
            'attended',
            'cancelled',
            'no_show'
        )
    ),
    actual_attendance_date TIMESTAMP,
    -- Relationship impact
    expected_connections INTEGER,
    actual_connections_made INTEGER DEFAULT 0,
    networking_roi_score INTEGER CHECK (networking_roi_score BETWEEN 1 AND 10),
    -- Post-event tracking
    followup_status VARCHAR(50) DEFAULT 'pending' CHECK (
        followup_status IN ('pending', 'in_progress', 'completed')
    ),
    -- Additional tracking
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Event goals table (what you want to achieve at the event)
CREATE TABLE IF NOT EXISTS event_goals (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES networking_events(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    goal_description TEXT NOT NULL,
    goal_type VARCHAR(50) NOT NULL CHECK (
        goal_type IN (
            'meet_specific_person',
            'meet_n_people',
            'learn_topic',
            'find_job_opportunity',
            'find_mentor',
            'promote_skill',
            'brand_building',
            'general_networking'
        )
    ),
    target_count INTEGER, -- for "meet_n_people" goals
    achieved BOOLEAN DEFAULT FALSE,
    achievement_date TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Event connections table (people you met at events)
CREATE TABLE IF NOT EXISTS event_connections (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES networking_events(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contact_name VARCHAR(255) NOT NULL,
    contact_title VARCHAR(255),
    contact_company VARCHAR(255),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    contact_linkedin VARCHAR(500),
    -- Relationship details
    relationship_type VARCHAR(50) CHECK (
        relationship_type IN (
            'potential_employer',
            'potential_mentor',
            'colleague',
            'client',
            'referral_source',
            'general_contact'
        )
    ),
    -- Interaction tracking
    conversation_topic TEXT,
    common_interests TEXT,
    -- Follow-up
    followup_planned BOOLEAN DEFAULT FALSE,
    followup_date DATE,
    followup_method VARCHAR(50) CHECK (
        followup_method IN ('email', 'linkedin', 'phone', 'coffee_meeting', 'other')
    ),
    followup_notes TEXT,
    -- Quality tracking
    connection_quality INTEGER CHECK (connection_quality BETWEEN 1 AND 5),
    likelihood_of_opportunity DECIMAL(3, 2) CHECK (likelihood_of_opportunity BETWEEN 0 AND 1),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Event follow-ups table (track follow-up actions)
CREATE TABLE IF NOT EXISTS event_followups (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES networking_events(id) ON DELETE CASCADE,
    connection_id INTEGER REFERENCES event_connections(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    followup_type VARCHAR(50) NOT NULL CHECK (
        followup_type IN (
            'thank_you',
            'connection_request',
            'information_request',
            'coffee_meeting',
            'job_opportunity',
            'check_in',
            'custom'
        )
    ),
    followup_message TEXT,
    scheduled_date DATE NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    completed_date TIMESTAMP,
    response_received BOOLEAN DEFAULT FALSE,
    response_date TIMESTAMP,
    response_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Networking statistics table
CREATE TABLE IF NOT EXISTS networking_statistics (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    total_events_attended INTEGER DEFAULT 0,
    total_connections_made INTEGER DEFAULT 0,
    average_connections_per_event DECIMAL(5, 2),
    total_followups_completed INTEGER DEFAULT 0,
    followup_success_rate DECIMAL(3, 2),
    events_with_outcomes INTEGER DEFAULT 0,
    job_opportunities_from_networking INTEGER DEFAULT 0,
    interviews_from_networking INTEGER DEFAULT 0,
    offers_from_networking INTEGER DEFAULT 0,
    average_networking_roi_score DECIMAL(3, 2),
    most_productive_event_type VARCHAR(50),
    most_productive_industry VARCHAR(100),
    last_event_attended TIMESTAMP,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_networking_events_user_id ON networking_events(user_id);
CREATE INDEX IF NOT EXISTS idx_networking_events_event_date ON networking_events(event_date);
CREATE INDEX IF NOT EXISTS idx_networking_events_status ON networking_events(status);
CREATE INDEX IF NOT EXISTS idx_networking_events_industry ON networking_events(industry);
CREATE INDEX IF NOT EXISTS idx_event_goals_event_id ON event_goals(event_id);
CREATE INDEX IF NOT EXISTS idx_event_goals_user_id ON event_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_event_connections_event_id ON event_connections(event_id);
CREATE INDEX IF NOT EXISTS idx_event_connections_user_id ON event_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_event_connections_followup_planned ON event_connections(followup_planned);
CREATE INDEX IF NOT EXISTS idx_event_followups_event_id ON event_followups(event_id);
CREATE INDEX IF NOT EXISTS idx_event_followups_connection_id ON event_followups(connection_id);
CREATE INDEX IF NOT EXISTS idx_event_followups_scheduled_date ON event_followups(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_networking_statistics_user_id ON networking_statistics(user_id);
