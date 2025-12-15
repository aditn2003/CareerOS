-- ============================================================
-- CLEANUP SCRIPT TO REMOVE DUPLICATE VERSIONS
-- ============================================================
-- This script will:
-- 1. Keep only one set of versions (A and B) per user
-- 2. Prefer versions that are linked to jobs
-- 3. Remove duplicate versions
-- ============================================================

DO $$
DECLARE
    v_user_id INTEGER := 552;
    v_resume_ids_to_keep INTEGER[];
    v_cover_letter_ids_to_keep INTEGER[];
    v_version_id INTEGER;
    v_resume_id INTEGER;
    v_cover_letter_id INTEGER;
BEGIN
    RAISE NOTICE 'Starting cleanup for user %', v_user_id;
    
    -- ============================================================
    -- STEP 1: FIND AND KEEP BEST RESUME VERSIONS
    -- ============================================================
    -- Strategy: Keep versions that are linked to jobs (via application_materials_history)
    -- If multiple versions with same label exist, keep the one with most job links
    
    RAISE NOTICE 'Finding resume versions to keep...';
    
    -- Find the resume_id that has versions linked to the most jobs
    SELECT resume_id INTO v_resume_id
    FROM (
        SELECT 
            rv.resume_id,
            COUNT(DISTINCT amh.job_id) as job_count
        FROM resume_versions rv
        LEFT JOIN application_materials_history amh 
            ON amh.resume_id = COALESCE(rv.published_resume_id, rv.resume_id)
            AND amh.user_id = v_user_id
            AND amh.resume_version_label = rv.version_label
        WHERE rv.user_id = v_user_id 
          AND rv.version_label IN ('A', 'B')
          AND COALESCE(rv.is_published, FALSE) = TRUE
        GROUP BY rv.resume_id
        ORDER BY job_count DESC, MAX(rv.created_at) DESC
        LIMIT 1
    ) ranked;
    
    -- If no resume found with job links, use the most recent one
    IF v_resume_id IS NULL THEN
        SELECT resume_id INTO v_resume_id
        FROM resume_versions
        WHERE user_id = v_user_id 
          AND version_label IN ('A', 'B')
          AND COALESCE(is_published, FALSE) = TRUE
        GROUP BY resume_id
        ORDER BY MAX(created_at) DESC
        LIMIT 1;
    END IF;
    
    -- Keep all versions (A and B) for this resume_id
    IF v_resume_id IS NOT NULL THEN
        SELECT ARRAY_AGG(id) INTO v_resume_ids_to_keep
        FROM resume_versions
        WHERE resume_id = v_resume_id 
          AND user_id = v_user_id
          AND version_label IN ('A', 'B');
    END IF;
    
    RAISE NOTICE 'Keeping resume versions: %', array_to_string(v_resume_ids_to_keep, ', ');
    
    -- Delete duplicate resume versions (keep only the ones we identified)
    DELETE FROM resume_versions
    WHERE user_id = v_user_id
      AND version_label IN ('A', 'B')
      AND id != ALL(COALESCE(v_resume_ids_to_keep, ARRAY[]::INTEGER[]));
    
    GET DIAGNOSTICS v_version_id = ROW_COUNT;
    RAISE NOTICE 'Deleted % duplicate resume versions', v_version_id;
    
    -- ============================================================
    -- STEP 2: FIND AND KEEP BEST COVER LETTER VERSIONS
    -- ============================================================
    RAISE NOTICE 'Finding cover letter versions to keep...';
    
    -- Find the cover_letter_id that has versions linked to the most jobs
    SELECT cover_letter_id INTO v_cover_letter_id
    FROM (
        SELECT 
            clv.cover_letter_id,
            COUNT(DISTINCT amh.job_id) as job_count
        FROM cover_letter_versions clv
        LEFT JOIN application_materials_history amh 
            ON amh.cover_letter_id = COALESCE(clv.published_cover_letter_id, clv.cover_letter_id)
            AND amh.user_id = v_user_id
            AND amh.cover_letter_version_label = clv.version_label
        WHERE clv.user_id = v_user_id 
          AND clv.version_label IN ('A', 'B')
          AND COALESCE(clv.is_published, FALSE) = TRUE
        GROUP BY clv.cover_letter_id
        ORDER BY job_count DESC, MAX(clv.created_at) DESC
        LIMIT 1
    ) ranked;
    
    -- If no cover letter found with job links, use the most recent one
    IF v_cover_letter_id IS NULL THEN
        SELECT cover_letter_id INTO v_cover_letter_id
        FROM cover_letter_versions
        WHERE user_id = v_user_id 
          AND version_label IN ('A', 'B')
          AND COALESCE(is_published, FALSE) = TRUE
        GROUP BY cover_letter_id
        ORDER BY MAX(created_at) DESC
        LIMIT 1;
    END IF;
    
    -- Keep all versions (A and B) for this cover_letter_id
    IF v_cover_letter_id IS NOT NULL THEN
        SELECT ARRAY_AGG(id) INTO v_cover_letter_ids_to_keep
        FROM cover_letter_versions
        WHERE cover_letter_id = v_cover_letter_id 
          AND user_id = v_user_id
          AND version_label IN ('A', 'B');
    END IF;
    
    RAISE NOTICE 'Keeping cover letter versions: %', array_to_string(v_cover_letter_ids_to_keep, ', ');
    
    -- Delete duplicate cover letter versions
    DELETE FROM cover_letter_versions
    WHERE user_id = v_user_id
      AND version_label IN ('A', 'B')
      AND id != ALL(COALESCE(v_cover_letter_ids_to_keep, ARRAY[]::INTEGER[]));
    
    GET DIAGNOSTICS v_version_id = ROW_COUNT;
    RAISE NOTICE 'Deleted % duplicate cover letter versions', v_version_id;
    
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'CLEANUP COMPLETE!';
    RAISE NOTICE 'You should now have only one set of versions A and B';
    RAISE NOTICE '============================================================';
    
END $$;

-- Verify the cleanup
SELECT 
    'Resume Versions' AS type,
    version_label,
    COUNT(*) as count
FROM resume_versions
WHERE user_id = 552 AND version_label IN ('A', 'B')
GROUP BY version_label
UNION ALL
SELECT 
    'Cover Letter Versions' AS type,
    version_label,
    COUNT(*) as count
FROM cover_letter_versions
WHERE user_id = 552 AND version_label IN ('A', 'B')
GROUP BY version_label
ORDER BY type, version_label;

