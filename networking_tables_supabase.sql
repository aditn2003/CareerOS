-- ============================================================
-- NETWORKING TABLES FOR SUPABASE
-- ============================================================
-- Copy and paste this entire script into Supabase SQL Editor
-- ============================================================

-- Contacts/Relationships
CREATE TABLE IF NOT EXISTS networking_contacts (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    company TEXT,
    title TEXT,
    industry TEXT,
    linkedin_url TEXT,
    relationship_strength INT DEFAULT 1 CHECK (relationship_strength BETWEEN 1 AND 10),
    engagement_score DECIMAL(3,2) DEFAULT 0.0 CHECK (engagement_score BETWEEN 0 AND 1),
    reciprocity_score DECIMAL(3,2) DEFAULT 0.0 CHECK (reciprocity_score BETWEEN 0 AND 1),
    last_contact_date TIMESTAMP,
    next_followup_date TIMESTAMP,
    notes TEXT,
    tags TEXT[],
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Networking Activities (outreach, conversations, follow-ups)
CREATE TABLE IF NOT EXISTS networking_activities (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contact_id INT REFERENCES networking_contacts(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL CHECK (activity_type IN (
        'outreach', 'conversation', 'follow_up', 'referral_request', 
        'referral_received', 'event_meeting', 'coffee_chat', 'email', 
        'linkedin_message', 'phone_call', 'introduction'
    )),
    channel VARCHAR(50) CHECK (channel IN (
        'linkedin', 'email', 'phone', 'in_person', 'event', 'referral', 'other'
    )),
    direction VARCHAR(20) DEFAULT 'outbound' CHECK (direction IN ('inbound', 'outbound')),
    subject TEXT,
    notes TEXT,
    outcome VARCHAR(50) CHECK (outcome IN (
        'positive', 'neutral', 'negative', 'no_response', 'referral', 'opportunity'
    )),
    relationship_impact INT DEFAULT 0 CHECK (relationship_impact BETWEEN -2 AND 2),
    time_spent_minutes INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Networking Events
CREATE TABLE IF NOT EXISTS networking_events (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_name TEXT NOT NULL,
    event_type VARCHAR(50) CHECK (event_type IN (
        'conference', 'meetup', 'workshop', 'webinar', 'hackathon', 
        'networking_mixer', 'career_fair', 'alumni_event', 'other'
    )),
    organization TEXT,
    location TEXT,
    event_date DATE NOT NULL,
    duration_hours DECIMAL(4,2) DEFAULT 0,
    cost DECIMAL(10,2) DEFAULT 0,
    contacts_met INT DEFAULT 0,
    opportunities_generated INT DEFAULT 0,
    notes TEXT,
    roi_score DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Referrals Received
CREATE TABLE IF NOT EXISTS networking_referrals (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contact_id INT REFERENCES networking_contacts(id) ON DELETE CASCADE,
    job_id INT REFERENCES jobs(id) ON DELETE SET NULL,
    referral_type VARCHAR(50) CHECK (referral_type IN (
        'warm_introduction', 'direct_referral', 'recommendation', 'internal_referral'
    )),
    referrer_name TEXT,
    referrer_company TEXT,
    company_referred_to TEXT,
    position_referred_for TEXT,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN (
        'pending', 'submitted', 'interview', 'offer', 'rejected', 'accepted'
    )),
    quality_score INT DEFAULT 5 CHECK (quality_score BETWEEN 1 AND 10),
    converted_to_interview BOOLEAN DEFAULT FALSE,
    converted_to_offer BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Event-Contact Relationships (many-to-many)
CREATE TABLE IF NOT EXISTS event_contacts (
    id SERIAL PRIMARY KEY,
    event_id INT NOT NULL REFERENCES networking_events(id) ON DELETE CASCADE,
    contact_id INT NOT NULL REFERENCES networking_contacts(id) ON DELETE CASCADE,
    relationship_boost INT DEFAULT 1 CHECK (relationship_boost BETWEEN 1 AND 3),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(event_id, contact_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_networking_contacts_user_id ON networking_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_networking_activities_user_id ON networking_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_networking_activities_contact_id ON networking_activities(contact_id);
CREATE INDEX IF NOT EXISTS idx_networking_activities_type ON networking_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_networking_events_user_id ON networking_events(user_id);
CREATE INDEX IF NOT EXISTS idx_networking_referrals_user_id ON networking_referrals(user_id);
CREATE INDEX IF NOT EXISTS idx_networking_referrals_contact_id ON networking_referrals(contact_id);

-- ============================================================
-- VERIFICATION QUERY
-- ============================================================
-- Run this after creating tables to verify they exist:
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_name LIKE 'networking%'
-- ORDER BY table_name;
-- ============================================================

