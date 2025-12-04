-- Migration: Add job_search_activities table for manual time tracking
-- This allows users to log activities that aren't automatically tracked

BEGIN;

-- Create job_search_activities table for manual activity logging
CREATE TABLE IF NOT EXISTS public.job_search_activities (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL CHECK (activity_type IN (
    'application', 'resume_update', 'cover_letter', 'research', 
    'networking', 'interview_prep', 'mock_interview', 'coding_practice',
    'skill_learning', 'portfolio_update', 'linkedin_optimization',
    'follow_up', 'phone_screen', 'interview', 'salary_negotiation', 'other'
  )),
  title VARCHAR(255),
  description TEXT,
  company VARCHAR(255),
  job_title VARCHAR(255),
  duration_minutes INTEGER NOT NULL DEFAULT 0,
  activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
  start_time TIME,
  end_time TIME,
  energy_level INTEGER CHECK (energy_level >= 1 AND energy_level <= 5),
  productivity_rating INTEGER CHECK (productivity_rating >= 1 AND productivity_rating <= 5),
  notes TEXT,
  tags TEXT[],
  is_completed BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_job_search_activities_user_id ON public.job_search_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_job_search_activities_activity_date ON public.job_search_activities(activity_date);
CREATE INDEX IF NOT EXISTS idx_job_search_activities_activity_type ON public.job_search_activities(activity_type);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_job_search_activities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS trigger_update_job_search_activities_updated_at ON public.job_search_activities;
CREATE TRIGGER trigger_update_job_search_activities_updated_at
  BEFORE UPDATE ON public.job_search_activities
  FOR EACH ROW
  EXECUTE FUNCTION update_job_search_activities_updated_at();

COMMIT;

