-- Fix timing_ab_tests.winner column size
-- The 'inconclusive' value is 12 characters, but the column was VARCHAR(10)
-- This migration increases it to VARCHAR(20) to accommodate all possible values

ALTER TABLE timing_ab_tests 
ALTER COLUMN winner TYPE VARCHAR(20);

