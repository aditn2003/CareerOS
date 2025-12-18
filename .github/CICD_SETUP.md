# CI/CD Pipeline Setup Guide (Vercel + Render)

This guide explains how to set up the CI/CD pipeline for the ATS project using **Vercel** (frontend) and **Render** (backend).

## 📋 Overview

| Component | Platform | URL |
|-----------|----------|-----|
| Frontend | Vercel | https://atsos.com |
| Backend | Render | Your Render URL |

### Pipeline Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                        Push to GitHub                             │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                     Run Tests (Backend + Frontend)                │
│                     Coverage: Backend + Frontend                  │
└──────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│   Deploy Backend        │     │   Deploy Frontend       │
│   to Render             │     │   to Vercel             │
└─────────────────────────┘     └─────────────────────────┘
              │                               │
              └───────────────┬───────────────┘
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                       Health Checks                               │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Notify Team (Slack/Discord)                    │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🔑 Required Secrets

Go to **Repository → Settings → Secrets and variables → Actions**

### Vercel Secrets (Frontend)

| Secret | How to Get It |
|--------|---------------|
| `VERCEL_TOKEN` | [Vercel Dashboard](https://vercel.com/account/tokens) → Create Token |
| `VERCEL_ORG_ID` | In your project's `.vercel/project.json` or Vercel Dashboard |
| `VERCEL_PROJECT_ID` | In your project's `.vercel/project.json` or Vercel Dashboard |

**To get Vercel IDs:**
```bash
cd frontend
npx vercel link
cat .vercel/project.json
# Shows: {"orgId": "...", "projectId": "..."}
```

### Render Secrets (Backend)

| Secret | How to Get It |
|--------|---------------|
| `RENDER_API_KEY` | [Render Dashboard](https://dashboard.render.com/account/api-keys) → Create API Key |
| `RENDER_SERVICE_ID_PROD` | Your Render service URL contains it: `srv-xxxxxxxxxxxx` |
| `RENDER_SERVICE_ID_STAGING` | (Optional) Staging service ID |
| `RENDER_DEPLOY_HOOK_PROD` | Render Dashboard → Your Service → Settings → Deploy Hook |
| `RENDER_DEPLOY_HOOK_STAGING` | (Optional) Staging deploy hook |

**To get Render Deploy Hook:**
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Select your backend service
3. Go to **Settings** → **Build & Deploy**
4. Scroll to **Deploy Hook** → Copy URL

### API URLs

| Secret | Value |
|--------|-------|
| `PROD_API_URL` | Your production backend URL (e.g., `https://your-api.onrender.com`) |
| `STAGING_API_URL` | (Optional) Staging backend URL |

### Notification Secrets (Optional)

| Secret | How to Get It |
|--------|---------------|
| `SLACK_WEBHOOK_URL` | [Slack API](https://api.slack.com/apps) → Create App → Incoming Webhooks |
| `DISCORD_WEBHOOK_URL` | Discord Server → Settings → Integrations → Webhooks |
| `CODECOV_TOKEN` | [Codecov](https://codecov.io) → Your Repo → Settings |

---

## 📝 Step-by-Step Setup

### Step 1: Get Vercel Token

1. Go to https://vercel.com/account/tokens
2. Click **Create Token**
3. Name it: `GitHub Actions`
4. Copy the token
5. Add to GitHub as secret: `VERCEL_TOKEN`

### Step 2: Link Vercel Project

```bash
# In your terminal
cd frontend
npx vercel link

# Follow prompts to link to your existing project
# Then get the IDs:
cat .vercel/project.json
```

Add to GitHub secrets:
- `VERCEL_ORG_ID` = the `orgId` value
- `VERCEL_PROJECT_ID` = the `projectId` value

### Step 3: Get Render Deploy Hook

1. Go to https://dashboard.render.com
2. Click on your backend service
3. Go to **Settings**
4. Scroll down to **Deploy Hook**
5. Copy the URL
6. Add to GitHub as secret: `RENDER_DEPLOY_HOOK_PROD`

### Step 4: Get Render API Key (for rollbacks)

1. Go to https://dashboard.render.com/account/api-keys
2. Click **Create API Key**
3. Name it: `GitHub Actions`
4. Copy the key
5. Add to GitHub as secret: `RENDER_API_KEY`

### Step 5: Get Render Service ID

Your service ID is in the URL when viewing your service:
```
https://dashboard.render.com/web/srv-xxxxxxxxxxxxxxxxx
                                   ^^^^^^^^^^^^^^^^^^^
                                   This is your SERVICE_ID
```

Add to GitHub as secret: `RENDER_SERVICE_ID_PROD`

### Step 6: Set API URLs

Add these secrets:
- `PROD_API_URL` = `https://your-backend.onrender.com`
- `STAGING_API_URL` = (if you have staging)

### Step 7: (Optional) Setup Notifications

#### Slack:
1. Go to https://api.slack.com/apps
2. Create New App → From scratch
3. Go to **Incoming Webhooks** → Enable
4. Click **Add New Webhook to Workspace**
5. Select channel → Copy URL
6. Add to GitHub as secret: `SLACK_WEBHOOK_URL`

#### Discord:
1. Go to your Discord server
2. Server Settings → Integrations → Webhooks
3. Create Webhook → Copy URL
4. Add to GitHub as secret: `DISCORD_WEBHOOK_URL`

---

## 🚀 How It Works

### On Pull Request:
- ✅ Runs all tests (backend + frontend)
- ✅ Reports coverage
- ❌ Does NOT deploy

### On Push to `develop`:
- ✅ Runs all tests
- ✅ Deploys to **Staging** (if configured)
- ✅ Sends notification

### On Push to `main`:
- ✅ Runs all tests
- ✅ Deploys to **Production**
- ✅ Runs health checks
- ✅ Sends notification

---

## 🔄 Rollback

### Via GitHub:
1. Go to **Actions** → **Manual Rollback**
2. Click **Run workflow**
3. Select service and enter reason

### Via Render Dashboard:
1. Go to your service
2. Click **Events** tab
3. Find a previous successful deploy
4. Click **Rollback**

### Via Vercel Dashboard:
1. Go to **Deployments** tab
2. Find the deployment to restore
3. Click **...** → **Promote to Production**

---

## 📊 Deployment Metrics

View deployment history:
1. Go to **Actions** tab
2. Select **Deployment Metrics** workflow
3. Click **Run workflow**
4. Check **Issues** tab for the report

---

## 🛠️ Troubleshooting

### Tests Failing
```bash
# Run locally to debug
cd backend && npm run test:coverage
cd frontend && npm run test:coverage
```

### Vercel Deploy Failing
1. Check `VERCEL_TOKEN` is valid
2. Ensure project is linked: `cd frontend && npx vercel link`
3. Check Vercel dashboard for error details

### Render Deploy Not Triggering
1. Check `RENDER_DEPLOY_HOOK_PROD` is set correctly
2. Test the hook manually: `curl -X POST <your-deploy-hook-url>`
3. Check Render dashboard for deploy status

### Notifications Not Working
1. Test webhook URL with curl:
   ```bash
   curl -X POST -H "Content-Type: application/json" \
     -d '{"text":"test"}' YOUR_WEBHOOK_URL
   ```
2. Ensure secret name matches exactly

---

## 📁 Files Created

```
.github/
├── workflows/
│   ├── ci-cd.yml              # Main CI/CD pipeline
│   ├── rollback.yml           # Manual rollback
│   └── deployment-metrics.yml # Weekly metrics
└── CICD_SETUP.md              # This guide
```

---

## ✅ Checklist

- [ ] `VERCEL_TOKEN` added
- [ ] `VERCEL_ORG_ID` added (optional - Vercel auto-detects)
- [ ] `VERCEL_PROJECT_ID` added (optional - Vercel auto-detects)
- [ ] `RENDER_DEPLOY_HOOK_PROD` added
- [ ] `RENDER_API_KEY` added (for rollbacks)
- [ ] `RENDER_SERVICE_ID_PROD` added (for rollbacks)
- [ ] `PROD_API_URL` added
- [ ] `SLACK_WEBHOOK_URL` added (optional)
- [ ] Branch protection enabled on `main`
