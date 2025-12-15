-- ============================================================
-- EXTENDED SYNTHETIC DATA FOR COMPARISON TAB TESTING
-- ============================================================
-- This script will:
-- 1. Add 8 more jobs for user 552 (total 16 jobs)
-- 2. Create resume versions A and B (if not exists)
-- 3. Create cover letter versions A and B (if not exists)
-- 4. Link them in all 4 combinations:
--    - Resume A + Cover Letter A (4 jobs)
--    - Resume A + Cover Letter B (4 jobs)
--    - Resume B + Cover Letter A (4 jobs)
--    - Resume B + Cover Letter B (4 jobs)
-- This will create 4 metric groups in the comparison tab
-- ============================================================

DO $$
DECLARE
    v_user_id INTEGER := 552;
    v_existing_job_ids INTEGER[] := ARRAY[1206, 1207, 1208, 1209, 1210, 1211, 1212, 1213];
    v_new_job_ids INTEGER[];
    v_all_job_ids INTEGER[];
    v_resume_a_id INTEGER;
    v_resume_b_id INTEGER;
    v_cover_letter_a_id INTEGER;
    v_cover_letter_b_id INTEGER;
    v_resume_version_a_id INTEGER;
    v_resume_version_b_id INTEGER;
    v_cover_letter_version_a_id INTEGER;
    v_cover_letter_version_b_id INTEGER;
    v_base_resume_id INTEGER;
    v_base_cover_letter_id INTEGER;
    v_job_id INTEGER;
    v_counter INTEGER := 0;
    v_job_titles TEXT[] := ARRAY[
        'Senior Software Engineer',
        'Cloud Architect',
        'Security Engineer',
        'Mobile Developer',
        'QA Engineer',
        'Site Reliability Engineer',
        'Technical Lead',
        'Engineering Manager'
    ];
    v_companies TEXT[] := ARRAY[
        'TechCorp',
        'CloudSystems',
        'SecureNet',
        'MobileFirst',
        'QualityAssurance Inc',
        'Reliability Solutions',
        'TechLeaders Co',
        'Engineering Excellence'
    ];
    v_outcomes TEXT[] := ARRAY[
        'offer',
        'interview',
        'response_received',
        'rejection',
        'no_response',
        'interview',
        'offer',
        'response_received'
    ];
    v_descriptions TEXT[];
BEGIN
    -- ============================================================
    -- STEP 1: CREATE 8 NEW JOBS
    -- ============================================================
    RAISE NOTICE 'Creating 8 new jobs for user %', v_user_id;
    
    v_descriptions := ARRAY[
        'We are seeking a Senior Software Engineer with 5+ years of experience to lead technical initiatives. You will architect scalable systems, mentor junior engineers, and drive innovation in our product development.',
        'Join our team as a Cloud Architect to design and implement cloud infrastructure solutions. You will work with AWS, Azure, and GCP to build resilient, scalable systems that support our growing platform.',
        'We are looking for a Security Engineer to protect our systems and data. You will conduct security audits, implement security best practices, and respond to security incidents.',
        'Seeking a Mobile Developer to build native iOS and Android applications. You will work with React Native, Swift, and Kotlin to create engaging mobile experiences.',
        'Join our QA team as a QA Engineer to ensure product quality. You will design test strategies, write automated tests, and work closely with development teams.',
        'We need a Site Reliability Engineer to maintain and improve our infrastructure. You will focus on system reliability, performance optimization, and incident response.',
        'Looking for a Technical Lead to guide our engineering team. You will provide technical direction, code reviews, and help shape our engineering culture.',
        'We are seeking an Engineering Manager to lead a team of engineers. You will manage projects, mentor team members, and collaborate with product and design teams.'
    ];
    
    -- Create new jobs
    FOR v_counter IN 1..8
    LOOP
        INSERT INTO jobs (
            user_id, title, company, location, industry, type,
            description, status, application_outcome, applied_on
        )
        VALUES (
            v_user_id,
            v_job_titles[v_counter],
            v_companies[v_counter],
            'San Francisco, CA',
            'Technology',
            'Full-time',
            v_descriptions[v_counter],
            CASE 
                WHEN v_outcomes[v_counter] = 'offer' THEN 'Offer'
                WHEN v_outcomes[v_counter] = 'interview' THEN 'Interview'
                WHEN v_outcomes[v_counter] = 'response_received' THEN 'Phone Screen'
                WHEN v_outcomes[v_counter] = 'rejection' THEN 'Rejected'
                ELSE 'Applied'
            END,
            v_outcomes[v_counter]::character varying,
            CURRENT_DATE - (v_counter * 3) -- Stagger application dates
        )
        RETURNING id INTO v_job_id;
        
        v_new_job_ids := array_append(v_new_job_ids, v_job_id);
        RAISE NOTICE 'Created job %: % at %', v_job_id, v_job_titles[v_counter], v_companies[v_counter];
    END LOOP;
    
    -- Combine existing and new job IDs
    v_all_job_ids := v_existing_job_ids || v_new_job_ids;
    RAISE NOTICE 'Total jobs: %', array_length(v_all_job_ids, 1);
    
    -- ============================================================
    -- STEP 2: GET OR CREATE BASE RESUME AND COVER LETTER
    -- ============================================================
    SELECT id INTO v_base_resume_id
    FROM resumes
    WHERE user_id = v_user_id
    ORDER BY id DESC
    LIMIT 1;
    
    IF v_base_resume_id IS NULL THEN
        INSERT INTO resumes (user_id, title, template_name, sections, format)
        VALUES (
            v_user_id,
            'My Resume',
            'ats-optimized',
            '{"summary": "Experienced software engineer", "experience": [], "education": [], "skills": []}'::jsonb,
            'pdf'
        )
        RETURNING id INTO v_base_resume_id;
        RAISE NOTICE 'Created base resume with ID %', v_base_resume_id;
    ELSE
        RAISE NOTICE 'Using existing resume ID %', v_base_resume_id;
    END IF;
    
    SELECT id INTO v_base_cover_letter_id
    FROM uploaded_cover_letters
    WHERE user_id = v_user_id
    ORDER BY id DESC
    LIMIT 1;
    
    IF v_base_cover_letter_id IS NULL THEN
        INSERT INTO uploaded_cover_letters (user_id, title, format, file_url, content)
        VALUES (
            v_user_id,
            'My Cover Letter',
            'pdf',
            '/uploads/cover_letters/default.pdf',
            'Dear Hiring Manager, I am writing to express my interest in the position...'
        )
        RETURNING id INTO v_base_cover_letter_id;
        RAISE NOTICE 'Created base cover letter with ID %', v_base_cover_letter_id;
    ELSE
        RAISE NOTICE 'Using existing cover letter ID %', v_base_cover_letter_id;
    END IF;
    
    -- ============================================================
    -- STEP 3: GET OR CREATE PUBLISHED RESUME VERSIONS A AND B
    -- ============================================================
    
    -- Check if Resume A already exists
    SELECT r.id INTO v_resume_a_id
    FROM resumes r
    WHERE r.user_id = v_user_id 
      AND r.description LIKE '%Published from My Resume - Version 1%'
    LIMIT 1;
    
    IF v_resume_a_id IS NULL THEN
        INSERT INTO resumes (user_id, title, template_name, sections, format, description)
        VALUES (
            v_user_id,
            'Resume Version A',
            'ats-optimized',
            '{"summary": "Version A: Focused on technical skills", "experience": [], "education": [], "skills": []}'::jsonb,
            'pdf',
            'Published from My Resume - Version 1'
        )
        RETURNING id INTO v_resume_a_id;
        RAISE NOTICE 'Created published resume A with ID %', v_resume_a_id;
    ELSE
        RAISE NOTICE 'Using existing resume A with ID %', v_resume_a_id;
    END IF;
    
    -- Check if Resume B already exists
    SELECT r.id INTO v_resume_b_id
    FROM resumes r
    WHERE r.user_id = v_user_id 
      AND r.description LIKE '%Published from My Resume - Version 2%'
    LIMIT 1;
    
    IF v_resume_b_id IS NULL THEN
        INSERT INTO resumes (user_id, title, template_name, sections, format, description)
        VALUES (
            v_user_id,
            'Resume Version B',
            'ats-optimized',
            '{"summary": "Version B: Focused on leadership and impact", "experience": [], "education": [], "skills": []}'::jsonb,
            'pdf',
            'Published from My Resume - Version 2'
        )
        RETURNING id INTO v_resume_b_id;
        RAISE NOTICE 'Created published resume B with ID %', v_resume_b_id;
    ELSE
        RAISE NOTICE 'Using existing resume B with ID %', v_resume_b_id;
    END IF;
    
    -- Create or update resume_versions entries
    INSERT INTO resume_versions (resume_id, user_id, version_number, title, is_published, published_resume_id, version_label)
    VALUES (v_base_resume_id, v_user_id, 1, 'My Resume', TRUE, v_resume_a_id, 'A')
    ON CONFLICT (resume_id, version_number) 
    DO UPDATE SET 
        is_published = TRUE,
        published_resume_id = EXCLUDED.published_resume_id,
        version_label = EXCLUDED.version_label
    RETURNING id INTO v_resume_version_a_id;
    
    INSERT INTO resume_versions (resume_id, user_id, version_number, title, is_published, published_resume_id, version_label)
    VALUES (v_base_resume_id, v_user_id, 2, 'My Resume', TRUE, v_resume_b_id, 'B')
    ON CONFLICT (resume_id, version_number) 
    DO UPDATE SET 
        is_published = TRUE,
        published_resume_id = EXCLUDED.published_resume_id,
        version_label = EXCLUDED.version_label
    RETURNING id INTO v_resume_version_b_id;
    
    RAISE NOTICE 'Resume versions: A (version_id: %), B (version_id: %)', v_resume_version_a_id, v_resume_version_b_id;
    
    -- ============================================================
    -- STEP 4: GET OR CREATE PUBLISHED COVER LETTER VERSIONS A AND B
    -- ============================================================
    
    -- Check if Cover Letter A already exists
    SELECT ucl.id INTO v_cover_letter_a_id
    FROM uploaded_cover_letters ucl
    WHERE ucl.user_id = v_user_id 
      AND ucl.description LIKE '%Published from My Cover Letter - Version 1%'
    LIMIT 1;
    
    IF v_cover_letter_a_id IS NULL THEN
        INSERT INTO uploaded_cover_letters (user_id, title, format, file_url, content, description)
        VALUES (
            v_user_id,
            'Cover Letter Version A',
            'pdf',
            '/uploads/cover_letters/version_a.pdf',
            'Dear Hiring Manager, I am writing to express my strong interest in this position. My technical background and problem-solving abilities make me an ideal candidate...',
            'Published from My Cover Letter - Version 1'
        )
        RETURNING id INTO v_cover_letter_a_id;
        RAISE NOTICE 'Created published cover letter A with ID %', v_cover_letter_a_id;
    ELSE
        RAISE NOTICE 'Using existing cover letter A with ID %', v_cover_letter_a_id;
    END IF;
    
    -- Check if Cover Letter B already exists
    SELECT ucl.id INTO v_cover_letter_b_id
    FROM uploaded_cover_letters ucl
    WHERE ucl.user_id = v_user_id 
      AND ucl.description LIKE '%Published from My Cover Letter - Version 2%'
    LIMIT 1;
    
    IF v_cover_letter_b_id IS NULL THEN
        INSERT INTO uploaded_cover_letters (user_id, title, format, file_url, content, description)
        VALUES (
            v_user_id,
            'Cover Letter Version B',
            'pdf',
            '/uploads/cover_letters/version_b.pdf',
            'Dear Hiring Manager, I am excited to apply for this role. My leadership experience and track record of delivering impactful projects align perfectly with your needs...',
            'Published from My Cover Letter - Version 2'
        )
        RETURNING id INTO v_cover_letter_b_id;
        RAISE NOTICE 'Created published cover letter B with ID %', v_cover_letter_b_id;
    ELSE
        RAISE NOTICE 'Using existing cover letter B with ID %', v_cover_letter_b_id;
    END IF;
    
    -- Create or update cover_letter_versions entries
    INSERT INTO cover_letter_versions (cover_letter_id, user_id, version_number, title, is_published, published_cover_letter_id, version_label)
    VALUES (v_base_cover_letter_id, v_user_id, 1, 'My Cover Letter', TRUE, v_cover_letter_a_id, 'A')
    ON CONFLICT (cover_letter_id, version_number) 
    DO UPDATE SET 
        is_published = TRUE,
        published_cover_letter_id = EXCLUDED.published_cover_letter_id,
        version_label = EXCLUDED.version_label
    RETURNING id INTO v_cover_letter_version_a_id;
    
    INSERT INTO cover_letter_versions (cover_letter_id, user_id, version_number, title, is_published, published_cover_letter_id, version_label)
    VALUES (v_base_cover_letter_id, v_user_id, 2, 'My Cover Letter', TRUE, v_cover_letter_b_id, 'B')
    ON CONFLICT (cover_letter_id, version_number) 
    DO UPDATE SET 
        is_published = TRUE,
        published_cover_letter_id = EXCLUDED.published_cover_letter_id,
        version_label = EXCLUDED.version_label
    RETURNING id INTO v_cover_letter_version_b_id;
    
    RAISE NOTICE 'Cover letter versions: A (version_id: %), B (version_id: %)', v_cover_letter_version_a_id, v_cover_letter_version_b_id;
    
    -- ============================================================
    -- STEP 5: LINK MATERIALS TO JOBS IN ALL 4 COMBINATIONS
    -- ============================================================
    -- Distribution: 4 jobs per combination (16 total jobs)
    -- Combination 1: Resume A + Cover Letter A (jobs 1-4)
    -- Combination 2: Resume A + Cover Letter B (jobs 5-8)
    -- Combination 3: Resume B + Cover Letter A (jobs 9-12)
    -- Combination 4: Resume B + Cover Letter B (jobs 13-16)
    
    RAISE NOTICE 'Linking materials to jobs in 4 combinations...';
    
    -- Combination 1: Resume A + Cover Letter A (first 4 jobs)
    FOR v_counter IN 1..4
    LOOP
        v_job_id := v_all_job_ids[v_counter];
        
        INSERT INTO job_materials (job_id, user_id, resume_id, cover_letter_id)
        VALUES (v_job_id, v_user_id, v_resume_a_id, v_cover_letter_a_id)
        ON CONFLICT (job_id)
        DO UPDATE SET
            resume_id = v_resume_a_id,
            cover_letter_id = v_cover_letter_a_id,
            updated_at = NOW();
        
        -- Update or create application_materials_history
        UPDATE application_materials_history
        SET resume_version_label = 'A',
            cover_letter_version_label = 'A'
        WHERE job_id = v_job_id 
          AND user_id = v_user_id
          AND changed_at = (
              SELECT MAX(changed_at) 
              FROM application_materials_history 
              WHERE job_id = v_job_id AND user_id = v_user_id
          );
        
        IF NOT FOUND THEN
            INSERT INTO application_materials_history (
                user_id, job_id, resume_id, cover_letter_id, 
                action, resume_version_label, cover_letter_version_label
            )
            VALUES (
                v_user_id, v_job_id, v_resume_a_id, v_cover_letter_a_id,
                'initial_set', 'A', 'A'
            );
        END IF;
        
        RAISE NOTICE 'Linked Resume A + Cover Letter A to job %', v_job_id;
    END LOOP;
    
    -- Combination 2: Resume A + Cover Letter B (jobs 5-8)
    FOR v_counter IN 5..8
    LOOP
        v_job_id := v_all_job_ids[v_counter];
        
        INSERT INTO job_materials (job_id, user_id, resume_id, cover_letter_id)
        VALUES (v_job_id, v_user_id, v_resume_a_id, v_cover_letter_b_id)
        ON CONFLICT (job_id)
        DO UPDATE SET
            resume_id = v_resume_a_id,
            cover_letter_id = v_cover_letter_b_id,
            updated_at = NOW();
        
        UPDATE application_materials_history
        SET resume_version_label = 'A',
            cover_letter_version_label = 'B'
        WHERE job_id = v_job_id 
          AND user_id = v_user_id
          AND changed_at = (
              SELECT MAX(changed_at) 
              FROM application_materials_history 
              WHERE job_id = v_job_id AND user_id = v_user_id
          );
        
        IF NOT FOUND THEN
            INSERT INTO application_materials_history (
                user_id, job_id, resume_id, cover_letter_id, 
                action, resume_version_label, cover_letter_version_label
            )
            VALUES (
                v_user_id, v_job_id, v_resume_a_id, v_cover_letter_b_id,
                'initial_set', 'A', 'B'
            );
        END IF;
        
        RAISE NOTICE 'Linked Resume A + Cover Letter B to job %', v_job_id;
    END LOOP;
    
    -- Combination 3: Resume B + Cover Letter A (jobs 9-12)
    FOR v_counter IN 9..12
    LOOP
        v_job_id := v_all_job_ids[v_counter];
        
        INSERT INTO job_materials (job_id, user_id, resume_id, cover_letter_id)
        VALUES (v_job_id, v_user_id, v_resume_b_id, v_cover_letter_a_id)
        ON CONFLICT (job_id)
        DO UPDATE SET
            resume_id = v_resume_b_id,
            cover_letter_id = v_cover_letter_a_id,
            updated_at = NOW();
        
        UPDATE application_materials_history
        SET resume_version_label = 'B',
            cover_letter_version_label = 'A'
        WHERE job_id = v_job_id 
          AND user_id = v_user_id
          AND changed_at = (
              SELECT MAX(changed_at) 
              FROM application_materials_history 
              WHERE job_id = v_job_id AND user_id = v_user_id
          );
        
        IF NOT FOUND THEN
            INSERT INTO application_materials_history (
                user_id, job_id, resume_id, cover_letter_id, 
                action, resume_version_label, cover_letter_version_label
            )
            VALUES (
                v_user_id, v_job_id, v_resume_b_id, v_cover_letter_a_id,
                'initial_set', 'B', 'A'
            );
        END IF;
        
        RAISE NOTICE 'Linked Resume B + Cover Letter A to job %', v_job_id;
    END LOOP;
    
    -- Combination 4: Resume B + Cover Letter B (jobs 13-16)
    FOR v_counter IN 13..array_length(v_all_job_ids, 1)
    LOOP
        v_job_id := v_all_job_ids[v_counter];
        
        INSERT INTO job_materials (job_id, user_id, resume_id, cover_letter_id)
        VALUES (v_job_id, v_user_id, v_resume_b_id, v_cover_letter_b_id)
        ON CONFLICT (job_id)
        DO UPDATE SET
            resume_id = v_resume_b_id,
            cover_letter_id = v_cover_letter_b_id,
            updated_at = NOW();
        
        UPDATE application_materials_history
        SET resume_version_label = 'B',
            cover_letter_version_label = 'B'
        WHERE job_id = v_job_id 
          AND user_id = v_user_id
          AND changed_at = (
              SELECT MAX(changed_at) 
              FROM application_materials_history 
              WHERE job_id = v_job_id AND user_id = v_user_id
          );
        
        IF NOT FOUND THEN
            INSERT INTO application_materials_history (
                user_id, job_id, resume_id, cover_letter_id, 
                action, resume_version_label, cover_letter_version_label
            )
            VALUES (
                v_user_id, v_job_id, v_resume_b_id, v_cover_letter_b_id,
                'initial_set', 'B', 'B'
            );
        END IF;
        
        RAISE NOTICE 'Linked Resume B + Cover Letter B to job %', v_job_id;
    END LOOP;
    
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'EXTENDED SYNTHETIC DATA CREATION COMPLETE!';
    RAISE NOTICE '';
    RAISE NOTICE 'Total jobs: %', array_length(v_all_job_ids, 1);
    RAISE NOTICE '';
    RAISE NOTICE 'Combination 1: Resume A + Cover Letter A (4 jobs)';
    RAISE NOTICE '  Jobs: %', array_to_string(v_all_job_ids[1:4], ', ');
    RAISE NOTICE '';
    RAISE NOTICE 'Combination 2: Resume A + Cover Letter B (4 jobs)';
    RAISE NOTICE '  Jobs: %', array_to_string(v_all_job_ids[5:8], ', ');
    RAISE NOTICE '';
    RAISE NOTICE 'Combination 3: Resume B + Cover Letter A (4 jobs)';
    RAISE NOTICE '  Jobs: %', array_to_string(v_all_job_ids[9:12], ', ');
    RAISE NOTICE '';
    RAISE NOTICE 'Combination 4: Resume B + Cover Letter B (4 jobs)';
    RAISE NOTICE '  Jobs: %', array_to_string(v_all_job_ids[13:array_length(v_all_job_ids, 1)], ', ');
    RAISE NOTICE '';
    RAISE NOTICE 'You should now see 4 metric groups in the comparison tab!';
    RAISE NOTICE '============================================================';
    
END $$;

