-- Check which jobs are archived and identify inconsistencies
-- This helps diagnose why archived jobs might still be showing

-- Check all archive columns for a specific user (replace 1 with your user_id)
SELECT 
  id,
  title,
  company,
  status,
  "isArchived" as isArchived_camel,
  isarchived as isarchived_lower,
  is_archived as is_archived_snake,
  CASE 
    WHEN "isArchived" = true OR isarchived = true OR is_archived = true THEN 'ARCHIVED'
    ELSE 'NOT ARCHIVED'
  END as archive_status
FROM jobs
WHERE user_id = 1  -- Replace with your user_id
ORDER BY id;

-- Count jobs by archive status
SELECT 
  CASE 
    WHEN "isArchived" = true OR isarchived = true OR is_archived = true THEN 'Archived'
    ELSE 'Active'
  END as status,
  COUNT(*) as count
FROM jobs
WHERE user_id = 1  -- Replace with your user_id
GROUP BY 
  CASE 
    WHEN "isArchived" = true OR isarchived = true OR is_archived = true THEN 'Archived'
    ELSE 'Active'
  END;

-- Fix inconsistencies: If any archive column is true, set all to true
-- This ensures consistency across all archive columns
UPDATE jobs
SET 
  "isArchived" = true,
  isarchived = true,
  is_archived = true
WHERE user_id = 1  -- Replace with your user_id
  AND (
    "isArchived" = true OR 
    isarchived = true OR 
    is_archived = true
  )
  AND NOT (
    "isArchived" = true AND 
    isarchived = true AND 
    is_archived = true
  );

-- Verify the fix
SELECT 
  id,
  title,
  "isArchived" as isArchived_camel,
  isarchived as isarchived_lower,
  is_archived as is_archived_snake
FROM jobs
WHERE user_id = 1  -- Replace with your user_id
  AND (
    "isArchived" = true OR 
    isarchived = true OR 
    is_archived = true
  )
ORDER BY id;

