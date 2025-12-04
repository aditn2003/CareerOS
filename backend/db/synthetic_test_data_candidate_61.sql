-- ============================================================
-- Comprehensive Synthetic Test Data for Candidate 61
-- ============================================================
-- This script creates test data for:
-- - User 61 (candidate)
-- - User 551 (mentor) - same mentor as candidate 1
-- - Same team setup
-- - Tasks with various statuses and completion dates
-- - Jobs with different statuses (including Offer for milestones)
-- - Skills for the candidate (to trigger skill milestones)
-- - Mentor feedback
-- ============================================================

BEGIN;

-- Variables
DO $$
DECLARE
    candidate_id INT := 61;
    mentor_id INT := 551;
    test_team_id INT;
    job1_id INT;
    job2_id INT;
    job3_id INT;
    job4_id INT;
    job5_id INT;
    task1_id INT;
    task2_id INT;
    task3_id INT;
    task4_id INT;
    task5_id INT;
    task6_id INT;
    task7_id INT;
    task8_id INT;
    task9_id INT;
    task10_id INT;
    task11_id INT;
    task12_id INT;
    task13_id INT;
    task14_id INT;
    task15_id INT;
BEGIN
    -- ============================================================
    -- 1. Ensure user exists and has correct account type
    -- ============================================================
    UPDATE public.users 
    SET account_type = 'candidate' 
    WHERE id = candidate_id;
    
    -- ============================================================
    -- 2. Get existing team (same team as candidate 1)
    -- ============================================================
    SELECT id INTO test_team_id 
    FROM public.teams 
    WHERE owner_id = mentor_id 
    LIMIT 1;
    
    -- If team doesn't exist, create it
    IF test_team_id IS NULL THEN
        INSERT INTO public.teams (name, owner_id)
        VALUES ('Test Analytics Team', mentor_id)
        RETURNING id INTO test_team_id;
    END IF;
    
    -- ============================================================
    -- 3. Ensure team membership exists
    -- ============================================================
    INSERT INTO public.team_members (team_id, user_id, role, status)
    VALUES (test_team_id, candidate_id, 'candidate', 'active')
    ON CONFLICT (team_id, user_id) 
    DO UPDATE SET role = 'candidate', status = 'active';
    
    -- ============================================================
    -- 4. Create jobs for candidate (various statuses for milestones)
    -- ============================================================
    
    -- Job 1: First application (28 days ago) - will trigger "First Job Application" milestone
    INSERT INTO public.jobs (
        user_id, title, company, location, status, 
        created_at, status_updated_at, deadline, description
    )
    VALUES (
        candidate_id, 
        'Data Engineer', 
        'Data Systems Inc', 
        'Austin, TX',
        'Applied',
        NOW() - INTERVAL '28 days',
        NOW() - INTERVAL '28 days',
        NOW() - INTERVAL '18 days',
        'Data engineering position working with big data pipelines'
    )
    RETURNING id INTO job1_id;
    
    -- Job 2: Phone Screen (20 days ago) - will trigger "First Phone Screen" milestone
    INSERT INTO public.jobs (
        user_id, title, company, location, status,
        created_at, status_updated_at, deadline, description
    )
    VALUES (
        candidate_id,
        'Machine Learning Engineer',
        'AI Innovations',
        'Boston, MA',
        'Phone Screen',
        NOW() - INTERVAL '22 days',
        NOW() - INTERVAL '20 days',
        NOW() - INTERVAL '12 days',
        'ML engineer role focusing on model deployment'
    )
    RETURNING id INTO job2_id;
    
    -- Job 3: Interview (12 days ago) - will trigger "First Interview" milestone
    INSERT INTO public.jobs (
        user_id, title, company, location, status,
        created_at, status_updated_at, deadline, description
    )
    VALUES (
        candidate_id,
        'Full Stack Developer',
        'StartupXYZ',
        'Remote',
        'Interview',
        NOW() - INTERVAL '15 days',
        NOW() - INTERVAL '12 days',
        NOW() - INTERVAL '5 days',
        'Full-stack role with React and Python'
    )
    RETURNING id INTO job3_id;
    
    -- Job 4: OFFER (5 days ago) - will trigger "Job Offer Received" milestone
    INSERT INTO public.jobs (
        user_id, title, company, location, status,
        created_at, status_updated_at, deadline, description
    )
    VALUES (
        candidate_id,
        'Senior Software Engineer',
        'Tech Giants Co',
        'San Jose, CA',
        'Offer',
        NOW() - INTERVAL '10 days',
        NOW() - INTERVAL '5 days',
        NOW() - INTERVAL '2 days',
        'Senior role with competitive salary and benefits'
    )
    RETURNING id INTO job4_id;
    
    -- Job 5: Another application (3 days ago)
    INSERT INTO public.jobs (
        user_id, title, company, location, status,
        created_at, status_updated_at, deadline, description
    )
    VALUES (
        candidate_id,
        'DevOps Engineer',
        'Cloud Platform Inc',
        'Denver, CO',
        'Applied',
        NOW() - INTERVAL '3 days',
        NOW() - INTERVAL '3 days',
        NOW() + INTERVAL '7 days',
        'DevOps role with Kubernetes and AWS'
    )
    RETURNING id INTO job5_id;
    
    -- ============================================================
    -- 5. Create skills for candidate (to trigger skill milestones: 3, 5, 10+)
    -- Skills will be added at different times to show progression
    -- ============================================================
    
    -- First 3 skills (30 days ago) - will trigger "3 Skills Added!" milestone
    INSERT INTO public.skills (user_id, name, category, proficiency, created_at)
    VALUES 
        (candidate_id, 'Python', 'Technical', 'Advanced', NOW() - INTERVAL '30 days'),
        (candidate_id, 'SQL', 'Technical', 'Advanced', NOW() - INTERVAL '29 days'),
        (candidate_id, 'Data Analysis', 'Technical', 'Intermediate', NOW() - INTERVAL '28 days')
    ON CONFLICT (user_id, name) DO NOTHING;
    
    -- Next 2 skills (25 days ago) - will trigger "5 Skills Added!" milestone
    INSERT INTO public.skills (user_id, name, category, proficiency, created_at)
    VALUES 
        (candidate_id, 'Machine Learning', 'Technical', 'Intermediate', NOW() - INTERVAL '25 days'),
        (candidate_id, 'Leadership', 'Soft Skills', 'Advanced', NOW() - INTERVAL '24 days')
    ON CONFLICT (user_id, name) DO NOTHING;
    
    -- Next 5 skills (15 days ago) - will trigger "10 Skills Added!" milestone
    INSERT INTO public.skills (user_id, name, category, proficiency, created_at)
    VALUES 
        (candidate_id, 'TensorFlow', 'Technical', 'Intermediate', NOW() - INTERVAL '15 days'),
        (candidate_id, 'AWS', 'Technical', 'Intermediate', NOW() - INTERVAL '14 days'),
        (candidate_id, 'Docker', 'Technical', 'Beginner', NOW() - INTERVAL '13 days'),
        (candidate_id, 'Kubernetes', 'Technical', 'Beginner', NOW() - INTERVAL '12 days'),
        (candidate_id, 'Communication', 'Soft Skills', 'Advanced', NOW() - INTERVAL '11 days')
    ON CONFLICT (user_id, name) DO NOTHING;
    
    -- Additional skills (recent)
    INSERT INTO public.skills (user_id, name, category, proficiency, created_at)
    VALUES 
        (candidate_id, 'Project Management', 'Soft Skills', 'Intermediate', NOW() - INTERVAL '5 days'),
        (candidate_id, 'Agile', 'Soft Skills', 'Intermediate', NOW() - INTERVAL '4 days')
    ON CONFLICT (user_id, name) DO NOTHING;
    
    -- ============================================================
    -- 6. Create tasks with various statuses and completion dates
    -- Spread out to trigger different milestone numbers (1st, 5th, 10th, 15th)
    -- ============================================================
    
    -- Task 1: Completed 27 days ago (1st task - milestone)
    INSERT INTO public.tasks (
        team_id, mentor_id, candidate_id, title, description,
        status, due_date, created_at, updated_at
    )
    VALUES (
        test_team_id, mentor_id, candidate_id,
        'Complete Python Data Analysis Course',
        'Finish the online Python data analysis course',
        'completed',
        NOW() - INTERVAL '25 days',
        NOW() - INTERVAL '27 days',
        NOW() - INTERVAL '25 days'
    )
    RETURNING id INTO task1_id;
    
    -- Task 2: Completed 24 days ago
    INSERT INTO public.tasks (
        team_id, mentor_id, candidate_id, title, description,
        status, due_date, created_at, updated_at
    )
    VALUES (
        test_team_id, mentor_id, candidate_id,
        'Build Data Pipeline Project',
        'Create a data pipeline using Python and SQL',
        'completed',
        NOW() - INTERVAL '22 days',
        NOW() - INTERVAL '24 days',
        NOW() - INTERVAL '22 days'
    )
    RETURNING id INTO task2_id;
    
    -- Task 3: Completed 21 days ago
    INSERT INTO public.tasks (
        team_id, mentor_id, candidate_id, title, description,
        status, due_date, created_at, updated_at
    )
    VALUES (
        test_team_id, mentor_id, candidate_id,
        'Update Resume with Data Engineering Projects',
        'Add recent data engineering projects to resume',
        'completed',
        NOW() - INTERVAL '19 days',
        NOW() - INTERVAL '21 days',
        NOW() - INTERVAL '19 days'
    )
    RETURNING id INTO task3_id;
    
    -- Task 4: Completed 18 days ago
    INSERT INTO public.tasks (
        team_id, mentor_id, candidate_id, job_id, title, description,
        status, due_date, created_at, updated_at
    )
    VALUES (
        test_team_id, mentor_id, candidate_id, job2_id,
        'Prepare for Phone Screen',
        'Research company and prepare questions for phone screen',
        'completed',
        NOW() - INTERVAL '16 days',
        NOW() - INTERVAL '18 days',
        NOW() - INTERVAL '16 days'
    )
    RETURNING id INTO task4_id;
    
    -- Task 5: Completed 15 days ago (5th task - milestone)
    INSERT INTO public.tasks (
        team_id, mentor_id, candidate_id, title, description,
        status, due_date, created_at, updated_at
    )
    VALUES (
        test_team_id, mentor_id, candidate_id,
        'Complete Machine Learning Fundamentals',
        'Study ML basics and complete practice exercises',
        'completed',
        NOW() - INTERVAL '13 days',
        NOW() - INTERVAL '15 days',
        NOW() - INTERVAL '13 days'
    )
    RETURNING id INTO task5_id;
    
    -- Task 6: Completed 12 days ago
    INSERT INTO public.tasks (
        team_id, mentor_id, candidate_id, job_id, title, description,
        status, due_date, created_at, updated_at
    )
    VALUES (
        test_team_id, mentor_id, candidate_id, job3_id,
        'Prepare Technical Interview Questions',
        'Practice coding problems and system design questions',
        'completed',
        NOW() - INTERVAL '10 days',
        NOW() - INTERVAL '12 days',
        NOW() - INTERVAL '10 days'
    )
    RETURNING id INTO task6_id;
    
    -- Task 7: Completed 10 days ago
    INSERT INTO public.tasks (
        team_id, mentor_id, candidate_id, title, description,
        status, due_date, created_at, updated_at
    )
    VALUES (
        test_team_id, mentor_id, candidate_id,
        'Build ML Model Deployment Project',
        'Deploy a machine learning model using Flask and Docker',
        'completed',
        NOW() - INTERVAL '8 days',
        NOW() - INTERVAL '10 days',
        NOW() - INTERVAL '8 days'
    )
    RETURNING id INTO task7_id;
    
    -- Task 8: Completed 8 days ago
    INSERT INTO public.tasks (
        team_id, mentor_id, candidate_id, title, description,
        status, due_date, created_at, updated_at
    )
    VALUES (
        test_team_id, mentor_id, candidate_id,
        'Network with Data Engineers on LinkedIn',
        'Connect with 10 data engineers and engage with their content',
        'completed',
        NOW() - INTERVAL '6 days',
        NOW() - INTERVAL '8 days',
        NOW() - INTERVAL '6 days'
    )
    RETURNING id INTO task8_id;
    
    -- Task 9: Completed 6 days ago
    INSERT INTO public.tasks (
        team_id, mentor_id, candidate_id, title, description,
        status, due_date, created_at, updated_at
    )
    VALUES (
        test_team_id, mentor_id, candidate_id,
        'Write Technical Blog Post on Data Pipelines',
        'Write and publish a blog post about building data pipelines',
        'completed',
        NOW() - INTERVAL '4 days',
        NOW() - INTERVAL '6 days',
        NOW() - INTERVAL '4 days'
    )
    RETURNING id INTO task9_id;
    
    -- Task 10: Completed 4 days ago (10th task - milestone)
    INSERT INTO public.tasks (
        team_id, mentor_id, candidate_id, job_id, title, description,
        status, due_date, created_at, updated_at
    )
    VALUES (
        test_team_id, mentor_id, candidate_id, job4_id,
        'Review Job Offer Details',
        'Review salary, benefits, and negotiate if needed',
        'completed',
        NOW() - INTERVAL '2 days',
        NOW() - INTERVAL '4 days',
        NOW() - INTERVAL '2 days'
    )
    RETURNING id INTO task10_id;
    
    -- Task 11: Completed 3 days ago
    INSERT INTO public.tasks (
        team_id, mentor_id, candidate_id, title, description,
        status, due_date, created_at, updated_at
    )
    VALUES (
        test_team_id, mentor_id, candidate_id,
        'Set Up AWS Account and Practice',
        'Create AWS account and complete basic tutorials',
        'completed',
        NOW() - INTERVAL '1 day',
        NOW() - INTERVAL '3 days',
        NOW() - INTERVAL '1 day'
    )
    RETURNING id INTO task11_id;
    
    -- Task 12: Completed 2 days ago
    INSERT INTO public.tasks (
        team_id, mentor_id, candidate_id, title, description,
        status, due_date, created_at, updated_at
    )
    VALUES (
        test_team_id, mentor_id, candidate_id,
        'Learn Docker Basics',
        'Complete Docker tutorial and containerize a simple app',
        'completed',
        NOW() - INTERVAL '0 days',
        NOW() - INTERVAL '2 days',
        NOW() - INTERVAL '0 days'
    )
    RETURNING id INTO task12_id;
    
    -- Task 13: Completed 1 day ago
    INSERT INTO public.tasks (
        team_id, mentor_id, candidate_id, title, description,
        status, due_date, created_at, updated_at
    )
    VALUES (
        test_team_id, mentor_id, candidate_id,
        'Practice Kubernetes Deployments',
        'Deploy a sample application using Kubernetes',
        'completed',
        NOW() + INTERVAL '1 day',
        NOW() - INTERVAL '1 day',
        NOW() - INTERVAL '0.5 days'
    )
    RETURNING id INTO task13_id;
    
    -- Task 14: Completed today
    INSERT INTO public.tasks (
        team_id, mentor_id, candidate_id, title, description,
        status, due_date, created_at, updated_at
    )
    VALUES (
        test_team_id, mentor_id, candidate_id,
        'Complete System Design Practice',
        'Practice system design questions for senior roles',
        'completed',
        NOW() + INTERVAL '2 days',
        NOW() - INTERVAL '0.5 days',
        NOW()
    )
    RETURNING id INTO task14_id;
    
    -- Task 15: Completed today (15th task - milestone)
    INSERT INTO public.tasks (
        team_id, mentor_id, candidate_id, title, description,
        status, due_date, created_at, updated_at
    )
    VALUES (
        test_team_id, mentor_id, candidate_id,
        'Update Portfolio with Recent Projects',
        'Add ML deployment and data pipeline projects to portfolio',
        'completed',
        NOW() + INTERVAL '3 days',
        NOW() - INTERVAL '0.25 days',
        NOW()
    )
    RETURNING id INTO task15_id;
    
    -- ============================================================
    -- 7. Create mentor feedback (various types and dates)
    -- ============================================================
    
    -- Feedback 1: Task-related feedback (27 days ago)
    INSERT INTO public.mentor_feedback (
        team_id, mentor_id, candidate_id, task_id,
        feedback_type, content, created_at
    )
    VALUES (
        test_team_id, mentor_id, candidate_id, task1_id,
        'task',
        'Great work on the Python course! Your data analysis skills are developing well. Keep building projects to reinforce learning.',
        NOW() - INTERVAL '27 days'
    );
    
    -- Feedback 2: Job-related feedback (20 days ago)
    INSERT INTO public.mentor_feedback (
        team_id, mentor_id, candidate_id, job_id,
        feedback_type, content, created_at
    )
    VALUES (
        test_team_id, mentor_id, candidate_id, job2_id,
        'job',
        'Excellent preparation for the phone screen! Your research on the company was thorough. Good luck with the call.',
        NOW() - INTERVAL '20 days'
    );
    
    -- Feedback 3: Skill-related feedback (15 days ago)
    INSERT INTO public.mentor_feedback (
        team_id, mentor_id, candidate_id, skill_name,
        feedback_type, content, created_at
    )
    VALUES (
        test_team_id, mentor_id, candidate_id, 'Machine Learning',
        'skill',
        'Your ML skills are progressing nicely. The fundamentals course shows good understanding. Consider diving deeper into model evaluation next.',
        NOW() - INTERVAL '15 days'
    );
    
    -- Feedback 4: Task-related feedback (12 days ago)
    INSERT INTO public.mentor_feedback (
        team_id, mentor_id, candidate_id, task_id,
        feedback_type, content, created_at
    )
    VALUES (
        test_team_id, mentor_id, candidate_id, task6_id,
        'task',
        'The technical interview prep looks solid. Your coding practice is paying off. Remember to explain your thought process clearly during interviews.',
        NOW() - INTERVAL '12 days'
    );
    
    -- Feedback 5: General feedback (10 days ago)
    INSERT INTO public.mentor_feedback (
        team_id, mentor_id, candidate_id,
        feedback_type, content, created_at
    )
    VALUES (
        test_team_id, mentor_id, candidate_id,
        'general',
        'Outstanding progress! You''re consistently completing tasks on time and showing great initiative. The ML deployment project is impressive.',
        NOW() - INTERVAL '10 days'
    );
    
    -- Feedback 6: Job-related feedback (5 days ago) - about the offer
    INSERT INTO public.mentor_feedback (
        team_id, mentor_id, candidate_id, job_id,
        feedback_type, content, created_at
    )
    VALUES (
        test_team_id, mentor_id, candidate_id, job4_id,
        'job',
        'Congratulations on the job offer! This is a great opportunity. Take time to review all details and don''t hesitate to negotiate if needed.',
        NOW() - INTERVAL '5 days'
    );
    
    -- Feedback 7: Task-related feedback (3 days ago)
    INSERT INTO public.mentor_feedback (
        team_id, mentor_id, candidate_id, task_id,
        feedback_type, content, created_at
    )
    VALUES (
        test_team_id, mentor_id, candidate_id, task11_id,
        'task',
        'Good work setting up AWS. Cloud skills are essential for modern data engineering roles. Continue practicing with real projects.',
        NOW() - INTERVAL '3 days'
    );
    
    -- Feedback 8: Task-related feedback (1 day ago)
    INSERT INTO public.mentor_feedback (
        team_id, mentor_id, candidate_id, task_id,
        feedback_type, content, created_at
    )
    VALUES (
        test_team_id, mentor_id, candidate_id, task13_id,
        'task',
        'The Kubernetes deployment project demonstrates strong DevOps understanding. This will be valuable for senior roles. Excellent work!',
        NOW() - INTERVAL '1 day'
    );
    
    RAISE NOTICE '✅ Test data created successfully for Candidate 61!';
    RAISE NOTICE '   Team ID: %', test_team_id;
    RAISE NOTICE '   Candidate ID: %', candidate_id;
    RAISE NOTICE '   Mentor ID: %', mentor_id;
    RAISE NOTICE '   Tasks created: 15 (all completed)';
    RAISE NOTICE '   Jobs created: 5 (1 Offer, 1 Interview, 1 Phone Screen, 2 Applied)';
    RAISE NOTICE '   Skills created: 12 (will trigger 3, 5, and 10 skill milestones)';
    RAISE NOTICE '   Feedback created: 8';
    RAISE NOTICE '';
    RAISE NOTICE '   Milestones that should appear:';
    RAISE NOTICE '   - First Task Completed';
    RAISE NOTICE '   - 5 Tasks Completed';
    RAISE NOTICE '   - 10 Tasks Completed';
    RAISE NOTICE '   - 15 Tasks Completed';
    RAISE NOTICE '   - First Job Application';
    RAISE NOTICE '   - First Phone Screen';
    RAISE NOTICE '   - First Interview Scheduled';
    RAISE NOTICE '   - Job Offer Received';
    RAISE NOTICE '   - 3 Skills Added';
    RAISE NOTICE '   - 5 Skills Added';
    RAISE NOTICE '   - 10 Skills Added';
    
END $$;

COMMIT;

-- ============================================================
-- Verification Queries (optional - run these to check data)
-- ============================================================
-- SELECT COUNT(*) as total_tasks FROM public.tasks WHERE candidate_id = 61;
-- SELECT COUNT(*) as completed_tasks FROM public.tasks WHERE candidate_id = 61 AND status = 'completed';
-- SELECT COUNT(*) as total_jobs FROM public.jobs WHERE user_id = 61;
-- SELECT status, COUNT(*) FROM public.jobs WHERE user_id = 61 GROUP BY status;
-- SELECT COUNT(*) as total_skills FROM public.skills WHERE user_id = 61;
-- SELECT COUNT(*) as total_feedback FROM public.mentor_feedback WHERE candidate_id = 61;
-- SELECT * FROM public.jobs WHERE user_id = 61 ORDER BY created_at;

