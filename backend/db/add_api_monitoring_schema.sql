-- UC-117: API Rate Limiting and Error Handling Dashboard
-- Database schema for API usage tracking, error logging, and quota management
-- This migration is idempotent and safe to rerun.

BEGIN;

-- API Services Configuration Table
CREATE TABLE IF NOT EXISTS api_services (
  id SERIAL PRIMARY KEY,
  service_name VARCHAR(100) NOT NULL UNIQUE, -- e.g., 'openai', 'serp', 'news_api', 'resend', 'github'
  display_name VARCHAR(255) NOT NULL,
  base_url TEXT,
  quota_limit INTEGER, -- Monthly quota limit (null means unlimited or unknown)
  quota_period VARCHAR(20) DEFAULT 'monthly' CHECK (quota_period IN ('daily', 'weekly', 'monthly')),
  rate_limit_per_minute INTEGER, -- Rate limit per minute if applicable
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- API Usage Logs Table
CREATE TABLE IF NOT EXISTS api_usage_logs (
  id SERIAL PRIMARY KEY,
  service_id INTEGER NOT NULL REFERENCES api_services(id) ON DELETE CASCADE,
  service_name VARCHAR(100) NOT NULL, -- Denormalized for quick queries
  endpoint VARCHAR(255), -- API endpoint called
  method VARCHAR(10) DEFAULT 'GET', -- HTTP method
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL, -- User who triggered the API call (if applicable)
  request_payload JSONB, -- Request details (sanitized)
  response_status INTEGER, -- HTTP status code
  response_time_ms INTEGER, -- Response time in milliseconds
  tokens_used INTEGER, -- For token-based APIs like OpenAI
  cost_estimate DECIMAL(10, 6), -- Estimated cost in USD (if applicable)
  success BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- API Error Logs Table
CREATE TABLE IF NOT EXISTS api_error_logs (
  id SERIAL PRIMARY KEY,
  service_id INTEGER NOT NULL REFERENCES api_services(id) ON DELETE CASCADE,
  service_name VARCHAR(100) NOT NULL, -- Denormalized for quick queries
  endpoint VARCHAR(255),
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  error_type VARCHAR(100), -- e.g., 'rate_limit', 'timeout', 'authentication', 'server_error', 'network_error'
  error_message TEXT,
  error_code VARCHAR(50), -- API-specific error code
  status_code INTEGER, -- HTTP status code if applicable
  request_payload JSONB, -- Request details (sanitized)
  response_body TEXT, -- Error response body (truncated if too long)
  retry_attempt INTEGER DEFAULT 0,
  fallback_used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- API Quota Tracking Table
CREATE TABLE IF NOT EXISTS api_quotas (
  id SERIAL PRIMARY KEY,
  service_id INTEGER NOT NULL REFERENCES api_services(id) ON DELETE CASCADE,
  service_name VARCHAR(100) NOT NULL, -- Denormalized
  period_start DATE NOT NULL, -- Start of quota period (e.g., first day of month)
  period_type VARCHAR(20) DEFAULT 'monthly' CHECK (period_type IN ('daily', 'weekly', 'monthly')),
  quota_limit INTEGER, -- Quota limit for this period
  usage_count INTEGER DEFAULT 0, -- Number of requests made
  tokens_used INTEGER DEFAULT 0, -- Total tokens used (if applicable)
  cost_total DECIMAL(10, 2) DEFAULT 0, -- Total cost this period
  last_reset_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(service_id, period_start, period_type)
);

-- Weekly API Usage Reports Table
CREATE TABLE IF NOT EXISTS api_usage_reports (
  id SERIAL PRIMARY KEY,
  report_week_start DATE NOT NULL, -- Start of the week (Monday)
  total_requests INTEGER DEFAULT 0,
  total_errors INTEGER DEFAULT 0,
  total_tokens_used INTEGER DEFAULT 0,
  total_cost DECIMAL(10, 2) DEFAULT 0,
  avg_response_time_ms INTEGER,
  service_breakdown JSONB, -- JSON object with per-service stats
  error_breakdown JSONB, -- JSON object with error type breakdown
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(report_week_start)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_service_id ON api_usage_logs(service_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_service_name ON api_usage_logs(service_name);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_user_id ON api_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_created_at ON api_usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_success ON api_usage_logs(success);

CREATE INDEX IF NOT EXISTS idx_api_error_logs_service_id ON api_error_logs(service_id);
CREATE INDEX IF NOT EXISTS idx_api_error_logs_service_name ON api_error_logs(service_name);
CREATE INDEX IF NOT EXISTS idx_api_error_logs_user_id ON api_error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_error_logs_error_type ON api_error_logs(error_type);
CREATE INDEX IF NOT EXISTS idx_api_error_logs_created_at ON api_error_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_api_quotas_service_id ON api_quotas(service_id);
CREATE INDEX IF NOT EXISTS idx_api_quotas_period_start ON api_quotas(period_start DESC);

-- Insert default API services configuration
INSERT INTO api_services (service_name, display_name, base_url, quota_limit, quota_period, rate_limit_per_minute, enabled)
VALUES
  ('openai', 'OpenAI API', 'https://api.openai.com', NULL, 'monthly', NULL, TRUE),
  ('serp', 'SERP API', 'https://serpapi.com', 100, 'monthly', 5, TRUE), -- Free tier: 100 searches/month
  ('news_api', 'News API', 'https://newsapi.org', 100, 'monthly', NULL, TRUE), -- Free tier: 100 requests/month
  ('resend', 'Resend Email API', 'https://api.resend.com', 3000, 'monthly', NULL, TRUE), -- Free tier: 3000 emails/month
  ('github', 'GitHub API', 'https://api.github.com', 5000, 'monthly', 60, TRUE), -- Free tier: 5000 requests/hour, using 5000/month as conservative
  ('google_geocoding', 'Google Geocoding API', 'https://maps.googleapis.com', NULL, 'monthly', NULL, TRUE),
  ('google_gemini', 'Google Gemini AI', 'https://generativelanguage.googleapis.com', 60, 'monthly', 15, TRUE), -- Free tier: 60 requests/minute, 1500/day
  ('wikipedia', 'Wikipedia API', 'https://en.wikipedia.org', NULL, 'monthly', NULL, TRUE),
  ('linkedin', 'LinkedIn API', 'https://api.linkedin.com', 500, 'monthly', NULL, TRUE), -- Free tier: ~500 requests/day
  ('supabase', 'Supabase API', NULL, NULL, 'monthly', NULL, TRUE)
ON CONFLICT (service_name) DO NOTHING;

COMMIT;
