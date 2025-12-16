# Deployment Runbook

## Quick Reference

| Environment | Platform | URL | Branch |
|-------------|----------|-----|--------|
| Production Frontend | Vercel | `https://your-app.vercel.app` | `main` |
| Production Backend | Render.com | `https://your-api.onrender.com` | `main` |
| Database | Supabase | Pooled connection | N/A |

---

## Pre-Deployment Checklist

```
□ All tests passing locally
□ Code reviewed and approved
□ Environment variables updated (if needed)
□ Database migrations applied (if needed)
□ No console.log statements in production code
□ API keys are not exposed in code
□ CHANGELOG.md updated
```

---

## Frontend Deployment (Vercel)

### Automatic Deployment (Recommended)

1. **Merge to main branch**
   ```bash
   git checkout main
   git pull origin main
   git merge feature-branch
   git push origin main
   ```

2. **Monitor deployment**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click on your project
   - Watch the deployment progress
   - Verify "Ready" status

3. **Verify deployment**
   - Visit production URL
   - Test critical flows (login, view jobs)
   - Check browser console for errors

### Manual Deployment

1. **Build locally**
   ```bash
   cd frontend
   npm install
   npm run build
   ```

2. **Deploy via CLI**
   ```bash
   npm install -g vercel
   vercel --prod
   ```

### Rollback Procedure

1. Go to Vercel Dashboard → Deployments
2. Find the last working deployment
3. Click "..." → "Promote to Production"

---

## Backend Deployment (Render.com)

### Automatic Deployment (Recommended)

1. **Merge to main branch**
   ```bash
   git checkout main
   git pull origin main
   git merge feature-branch
   git push origin main
   ```

2. **Monitor deployment**
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click on your web service
   - Watch "Deploys" tab
   - Wait for "Live" status

3. **Verify deployment**
   ```bash
   # Check health endpoint
   curl https://your-api.onrender.com/health
   
   # Expected response:
   # {"status":"ok"}
   ```

### Manual Deployment

1. Go to Render Dashboard
2. Click on your service
3. Click "Manual Deploy" → "Deploy latest commit"

### Rollback Procedure

1. Go to Render Dashboard → Deploys
2. Find the last working deploy
3. Click "Rollback to this deploy"

---

## Database Migrations

### Before Migration

```bash
# Backup current schema (optional)
pg_dump -h your-host -U postgres -d postgres --schema-only > backup_schema.sql
```

### Running Migrations

1. **Connect to database**
   ```bash
   # Using psql
   psql "postgresql://postgres.[ref]:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
   ```

2. **Run migration file**
   ```sql
   -- Example: Add new column
   ALTER TABLE jobs ADD COLUMN IF NOT EXISTS new_field VARCHAR(255);
   ```

3. **Verify migration**
   ```sql
   \d jobs  -- Describe table
   ```

### Rollback Migration

```sql
-- Keep rollback scripts ready
ALTER TABLE jobs DROP COLUMN IF EXISTS new_field;
```

---

## Environment Variables Update

### Frontend (Vercel)

1. Go to Vercel Dashboard → Project → Settings → Environment Variables
2. Add/Update variable
3. Redeploy for changes to take effect

### Backend (Render.com)

1. Go to Render Dashboard → Service → Environment
2. Add/Update variable
3. Service auto-restarts with new values

---

## Zero-Downtime Deployment

Both Vercel and Render support zero-downtime deployments:

1. New version is built in parallel
2. Health checks pass on new version
3. Traffic is switched to new version
4. Old version is terminated

**If deployment fails:**
- Traffic stays on old version
- Check logs for errors
- Fix and redeploy

---

## Deployment Verification Steps

### After Frontend Deploy

```
□ Homepage loads correctly
□ Login/Register works
□ Dashboard displays data
□ No console errors
□ All API calls succeed
```

### After Backend Deploy

```bash
# 1. Health check
curl https://your-api.onrender.com/health

# 2. Auth endpoint
curl -X POST https://your-api.onrender.com/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"wrong"}'
# Should return 401, not 500

# 3. Check logs
# Go to Render Dashboard → Logs
```

---

## Emergency Procedures

### Complete Rollback

1. **Frontend**: Vercel Dashboard → Previous Deployment → Promote
2. **Backend**: Render Dashboard → Previous Deploy → Rollback
3. **Database**: Restore from Supabase backup (last resort)

### Service Restart

**Backend:**
```
Render Dashboard → Service → Manual Deploy → Clear build cache & deploy
```

### Emergency Contacts

| Role | Contact |
|------|---------|
| Team Lead | Digant |
| DevOps | Sujal |
| Database Admin | Digant |
| Backend Lead | Adit |
| Frontend Lead | Aditya |
| Full Stack | Abhi, Zaid |

---

*Last Updated: December 2025*

