-- ======================================
-- UC-118: Smart Follow-Up Reminder System Schema
-- ======================================

-- Follow-up Reminders Table
-- Tracks follow-up reminders for job applications
CREATE TABLE IF NOT EXISTS followup_reminders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  
  -- Reminder details
  reminder_type VARCHAR(50) NOT NULL CHECK (reminder_type IN (
    'application_followup',      -- 1 week after application
    'interview_followup',        -- 3 days after interview
    'post_interview_thank_you',  -- Same day after interview
    'offer_response',            -- Reminder to respond to offer
    'status_check',              -- General status check
    'custom'                     -- User-defined reminder
  )),
  
  -- Timing
  suggested_date DATE NOT NULL,  -- When the follow-up should ideally happen
  scheduled_date DATE NOT NULL,   -- When the reminder is scheduled
  due_date TIMESTAMP NOT NULL,    -- Exact due date/time for the reminder
  
  -- Status tracking
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN (
    'pending',      -- Not yet due
    'due',          -- Currently due
    'snoozed',      -- User snoozed it
    'completed',    -- User completed the follow-up
    'dismissed',    -- User dismissed it
    'cancelled'     -- Auto-cancelled (e.g., job rejected)
  )),
  
  -- Email template
  email_template TEXT,            -- Generated email template
  email_subject VARCHAR(255),    -- Email subject line
  email_sent BOOLEAN DEFAULT FALSE,
  email_sent_at TIMESTAMP,
  
  -- Response tracking
  response_received BOOLEAN DEFAULT FALSE,
  response_date TIMESTAMP,
  response_type VARCHAR(50) CHECK (response_type IN (
    'positive', 'negative', 'neutral', 'no_response'
  )),
  
  -- Company responsiveness tracking
  company_responsiveness_score DECIMAL(3,2) DEFAULT 0.5 CHECK (
    company_responsiveness_score BETWEEN 0 AND 1
  ), -- 0 = unresponsive, 1 = very responsive
  
  -- Snooze/dismiss tracking
  snooze_count INTEGER DEFAULT 0,
  snoozed_until TIMESTAMP,
  dismissed_at TIMESTAMP,
  completed_at TIMESTAMP,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Notes
  notes TEXT,
  user_notes TEXT -- User's notes about the follow-up
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_followup_reminders_user_id ON followup_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_followup_reminders_job_id ON followup_reminders(job_id);
CREATE INDEX IF NOT EXISTS idx_followup_reminders_due_date ON followup_reminders(due_date);
CREATE INDEX IF NOT EXISTS idx_followup_reminders_status ON followup_reminders(status);
CREATE INDEX IF NOT EXISTS idx_followup_reminders_scheduled_date ON followup_reminders(scheduled_date);

-- Follow-up History Table
-- Tracks completed follow-ups and their outcomes
CREATE TABLE IF NOT EXISTS followup_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  reminder_id INTEGER REFERENCES followup_reminders(id) ON DELETE SET NULL,
  
  -- Follow-up details
  followup_type VARCHAR(50) NOT NULL,
  followup_date TIMESTAMP NOT NULL,
  followup_method VARCHAR(50) CHECK (followup_method IN (
    'email', 'phone', 'linkedin', 'in_person', 'other'
  )),
  
  -- Content
  message_sent TEXT,
  subject_line VARCHAR(255),
  
  -- Response
  response_received BOOLEAN DEFAULT FALSE,
  response_date TIMESTAMP,
  response_content TEXT,
  response_type VARCHAR(50),
  
  -- Outcome
  outcome VARCHAR(50) CHECK (outcome IN (
    'positive', 'negative', 'neutral', 'no_response', 'status_update'
  )),
  status_change VARCHAR(50), -- If follow-up led to status change
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_followup_history_user_id ON followup_history(user_id);
CREATE INDEX IF NOT EXISTS idx_followup_history_job_id ON followup_history(job_id);
CREATE INDEX IF NOT EXISTS idx_followup_history_followup_date ON followup_history(followup_date);

-- Follow-up Etiquette Tips Table
-- Stores best practices and tips for follow-ups
CREATE TABLE IF NOT EXISTS followup_etiquette_tips (
  id SERIAL PRIMARY KEY,
  reminder_type VARCHAR(50) NOT NULL,
  tip_title VARCHAR(255) NOT NULL,
  tip_content TEXT NOT NULL,
  tip_category VARCHAR(50) CHECK (tip_category IN (
    'timing', 'tone', 'content', 'frequency', 'best_practice'
  )),
  priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert default etiquette tips
INSERT INTO followup_etiquette_tips (reminder_type, tip_title, tip_content, tip_category, priority) VALUES
  ('application_followup', 'Wait One Week', 'Wait at least one week after submitting your application before following up. This shows respect for the hiring process.', 'timing', 10),
  ('application_followup', 'Keep It Brief', 'Keep your follow-up email concise and professional. One paragraph is usually sufficient.', 'content', 9),
  ('interview_followup', 'Send Within 24 Hours', 'Send a thank-you note within 24 hours of your interview to show enthusiasm and professionalism.', 'timing', 10),
  ('interview_followup', 'Personalize Your Message', 'Reference specific points from your conversation to show you were engaged and listening.', 'content', 9),
  ('post_interview_thank_you', 'Thank Each Interviewer', 'If you met with multiple people, send individual thank-you notes to each interviewer.', 'best_practice', 10),
  ('post_interview_thank_you', 'Reiterate Your Interest', 'Use the thank-you note as an opportunity to reiterate your interest in the role and company.', 'content', 8),
  ('status_check', 'Be Patient', 'Avoid checking in too frequently. Wait at least 2 weeks between status check emails.', 'frequency', 9),
  ('status_check', 'Show Continued Interest', 'Express continued interest in the position while being respectful of their timeline.', 'tone', 8),
  ('offer_response', 'Respond Promptly', 'Respond to job offers within the timeframe given, typically 1-2 weeks.', 'timing', 10),
  ('offer_response', 'Ask for Extension if Needed', 'If you need more time, politely ask for an extension rather than letting the deadline pass.', 'best_practice', 9)
ON CONFLICT DO NOTHING;

