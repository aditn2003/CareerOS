# Monitoring and Alerting Setup

## Monitoring Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MONITORING ARCHITECTURE                            │
└─────────────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────┐
                    │   Dashboards    │
                    │  (Manual Check) │
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
         ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│     Vercel      │ │     Render      │ │    Supabase     │
│   (Frontend)    │ │    (Backend)    │ │   (Database)    │
├─────────────────┤ ├─────────────────┤ ├─────────────────┤
│ • Deploy logs   │ │ • Server logs   │ │ • Query logs    │
│ • Build status  │ │ • CPU/Memory    │ │ • Connections   │
│ • Analytics     │ │ • Response time │ │ • Storage       │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

---

## Monitoring Dashboards

### Vercel (Frontend)

**URL:** https://vercel.com/dashboard

**Metrics Available:**
| Metric | Location | Alert Threshold |
|--------|----------|-----------------|
| Deployment status | Deployments tab | Failed deploy |
| Build time | Deployments → Build logs | > 5 minutes |
| Edge requests | Analytics tab | N/A |
| Bandwidth usage | Usage tab | > 80% quota |

**How to Check:**
1. Go to Vercel Dashboard
2. Select your project
3. View recent deployments and their status

---

### Render (Backend)

**URL:** https://dashboard.render.com

**Metrics Available:**
| Metric | Location | Alert Threshold |
|--------|----------|-----------------|
| Service status | Services tab | Not "Live" |
| CPU usage | Metrics tab | > 80% |
| Memory usage | Metrics tab | > 80% |
| Response time | Metrics tab | > 1000ms |
| Request count | Metrics tab | N/A |

**How to Check:**
1. Go to Render Dashboard
2. Click on your web service
3. View Metrics and Logs tabs

**Log Search:**
```
# Filter for errors
level:error

# Filter by time
timestamp:[2024-01-01 TO 2024-01-02]
```

---

### Supabase (Database)

**URL:** https://supabase.com/dashboard

**Metrics Available:**
| Metric | Location | Alert Threshold |
|--------|----------|-----------------|
| Database size | Database → Settings | > 80% quota |
| Active connections | Database → Metrics | > 50 |
| Query performance | SQL Editor → Query history | > 1000ms |
| API requests | API → Logs | Rate limited |

**How to Check:**
1. Go to Supabase Dashboard
2. Select your project
3. Navigate to Database → Reports

---

## Health Checks

### Backend Health Endpoint

```bash
# Check backend is responding
curl https://your-api.onrender.com/health

# Expected response:
{"status":"ok"}
```

### Automated Health Check Script

```bash
#!/bin/bash
# health-check.sh

BACKEND_URL="https://your-api.onrender.com"
FRONTEND_URL="https://your-app.vercel.app"

# Check backend
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/health")
if [ "$BACKEND_STATUS" != "200" ]; then
    echo "❌ Backend unhealthy: HTTP $BACKEND_STATUS"
else
    echo "✅ Backend healthy"
fi

# Check frontend
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL")
if [ "$FRONTEND_STATUS" != "200" ]; then
    echo "❌ Frontend unhealthy: HTTP $FRONTEND_STATUS"
else
    echo "✅ Frontend healthy"
fi
```

---

## Alerting Setup

### Option 1: Uptime Robot (Free)

1. Go to https://uptimerobot.com
2. Create free account
3. Add monitors:
   - **Backend**: `https://your-api.onrender.com/health`
   - **Frontend**: `https://your-app.vercel.app`
4. Set check interval: 5 minutes
5. Configure email/SMS alerts

### Option 2: Better Uptime (Free tier)

1. Go to https://betteruptime.com
2. Add monitors for each endpoint
3. Configure incident alerts

### Option 3: Manual Monitoring

Schedule regular checks:
- **Hourly**: Check Render logs for errors
- **Daily**: Review Vercel deployment status
- **Weekly**: Check Supabase usage metrics

---

## Alert Response Matrix

| Alert | Severity | Action |
|-------|----------|--------|
| Backend down | P1 | Check Render logs, restart service |
| Frontend deploy failed | P2 | Check Vercel build logs, fix and redeploy |
| Database connection errors | P1 | Check Supabase status, verify DATABASE_URL |
| High CPU/Memory | P3 | Monitor, consider scaling |
| Rate limit triggered | P3 | Investigate source, adjust limits |
| SSL certificate expiring | P2 | Auto-renewed by platform |

---

## Key Metrics to Monitor

### Performance Metrics

| Metric | Target | Critical |
|--------|--------|----------|
| API response time | < 500ms | > 2000ms |
| Frontend load time | < 3s | > 10s |
| Database query time | < 100ms | > 1000ms |

### Availability Metrics

| Metric | Target | Critical |
|--------|--------|----------|
| Uptime | 99.9% | < 99% |
| Error rate | < 1% | > 5% |
| Success rate | > 99% | < 95% |

### Usage Metrics

| Metric | Monitor | Action Threshold |
|--------|---------|------------------|
| Database storage | Weekly | > 80% |
| API calls | Daily | > 80% quota |
| Bandwidth | Weekly | > 80% quota |

---

## Logging Best Practices

### What to Log

✅ **Do Log:**
- Authentication attempts (success/failure)
- API errors with stack traces
- Database connection issues
- External API failures
- Performance anomalies

❌ **Don't Log:**
- Passwords or tokens
- Full credit card numbers
- Personal health information
- Full social security numbers

### Log Levels

| Level | Use For |
|-------|---------|
| ERROR | Exceptions, failures |
| WARN | Potential issues |
| INFO | Normal operations |
| DEBUG | Development only |

---

## Quick Reference

### Dashboard URLs

| Service | URL |
|---------|-----|
| Vercel | https://vercel.com/dashboard |
| Render | https://dashboard.render.com |
| Supabase | https://supabase.com/dashboard |
| Uptime Robot | https://uptimerobot.com |

### Status Pages

| Service | URL |
|---------|-----|
| Vercel | https://vercel-status.com |
| Render | https://status.render.com |
| Supabase | https://status.supabase.com |

---

*Last Updated: December 2025*

