-- Migration: Add threaded replies to mentor feedback
-- This migration is idempotent and safe to rerun.
BEGIN;

-- Create feedback_replies table for threaded conversations
CREATE TABLE IF NOT EXISTS public.feedback_replies (
  id serial PRIMARY KEY,
  feedback_id integer NOT NULL REFERENCES public.mentor_feedback(id) ON DELETE CASCADE,
  user_id integer NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  parent_reply_id integer REFERENCES public.feedback_replies(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
  -- Note: User permission validation is handled at application level in routes
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_feedback_replies_feedback_id ON public.feedback_replies(feedback_id);
CREATE INDEX IF NOT EXISTS idx_feedback_replies_user_id ON public.feedback_replies(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_replies_parent_reply_id ON public.feedback_replies(parent_reply_id);
CREATE INDEX IF NOT EXISTS idx_feedback_replies_created_at ON public.feedback_replies(created_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_feedback_replies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS trigger_update_feedback_replies_updated_at ON public.feedback_replies;
CREATE TRIGGER trigger_update_feedback_replies_updated_at
  BEFORE UPDATE ON public.feedback_replies
  FOR EACH ROW
  EXECUTE FUNCTION update_feedback_replies_updated_at();

COMMIT;

