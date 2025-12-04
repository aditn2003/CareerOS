-- ============================================================
-- JOB MATERIALS TABLE
-- ============================================================
-- This table stores the current resume and cover letter
-- associations for each job application (one-to-one with jobs).
-- 
-- Purpose:
-- - Track which resume/cover letter is currently linked to each job
-- - One-to-one relationship with jobs (unique constraint on job_id)
-- - Works with application_materials_history for tracking changes
-- ============================================================

-- Drop table if exists (use with caution in production)
-- DROP TABLE IF EXISTS job_materials CASCADE;

-- Create the job_materials table
CREATE TABLE IF NOT EXISTS public.job_materials (
  id SERIAL NOT NULL,
  job_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  resume_id INTEGER NULL,
  cover_letter_id INTEGER NULL,
  created_at TIMESTAMP WITHOUT TIME ZONE NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE NULL DEFAULT NOW(),
  
  CONSTRAINT job_materials_pkey PRIMARY KEY (id),
  CONSTRAINT unique_job_materials UNIQUE (job_id),
  
  CONSTRAINT job_materials_cover_letter_id_fkey 
    FOREIGN KEY (cover_letter_id) 
    REFERENCES uploaded_cover_letters (id) 
    ON DELETE SET NULL,
  
  CONSTRAINT job_materials_job_id_fkey 
    FOREIGN KEY (job_id) 
    REFERENCES jobs (id) 
    ON DELETE CASCADE,
  
  CONSTRAINT job_materials_resume_id_fkey 
    FOREIGN KEY (resume_id) 
    REFERENCES resumes (id) 
    ON DELETE SET NULL,
  
  CONSTRAINT job_materials_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES users (id) 
    ON DELETE CASCADE
) TABLESPACE pg_default;

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_job_materials_job_id 
  ON public.job_materials USING btree (job_id) 
  TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_job_materials_user_id 
  ON public.job_materials USING btree (user_id) 
  TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_job_materials_resume_id 
  ON public.job_materials USING btree (resume_id) 
  TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_job_materials_cover_letter_id 
  ON public.job_materials USING btree (cover_letter_id) 
  TABLESPACE pg_default;

-- Composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_job_materials_user_job 
  ON public.job_materials USING btree (user_id, job_id) 
  TABLESPACE pg_default;

-- ============================================================
-- TRIGGER FUNCTION: Update updated_at timestamp
-- ============================================================

CREATE OR REPLACE FUNCTION update_job_materials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TRIGGER FUNCTION: Create materials history (if table exists)
-- ============================================================
-- This function is defined in add_application_materials_history.sql
-- But we'll check if it exists and create it if needed

CREATE OR REPLACE FUNCTION create_materials_history()
RETURNS TRIGGER AS $$
DECLARE
  action_type TEXT;
  prev_resume_id INTEGER;
  prev_cover_letter_id INTEGER;
  history_table_exists BOOLEAN;
BEGIN
  -- Check if application_materials_history table exists
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'application_materials_history'
  ) INTO history_table_exists;
  
  IF NOT history_table_exists THEN
    -- Table doesn't exist, just return
    RETURN NEW;
  END IF;
  
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

  -- Only insert history if at least one material is set
  IF NEW.resume_id IS NOT NULL OR NEW.cover_letter_id IS NOT NULL THEN
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
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Trigger to update updated_at timestamp
DROP TRIGGER IF EXISTS trigger_update_job_materials_updated_at ON job_materials;
CREATE TRIGGER trigger_update_job_materials_updated_at
  BEFORE UPDATE ON job_materials
  FOR EACH ROW
  EXECUTE FUNCTION update_job_materials_updated_at();

-- Trigger to create materials history
DROP TRIGGER IF EXISTS trigger_create_materials_history ON job_materials;
CREATE TRIGGER trigger_create_materials_history
  AFTER INSERT OR UPDATE ON job_materials
  FOR EACH ROW
  EXECUTE FUNCTION create_materials_history();

-- ============================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================

COMMENT ON TABLE job_materials IS 
  'Stores current resume and cover letter associations for each job (one-to-one with jobs)';

COMMENT ON COLUMN job_materials.id IS 
  'Primary key, auto-incrementing';

COMMENT ON COLUMN job_materials.job_id IS 
  'Foreign key to jobs table, unique constraint ensures one-to-one relationship, cascades on delete';

COMMENT ON COLUMN job_materials.user_id IS 
  'Foreign key to users table, cascades on delete';

COMMENT ON COLUMN job_materials.resume_id IS 
  'Foreign key to resumes table, can be NULL if no resume linked, set to null on delete';

COMMENT ON COLUMN job_materials.cover_letter_id IS 
  'Foreign key to uploaded_cover_letters table, can be NULL if no cover letter linked, set to null on delete';

COMMENT ON COLUMN job_materials.created_at IS 
  'Timestamp when the record was created, defaults to NOW()';

COMMENT ON COLUMN job_materials.updated_at IS 
  'Timestamp when the record was last updated, automatically updated by trigger';

-- ============================================================
-- EXAMPLE USAGE
-- ============================================================

-- Example 1: Link resume and cover letter to a job
-- INSERT INTO job_materials (job_id, user_id, resume_id, cover_letter_id)
-- VALUES (100, 1, 5, 3)
-- ON CONFLICT (job_id) 
-- DO UPDATE SET 
--   resume_id = EXCLUDED.resume_id,
--   cover_letter_id = EXCLUDED.cover_letter_id,
--   updated_at = NOW();

-- Example 2: Update resume for a job
-- UPDATE job_materials
-- SET resume_id = 7, updated_at = NOW()
-- WHERE job_id = 100 AND user_id = 1;

-- Example 3: Get current materials for a job
-- SELECT 
--   jm.*,
--   r.title AS resume_title,
--   ucl.name AS cover_letter_name
-- FROM job_materials jm
-- LEFT JOIN resumes r ON r.id = jm.resume_id
-- LEFT JOIN uploaded_cover_letters ucl ON ucl.id = jm.cover_letter_id
-- WHERE jm.job_id = 100;

-- Example 4: Get all jobs using a specific resume
-- SELECT j.*
-- FROM jobs j
-- INNER JOIN job_materials jm ON j.id = jm.job_id
-- WHERE jm.resume_id = 5
--   AND j.user_id = 1;

-- Example 5: Get all jobs with materials linked
-- SELECT 
--   j.id,
--   j.company,
--   j.title,
--   jm.resume_id,
--   jm.cover_letter_id
-- FROM jobs j
-- INNER JOIN job_materials jm ON j.id = jm.job_id
-- WHERE j.user_id = 1
--   AND (jm.resume_id IS NOT NULL OR jm.cover_letter_id IS NOT NULL);

-- ============================================================
-- MIGRATION: Backfill job_materials from existing data
-- ============================================================
-- If you have existing jobs with resume_id/cover_letter_id in the jobs table,
-- you can migrate them to job_materials:

-- INSERT INTO job_materials (job_id, user_id, resume_id, cover_letter_id)
-- SELECT 
--   id AS job_id,
--   user_id,
--   resume_id,
--   cover_letter_id
-- FROM jobs
-- WHERE (resume_id IS NOT NULL OR cover_letter_id IS NOT NULL)
--   AND id NOT IN (SELECT job_id FROM job_materials WHERE job_id IS NOT NULL)
-- ON CONFLICT (job_id) DO NOTHING;

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

-- Check table exists and structure
-- SELECT 
--   column_name, 
--   data_type, 
--   is_nullable, 
--   column_default
-- FROM information_schema.columns
-- WHERE table_name = 'job_materials'
-- ORDER BY ordinal_position;

-- Check indexes
-- SELECT 
--   indexname, 
--   indexdef
-- FROM pg_indexes
-- WHERE tablename = 'job_materials';

-- Check constraints
-- SELECT 
--   conname AS constraint_name,
--   contype AS constraint_type,
--   pg_get_constraintdef(oid) AS constraint_definition
-- FROM pg_constraint
-- WHERE conrelid = 'job_materials'::regclass;

-- Check triggers
-- SELECT 
--   trigger_name,
--   event_manipulation,
--   event_object_table,
--   action_statement
-- FROM information_schema.triggers
-- WHERE event_object_table = 'job_materials';

-- Count records
-- SELECT COUNT(*) as total_records FROM job_materials;

-- Check for jobs without materials
-- SELECT j.id, j.company, j.title
-- FROM jobs j
-- LEFT JOIN job_materials jm ON j.id = jm.job_id
-- WHERE jm.id IS NULL
--   AND j.user_id = 1;

-- ============================================================
-- END OF SCRIPT
-- ============================================================

