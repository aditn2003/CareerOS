-- Add reminder_sent column to scheduled_submissions if it doesn't exist
ALTER TABLE scheduled_submissions 
ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT false;

-- Add index for efficient reminder processing queries
CREATE INDEX IF NOT EXISTS idx_scheduled_submissions_reminder 
ON scheduled_submissions (status, reminder_sent, scheduled_date, scheduled_time);

SELECT '✅ reminder_sent column added to scheduled_submissions' AS status;
