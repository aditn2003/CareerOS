-- ======================================
-- UC-124: Job Application Timing Optimizer Schema
-- Stage 1: Foundation & Basic Timing Analysis
-- ======================================

-- Application Submissions Table
-- Tracks when applications are submitted and their outcomes
CREATE TABLE IF NOT EXISTS application_submissions (
    id SERIAL PRIMARY KEY,
    job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Submission timing
    submitted_at TIMESTAMP NOT NULL DEFAULT NOW(),
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0 = Sunday, 6 = Saturday
    hour_of_day INTEGER NOT NULL CHECK (hour_of_day BETWEEN 0 AND 23),
    timezone VARCHAR(50) DEFAULT 'UTC',
    
    -- Response tracking
    response_received BOOLEAN DEFAULT FALSE,
    response_date TIMESTAMP,
    response_type VARCHAR(50) CHECK (
        response_type IN ('interview', 'rejection', 'no_response', 'offer', 'phone_screen')
    ),
    
    -- Context for analysis
    industry TEXT,
    company_size VARCHAR(50), -- 'startup', 'small', 'medium', 'large', 'enterprise'
    job_type VARCHAR(50), -- 'full-time', 'part-time', 'contract', 'internship'
    is_remote BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Timing Recommendations Table
-- Stores AI-generated timing recommendations for jobs
CREATE TABLE IF NOT EXISTS timing_recommendations (
    id SERIAL PRIMARY KEY,
    job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Recommendation details
    recommended_date DATE NOT NULL,
    recommended_time TIME NOT NULL,
    recommended_timezone VARCHAR(50) DEFAULT 'UTC',
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    hour_of_day INTEGER NOT NULL CHECK (hour_of_day BETWEEN 0 AND 23),
    
    -- Recommendation quality
    confidence_score DECIMAL(3, 2) DEFAULT 0.5 CHECK (confidence_score BETWEEN 0 AND 1),
    reasoning TEXT,
    recommendation_type VARCHAR(50) DEFAULT 'optimal' CHECK (
        recommendation_type IN ('optimal', 'good', 'acceptable', 'avoid')
    ),
    
    -- Status
    status VARCHAR(50) DEFAULT 'active' CHECK (
        status IN ('active', 'used', 'expired', 'cancelled')
    ),
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_application_submissions_job_id ON application_submissions(job_id);
CREATE INDEX IF NOT EXISTS idx_application_submissions_user_id ON application_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_application_submissions_submitted_at ON application_submissions(submitted_at);
CREATE INDEX IF NOT EXISTS idx_application_submissions_day_hour ON application_submissions(day_of_week, hour_of_day);
CREATE INDEX IF NOT EXISTS idx_application_submissions_industry ON application_submissions(industry);
CREATE INDEX IF NOT EXISTS idx_application_submissions_response ON application_submissions(response_received, response_type);

CREATE INDEX IF NOT EXISTS idx_timing_recommendations_job_id ON timing_recommendations(job_id);
CREATE INDEX IF NOT EXISTS idx_timing_recommendations_user_id ON timing_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_timing_recommendations_status ON timing_recommendations(status);
CREATE INDEX IF NOT EXISTS idx_timing_recommendations_date ON timing_recommendations(recommended_date);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_timing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to auto-update updated_at
CREATE TRIGGER trigger_update_application_submissions_updated_at
    BEFORE UPDATE ON application_submissions
    FOR EACH ROW
    EXECUTE FUNCTION update_timing_updated_at();

CREATE TRIGGER trigger_update_timing_recommendations_updated_at
    BEFORE UPDATE ON timing_recommendations
    FOR EACH ROW
    EXECUTE FUNCTION update_timing_updated_at();

-- Function to extract day of week and hour from timestamp
CREATE OR REPLACE FUNCTION extract_timing_metrics(submission_time TIMESTAMP, tz VARCHAR DEFAULT 'UTC')
RETURNS TABLE(day_of_week INTEGER, hour_of_day INTEGER) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        EXTRACT(DOW FROM submission_time AT TIME ZONE tz)::INTEGER as day_of_week,
        EXTRACT(HOUR FROM submission_time AT TIME ZONE tz)::INTEGER as hour_of_day;
END;
$$ LANGUAGE plpgsql;

-- ======================================
-- Stage 3: Scheduled Submissions Table
-- ======================================

-- Scheduled Submissions Table
-- Allows users to schedule application submissions for optimal times
CREATE TABLE IF NOT EXISTS scheduled_submissions (
    id SERIAL PRIMARY KEY,
    job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Scheduled timing
    scheduled_date DATE NOT NULL,
    scheduled_time TIME NOT NULL,
    scheduled_timezone VARCHAR(50) DEFAULT 'UTC',
    
    -- Status tracking
    status VARCHAR(50) DEFAULT 'pending' CHECK (
        status IN ('pending', 'completed', 'cancelled', 'missed')
    ),
    
    -- Reminder tracking
    reminder_sent BOOLEAN DEFAULT FALSE,
    reminder_sent_at TIMESTAMP,
    
    -- Completion tracking
    completed_at TIMESTAMP,
    actual_submission_id INTEGER REFERENCES application_submissions(id) ON DELETE SET NULL,
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for scheduled submissions
CREATE INDEX IF NOT EXISTS idx_scheduled_submissions_job_id ON scheduled_submissions(job_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_submissions_user_id ON scheduled_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_submissions_status ON scheduled_submissions(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_submissions_date ON scheduled_submissions(scheduled_date, scheduled_time);
CREATE INDEX IF NOT EXISTS idx_scheduled_submissions_pending ON scheduled_submissions(user_id, status) WHERE status = 'pending';

-- Trigger to auto-update updated_at
CREATE TRIGGER trigger_update_scheduled_submissions_updated_at
    BEFORE UPDATE ON scheduled_submissions
    FOR EACH ROW
    EXECUTE FUNCTION update_timing_updated_at();

-- ======================================
-- Stage 5: A/B Testing Table
-- ======================================

-- Timing A/B Tests Table
-- Stores A/B test results comparing different timing strategies
CREATE TABLE IF NOT EXISTS timing_ab_tests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Test configuration
    test_type VARCHAR(50) NOT NULL CHECK (
        test_type IN ('day_of_week', 'time_of_day', 'day_hour_combination', 'industry_specific')
    ),
    test_name VARCHAR(255),
    description TEXT,
    
    -- Variants
    variant_a JSONB NOT NULL, -- e.g., {"day_of_week": 2, "hour_of_day": 10}
    variant_b JSONB NOT NULL,
    
    -- Results
    results_a JSONB, -- e.g., {"submissions": 10, "responses": 7, "response_rate": 0.7, "interviews": 3, "offers": 1}
    results_b JSONB,
    
    -- Statistical analysis
    statistical_significance DECIMAL(5, 4), -- p-value or confidence level
    confidence_level DECIMAL(5, 4), -- e.g., 0.95 for 95% confidence
    effect_size DECIMAL(5, 4), -- Cohen's d or similar
    winner VARCHAR(20) CHECK (winner IN ('variant_a', 'variant_b', 'inconclusive', 'pending')),
    impact_description TEXT, -- e.g., "Variant A increases response rate by 23%"
    
    -- Status
    status VARCHAR(50) DEFAULT 'active' CHECK (
        status IN ('active', 'completed', 'cancelled', 'paused')
    ),
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for A/B tests
CREATE INDEX IF NOT EXISTS idx_timing_ab_tests_user_id ON timing_ab_tests(user_id);
CREATE INDEX IF NOT EXISTS idx_timing_ab_tests_status ON timing_ab_tests(status);
CREATE INDEX IF NOT EXISTS idx_timing_ab_tests_test_type ON timing_ab_tests(test_type);
CREATE INDEX IF NOT EXISTS idx_timing_ab_tests_created_at ON timing_ab_tests(created_at);

-- Trigger to auto-update updated_at
CREATE TRIGGER trigger_update_timing_ab_tests_updated_at
    BEFORE UPDATE ON timing_ab_tests
    FOR EACH ROW
    EXECUTE FUNCTION update_timing_updated_at();

