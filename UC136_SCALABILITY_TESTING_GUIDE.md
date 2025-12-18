# UC-136: Scalability Testing Guide

This guide walks you through testing all scalability features implemented.

---

## Prerequisites

1. **Start the backend server:**
   ```bash
   cd backend && npm run dev
   ```

2. **Have a terminal ready for curl commands**

3. **Get an auth token** (login and copy token from response)

---

## Test 1: Health Check Endpoint ✅

### Test 1.1: Basic Health Check (No Auth Required)

```bash
curl http://localhost:4000/api/scalability/health | jq
```

**Expected Result:** JSON with system health status

```json
{
  "status": "healthy",
  "issues": [],
  "memory": { ... },
  "cpu": { ... },
  "database": { ... },
  "application": { ... }
}
```

**What to verify:**
- `status` is "healthy", "warning", or "critical"
- Memory, CPU, and database metrics are populated
- Response time < 100ms

---

## Test 2: Resource Metrics (Auth Required) ✅

### Test 2.1: Get Detailed Metrics

```bash
# First, get a token by logging in
TOKEN=$(curl -s -X POST http://localhost:4000/login \
  -H "Content-Type: application/json" \
  -d '{"email":"YOUR_EMAIL","password":"YOUR_PASSWORD"}' | grep -o '"token":"[^"]*' | cut -d'"' -f4)

# Then get metrics
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/api/scalability/metrics | jq
```

**Expected Result:**
```json
{
  "memory": {
    "process": { "heapUsed": 150, "heapTotal": 200, ... },
    "system": { "total": 8192, "free": 2000, "usagePercent": "75.00" }
  },
  "cpu": { "cores": 8, "usagePercent": "25.00" },
  "database": { "totalCount": 2, "idleCount": 1, "activeConnections": 1 },
  "application": { "uptime": { "seconds": 300, "formatted": "5m 0s" } }
}
```

---

## Test 3: Database Pool Statistics ✅

### Test 3.1: Check Connection Pool

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/api/scalability/db/pool | jq
```

**Expected Result:**
```json
{
  "success": true,
  "data": {
    "totalCount": 2,
    "idleCount": 1,
    "waitingCount": 0,
    "activeConnections": 1,
    "maxConnections": 2
  }
}
```

**What to verify:**
- `activeConnections` < `maxConnections`
- `waitingCount` should be 0 under normal load

---

## Test 4: Cache Statistics ✅

### Test 4.1: Check Cache Stats

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/api/scalability/cache/stats | jq
```

**Expected Result:**
```json
{
  "success": true,
  "data": {
    "hits": 10,
    "misses": 5,
    "sets": 15,
    "deletes": 0,
    "evictions": 0,
    "hitRate": "66.67%",
    "size": 15,
    "maxSize": 1000
  }
}
```

### Test 4.2: Test Cache Functionality

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/api/scalability/test/cache | jq
```

**Expected Result:**
```json
{
  "success": true,
  "data": {
    "setSuccess": true,
    "getSuccess": true,
    "ttlSuccess": true,
    "deleteSuccess": true
  }
}
```

---

## Test 5: Load Testing ✅

### Test 5.1: Basic Load Test

```bash
cd backend
npm run load-test
```

**Expected Output:**
```
🔥 UC-136: Load Test Starting...

Configuration:
  Base URL: http://localhost:4000
  Concurrent Users: 10
  Duration: 30s
  Target RPS/user: 2

📊 LOAD TEST RESULTS

Summary:
  Total Requests:    600
  Successful:        180 (30.00%)
  Failed:            420 (70.00%)
  Requests/Second:   20.00

Response Times (ms):
  Min:     2ms
  Max:     100ms
  Average: 15.00ms
  Median:  10ms
  P95:     50ms
  P99:     80ms
```

### Test 5.2: Load Test with Auth Token

```bash
npm run load-test -- --token YOUR_JWT_TOKEN
```

**Note:** With auth token, more requests should succeed (lower error rate)

### Test 5.3: Heavy Load Test

```bash
npm run load-test:heavy
# Runs with 50 users, 60s duration, 5 RPS per user
```

---

## Test 6: Scaling Recommendations ✅

### Test 6.1: Get Recommendations

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/api/scalability/recommendations | jq
```

**Expected Result:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "recommendations": [
      {
        "category": "general",
        "severity": "info",
        "message": "System is operating within normal parameters",
        "action": "Continue monitoring..."
      }
    ]
  }
}
```

---

## Test 7: Database Query Stats ✅

### Test 7.1: Check Table Statistics

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/api/scalability/db/query-stats | jq
```

**Expected Result:**
```json
{
  "success": true,
  "data": {
    "tables": [
      { "table_name": "jobs", "row_count": 500, ... },
      { "table_name": "users", "row_count": 100, ... }
    ],
    "indexes": [
      { "index_name": "idx_jobs_user_id", "scans": 1000, ... }
    ]
  }
}
```

---

## Test 8: Cache Invalidation ✅

### Test 8.1: Flush User Cache

```bash
curl -X DELETE -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/api/scalability/cache/user/123 | jq
```

**Expected Result:**
```json
{
  "success": true,
  "message": "Cache invalidated for user 123"
}
```

### Test 8.2: Flush All Cache

```bash
curl -X DELETE -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/api/scalability/cache/flush | jq
```

---

## Test Summary Checklist

| # | Test | Status |
|---|------|--------|
| 1.1 | Health check returns system status | ☐ |
| 2.1 | Metrics endpoint returns resource data | ☐ |
| 3.1 | DB pool stats show connection info | ☐ |
| 4.1 | Cache stats show hit/miss rates | ☐ |
| 4.2 | Cache set/get/delete works | ☐ |
| 5.1 | Load test runs successfully | ☐ |
| 5.2 | Load test with auth token | ☐ |
| 6.1 | Recommendations returned | ☐ |
| 7.1 | Query stats returned | ☐ |
| 8.1 | User cache invalidation works | ☐ |
| 8.2 | Full cache flush works | ☐ |

---

## Quick Reference Commands

```bash
# Start server
cd backend && npm run dev

# Health check (no auth)
curl http://localhost:4000/api/scalability/health | jq

# Get metrics (auth required)
curl -H "Authorization: Bearer $TOKEN" http://localhost:4000/api/scalability/metrics | jq

# Cache stats
curl -H "Authorization: Bearer $TOKEN" http://localhost:4000/api/scalability/cache/stats | jq

# Load test
npm run load-test

# Heavy load test
npm run load-test:heavy

# Get recommendations
curl -H "Authorization: Bearer $TOKEN" http://localhost:4000/api/scalability/recommendations | jq
```

---

## Files Created for UC-136

| File | Purpose |
|------|---------|
| `backend/utils/cache.js` | In-memory caching layer |
| `backend/utils/pagination.js` | Standardized pagination utility |
| `backend/utils/resourceMonitor.js` | CPU, memory, DB monitoring |
| `backend/routes/scalability.js` | API endpoints for monitoring |
| `backend/scripts/load-test.js` | Load testing script |
| `backend/db/add_performance_indexes.sql` | Database performance indexes |
| `SCALING_STRATEGIES.md` | Scaling documentation |

---

*Last Updated: December 2025*

