-- ============================================================
-- DIAGNOSTIC QUERY TO FIND DUPLICATE VERSIONS
-- ============================================================
-- This will help identify why there are duplicate versions with labels A and B

-- 1. Check all resume versions for user 552
SELECT 
    rv.id AS version_id,
    rv.resume_id,
    r.title AS base_resume_title,
    rv.version_number,
    rv.version_label,
    rv.is_published,
    rv.published_resume_id,
    published_r.title AS published_resume_title,
    rv.created_at
FROM resume_versions rv
INNER JOIN resumes r ON r.id = rv.resume_id
LEFT JOIN resumes published_r ON published_r.id = rv.published_resume_id
WHERE rv.user_id = 552
ORDER BY rv.resume_id, rv.version_number, rv.version_label;

-- 2. Check all cover letter versions for user 552
SELECT 
    clv.id AS version_id,
    clv.cover_letter_id,
    ucl.title AS base_cover_letter_title,
    clv.version_number,
    clv.version_label,
    clv.is_published,
    clv.published_cover_letter_id,
    published_cl.title AS published_cover_letter_title,
    clv.created_at
FROM cover_letter_versions clv
INNER JOIN uploaded_cover_letters ucl ON ucl.id = clv.cover_letter_id
LEFT JOIN uploaded_cover_letters published_cl ON published_cl.id = clv.published_cover_letter_id
WHERE clv.user_id = 552
ORDER BY clv.cover_letter_id, clv.version_number, clv.version_label;

-- 3. Count versions by label
SELECT 
    version_label,
    COUNT(*) as count,
    STRING_AGG(DISTINCT resume_id::text, ', ') as resume_ids
FROM resume_versions
WHERE user_id = 552 AND version_label IS NOT NULL
GROUP BY version_label
ORDER BY version_label;

-- 4. Count cover letter versions by label
SELECT 
    version_label,
    COUNT(*) as count,
    STRING_AGG(DISTINCT cover_letter_id::text, ', ') as cover_letter_ids
FROM cover_letter_versions
WHERE user_id = 552 AND version_label IS NOT NULL
GROUP BY version_label
ORDER BY version_label;

-- 5. Find all base resumes for user 552
SELECT 
    id,
    title,
    is_version,
    original_resume_id,
    version_number,
    description,
    created_at
FROM resumes
WHERE user_id = 552
ORDER BY created_at;

-- 6. Find all base cover letters for user 552
SELECT 
    id,
    title,
    description,
    created_at
FROM uploaded_cover_letters
WHERE user_id = 552
ORDER BY created_at;

