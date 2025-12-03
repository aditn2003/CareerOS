-- ============================================================
-- Comprehensive Synthetic Test Data for Analytics Testing
-- ============================================================
-- This script creates test data for:
-- - User 1 (candidate)
-- - User 551 (mentor)
-- - Team setup
-- - Tasks with various statuses and completion dates
-- - Jobs for the candidate
-- - Skills for the candidate
-- - Mentor feedback
-- ============================================================

BEGIN;

-- Variables (adjust these if needed)
DO $$
DECLARE
    candidate_id INT := 1;
    mentor_id INT := 551;
    test_team_id INT;
    job1_id INT;
    job2_id INT;
    job3_id INT;
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
BEGIN
    -- ============================================================
    -- 1. Ensure users exist and have correct account types
    -- ============================================================
    -- Update candidate account type
    UPDATE public.users 
    SET account_type = 'candidate' 
    WHERE id = candidate_id;
    
    -- Note: Mentor account_type is not updated here to avoid constraint issues
    -- The role in team_members table ('mentor') is what determines permissions
    -- If mentor account_type needs updating, run: 
    -- UPDATE users SET account_type = 'mentor' WHERE id = 551;
    
    -- ============================================================
    -- 2. Create or get team
    -- ============================================================
    -- Check if team already exists
    SELECT id INTO test_team_id 
    FROM public.teams 
    WHERE owner_id = mentor_id 
    LIMIT 1;
    
    -- Create team if it doesn't exist
    IF test_team_id IS NULL THEN
        INSERT INTO public.teams (name, owner_id)
        VALUES ('Test Analytics Team', mentor_id)
        RETURNING id INTO test_team_id;
    END IF;
    
    -- ============================================================
    -- 3. Ensure team memberships exist
    -- ============================================================
    -- Add mentor to team
    INSERT INTO public.team_members (team_id, user_id, role, status)
    VALUES (test_team_id, mentor_id, 'mentor', 'active')
    ON CONFLICT (team_id, user_id) 
    DO UPDATE SET role = 'mentor', status = 'active';
    
    -- Add candidate to team
    INSERT INTO public.team_members (team_id, user_id, role, status)
    VALUES (test_team_id, candidate_id, 'candidate', 'active')
    ON CONFLICT (team_id, user_id) 
    DO UPDATE SET role = 'candidate', status = 'active';
    
    -- ============================================================
    -- 4. Create jobs for candidate (for job application milestones)
    -- ============================================================
    -- Job 1 (first application - 30 days ago)
    INSERT INTO public.jobs (
        user_id, title, company, location, status, 
        created_at, deadline, description
    )
    VALUES (
        candidate_id, 
        'Software Engineer', 
        'Tech Corp', 
        'San Francisco, CA',
        'Applied',
        NOW() - INTERVAL '30 days',
        NOW() - INTERVAL '20 days',
        'Full-stack software engineer position'
    )
    RETURNING id INTO job1_id;
    
    -- Job 2 (15 days ago)
    INSERT INTO public.jobs (
        user_id, title, company, location, status,
        created_at, deadline, description
    )
    VALUES (
        candidate_id,
        'Frontend Developer',
        'Web Solutions Inc',
        'New York, NY',
        'Interview',
        NOW() - INTERVAL '15 days',
        NOW() - INTERVAL '5 days',
        'React and TypeScript developer role'
    )
    RETURNING id INTO job2_id;
    
    -- Job 3 (7 days ago)
    INSERT INTO public.jobs (
        user_id, title, company, location, status,
        created_at, deadline, description
    )
    VALUES (
        candidate_id,
        'Backend Developer',
        'Cloud Services LLC',
        'Seattle, WA',
        'Applied',
        NOW() - INTERVAL '7 days',
        NOW() + INTERVAL '3 days',
        'Node.js and PostgreSQL backend role'
    )
    RETURNING id INTO job3_id;
    
    -- ============================================================
    -- 5. Create skills for candidate
    -- ============================================================
    INSERT INTO public.skills (user_id, name, category, proficiency)
    VALUES 
        (candidate_id, 'JavaScript', 'Technical', 'Advanced'),
        (candidate_id, 'React', 'Technical', 'Intermediate'),
        (candidate_id, 'Node.js', 'Technical', 'Advanced'),
        (candidate_id, 'PostgreSQL', 'Technical', 'Intermediate'),
        (candidate_id, 'Python', 'Technical', 'Beginner'),
        (candidate_id, 'Communication', 'Soft Skills', 'Advanced'),
        (candidate_id, 'Teamwork', 'Soft Skills', 'Advanced'),
        (candidate_id, 'Problem Solving', 'Soft Skills', 'Advanced')
    ON CONFLICT (user_id, name) DO NOTHING;
    
    -- ============================================================
    -- 6. Create tasks with various statuses and completion dates
    -- ============================================================
    
    -- Task 1: Completed 25 days ago (on time, completed in 2 days)
    INSERT INTO public.tasks (
        team_id, mentor_id, candidate_id, title, description,
        status, due_date, created_at, updated_at
    )
    VALUES (
        test_team_id, mentor_id, candidate_id,
        'Complete JavaScript Fundamentals Course',
        'Finish the online JavaScript course and submit certificate',
        'completed',
        NOW() - INTERVAL '23 days',
        NOW() - INTERVAL '25 days',
        NOW() - INTERVAL '23 days'  -- Completed 2 days before due
    )
    RETURNING id INTO task1_id;
    
    -- Task 2: Completed 20 days ago (on time, completed in 1 day)
    INSERT INTO public.tasks (
        team_id, mentor_id, candidate_id, title, description,
        status, due_date, created_at, updated_at
    )
    VALUES (
        test_team_id, mentor_id, candidate_id,
        'Update LinkedIn Profile',
        'Optimize LinkedIn profile with keywords and achievements',
        'completed',
        NOW() - INTERVAL '19 days',
        NOW() - INTERVAL '20 days',
        NOW() - INTERVAL '19 days'  -- Completed 1 day before due
    )
    RETURNING id INTO task2_id;
    
    -- Task 3: Completed 15 days ago (on time, completed in 3 days)
    INSERT INTO public.tasks (
        team_id, mentor_id, candidate_id, job_id, title, description,
        status, due_date, created_at, updated_at
    )
    VALUES (
        test_team_id, mentor_id, candidate_id, job1_id,
        'Prepare for Tech Corp Interview',
        'Research company, prepare STAR stories, review job description',
        'completed',
        NOW() - INTERVAL '12 days',
        NOW() - INTERVAL '15 days',
        NOW() - INTERVAL '12 days'  -- Completed 3 days before due
    )
    RETURNING id INTO task3_id;
    
    -- Task 4: Completed 12 days ago (late, completed 2 days after due)
    INSERT INTO public.tasks (
        team_id, mentor_id, candidate_id, title, description,
        status, due_date, created_at, updated_at
    )
    VALUES (
        test_team_id, mentor_id, candidate_id,
        'Build Portfolio Project',
        'Create a full-stack web application for portfolio',
        'completed',
        NOW() - INTERVAL '14 days',
        NOW() - INTERVAL '18 days',
        NOW() - INTERVAL '12 days'  -- Completed 2 days late
    )
    RETURNING id INTO task4_id;
    
    -- Task 5: Completed 10 days ago (on time, completed in 4 days)
    INSERT INTO public.tasks (
        team_id, mentor_id, candidate_id, skill_name, title, description,
        status, due_date, created_at, updated_at
    )
    VALUES (
        test_team_id, mentor_id, candidate_id, 'React',
        'Complete React Advanced Patterns Tutorial',
        'Study advanced React patterns and hooks',
        'completed',
        NOW() - INTERVAL '6 days',
        NOW() - INTERVAL '10 days',
        NOW() - INTERVAL '6 days'  -- Completed 4 days before due
    )
    RETURNING id INTO task5_id;
    
    -- Task 6: Completed 8 days ago (on time, completed in 1.5 days)
    INSERT INTO public.tasks (
        team_id, mentor_id, candidate_id, job_id, title, description,
        status, due_date, created_at, updated_at
    )
    VALUES (
        test_team_id, mentor_id, candidate_id, job2_id,
        'Practice Behavioral Interview Questions',
        'Prepare answers for common behavioral questions using STAR method',
        'completed',
        NOW() - INTERVAL '6.5 days',
        NOW() - INTERVAL '8 days',
        NOW() - INTERVAL '6.5 days'  -- Completed 1.5 days before due
    )
    RETURNING id INTO task6_id;
    
    -- Task 7: Completed 5 days ago (on time, completed in 2 days)
    INSERT INTO public.tasks (
        team_id, mentor_id, candidate_id, title, description,
        status, due_date, created_at, updated_at
    )
    VALUES (
        test_team_id, mentor_id, candidate_id,
        'Network with 5 Industry Professionals',
        'Reach out and connect with professionals on LinkedIn',
        'completed',
        NOW() - INTERVAL '3 days',
        NOW() - INTERVAL '5 days',
        NOW() - INTERVAL '3 days'  -- Completed 2 days before due
    )
    RETURNING id INTO task7_id;
    
    -- Task 8: Completed 3 days ago (on time, completed in 1 day)
    INSERT INTO public.tasks (
        team_id, mentor_id, candidate_id, skill_name, title, description,
        status, due_date, created_at, updated_at
    )
    VALUES (
        test_team_id, mentor_id, candidate_id, 'Node.js',
        'Build REST API with Express',
        'Create a RESTful API with authentication and CRUD operations',
        'completed',
        NOW() - INTERVAL '2 days',
        NOW() - INTERVAL '3 days',
        NOW() - INTERVAL '2 days'  -- Completed 1 day before due
    )
    RETURNING id INTO task8_id;
    
    -- Task 9: In Progress (started 2 days ago, due in 3 days)
    INSERT INTO public.tasks (
        team_id, mentor_id, candidate_id, job_id, title, description,
        status, due_date, created_at, updated_at
    )
    VALUES (
        test_team_id, mentor_id, candidate_id, job3_id,
        'Prepare Technical Interview for Cloud Services',
        'Review system design concepts and practice coding problems',
        'in_progress',
        NOW() + INTERVAL '3 days',
        NOW() - INTERVAL '2 days',
        NOW() - INTERVAL '2 days'  -- Started 2 days ago
    )
    RETURNING id INTO task9_id;
    
    -- Task 10: Pending (created 1 day ago, due in 5 days)
    INSERT INTO public.tasks (
        team_id, mentor_id, candidate_id, title, description,
        status, due_date, created_at, updated_at
    )
    VALUES (
        test_team_id, mentor_id, candidate_id,
        'Write Technical Blog Post',
        'Write a blog post about a recent project or learning experience',
        'pending',
        NOW() + INTERVAL '5 days',
        NOW() - INTERVAL '1 day',
        NOW() - INTERVAL '1 day'
    )
    RETURNING id INTO task10_id;
    
    -- ============================================================
    -- 7. Create mentor feedback (various types and dates)
    -- ============================================================
    
    -- Feedback 1: Task-related feedback (25 days ago)
    INSERT INTO public.mentor_feedback (
        team_id, mentor_id, candidate_id, task_id,
        feedback_type, content, created_at
    )
    VALUES (
        test_team_id, mentor_id, candidate_id, task1_id,
        'task',
        'Excellent work on completing the JavaScript course! Your understanding of fundamentals is solid. Keep practicing with real projects.',
        NOW() - INTERVAL '25 days'
    );
    
    -- Feedback 2: Job-related feedback (15 days ago)
    INSERT INTO public.mentor_feedback (
        team_id, mentor_id, candidate_id, job_id,
        feedback_type, content, created_at
    )
    VALUES (
        test_team_id, mentor_id, candidate_id, job1_id,
        'job',
        'Great job preparing for the Tech Corp interview. Your research was thorough. Remember to ask thoughtful questions at the end.',
        NOW() - INTERVAL '15 days'
    );
    
    -- Feedback 3: Skill-related feedback (12 days ago)
    INSERT INTO public.mentor_feedback (
        team_id, mentor_id, candidate_id, skill_name,
        feedback_type, content, created_at
    )
    VALUES (
        test_team_id, mentor_id, candidate_id, 'React',
        'skill',
        'Your React skills are improving well. The portfolio project shows good understanding of component architecture. Consider learning state management next.',
        NOW() - INTERVAL '12 days'
    );
    
    -- Feedback 4: Task-related feedback (10 days ago)
    INSERT INTO public.mentor_feedback (
        team_id, mentor_id, candidate_id, task_id,
        feedback_type, content, created_at
    )
    VALUES (
        test_team_id, mentor_id, candidate_id, task4_id,
        'task',
        'The portfolio project looks great! I noticed it was completed a bit late - try to break down large tasks into smaller milestones to stay on track.',
        NOW() - INTERVAL '10 days'
    );
    
    -- Feedback 5: General feedback (8 days ago)
    INSERT INTO public.mentor_feedback (
        team_id, mentor_id, candidate_id,
        feedback_type, content, created_at
    )
    VALUES (
        test_team_id, mentor_id, candidate_id,
        'general',
        'Overall progress is excellent! You''re showing great initiative and learning quickly. Keep up the momentum and don''t hesitate to ask questions.',
        NOW() - INTERVAL '8 days'
    );
    
    -- Feedback 6: Task-related feedback (5 days ago)
    INSERT INTO public.mentor_feedback (
        team_id, mentor_id, candidate_id, task_id,
        feedback_type, content, created_at
    )
    VALUES (
        test_team_id, mentor_id, candidate_id, task7_id,
        'task',
        'Networking is going well! The connections you''ve made are valuable. Follow up with them regularly to maintain relationships.',
        NOW() - INTERVAL '5 days'
    );
    
    -- Feedback 7: Job-related feedback (3 days ago)
    INSERT INTO public.mentor_feedback (
        team_id, mentor_id, candidate_id, job_id,
        feedback_type, content, created_at
    )
    VALUES (
        test_team_id, mentor_id, candidate_id, job2_id,
        'job',
        'The interview preparation is solid. Your STAR stories are well-structured. Practice explaining technical concepts clearly.',
        NOW() - INTERVAL '3 days'
    );
    
    -- Feedback 8: Task-related feedback (1 day ago)
    INSERT INTO public.mentor_feedback (
        team_id, mentor_id, candidate_id, task_id,
        feedback_type, content, created_at
    )
    VALUES (
        test_team_id, mentor_id, candidate_id, task8_id,
        'task',
        'The REST API project demonstrates strong backend skills. The authentication implementation is clean. Great work!',
        NOW() - INTERVAL '1 day'
    );
    
    RAISE NOTICE '✅ Test data created successfully!';
    RAISE NOTICE '   Team ID: %', test_team_id;
    RAISE NOTICE '   Candidate ID: %', candidate_id;
    RAISE NOTICE '   Mentor ID: %', mentor_id;
    RAISE NOTICE '   Tasks created: 10 (8 completed, 1 in progress, 1 pending)';
    RAISE NOTICE '   Jobs created: 3';
    RAISE NOTICE '   Skills created: 8';
    RAISE NOTICE '   Feedback created: 8';
    
END $$;

COMMIT;

-- ============================================================
-- Verification Queries (optional - run these to check data)
-- ============================================================
-- SELECT COUNT(*) as total_tasks FROM public.tasks WHERE candidate_id = 1;
-- SELECT COUNT(*) as completed_tasks FROM public.tasks WHERE candidate_id = 1 AND status = 'completed';
-- SELECT COUNT(*) as total_jobs FROM public.jobs WHERE user_id = 1;
-- SELECT COUNT(*) as total_skills FROM public.skills WHERE user_id = 1;
-- SELECT COUNT(*) as total_feedback FROM public.mentor_feedback WHERE candidate_id = 1;

