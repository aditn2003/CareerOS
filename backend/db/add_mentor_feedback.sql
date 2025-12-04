-- Migration: Add mentor feedback system
-- This migration is idempotent and safe to rerun.
BEGIN;

-- Check if table exists, if not create it
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'mentor_feedback') THEN
    -- Create mentor_feedback table
    CREATE TABLE public.mentor_feedback (
      id serial PRIMARY KEY,
      team_id integer NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
      mentor_id integer NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      candidate_id integer NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      job_id integer REFERENCES public.jobs(id) ON DELETE SET NULL,
      feedback_type text NOT NULL CHECK (feedback_type IN ('job', 'skill', 'general')),
      content text NOT NULL,
      skill_name text, -- Only used when feedback_type = 'skill'
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
      -- Note: Team membership validation is handled at application level in routes
    );
  ELSE
    -- Table exists, check and add missing columns
    -- Add team_id if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'mentor_feedback' 
                   AND column_name = 'team_id') THEN
      -- First add as nullable to allow existing rows
      ALTER TABLE public.mentor_feedback 
      ADD COLUMN team_id integer REFERENCES public.teams(id) ON DELETE CASCADE;
      
      -- If there are existing rows, you'll need to set team_id manually
      -- For now, we'll leave it nullable if there's data
      -- You can make it NOT NULL later after populating the data:
      -- ALTER TABLE public.mentor_feedback ALTER COLUMN team_id SET NOT NULL;
    END IF;
    
    -- Add candidate_id if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'mentor_feedback' 
                   AND column_name = 'candidate_id') THEN
      ALTER TABLE public.mentor_feedback 
      ADD COLUMN candidate_id integer REFERENCES public.users(id) ON DELETE CASCADE;
    END IF;
    
    -- Add mentor_id if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'mentor_feedback' 
                   AND column_name = 'mentor_id') THEN
      ALTER TABLE public.mentor_feedback 
      ADD COLUMN mentor_id integer REFERENCES public.users(id) ON DELETE CASCADE;
    END IF;
    
    -- Add other columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'mentor_feedback' 
                   AND column_name = 'job_id') THEN
      ALTER TABLE public.mentor_feedback 
      ADD COLUMN job_id integer REFERENCES public.jobs(id) ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'mentor_feedback' 
                   AND column_name = 'feedback_type') THEN
      ALTER TABLE public.mentor_feedback 
      ADD COLUMN feedback_type text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'mentor_feedback' 
                   AND column_name = 'content') THEN
      ALTER TABLE public.mentor_feedback 
      ADD COLUMN content text NOT NULL DEFAULT '';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'mentor_feedback' 
                   AND column_name = 'skill_name') THEN
      ALTER TABLE public.mentor_feedback 
      ADD COLUMN skill_name text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'mentor_feedback' 
                   AND column_name = 'created_at') THEN
      ALTER TABLE public.mentor_feedback 
      ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'mentor_feedback' 
                   AND column_name = 'updated_at') THEN
      ALTER TABLE public.mentor_feedback 
      ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
    END IF;
    
    -- Add task_id if it doesn't exist (for task-linked feedback)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'mentor_feedback' 
                   AND column_name = 'task_id') THEN
      ALTER TABLE public.mentor_feedback 
      ADD COLUMN task_id integer REFERENCES public.tasks(id) ON DELETE SET NULL;
    END IF;
    
    -- Make relationship_id nullable if it exists and is NOT NULL
    -- This column may exist from an older schema but isn't used in current implementation
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'public' 
               AND table_name = 'mentor_feedback' 
               AND column_name = 'relationship_id') THEN
      -- Check if it's NOT NULL and make it nullable
      IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'mentor_feedback' 
        AND column_name = 'relationship_id'
        AND is_nullable = 'NO'
      ) THEN
        ALTER TABLE public.mentor_feedback 
        ALTER COLUMN relationship_id DROP NOT NULL;
      END IF;
    END IF;
  END IF;
END $$;

-- Always update the feedback_type constraint to ensure it has the correct values
-- This must run after all columns are added
DO $$
BEGIN
  -- Drop existing constraint if it exists
  ALTER TABLE public.mentor_feedback
  DROP CONSTRAINT IF EXISTS mentor_feedback_feedback_type_check;
  
  -- Check if task_id column exists to determine if we should include 'task' in the constraint
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_schema = 'public' 
             AND table_name = 'mentor_feedback' 
             AND column_name = 'task_id') THEN
    -- Include 'task' in the constraint
    ALTER TABLE public.mentor_feedback
    ADD CONSTRAINT mentor_feedback_feedback_type_check
    CHECK (feedback_type IN ('job', 'skill', 'general', 'task'));
  ELSE
    -- Don't include 'task' if task_id column doesn't exist
    ALTER TABLE public.mentor_feedback
    ADD CONSTRAINT mentor_feedback_feedback_type_check
    CHECK (feedback_type IN ('job', 'skill', 'general'));
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- If constraint creation fails, try with just the basic three types
    ALTER TABLE public.mentor_feedback
    DROP CONSTRAINT IF EXISTS mentor_feedback_feedback_type_check;
    ALTER TABLE public.mentor_feedback
    ADD CONSTRAINT mentor_feedback_feedback_type_check
    CHECK (feedback_type IN ('job', 'skill', 'general'));
END $$;

-- Add indexes for performance (only if columns exist)
DO $$
BEGIN
  -- Check if team_id exists before creating index
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_schema = 'public' 
             AND table_name = 'mentor_feedback' 
             AND column_name = 'team_id') THEN
    CREATE INDEX IF NOT EXISTS idx_mentor_feedback_team_id ON public.mentor_feedback(team_id);
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_schema = 'public' 
             AND table_name = 'mentor_feedback' 
             AND column_name = 'candidate_id') THEN
    CREATE INDEX IF NOT EXISTS idx_mentor_feedback_candidate_id ON public.mentor_feedback(candidate_id);
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_schema = 'public' 
             AND table_name = 'mentor_feedback' 
             AND column_name = 'mentor_id') THEN
    CREATE INDEX IF NOT EXISTS idx_mentor_feedback_mentor_id ON public.mentor_feedback(mentor_id);
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_schema = 'public' 
             AND table_name = 'mentor_feedback' 
             AND column_name = 'job_id') THEN
    CREATE INDEX IF NOT EXISTS idx_mentor_feedback_job_id ON public.mentor_feedback(job_id);
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_schema = 'public' 
             AND table_name = 'mentor_feedback' 
             AND column_name = 'feedback_type') THEN
    CREATE INDEX IF NOT EXISTS idx_mentor_feedback_type ON public.mentor_feedback(feedback_type);
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_schema = 'public' 
             AND table_name = 'mentor_feedback' 
             AND column_name = 'task_id') THEN
    CREATE INDEX IF NOT EXISTS idx_mentor_feedback_task_id ON public.mentor_feedback(task_id);
  END IF;
END $$;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_mentor_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS trigger_update_mentor_feedback_updated_at ON public.mentor_feedback;
CREATE TRIGGER trigger_update_mentor_feedback_updated_at
  BEFORE UPDATE ON public.mentor_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_mentor_feedback_updated_at();

-- Fix foreign key constraints to ensure they reference users table, not mentors table
DO $$
BEGIN
  -- Drop existing incorrect foreign key constraints if they exist
  ALTER TABLE public.mentor_feedback
  DROP CONSTRAINT IF EXISTS mentor_feedback_mentor_id_fkey;
  
  ALTER TABLE public.mentor_feedback
  DROP CONSTRAINT IF EXISTS mentor_feedback_candidate_id_fkey;
  
  -- Recreate with correct references to users table
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_schema = 'public' 
             AND table_name = 'mentor_feedback' 
             AND column_name = 'mentor_id') THEN
    ALTER TABLE public.mentor_feedback
    ADD CONSTRAINT mentor_feedback_mentor_id_fkey
    FOREIGN KEY (mentor_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_schema = 'public' 
             AND table_name = 'mentor_feedback' 
             AND column_name = 'candidate_id') THEN
    ALTER TABLE public.mentor_feedback
    ADD CONSTRAINT mentor_feedback_candidate_id_fkey
    FOREIGN KEY (candidate_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

COMMIT;

