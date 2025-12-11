-- ======================================
-- APPLICATION QUALITY SCORES TABLE
-- UC-122: Application Package Quality Scoring
-- ======================================
-- This table stores AI-powered quality scores for job application packages
-- (resume, cover letter, LinkedIn profile) with detailed breakdowns and suggestions

CREATE TABLE IF NOT EXISTS application_quality_scores (
    id SERIAL PRIMARY KEY,
    job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Score Components (0-100)
    overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
    resume_score INTEGER NOT NULL CHECK (resume_score >= 0 AND resume_score <= 100),
    cover_letter_score INTEGER NOT NULL CHECK (cover_letter_score >= 0 AND cover_letter_score <= 100),
    linkedin_score INTEGER, -- Optional, nullable if LinkedIn not provided
    
    -- Detailed Breakdown (JSONB for flexible structure)
    score_breakdown JSONB NOT NULL DEFAULT '{}', -- Stores detailed analysis
    missing_keywords TEXT[] DEFAULT '{}', -- Keywords from JD not found
    missing_skills TEXT[] DEFAULT '{}', -- Skills from JD not found
    formatting_issues JSONB DEFAULT '[]', -- Formatting/typo issues
    inconsistencies JSONB DEFAULT '[]', -- Cross-material inconsistencies
    
    -- Improvement Suggestions (JSONB)
    improvement_suggestions JSONB NOT NULL DEFAULT '[]', -- Array of {priority, category, suggestion, impact, estimated_score_improvement}
    
    -- Comparison Metrics
    user_average_score DECIMAL(5,2), -- User's average across all applications
    top_performer_score DECIMAL(5,2), -- Top score in user's history
    
    -- Status
    meets_threshold BOOLEAN NOT NULL DEFAULT false, -- Whether score >= minimum_threshold
    minimum_threshold INTEGER NOT NULL DEFAULT 70, -- Configurable threshold
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Ensure one score per job (can be updated)
    CONSTRAINT unique_job_quality_score UNIQUE(job_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_quality_scores_job_id ON application_quality_scores(job_id);
CREATE INDEX IF NOT EXISTS idx_quality_scores_user_id ON application_quality_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_quality_scores_created_at ON application_quality_scores(created_at);
CREATE INDEX IF NOT EXISTS idx_quality_scores_overall_score ON application_quality_scores(overall_score);

-- ======================================
-- SCORE HISTORY TABLE
-- ======================================
-- Tracks score changes over time as user implements suggestions

CREATE TABLE IF NOT EXISTS application_quality_score_history (
    id SERIAL PRIMARY KEY,
    job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    overall_score INTEGER NOT NULL,
    resume_score INTEGER NOT NULL,
    cover_letter_score INTEGER NOT NULL,
    score_breakdown JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_score_history_job_id ON application_quality_score_history(job_id);
CREATE INDEX IF NOT EXISTS idx_score_history_user_id ON application_quality_score_history(user_id);
CREATE INDEX IF NOT EXISTS idx_score_history_created_at ON application_quality_score_history(created_at);

-- ======================================
-- AUTO-UPDATE TRIGGER
-- ======================================

CREATE OR REPLACE FUNCTION update_quality_scores_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_quality_scores_updated_at
    BEFORE UPDATE ON application_quality_scores
    FOR EACH ROW
    EXECUTE FUNCTION update_quality_scores_updated_at();

