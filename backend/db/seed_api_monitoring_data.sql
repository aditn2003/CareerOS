-- Seed data for API Monitoring Dashboard
-- Based on current usage from the dashboard
-- Period: December 2025 (2025-12-01 to 2025-12-31)

BEGIN;

-- Ensure API services exist (idempotent)
INSERT INTO api_services (service_name, display_name, base_url, quota_limit, quota_period, rate_limit_per_minute, enabled)
VALUES
  ('openai', 'OpenAI API', 'https://api.openai.com', NULL, 'monthly', NULL, TRUE),
  ('serp', 'SERP API', 'https://serpapi.com', 100, 'monthly', 5, TRUE),
  ('news_api', 'News API', 'https://newsapi.org', 100, 'monthly', NULL, TRUE),
  ('resend', 'Resend Email API', 'https://api.resend.com', 3000, 'monthly', NULL, TRUE),
  ('github', 'GitHub API', 'https://api.github.com', 5000, 'monthly', 60, TRUE),
  ('google_geocoding', 'Google Geocoding API', 'https://maps.googleapis.com', NULL, 'monthly', NULL, TRUE),
  ('google_gemini', 'Google Gemini AI', 'https://generativelanguage.googleapis.com', 60, 'monthly', 15, TRUE),
  ('wikipedia', 'Wikipedia API', 'https://en.wikipedia.org', NULL, 'monthly', NULL, TRUE),
  ('linkedin', 'LinkedIn API', 'https://api.linkedin.com', 500, 'monthly', NULL, TRUE)
ON CONFLICT (service_name) DO UPDATE 
SET display_name = EXCLUDED.display_name,
    base_url = EXCLUDED.base_url,
    quota_limit = EXCLUDED.quota_limit,
    updated_at = CURRENT_TIMESTAMP;

-- Remove Supabase if it exists (it's a database client, not an external HTTP API)
DELETE FROM api_services WHERE service_name = 'supabase';
DELETE FROM api_quotas WHERE service_name = 'supabase';

-- Seed API Quotas for December 2025
-- Note: We'll calculate usage_count from actual logs AFTER inserting them to ensure consistency
-- This ensures usage_count always matches the actual log entries
INSERT INTO api_quotas (service_id, service_name, period_start, period_type, quota_limit, usage_count, tokens_used, cost_total, last_reset_at)
SELECT 
  s.id,
  s.service_name,
  DATE_TRUNC('month', CURRENT_DATE)::DATE,
  'monthly',
  s.quota_limit,
  0, -- Will be updated from logs after insertion
  CASE s.service_name
    WHEN 'openai' THEN 499860
    WHEN 'google_gemini' THEN 125000
    ELSE NULL
  END,
  CASE s.service_name
    WHEN 'openai' THEN 0.12
    WHEN 'google_gemini' THEN 0.015
    ELSE 0.00
  END,
  CURRENT_TIMESTAMP
FROM api_services s
WHERE s.service_name IN ('openai', 'serp', 'news_api', 'resend', 'github', 'google_geocoding', 'google_gemini', 'wikipedia', 'linkedin')
ON CONFLICT (service_id, period_start, period_type) DO UPDATE
SET tokens_used = COALESCE(EXCLUDED.tokens_used, api_quotas.tokens_used),
    cost_total = EXCLUDED.cost_total,
    last_reset_at = CURRENT_TIMESTAMP;

-- Sample API Usage Logs (recent successful requests)
-- These create realistic usage history to populate the dashboard
-- IMPORTANT: The number of log entries should match the usage_count we want to display

-- OpenAI usage logs (95 requests)
INSERT INTO api_usage_logs (service_id, service_name, endpoint, method, user_id, response_status, response_time_ms, tokens_used, cost_estimate, success, created_at)
SELECT 
  s.id,
  'openai',
  '/v1/chat/completions',
  'POST',
  NULL,
  200,
  8500 + (random() * 3000)::INTEGER, -- Randomize response time between 8500-11500ms
  4000 + (random() * 2000)::INTEGER, -- Randomize tokens between 4000-6000
  0.0008 + (random() * 0.0004), -- Randomize cost
  TRUE,
  CURRENT_TIMESTAMP - (random() * interval '30 days')
FROM api_services s
CROSS JOIN generate_series(1, 95) -- Generate 95 log entries
WHERE s.service_name = 'openai'
ON CONFLICT DO NOTHING;

-- Wikipedia usage logs (177 requests, ~7% failure rate = ~12 failures)
INSERT INTO api_usage_logs (service_id, service_name, endpoint, method, user_id, response_status, response_time_ms, success, created_at)
SELECT 
  s.id,
  'wikipedia',
  '/w/api.php',
  'GET',
  NULL,
  CASE WHEN random() > 0.07 THEN 200 ELSE 403 END, -- ~7% failure rate
  120 + (random() * 80)::INTEGER, -- Randomize response time between 120-200ms
  CASE WHEN random() > 0.07 THEN TRUE ELSE FALSE END,
  CURRENT_TIMESTAMP - (random() * interval '30 days')
FROM api_services s
CROSS JOIN generate_series(1, 177) -- Generate 177 log entries
WHERE s.service_name = 'wikipedia'
ON CONFLICT DO NOTHING;

-- News API usage logs (52 requests)
INSERT INTO api_usage_logs (service_id, service_name, endpoint, method, user_id, response_status, response_time_ms, success, created_at)
SELECT 
  s.id,
  'news_api',
  '/v2/everything',
  'GET',
  NULL,
  200,
  130 + (random() * 60)::INTEGER, -- Randomize response time between 130-190ms
  TRUE,
  CURRENT_TIMESTAMP - (random() * interval '30 days')
FROM api_services s
CROSS JOIN generate_series(1, 52) -- Generate 52 log entries
WHERE s.service_name = 'news_api'
ON CONFLICT DO NOTHING;

-- SERP API usage logs (11 requests)
INSERT INTO api_usage_logs (service_id, service_name, endpoint, method, user_id, response_status, response_time_ms, success, created_at)
SELECT 
  s.id,
  'serp',
  '/search',
  'GET',
  NULL,
  200,
  400 + (random() * 100)::INTEGER, -- Randomize response time between 400-500ms
  TRUE,
  CURRENT_TIMESTAMP - (random() * interval '30 days')
FROM api_services s
CROSS JOIN generate_series(1, 11) -- Generate 11 log entries
WHERE s.service_name = 'serp'
ON CONFLICT DO NOTHING;

-- LinkedIn usage logs (4 requests)
INSERT INTO api_usage_logs (service_id, service_name, endpoint, method, user_id, response_status, response_time_ms, success, created_at)
SELECT 
  s.id,
  'linkedin',
  '/v2/me',
  'GET',
  NULL,
  200,
  250 + (random() * 100)::INTEGER, -- Randomize response time between 250-350ms
  TRUE,
  CURRENT_TIMESTAMP - (random() * interval '30 days')
FROM api_services s
CROSS JOIN generate_series(1, 4) -- Generate 4 log entries
WHERE s.service_name = 'linkedin'
ON CONFLICT DO NOTHING;

-- Resend usage logs (1 request)
INSERT INTO api_usage_logs (service_id, service_name, endpoint, method, user_id, response_status, response_time_ms, success, created_at)
SELECT 
  s.id,
  'resend',
  '/emails',
  'POST',
  NULL,
  200,
  150 + (random() * 100)::INTEGER, -- Randomize response time between 150-250ms
  TRUE,
  CURRENT_TIMESTAMP - (random() * interval '30 days')
FROM api_services s
WHERE s.service_name = 'resend'
LIMIT 1
ON CONFLICT DO NOTHING;

-- GitHub usage logs (25 requests)
INSERT INTO api_usage_logs (service_id, service_name, endpoint, method, user_id, response_status, response_time_ms, success, created_at)
SELECT 
  s.id,
  'github',
  CASE WHEN random() > 0.4 THEN '/user/repos' ELSE '/repos/USER/REPO' END, -- Mix of endpoints
  'GET',
  NULL,
  200,
  350 + (random() * 150)::INTEGER, -- Randomize response time between 350-500ms
  TRUE,
  CURRENT_TIMESTAMP - (random() * interval '30 days')
FROM api_services s
CROSS JOIN generate_series(1, 25) -- Generate 25 log entries
WHERE s.service_name = 'github'
ON CONFLICT DO NOTHING;

-- Google Gemini usage logs (18 requests)
INSERT INTO api_usage_logs (service_id, service_name, endpoint, method, user_id, response_status, response_time_ms, tokens_used, success, created_at)
SELECT 
  s.id,
  'google_gemini',
  '/v1/models/gemini-2.0-flash:generateContent',
  'POST',
  NULL,
  200,
  2000 + (random() * 1500)::INTEGER, -- Randomize response time between 2000-3500ms
  6000 + (random() * 5000)::INTEGER, -- Randomize tokens between 6000-11000
  TRUE,
  CURRENT_TIMESTAMP - (random() * interval '30 days')
FROM api_services s
CROSS JOIN generate_series(1, 18) -- Generate 18 log entries
WHERE s.service_name = 'google_gemini'
ON CONFLICT DO NOTHING;

-- Google Geocoding usage logs (45 requests)
INSERT INTO api_usage_logs (service_id, service_name, endpoint, method, user_id, response_status, response_time_ms, success, created_at)
SELECT 
  s.id,
  'google_geocoding',
  '/v2.1/get-time-zone',
  'GET',
  NULL,
  200,
  180 + (random() * 80)::INTEGER, -- Randomize response time between 180-260ms
  TRUE,
  CURRENT_TIMESTAMP - (random() * interval '30 days')
FROM api_services s
CROSS JOIN generate_series(1, 45) -- Generate 45 log entries
WHERE s.service_name = 'google_geocoding'
ON CONFLICT DO NOTHING;

-- Sample API Error Logs for Wikipedia (403 errors - ~12 errors matching ~7% failure rate)
INSERT INTO api_error_logs (service_id, service_name, endpoint, user_id, error_type, error_message, status_code, created_at)
SELECT 
  s.id,
  'wikipedia',
  '/w/api.php',
  NULL,
  'api_error',
  'Access forbidden (likely rate limit)',
  403,
  CURRENT_TIMESTAMP - (random() * interval '30 days')
FROM api_services s
CROSS JOIN generate_series(1, 12) -- Generate 12 error log entries
WHERE s.service_name = 'wikipedia'
ON CONFLICT DO NOTHING;

-- Now sync usage_count in api_quotas to match actual log counts
-- This ensures consistency between quota counters and log entries
UPDATE api_quotas q
SET usage_count = COALESCE((
    SELECT COUNT(*)::INTEGER
    FROM api_usage_logs l
    WHERE l.service_name = q.service_name
      AND l.created_at >= q.period_start
      AND l.created_at < q.period_start + INTERVAL '1 month'
), 0),
tokens_used = COALESCE((
    SELECT SUM(COALESCE(tokens_used, 0))::BIGINT
    FROM api_usage_logs l
    WHERE l.service_name = q.service_name
      AND l.created_at >= q.period_start
      AND l.created_at < q.period_start + INTERVAL '1 month'
), q.tokens_used),
cost_total = COALESCE((
    SELECT SUM(COALESCE(cost_estimate, 0))::DECIMAL
    FROM api_usage_logs l
    WHERE l.service_name = q.service_name
      AND l.created_at >= q.period_start
      AND l.created_at < q.period_start + INTERVAL '1 month'
), q.cost_total)
WHERE q.period_start = DATE_TRUNC('month', CURRENT_DATE)::DATE
  AND q.period_type = 'monthly';

COMMIT;

-- Verify seed data - Check that usage_count matches actual log counts
SELECT 
  s.service_name,
  s.display_name,
  s.quota_limit,
  COALESCE(q.usage_count, 0) as quota_usage_count,
  COUNT(l.id) as actual_log_count,
  CASE 
    WHEN COALESCE(q.usage_count, 0) = COUNT(l.id) THEN '✅ Synced'
    ELSE '⚠️ Mismatch'
  END as sync_status,
  COALESCE(q.tokens_used, 0) as tokens_used,
  COALESCE(q.cost_total, 0) as cost_total,
  CASE 
    WHEN s.quota_limit IS NULL THEN 'Unlimited'
    WHEN q.usage_count IS NULL THEN '0%'
    ELSE ROUND((q.usage_count::DECIMAL / s.quota_limit::DECIMAL) * 100, 1)::TEXT || '%'
  END as usage_percentage
FROM api_services s
LEFT JOIN api_quotas q ON s.id = q.service_id 
  AND q.period_start = DATE_TRUNC('month', CURRENT_DATE)::DATE
  AND q.period_type = 'monthly'
LEFT JOIN api_usage_logs l ON l.service_name = s.service_name
  AND l.created_at >= DATE_TRUNC('month', CURRENT_DATE)
  AND l.created_at < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
WHERE s.enabled = TRUE
  AND s.service_name != 'supabase' -- Exclude Supabase (database client)
GROUP BY s.service_name, s.display_name, s.quota_limit, q.usage_count, q.tokens_used, q.cost_total
ORDER BY s.service_name;
