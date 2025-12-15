/**
 * UC-117: API Tracking Service
 * Tracks API usage, errors, quotas, and response times for all external API calls
 */

import pool from "../db/pool.js";

/**
 * Get or create service ID for a service name
 */
async function getServiceId(serviceName) {
  try {
    const { rows } = await pool.query(
      "SELECT id FROM api_services WHERE service_name = $1",
      [serviceName]
    );
    if (rows.length > 0) {
      return rows[0].id;
    }
    
    // Create service if it doesn't exist
    const { rows: newRows } = await pool.query(
      `INSERT INTO api_services (service_name, display_name, enabled)
       VALUES ($1, $2, TRUE)
       ON CONFLICT (service_name) DO UPDATE SET enabled = TRUE
       RETURNING id`,
      [serviceName, serviceName]
    );
    return newRows[0].id;
  } catch (error) {
    console.error(`❌ Error getting/creating service ID for ${serviceName}:`, error.message);
    // If tables don't exist, this will fail - but we don't want to crash the app
    // Return a dummy ID so the error handling can proceed
    throw error; // Re-throw so calling code knows tracking failed
  }
}

/**
 * Log an API usage/request
 */
export async function logApiUsage({
  serviceName,
  endpoint,
  method = 'GET',
  userId = null,
  requestPayload = null,
  responseStatus,
  responseTimeMs,
  tokensUsed = null,
  costEstimate = null,
  success = true,
}) {
  try {
    let serviceId;
    try {
      serviceId = await getServiceId(serviceName);
    } catch (serviceError) {
      // If service lookup fails (tables don't exist), log and return early
      console.error(`❌ Cannot track API usage for ${serviceName}: Database tables may not exist.`, serviceError.message);
      console.error(`   Run: psql $DATABASE_URL -f backend/db/add_api_monitoring_schema.sql`);
      return; // Silently fail - don't break the app
    }
    
    // Sanitize request payload (remove sensitive data)
    const sanitizedPayload = sanitizePayload(requestPayload);
    
    console.log(`📊 logApiUsage: Inserting log for ${serviceName} - userId: ${userId}, endpoint: ${endpoint}`);
    const result = await pool.query(
      `INSERT INTO api_usage_logs 
       (service_id, service_name, endpoint, method, user_id, request_payload, 
        response_status, response_time_ms, tokens_used, cost_estimate, success)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id`,
      [
        serviceId,
        serviceName,
        endpoint,
        method,
        userId,
        sanitizedPayload ? JSON.stringify(sanitizedPayload) : null,
        responseStatus,
        responseTimeMs,
        tokensUsed,
        costEstimate ? parseFloat(costEstimate) : null,
        success,
      ]
    );
    console.log(`✅ logApiUsage: Successfully logged API usage with ID ${result.rows[0]?.id} for ${serviceName}`);

    // Update quota tracking
    await updateQuotaUsage(serviceId, serviceName, tokensUsed, costEstimate);
  } catch (error) {
    console.error("❌ Error logging API usage:", error);
    console.error("   Service:", serviceName, "Endpoint:", endpoint, "User:", userId);
    console.error("   Full error:", error.message, error.stack);
    // Don't throw - logging failures shouldn't break the app
  }
}

/**
 * Log an API error
 */
export async function logApiError({
  serviceName,
  endpoint,
  userId = null,
  errorType,
  errorMessage,
  errorCode = null,
  statusCode = null,
  requestPayload = null,
  responseBody = null,
  retryAttempt = 0,
  fallbackUsed = false,
}) {
  try {
    const serviceId = await getServiceId(serviceName);
    
    // Sanitize payloads
    const sanitizedPayload = sanitizePayload(requestPayload);
    const sanitizedResponse = responseBody 
      ? responseBody.substring(0, 1000) // Truncate long responses
      : null;
    
    await pool.query(
      `INSERT INTO api_error_logs 
       (service_id, service_name, endpoint, user_id, error_type, error_message,
        error_code, status_code, request_payload, response_body, retry_attempt, fallback_used)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        serviceId,
        serviceName,
        endpoint,
        userId,
        errorType,
        errorMessage,
        errorCode,
        statusCode,
        sanitizedPayload ? JSON.stringify(sanitizedPayload) : null,
        sanitizedResponse,
        retryAttempt,
        fallbackUsed,
      ]
    );
  } catch (error) {
    console.error("❌ Error logging API error:", error);
    console.error("   Service:", serviceName, "Endpoint:", endpoint, "User:", userId);
    console.error("   Full error:", error.message, error.stack);
    // Don't throw - logging failures shouldn't break the app
  }
}

/**
 * Update quota usage for a service
 */
async function updateQuotaUsage(serviceId, serviceName, tokensUsed = null, costEstimate = null) {
  try {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1); // First day of current month
    const periodType = 'monthly';
    
    // Get or create quota record
    let { rows } = await pool.query(
      `SELECT id FROM api_quotas 
       WHERE service_id = $1 AND period_start = $2 AND period_type = $3`,
      [serviceId, periodStart, periodType]
    );
    
    if (rows.length === 0) {
      // Get quota limit from service config
      const serviceResult = await pool.query(
        "SELECT quota_limit FROM api_services WHERE id = $1",
        [serviceId]
      );
      const quotaLimit = serviceResult.rows[0]?.quota_limit || null;
      
      const costValue = costEstimate != null ? parseFloat(costEstimate) : 0;
      await pool.query(
        `INSERT INTO api_quotas 
         (service_id, service_name, period_start, period_type, quota_limit, usage_count, tokens_used, cost_total)
         VALUES ($1, $2, $3, $4, $5, 1, $6, $7::DECIMAL)`,
        [
          serviceId, 
          serviceName, 
          periodStart, 
          periodType, 
          quotaLimit, 
          tokensUsed || 0, 
          costValue
        ]
      );
    } else {
      // Update existing quota
      const costValue = costEstimate != null ? parseFloat(costEstimate) : 0;
      await pool.query(
        `UPDATE api_quotas 
         SET usage_count = usage_count + 1,
             tokens_used = tokens_used + COALESCE($1, 0),
             cost_total = cost_total + COALESCE($2::DECIMAL, 0::DECIMAL)
         WHERE id = $3`,
        [
          tokensUsed || 0, 
          costValue, 
          rows[0].id
        ]
      );
    }
  } catch (error) {
    console.error("Error updating quota usage:", error);
  }
}

/**
 * Sanitize payload to remove sensitive information
 */
function sanitizePayload(payload) {
  if (!payload) return null;
  
  const sensitiveKeys = ['password', 'api_key', 'apiKey', 'token', 'secret', 'authorization', 'auth'];
  const sanitized = JSON.parse(JSON.stringify(payload));
  
  function removeSensitive(obj) {
    if (typeof obj !== 'object' || obj === null) return;
    
    for (const key in obj) {
      if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk.toLowerCase()))) {
        obj[key] = '[REDACTED]';
      } else if (typeof obj[key] === 'object') {
        removeSensitive(obj[key]);
      }
    }
  }
  
  removeSensitive(sanitized);
  return sanitized;
}

/**
 * Wrapper function to track API calls with automatic error handling
 */
export async function trackApiCall(
  serviceName,
  apiCall,
  options = {}
) {
  const {
    endpoint = 'unknown',
    method = 'GET',
    userId = null,
    requestPayload = null,
    estimateTokens = null,
    estimateCost = null,
  } = options;

  const startTime = Date.now();
  let responseStatus = null;
  let tokensUsed = null;
  let success = false;

  try {
    const response = await apiCall();
    const responseTimeMs = Date.now() - startTime;
    
    // Extract response status if it's an axios response
    if (response && typeof response === 'object') {
      if (response.status) {
        responseStatus = response.status;
      } else if (response.statusCode) {
        responseStatus = response.statusCode;
      }
      
      // Extract tokens if available (OpenAI responses)
      if (response.data && response.data.usage) {
        tokensUsed = response.data.usage.total_tokens || null;
      }
    }

    success = responseStatus ? responseStatus < 400 : true;

    try {
      await logApiUsage({
        serviceName,
        endpoint,
        method,
        userId,
        requestPayload,
        responseStatus,
        responseTimeMs,
        tokensUsed: tokensUsed || estimateTokens,
        costEstimate: estimateCost,
        success,
      });
      console.log(`✅ Tracked API call: ${serviceName} ${method} ${endpoint} (success: ${success}, user: ${userId || 'null'})`);
    } catch (logError) {
      console.error(`❌ Failed to track API call for ${serviceName}:`, logError.message);
      // Don't fail the request if tracking fails
    }

    return response;
  } catch (error) {
    const responseTimeMs = Date.now() - startTime;
    
    // Extract error details
    let errorType = 'unknown_error';
    let errorMessage = error.message || 'Unknown error';
    let errorCode = error.code || null;
    let statusCode = null;
    let responseBody = null;

    if (error.response) {
      statusCode = error.response.status;
      responseBody = JSON.stringify(error.response.data);
      
      if (statusCode === 429) {
        errorType = 'rate_limit';
        errorMessage = 'Rate limit exceeded';
      } else if ((statusCode === 401 || statusCode === 403) && serviceName !== 'wikipedia') {
        // Wikipedia doesn't require authentication - 401/403 usually means rate limit or missing User-Agent
        errorType = 'authentication';
        errorMessage = 'Authentication failed';
      } else if (statusCode === 401 || statusCode === 403) {
        // For Wikipedia, 401/403 is more likely a rate limit or API error
        errorType = 'api_error';
        errorMessage = statusCode === 403 ? 'Access forbidden (likely rate limit)' : 'Unauthorized (check User-Agent header)';
      } else if (statusCode >= 500) {
        errorType = 'server_error';
      } else {
        errorType = 'api_error';
      }
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      errorType = 'timeout';
      errorMessage = 'Request timeout';
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      errorType = 'network_error';
      errorMessage = 'Network error';
    }

    await logApiError({
      serviceName,
      endpoint,
      userId,
      errorType,
      errorMessage,
      errorCode,
      statusCode,
      requestPayload,
      responseBody,
    });

    await logApiUsage({
      serviceName,
      endpoint,
      method,
      userId,
      requestPayload,
      responseStatus: statusCode,
      responseTimeMs,
      success: false,
    });

    throw error;
  }
}
