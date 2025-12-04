/* ========================================================================
   UC-092: Industry Contact Discovery Schema
   
   Tables:
   1. industry_contact_suggestions - AI-generated contact suggestions
   2. contact_connection_paths - Tracks second/third-degree connections
   3. industry_leaders - Discovery of industry leaders & influencers
   4. alumni_connections - Alumni from same educational institutions
   5. event_participants - Conference speakers & event attendees
   6. contact_discovery_tracking - Track discovery success & metrics
======================================================================== */

-- ============================================================
-- 1. industry_contact_suggestions
-- Stores suggested contacts based on target companies/roles
-- ============================================================
CREATE TABLE IF NOT EXISTS industry_contact_suggestions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  suggested_contact_id BIGINT REFERENCES professional_contacts(id) ON DELETE SET NULL,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  title VARCHAR(255),
  company VARCHAR(255),
  industry VARCHAR(100),
  location VARCHAR(255),
  linkedin_url TEXT,
  profile_picture_url TEXT,
  expertise_areas TEXT, -- JSON array: ["AI", "Backend", "Leadership"]
  suggestion_reason VARCHAR(255), -- "target_company_match", "role_match", "industry_leader", etc.
  match_score INT CHECK (match_score >= 0 AND match_score <= 100), -- 0-100 similarity score
  mutual_interests TEXT, -- JSON array of shared interests
  diversity_category VARCHAR(100), -- women_in_tech, lgbtq, underrepresented_minorities, etc.
  action_status VARCHAR(50) DEFAULT 'new', -- new, contacted, connected, ignored
  action_date TIMESTAMP,
  action_notes TEXT,
  engagement_type VARCHAR(50), -- thought_leadership, warm_introduction, skill_learning, mentorship
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_industry_suggestions_user ON industry_contact_suggestions(user_id);
CREATE INDEX idx_industry_suggestions_status ON industry_contact_suggestions(action_status);
CREATE INDEX idx_industry_suggestions_score ON industry_contact_suggestions(match_score DESC);

-- ============================================================
-- 2. contact_connection_paths
-- Tracks second and third-degree connections for warm introductions
-- ============================================================
CREATE TABLE IF NOT EXISTS contact_connection_paths (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_contact_id BIGINT REFERENCES professional_contacts(id) ON DELETE SET NULL,
  target_contact_name VARCHAR(255), -- Name of target contact
  target_company VARCHAR(255), -- Company of target contact
  mutual_contact_name VARCHAR(255), -- Name of mutual connection who can introduce
  intermediate_contact_1_id BIGINT REFERENCES professional_contacts(id) ON DELETE SET NULL, -- 2nd degree connection
  intermediate_contact_2_id BIGINT REFERENCES professional_contacts(id) ON DELETE SET NULL, -- 3rd degree connection
  connection_degree INT CHECK (connection_degree IN (1, 2, 3)), -- 1=direct, 2=second, 3=third
  relationship_strength INT CHECK (relationship_strength >= 1 AND relationship_strength <= 5), -- 1-5 scale
  introduction_suggested BOOLEAN DEFAULT FALSE,
  introduction_message TEXT, -- Template for warm introduction
  introduction_sent BOOLEAN DEFAULT FALSE,
  introduction_sent_date TIMESTAMP,
  response_received BOOLEAN DEFAULT FALSE,
  response_date TIMESTAMP,
  response_message TEXT,
  outcome VARCHAR(50), -- connected, declined, pending, etc.
  outreach_status VARCHAR(50) DEFAULT 'new', -- new, contacted, connected
  outreach_date TIMESTAMP,
  outreach_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_connection_paths_user ON contact_connection_paths(user_id);
CREATE INDEX idx_connection_paths_target ON contact_connection_paths(target_contact_id);
CREATE INDEX idx_connection_paths_degree ON contact_connection_paths(connection_degree);

-- ============================================================
-- 3. industry_leaders
-- Stores discovered industry leaders and influencers
-- ============================================================
CREATE TABLE IF NOT EXISTS industry_leaders (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  title VARCHAR(255),
  company VARCHAR(255),
  industry VARCHAR(100),
  expertise_areas TEXT, -- JSON array
  linkedin_url TEXT,
  twitter_url TEXT,
  company_website TEXT,
  influence_score INT CHECK (influence_score >= 0 AND influence_score <= 100), -- Based on followers, publications, etc.
  follower_count INT,
  publication_count INT,
  speaker_count INT,
  bio TEXT,
  thought_leadership_focus TEXT, -- JSON array: ["AI", "Leadership", "Startups"]
  engagement_type VARCHAR(50), -- follow, connect, engage_content, attend_talk
  engagement_status VARCHAR(50) DEFAULT 'new', -- new, following, engaged, contacted
  engagement_date TIMESTAMP,
  engagement_notes TEXT,
  is_mentor_candidate BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_industry_leaders_user ON industry_leaders(user_id);
CREATE INDEX idx_industry_leaders_influence ON industry_leaders(influence_score DESC);
CREATE INDEX idx_industry_leaders_engagement ON industry_leaders(engagement_status);

-- ============================================================
-- 4. alumni_connections
-- Discovers connections from the same educational institutions
-- ============================================================
CREATE TABLE IF NOT EXISTS alumni_connections (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  alumni_contact_id BIGINT REFERENCES professional_contacts(id) ON DELETE SET NULL,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  title VARCHAR(255),
  company VARCHAR(255),
  industry VARCHAR(100),
  location VARCHAR(255),
  linkedin_url TEXT,
  education_institution VARCHAR(255), -- School/University name
  graduation_year INT,
  degree_type VARCHAR(100), -- Bachelor, Master, PhD, etc.
  field_of_study VARCHAR(255),
  shared_classes TEXT, -- JSON array of classes or programs
  graduation_year_gap INT, -- Difference from user's graduation year
  current_position_relevance VARCHAR(255), -- Match to user's target role
  connection_strength VARCHAR(50), -- high, medium, low based on overlap
  outreach_status VARCHAR(50) DEFAULT 'new', -- new, reached_out, connected, scheduled_call
  outreach_date TIMESTAMP,
  outreach_message TEXT,
  response_received BOOLEAN DEFAULT FALSE,
  response_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_alumni_user ON alumni_connections(user_id);
CREATE INDEX idx_alumni_institution ON alumni_connections(education_institution);
CREATE INDEX idx_alumni_status ON alumni_connections(outreach_status);

-- ============================================================
-- 5. event_participants
-- Tracks conference speakers and industry event participants
-- ============================================================
CREATE TABLE IF NOT EXISTS event_participants (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  participant_contact_id BIGINT REFERENCES professional_contacts(id) ON DELETE SET NULL,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  title VARCHAR(255),
  company VARCHAR(255),
  industry VARCHAR(100),
  linkedin_url TEXT,
  event_name VARCHAR(255),
  event_date DATE,
  event_type VARCHAR(50), -- conference, webinar, meetup, summit, workshop
  event_location VARCHAR(255),
  speaker_topic VARCHAR(255), -- If they're a speaker
  is_speaker BOOLEAN DEFAULT FALSE,
  is_attendee BOOLEAN DEFAULT FALSE,
  shared_interests TEXT, -- JSON array of interests from event
  presentation_video_url TEXT,
  presentation_slides_url TEXT,
  connection_relevance VARCHAR(255),
  outreach_status VARCHAR(50) DEFAULT 'new', -- new, contacted, connected, scheduled_call
  outreach_template VARCHAR(50), -- speaker_thank_you, attendee_follow_up, topic_discussion
  outreach_date TIMESTAMP,
  outreach_message TEXT,
  response_received BOOLEAN DEFAULT FALSE,
  response_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_event_participants_user ON event_participants(user_id);
CREATE INDEX idx_event_participants_event ON event_participants(event_name);
CREATE INDEX idx_event_participants_status ON event_participants(outreach_status);

-- ============================================================
-- 6. contact_discovery_tracking
-- Tracks success metrics and effectiveness of discovery
-- ============================================================
CREATE TABLE IF NOT EXISTS contact_discovery_tracking (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  discovery_method VARCHAR(50), -- suggestions, alumni, event, leader, connection_path
  total_discovered INT DEFAULT 0,
  total_contacted INT DEFAULT 0,
  total_responses INT DEFAULT 0,
  total_connected INT DEFAULT 0,
  total_meetings_scheduled INT DEFAULT 0,
  conversion_rate DECIMAL(5, 2), -- % of contacted that responded
  response_time_avg_days INT, -- Average days to response
  source_effectiveness VARCHAR(50), -- high, medium, low effectiveness
  most_effective_source VARCHAR(50), -- Which discovery method works best
  diversity_connections_made INT DEFAULT 0,
  thought_leadership_engagements INT DEFAULT 0,
  warm_introductions_made INT DEFAULT 0,
  networking_opportunities_identified INT DEFAULT 0,
  success_stories TEXT, -- JSON array of successful outcomes
  insights_generated TEXT, -- JSON array of lessons learned
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_discovery_tracking_user ON contact_discovery_tracking(user_id);
CREATE INDEX idx_discovery_tracking_method ON contact_discovery_tracking(discovery_method);

-- ============================================================
-- 7. relationship_reminders (UC-093)
-- Stores relationship maintenance reminders
-- ============================================================
CREATE TABLE IF NOT EXISTS relationship_reminders (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contact_name VARCHAR(255) NOT NULL,
  contact_company VARCHAR(255),
  reminder_type VARCHAR(50), -- check_in, follow_up, congratulations, birthday, anniversary, custom
  reminder_date DATE NOT NULL,
  custom_message TEXT,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_relationship_reminders_user ON relationship_reminders(user_id);
CREATE INDEX idx_relationship_reminders_date ON relationship_reminders(reminder_date);
CREATE INDEX idx_relationship_reminders_completed ON relationship_reminders(is_completed);
