-- Drop all application materials related tables
-- This script removes all the old/complex materials tables

-- Drop the new table if it exists
DROP TABLE IF EXISTS job_application_materials CASCADE;

-- Drop the history table if it exists
DROP TABLE IF EXISTS application_materials_history CASCADE;

-- Note: We keep resume_id and cover_letter_id in jobs table for backward compatibility
-- but we'll use the new clean table as the source of truth

