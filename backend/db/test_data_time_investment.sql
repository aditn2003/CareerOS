-- Synthetic Test Data for Time Investment Page (User ID 1)
-- Run this to populate test data for testing the Time Investment analytics

BEGIN;

-- ============================================
-- 1. APPLICATION HISTORY (Status Changes)
-- ============================================
-- Add status change history for existing jobs
-- Using DO block to handle potential NULL job_ids gracefully
DO $$
DECLARE
  job1_id INTEGER;
  job2_id INTEGER;
  job3_id INTEGER;
  job4_id INTEGER;
BEGIN
  -- Get job IDs
  SELECT id INTO job1_id FROM jobs WHERE user_id = 1 AND (company ILIKE '%Google%' OR company ILIKE '%google%') LIMIT 1;
  SELECT id INTO job2_id FROM jobs WHERE user_id = 1 AND (company ILIKE '%Microsoft%' OR company ILIKE '%microsoft%') LIMIT 1;
  SELECT id INTO job3_id FROM jobs WHERE user_id = 1 AND status = 'Applied' LIMIT 1;
  SELECT id INTO job4_id FROM jobs WHERE user_id = 1 AND status = 'Interested' LIMIT 1;
  
  -- Insert history only if jobs exist
  IF job1_id IS NOT NULL THEN
    INSERT INTO application_history (job_id, user_id, event, timestamp, from_status, to_status)
    VALUES
      (job1_id, 1, 'status_change', NOW() - INTERVAL '5 days', 'Applied', 'Interview'),
      (job1_id, 1, 'status_change', NOW() - INTERVAL '3 days', 'Interview', 'Offer')
    ON CONFLICT DO NOTHING;
  END IF;
  
  IF job2_id IS NOT NULL THEN
    INSERT INTO application_history (job_id, user_id, event, timestamp, from_status, to_status)
    VALUES (job2_id, 1, 'status_change', NOW() - INTERVAL '7 days', 'Applied', 'Interview')
    ON CONFLICT DO NOTHING;
  END IF;
  
  IF job3_id IS NOT NULL THEN
    INSERT INTO application_history (job_id, user_id, event, timestamp, from_status, to_status)
    VALUES (job3_id, 1, 'status_change', NOW() - INTERVAL '2 days', 'Applied', 'Rejected')
    ON CONFLICT DO NOTHING;
  END IF;
  
  IF job4_id IS NOT NULL THEN
    INSERT INTO application_history (job_id, user_id, event, timestamp, from_status, to_status)
    VALUES (job4_id, 1, 'status_change', NOW() - INTERVAL '10 days', 'Interested', 'Applied')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- ============================================
-- 2. NETWORKING ACTIVITIES
-- ============================================
INSERT INTO networking_activities (user_id, activity_type, time_spent_minutes, created_at, notes)
VALUES
  (1, 'outreach', 25, NOW() - INTERVAL '8 days', 'Reached out to recruiter at Google'),
  (1, 'linkedin_message', 15, NOW() - INTERVAL '7 days', 'Sent LinkedIn message to hiring manager'),
  (1, 'follow_up', 10, NOW() - INTERVAL '5 days', 'Follow-up email after interview'),
  (1, 'email', 20, NOW() - INTERVAL '6 days', 'Thank you email after phone screen'),
  (1, 'coffee_chat', 45, NOW() - INTERVAL '12 days', 'Coffee chat with industry contact'),
  (1, 'referral_request', 30, NOW() - INTERVAL '9 days', 'Asked for referral at Amazon'),
  (1, 'phone_call', 40, NOW() - INTERVAL '4 days', 'Informational interview call'),
  (1, 'conversation', 12, NOW() - INTERVAL '3 days', 'Connection request message')
ON CONFLICT DO NOTHING;

-- ============================================
-- 3. NETWORKING EVENTS
-- ============================================
INSERT INTO networking_events (user_id, event_name, event_type, event_date, event_start_time, event_end_time, location, is_virtual, actual_connections_made, notes)
VALUES
  (1, 'Tech Career Fair 2025', 'conference', CURRENT_DATE - INTERVAL '15 days', '09:00:00', '17:00:00', 'San Francisco, CA', false, 8, 'Met with 8 recruiters, collected business cards'),
  (1, 'Women in Tech Meetup', 'meetup', CURRENT_DATE - INTERVAL '10 days', '18:00:00', '20:30:00', 'Virtual', true, 5, 'Great networking session, made 5 new connections'),
  (1, 'AI/ML Workshop', 'workshop', CURRENT_DATE - INTERVAL '5 days', '14:00:00', '16:00:00', 'Online', true, 3, 'Learned about ML trends, connected with speakers'),
  (1, 'Startup Networking Mixer', 'networking_mixer', CURRENT_DATE - INTERVAL '20 days', '19:00:00', '22:00:00', 'Palo Alto, CA', false, 12, 'Excellent event, met founders and engineers')
ON CONFLICT DO NOTHING;

-- ============================================
-- 4. INTERVIEW OUTCOMES
-- ============================================
INSERT INTO interview_outcomes (user_id, company, role, interview_date, interview_type, duration_minutes, hours_prepared, outcome, difficulty_rating, self_rating, confidence_level, notes)
VALUES
  (1, 'Google', 'Software Engineer', CURRENT_DATE - INTERVAL '3 days', 'Technical', 60, 3, 'Offer', 4, 5, 4, 'Great interview, focused on system design'),
  (1, 'Microsoft', 'Full Stack Developer', CURRENT_DATE - INTERVAL '7 days', 'Phone Screen', 45, 2, 'Interview', 3, 4, 4, 'Went well, moving to next round'),
  (1, 'Meta', 'ML Engineer', CURRENT_DATE - INTERVAL '12 days', 'Technical', 90, 5, 'Rejected', 5, 3, 3, 'Very challenging, need more ML prep'),
  (1, 'Amazon', 'SDE II', CURRENT_DATE - INTERVAL '18 days', 'Behavioral', 60, 1, 'Interview', 2, 4, 4, 'Standard behavioral questions'),
  (1, 'Apple', 'iOS Developer', CURRENT_DATE - INTERVAL '25 days', 'Technical', 75, 4, 'Rejected', 4, 3, 3, 'Tough coding questions')
ON CONFLICT DO NOTHING;

-- ============================================
-- 5. MOCK INTERVIEW SESSIONS
-- ============================================
INSERT INTO mock_interview_sessions (user_id, company, role, interview_type, status, created_at, completed_at, overall_performance_score)
VALUES
  (1, 'Google', 'Software Engineer', 'Technical', 'completed', NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days', 85),
  (1, 'Meta', 'ML Engineer', 'System Design', 'completed', NOW() - INTERVAL '13 days', NOW() - INTERVAL '13 days', 70),
  (1, 'Amazon', 'SDE II', 'Behavioral', 'completed', NOW() - INTERVAL '19 days', NOW() - INTERVAL '19 days', 90),
  (1, 'Microsoft', 'Full Stack Developer', 'Technical', 'completed', NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days', 80)
ON CONFLICT DO NOTHING;

-- ============================================
-- 6. TECHNICAL PREP SESSIONS
-- ============================================
INSERT INTO technical_prep_sessions (user_id, company, role, prep_type, status, time_spent_seconds, created_at, completed_at)
VALUES
  (1, 'Google', 'Software Engineer', 'coding', 'completed', 7200, NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days'), -- 2 hours
  (1, 'Meta', 'ML Engineer', 'system_design', 'completed', 5400, NOW() - INTERVAL '14 days', NOW() - INTERVAL '14 days'), -- 1.5 hours
  (1, 'Amazon', 'SDE II', 'coding', 'completed', 3600, NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days'), -- 1 hour
  (1, 'Microsoft', 'Full Stack Developer', 'coding', 'completed', 4500, NOW() - INTERVAL '9 days', NOW() - INTERVAL '9 days'), -- 1.25 hours
  (1, 'Apple', 'iOS Developer', 'coding', 'completed', 6300, NOW() - INTERVAL '26 days', NOW() - INTERVAL '26 days'), -- 1.75 hours
  (1, NULL, NULL, 'coding', 'in_progress', 1800, NOW() - INTERVAL '1 day', NULL) -- 30 min ongoing
ON CONFLICT DO NOTHING;

-- ============================================
-- 7. JOB SEARCH ACTIVITIES (Manual Logging)
-- ============================================
-- First, ensure the table exists (run migration if needed)
-- Then insert test activities

INSERT INTO job_search_activities (
  user_id, activity_type, title, company, job_title, duration_minutes, 
  activity_date, start_time, end_time, energy_level, productivity_rating, notes
)
VALUES
  -- Applications
  (1, 'application', 'Applied to Google SWE', 'Google', 'Software Engineer', 45, CURRENT_DATE - INTERVAL '10 days', '14:00:00', '14:45:00', 4, 4, 'Tailored resume and cover letter'),
  (1, 'application', 'Applied to Microsoft', 'Microsoft', 'Full Stack Developer', 35, CURRENT_DATE - INTERVAL '12 days', '10:30:00', '11:05:00', 5, 5, 'Quick application, good match'),
  (1, 'application', 'Applied to Meta', 'Meta', 'ML Engineer', 60, CURRENT_DATE - INTERVAL '15 days', '16:00:00', '17:00:00', 3, 3, 'Took longer, needed to research role'),
  
  -- Resume Updates
  (1, 'resume_update', 'Updated resume for tech roles', NULL, NULL, 90, CURRENT_DATE - INTERVAL '20 days', '09:00:00', '10:30:00', 4, 4, 'Added new projects and skills'),
  (1, 'resume_update', 'Tailored resume for Google', 'Google', 'Software Engineer', 40, CURRENT_DATE - INTERVAL '11 days', '13:00:00', '13:40:00', 4, 5, 'Focused on system design experience'),
  
  -- Cover Letters
  (1, 'cover_letter', 'Wrote cover letter for Meta', 'Meta', 'ML Engineer', 50, CURRENT_DATE - INTERVAL '16 days', '15:00:00', '15:50:00', 3, 4, 'Highlighted ML projects'),
  (1, 'cover_letter', 'Cover letter for Amazon', 'Amazon', 'SDE II', 35, CURRENT_DATE - INTERVAL '19 days', '11:00:00', '11:35:00', 4, 4, 'Emphasized leadership experience'),
  
  -- Research
  (1, 'research', 'Researched Google company culture', 'Google', NULL, 30, CURRENT_DATE - INTERVAL '9 days', '12:00:00', '12:30:00', 4, 4, 'Read Glassdoor reviews, company blog'),
  (1, 'research', 'Researched Meta interview process', 'Meta', NULL, 45, CURRENT_DATE - INTERVAL '14 days', '14:00:00', '14:45:00', 5, 5, 'Studied interview questions, prep guides'),
  (1, 'research', 'Company research for Microsoft', 'Microsoft', NULL, 25, CURRENT_DATE - INTERVAL '11 days', '09:30:00', '09:55:00', 4, 4, 'Checked recent news, products'),
  
  -- Interview Prep
  (1, 'interview_prep', 'Prepared for Google technical', 'Google', 'Software Engineer', 180, CURRENT_DATE - INTERVAL '4 days', '19:00:00', '22:00:00', 5, 5, 'Practiced system design, reviewed algorithms'),
  (1, 'interview_prep', 'Mock interview prep', 'Meta', 'ML Engineer', 120, CURRENT_DATE - INTERVAL '13 days', '18:00:00', '20:00:00', 4, 4, 'Practiced ML concepts, coding problems'),
  (1, 'interview_prep', 'Behavioral prep for Amazon', 'Amazon', 'SDE II', 60, CURRENT_DATE - INTERVAL '18 days', '17:00:00', '18:00:00', 3, 4, 'Prepared STAR stories'),
  
  -- Coding Practice
  (1, 'coding_practice', 'LeetCode practice session', NULL, NULL, 90, CURRENT_DATE - INTERVAL '2 days', '20:00:00', '21:30:00', 4, 4, 'Solved 5 medium problems'),
  (1, 'coding_practice', 'System design practice', NULL, NULL, 120, CURRENT_DATE - INTERVAL '5 days', '19:00:00', '21:00:00', 5, 5, 'Designed URL shortener, chat system'),
  (1, 'coding_practice', 'Algorithm review', NULL, NULL, 60, CURRENT_DATE - INTERVAL '8 days', '20:30:00', '21:30:00', 3, 3, 'Reviewed graphs, dynamic programming'),
  
  -- Networking
  (1, 'networking', 'LinkedIn outreach campaign', NULL, NULL, 45, CURRENT_DATE - INTERVAL '6 days', '10:00:00', '10:45:00', 4, 4, 'Sent 10 connection requests with messages'),
  (1, 'networking', 'Follow-up with recruiter', 'Google', NULL, 15, CURRENT_DATE - INTERVAL '4 days', '14:00:00', '14:15:00', 4, 5, 'Thank you email after interview'),
  
  -- Skill Learning
  (1, 'skill_learning', 'Kubernetes tutorial', NULL, NULL, 120, CURRENT_DATE - INTERVAL '11 days', '15:00:00', '17:00:00', 5, 5, 'Completed Kubernetes basics course'),
  (1, 'skill_learning', 'React advanced patterns', NULL, NULL, 90, CURRENT_DATE - INTERVAL '7 days', '16:00:00', '17:30:00', 4, 4, 'Learned hooks, context patterns'),
  
  -- Portfolio Update
  (1, 'portfolio_update', 'Updated GitHub portfolio', NULL, NULL, 60, CURRENT_DATE - INTERVAL '13 days', '11:00:00', '12:00:00', 4, 4, 'Added new projects, improved READMEs'),
  
  -- Other Activities
  (1, 'other', 'Salary negotiation research', 'Google', 'Software Engineer', 30, CURRENT_DATE - INTERVAL '2 days', '13:00:00', '13:30:00', 4, 4, 'Researched market rates, negotiation tips')
ON CONFLICT DO NOTHING;

-- ============================================
-- 8. ADD MORE JOBS WITH DIFFERENT STATUSES
-- ============================================
INSERT INTO jobs (user_id, title, company, location, status, applied_on, created_at, notes)
VALUES
  (1, 'Senior Software Engineer', 'Netflix', 'Los Gatos, CA', 'Interested', NULL, NOW() - INTERVAL '5 days', 'Great company, need to research more'),
  (1, 'Backend Engineer', 'Uber', 'San Francisco, CA', 'Applied', CURRENT_DATE - INTERVAL '4 days', NOW() - INTERVAL '6 days', 'Applied through referral'),
  (1, 'Data Engineer', 'Airbnb', 'San Francisco, CA', 'Interview', CURRENT_DATE - INTERVAL '2 days', NOW() - INTERVAL '8 days', 'Phone screen scheduled'),
  (1, 'DevOps Engineer', 'Salesforce', 'San Francisco, CA', 'Rejected', CURRENT_DATE - INTERVAL '7 days', NOW() - INTERVAL '10 days', 'Not a good fit'),
  (1, 'Full Stack Engineer', 'Stripe', 'San Francisco, CA', 'Applied', CURRENT_DATE - INTERVAL '3 days', NOW() - INTERVAL '7 days', 'Excited about this role'),
  (1, 'ML Engineer', 'OpenAI', 'San Francisco, CA', 'Interested', NULL, NOW() - INTERVAL '2 days', 'Dream company, need to prepare more')
ON CONFLICT DO NOTHING;

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify the data was inserted:

-- SELECT 'Jobs' as table_name, COUNT(*) as count FROM jobs WHERE user_id = 1
-- UNION ALL
-- SELECT 'Application History', COUNT(*) FROM application_history WHERE user_id = 1
-- UNION ALL
-- SELECT 'Networking Activities', COUNT(*) FROM networking_activities WHERE user_id = 1
-- UNION ALL
-- SELECT 'Networking Events', COUNT(*) FROM networking_events WHERE user_id = 1
-- UNION ALL
-- SELECT 'Interview Outcomes', COUNT(*) FROM interview_outcomes WHERE user_id = 1
-- UNION ALL
-- SELECT 'Mock Interviews', COUNT(*) FROM mock_interview_sessions WHERE user_id = 1
-- UNION ALL
-- SELECT 'Tech Prep Sessions', COUNT(*) FROM technical_prep_sessions WHERE user_id = 1
-- UNION ALL
-- SELECT 'Manual Activities', COUNT(*) FROM job_search_activities WHERE user_id = 1;

