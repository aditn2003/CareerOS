-- ============================================================
-- Add Private Repository Preference to GitHub Settings
-- Stage 9: Private Repository Handling
-- ============================================================

-- Add column to store user's preference for including private repositories
ALTER TABLE github_user_settings
ADD COLUMN IF NOT EXISTS include_private_repos BOOLEAN DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN github_user_settings.include_private_repos IS 
'User preference: If true, private repositories will be synced and displayed. Requires github_token.';

