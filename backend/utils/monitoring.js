// =======================
// monitoring.js — Metrics Collection and Monitoring (UC-133)
// =======================

// In-memory metrics store (in production, consider Redis or a time-series DB)
class MetricsCollector {
  constructor() {
    this.metrics = {
      requests: {
        total: 0,
        byMethod: {},
        byRoute: {},
        byStatus: {},
      },
      responseTimes: [],
      errors: [],
      uptime: Date.now(),
    };
    
    // Keep only last 1000 response times for memory efficiency
    this.maxResponseTimes = 1000;
    this.maxErrors = 500;
  }

  recordRequest(method, route, statusCode, responseTime, userId = null) {
    this.metrics.requests.total++;
    
    // Track by method
    this.metrics.requests.byMethod[method] = 
      (this.metrics.requests.byMethod[method] || 0) + 1;
    
    // Track by route (normalize route patterns)
    const normalizedRoute = this.normalizeRoute(route);
    this.metrics.requests.byRoute[normalizedRoute] = 
      (this.metrics.requests.byRoute[normalizedRoute] || 0) + 1;
    
    // Track by status code
    const statusCategory = `${Math.floor(statusCode / 100)}xx`;
    this.metrics.requests.byStatus[statusCategory] = 
      (this.metrics.requests.byStatus[statusCategory] || 0) + 1;
    
    // Track response time
    if (this.metrics.responseTimes.length >= this.maxResponseTimes) {
      this.metrics.responseTimes.shift();
    }
    this.metrics.responseTimes.push({
      route: normalizedRoute,
      method,
      statusCode,
      responseTime,
      timestamp: Date.now(),
      userId,
    });
    
    // Track errors (4xx and 5xx)
    if (statusCode >= 400) {
      if (this.metrics.errors.length >= this.maxErrors) {
        this.metrics.errors.shift();
      }
      this.metrics.errors.push({
        route: normalizedRoute,
        method,
        statusCode,
        responseTime,
        timestamp: Date.now(),
        userId,
      });
    }
  }

  normalizeRoute(route) {
    // Replace IDs and dynamic segments with placeholders
    return route
      .replace(/\/\d+/g, '/:id')
      .replace(/\/[a-f0-9-]{36}/gi, '/:uuid')
      .replace(/\/[a-zA-Z0-9_-]+@[a-zA-Z0-9.-]+/g, '/:email');
  }

  getMetrics() {
    const now = Date.now();
    const uptimeSeconds = Math.floor((now - this.metrics.uptime) / 1000);
    
    // Calculate average response time
    const responseTimes = this.metrics.responseTimes.map(r => r.responseTime);
    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;
    
    // Calculate error rate (last hour)
    const oneHourAgo = now - 60 * 60 * 1000;
    const recentErrors = this.metrics.errors.filter(e => e.timestamp > oneHourAgo);
    const recentRequests = this.metrics.responseTimes.filter(r => r.timestamp > oneHourAgo);
    const errorRate = recentRequests.length > 0
      ? (recentErrors.length / recentRequests.length) * 100
      : 0;
    
    // Calculate requests per minute
    const recentRequestsCount = this.metrics.responseTimes.filter(
      r => r.timestamp > now - 60 * 1000
    ).length;
    
    // Get top routes
    const topRoutes = Object.entries(this.metrics.requests.byRoute)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([route, count]) => ({ route, count }));
    
    // Get top error routes
    const errorRoutes = recentErrors.reduce((acc, error) => {
      const key = `${error.method} ${error.route}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const topErrorRoutes = Object.entries(errorRoutes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([route, count]) => ({ route, count }));
    
    return {
      uptime: {
        seconds: uptimeSeconds,
        formatted: this.formatUptime(uptimeSeconds),
      },
      requests: {
        total: this.metrics.requests.total,
        perMinute: recentRequestsCount,
        byMethod: this.metrics.requests.byMethod,
        byStatus: this.metrics.requests.byStatus,
        topRoutes,
      },
      performance: {
        averageResponseTime: Math.round(avgResponseTime),
        p50: this.percentile(responseTimes, 50),
        p95: this.percentile(responseTimes, 95),
        p99: this.percentile(responseTimes, 99),
      },
      errors: {
        total: this.metrics.errors.length,
        rate: Math.round(errorRate * 100) / 100,
        recent: recentErrors.length,
        topRoutes: topErrorRoutes,
      },
      timestamp: new Date().toISOString(),
    };
  }

  percentile(arr, p) {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil((sorted.length * p) / 100) - 1;
    return Math.round(sorted[Math.max(0, index)] || 0);
  }

  formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  }

  reset() {
    this.metrics = {
      requests: {
        total: 0,
        byMethod: {},
        byRoute: {},
        byStatus: {},
      },
      responseTimes: [],
      errors: [],
      uptime: Date.now(),
    };
  }
}

// Export singleton instance
export const metricsCollector = new MetricsCollector();

