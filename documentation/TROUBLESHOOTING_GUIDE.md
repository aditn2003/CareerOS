# Troubleshooting Guide

## Quick Diagnosis

| Symptom | Likely Cause | Solution |
|---------|--------------|----------|
| 500 errors | Backend crash | Check Render logs |
| 401 errors | JWT expired/invalid | Re-login |
| CORS errors | Origin not whitelisted | Update CORS config |
| Blank page | Frontend build failed | Check Vercel logs |
| Slow responses | Database connection | Check Supabase status |

---

## Common Issues

### 1. "CORS blocked" Error

**Symptoms:**
- Browser console shows CORS error
- API requests fail from frontend

**Diagnosis:**
```javascript
// Check browser console for:
Access to fetch at 'https://api...' from origin 'https://app...' has been blocked by CORS
```

**Solution:**

1. Verify frontend URL is in CORS whitelist (`backend/server.js`):
   ```javascript
   const allowed = [
     "http://localhost:5173",
     "http://localhost:5174", 
     "https://your-app.vercel.app",  // Add production URL
   ];
   ```

2. Redeploy backend after changes

---

### 2. "Invalid token" / 401 Unauthorized

**Symptoms:**
- All API requests return 401
- User gets logged out unexpectedly

**Diagnosis:**
```bash
# Check token in browser
localStorage.getItem('token')

# Decode token (jwt.io)
# Check 'exp' field for expiration
```

**Solutions:**

1. **Token expired**: User needs to re-login
2. **JWT_SECRET changed**: All existing tokens invalid - users must re-login
3. **Token missing**: Check frontend is sending Authorization header

---

### 3. Database Connection Failed

**Symptoms:**
- 500 errors on all API calls
- "Connection refused" in logs

**Diagnosis:**
```bash
# Check Render logs for:
Error: Connection terminated unexpectedly
Error: ECONNREFUSED
```

**Solutions:**

1. **Check Supabase status**: [status.supabase.com](https://status.supabase.com)

2. **Verify DATABASE_URL**:
   ```bash
   # Test connection
   psql "postgresql://..." -c "SELECT 1"
   ```

3. **Check connection pool**:
   - Max connections exceeded
   - Restart backend service

4. **SSL issues**:
   ```javascript
   // Ensure SSL is enabled in pool config
   ssl: { rejectUnauthorized: false }
   ```

---

### 4. Frontend Shows Blank Page

**Symptoms:**
- White screen after deployment
- No errors in network tab

**Diagnosis:**
```bash
# Check browser console for:
- JavaScript errors
- Failed to load resource errors
- Chunk loading errors
```

**Solutions:**

1. **Build error**: Check Vercel deployment logs

2. **Environment variable missing**:
   ```bash
   # Verify in Vercel dashboard
   VITE_API_URL is set
   VITE_GOOGLE_CLIENT_ID is set
   ```

3. **Cache issue**:
   - Hard refresh: Ctrl+Shift+R
   - Clear browser cache

4. **Routing issue**:
   - Verify `vercel.json` has rewrite rules for SPA

---

### 5. Email Not Sending

**Symptoms:**
- Password reset emails not received
- No errors in API response

**Diagnosis:**
```bash
# Check Render logs for:
- Resend API errors
- Rate limit messages
```

**Solutions:**

1. **Check RESEND_API_KEY** is valid

2. **Check email quotas** at [resend.com/dashboard](https://resend.com/dashboard)

3. **Verify sender domain** is configured in Resend

4. **Check spam folder**

---

### 6. Slow API Responses

**Symptoms:**
- Requests take >2 seconds
- Timeouts on complex queries

**Diagnosis:**
```bash
# Check Render metrics:
- CPU usage
- Memory usage
- Response times
```

**Solutions:**

1. **Database slow**:
   ```sql
   -- Check slow queries in Supabase
   SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;
   ```

2. **Add indexes**:
   ```sql
   CREATE INDEX idx_jobs_user_id ON jobs(user_id);
   ```

3. **Connection pool exhausted**:
   - Increase max connections
   - Check for connection leaks

4. **Cold start** (Render free tier):
   - First request after inactivity is slow
   - Consider paid tier for always-on

---

### 7. Google OAuth Not Working

**Symptoms:**
- "Sign in with Google" fails
- Redirect errors

**Solutions:**

1. **Check authorized origins** in Google Cloud Console:
   - `https://your-app.vercel.app`
   - `http://localhost:5173` (development)

2. **Check authorized redirect URIs**:
   - `https://your-app.vercel.app`

3. **Verify GOOGLE_CLIENT_ID** matches in frontend

---

### 8. Rate Limiting Triggered

**Symptoms:**
- 429 Too Many Requests
- "Too many login attempts" message

**Solutions:**

1. **Wait 15 minutes** for rate limit window to reset

2. **Check if under attack**:
   - Review Render logs for suspicious IPs
   - Consider increasing rate limit temporarily

---

## Log Locations

| Service | Location |
|---------|----------|
| Frontend (Vercel) | Vercel Dashboard → Project → Deployments → Logs |
| Backend (Render) | Render Dashboard → Service → Logs |
| Database (Supabase) | Supabase Dashboard → Database → Logs |

---

## Useful Commands

### Check Backend Health
```bash
curl https://your-api.onrender.com/health
# Expected: {"status":"ok"}
```

### Test Database Connection
```bash
psql "$DATABASE_URL" -c "SELECT NOW()"
```

### Check JWT Token
```bash
# Decode token (replace with actual token)
echo "eyJhbG..." | cut -d'.' -f2 | base64 -d 2>/dev/null | jq
```

### View Recent Errors (Render)
```bash
# Use Render CLI or dashboard
render logs --tail 100
```

---

## Escalation Path

If issue persists after troubleshooting:

1. **Check status pages**:
   - [Vercel Status](https://vercel-status.com)
   - [Render Status](https://status.render.com)
   - [Supabase Status](https://status.supabase.com)

2. **Review recent changes**:
   - Any recent deployments?
   - Environment variable changes?
   - Database migrations?

3. **Rollback if needed**:
   - See [Deployment Runbook](./DEPLOYMENT_RUNBOOK.md) for rollback procedures

4. **Contact support**:
   - Vercel: support@vercel.com
   - Render: support@render.com
   - Supabase: support@supabase.io

---

*Last Updated: December 2025*

