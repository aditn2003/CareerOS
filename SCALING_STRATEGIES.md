# UC-136: Scaling Strategies for Future Growth

This document outlines the scaling strategies implemented and recommended for the ATS Career OS application.

---

## Table of Contents

1. [Current Implementation](#current-implementation)
2. [Horizontal Scaling](#horizontal-scaling)
3. [Vertical Scaling](#vertical-scaling)
4. [Database Scaling](#database-scaling)
5. [Caching Strategy](#caching-strategy)
6. [Load Balancing](#load-balancing)
7. [Monitoring & Alerts](#monitoring--alerts)
8. [Cost-Effective Scaling](#cost-effective-scaling)

---

## Current Implementation

### Database Connection Pooling ✅

```javascript
// backend/db/pool.js
const pool = new Pool({
  max: isSupabase ? 2 : 20,     // Connection limit
  min: isSupabase ? 0 : 2,      // Minimum connections
  idleTimeoutMillis: 60000,     // Close idle connections after 1 min
  connectionTimeoutMillis: 5000, // Connection timeout
});
```

**Benefits:**
- Reuses database connections instead of creating new ones
- Reduces connection overhead
- Prevents connection exhaustion

### In-Memory Caching ✅

```javascript
// backend/utils/cache.js
const cacheService = {
  get(key),
  set(key, value, ttl),
  del(key),
  delPattern(pattern),
};
```

**Cache TTLs:**
- User profile: 5 minutes
- Dashboard stats: 2 minutes
- Company research: 1 hour
- Static data (templates): 24 hours

### Database Indexes ✅

Key indexes created for performance:
- `idx_jobs_user_id` - Fast job lookups by user
- `idx_jobs_user_status` - Filtered job queries
- `idx_jobs_search` - Full-text search on jobs
- See `backend/db/add_performance_indexes.sql`

### Pagination ✅

```javascript
// Standard pagination across all endpoints
const { page, limit, offset } = parsePaginationParams(req.query);
// Default: page=1, limit=20, maxLimit=100
```

---

## Horizontal Scaling

### When to Scale Horizontally

| Metric | Threshold | Action |
|--------|-----------|--------|
| CPU Usage | > 80% sustained | Add more instances |
| Response Time P95 | > 500ms | Add more instances |
| Request Queue | > 100 waiting | Add more instances |
| Error Rate | > 5% | Investigate, then scale |

### Implementation Steps

1. **Containerize the Application**
   ```dockerfile
   # Already have Dockerfile
   docker build -t ats-backend .
   ```

2. **Use Stateless Design**
   - JWT tokens (no server-side sessions) ✅
   - All state in database ✅
   - No local file dependencies ✅

3. **Deploy Multiple Instances**
   ```bash
   # Example with Docker Compose
   docker-compose up --scale backend=3
   ```

4. **Configure Load Balancer**
   - Use Render/Railway built-in load balancing
   - Or configure NGINX/HAProxy

### Recommended Platforms (Free/Low-Cost)

| Platform | Free Tier | Scaling |
|----------|-----------|---------|
| Render | 750 hours/month | Auto-scale available |
| Railway | $5 credit/month | Manual scaling |
| Fly.io | 3 shared VMs | Auto-scale available |
| Heroku | Limited free | Dynos scaling |

---

## Vertical Scaling

### When to Scale Vertically

| Current | Upgrade To | When |
|---------|------------|------|
| 256MB RAM | 512MB | Memory > 80% |
| 512MB RAM | 1GB | Memory > 80% |
| 1 vCPU | 2 vCPU | CPU > 80% |

### Node.js Optimizations

```javascript
// Increase heap size if needed
node --max-old-space-size=1024 server.js

// Enable cluster mode for multi-core
import cluster from 'cluster';
import os from 'os';

if (cluster.isPrimary) {
  const numCPUs = os.cpus().length;
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
} else {
  // Start server
}
```

---

## Database Scaling

### Supabase Scaling Path

| Tier | Connections | Storage | When to Upgrade |
|------|-------------|---------|-----------------|
| Free | 2 pooled | 500MB | Development |
| Pro ($25/mo) | 60 pooled | 8GB | 100+ active users |
| Team ($599/mo) | 200 pooled | 100GB | 1000+ active users |

### Query Optimization

```sql
-- Use EXPLAIN ANALYZE to identify slow queries
EXPLAIN ANALYZE SELECT * FROM jobs WHERE user_id = 123;

-- Add indexes for slow queries
CREATE INDEX CONCURRENTLY idx_custom ON table(column);
```

### Read Replicas (Future)

When database becomes bottleneck:
1. Enable read replicas on Supabase Pro
2. Route read queries to replicas
3. Keep writes on primary

---

## Caching Strategy

### Cache Hierarchy

```
┌─────────────────────────────────────────┐
│          Client Browser Cache           │
│         (Static assets, 30 days)        │
├─────────────────────────────────────────┤
│            CDN Cache Layer              │
│      (Cloudflare, static content)       │
├─────────────────────────────────────────┤
│         Application Cache               │
│    (In-memory, frequently accessed)     │
├─────────────────────────────────────────┤
│         Redis Cache (Future)            │
│      (Shared across instances)          │
├─────────────────────────────────────────┤
│            PostgreSQL                   │
│         (Source of truth)               │
└─────────────────────────────────────────┘
```

### What to Cache

| Data Type | TTL | Priority |
|-----------|-----|----------|
| User session | 2 hours | High |
| Dashboard stats | 2 minutes | High |
| Job listings | 5 minutes | Medium |
| Company research | 1 hour | Medium |
| Salary data | 24 hours | Low |
| Templates | 24 hours | Low |

### Redis Migration (When Needed)

```javascript
// When to migrate to Redis:
// - Multiple server instances
// - Cache size > 100MB
// - Need cache persistence

import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_URL);
```

---

## Load Balancing

### Current Setup

Single instance with built-in rate limiting:
- Auth endpoints: 10 req/15 min
- API endpoints: 100 req/min

### Multi-Instance Setup

```nginx
# NGINX load balancer config
upstream backend {
    least_conn;
    server backend1:4000;
    server backend2:4000;
    server backend3:4000;
}

server {
    location /api {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
    }
}
```

### Health Checks

```javascript
// GET /api/scalability/health
// Returns: { status: 'healthy' | 'warning' | 'critical' }
```

---

## Monitoring & Alerts

### Metrics to Monitor

| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| CPU Usage | > 70% | > 90% | Scale up |
| Memory Usage | > 80% | > 95% | Scale up |
| Response Time P95 | > 300ms | > 1000ms | Optimize/Scale |
| Error Rate | > 1% | > 5% | Investigate |
| DB Connections | > 70% | > 90% | Increase pool |

### Monitoring Endpoints

```bash
# Health check
GET /api/scalability/health

# Detailed metrics
GET /api/scalability/metrics

# Recommendations
GET /api/scalability/recommendations
```

### Alert Setup (Recommended)

1. **Uptime Monitoring**: UptimeRobot (free)
2. **Error Tracking**: Sentry (already configured)
3. **Log Aggregation**: LogDNA/Papertrail (free tier)

---

## Cost-Effective Scaling

### Scaling Decision Matrix

| Daily Active Users | Recommended Setup | Est. Cost |
|-------------------|-------------------|-----------|
| < 100 | Single instance, free tier | $0 |
| 100-500 | Single instance, paid tier | $10-25/mo |
| 500-2000 | 2-3 instances, load balanced | $50-100/mo |
| 2000-10000 | Auto-scaling cluster | $200-500/mo |

### Cost Optimization Tips

1. **Use Caching Aggressively**
   - Reduces database queries
   - Reduces compute time
   - Cache hit rate target: > 70%

2. **Optimize Database Queries**
   - Add indexes before scaling
   - Use pagination everywhere
   - Avoid N+1 queries

3. **Compress Responses**
   ```javascript
   app.use(compression()); // Already implemented
   ```

4. **Use CDN for Static Assets**
   - Cloudflare free tier
   - Reduces server load

5. **Implement Request Coalescing**
   - Batch similar requests
   - Debounce real-time updates

---

## Scaling Checklist

### Before You Scale

- [ ] Run load tests (`npm run load-test`)
- [ ] Check current metrics (`/api/scalability/metrics`)
- [ ] Review slow queries (`/api/scalability/db/slow-queries`)
- [ ] Verify indexes are used (`EXPLAIN ANALYZE`)
- [ ] Check cache hit rate (`/api/scalability/cache/stats`)

### Scaling Steps

1. [ ] Identify bottleneck (CPU, memory, DB, network)
2. [ ] Optimize before scaling (indexes, caching, queries)
3. [ ] Scale appropriate resource
4. [ ] Monitor after scaling
5. [ ] Document changes

### Post-Scaling

- [ ] Verify improved performance
- [ ] Update monitoring thresholds
- [ ] Document new architecture
- [ ] Plan for next scaling point

---

## Quick Reference Commands

```bash
# Run load test
npm run load-test

# Heavy load test
npm run load-test:heavy

# Check health
curl http://localhost:4000/api/scalability/health

# Check metrics
curl -H "Authorization: Bearer $TOKEN" http://localhost:4000/api/scalability/metrics

# Check cache stats
curl -H "Authorization: Bearer $TOKEN" http://localhost:4000/api/scalability/cache/stats

# Get recommendations
curl -H "Authorization: Bearer $TOKEN" http://localhost:4000/api/scalability/recommendations
```

---

*Last Updated: December 2025*
*UC-136: Scalability and Resource Management*

