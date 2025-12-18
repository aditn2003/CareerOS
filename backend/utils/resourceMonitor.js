/**
 * UC-136: Resource Usage Monitoring
 * 
 * Monitors CPU, memory, and database connections.
 * Provides real-time metrics for scaling decisions.
 */

import os from 'os';
import pool from '../db/pool.js';

// Metrics storage
const metrics = {
  requests: {
    total: 0,
    success: 0,
    errors: 0,
    avgResponseTime: 0,
    responseTimes: [],
  },
  memory: {
    snapshots: [],
    maxSnapshots: 60, // Keep 60 snapshots (1 hour at 1/min)
  },
  database: {
    queries: 0,
    slowQueries: 0,
    errors: 0,
    avgQueryTime: 0,
    queryTimes: [],
  },
  startTime: Date.now(),
};

/**
 * Get current memory usage
 */
export function getMemoryUsage() {
  const used = process.memoryUsage();
  const total = os.totalmem();
  const free = os.freemem();
  
  return {
    process: {
      heapUsed: Math.round(used.heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(used.heapTotal / 1024 / 1024), // MB
      rss: Math.round(used.rss / 1024 / 1024), // MB
      external: Math.round(used.external / 1024 / 1024), // MB
    },
    system: {
      total: Math.round(total / 1024 / 1024), // MB
      free: Math.round(free / 1024 / 1024), // MB
      used: Math.round((total - free) / 1024 / 1024), // MB
      usagePercent: ((total - free) / total * 100).toFixed(2),
    },
  };
}

/**
 * Get CPU usage
 */
export function getCpuUsage() {
  const cpus = os.cpus();
  let totalIdle = 0;
  let totalTick = 0;
  
  cpus.forEach(cpu => {
    for (const type in cpu.times) {
      totalTick += cpu.times[type];
    }
    totalIdle += cpu.times.idle;
  });
  
  return {
    cores: cpus.length,
    model: cpus[0]?.model || 'Unknown',
    usagePercent: ((1 - totalIdle / totalTick) * 100).toFixed(2),
    loadAverage: os.loadavg(),
  };
}

/**
 * Get database pool statistics
 */
export function getDbPoolStats() {
  return {
    totalCount: pool.totalCount || 0,
    idleCount: pool.idleCount || 0,
    waitingCount: pool.waitingCount || 0,
    activeConnections: (pool.totalCount || 0) - (pool.idleCount || 0),
    maxConnections: pool.options?.max || 0,
  };
}

/**
 * Get application metrics
 */
export function getApplicationMetrics() {
  const uptime = Math.floor((Date.now() - metrics.startTime) / 1000);
  
  return {
    uptime: {
      seconds: uptime,
      formatted: formatUptime(uptime),
    },
    requests: {
      total: metrics.requests.total,
      success: metrics.requests.success,
      errors: metrics.requests.errors,
      successRate: metrics.requests.total > 0
        ? ((metrics.requests.success / metrics.requests.total) * 100).toFixed(2) + '%'
        : 'N/A',
      avgResponseTime: metrics.requests.avgResponseTime.toFixed(2) + 'ms',
    },
    database: {
      queries: metrics.database.queries,
      slowQueries: metrics.database.slowQueries,
      errors: metrics.database.errors,
      avgQueryTime: metrics.database.avgQueryTime.toFixed(2) + 'ms',
    },
  };
}

/**
 * Format uptime to human readable string
 */
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${secs}s`);
  
  return parts.join(' ');
}

/**
 * Record request metrics
 */
export function recordRequest(responseTime, isError = false) {
  metrics.requests.total++;
  
  if (isError) {
    metrics.requests.errors++;
  } else {
    metrics.requests.success++;
  }
  
  // Track response times (keep last 1000)
  metrics.requests.responseTimes.push(responseTime);
  if (metrics.requests.responseTimes.length > 1000) {
    metrics.requests.responseTimes.shift();
  }
  
  // Calculate average
  metrics.requests.avgResponseTime = 
    metrics.requests.responseTimes.reduce((a, b) => a + b, 0) / 
    metrics.requests.responseTimes.length;
}

/**
 * Record database query metrics
 */
export function recordQuery(queryTime, isSlow = false, isError = false) {
  metrics.database.queries++;
  
  if (isSlow) metrics.database.slowQueries++;
  if (isError) metrics.database.errors++;
  
  // Track query times (keep last 1000)
  metrics.database.queryTimes.push(queryTime);
  if (metrics.database.queryTimes.length > 1000) {
    metrics.database.queryTimes.shift();
  }
  
  // Calculate average
  metrics.database.avgQueryTime = 
    metrics.database.queryTimes.reduce((a, b) => a + b, 0) / 
    metrics.database.queryTimes.length;
}

/**
 * Get comprehensive system health report
 */
export function getHealthReport() {
  const memory = getMemoryUsage();
  const cpu = getCpuUsage();
  const dbPool = getDbPoolStats();
  const app = getApplicationMetrics();
  
  // Determine overall health status
  let status = 'healthy';
  const issues = [];
  
  // Check memory (warn if > 80%, critical if > 95%)
  if (parseFloat(memory.system.usagePercent) > 95) {
    status = 'critical';
    issues.push('System memory usage critical (>95%)');
  } else if (parseFloat(memory.system.usagePercent) > 80) {
    status = status === 'healthy' ? 'warning' : status;
    issues.push('System memory usage high (>80%)');
  }
  
  // Check CPU (warn if > 80%, critical if > 95%)
  if (parseFloat(cpu.usagePercent) > 95) {
    status = 'critical';
    issues.push('CPU usage critical (>95%)');
  } else if (parseFloat(cpu.usagePercent) > 80) {
    status = status === 'healthy' ? 'warning' : status;
    issues.push('CPU usage high (>80%)');
  }
  
  // Check DB pool (warn if >80% used, critical if full)
  const dbUsagePercent = dbPool.maxConnections > 0 
    ? (dbPool.activeConnections / dbPool.maxConnections * 100)
    : 0;
  
  if (dbUsagePercent >= 100) {
    status = 'critical';
    issues.push('Database connection pool exhausted');
  } else if (dbUsagePercent > 80) {
    status = status === 'healthy' ? 'warning' : status;
    issues.push('Database connection pool usage high (>80%)');
  }
  
  // Check error rate
  const errorRate = app.requests.total > 0 
    ? (app.requests.errors / app.requests.total * 100)
    : 0;
  
  if (errorRate > 10) {
    status = status === 'healthy' ? 'warning' : status;
    issues.push(`High error rate (${errorRate.toFixed(2)}%)`);
  }
  
  return {
    status,
    issues,
    timestamp: new Date().toISOString(),
    memory,
    cpu,
    database: {
      pool: dbPool,
      metrics: app.database,
    },
    application: app,
  };
}

/**
 * Middleware to track request metrics
 */
export function metricsMiddleware(req, res, next) {
  const startTime = Date.now();
  
  // Record response metrics when finished
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    const isError = res.statusCode >= 400;
    recordRequest(responseTime, isError);
  });
  
  next();
}

/**
 * Express route handler for health/metrics endpoint
 */
export function healthCheckHandler(req, res) {
  const report = getHealthReport();
  
  // Set appropriate status code based on health
  const statusCode = report.status === 'critical' ? 503 : 
                     report.status === 'warning' ? 200 : 200;
  
  res.status(statusCode).json(report);
}

/**
 * Express route handler for detailed metrics
 */
export function metricsHandler(req, res) {
  res.json({
    memory: getMemoryUsage(),
    cpu: getCpuUsage(),
    database: getDbPoolStats(),
    application: getApplicationMetrics(),
    timestamp: new Date().toISOString(),
  });
}

export default {
  getMemoryUsage,
  getCpuUsage,
  getDbPoolStats,
  getApplicationMetrics,
  getHealthReport,
  recordRequest,
  recordQuery,
  metricsMiddleware,
  healthCheckHandler,
  metricsHandler,
};

