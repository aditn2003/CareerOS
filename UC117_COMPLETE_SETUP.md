# UC-117: Complete API Monitoring Setup Guide

## ✅ What's Been Completed

### 1. Database Schema ✅
- **File**: `backend/db/add_api_monitoring_schema.sql`
- **Tables Created**:
  - `api_services` - Configuration for all API services
  - `api_usage_logs` - Tracks every API call with metrics
  - `api_error_logs` - Logs all API errors with details
  - `api_quotas` - Tracks quota usage per service per period
  - `api_usage_reports` - Stores weekly usage reports

### 2. API Tracking Service ✅
- **File**: `backend/utils/apiTrackingService.js`
- **Features**:
  - `trackApiCall()` - Wrapper function to automatically track API calls
  - `logApiUsage()` - Logs successful/failed API requests
  - `logApiError()` - Logs detailed error information
  - Automatic quota tracking
  - Payload sanitization (removes API keys, tokens, etc.)

### 3. Admin Authentication ✅
- **File**: `backend/utils/adminAuth.js`
- **Middleware**: `requireAdmin()` - Ensures only mentor/admin users can access admin routes

### 4. Backend Routes ✅
- **File**: `backend/routes/apiMonitoring.js`
- **Endpoints**:
  - `GET /api/admin/api-usage` - Usage statistics
  - `GET /api/admin/api-quotas` - Quota status
  - `GET /api/admin/api-errors` - Error logs
  - `GET /api/admin/api-response-times` - Performance metrics
  - `GET /api/admin/api-services` - Service configuration
  - `POST /api/admin/api-usage-report` - Generate weekly report
  - `GET /api/admin/api-usage-reports` - Get all reports

### 5. Frontend Dashboard ✅
- **File**: `frontend/src/pages/Admin/ApiMonitoringDashboard.jsx`
- **Features**:
  - Overview tab with summary statistics
  - Usage & Quotas tab with detailed metrics
  - Error Logs tab with filtering and pagination
  - Performance tab with response time charts
  - Services tab showing configuration
  - Reports tab for weekly reports
  - **Fixed**: TypeError with cost_total (converted to Number)

### 6. Navigation Integration ✅
- Added "Admin" section to NavBar
- Link: "API Monitoring" (only visible to mentor/admin users)
- Route: `/admin/api-monitoring`

### 7. API Call Tracking Integration ✅
- **Integrated into**: `backend/routes/companyResearch.js`
- **Tracked APIs**:
  - Wikipedia API calls (3 endpoints)
  - News API calls
  - OpenAI API calls (3 endpoints for company research and talking points)

## 🔧 Setup Steps

### Step 1: Run Database Migration

```bash
# Run the migration script to create tables
psql $DATABASE_URL -f backend/db/add_api_monitoring_schema.sql

# Or with direct database name
psql your_database_name -f backend/db/add_api_monitoring_schema.sql
```

### Step 2: Verify Tables Were Created

```sql
-- Check tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'api_%'
ORDER BY table_name;

-- Should return:
-- api_error_logs
-- api_quotas
-- api_services
-- api_usage_logs
-- api_usage_reports

-- Check default services were inserted
SELECT service_name, display_name, enabled FROM api_services;
```

### Step 3: Make Yourself an Admin

```sql
-- Check your account type
SELECT id, email, account_type FROM users WHERE email = 'your-email@example.com';

-- If not 'mentor', update it
UPDATE users SET account_type = 'mentor' WHERE email = 'your-email@example.com';
```

### Step 4: Restart Backend Server

```bash
# Stop your backend server and restart it
# This ensures the new routes are loaded
```

### Step 5: Access the Dashboard

1. Log out and log back in (to refresh your session)
2. Open the navigation menu (☰)
3. Look for "Admin" section
4. Click "API Monitoring"
5. Or go directly to: `http://localhost:5173/admin/api-monitoring`

## 📊 How API Tracking Works

### Current Integration

The following routes are already tracking API calls:

#### `backend/routes/companyResearch.js`
- **Wikipedia API**: All 3 endpoints tracked
- **News API**: Tracked with error handling
- **OpenAI API**: All 3 endpoints tracked (company insights, retry calls, talking points)

### How to Add Tracking to Other Routes

To track API calls in any route, wrap them with `trackApiCall`:

```javascript
import { trackApiCall } from '../utils/apiTrackingService.js';

// Example: Tracking an OpenAI call
const response = await trackApiCall(
  'openai',
  async () => {
    return await axios.post(
      'https://api.openai.com/v1/chat/completions',
      payload,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );
  },
  {
    endpoint: '/v1/chat/completions',
    method: 'POST',
    userId: req.user?.id || null, // Get from request if available
    requestPayload: { model: payload.model }, // Sanitized payload
    estimateTokens: 100, // Optional: estimated tokens
    estimateCost: 0.001 // Optional: estimated cost in USD
  }
);

// Use response.data as normal
const data = response.data;
```

### Routes to Consider Integrating

- `backend/routes/interviewInsights.js` - SERP API, OpenAI
- `backend/routes/coverLetterAI.js` - OpenAI
- `backend/routes/salaryResearch.js` - External APIs
- `backend/routes/geocoding.js` - Google Geocoding API
- `backend/routes/github.js` - GitHub API

## 🐛 Troubleshooting

### Issue: 500 Errors When Accessing Dashboard

**Cause**: Database tables don't exist

**Solution**: Run the migration script (Step 1)

### Issue: TypeError: toFixed is not a function

**Status**: ✅ FIXED - Cost values are now converted to Number before calling toFixed

### Issue: Dashboard Shows No Data

**This is Normal!** The dashboard will be empty until:
1. API calls are made through tracked routes
2. Data starts accumulating in the database

To see data:
- Use the company research feature (already tracked)
- Wait for users to make API calls
- The data will appear in the dashboard

### Issue: "Access denied. Admin privileges required"

**Cause**: Your account is not set to 'mentor' type

**Solution**: 
```sql
UPDATE users SET account_type = 'mentor' WHERE email = 'your-email@example.com';
```
Then log out and log back in.

### Issue: Tables Already Exist Error

The migration uses `CREATE TABLE IF NOT EXISTS`, so it's safe to run multiple times. If you get constraint errors, check that the tables match the schema.

## 📈 What the Dashboard Shows

Once you have data, the dashboard will display:

1. **Overview Tab**:
   - Total requests, failed requests
   - Average response times
   - Recent errors
   - Quota warnings

2. **Usage & Quotas Tab**:
   - Detailed usage per service
   - Quota usage with progress bars
   - Token usage
   - Cost estimates

3. **Error Logs Tab**:
   - All API errors with details
   - Error types (rate_limit, timeout, etc.)
   - Filtering by service, date, error type

4. **Performance Tab**:
   - Response time charts
   - Average, p95, p99 percentiles
   - Time-series visualization

5. **Services Tab**:
   - All configured API services
   - Quota limits
   - Rate limits
   - Enabled/disabled status

6. **Reports Tab**:
   - Weekly usage reports
   - Service breakdowns
   - Error breakdowns

## ✅ Verification Checklist

- [ ] Database migration script run successfully
- [ ] All 5 tables exist in database
- [ ] Default API services inserted
- [ ] User account set to 'mentor'
- [ ] Backend server restarted
- [ ] Can access `/admin/api-monitoring` without 500 errors
- [ ] Dashboard loads (may be empty - that's OK)
- [ ] Navigation shows "Admin" section (if mentor)

## 🚀 Next Steps

1. **Monitor the Dashboard**: Once API calls start being made, data will appear
2. **Add More Tracking**: Integrate tracking into other routes that make external API calls
3. **Set Up Alerts**: (Future) Add email/Slack notifications when quotas are exceeded
4. **Generate Reports**: Use the weekly report feature to track usage over time

## 📝 Notes

- API tracking is **non-blocking** - if logging fails, it won't break your app
- All sensitive data (API keys, tokens) is **automatically sanitized** from logs
- Quota tracking **resets monthly** based on period_start date
- The dashboard is **admin-only** - only mentor/admin users can access it
- Empty dashboard is **expected** until API calls are made
