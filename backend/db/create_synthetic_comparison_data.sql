-- ============================================================
-- SCRIPT TO CREATE SYNTHETIC DATA FOR COMPARISON TAB TESTING
-- ============================================================
-- This script will:
-- 1. Add job descriptions to all 8 jobs for user 552
-- 2. Create two published resume versions (A and B)
-- 3. Create two published cover letter versions (A and B)
-- 4. Link them evenly to the 8 jobs (4 jobs each)
--
-- IMPORTANT: Run query_user_552_info.sql first and update the job_ids below
-- ============================================================

DO $$
DECLARE
    v_user_id INTEGER := 552;
    -- Job IDs from application history: 1206, 1207, 1208, 1209, 1210, 1211, 1212, 1213
    v_job_ids INTEGER[] := ARRAY[1206, 1207, 1208, 1209, 1210, 1211, 1212, 1213];
    v_resume_a_id INTEGER;
    v_resume_b_id INTEGER;
    v_cover_letter_a_id INTEGER;
    v_cover_letter_b_id INTEGER;
    v_resume_version_a_id INTEGER;
    v_resume_version_b_id INTEGER;
    v_cover_letter_version_a_id INTEGER;
    v_cover_letter_version_b_id INTEGER;
    v_base_resume_id INTEGER; -- Original resume ID to create versions from
    v_base_cover_letter_id INTEGER; -- Original cover letter ID to create versions from
    v_job_id INTEGER;
    v_counter INTEGER := 0;
    v_job_descriptions TEXT[];
BEGIN
    -- ============================================================
    -- STEP 1: UPDATE JOB DESCRIPTIONS AND APPLICATION OUTCOMES
    -- ============================================================
    -- Job descriptions tailored to each role
    v_job_descriptions := ARRAY[
        -- Job 1206: Software Engineer (Offer)
        'We are seeking a talented Software Engineer to join our dynamic team. This role involves developing scalable applications, collaborating with cross-functional teams, and contributing to innovative projects. The ideal candidate will have strong problem-solving skills, experience with modern technologies, and a passion for continuous learning.',
        -- Job 1207: Full Stack Developer (Rejected)
        'Join our team as a Full Stack Developer where you will build end-to-end web applications using modern frameworks. You will work on both frontend and backend systems, design APIs, and collaborate with product managers and designers to deliver exceptional user experiences.',
        -- Job 1208: Frontend Engineer (Rejected)
        'We are looking for a Frontend Engineer passionate about creating beautiful and intuitive user interfaces. You will work with React, TypeScript, and modern CSS frameworks to build responsive web applications that delight users and drive business value.',
        -- Job 1209: Backend Engineer (Interview)
        'Seeking a Backend Engineer to design and implement robust, scalable server-side systems. You will work with microservices architecture, design databases, build RESTful APIs, and ensure high performance and reliability of our platform.',
        -- Job 1210: DevOps Engineer (Phone Screen)
        'Join our DevOps team to automate infrastructure, manage CI/CD pipelines, and ensure system reliability. You will work with cloud platforms, containerization technologies, and monitoring tools to support our engineering teams and improve deployment processes.',
        -- Job 1211: Data Engineer (Applied)
        'We are seeking a Data Engineer to build and maintain our data infrastructure. You will design ETL pipelines, optimize data warehouses, and work with big data technologies to enable data-driven decision making across the organization.',
        -- Job 1212: ML Engineer (Offer)
        'Join our Machine Learning team to develop and deploy ML models at scale. You will work on feature engineering, model training, and production systems. Experience with Python, TensorFlow/PyTorch, and MLOps practices is essential.',
        -- Job 1213: Product Engineer (Applied)
        'We are looking for a Product Engineer who combines technical skills with product thinking. You will work closely with product managers to understand user needs, design solutions, and build features that drive business impact.'
    ];
    
    RAISE NOTICE 'Updating % jobs for user %', array_length(v_job_ids, 1), v_user_id;
    
    -- Update each job with description and application outcome
    FOR v_counter IN 1..array_length(v_job_ids, 1)
    LOOP
        v_job_id := v_job_ids[v_counter];
        
        UPDATE jobs
        SET description = v_job_descriptions[v_counter],
            -- Set application_outcome based on final status from history
            application_outcome = CASE 
                WHEN v_job_id = 1206 THEN 'offer'::character varying
                WHEN v_job_id = 1207 THEN 'rejection'::character varying
                WHEN v_job_id = 1208 THEN 'rejection'::character varying
                WHEN v_job_id = 1209 THEN 'interview'::character varying
                WHEN v_job_id = 1210 THEN 'response_received'::character varying
                WHEN v_job_id = 1211 THEN 'no_response'::character varying
                WHEN v_job_id = 1212 THEN 'offer'::character varying
                WHEN v_job_id = 1213 THEN 'no_response'::character varying
                ELSE NULL
            END
        WHERE id = v_job_id AND user_id = v_user_id;
        
        RAISE NOTICE 'Updated job % with description and outcome', v_job_id;
    END LOOP;
    
    -- ============================================================
    -- STEP 2: GET OR CREATE BASE RESUME AND COVER LETTER
    -- ============================================================
    -- Get an existing resume or create one
    SELECT id INTO v_base_resume_id
    FROM resumes
    WHERE user_id = v_user_id
    ORDER BY id DESC
    LIMIT 1;
    
    IF v_base_resume_id IS NULL THEN
        -- Create a base resume
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
    
    -- Get an existing cover letter or create one
    SELECT id INTO v_base_cover_letter_id
    FROM uploaded_cover_letters
    WHERE user_id = v_user_id
    ORDER BY id DESC
    LIMIT 1;
    
    IF v_base_cover_letter_id IS NULL THEN
        -- Create a base cover letter
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
    -- STEP 3: CREATE PUBLISHED RESUME VERSIONS A AND B
    -- ============================================================
    
    -- Create Resume Version A (published)
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
    
    -- Create Resume Version B (published)
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
    
    RAISE NOTICE 'Created published resumes: A (ID: %), B (ID: %)', v_resume_a_id, v_resume_b_id;
    
    -- Create resume_versions entries for A and B
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
    
    RAISE NOTICE 'Created resume version entries: A (version_id: %), B (version_id: %)', v_resume_version_a_id, v_resume_version_b_id;
    
    -- ============================================================
    -- STEP 4: CREATE PUBLISHED COVER LETTER VERSIONS A AND B
    -- ============================================================
    
    -- Create Cover Letter Version A (published)
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
    
    -- Create Cover Letter Version B (published)
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
    
    RAISE NOTICE 'Created published cover letters: A (ID: %), B (ID: %)', v_cover_letter_a_id, v_cover_letter_b_id;
    
    -- Create cover_letter_versions entries for A and B
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
    
    RAISE NOTICE 'Created cover letter version entries: A (version_id: %), B (version_id: %)', v_cover_letter_version_a_id, v_cover_letter_version_b_id;
    
    -- ============================================================
    -- STEP 5: LINK MATERIALS TO JOBS EVENLY (4 jobs each)
    -- ============================================================
    
    -- Link Resume A and Cover Letter A to first 4 jobs
    FOR v_counter IN 1..LEAST(4, array_length(v_job_ids, 1))
    LOOP
        v_job_id := v_job_ids[v_counter];
        
        -- Update or insert job_materials
        INSERT INTO job_materials (job_id, user_id, resume_id, cover_letter_id)
        VALUES (v_job_id, v_user_id, v_resume_a_id, v_cover_letter_a_id)
        ON CONFLICT (job_id)
        DO UPDATE SET
            resume_id = v_resume_a_id,
            cover_letter_id = v_cover_letter_a_id,
            updated_at = NOW();
        
        -- Update application_materials_history with version labels
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
        
        -- If no history entry exists, create one
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
    
    -- Link Resume B and Cover Letter B to remaining jobs
    FOR v_counter IN 5..array_length(v_job_ids, 1)
    LOOP
        v_job_id := v_job_ids[v_counter];
        
        -- Update or insert job_materials
        INSERT INTO job_materials (job_id, user_id, resume_id, cover_letter_id)
        VALUES (v_job_id, v_user_id, v_resume_b_id, v_cover_letter_b_id)
        ON CONFLICT (job_id)
        DO UPDATE SET
            resume_id = v_resume_b_id,
            cover_letter_id = v_cover_letter_b_id,
            updated_at = NOW();
        
        -- Update application_materials_history with version labels
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
        
        -- If no history entry exists, create one
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
    RAISE NOTICE 'SYNTHETIC DATA CREATION COMPLETE!';
    RAISE NOTICE '';
    RAISE NOTICE 'Resume A (ID: %) + Cover Letter A (ID: %) linked to jobs:', v_resume_a_id, v_cover_letter_a_id;
    RAISE NOTICE '  - Job 1206: Software Engineer (Offer)';
    RAISE NOTICE '  - Job 1207: Full Stack Developer (Rejected)';
    RAISE NOTICE '  - Job 1208: Frontend Engineer (Rejected)';
    RAISE NOTICE '  - Job 1209: Backend Engineer (Interview)';
    RAISE NOTICE '';
    RAISE NOTICE 'Resume B (ID: %) + Cover Letter B (ID: %) linked to jobs:', v_resume_b_id, v_cover_letter_b_id;
    RAISE NOTICE '  - Job 1210: DevOps Engineer (Phone Screen)';
    RAISE NOTICE '  - Job 1211: Data Engineer (Applied)';
    RAISE NOTICE '  - Job 1212: ML Engineer (Offer)';
    RAISE NOTICE '  - Job 1213: Product Engineer (Applied)';
    RAISE NOTICE '';
    RAISE NOTICE 'You can now test the comparison tab with this data!';
    RAISE NOTICE '============================================================';
    
END $$;

