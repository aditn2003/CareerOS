-- Fix jobs with invalid "status_change" status
-- This script updates jobs that have "status_change" as their status to a valid default status

-- First, let's see which jobs have invalid statuses
SELECT id, title, company, status, status_updated_at, created_at
FROM jobs
WHERE status = 'status_change' OR status = 'Status_change' OR status = 'STATUS_CHANGE'
ORDER BY id;

-- Update jobs with "status_change" to "Interested" (default status)
-- You can change 'Interested' to any other valid status if needed
UPDATE jobs
SET status = 'Interested',
    status_updated_at = NOW()
WHERE status IN ('status_change', 'Status_change', 'STATUS_CHANGE')
   OR (status IS NOT NULL AND status NOT IN ('Interested', 'Applied', 'Phone Screen', 'Interview', 'Offer', 'Rejected'));

-- Verify the fix
SELECT id, title, company, status, status_updated_at
FROM jobs
WHERE id IN (1092, 350)
ORDER BY id;

-- Show summary of all statuses after fix
SELECT status, COUNT(*) as count
FROM jobs
WHERE "isArchived" = false OR "isArchived" IS NULL
GROUP BY status
ORDER BY count DESC;

