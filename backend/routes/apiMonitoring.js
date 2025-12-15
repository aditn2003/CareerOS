/**
 * UC-117: API Rate Limiting and Error Handling Dashboard Routes
 * Admin-only routes for monitoring API usage, errors, and quotas
 */

import express from "express";
import pool from "../db/pool.js";
import { auth } from "../auth.js";
import { requireAdmin } from "../utils/adminAuth.js";

const router = express.Router();

// All routes require authentication first, then admin check
router.use(auth);
router.use(requireAdmin);

/**
 * GET /api/admin/api-usage
 * Get API usage statistics for all services
 */
router.get("/api-usage", async (req, res) => {
  try {
    const { startDate, endDate, serviceName } = req.query;
    
    // Default to current month if no dates provided (to match quota behavior)
    let actualStartDate = startDate;
    let actualEndDate = endDate;
    
    if (!startDate || !endDate) {
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      actualStartDate = actualStartDate || periodStart.toISOString().split('T')[0];
      actualEndDate = actualEndDate || periodEnd.toISOString().split('T')[0];
    }
    
    let query = `
      SELECT 
        service_name,
        COUNT(*) as total_requests,
        COUNT(*) FILTER (WHERE success = TRUE) as successful_requests,
        COUNT(*) FILTER (WHERE success = FALSE) as failed_requests,
        AVG(response_time_ms)::INTEGER as avg_response_time_ms,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms)::INTEGER as p95_response_time_ms,
        SUM(tokens_used) as total_tokens_used,
        SUM(cost_estimate) as total_cost_estimate,
        MAX(created_at) as last_used_at
      FROM api_usage_logs
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;
    
    if (actualStartDate && actualStartDate.trim() !== "") {
      query += ` AND created_at >= $${paramIndex}`;
      params.push(actualStartDate);
      paramIndex++;
    }
    
    if (actualEndDate && actualEndDate.trim() !== "") {
      query += ` AND created_at <= $${paramIndex}::date + INTERVAL '1 day'`;
      params.push(actualEndDate);
      paramIndex++;
    }
    
    if (serviceName) {
      query += ` AND service_name = $${paramIndex}`;
      params.push(serviceName);
      paramIndex++;
    }
    
    query += ` GROUP BY service_name ORDER BY total_requests DESC`;
    
    const { rows } = await pool.query(query, params);
    
    // Ensure numeric types are returned as numbers, not strings
    const processedRows = rows.map(row => ({
      ...row,
      total_requests: parseInt(row.total_requests) || 0,
      successful_requests: parseInt(row.successful_requests) || 0,
      failed_requests: parseInt(row.failed_requests) || 0,
      avg_response_time_ms: parseInt(row.avg_response_time_ms) || null,
      p95_response_time_ms: parseInt(row.p95_response_time_ms) || null,
      total_tokens_used: parseInt(row.total_tokens_used) || 0,
      total_cost_estimate: parseFloat(row.total_cost_estimate) || 0,
    }));
    
    res.json({
      success: true,
      data: processedRows,
      period: {
        startDate: actualStartDate || null,
        endDate: actualEndDate || null,
      },
    });
  } catch (error) {
    console.error("Error fetching API usage:", error);
    // Check if tables don't exist
    if (error.message && error.message.includes('relation "api_usage_logs" does not exist')) {
      return res.status(503).json({ 
        success: false, 
        error: 'Database schema not initialized. Please run the migration script: backend/db/add_api_monitoring_schema.sql' 
      });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/admin/api-quotas
 * Get quota status for all services
 */
router.get("/api-quotas", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Default to current month if no dates provided (to match usage stats behavior)
    let actualStartDate = startDate;
    let actualEndDate = endDate;
    
    if (!startDate || !endDate) {
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      actualStartDate = actualStartDate || periodStart.toISOString().split('T')[0];
      actualEndDate = actualEndDate || periodEnd.toISOString().split('T')[0];
    }
    
    // Calculate usage from actual logs to ensure consistency
    // This ensures usage_count always matches the actual number of logged requests
    // Use the same date range as the usage stats endpoint
    const { rows } = await pool.query(
      `
      SELECT 
        s.id,
        s.service_name,
        s.display_name,
        s.quota_limit,
        s.quota_period,
        s.rate_limit_per_minute,
        s.enabled,
        -- Calculate usage_count from actual logs using the same date range as usage stats
        COALESCE((
          SELECT COUNT(*)::INTEGER
          FROM api_usage_logs l
          WHERE l.service_name = s.service_name
            AND l.created_at >= $1::date
            AND l.created_at <= $2::date + INTERVAL '1 day'
        ), 0) as usage_count,
        -- Calculate tokens_used from logs to match usage stats
        COALESCE((
          SELECT SUM(COALESCE(tokens_used, 0))::BIGINT
          FROM api_usage_logs l
          WHERE l.service_name = s.service_name
            AND l.created_at >= $1::date
            AND l.created_at <= $2::date + INTERVAL '1 day'
        ), 0) as tokens_used,
        -- Calculate cost_total from logs to match usage stats
        COALESCE((
          SELECT SUM(COALESCE(cost_estimate, 0))::DECIMAL
          FROM api_usage_logs l
          WHERE l.service_name = s.service_name
            AND l.created_at >= $1::date
            AND l.created_at <= $2::date + INTERVAL '1 day'
        ), 0) as cost_total,
        CASE 
          WHEN s.quota_limit IS NULL THEN NULL
          WHEN s.quota_limit = 0 THEN 100
          ELSE ROUND(
            COALESCE((
              SELECT COUNT(*)::INTEGER
              FROM api_usage_logs l
              WHERE l.service_name = s.service_name
                AND l.created_at >= $1::date
                AND l.created_at <= $2::date + INTERVAL '1 day'
            ), 0)::DECIMAL / s.quota_limit * 100,
            2
          )
        END as usage_percentage,
        CASE 
          WHEN s.quota_limit IS NULL THEN NULL
          WHEN COALESCE((
            SELECT COUNT(*)::INTEGER
            FROM api_usage_logs l
            WHERE l.service_name = s.service_name
              AND l.created_at >= $1::date
              AND l.created_at <= $2::date + INTERVAL '1 day'
          ), 0) >= s.quota_limit THEN TRUE  -- At or over limit
          WHEN COALESCE((
            SELECT COUNT(*)::INTEGER
            FROM api_usage_logs l
            WHERE l.service_name = s.service_name
              AND l.created_at >= $1::date
              AND l.created_at <= $2::date + INTERVAL '1 day'
          ), 0) >= s.quota_limit * 0.9 THEN TRUE  -- Approaching limit (90%+)
          ELSE FALSE
        END as approaching_limit
      FROM api_services s
      ORDER BY s.display_name
      `,
      [actualStartDate, actualEndDate]
    );
    
    res.json({
      success: true,
      data: rows,
      period: {
        start: actualStartDate || null,
        end: actualEndDate || null,
      },
    });
  } catch (error) {
    console.error("Error fetching API quotas:", error);
    if (error.message && (error.message.includes('relation "api_services" does not exist') || error.message.includes('relation "api_quotas" does not exist'))) {
      return res.status(503).json({ 
        success: false, 
        error: 'Database schema not initialized. Please run the migration script: backend/db/add_api_monitoring_schema.sql' 
      });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/admin/api-errors
 * Get API error logs
 */
router.get("/api-errors", async (req, res) => {
  try {
    const { 
      startDate, 
      endDate, 
      serviceName, 
      errorType, 
      limit = 100,
      offset = 0 
    } = req.query;
    
    let query = `
      SELECT 
        id,
        service_name,
        endpoint,
        error_type,
        error_message,
        error_code,
        status_code,
        retry_attempt,
        fallback_used,
        created_at,
        user_id
      FROM api_error_logs
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;
    
    if (startDate && startDate.trim() !== "") {
      query += ` AND created_at >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }
    
    if (endDate && endDate.trim() !== "") {
      query += ` AND created_at <= $${paramIndex}::date + INTERVAL '1 day'`;
      params.push(endDate);
      paramIndex++;
    }
    
    if (serviceName) {
      query += ` AND service_name = $${paramIndex}`;
      params.push(serviceName);
      paramIndex++;
    }
    
    if (errorType) {
      query += ` AND error_type = $${paramIndex}`;
      params.push(errorType);
      paramIndex++;
    }
    
    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), parseInt(offset));
    
    // Build count query separately for better reliability
    let countQuery = `SELECT COUNT(*) as count FROM api_error_logs WHERE 1=1`;
    const countParams = [];
    let countParamIndex = 1;
    
    if (startDate && startDate.trim() !== "") {
      countQuery += ` AND created_at >= $${countParamIndex}`;
      countParams.push(startDate);
      countParamIndex++;
    }
    
    if (endDate && endDate.trim() !== "") {
      countQuery += ` AND created_at <= $${countParamIndex}::date + INTERVAL '1 day'`;
      countParams.push(endDate);
      countParamIndex++;
    }
    
    if (serviceName) {
      countQuery += ` AND service_name = $${countParamIndex}`;
      countParams.push(serviceName);
      countParamIndex++;
    }
    
    if (errorType) {
      countQuery += ` AND error_type = $${countParamIndex}`;
      countParams.push(errorType);
      countParamIndex++;
    }
    
    const [dataResult, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, countParams),
    ]);
    
    res.json({
      success: true,
      data: dataResult.rows,
      pagination: {
        total: parseInt(countResult.rows[0]?.count || 0),
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    });
  } catch (error) {
    console.error("Error fetching API errors:", error);
    if (error.message && error.message.includes('relation "api_error_logs" does not exist')) {
      return res.status(503).json({ 
        success: false, 
        error: 'Database schema not initialized. Please run the migration script: backend/db/add_api_monitoring_schema.sql' 
      });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/admin/api-response-times
 * Get API response time statistics
 */
router.get("/api-response-times", async (req, res) => {
  try {
    const { startDate, endDate, serviceName, groupBy = 'hour' } = req.query;
    
    let dateFormat;
    if (groupBy === 'hour') {
      dateFormat = "DATE_TRUNC('hour', created_at)";
    } else if (groupBy === 'day') {
      dateFormat = "DATE_TRUNC('day', created_at)";
    } else {
      dateFormat = "DATE_TRUNC('day', created_at)";
    }
    
    let query = `
      SELECT 
        ${dateFormat} as time_period,
        service_name,
        AVG(response_time_ms)::INTEGER as avg_response_time_ms,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY response_time_ms)::INTEGER as median_response_time_ms,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms)::INTEGER as p95_response_time_ms,
        PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY response_time_ms)::INTEGER as p99_response_time_ms,
        MIN(response_time_ms) as min_response_time_ms,
        MAX(response_time_ms) as max_response_time_ms,
        COUNT(*) as request_count
      FROM api_usage_logs
      WHERE response_time_ms IS NOT NULL
    `;
    
    const params = [];
    let paramIndex = 1;
    
    if (startDate && startDate.trim() !== "") {
      query += ` AND created_at >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }
    
    if (endDate && endDate.trim() !== "") {
      query += ` AND created_at <= $${paramIndex}::date + INTERVAL '1 day'`;
      params.push(endDate);
      paramIndex++;
    }
    
    if (serviceName) {
      query += ` AND service_name = $${paramIndex}`;
      params.push(serviceName);
      paramIndex++;
    }
    
    query += ` 
      GROUP BY time_period, service_name 
      ORDER BY time_period DESC, service_name
    `;
    
    const { rows } = await pool.query(query, params);
    
    res.json({
      success: true,
      data: rows,
      groupBy,
    });
  } catch (error) {
    console.error("Error fetching response times:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/admin/api-services
 * Get list of all API services and their configuration
 */
router.get("/api-services", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `
      SELECT 
        id,
        service_name,
        display_name,
        base_url,
        quota_limit,
        quota_period,
        rate_limit_per_minute,
        enabled,
        created_at,
        updated_at
      FROM api_services
      ORDER BY display_name
      `
    );
    
    res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error("Error fetching API services:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/admin/api-usage-report
 * Generate weekly API usage report
 */
router.post("/api-usage-report", async (req, res) => {
  try {
    const { weekStart } = req.body; // ISO date string (Monday of the week)
    
    if (!weekStart) {
      return res.status(400).json({ 
        success: false, 
        error: 'weekStart is required' 
      });
    }
    
    const startDate = new Date(weekStart);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6); // End of week (Sunday)
    
    // Calculate statistics
    const statsResult = await pool.query(
      `
      SELECT 
        COUNT(*) as total_requests,
        COUNT(*) FILTER (WHERE success = FALSE) as total_errors,
        SUM(tokens_used) as total_tokens_used,
        SUM(cost_estimate) as total_cost,
        AVG(response_time_ms)::INTEGER as avg_response_time_ms
      FROM api_usage_logs
      WHERE created_at >= $1 AND created_at <= $2
      `,
      [startDate, endDate]
    );
    
    const stats = statsResult.rows[0];
    
    // Service breakdown
    const serviceBreakdown = await pool.query(
      `
      SELECT 
        service_name,
        COUNT(*) as requests,
        COUNT(*) FILTER (WHERE success = FALSE) as errors,
        SUM(tokens_used) as tokens_used,
        SUM(cost_estimate) as cost
      FROM api_usage_logs
      WHERE created_at >= $1 AND created_at <= $2
      GROUP BY service_name
      ORDER BY requests DESC
      `,
      [startDate, endDate]
    );
    
    // Error breakdown
    const errorBreakdown = await pool.query(
      `
      SELECT 
        error_type,
        COUNT(*) as count
      FROM api_error_logs
      WHERE created_at >= $1 AND created_at <= $2
      GROUP BY error_type
      ORDER BY count DESC
      `,
      [startDate, endDate]
    );
    
    // Save or update report
    await pool.query(
      `
      INSERT INTO api_usage_reports 
        (report_week_start, total_requests, total_errors, total_tokens_used, 
         total_cost, avg_response_time_ms, service_breakdown, error_breakdown)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (report_week_start) 
      DO UPDATE SET
        total_requests = EXCLUDED.total_requests,
        total_errors = EXCLUDED.total_errors,
        total_tokens_used = EXCLUDED.total_tokens_used,
        total_cost = EXCLUDED.total_cost,
        avg_response_time_ms = EXCLUDED.avg_response_time_ms,
        service_breakdown = EXCLUDED.service_breakdown,
        error_breakdown = EXCLUDED.error_breakdown,
        generated_at = CURRENT_TIMESTAMP
      `,
      [
        startDate,
        parseInt(stats.total_requests) || 0,
        parseInt(stats.total_errors) || 0,
        parseInt(stats.total_tokens_used) || 0,
        parseFloat(stats.total_cost) || 0,
        parseInt(stats.avg_response_time_ms) || 0,
        JSON.stringify(serviceBreakdown.rows),
        JSON.stringify(errorBreakdown.rows),
      ]
    );
    
    res.json({
      success: true,
      report: {
        weekStart: startDate.toISOString().split('T')[0],
        weekEnd: endDate.toISOString().split('T')[0],
        totalRequests: parseInt(stats.total_requests) || 0,
        totalErrors: parseInt(stats.total_errors) || 0,
        totalTokensUsed: parseInt(stats.total_tokens_used) || 0,
        totalCost: parseFloat(stats.total_cost) || 0,
        avgResponseTimeMs: parseInt(stats.avg_response_time_ms) || 0,
        serviceBreakdown: serviceBreakdown.rows,
        errorBreakdown: errorBreakdown.rows,
      },
    });
  } catch (error) {
    console.error("Error generating API usage report:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/admin/api-usage-reports
 * Get all weekly reports
 */
router.get("/api-usage-reports", async (req, res) => {
  try {
    const { limit = 12 } = req.query; // Default to last 12 weeks
    
    const { rows } = await pool.query(
      `
      SELECT 
        id,
        report_week_start,
        total_requests,
        total_errors,
        total_tokens_used,
        total_cost,
        avg_response_time_ms,
        service_breakdown,
        error_breakdown,
        generated_at
      FROM api_usage_reports
      ORDER BY report_week_start DESC
      LIMIT $1
      `,
      [parseInt(limit)]
    );
    
    res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error("Error fetching API usage reports:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
