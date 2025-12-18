-- UC-136: Performance Indexes for Scalability
-- Run this migration to add indexes for frequently queried columns

-- =====================================================
-- JOBS TABLE INDEXES
-- =====================================================

-- Index for user_id lookup (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id);

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);

-- Composite index for user + status (common filter combo)
CREATE INDEX IF NOT EXISTS idx_jobs_user_status ON jobs(user_id, status);

-- Index for deadline sorting/filtering
CREATE INDEX IF NOT EXISTS idx_jobs_deadline ON jobs(deadline) WHERE deadline IS NOT NULL;

-- Index for created_at sorting (pagination)
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);

-- Index for company search
CREATE INDEX IF NOT EXISTS idx_jobs_company ON jobs(company);

-- =====================================================
-- RESUMES TABLE INDEXES
-- =====================================================

-- Index for user_id lookup
CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON resumes(user_id);

-- Index for created_at sorting
CREATE INDEX IF NOT EXISTS idx_resumes_created_at ON resumes(created_at DESC);

-- =====================================================
-- USERS TABLE INDEXES
-- =====================================================

-- Index for email lookup (already unique, but explicit index)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Index for account type filtering
CREATE INDEX IF NOT EXISTS idx_users_account_type ON users(account_type);

-- =====================================================
-- PROFILES TABLE INDEXES
-- =====================================================

-- Index for user_id lookup
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);

-- =====================================================
-- COVER LETTERS TABLE INDEXES
-- =====================================================

-- Index for user_id lookup on uploaded cover letters
CREATE INDEX IF NOT EXISTS idx_uploaded_cover_letters_user_id 
ON uploaded_cover_letters(user_id);

-- =====================================================
-- CONTACTS TABLE INDEXES
-- =====================================================

-- Index for user_id lookup
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);

-- Index for company filtering
CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company);

-- =====================================================
-- SKILLS TABLE INDEXES
-- =====================================================

-- Index for user_id lookup
CREATE INDEX IF NOT EXISTS idx_skills_user_id ON skills(user_id);

-- =====================================================
-- EMPLOYMENT HISTORY INDEXES
-- =====================================================

-- Index for user_id lookup
CREATE INDEX IF NOT EXISTS idx_employment_history_user_id 
ON employment_history(user_id);

-- =====================================================
-- EDUCATION TABLE INDEXES
-- =====================================================

-- Index for user_id lookup
CREATE INDEX IF NOT EXISTS idx_education_user_id ON education(user_id);

-- =====================================================
-- CERTIFICATIONS TABLE INDEXES
-- =====================================================

-- Index for user_id lookup
CREATE INDEX IF NOT EXISTS idx_certifications_user_id ON certifications(user_id);

-- =====================================================
-- PROJECTS TABLE INDEXES
-- =====================================================

-- Index for user_id lookup
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);

-- =====================================================
-- TEAM-RELATED INDEXES
-- =====================================================

-- Index for team members lookup
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);

-- Index for teams by owner
CREATE INDEX IF NOT EXISTS idx_teams_owner_id ON teams(owner_id);

-- =====================================================
-- API MONITORING INDEXES (for analytics)
-- =====================================================

-- Index for timestamp-based queries
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_created_at 
ON api_usage_logs(created_at DESC);

-- Index for service name filtering
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_service 
ON api_usage_logs(service_name);

-- Composite index for user + service analytics
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_user_service 
ON api_usage_logs(user_id, service_name);

-- =====================================================
-- FULL TEXT SEARCH INDEXES (for job search)
-- =====================================================

-- Full text index for job title and company search
-- Note: This creates a GIN index for text search
CREATE INDEX IF NOT EXISTS idx_jobs_search 
ON jobs USING gin(to_tsvector('english', coalesce(title, '') || ' ' || coalesce(company, '') || ' ' || coalesce(description, '')));

-- =====================================================
-- PARTIAL INDEXES (for common filtered queries)
-- =====================================================

-- Index for active jobs only
CREATE INDEX IF NOT EXISTS idx_jobs_active 
ON jobs(user_id, created_at DESC) 
WHERE status NOT IN ('Rejected', 'Withdrawn');

-- Index for jobs with deadlines in the future
CREATE INDEX IF NOT EXISTS idx_jobs_upcoming_deadlines 
ON jobs(user_id, deadline) 
WHERE deadline > NOW();

-- =====================================================
-- ANALYZE TABLES (update statistics for query planner)
-- =====================================================

ANALYZE jobs;
ANALYZE users;
ANALYZE profiles;
ANALYZE resumes;
ANALYZE contacts;
ANALYZE skills;
ANALYZE employment_history;
ANALYZE education;
ANALYZE certifications;
ANALYZE projects;

-- =====================================================
-- PRINT SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'UC-136: Performance indexes created successfully!';
  RAISE NOTICE 'Run EXPLAIN ANALYZE on your queries to verify index usage.';
END $$;

