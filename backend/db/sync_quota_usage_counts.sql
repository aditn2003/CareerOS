-- Sync usage_count in api_quotas to match actual log entries in api_usage_logs
-- This fixes any inconsistencies between the quota counter and actual logged requests

BEGIN;

-- Get current month period
DO $$
DECLARE
    current_period_start DATE;
BEGIN
    current_period_start := DATE_TRUNC('month', CURRENT_DATE);
    
    -- Update usage_count for each service to match actual log counts
    UPDATE api_quotas q
    SET usage_count = COALESCE((
        SELECT COUNT(*)::INTEGER
        FROM api_usage_logs l
        WHERE l.service_name = q.service_name
          AND l.created_at >= q.period_start
          AND l.created_at < q.period_start + INTERVAL '1 month'
    ), 0),
    last_reset_at = CURRENT_TIMESTAMP
    WHERE q.period_start = current_period_start
      AND q.period_type = 'monthly';
      
    RAISE NOTICE 'Updated usage_count for all services to match actual log entries';
END $$;

COMMIT;

-- Show the synced results
SELECT 
    s.service_name,
    s.display_name,
    q.usage_count as quota_usage_count,
    COUNT(l.id) as actual_log_count,
    CASE 
        WHEN q.usage_count = COUNT(l.id) THEN '✅ Synced'
        ELSE '⚠️ Mismatch'
    END as status
FROM api_services s
LEFT JOIN api_quotas q ON q.service_id = s.id 
    AND q.period_start = DATE_TRUNC('month', CURRENT_DATE)
    AND q.period_type = 'monthly'
LEFT JOIN api_usage_logs l ON l.service_name = s.service_name
    AND l.created_at >= DATE_TRUNC('month', CURRENT_DATE)
    AND l.created_at < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
WHERE s.enabled = TRUE
GROUP BY s.service_name, s.display_name, q.usage_count
ORDER BY s.service_name;
