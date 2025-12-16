# Environment Variables Configuration

## Overview

This document lists all environment variables required for the ATS application to run in production.

---

## Backend Environment Variables

### Database Configuration

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string | ✅ Yes | `postgresql://postgres.[ref]:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres` |

### Supabase Configuration

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `SUPABASE_URL` | Supabase project URL | ✅ Yes | `https://xxxxxxxxxxxx.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase anonymous/public key | ✅ Yes | `eyJhbGciOiJIUzI1NiIs...` |
| `SUPABASE_SERVICE_KEY` | Supabase service role key | ✅ Yes | `eyJhbGciOiJIUzI1NiIs...` |

### Backend Application Configuration

| Variable | Description | Required | Default | Example |
|----------|-------------|----------|---------|---------|
| `NODE_ENV` | Environment mode | ✅ Yes | `development` | `production` |
| `JWT_SECRET` | Secret key for JWT signing | ✅ Yes | None | `your-super-secret-key-change-in-production` |
| `FRONTEND_URL` | Frontend application URL | ✅ Yes | None | `https://your-app.vercel.app` |
| `REMINDER_DAYS_BEFORE` | Days before interview to send reminder | ❌ No | `3` | `3` |

### Email Configuration

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `EMAIL_USER` | Email sender address | ✅ Yes | `njit_job_alerts@example.com` |
| `EMAIL_FROM` | Email "From" field | ✅ Yes | `njit_job_alerts@example.com` |
| `RESEND_API_KEY` | Resend.com API key | ✅ Yes | `re_xxxxxxxxxx` |

### API Keys

| Variable | Description | Required | Service |
|----------|-------------|----------|---------|
| `GOOGLE_API_KEY` | Google API key (Gemini AI) | ✅ Yes | Google Cloud |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | ✅ Yes | Google Cloud |
| `OPENAI_API_KEY` | OpenAI API key | ✅ Yes | OpenAI |
| `NEWS_API_KEY` | News API key | ❌ No | NewsAPI.org |
| `SERP_API_KEY` | SERP API key for search | ❌ No | SerpAPI |

### LinkedIn Integration

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `LINKEDIN_CLIENT_ID` | LinkedIn OAuth client ID | ❌ No | `783jafycr8xxxx` |
| `LINKEDIN_CLIENT_SECRET` | LinkedIn OAuth client secret | ❌ No | `WPL_AP1.xxxxxxxx` |
| `LINKEDIN_CALLBACK_URL` | OAuth callback URL | ❌ No | `http://localhost:5000/api/linkedin/callback` |

---

## Frontend Environment Variables

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `VITE_API_URL` | Backend API URL | ✅ Yes | `https://your-api.onrender.com` |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client ID | ✅ Yes | `285454xxxxxx.apps.googleusercontent.com` |

---

## Environment File Templates

### Backend `.env` Template

```env
# ============== DATABASE ==============
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres

# ============== SUPABASE ==============
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ============== BACKEND CONFIG ==============
NODE_ENV=production
JWT_SECRET=your-production-secret-key-minimum-32-characters
EMAIL_USER=your-email@domain.com
EMAIL_FROM=your-email@domain.com
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxx
FRONTEND_URL=https://your-app.vercel.app
REMINDER_DAYS_BEFORE=3

# ============== API KEYS ==============
GOOGLE_API_KEY=AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxx
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxxxx
NEWS_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxx
SERP_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ============== LINKEDIN ==============
LINKEDIN_CLIENT_ID=xxxxxxxxxxxxxx
LINKEDIN_CLIENT_SECRET=WPL_AP1.xxxxxxxxxxxx
LINKEDIN_CALLBACK_URL=https://your-api.onrender.com/api/linkedin/callback
```

### Frontend `.env` Template

```env
# ============== FRONTEND CONFIG ==============
VITE_API_URL=https://your-api.onrender.com
VITE_GOOGLE_CLIENT_ID=xxxxxxxxxxxx.apps.googleusercontent.com
```

---

## Security Notes

⚠️ **CRITICAL SECURITY REQUIREMENTS:**

1. **Never commit `.env` files to git**
   ```bash
   # Ensure .env is in .gitignore
   echo ".env" >> .gitignore
   ```

2. **Use strong JWT secrets in production**
   ```bash
   # Generate a secure secret
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

3. **Rotate secrets periodically**
   - API keys: Every 90 days
   - JWT secret: Every 6 months
   - Database password: Every 6 months

4. **Use environment-specific values**
   - Development: Local URLs, test API keys
   - Production: Production URLs, production API keys

---

## Setting Variables in Production

### Vercel (Frontend)

1. Go to Project → Settings → Environment Variables
2. Add each variable with name and value
3. Select environment (Production/Preview/Development)
4. Save and redeploy

### Render.com (Backend)

1. Go to Service → Environment
2. Click "Add Environment Variable"
3. Enter key and value
4. Service auto-restarts

---

## Validation Checklist

Before deploying, verify:

```
□ DATABASE_URL connects successfully
□ JWT_SECRET is at least 32 characters
□ FRONTEND_URL matches actual frontend URL
□ All API keys are valid and have proper quotas
□ Email configuration sends test emails
□ CORS allows FRONTEND_URL origin
```

---

*Last Updated: December 2025*

