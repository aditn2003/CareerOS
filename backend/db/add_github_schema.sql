-- ============================================================
-- GitHub Integration Schema
-- Stage 1: Database Schema & Setup
-- ============================================================

-- ============================================================
-- 1. GitHub User Settings Table
-- Stores user's GitHub connection settings and sync preferences
-- ============================================================
CREATE TABLE IF NOT EXISTS github_user_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    github_username VARCHAR(255),
    github_token VARCHAR(500), -- Encrypted personal access token (optional)
    auto_sync_enabled BOOLEAN DEFAULT TRUE,
    sync_frequency VARCHAR(20) DEFAULT 'daily' CHECK (sync_frequency IN ('hourly', 'daily', 'weekly')),
    last_sync_at TIMESTAMP,
    sync_status VARCHAR(20) DEFAULT 'pending' CHECK (sync_status IN ('pending', 'success', 'failed', 'in_progress')),
    sync_error TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 2. GitHub Repositories Table
-- Stores user's GitHub repositories with all metadata
-- ============================================================
CREATE TABLE IF NOT EXISTS github_repositories (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    github_username VARCHAR(255) NOT NULL,
    repository_id BIGINT NOT NULL, -- GitHub's repository ID (unique identifier)
    name VARCHAR(255) NOT NULL,
    full_name VARCHAR(500) NOT NULL, -- username/repo-name
    description TEXT,
    url VARCHAR(500), -- API URL
    html_url VARCHAR(500), -- GitHub HTML URL
    clone_url VARCHAR(500), -- Clone URL
    language VARCHAR(100), -- Primary language
    languages JSONB, -- All languages with percentages: {"JavaScript": 60, "TypeScript": 40}
    stars_count INTEGER DEFAULT 0,
    forks_count INTEGER DEFAULT 0,
    watchers_count INTEGER DEFAULT 0,
    is_private BOOLEAN DEFAULT FALSE,
    is_fork BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE, -- User-selected featured repos
    is_archived BOOLEAN DEFAULT FALSE,
    default_branch VARCHAR(100),
    created_at TIMESTAMP, -- GitHub creation date
    updated_at TIMESTAMP, -- GitHub last update
    pushed_at TIMESTAMP, -- Last push date
    local_created_at TIMESTAMP DEFAULT NOW(), -- When added to our DB
    local_updated_at TIMESTAMP DEFAULT NOW(), -- Last sync time
    UNIQUE(user_id, repository_id)
);

-- ============================================================
-- 3. GitHub Contributions Table
-- Stores daily contribution activity (commits per day)
-- ============================================================
CREATE TABLE IF NOT EXISTS github_contributions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    repository_id BIGINT NOT NULL, -- References github_repositories.repository_id
    date DATE NOT NULL,
    commit_count INTEGER DEFAULT 0,
    additions INTEGER DEFAULT 0, -- Lines added
    deletions INTEGER DEFAULT 0, -- Lines deleted
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, repository_id, date)
);

-- ============================================================
-- 4. GitHub Repository Skills Table
-- Many-to-many relationship: Repositories <-> Skills
-- ============================================================
CREATE TABLE IF NOT EXISTS github_repository_skills (
    id SERIAL PRIMARY KEY,
    repository_id BIGINT NOT NULL, -- References github_repositories.repository_id
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_id INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(repository_id, skill_id)
);

-- ============================================================
-- 5. Indexes for Performance
-- ============================================================

-- GitHub repositories indexes
CREATE INDEX IF NOT EXISTS idx_github_repos_user_id ON github_repositories(user_id);
CREATE INDEX IF NOT EXISTS idx_github_repos_user_featured ON github_repositories(user_id, is_featured);
CREATE INDEX IF NOT EXISTS idx_github_repos_user_updated ON github_repositories(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_github_repos_user_pushed ON github_repositories(user_id, pushed_at DESC);
CREATE INDEX IF NOT EXISTS idx_github_repos_language ON github_repositories(language);
CREATE INDEX IF NOT EXISTS idx_github_repos_repo_id ON github_repositories(repository_id);

-- GitHub contributions indexes
CREATE INDEX IF NOT EXISTS idx_github_contrib_user_id ON github_contributions(user_id);
CREATE INDEX IF NOT EXISTS idx_github_contrib_user_date ON github_contributions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_github_contrib_repo_id ON github_contributions(repository_id);
CREATE INDEX IF NOT EXISTS idx_github_contrib_date ON github_contributions(date DESC);

-- GitHub repository skills indexes
CREATE INDEX IF NOT EXISTS idx_github_repo_skills_repo_id ON github_repository_skills(repository_id);
CREATE INDEX IF NOT EXISTS idx_github_repo_skills_skill_id ON github_repository_skills(skill_id);
CREATE INDEX IF NOT EXISTS idx_github_repo_skills_user_id ON github_repository_skills(user_id);

-- GitHub user settings indexes
CREATE INDEX IF NOT EXISTS idx_github_settings_user_id ON github_user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_github_settings_sync ON github_user_settings(auto_sync_enabled, sync_frequency, last_sync_at);

-- ============================================================
-- 6. Triggers for Auto-updating Timestamps
-- ============================================================

-- Function to update updated_at timestamp for github_user_settings
CREATE OR REPLACE FUNCTION update_github_user_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for github_user_settings
DROP TRIGGER IF EXISTS trigger_update_github_user_settings_updated_at ON github_user_settings;
CREATE TRIGGER trigger_update_github_user_settings_updated_at
    BEFORE UPDATE ON github_user_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_github_user_settings_updated_at();

-- Function to update local_updated_at timestamp for github_repositories
CREATE OR REPLACE FUNCTION update_github_repositories_local_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.local_updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for github_repositories
DROP TRIGGER IF EXISTS trigger_update_github_repositories_local_updated_at ON github_repositories;
CREATE TRIGGER trigger_update_github_repositories_local_updated_at
    BEFORE UPDATE ON github_repositories
    FOR EACH ROW
    EXECUTE FUNCTION update_github_repositories_local_updated_at();

-- ============================================================
-- 7. Comments for Documentation
-- ============================================================

COMMENT ON TABLE github_user_settings IS 'Stores GitHub connection settings and sync preferences for each user';
COMMENT ON TABLE github_repositories IS 'Stores user GitHub repositories with metadata, stats, and featured status';
COMMENT ON TABLE github_contributions IS 'Stores daily contribution activity (commits, additions, deletions) per repository';
COMMENT ON TABLE github_repository_skills IS 'Many-to-many relationship linking repositories to user skills';

COMMENT ON COLUMN github_user_settings.github_token IS 'Encrypted GitHub personal access token (optional, for private repos and higher rate limits)';
COMMENT ON COLUMN github_repositories.repository_id IS 'GitHub API repository ID (unique identifier from GitHub)';
COMMENT ON COLUMN github_repositories.languages IS 'JSONB object with language percentages: {"JavaScript": 60, "TypeScript": 40}';
COMMENT ON COLUMN github_repositories.is_featured IS 'User-selected featured repositories to highlight on profile';
COMMENT ON COLUMN github_contributions.repository_id IS 'References github_repositories.repository_id (not a foreign key to allow flexibility)';

