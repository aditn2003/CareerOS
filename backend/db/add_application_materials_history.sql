-- ============================================================
-- APPLICATION MATERIALS HISTORY TABLE
-- ============================================================
-- This table tracks all changes to resumes and cover letters
-- used for each job application over time.
-- 
-- Purpose:
-- - Track which resume/cover letter was used for each job
-- - Maintain history of material changes for analytics
-- - Support success analysis and material effectiveness tracking
-- - Works with the job_materials table (current state) to track history
-- ============================================================

-- Drop table if exists (use with caution in production)
-- DROP TABLE IF EXISTS application_materials_history CASCADE;

-- Create the application_materials_history table
-- Note: This table works alongside job_materials table
-- job_materials stores the CURRENT state (one-to-one with jobs)
-- application_materials_history stores the HISTORY of all changes
CREATE TABLE IF NOT EXISTS application_materials_history (
    -- Primary Key
    id SERIAL PRIMARY KEY,
    
    -- Foreign Keys
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    
    -- Material References (can be NULL if material was removed)
    -- Note: References uploaded_cover_letters to match job_materials table
    resume_id INTEGER REFERENCES resumes(id) ON DELETE SET NULL,
    cover_letter_id INTEGER REFERENCES uploaded_cover_letters(id) ON DELETE SET NULL,
    
    -- Action Tracking
    action TEXT NOT NULL DEFAULT 'initial_set',
    -- Possible actions: 'initial_set', 'updated', 'removed', 'changed_resume', 'changed_cover_letter', 'both_changed'
    
    -- Additional Details (JSONB for flexibility)
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- Can store: previous_resume_id, previous_cover_letter_id, customization_level, etc.
    
    -- Timestamp
    changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT check_action_valid CHECK (
        action IN ('initial_set', 'updated', 'removed', 'changed_resume', 'changed_cover_letter', 'both_changed')
    ),
    CONSTRAINT check_at_least_one_material CHECK (
        resume_id IS NOT NULL OR cover_letter_id IS NOT NULL
    )
);

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================

-- Index on job_id (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_application_materials_history_job_id 
    ON application_materials_history(job_id);

-- Index on user_id (for user-specific queries)
CREATE INDEX IF NOT EXISTS idx_application_materials_history_user_id 
    ON application_materials_history(user_id);

-- Index on changed_at (for chronological queries)
CREATE INDEX IF NOT EXISTS idx_application_materials_history_changed_at 
    ON application_materials_history(changed_at DESC);

-- Index on resume_id (for resume effectiveness analysis)
CREATE INDEX IF NOT EXISTS idx_application_materials_history_resume_id 
    ON application_materials_history(resume_id) 
    WHERE resume_id IS NOT NULL;

-- Index on cover_letter_id (for cover letter effectiveness analysis)
CREATE INDEX IF NOT EXISTS idx_application_materials_history_cover_letter_id 
    ON application_materials_history(cover_letter_id) 
    WHERE cover_letter_id IS NOT NULL;

-- Composite index for common query patterns (job + timestamp)
CREATE INDEX IF NOT EXISTS idx_application_materials_history_job_changed 
    ON application_materials_history(job_id, changed_at DESC);

-- Composite index for user + timestamp queries
CREATE INDEX IF NOT EXISTS idx_application_materials_history_user_changed 
    ON application_materials_history(user_id, changed_at DESC);

-- ============================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================

COMMENT ON TABLE application_materials_history IS 
    'Tracks all changes to resumes and cover letters used for job applications over time. Works with job_materials table which stores current state.';

COMMENT ON COLUMN application_materials_history.id IS 
    'Primary key, auto-incrementing';

COMMENT ON COLUMN application_materials_history.user_id IS 
    'Foreign key to users table, cascades on delete';

COMMENT ON COLUMN application_materials_history.job_id IS 
    'Foreign key to jobs table, cascades on delete';

COMMENT ON COLUMN application_materials_history.resume_id IS 
    'Foreign key to resumes table, can be NULL if resume was removed';

COMMENT ON COLUMN application_materials_history.cover_letter_id IS 
    'Foreign key to uploaded_cover_letters table (matches job_materials), can be NULL if cover letter was removed';

COMMENT ON COLUMN application_materials_history.action IS 
    'Type of action: initial_set, updated, removed, changed_resume, changed_cover_letter, both_changed';

COMMENT ON COLUMN application_materials_history.details IS 
    'JSONB field for storing additional metadata like previous values, customization levels, etc.';

COMMENT ON COLUMN application_materials_history.changed_at IS 
    'Timestamp when the change occurred, defaults to NOW()';

-- ============================================================
-- TRIGGER FUNCTION TO AUTO-CREATE HISTORY ON job_materials CHANGES
-- ============================================================
-- This trigger automatically creates history entries when job_materials is updated

CREATE OR REPLACE FUNCTION create_materials_history()
RETURNS TRIGGER AS $$
DECLARE
    action_type TEXT;
    prev_resume_id INTEGER;
    prev_cover_letter_id INTEGER;
BEGIN
    -- Determine action type based on what changed
    IF TG_OP = 'INSERT' THEN
        action_type := 'initial_set';
        prev_resume_id := NULL;
        prev_cover_letter_id := NULL;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Check what changed
        IF OLD.resume_id IS DISTINCT FROM NEW.resume_id AND OLD.cover_letter_id IS DISTINCT FROM NEW.cover_letter_id THEN
            action_type := 'both_changed';
        ELSIF OLD.resume_id IS DISTINCT FROM NEW.resume_id THEN
            action_type := 'changed_resume';
        ELSIF OLD.cover_letter_id IS DISTINCT FROM NEW.cover_letter_id THEN
            action_type := 'changed_cover_letter';
        ELSE
            action_type := 'updated';
        END IF;
        prev_resume_id := OLD.resume_id;
        prev_cover_letter_id := OLD.cover_letter_id;
    END IF;

    -- Insert history record
    INSERT INTO application_materials_history (
        user_id,
        job_id,
        resume_id,
        cover_letter_id,
        action,
        details
    ) VALUES (
        NEW.user_id,
        NEW.job_id,
        NEW.resume_id,
        NEW.cover_letter_id,
        action_type,
        jsonb_build_object(
            'previous_resume_id', prev_resume_id,
            'previous_cover_letter_id', prev_cover_letter_id
        )
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on job_materials table
DROP TRIGGER IF EXISTS trigger_create_materials_history ON job_materials;
CREATE TRIGGER trigger_create_materials_history
    AFTER INSERT OR UPDATE ON job_materials
    FOR EACH ROW
    EXECUTE FUNCTION create_materials_history();

-- ============================================================
-- EXAMPLE USAGE
-- ============================================================

-- Example 1: Get current materials from job_materials
-- SELECT 
--     jm.*,
--     r.title AS resume_title,
--     ucl.name AS cover_letter_name
-- FROM job_materials jm
-- LEFT JOIN resumes r ON r.id = jm.resume_id
-- LEFT JOIN uploaded_cover_letters ucl ON ucl.id = jm.cover_letter_id
-- WHERE jm.job_id = 100;

-- Example 2: Get full history for a job
-- SELECT 
--     amh.*,
--     r.title AS resume_title,
--     ucl.name AS cover_letter_name
-- FROM application_materials_history amh
-- LEFT JOIN resumes r ON r.id = amh.resume_id
-- LEFT JOIN uploaded_cover_letters ucl ON ucl.id = amh.cover_letter_id
-- WHERE amh.job_id = 100
-- ORDER BY amh.changed_at DESC;

-- Example 3: Get latest materials for a job (from history)
-- SELECT 
--     amh.*,
--     r.title AS resume_title,
--     ucl.name AS cover_letter_name
-- FROM application_materials_history amh
-- LEFT JOIN resumes r ON r.id = amh.resume_id
-- LEFT JOIN uploaded_cover_letters ucl ON ucl.id = amh.cover_letter_id
-- WHERE amh.job_id = 100
-- ORDER BY amh.changed_at DESC
-- LIMIT 1;

-- Example 4: Get all jobs using a specific resume (from history)
-- SELECT DISTINCT j.*
-- FROM jobs j
-- INNER JOIN application_materials_history amh ON j.id = amh.job_id
-- WHERE amh.resume_id = 5
--   AND amh.changed_at = (
--       SELECT MAX(changed_at) 
--       FROM application_materials_history 
--       WHERE job_id = j.id
--   );

-- Example 5: Compare current state (job_materials) with history
-- SELECT 
--     jm.job_id,
--     jm.resume_id AS current_resume_id,
--     jm.cover_letter_id AS current_cover_letter_id,
--     amh.resume_id AS historical_resume_id,
--     amh.cover_letter_id AS historical_cover_letter_id,
--     amh.changed_at AS last_change
-- FROM job_materials jm
-- LEFT JOIN LATERAL (
--     SELECT resume_id, cover_letter_id, changed_at
--     FROM application_materials_history
--     WHERE job_id = jm.job_id
--     ORDER BY changed_at DESC
--     LIMIT 1
-- ) amh ON true
-- WHERE jm.job_id = 100;

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

-- Check table exists and structure
-- SELECT 
--     column_name, 
--     data_type, 
--     is_nullable, 
--     column_default
-- FROM information_schema.columns
-- WHERE table_name = 'application_materials_history'
-- ORDER BY ordinal_position;

-- Check indexes
-- SELECT 
--     indexname, 
--     indexdef
-- FROM pg_indexes
-- WHERE tablename = 'application_materials_history';

-- Count records
-- SELECT COUNT(*) as total_records FROM application_materials_history;

-- Check trigger exists
-- SELECT 
--     trigger_name,
--     event_manipulation,
--     event_object_table,
--     action_statement
-- FROM information_schema.triggers
-- WHERE trigger_name = 'trigger_create_materials_history';

-- ============================================================
-- MIGRATION: Backfill history from existing job_materials
-- ============================================================
-- If you have existing job_materials records, run this to create initial history entries

-- INSERT INTO application_materials_history (user_id, job_id, resume_id, cover_letter_id, action, details)
-- SELECT 
--     user_id,
--     job_id,
--     resume_id,
--     cover_letter_id,
--     'initial_set' as action,
--     '{}'::jsonb as details
-- FROM job_materials
-- WHERE resume_id IS NOT NULL OR cover_letter_id IS NOT NULL
-- ON CONFLICT DO NOTHING;

-- ============================================================
-- END OF SCRIPT
-- ============================================================
