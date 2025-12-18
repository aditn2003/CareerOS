/**
 * UC-136: Scalability and Resource Management Routes
 * 
 * Provides endpoints for:
 * - Health checks
 * - Resource monitoring
 * - Cache management
 * - Performance metrics
 */

import express from 'express';
import { 
  getHealthReport, 
  metricsHandler, 
  getMemoryUsage, 
  getCpuUsage, 
  getDbPoolStats,
  getApplicationMetrics 
} from '../utils/resourceMonitor.js';
import { cacheService, CACHE_KEYS, invalidateCache } from '../utils/cache.js';
import pool from '../db/pool.js';
import { auth } from '../auth.js';

const router = express.Router();

/**
 * GET /api/scalability/health
 * Comprehensive health check endpoint
 */
router.get('/health', (req, res) => {
  const report = getHealthReport();
  const statusCode = report.status === 'critical' ? 503 : 200;
  res.status(statusCode).json(report);
});

/**
 * GET /api/scalability/metrics
 * Detailed system metrics (protected)
 */
router.get('/metrics', auth, (req, res) => {
  res.json({
    memory: getMemoryUsage(),
    cpu: getCpuUsage(),
    database: getDbPoolStats(),
    application: getApplicationMetrics(),
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/scalability/cache/stats
 * Cache statistics (protected)
 */
router.get('/cache/stats', auth, (req, res) => {
  res.json({
    success: true,
    data: cacheService.getStats(),
  });
});

/**
 * GET /api/scalability/cache/keys
 * List cache keys (protected, for debugging)
 */
router.get('/cache/keys', auth, async (req, res) => {
  const pattern = req.query.pattern || '*';
  const keys = await cacheService.keys(pattern);
  res.json({
    success: true,
    data: {
      pattern,
      count: keys.length,
      keys: keys.slice(0, 100), // Limit to first 100
    },
  });
});

/**
 * DELETE /api/scalability/cache/flush
 * Flush all cache (protected)
 */
router.delete('/cache/flush', auth, async (req, res) => {
  await cacheService.flushAll();
  res.json({
    success: true,
    message: 'Cache flushed successfully',
  });
});

/**
 * DELETE /api/scalability/cache/user/:userId
 * Invalidate cache for a specific user (protected)
 */
router.delete('/cache/user/:userId', auth, async (req, res) => {
  const { userId } = req.params;
  await invalidateCache.user(userId);
  res.json({
    success: true,
    message: `Cache invalidated for user ${userId}`,
  });
});

/**
 * GET /api/scalability/db/pool
 * Database pool statistics (protected)
 */
router.get('/db/pool', auth, (req, res) => {
  const poolStats = getDbPoolStats();
  res.json({
    success: true,
    data: poolStats,
  });
});

/**
 * GET /api/scalability/db/query-stats
 * Database query statistics (protected)
 */
router.get('/db/query-stats', auth, async (req, res) => {
  try {
    // Get table statistics
    const tableStatsResult = await pool.query(`
      SELECT 
        schemaname,
        relname as table_name,
        n_live_tup as row_count,
        n_dead_tup as dead_rows,
        last_vacuum,
        last_autovacuum,
        last_analyze,
        last_autoanalyze
      FROM pg_stat_user_tables
      ORDER BY n_live_tup DESC
      LIMIT 20
    `);
    
    // Get index usage statistics
    const indexStatsResult = await pool.query(`
      SELECT 
        schemaname,
        relname as table_name,
        indexrelname as index_name,
        idx_scan as scans,
        idx_tup_read as tuples_read,
        idx_tup_fetch as tuples_fetched
      FROM pg_stat_user_indexes
      WHERE idx_scan > 0
      ORDER BY idx_scan DESC
      LIMIT 20
    `);
    
    res.json({
      success: true,
      data: {
        tables: tableStatsResult.rows,
        indexes: indexStatsResult.rows,
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

/**
 * GET /api/scalability/db/slow-queries
 * Slow query analysis (protected)
 */
router.get('/db/slow-queries', auth, async (req, res) => {
  try {
    // Check if pg_stat_statements extension is available
    const extensionCheck = await pool.query(`
      SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements'
    `);
    
    if (extensionCheck.rows.length === 0) {
      return res.json({
        success: true,
        message: 'pg_stat_statements extension not available',
        data: [],
      });
    }
    
    // Get slow queries
    const result = await pool.query(`
      SELECT 
        query,
        calls,
        total_time,
        mean_time,
        rows
      FROM pg_stat_statements
      WHERE mean_time > 100
      ORDER BY mean_time DESC
      LIMIT 10
    `);
    
    res.json({
      success: true,
      data: result.rows,
    });
  } catch (err) {
    // pg_stat_statements might not be available
    res.json({
      success: true,
      message: 'Query statistics not available',
      data: [],
    });
  }
});

/**
 * GET /api/scalability/recommendations
 * Get scaling recommendations based on current metrics
 */
router.get('/recommendations', auth, (req, res) => {
  const health = getHealthReport();
  const recommendations = [];
  
  // Memory recommendations
  const memUsage = parseFloat(health.memory.system.usagePercent);
  if (memUsage > 80) {
    recommendations.push({
      category: 'memory',
      severity: memUsage > 95 ? 'critical' : 'warning',
      message: `System memory usage is ${memUsage}%`,
      action: 'Consider upgrading server memory or optimizing memory-intensive operations',
    });
  }
  
  // CPU recommendations
  const cpuUsage = parseFloat(health.cpu.usagePercent);
  if (cpuUsage > 80) {
    recommendations.push({
      category: 'cpu',
      severity: cpuUsage > 95 ? 'critical' : 'warning',
      message: `CPU usage is ${cpuUsage}%`,
      action: 'Consider adding more CPU cores or optimizing compute-intensive operations',
    });
  }
  
  // Database recommendations
  const dbPool = health.database.pool;
  const dbUsage = dbPool.maxConnections > 0 
    ? (dbPool.activeConnections / dbPool.maxConnections * 100)
    : 0;
  
  if (dbUsage > 80) {
    recommendations.push({
      category: 'database',
      severity: dbUsage >= 100 ? 'critical' : 'warning',
      message: `Database pool usage is ${dbUsage.toFixed(0)}%`,
      action: 'Consider increasing pool size or optimizing query performance',
    });
  }
  
  // Error rate recommendations
  const errorRate = health.application.requests.total > 0
    ? (health.application.requests.errors / health.application.requests.total * 100)
    : 0;
  
  if (errorRate > 5) {
    recommendations.push({
      category: 'reliability',
      severity: errorRate > 10 ? 'critical' : 'warning',
      message: `Error rate is ${errorRate.toFixed(2)}%`,
      action: 'Investigate error logs and fix failing endpoints',
    });
  }
  
  // Response time recommendations
  const avgResponseTime = parseFloat(health.application.requests.avgResponseTime);
  if (avgResponseTime > 500) {
    recommendations.push({
      category: 'performance',
      severity: avgResponseTime > 1000 ? 'critical' : 'warning',
      message: `Average response time is ${avgResponseTime.toFixed(0)}ms`,
      action: 'Consider adding caching, optimizing queries, or adding indexes',
    });
  }
  
  // Cache recommendations
  const cacheStats = cacheService.getStats();
  const hitRate = parseFloat(cacheStats.hitRate);
  if (hitRate < 50 && cacheStats.hits + cacheStats.misses > 100) {
    recommendations.push({
      category: 'caching',
      severity: 'info',
      message: `Cache hit rate is ${hitRate}%`,
      action: 'Consider caching more frequently accessed data',
    });
  }
  
  // Add general recommendations if system is healthy
  if (recommendations.length === 0) {
    recommendations.push({
      category: 'general',
      severity: 'info',
      message: 'System is operating within normal parameters',
      action: 'Continue monitoring and consider proactive scaling as user base grows',
    });
  }
  
  res.json({
    success: true,
    data: {
      status: health.status,
      recommendations,
      timestamp: new Date().toISOString(),
    },
  });
});

/**
 * POST /api/scalability/test/cache
 * Test cache functionality
 */
router.post('/test/cache', auth, async (req, res) => {
  const testKey = 'test:cache:' + Date.now();
  const testValue = { test: true, timestamp: Date.now() };
  
  // Set
  await cacheService.set(testKey, testValue, 60);
  
  // Get
  const retrieved = await cacheService.get(testKey);
  
  // TTL
  const ttl = await cacheService.ttl(testKey);
  
  // Delete
  await cacheService.del(testKey);
  
  // Verify deleted
  const afterDelete = await cacheService.get(testKey);
  
  res.json({
    success: true,
    data: {
      setSuccess: true,
      getSuccess: JSON.stringify(retrieved) === JSON.stringify(testValue),
      ttlSuccess: ttl > 0,
      deleteSuccess: afterDelete === null,
    },
  });
});

export default router;

