// =======================
// monitoring.js — Monitoring and Metrics Routes (UC-133)
// =======================
import express from 'express';
import { metricsCollector } from '../utils/monitoring.js';
import { auth } from '../auth.js';
import pool from '../db/pool.js';
import { logInfo, logError } from '../utils/logger.js';

const router = express.Router();

/**
 * Enhanced health check endpoint for UptimeRobot
 * GET /api/monitoring/health
 */
router.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {},
  };

  try {
    // Database health check
    const dbStart = Date.now();
    const dbResult = await pool.query('SELECT 1 as health');
    const dbResponseTime = Date.now() - dbStart;
    
    health.checks.database = {
      status: dbResult.rows[0]?.health === 1 ? 'healthy' : 'unhealthy',
      responseTime: `${dbResponseTime}ms`,
    };

    if (dbResult.rows[0]?.health !== 1) {
      health.status = 'degraded';
    }
  } catch (error) {
    health.status = 'unhealthy';
    health.checks.database = {
      status: 'unhealthy',
      error: error.message,
    };
    logError('Health check failed: Database', error);
  }

  // Memory usage
  const memoryUsage = process.memoryUsage();
  health.checks.memory = {
    status: 'healthy',
    heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
    heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
    rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
  };

  // Check if memory usage is too high (> 90% of heap)
  const heapUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
  if (heapUsagePercent > 90) {
    health.status = 'degraded';
    health.checks.memory.status = 'warning';
    health.checks.memory.heapUsagePercent = Math.round(heapUsagePercent);
  }

  const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;
  res.status(statusCode).json(health);
});

/**
 * Metrics dashboard endpoint
 * GET /api/monitoring/metrics
 * Requires authentication
 */
router.get('/metrics', auth, async (req, res) => {
  try {
    const metrics = metricsCollector.getMetrics();
    
    // Add database connection pool stats
    const poolStats = {
      totalCount: pool.totalCount || 0,
      idleCount: pool.idleCount || 0,
      waitingCount: pool.waitingCount || 0,
    };
    
    res.json({
      ...metrics,
      database: {
        pool: poolStats,
      },
    });
  } catch (error) {
    logError('Error fetching metrics', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

/**
 * Reset metrics (admin only - consider adding admin check)
 * POST /api/monitoring/metrics/reset
 */
router.post('/metrics/reset', auth, async (req, res) => {
  try {
    metricsCollector.reset();
    logInfo('Metrics reset', { userId: req.user.id });
    res.json({ message: 'Metrics reset successfully' });
  } catch (error) {
    logError('Error resetting metrics', error);
    res.status(500).json({ error: 'Failed to reset metrics' });
  }
});

/**
 * Alerts endpoint - returns current alert status
 * GET /api/monitoring/alerts
 */
router.get('/alerts', auth, async (req, res) => {
  try {
    const metrics = metricsCollector.getMetrics();
    const alerts = [];

    // Check error rate
    if (metrics.errors.rate > 5) {
      alerts.push({
        level: 'critical',
        type: 'high_error_rate',
        message: `Error rate is ${metrics.errors.rate}% (threshold: 5%)`,
        value: metrics.errors.rate,
        threshold: 5,
      });
    } else if (metrics.errors.rate > 2) {
      alerts.push({
        level: 'warning',
        type: 'elevated_error_rate',
        message: `Error rate is ${metrics.errors.rate}% (threshold: 2%)`,
        value: metrics.errors.rate,
        threshold: 2,
      });
    }

    // Check response time
    if (metrics.performance.p95 > 2000) {
      alerts.push({
        level: 'critical',
        type: 'slow_response_time',
        message: `P95 response time is ${metrics.performance.p95}ms (threshold: 2000ms)`,
        value: metrics.performance.p95,
        threshold: 2000,
      });
    } else if (metrics.performance.p95 > 1000) {
      alerts.push({
        level: 'warning',
        type: 'elevated_response_time',
        message: `P95 response time is ${metrics.performance.p95}ms (threshold: 1000ms)`,
        value: metrics.performance.p95,
        threshold: 1000,
      });
    }

    // Check memory usage
    const memoryUsage = process.memoryUsage();
    const heapUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
    if (heapUsagePercent > 90) {
      alerts.push({
        level: 'critical',
        type: 'high_memory_usage',
        message: `Heap usage is ${Math.round(heapUsagePercent)}% (threshold: 90%)`,
        value: Math.round(heapUsagePercent),
        threshold: 90,
      });
    }

    res.json({
      alerts,
      count: alerts.length,
      critical: alerts.filter(a => a.level === 'critical').length,
      warnings: alerts.filter(a => a.level === 'warning').length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logError('Error fetching alerts', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

export default router;

