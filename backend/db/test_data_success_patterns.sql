-- Test data for Success Patterns analysis
-- Adds jobs with various industries, statuses, and preparation activities for user_id = 1

-- Insert jobs with different industries and statuses
INSERT INTO jobs (user_id, title, company, location, industry, status, applied_on, created_at, status_updated_at, resume_customization, cover_letter_customization)
VALUES
  -- Technology industry (various statuses)
  (1, 'Software Engineer', 'Google', 'Mountain View, CA', 'Technology', 'Interview', '2025-11-15', '2025-11-15 10:00:00', '2025-11-20 14:00:00', 'tailored', 'tailored'),
  (1, 'Frontend Developer', 'Meta', 'Menlo Park, CA', 'Technology', 'Applied', '2025-11-16', '2025-11-16 09:00:00', '2025-11-16 09:00:00', 'heavy', 'light'),
  (1, 'Backend Engineer', 'Amazon', 'Seattle, WA', 'Technology', 'Rejected', '2025-11-17', '2025-11-17 11:00:00', '2025-11-25 16:00:00', 'light', 'none'),
  (1, 'Full Stack Developer', 'Microsoft', 'Redmond, WA', 'Technology', 'Offer', '2025-11-18', '2025-11-18 08:00:00', '2025-11-28 10:00:00', 'tailored', 'tailored'),
  
  -- Finance industry
  (1, 'Software Engineer', 'Goldman Sachs', 'New York, NY', 'Finance', 'Interview', '2025-11-19', '2025-11-19 13:00:00', '2025-11-22 15:00:00', 'heavy', 'heavy'),
  (1, 'Quantitative Developer', 'JPMorgan Chase', 'New York, NY', 'Finance', 'Applied', '2025-11-20', '2025-11-20 10:00:00', '2025-11-20 10:00:00', 'light', 'light'),
  (1, 'Financial Software Engineer', 'Morgan Stanley', 'New York, NY', 'Finance', 'Rejected', '2025-11-21', '2025-11-21 14:00:00', '2025-11-30 12:00:00', 'none', 'none'),
  
  -- Healthcare industry
  (1, 'Software Engineer', 'Epic Systems', 'Madison, WI', 'Healthcare', 'Interview', '2025-11-22', '2025-11-22 09:00:00', '2025-11-25 11:00:00', 'tailored', 'tailored'),
  (1, 'Health Tech Developer', 'Cerner', 'Kansas City, MO', 'Healthcare', 'Applied', '2025-11-23', '2025-11-23 15:00:00', '2025-11-23 15:00:00', 'heavy', 'light'),
  
  -- E-commerce industry
  (1, 'Software Engineer', 'Shopify', 'Ottawa, ON', 'E-commerce', 'Offer', '2025-11-24', '2025-11-24 10:00:00', '2025-12-01 09:00:00', 'tailored', 'tailored'),
  (1, 'Backend Developer', 'Etsy', 'Brooklyn, NY', 'E-commerce', 'Interview', '2025-11-25', '2025-11-25 11:00:00', '2025-11-28 14:00:00', 'heavy', 'heavy'),
  (1, 'Full Stack Engineer', 'eBay', 'San Jose, CA', 'E-commerce', 'Rejected', '2025-11-26', '2025-11-26 12:00:00', '2025-12-05 16:00:00', 'light', 'none'),
  
  -- Consulting industry
  (1, 'Technology Consultant', 'McKinsey & Company', 'New York, NY', 'Consulting', 'Interview', '2025-11-27', '2025-11-27 13:00:00', '2025-11-30 10:00:00', 'tailored', 'tailored'),
  (1, 'Software Engineer', 'Accenture', 'Chicago, IL', 'Consulting', 'Applied', '2025-11-28', '2025-11-28 14:00:00', '2025-11-28 14:00:00', 'heavy', 'light'),
  
  -- Education industry
  (1, 'Software Engineer', 'Coursera', 'Mountain View, CA', 'Education', 'Interview', '2025-11-29', '2025-11-29 09:00:00', '2025-12-02 11:00:00', 'tailored', 'tailored'),
  (1, 'EdTech Developer', 'Khan Academy', 'Mountain View, CA', 'Education', 'Rejected', '2025-11-30', '2025-11-30 10:00:00', '2025-12-10 15:00:00', 'light', 'light')
ON CONFLICT DO NOTHING;

-- Add some company research entries
INSERT INTO company_research (company, basics, created_at)
VALUES
  ('Google', '{"founded": 1998, "employees": 150000}', '2025-11-14 10:00:00'),
  ('Meta', '{"founded": 2004, "employees": 77000}', '2025-11-15 09:00:00'),
  ('Microsoft', '{"founded": 1975, "employees": 221000}', '2025-11-17 08:00:00'),
  ('Goldman Sachs', '{"founded": 1869, "employees": 47000}', '2025-11-18 10:00:00'),
  ('Epic Systems', '{"founded": 1979, "employees": 13000}', '2025-11-21 09:00:00'),
  ('Shopify', '{"founded": 2006, "employees": 10000}', '2025-11-23 11:00:00'),
  ('McKinsey & Company', '{"founded": 1926, "employees": 38000}', '2025-11-26 10:00:00'),
  ('Coursera', '{"founded": 2012, "employees": 1000}', '2025-11-28 09:00:00')
ON CONFLICT (company) DO NOTHING;

-- Add networking activities around application dates
INSERT INTO networking_activities (user_id, activity_type, channel, direction, subject, notes, time_spent_minutes, created_at)
VALUES
  (1, 'outreach', 'linkedin', 'outbound', 'Connection request to Google engineer', 'Reached out before applying', 15, '2025-11-14 16:00:00'),
  (1, 'conversation', 'linkedin', 'inbound', 'Follow-up with Meta contact', 'Had coffee chat', 45, '2025-11-15 14:00:00'),
  (1, 'outreach', 'email', 'outbound', 'Introduction request for Microsoft', 'Asked for referral', 20, '2025-11-17 15:00:00'),
  (1, 'conversation', 'phone', 'inbound', 'Call with Goldman Sachs employee', 'Discussed role', 30, '2025-11-18 16:00:00'),
  (1, 'outreach', 'linkedin', 'outbound', 'Connection to Epic Systems recruiter', 'Networking before application', 10, '2025-11-21 17:00:00'),
  (1, 'conversation', 'linkedin', 'inbound', 'Chat with Shopify engineer', 'Discussed tech stack', 25, '2025-11-23 13:00:00'),
  (1, 'outreach', 'email', 'outbound', 'Email to McKinsey contact', 'Requested informational interview', 15, '2025-11-26 11:00:00'),
  (1, 'conversation', 'linkedin', 'inbound', 'Discussion with Coursera employee', 'Talked about role', 20, '2025-11-28 15:00:00')
ON CONFLICT DO NOTHING;

-- Add some mock interview sessions
INSERT INTO mock_interview_sessions (user_id, company, role, interview_type, status, overall_performance_score, created_at, completed_at)
VALUES
  (1, 'Google', 'Software Engineer', 'technical', 'completed', 85, '2025-11-14 18:00:00', '2025-11-14 19:00:00'),
  (1, 'Microsoft', 'Full Stack Developer', 'behavioral', 'completed', 90, '2025-11-17 19:00:00', '2025-11-17 20:00:00'),
  (1, 'Goldman Sachs', 'Software Engineer', 'technical', 'completed', 80, '2025-11-18 18:00:00', '2025-11-18 19:30:00'),
  (1, 'Shopify', 'Software Engineer', 'system_design', 'completed', 88, '2025-11-23 20:00:00', '2025-11-23 21:00:00'),
  (1, 'McKinsey & Company', 'Technology Consultant', 'case_study', 'completed', 82, '2025-11-26 19:00:00', '2025-11-26 20:00:00')
ON CONFLICT DO NOTHING;

-- Add technical prep sessions
INSERT INTO technical_prep_sessions (user_id, company, role, prep_type, status, time_spent_seconds, created_at, completed_at)
VALUES
  (1, 'Google', 'Software Engineer', 'coding', 'completed', 7200, '2025-11-14 20:00:00', '2025-11-14 22:00:00'),
  (1, 'Microsoft', 'Full Stack Developer', 'system_design', 'completed', 5400, '2025-11-17 20:00:00', '2025-11-17 21:30:00'),
  (1, 'Goldman Sachs', 'Software Engineer', 'coding', 'completed', 3600, '2025-11-18 20:00:00', '2025-11-18 21:00:00'),
  (1, 'Epic Systems', 'Software Engineer', 'coding', 'completed', 4800, '2025-11-21 20:00:00', '2025-11-21 21:20:00'),
  (1, 'Shopify', 'Software Engineer', 'system_design', 'completed', 6000, '2025-11-23 21:00:00', '2025-11-23 22:40:00'),
  (1, 'McKinsey & Company', 'Technology Consultant', 'case_study', 'completed', 4200, '2025-11-26 20:00:00', '2025-11-26 21:10:00'),
  (1, 'Coursera', 'Software Engineer', 'coding', 'completed', 3600, '2025-11-28 20:00:00', '2025-11-28 21:00:00')
ON CONFLICT DO NOTHING;

-- Add interview outcomes for some jobs (get job IDs first, then insert)
DO $$
DECLARE
  google_job_id INTEGER;
  microsoft_job_id INTEGER;
  goldman_job_id INTEGER;
  epic_job_id INTEGER;
  shopify_job_id INTEGER;
  mckinsey_job_id INTEGER;
  coursera_job_id INTEGER;
BEGIN
  -- Get job IDs
  SELECT id INTO google_job_id FROM jobs WHERE user_id = 1 AND company = 'Google' AND title = 'Software Engineer' LIMIT 1;
  SELECT id INTO microsoft_job_id FROM jobs WHERE user_id = 1 AND company = 'Microsoft' AND title = 'Full Stack Developer' LIMIT 1;
  SELECT id INTO goldman_job_id FROM jobs WHERE user_id = 1 AND company = 'Goldman Sachs' AND title = 'Software Engineer' LIMIT 1;
  SELECT id INTO epic_job_id FROM jobs WHERE user_id = 1 AND company = 'Epic Systems' AND title = 'Software Engineer' LIMIT 1;
  SELECT id INTO shopify_job_id FROM jobs WHERE user_id = 1 AND company = 'Shopify' AND title = 'Software Engineer' LIMIT 1;
  SELECT id INTO mckinsey_job_id FROM jobs WHERE user_id = 1 AND company = 'McKinsey & Company' AND title = 'Technology Consultant' LIMIT 1;
  SELECT id INTO coursera_job_id FROM jobs WHERE user_id = 1 AND company = 'Coursera' AND title = 'Software Engineer' LIMIT 1;

  -- Insert interview outcomes
  IF google_job_id IS NOT NULL THEN
    INSERT INTO interview_outcomes (user_id, job_id, company, role, interview_date, interview_type, outcome, hours_prepared, mock_interviews_completed)
    VALUES (1, google_job_id, 'Google', 'Software Engineer', '2025-11-20', 'technical', 'pending', 8, 1)
    ON CONFLICT DO NOTHING;
  END IF;

  IF microsoft_job_id IS NOT NULL THEN
    INSERT INTO interview_outcomes (user_id, job_id, company, role, interview_date, interview_type, outcome, hours_prepared, mock_interviews_completed)
    VALUES (1, microsoft_job_id, 'Microsoft', 'Full Stack Developer', '2025-11-28', 'technical', 'offer', 6, 1)
    ON CONFLICT DO NOTHING;
  END IF;

  IF goldman_job_id IS NOT NULL THEN
    INSERT INTO interview_outcomes (user_id, job_id, company, role, interview_date, interview_type, outcome, hours_prepared, mock_interviews_completed)
    VALUES (1, goldman_job_id, 'Goldman Sachs', 'Software Engineer', '2025-11-22', 'technical', 'pending', 4, 1)
    ON CONFLICT DO NOTHING;
  END IF;

  IF epic_job_id IS NOT NULL THEN
    INSERT INTO interview_outcomes (user_id, job_id, company, role, interview_date, interview_type, outcome, hours_prepared, mock_interviews_completed)
    VALUES (1, epic_job_id, 'Epic Systems', 'Software Engineer', '2025-11-25', 'technical', 'pending', 5, 0)
    ON CONFLICT DO NOTHING;
  END IF;

  IF shopify_job_id IS NOT NULL THEN
    INSERT INTO interview_outcomes (user_id, job_id, company, role, interview_date, interview_type, outcome, hours_prepared, mock_interviews_completed)
    VALUES (1, shopify_job_id, 'Shopify', 'Software Engineer', '2025-12-01', 'technical', 'offer', 7, 1)
    ON CONFLICT DO NOTHING;
  END IF;

  IF mckinsey_job_id IS NOT NULL THEN
    INSERT INTO interview_outcomes (user_id, job_id, company, role, interview_date, interview_type, outcome, hours_prepared, mock_interviews_completed)
    VALUES (1, mckinsey_job_id, 'McKinsey & Company', 'Technology Consultant', '2025-11-30', 'case_study', 'pending', 5, 1)
    ON CONFLICT DO NOTHING;
  END IF;

  IF coursera_job_id IS NOT NULL THEN
    INSERT INTO interview_outcomes (user_id, job_id, company, role, interview_date, interview_type, outcome, hours_prepared, mock_interviews_completed)
    VALUES (1, coursera_job_id, 'Coursera', 'Software Engineer', '2025-12-02', 'technical', 'pending', 4, 0)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

