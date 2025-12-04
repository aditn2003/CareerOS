-- Quick fix: Manually update the account_type constraint
-- Run this SQL directly in your database if the migration script fails
-- IMPORTANT: Run these commands in order, one at a time if needed

-- Step 1: Drop the old constraint FIRST (this allows us to update data)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_account_type_check;

-- Step 2: Update all team_admin to mentor (now safe since constraint is dropped)
UPDATE users SET account_type = 'mentor' WHERE account_type = 'team_admin';

-- Step 3: Add the new constraint
ALTER TABLE users ADD CONSTRAINT users_account_type_check 
  CHECK (account_type IN ('candidate', 'mentor'));

-- Step 4: Update team_members admin roles to mentor
UPDATE team_members 
SET role = 'mentor' 
WHERE role = 'admin' 
  AND user_id IN (SELECT id FROM users WHERE account_type = 'mentor');

