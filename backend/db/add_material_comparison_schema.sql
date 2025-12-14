-- ============================================================
-- APPLICATION MATERIAL COMPARISON DASHBOARD SCHEMA
-- ============================================================
-- This migration adds support for:
-- 1. Version labeling (A, B, C, etc.) for resumes and cover letters
-- 2. Application outcome tracking (response_received, interview, offer, rejection, no_response)
-- 3. Version usage tracking per application
-- ============================================================

-- ============================================================
-- 1. ADD VERSION LABELS TO RESUME VERSIONS
-- ============================================================
ALTER TABLE resume_versions
ADD COLUMN IF NOT EXISTS version_label VARCHAR(10) CHECK (version_label ~ '^[A-Z]$');

CREATE INDEX IF NOT EXISTS idx_resume_versions_label ON resume_versions(version_label) WHERE version_label IS NOT NULL;

COMMENT ON COLUMN resume_versions.version_label IS 'User-defined label for comparison (A, B, C, etc.)';

-- ============================================================
-- 2. ADD VERSION LABELS TO COVER LETTER VERSIONS
-- ============================================================
ALTER TABLE cover_letter_versions
ADD COLUMN IF NOT EXISTS version_label VARCHAR(10) CHECK (version_label ~ '^[A-Z]$');

CREATE INDEX IF NOT EXISTS idx_cover_letter_versions_label ON cover_letter_versions(version_label) WHERE version_label IS NOT NULL;

COMMENT ON COLUMN cover_letter_versions.version_label IS 'User-defined label for comparison (A, B, C, etc.)';

-- ============================================================
-- 3. ADD APPLICATION OUTCOME TRACKING TO JOBS TABLE
-- ============================================================
-- Add application_outcome column to track manual outcome marking
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS application_outcome VARCHAR(50) CHECK (
    application_outcome IN ('response_received', 'interview', 'offer', 'rejection', 'no_response', NULL)
);

CREATE INDEX IF NOT EXISTS idx_jobs_application_outcome ON jobs(application_outcome) WHERE application_outcome IS NOT NULL;

COMMENT ON COLUMN jobs.application_outcome IS 'Manually marked application outcome for material comparison';

-- Add response_received_at timestamp for calculating average time to response
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS response_received_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_jobs_response_received_at ON jobs(response_received_at) WHERE response_received_at IS NOT NULL;

COMMENT ON COLUMN jobs.response_received_at IS 'Timestamp when response was received (for calculating average time to response)';

-- ============================================================
-- 4. ENHANCE APPLICATION_MATERIALS_HISTORY WITH VERSION LABELS
-- ============================================================
-- Add version labels to track which labeled version was used
ALTER TABLE application_materials_history
ADD COLUMN IF NOT EXISTS resume_version_label VARCHAR(10) CHECK (resume_version_label ~ '^[A-Z]$' OR resume_version_label IS NULL);

ALTER TABLE application_materials_history
ADD COLUMN IF NOT EXISTS cover_letter_version_label VARCHAR(10) CHECK (cover_letter_version_label ~ '^[A-Z]$' OR cover_letter_version_label IS NULL);

CREATE INDEX IF NOT EXISTS idx_application_materials_history_resume_label ON application_materials_history(resume_version_label) WHERE resume_version_label IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_application_materials_history_cl_label ON application_materials_history(cover_letter_version_label) WHERE cover_letter_version_label IS NOT NULL;

COMMENT ON COLUMN application_materials_history.resume_version_label IS 'Label (A, B, C) of resume version used for this application';
COMMENT ON COLUMN application_materials_history.cover_letter_version_label IS 'Label (A, B, C) of cover letter version used for this application';

-- ============================================================
-- 5. CREATE HELPER FUNCTION TO GET VERSION LABEL FROM VERSION ID
-- ============================================================
CREATE OR REPLACE FUNCTION get_resume_version_label(resume_version_id INTEGER)
RETURNS VARCHAR(10) AS $$
BEGIN
    RETURN (SELECT version_label FROM resume_versions WHERE id = resume_version_id);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_cover_letter_version_label(cover_letter_version_id INTEGER)
RETURNS VARCHAR(10) AS $$
BEGIN
    RETURN (SELECT version_label FROM cover_letter_versions WHERE id = cover_letter_version_id);
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 6. CREATE VIEW FOR MATERIAL COMPARISON METRICS
-- ============================================================
CREATE OR REPLACE VIEW material_comparison_metrics AS
SELECT 
    rv.version_label AS resume_label,
    clv.version_label AS cover_letter_label,
    COUNT(DISTINCT amh.job_id) AS total_applications,
    COUNT(DISTINCT CASE WHEN j.application_outcome = 'response_received' THEN j.id END) AS responses_received,
    COUNT(DISTINCT CASE WHEN j.application_outcome = 'interview' THEN j.id END) AS interviews,
    COUNT(DISTINCT CASE WHEN j.application_outcome = 'offer' THEN j.id END) AS offers,
    COUNT(DISTINCT CASE WHEN j.application_outcome = 'rejection' THEN j.id END) AS rejections,
    COUNT(DISTINCT CASE WHEN j.application_outcome = 'no_response' THEN j.id END) AS no_responses,
    -- Calculate rates
    CASE 
        WHEN COUNT(DISTINCT amh.job_id) > 0 
        THEN ROUND(100.0 * COUNT(DISTINCT CASE WHEN j.application_outcome IN ('response_received', 'interview', 'offer') THEN j.id END) / COUNT(DISTINCT amh.job_id), 2)
        ELSE 0 
    END AS response_rate_percent,
    CASE 
        WHEN COUNT(DISTINCT CASE WHEN j.application_outcome IN ('response_received', 'interview', 'offer') THEN j.id END) > 0
        THEN ROUND(100.0 * COUNT(DISTINCT CASE WHEN j.application_outcome = 'interview' THEN j.id END) / COUNT(DISTINCT CASE WHEN j.application_outcome IN ('response_received', 'interview', 'offer') THEN j.id END), 2)
        ELSE 0 
    END AS interview_rate_percent,
    CASE 
        WHEN COUNT(DISTINCT CASE WHEN j.application_outcome = 'interview' THEN j.id END) > 0
        THEN ROUND(100.0 * COUNT(DISTINCT CASE WHEN j.application_outcome = 'offer' THEN j.id END) / COUNT(DISTINCT CASE WHEN j.application_outcome = 'interview' THEN j.id END), 2)
        ELSE 0 
    END AS offer_rate_percent,
    -- Average time to response (in days)
    CASE 
        WHEN COUNT(DISTINCT CASE WHEN j.response_received_at IS NOT NULL THEN j.id END) > 0
        THEN ROUND(AVG(EXTRACT(EPOCH FROM (j.response_received_at - j.applied_on)) / 86400.0)::numeric, 1)
        ELSE NULL 
    END AS avg_days_to_response
FROM application_materials_history amh
INNER JOIN jobs j ON j.id = amh.job_id
LEFT JOIN resume_versions rv ON rv.id = (
    SELECT id FROM resume_versions 
    WHERE resume_id = amh.resume_id 
    AND version_label = amh.resume_version_label
    LIMIT 1
)
LEFT JOIN cover_letter_versions clv ON clv.id = (
    SELECT id FROM cover_letter_versions 
    WHERE cover_letter_id = amh.cover_letter_id 
    AND version_label = amh.cover_letter_version_label
    LIMIT 1
)
WHERE amh.resume_version_label IS NOT NULL OR amh.cover_letter_version_label IS NOT NULL
GROUP BY rv.version_label, clv.version_label;

COMMENT ON VIEW material_comparison_metrics IS 'Aggregated metrics for comparing material versions (A, B, C, etc.)';

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

-- Check columns were added
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'resume_versions' AND column_name = 'version_label';

-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'jobs' AND column_name = 'application_outcome';

-- ============================================================
-- END OF MIGRATION
-- ============================================================

