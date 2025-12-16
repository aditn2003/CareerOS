-- ============================================================
-- Synthetic Timing Data for User ID 59
-- ============================================================
-- This script creates realistic job application data with timing patterns
-- that demonstrate correlation between submission timing and response rates
-- ============================================================

BEGIN;

-- Variables
DO $$
DECLARE
    target_user_id INT := 59;
    job_ids INT[] := ARRAY[]::INT[];
    submission_ids INT[] := ARRAY[]::INT[];
    current_job_id INT;
    submission_date TIMESTAMP;
    day_of_week_val INT;
    hour_of_day_val INT;
    response_days INT;
    i INT;
    user_exists BOOLEAN;
BEGIN
    -- ============================================================
    -- 0. ENSURE USER EXISTS
    -- ============================================================
    -- Check if user exists
    SELECT EXISTS(SELECT 1 FROM users WHERE id = target_user_id) INTO user_exists;
    
    -- Create user if it doesn't exist
    IF NOT user_exists THEN
        -- Set sequence to allow inserting with specific ID if needed
        IF target_user_id > (SELECT COALESCE(MAX(id), 0) FROM users) THEN
            PERFORM setval('users_id_seq', target_user_id);
        END IF;
        
        INSERT INTO users (id, email, password_hash, first_name, last_name, created_at)
        VALUES (
            target_user_id,
            'user' || target_user_id || '@example.com',
            '$2b$10$dummyhashfordemo', -- Dummy hash for demo
            'Test',
            'User',
            NOW()
        )
        ON CONFLICT (id) DO NOTHING;
        
        RAISE NOTICE 'Created user %', target_user_id;
    ELSE
        RAISE NOTICE 'User % already exists', target_user_id;
    END IF;
    
    -- ============================================================
    -- 1. CREATE JOBS WITH REALISTIC DATA
    -- ============================================================
    
    -- Job 1: Software Engineer at Google (Applied, got interview, then offer)
    INSERT INTO jobs (
        user_id, title, company, location, industry, type,
        status, salary_min, salary_max, description,
        deadline, created_at, status_updated_at
    ) VALUES (
        target_user_id,
        'Senior Software Engineer',
        'Google',
        'Mountain View, CA',
        'Technology',
        'Full-time',
        'Offer',
        180000,
        250000,
        'We are looking for a Senior Software Engineer to join our Search Infrastructure team. You will work on large-scale distributed systems, design and implement new features, and collaborate with cross-functional teams. Requirements: 5+ years of experience, strong background in algorithms and data structures, experience with distributed systems, proficiency in Java, Python, or C++.',
        (NOW() - INTERVAL '45 days')::DATE,
        NOW() - INTERVAL '50 days',
        NOW() - INTERVAL '5 days'
    ) RETURNING id INTO current_job_id;
    job_ids := array_append(job_ids, current_job_id);
    
    -- Job 2: Data Scientist at Meta (Applied, got interview, rejected)
    INSERT INTO jobs (
        user_id, title, company, location, industry, type,
        status, salary_min, salary_max, description,
        deadline, created_at, status_updated_at
    ) VALUES (
        target_user_id,
        'Data Scientist',
        'Meta',
        'Menlo Park, CA',
        'Technology',
        'Full-time',
        'Rejected',
        160000,
        220000,
        'Join our Data Science team to build machine learning models that power our advertising platform. You will work with petabytes of data, design experiments, and collaborate with product teams. Requirements: PhD or MS in Statistics/CS, experience with Python, SQL, and ML frameworks, strong statistical background.',
        (NOW() - INTERVAL '40 days')::DATE,
        NOW() - INTERVAL '45 days',
        NOW() - INTERVAL '10 days'
    ) RETURNING id INTO current_job_id;
    job_ids := array_append(job_ids, current_job_id);
    
    -- Job 3: Product Manager at Amazon (Applied, got interview, still in process)
    INSERT INTO jobs (
        user_id, title, company, location, industry, type,
        status, salary_min, salary_max, description,
        deadline, created_at, status_updated_at
    ) VALUES (
        target_user_id,
        'Product Manager',
        'Amazon',
        'Seattle, WA',
        'Technology',
        'Full-time',
        'Interview',
        150000,
        200000,
        'We are seeking an experienced Product Manager to drive product strategy and execution for our AWS services. You will work with engineering teams, define product requirements, and own the product roadmap. Requirements: 4+ years PM experience, technical background, strong analytical skills, MBA preferred.',
        (NOW() - INTERVAL '35 days')::DATE,
        NOW() - INTERVAL '40 days',
        NOW() - INTERVAL '2 days'
    ) RETURNING id INTO current_job_id;
    job_ids := array_append(job_ids, current_job_id);
    
    -- Job 4: Backend Engineer at Netflix (Applied, no response yet)
    INSERT INTO jobs (
        user_id, title, company, location, industry, type,
        status, salary_min, salary_max, description,
        deadline, created_at, status_updated_at
    ) VALUES (
        target_user_id,
        'Backend Engineer',
        'Netflix',
        'Los Gatos, CA',
        'Technology',
        'Full-time',
        'Applied',
        170000,
        230000,
        'Join our Content Platform team to build scalable backend services that power Netflix streaming. You will work with microservices architecture, handle millions of requests per second, and optimize for performance. Requirements: 5+ years backend experience, Java or Go, distributed systems, cloud infrastructure.',
        (NOW() - INTERVAL '30 days')::DATE,
        NOW() - INTERVAL '35 days',
        NOW() - INTERVAL '30 days'
    ) RETURNING id INTO current_job_id;
    job_ids := array_append(job_ids, current_job_id);
    
    -- Job 5: ML Engineer at OpenAI (Applied, got phone screen, rejected)
    INSERT INTO jobs (
        user_id, title, company, location, industry, type,
        status, salary_min, salary_max, description,
        deadline, created_at, status_updated_at
    ) VALUES (
        target_user_id,
        'Machine Learning Engineer',
        'OpenAI',
        'San Francisco, CA',
        'Technology',
        'Full-time',
        'Rejected',
        200000,
        300000,
        'Work on cutting-edge AI research and engineering. You will train large language models, optimize inference systems, and contribute to research publications. Requirements: Strong ML background, experience with PyTorch/TensorFlow, publications in top-tier conferences, PhD preferred.',
        (NOW() - INTERVAL '25 days')::DATE,
        NOW() - INTERVAL '30 days',
        NOW() - INTERVAL '15 days'
    ) RETURNING id INTO current_job_id;
    job_ids := array_append(job_ids, current_job_id);
    
    -- Job 6: Full Stack Developer at Stripe (Applied, got interview)
    INSERT INTO jobs (
        user_id, title, company, location, industry, type,
        status, salary_min, salary_max, description,
        deadline, created_at, status_updated_at
    ) VALUES (
        target_user_id,
        'Full Stack Developer',
        'Stripe',
        'San Francisco, CA',
        'Financial Technology',
        'Full-time',
        'Interview',
        160000,
        210000,
        'Build payment infrastructure that powers millions of businesses. You will work on both frontend and backend, design APIs, and ensure system reliability. Requirements: 3+ years full-stack experience, React/Node.js, strong problem-solving skills.',
        (NOW() - INTERVAL '20 days')::DATE,
        NOW() - INTERVAL '25 days',
        NOW() - INTERVAL '3 days'
    ) RETURNING id INTO current_job_id;
    job_ids := array_append(job_ids, current_job_id);
    
    -- Job 7: DevOps Engineer at Microsoft (Applied, no response)
    INSERT INTO jobs (
        user_id, title, company, location, industry, type,
        status, salary_min, salary_max, description,
        deadline, created_at, status_updated_at
    ) VALUES (
        target_user_id,
        'DevOps Engineer',
        'Microsoft',
        'Redmond, WA',
        'Technology',
        'Full-time',
        'Applied',
        140000,
        190000,
        'Join Azure DevOps team to build and maintain cloud infrastructure. You will automate deployments, monitor systems, and ensure high availability. Requirements: 4+ years DevOps experience, Kubernetes, Docker, CI/CD, cloud platforms.',
        (NOW() - INTERVAL '15 days')::DATE,
        NOW() - INTERVAL '20 days',
        NOW() - INTERVAL '15 days'
    ) RETURNING id INTO current_job_id;
    job_ids := array_append(job_ids, current_job_id);
    
    -- Job 8: Frontend Engineer at Airbnb (Applied, got offer, accepted)
    INSERT INTO jobs (
        user_id, title, company, location, industry, type,
        status, salary_min, salary_max, description,
        deadline, created_at, status_updated_at
    ) VALUES (
        target_user_id,
        'Frontend Engineer',
        'Airbnb',
        'San Francisco, CA',
        'Technology',
        'Full-time',
        'Offer',
        155000,
        205000,
        'Build beautiful user experiences for our platform. You will work with React, TypeScript, and modern frontend tooling to create responsive and accessible interfaces. Requirements: 4+ years frontend experience, React expertise, strong design sense.',
        (NOW() - INTERVAL '10 days')::DATE,
        NOW() - INTERVAL '15 days',
        NOW() - INTERVAL '1 day'
    ) RETURNING id INTO current_job_id;
    job_ids := array_append(job_ids, current_job_id);
    
    -- Job 9: Security Engineer at Apple (Applied, got interview)
    INSERT INTO jobs (
        user_id, title, company, location, industry, type,
        status, salary_min, salary_max, description,
        deadline, created_at, status_updated_at
    ) VALUES (
        target_user_id,
        'Security Engineer',
        'Apple',
        'Cupertino, CA',
        'Technology',
        'Full-time',
        'Interview',
        175000,
        225000,
        'Protect Apple products and services from security threats. You will conduct security audits, design secure systems, and respond to incidents. Requirements: 5+ years security experience, penetration testing, cryptography, security certifications preferred.',
        (NOW() - INTERVAL '8 days')::DATE,
        NOW() - INTERVAL '12 days',
        NOW() - INTERVAL '1 day'
    ) RETURNING id INTO current_job_id;
    job_ids := array_append(job_ids, current_job_id);
    
    -- Job 10: Data Engineer at Uber (Applied, no response)
    INSERT INTO jobs (
        user_id, title, company, location, industry, type,
        status, salary_min, salary_max, description,
        deadline, created_at, status_updated_at
    ) VALUES (
        target_user_id,
        'Data Engineer',
        'Uber',
        'San Francisco, CA',
        'Technology',
        'Full-time',
        'Applied',
        150000,
        200000,
        'Build data pipelines and infrastructure to support analytics and ML. You will work with Spark, Kafka, and cloud data warehouses. Requirements: 3+ years data engineering, Python/Scala, big data technologies.',
        (NOW() - INTERVAL '5 days')::DATE,
        NOW() - INTERVAL '8 days',
        NOW() - INTERVAL '5 days'
    ) RETURNING id INTO current_job_id;
    job_ids := array_append(job_ids, current_job_id);
    
    -- ============================================================
    -- 2. CREATE APPLICATION SUBMISSIONS WITH TIMING PATTERNS
    -- ============================================================
    -- Pattern: Better timing (Monday-Tuesday morning, 9-11 AM EST) = better outcomes
    -- Pattern: Saturday and Sunday = lower response rates
    
    -- Job 1: Google - Applied Monday 10 AM (BEST TIME) -> Got interview -> Got offer
    submission_date := (NOW() - INTERVAL '50 days')::TIMESTAMP;
    submission_date := date_trunc('day', submission_date);
    -- Find the Monday of that week (DOW 1 = Monday)
    submission_date := submission_date - (EXTRACT(DOW FROM submission_date AT TIME ZONE 'America/New_York')::INT - 1) * INTERVAL '1 day';
    submission_date := submission_date + INTERVAL '10 hours'; -- Monday 10 AM EST
    day_of_week_val := EXTRACT(DOW FROM submission_date AT TIME ZONE 'America/New_York')::INT;
    hour_of_day_val := EXTRACT(HOUR FROM submission_date AT TIME ZONE 'America/New_York')::INT;
    
    INSERT INTO application_submissions (
        job_id, user_id, submitted_at, day_of_week, hour_of_day, timezone,
        response_received, response_date, response_type,
        industry, company_size, job_type, is_remote
    ) VALUES (
        job_ids[1], target_user_id, submission_date, day_of_week_val, hour_of_day_val, 'America/New_York',
        TRUE, submission_date + INTERVAL '5 days', 'interview',
        'Technology', 'large', 'full-time', FALSE
    ) RETURNING id INTO current_job_id;
    submission_ids := array_append(submission_ids, current_job_id);
    
    -- Update to offer after interview
    UPDATE application_submissions
    SET response_type = 'offer', response_date = submission_date + INTERVAL '20 days'
    WHERE id = current_job_id;
    
    -- Job 2: Meta - Applied Monday 9 AM (GOOD TIME) -> Got interview -> Rejected
    submission_date := (NOW() - INTERVAL '45 days')::TIMESTAMP;
    submission_date := date_trunc('day', submission_date) + INTERVAL '9 hours'; -- Monday 9 AM EST
    day_of_week_val := EXTRACT(DOW FROM submission_date AT TIME ZONE 'America/New_York')::INT;
    hour_of_day_val := EXTRACT(HOUR FROM submission_date AT TIME ZONE 'America/New_York')::INT;
    
    INSERT INTO application_submissions (
        job_id, user_id, submitted_at, day_of_week, hour_of_day, timezone,
        response_received, response_date, response_type,
        industry, company_size, job_type, is_remote
    ) VALUES (
        job_ids[2], target_user_id, submission_date, day_of_week_val, hour_of_day_val, 'America/New_York',
        TRUE, submission_date + INTERVAL '4 days', 'interview',
        'Technology', 'large', 'full-time', FALSE
    ) RETURNING id INTO current_job_id;
    submission_ids := array_append(submission_ids, current_job_id);
    
    -- Update to rejection after interview
    UPDATE application_submissions
    SET response_type = 'rejection', response_date = submission_date + INTERVAL '15 days'
    WHERE id = current_job_id;
    
    -- Job 3: Amazon - Applied Monday 10 AM (BEST TIME) -> Got interview (still in process)
    submission_date := (NOW() - INTERVAL '40 days')::TIMESTAMP;
    submission_date := date_trunc('day', submission_date) + INTERVAL '10 hours'; -- Monday 10 AM EST
    day_of_week_val := EXTRACT(DOW FROM submission_date AT TIME ZONE 'America/New_York')::INT;
    hour_of_day_val := EXTRACT(HOUR FROM submission_date AT TIME ZONE 'America/New_York')::INT;
    
    INSERT INTO application_submissions (
        job_id, user_id, submitted_at, day_of_week, hour_of_day, timezone,
        response_received, response_date, response_type,
        industry, company_size, job_type, is_remote
    ) VALUES (
        job_ids[3], target_user_id, submission_date, day_of_week_val, hour_of_day_val, 'America/New_York',
        TRUE, submission_date + INTERVAL '3 days', 'interview',
        'Technology', 'large', 'full-time', FALSE
    ) RETURNING id INTO current_job_id;
    submission_ids := array_append(submission_ids, current_job_id);
    
    -- Job 4: Netflix - Applied Saturday 2 PM (BAD TIME) -> No response
    submission_date := (NOW() - INTERVAL '35 days')::TIMESTAMP;
    submission_date := date_trunc('day', submission_date) + INTERVAL '14 hours'; -- Saturday 2 PM EST
    day_of_week_val := EXTRACT(DOW FROM submission_date AT TIME ZONE 'America/New_York')::INT;
    hour_of_day_val := EXTRACT(HOUR FROM submission_date AT TIME ZONE 'America/New_York')::INT;
    
    INSERT INTO application_submissions (
        job_id, user_id, submitted_at, day_of_week, hour_of_day, timezone,
        response_received, response_date, response_type,
        industry, company_size, job_type, is_remote
    ) VALUES (
        job_ids[4], target_user_id, submission_date, day_of_week_val, hour_of_day_val, 'America/New_York',
        FALSE, NULL, 'no_response',
        'Technology', 'large', 'full-time', FALSE
    ) RETURNING id INTO current_job_id;
    submission_ids := array_append(submission_ids, current_job_id);
    
    -- Job 5: OpenAI - Applied Tuesday 9 AM (GOOD TIME) -> Got phone screen -> Rejected
    submission_date := (NOW() - INTERVAL '30 days')::TIMESTAMP;
    submission_date := date_trunc('day', submission_date) + INTERVAL '9 hours'; -- Tuesday 9 AM EST
    day_of_week_val := EXTRACT(DOW FROM submission_date AT TIME ZONE 'America/New_York')::INT;
    hour_of_day_val := EXTRACT(HOUR FROM submission_date AT TIME ZONE 'America/New_York')::INT;
    
    INSERT INTO application_submissions (
        job_id, user_id, submitted_at, day_of_week, hour_of_day, timezone,
        response_received, response_date, response_type,
        industry, company_size, job_type, is_remote
    ) VALUES (
        job_ids[5], target_user_id, submission_date, day_of_week_val, hour_of_day_val, 'America/New_York',
        TRUE, submission_date + INTERVAL '6 days', 'phone_screen',
        'Technology', 'medium', 'full-time', FALSE
    ) RETURNING id INTO current_job_id;
    submission_ids := array_append(submission_ids, current_job_id);
    
    -- Update to rejection after phone screen
    UPDATE application_submissions
    SET response_type = 'rejection', response_date = submission_date + INTERVAL '12 days'
    WHERE id = current_job_id;
    
    -- Job 6: Stripe - Applied Monday 9:30 AM (GOOD TIME) -> Got interview
    submission_date := (NOW() - INTERVAL '25 days')::TIMESTAMP;
    submission_date := date_trunc('day', submission_date) + INTERVAL '9 hours' + INTERVAL '30 minutes'; -- Monday 9:30 AM EST
    day_of_week_val := EXTRACT(DOW FROM submission_date AT TIME ZONE 'America/New_York')::INT;
    hour_of_day_val := EXTRACT(HOUR FROM submission_date AT TIME ZONE 'America/New_York')::INT;
    
    INSERT INTO application_submissions (
        job_id, user_id, submitted_at, day_of_week, hour_of_day, timezone,
        response_received, response_date, response_type,
        industry, company_size, job_type, is_remote
    ) VALUES (
        job_ids[6], target_user_id, submission_date, day_of_week_val, hour_of_day_val, 'America/New_York',
        TRUE, submission_date + INTERVAL '4 days', 'interview',
        'Financial Technology', 'large', 'full-time', FALSE
    ) RETURNING id INTO current_job_id;
    submission_ids := array_append(submission_ids, current_job_id);
    
    -- Job 7: Microsoft - Applied Sunday 3 PM (BAD TIME) -> No response
    submission_date := (NOW() - INTERVAL '20 days')::TIMESTAMP;
    submission_date := date_trunc('day', submission_date) + INTERVAL '15 hours'; -- Sunday 3 PM EST
    day_of_week_val := EXTRACT(DOW FROM submission_date AT TIME ZONE 'America/New_York')::INT;
    hour_of_day_val := EXTRACT(HOUR FROM submission_date AT TIME ZONE 'America/New_York')::INT;
    
    INSERT INTO application_submissions (
        job_id, user_id, submitted_at, day_of_week, hour_of_day, timezone,
        response_received, response_date, response_type,
        industry, company_size, job_type, is_remote
    ) VALUES (
        job_ids[7], target_user_id, submission_date, day_of_week_val, hour_of_day_val, 'America/New_York',
        FALSE, NULL, 'no_response',
        'Technology', 'large', 'full-time', FALSE
    ) RETURNING id INTO current_job_id;
    submission_ids := array_append(submission_ids, current_job_id);
    
    -- Job 8: Airbnb - Applied Tuesday 10:15 AM (BEST TIME) -> Got interview -> Got offer
    submission_date := (NOW() - INTERVAL '15 days')::TIMESTAMP;
    submission_date := date_trunc('day', submission_date) + INTERVAL '10 hours' + INTERVAL '15 minutes'; -- Tuesday 10:15 AM EST
    day_of_week_val := EXTRACT(DOW FROM submission_date AT TIME ZONE 'America/New_York')::INT;
    hour_of_day_val := EXTRACT(HOUR FROM submission_date AT TIME ZONE 'America/New_York')::INT;
    
    INSERT INTO application_submissions (
        job_id, user_id, submitted_at, day_of_week, hour_of_day, timezone,
        response_received, response_date, response_type,
        industry, company_size, job_type, is_remote
    ) VALUES (
        job_ids[8], target_user_id, submission_date, day_of_week_val, hour_of_day_val, 'America/New_York',
        TRUE, submission_date + INTERVAL '3 days', 'interview',
        'Technology', 'large', 'full-time', FALSE
    ) RETURNING id INTO current_job_id;
    submission_ids := array_append(submission_ids, current_job_id);
    
    -- Update to offer after interview
    UPDATE application_submissions
    SET response_type = 'offer', response_date = submission_date + INTERVAL '12 days'
    WHERE id = current_job_id;
    
    -- Job 9: Apple - Applied Tuesday 9 AM (GOOD TIME) -> Got interview
    submission_date := (NOW() - INTERVAL '12 days')::TIMESTAMP;
    submission_date := date_trunc('day', submission_date) + INTERVAL '9 hours'; -- Tuesday 9 AM EST
    day_of_week_val := EXTRACT(DOW FROM submission_date AT TIME ZONE 'America/New_York')::INT;
    hour_of_day_val := EXTRACT(HOUR FROM submission_date AT TIME ZONE 'America/New_York')::INT;
    
    INSERT INTO application_submissions (
        job_id, user_id, submitted_at, day_of_week, hour_of_day, timezone,
        response_received, response_date, response_type,
        industry, company_size, job_type, is_remote
    ) VALUES (
        job_ids[9], target_user_id, submission_date, day_of_week_val, hour_of_day_val, 'America/New_York',
        TRUE, submission_date + INTERVAL '5 days', 'interview',
        'Technology', 'large', 'full-time', FALSE
    ) RETURNING id INTO current_job_id;
    submission_ids := array_append(submission_ids, current_job_id);
    
    -- Job 10: Uber - Applied Sunday 11 AM (BAD TIME) -> No response
    submission_date := (NOW() - INTERVAL '8 days')::TIMESTAMP;
    submission_date := date_trunc('day', submission_date) + INTERVAL '11 hours'; -- Sunday 11 AM EST
    day_of_week_val := EXTRACT(DOW FROM submission_date AT TIME ZONE 'America/New_York')::INT;
    hour_of_day_val := EXTRACT(HOUR FROM submission_date AT TIME ZONE 'America/New_York')::INT;
    
    INSERT INTO application_submissions (
        job_id, user_id, submitted_at, day_of_week, hour_of_day, timezone,
        response_received, response_date, response_type,
        industry, company_size, job_type, is_remote
    ) VALUES (
        job_ids[10], target_user_id, submission_date, day_of_week_val, hour_of_day_val, 'America/New_York',
        FALSE, NULL, 'no_response',
        'Technology', 'large', 'full-time', FALSE
    ) RETURNING id INTO current_job_id;
    submission_ids := array_append(submission_ids, current_job_id);
    
    -- ============================================================
    -- 3. ADD MORE HISTORICAL SUBMISSIONS FOR BETTER ANALYTICS
    -- ============================================================
    -- Add 20 more submissions with varied timing to show patterns
    
    FOR i IN 1..20 LOOP
        -- Mix of good and bad timing
        IF i <= 12 THEN
            -- Good timing: Monday-Tuesday morning, 9-11 AM
            submission_date := (NOW() - (30 + i * 2) * INTERVAL '1 day')::TIMESTAMP;
            submission_date := date_trunc('day', submission_date);
            -- Alternate between Monday (1), Tuesday (2)
            submission_date := submission_date + (1 + (i % 2)) * INTERVAL '1 day';
            -- Alternate between 9, 10, 11 AM
            submission_date := submission_date + (9 + (i % 3)) * INTERVAL '1 hour';
            
            -- Higher response rate for good timing (70%)
            IF (i % 10) < 7 THEN
                response_days := 3 + (i % 5);
                INSERT INTO application_submissions (
                    job_id, user_id, submitted_at, day_of_week, hour_of_day, timezone,
                    response_received, response_date, response_type,
                    industry, company_size, job_type, is_remote
                ) VALUES (
                    job_ids[1 + (i % 3)], -- Use first 3 jobs as placeholders
                    target_user_id,
                    submission_date,
                    EXTRACT(DOW FROM submission_date AT TIME ZONE 'America/New_York')::INT,
                    EXTRACT(HOUR FROM submission_date AT TIME ZONE 'America/New_York')::INT,
                    'America/New_York',
                    TRUE,
                    submission_date + response_days * INTERVAL '1 day',
                    CASE WHEN (i % 3) = 0 THEN 'interview' 
                         WHEN (i % 3) = 1 THEN 'phone_screen'
                         ELSE 'offer' END,
                    'Technology',
                    CASE WHEN (i % 3) = 0 THEN 'large' 
                         WHEN (i % 3) = 1 THEN 'medium'
                         ELSE 'small' END,
                    'full-time',
                    (i % 2)::BOOLEAN
                );
            ELSE
                -- 30% no response even with good timing
                INSERT INTO application_submissions (
                    job_id, user_id, submitted_at, day_of_week, hour_of_day, timezone,
                    response_received, response_date, response_type,
                    industry, company_size, job_type, is_remote
                ) VALUES (
                    job_ids[1 + (i % 3)],
                    target_user_id,
                    submission_date,
                    EXTRACT(DOW FROM submission_date AT TIME ZONE 'America/New_York')::INT,
                    EXTRACT(HOUR FROM submission_date AT TIME ZONE 'America/New_York')::INT,
                    'America/New_York',
                    FALSE,
                    NULL,
                    'no_response',
                    'Technology',
                    'medium',
                    'full-time',
                    FALSE
                );
            END IF;
        ELSE
            -- Bad timing: Saturday and Sunday
            submission_date := (NOW() - (30 + i * 2) * INTERVAL '1 day')::TIMESTAMP;
            submission_date := date_trunc('day', submission_date);
            -- Alternate between Saturday (6), Sunday (0)
            submission_date := submission_date + (6 * ((i - 13) % 2)) * INTERVAL '1 day';
            -- Various times on weekends: 10 AM, 2 PM, 4 PM
            submission_date := submission_date + (10 + ((i - 13) % 3) * 2) * INTERVAL '1 hour';
            
            -- Lower response rate for bad timing (20%)
            IF (i % 5) = 0 THEN
                response_days := 7 + (i % 10);
                INSERT INTO application_submissions (
                    job_id, user_id, submitted_at, day_of_week, hour_of_day, timezone,
                    response_received, response_date, response_type,
                    industry, company_size, job_type, is_remote
                ) VALUES (
                    job_ids[4 + (i % 3)],
                    target_user_id,
                    submission_date,
                    EXTRACT(DOW FROM submission_date AT TIME ZONE 'America/New_York')::INT,
                    EXTRACT(HOUR FROM submission_date AT TIME ZONE 'America/New_York')::INT,
                    'America/New_York',
                    TRUE,
                    submission_date + response_days * INTERVAL '1 day',
                    'rejection', -- Mostly rejections for bad timing
                    'Technology',
                    'large',
                    'full-time',
                    FALSE
                );
            ELSE
                -- 80% no response for bad timing
                INSERT INTO application_submissions (
                    job_id, user_id, submitted_at, day_of_week, hour_of_day, timezone,
                    response_received, response_date, response_type,
                    industry, company_size, job_type, is_remote
                ) VALUES (
                    job_ids[4 + (i % 3)],
                    target_user_id,
                    submission_date,
                    EXTRACT(DOW FROM submission_date AT TIME ZONE 'America/New_York')::INT,
                    EXTRACT(HOUR FROM submission_date AT TIME ZONE 'America/New_York')::INT,
                    'America/New_York',
                    FALSE,
                    NULL,
                    'no_response',
                    'Technology',
                    'large',
                    'full-time',
                    FALSE
                );
            END IF;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Created % jobs and application submissions for user %', array_length(job_ids, 1), target_user_id;
    
END $$;

COMMIT;

-- ============================================================
-- SUMMARY
-- ============================================================
-- This script creates:
-- - 10 jobs with realistic descriptions and statuses
-- - 30 application submissions with timing patterns showing:
--   * Good timing (Mon-Tue morning, 9-11 AM): ~70% response rate
--   * Bad timing (Saturday, Sunday): ~20% response rate
-- - All data is for user_id 59
-- - Timing data demonstrates correlation between submission time and outcomes
-- ============================================================

