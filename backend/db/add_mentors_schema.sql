-- ======================================
-- UC-091: Mentor and Career Coach Integration Schema
-- ======================================

-- Drop existing tables if they exist (in reverse dependency order)
DROP TABLE IF EXISTS mentor_notes CASCADE;
DROP TABLE IF EXISTS mentor_recommendations CASCADE;
DROP TABLE IF EXISTS mentor_feedback CASCADE;
DROP TABLE IF EXISTS mentor_relationships CASCADE;
DROP TABLE IF EXISTS mentors CASCADE;

-- ======================================
-- Mentors Table
-- ======================================
CREATE TABLE mentors (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    title VARCHAR(100),
    company VARCHAR(255),
    expertise_areas TEXT, -- comma-separated: Job Search Strategy, Resume Writing, Interview Prep, etc.
    bio TEXT,
    profile_pic_url TEXT,
    years_of_experience INTEGER,
    linkedin_url TEXT,
    availability_status VARCHAR(50) DEFAULT 'available' CHECK (
        availability_status IN ('available', 'limited', 'unavailable')
    ),
    is_career_coach BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ======================================
-- Mentor Relationships (User-Mentor Connections)
-- ======================================
CREATE TABLE mentor_relationships (
    id BIGSERIAL PRIMARY KEY,
    mentee_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mentor_id BIGINT NOT NULL REFERENCES mentors(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50) DEFAULT 'mentor' CHECK (
        relationship_type IN ('mentor', 'career_coach', 'advisor')
    ),
    status VARCHAR(50) DEFAULT 'pending' CHECK (
        status IN ('pending', 'active', 'paused', 'completed')
    ),
    invitation_sent_at TIMESTAMP,
    accepted_at TIMESTAMP,
    start_date DATE,
    end_date DATE,
    shared_materials TEXT, -- JSON: resume, cover letter, profile sections
    communication_preference VARCHAR(50) DEFAULT 'email' CHECK (
        communication_preference IN ('email', 'in_app', 'both')
    ),
    progress_sharing_enabled BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(mentee_id, mentor_id)
);

-- ======================================
-- Mentor Feedback
-- ======================================
CREATE TABLE mentor_feedback (
    id BIGSERIAL PRIMARY KEY,
    relationship_id BIGINT NOT NULL REFERENCES mentor_relationships(id) ON DELETE CASCADE,
    mentor_id BIGINT NOT NULL REFERENCES mentors(id) ON DELETE CASCADE,
    feedback_type VARCHAR(100) CHECK (
        feedback_type IN ('resume', 'cover_letter', 'interview_prep', 'job_search_strategy', 'general')
    ),
    title VARCHAR(255),
    content TEXT NOT NULL,
    priority VARCHAR(50) DEFAULT 'medium' CHECK (
        priority IN ('low', 'medium', 'high', 'critical')
    ),
    status VARCHAR(50) DEFAULT 'pending' CHECK (
        status IN ('pending', 'reviewed', 'implemented', 'discussed')
    ),
    implementation_notes TEXT,
    implementation_date TIMESTAMP,
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ======================================
-- Mentor Recommendations
-- ======================================
CREATE TABLE mentor_recommendations (
    id BIGSERIAL PRIMARY KEY,
    relationship_id BIGINT NOT NULL REFERENCES mentor_relationships(id) ON DELETE CASCADE,
    mentor_id BIGINT NOT NULL REFERENCES mentors(id) ON DELETE CASCADE,
    recommendation_type VARCHAR(100) CHECK (
        recommendation_type IN ('action_item', 'resource', 'company', 'skill', 'learning_path')
    ),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    details_json TEXT, -- JSON for flexible data: URLs, parameters, etc.
    priority VARCHAR(50) DEFAULT 'medium' CHECK (
        priority IN ('low', 'medium', 'high')
    ),
    status VARCHAR(50) DEFAULT 'pending' CHECK (
        status IN ('pending', 'in_progress', 'completed', 'dismissed')
    ),
    completion_date TIMESTAMP,
    feedback_on_implementation TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ======================================
-- Mentor Notes (Internal Mentee Progress Tracking)
-- ======================================
CREATE TABLE mentor_notes (
    id BIGSERIAL PRIMARY KEY,
    relationship_id BIGINT NOT NULL REFERENCES mentor_relationships(id) ON DELETE CASCADE,
    mentor_id BIGINT NOT NULL REFERENCES mentors(id) ON DELETE CASCADE,
    note_type VARCHAR(50) CHECK (
        note_type IN ('progress', 'observation', 'concern', 'milestone', 'reminder')
    ),
    content TEXT NOT NULL,
    visibility VARCHAR(50) DEFAULT 'private' CHECK (
        visibility IN ('private', 'shared_with_mentee')
    ),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ======================================
-- Progress Sharing Sessions
-- ======================================
CREATE TABLE mentor_progress_sharing (
    id BIGSERIAL PRIMARY KEY,
    relationship_id BIGINT NOT NULL REFERENCES mentor_relationships(id) ON DELETE CASCADE,
    mentee_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mentor_id BIGINT NOT NULL REFERENCES mentors(id) ON DELETE CASCADE,
    sharing_date DATE NOT NULL,
    summary TEXT,
    applications_submitted INTEGER DEFAULT 0,
    interviews_completed INTEGER DEFAULT 0,
    job_leads_identified INTEGER DEFAULT 0,
    skills_developed TEXT, -- comma-separated
    challenges_faced TEXT,
    wins_and_achievements TEXT,
    next_week_goals TEXT,
    mentor_response TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ======================================
-- Create Indexes for Performance
-- ======================================
CREATE INDEX IF NOT EXISTS idx_mentors_user ON mentors(user_id);
CREATE INDEX IF NOT EXISTS idx_mentor_relationships_mentee ON mentor_relationships(mentee_id);
CREATE INDEX IF NOT EXISTS idx_mentor_relationships_mentor ON mentor_relationships(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentor_relationships_status ON mentor_relationships(status);
CREATE INDEX IF NOT EXISTS idx_mentor_feedback_relationship ON mentor_feedback(relationship_id);
CREATE INDEX IF NOT EXISTS idx_mentor_feedback_mentor ON mentor_feedback(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentor_recommendations_relationship ON mentor_recommendations(relationship_id);
CREATE INDEX IF NOT EXISTS idx_mentor_recommendations_status ON mentor_recommendations(status);
CREATE INDEX IF NOT EXISTS idx_mentor_notes_relationship ON mentor_notes(relationship_id);
CREATE INDEX IF NOT EXISTS idx_mentor_progress_sharing_mentee ON mentor_progress_sharing(mentee_id);
CREATE INDEX IF NOT EXISTS idx_mentor_progress_sharing_mentor ON mentor_progress_sharing(mentor_id);
