-- Query to gather comprehensive information about user 552 and their jobs
-- This will help us understand the current state before creating synthetic test data

-- 1. Basic user information
SELECT 
    u.id AS user_id,
    u.email,
    u.first_name,
    u.last_name,
    u.account_type,
    u.created_at AS user_created_at
FROM users u
WHERE u.id = 552;

-- 2. All jobs for user 552 with basic info
SELECT 
    j.id AS job_id,
    j.title AS job_title,
    j.company,
    j.location,
    j.status,
    j.description,
    j.industry,
    j.type,
    j.role_level,
    j.application_outcome,
    j.applied_on,
    j.response_received_at,
    j.created_at AS job_created_at
FROM jobs j
WHERE j.user_id = 552
ORDER BY j.id;

-- 3. Job materials currently linked (if any)
SELECT 
    jm.job_id,
    j.title AS job_title,
    jm.resume_id,
    r.title AS resume_title,
    jm.cover_letter_id,
    ucl.title AS cover_letter_title,
    jm.created_at AS materials_linked_at,
    jm.updated_at AS materials_updated_at
FROM job_materials jm
INNER JOIN jobs j ON j.id = jm.job_id
LEFT JOIN resumes r ON r.id = jm.resume_id
LEFT JOIN uploaded_cover_letters ucl ON ucl.id = jm.cover_letter_id
WHERE jm.user_id = 552
ORDER BY jm.job_id;

-- 4. Application materials history for user 552
SELECT 
    amh.id AS history_id,
    amh.job_id,
    j.title AS job_title,
    amh.resume_id,
    r.title AS resume_title,
    amh.cover_letter_id,
    ucl.title AS cover_letter_title,
    amh.resume_version_label,
    amh.cover_letter_version_label,
    amh.action,
    amh.changed_at
FROM application_materials_history amh
INNER JOIN jobs j ON j.id = amh.job_id
LEFT JOIN resumes r ON r.id = amh.resume_id
LEFT JOIN uploaded_cover_letters ucl ON ucl.id = amh.cover_letter_id
WHERE amh.user_id = 552
ORDER BY amh.job_id, amh.changed_at DESC;

-- 5. Existing resume versions for user 552
SELECT 
    rv.id AS version_id,
    rv.resume_id,
    r.title AS resume_title,
    rv.version_number,
    rv.version_label,
    rv.is_published,
    rv.published_resume_id,
    published_r.title AS published_resume_title,
    rv.created_at AS version_created_at
FROM resume_versions rv
INNER JOIN resumes r ON r.id = rv.resume_id
LEFT JOIN resumes published_r ON published_r.id = rv.published_resume_id
WHERE rv.user_id = 552
ORDER BY rv.resume_id, rv.version_number;

-- 6. Existing cover letter versions for user 552
SELECT 
    clv.id AS version_id,
    clv.cover_letter_id,
    ucl.title AS cover_letter_title,
    clv.version_number,
    clv.version_label,
    clv.is_published,
    clv.published_cover_letter_id,
    published_cl.title AS published_cover_letter_title,
    clv.created_at AS version_created_at
FROM cover_letter_versions clv
INNER JOIN uploaded_cover_letters ucl ON ucl.id = clv.cover_letter_id
LEFT JOIN uploaded_cover_letters published_cl ON published_cl.id = clv.published_cover_letter_id
WHERE clv.user_id = 552
ORDER BY clv.cover_letter_id, clv.version_number;

-- 7. All resumes for user 552
SELECT 
    r.id AS resume_id,
    r.title,
    r.template_name,
    r.is_version,
    r.original_resume_id,
    r.version_number,
    r.description,
    r.created_at
FROM resumes r
WHERE r.user_id = 552
ORDER BY r.id;

-- 8. All cover letters for user 552
SELECT 
    ucl.id AS cover_letter_id,
    ucl.title,
    ucl.format,
    ucl.description,
    ucl.created_at
FROM uploaded_cover_letters ucl
WHERE ucl.user_id = 552
ORDER BY ucl.id;

-- 9. Application history for user 552's jobs (for context)
SELECT 
    ah.id,
    ah.job_id,
    j.title AS job_title,
    ah.event,
    ah.from_status,
    ah.to_status,
    ah.timestamp,
    ah.meta
FROM application_history ah
INNER JOIN jobs j ON j.id = ah.job_id
WHERE ah.user_id = 552
ORDER BY ah.job_id, ah.timestamp DESC;

