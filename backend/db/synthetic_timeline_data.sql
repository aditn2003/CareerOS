-- Synthetic Timeline Data for User ID 552
-- Creates 8 jobs with status changes over time to demonstrate the timeline visualization

-- First, ensure user 552 exists (create if doesn't exist)
INSERT INTO users (id, email, password_hash, first_name, last_name)
VALUES (552, 'demo_user_552@example.com', '$2b$10$demo', 'Demo', 'User')
ON CONFLICT (id) DO NOTHING;

-- Clear any existing data for user 552 (optional - comment out if you want to keep existing data)
-- DELETE FROM application_history WHERE user_id = 552;
-- DELETE FROM jobs WHERE user_id = 552;

-- Insert 8 jobs with different companies and titles
INSERT INTO jobs (user_id, title, company, location, status, created_at, status_updated_at)
VALUES
  -- Job 1: Software Engineer at Google
  (552, 'Software Engineer', 'Google', 'Mountain View, CA', 'Interested', 
   NOW() - INTERVAL '45 days', NOW() - INTERVAL '45 days'),
  
  -- Job 2: Full Stack Developer at Microsoft
  (552, 'Full Stack Developer', 'Microsoft', 'Seattle, WA', 'Interested',
   NOW() - INTERVAL '40 days', NOW() - INTERVAL '40 days'),
  
  -- Job 3: Frontend Engineer at Meta
  (552, 'Frontend Engineer', 'Meta', 'Menlo Park, CA', 'Interested',
   NOW() - INTERVAL '35 days', NOW() - INTERVAL '35 days'),
  
  -- Job 4: Backend Engineer at Amazon
  (552, 'Backend Engineer', 'Amazon', 'Seattle, WA', 'Interested',
   NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days'),
  
  -- Job 5: DevOps Engineer at Netflix
  (552, 'DevOps Engineer', 'Netflix', 'Los Gatos, CA', 'Interested',
   NOW() - INTERVAL '25 days', NOW() - INTERVAL '25 days'),
  
  -- Job 6: Data Engineer at Airbnb
  (552, 'Data Engineer', 'Airbnb', 'San Francisco, CA', 'Interested',
   NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days'),
  
  -- Job 7: ML Engineer at OpenAI
  (552, 'ML Engineer', 'OpenAI', 'San Francisco, CA', 'Interested',
   NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days'),
  
  -- Job 8: Product Engineer at Stripe
  (552, 'Product Engineer', 'Stripe', 'San Francisco, CA', 'Interested',
   NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days')
RETURNING id, title, company;

-- Now insert application_history records showing status progression
-- Job 1: Google - Goes through full pipeline to Offer
INSERT INTO application_history (job_id, user_id, event, timestamp, from_status, to_status)
SELECT 
  j.id,
  552,
  'Status changed to "Applied"',
  NOW() - INTERVAL '42 days',
  'Interested',
  'Applied'
FROM jobs j WHERE j.user_id = 552 AND j.company = 'Google';

INSERT INTO application_history (job_id, user_id, event, timestamp, from_status, to_status)
SELECT 
  j.id,
  552,
  'Status changed to "Phone Screen"',
  NOW() - INTERVAL '38 days',
  'Applied',
  'Phone Screen'
FROM jobs j WHERE j.user_id = 552 AND j.company = 'Google';

INSERT INTO application_history (job_id, user_id, event, timestamp, from_status, to_status)
SELECT 
  j.id,
  552,
  'Status changed to "Interview"',
  NOW() - INTERVAL '32 days',
  'Phone Screen',
  'Interview'
FROM jobs j WHERE j.user_id = 552 AND j.company = 'Google';

INSERT INTO application_history (job_id, user_id, event, timestamp, from_status, to_status)
SELECT 
  j.id,
  552,
  'Status changed to "Offer"',
  NOW() - INTERVAL '25 days',
  'Interview',
  'Offer'
FROM jobs j WHERE j.user_id = 552 AND j.company = 'Google';

-- Job 2: Microsoft - Applied -> Phone Screen -> Interview -> Rejected
INSERT INTO application_history (job_id, user_id, event, timestamp, from_status, to_status)
SELECT 
  j.id,
  552,
  'Status changed to "Applied"',
  NOW() - INTERVAL '37 days',
  'Interested',
  'Applied'
FROM jobs j WHERE j.user_id = 552 AND j.company = 'Microsoft';

INSERT INTO application_history (job_id, user_id, event, timestamp, from_status, to_status)
SELECT 
  j.id,
  552,
  'Status changed to "Phone Screen"',
  NOW() - INTERVAL '33 days',
  'Applied',
  'Phone Screen'
FROM jobs j WHERE j.user_id = 552 AND j.company = 'Microsoft';

INSERT INTO application_history (job_id, user_id, event, timestamp, from_status, to_status)
SELECT 
  j.id,
  552,
  'Status changed to "Interview"',
  NOW() - INTERVAL '28 days',
  'Phone Screen',
  'Interview'
FROM jobs j WHERE j.user_id = 552 AND j.company = 'Microsoft';

INSERT INTO application_history (job_id, user_id, event, timestamp, from_status, to_status)
SELECT 
  j.id,
  552,
  'Status changed to "Rejected"',
  NOW() - INTERVAL '20 days',
  'Interview',
  'Rejected'
FROM jobs j WHERE j.user_id = 552 AND j.company = 'Microsoft';

-- Job 3: Meta - Applied -> Phone Screen -> Rejected
INSERT INTO application_history (job_id, user_id, event, timestamp, from_status, to_status)
SELECT 
  j.id,
  552,
  'Status changed to "Applied"',
  NOW() - INTERVAL '32 days',
  'Interested',
  'Applied'
FROM jobs j WHERE j.user_id = 552 AND j.company = 'Meta';

INSERT INTO application_history (job_id, user_id, event, timestamp, from_status, to_status)
SELECT 
  j.id,
  552,
  'Status changed to "Phone Screen"',
  NOW() - INTERVAL '28 days',
  'Applied',
  'Phone Screen'
FROM jobs j WHERE j.user_id = 552 AND j.company = 'Meta';

INSERT INTO application_history (job_id, user_id, event, timestamp, from_status, to_status)
SELECT 
  j.id,
  552,
  'Status changed to "Rejected"',
  NOW() - INTERVAL '22 days',
  'Phone Screen',
  'Rejected'
FROM jobs j WHERE j.user_id = 552 AND j.company = 'Meta';

-- Job 4: Amazon - Applied -> Phone Screen -> Interview (still in progress)
INSERT INTO application_history (job_id, user_id, event, timestamp, from_status, to_status)
SELECT 
  j.id,
  552,
  'Status changed to "Applied"',
  NOW() - INTERVAL '27 days',
  'Interested',
  'Applied'
FROM jobs j WHERE j.user_id = 552 AND j.company = 'Amazon';

INSERT INTO application_history (job_id, user_id, event, timestamp, from_status, to_status)
SELECT 
  j.id,
  552,
  'Status changed to "Phone Screen"',
  NOW() - INTERVAL '23 days',
  'Applied',
  'Phone Screen'
FROM jobs j WHERE j.user_id = 552 AND j.company = 'Amazon';

INSERT INTO application_history (job_id, user_id, event, timestamp, from_status, to_status)
SELECT 
  j.id,
  552,
  'Status changed to "Interview"',
  NOW() - INTERVAL '18 days',
  'Phone Screen',
  'Interview'
FROM jobs j WHERE j.user_id = 552 AND j.company = 'Amazon';

-- Job 5: Netflix - Applied -> Phone Screen (recent)
INSERT INTO application_history (job_id, user_id, event, timestamp, from_status, to_status)
SELECT 
  j.id,
  552,
  'Status changed to "Applied"',
  NOW() - INTERVAL '22 days',
  'Interested',
  'Applied'
FROM jobs j WHERE j.user_id = 552 AND j.company = 'Netflix';

INSERT INTO application_history (job_id, user_id, event, timestamp, from_status, to_status)
SELECT 
  j.id,
  552,
  'Status changed to "Phone Screen"',
  NOW() - INTERVAL '18 days',
  'Applied',
  'Phone Screen'
FROM jobs j WHERE j.user_id = 552 AND j.company = 'Netflix';

-- Job 6: Airbnb - Applied (recent)
INSERT INTO application_history (job_id, user_id, event, timestamp, from_status, to_status)
SELECT 
  j.id,
  552,
  'Status changed to "Applied"',
  NOW() - INTERVAL '17 days',
  'Interested',
  'Applied'
FROM jobs j WHERE j.user_id = 552 AND j.company = 'Airbnb';

-- Job 7: OpenAI - Applied -> Phone Screen -> Interview -> Offer (recent success)
INSERT INTO application_history (job_id, user_id, event, timestamp, from_status, to_status)
SELECT 
  j.id,
  552,
  'Status changed to "Applied"',
  NOW() - INTERVAL '12 days',
  'Interested',
  'Applied'
FROM jobs j WHERE j.user_id = 552 AND j.company = 'OpenAI';

INSERT INTO application_history (job_id, user_id, event, timestamp, from_status, to_status)
SELECT 
  j.id,
  552,
  'Status changed to "Phone Screen"',
  NOW() - INTERVAL '9 days',
  'Applied',
  'Phone Screen'
FROM jobs j WHERE j.user_id = 552 AND j.company = 'OpenAI';

INSERT INTO application_history (job_id, user_id, event, timestamp, from_status, to_status)
SELECT 
  j.id,
  552,
  'Status changed to "Interview"',
  NOW() - INTERVAL '5 days',
  'Phone Screen',
  'Interview'
FROM jobs j WHERE j.user_id = 552 AND j.company = 'OpenAI';

INSERT INTO application_history (job_id, user_id, event, timestamp, from_status, to_status)
SELECT 
  j.id,
  552,
  'Status changed to "Offer"',
  NOW() - INTERVAL '2 days',
  'Interview',
  'Offer'
FROM jobs j WHERE j.user_id = 552 AND j.company = 'OpenAI';

-- Job 8: Stripe - Applied (very recent)
INSERT INTO application_history (job_id, user_id, event, timestamp, from_status, to_status)
SELECT 
  j.id,
  552,
  'Status changed to "Applied"',
  NOW() - INTERVAL '7 days',
  'Interested',
  'Applied'
FROM jobs j WHERE j.user_id = 552 AND j.company = 'Stripe';

-- Update job statuses to match their latest history entries
UPDATE jobs SET status = 'Offer', status_updated_at = NOW() - INTERVAL '25 days'
WHERE user_id = 552 AND company = 'Google';

UPDATE jobs SET status = 'Rejected', status_updated_at = NOW() - INTERVAL '20 days'
WHERE user_id = 552 AND company = 'Microsoft';

UPDATE jobs SET status = 'Rejected', status_updated_at = NOW() - INTERVAL '22 days'
WHERE user_id = 552 AND company = 'Meta';

UPDATE jobs SET status = 'Interview', status_updated_at = NOW() - INTERVAL '18 days'
WHERE user_id = 552 AND company = 'Amazon';

UPDATE jobs SET status = 'Phone Screen', status_updated_at = NOW() - INTERVAL '18 days'
WHERE user_id = 552 AND company = 'Netflix';

UPDATE jobs SET status = 'Applied', status_updated_at = NOW() - INTERVAL '17 days'
WHERE user_id = 552 AND company = 'Airbnb';

UPDATE jobs SET status = 'Offer', status_updated_at = NOW() - INTERVAL '2 days'
WHERE user_id = 552 AND company = 'OpenAI';

UPDATE jobs SET status = 'Applied', status_updated_at = NOW() - INTERVAL '7 days'
WHERE user_id = 552 AND company = 'Stripe';

-- Summary
SELECT 
  'Synthetic data created successfully!' as message,
  COUNT(DISTINCT j.id) as jobs_created,
  COUNT(ah.id) as history_events_created
FROM jobs j
LEFT JOIN application_history ah ON j.id = ah.job_id AND j.user_id = 552
WHERE j.user_id = 552;

