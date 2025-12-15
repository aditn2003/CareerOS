# Troubleshooting: API Dashboard Shows Blank/Zero Data

If your API monitoring dashboard is showing 0 requests, 0 errors, and no data, follow these steps:

## Step 1: Verify Database Tables Exist

The dashboard requires database tables to be created. Run this SQL file:

```bash
psql $DATABASE_URL -f backend/db/add_api_monitoring_schema.sql
```

Or if you're using a connection string directly:
```bash
psql "your_connection_string" -f backend/db/add_api_monitoring_schema.sql
```

This creates:
- `api_services` - Configuration for each API service
- `api_usage_logs` - Records of all API calls
- `api_error_logs` - Records of API errors
- `api_quotas` - Quota tracking per service
- `api_usage_reports` - Weekly usage reports

## Step 2: Restart Your Backend Server

**CRITICAL**: After making code changes, you MUST restart your backend server for the tracking code to take effect.

```bash
# Stop the current server (Ctrl+C)
# Then restart it
cd backend
npm start
# or
node server.js
```

## Step 3: Check Backend Console Logs

When you use features that make API calls (like Company Research, Interview Insights), you should see logs like:

```
✅ Tracked API call: openai POST /v1/chat/completions (success: true, user: 1)
✅ Tracked API call: serp GET /search.json (success: true, user: 1)
```

If you see errors like:
```
❌ Error logging API usage: ...
```

This means the database tables don't exist or there's a database connection issue.

## Step 4: Test Tracking Manually

I've added a test endpoint. Visit this URL while logged in as an admin:

```
GET /api/test/test-tracking
```

This will log a test API call. Check the dashboard immediately after - you should see 1 request for OpenAI.

## Step 5: Verify Features Are Actually Making API Calls

Make sure you're using features that actually call external APIs:

1. **Company Research** - Should call Wikipedia, News API, OpenAI
2. **Interview Insights** - Should call SERP API, OpenAI
3. **Market Benchmarks** - Should call Google Gemini
4. **Job Import** - Should call Google Gemini
5. **LinkedIn Login** - Should call LinkedIn API

**Important**: Just loading the dashboard or navigating pages won't create API logs. You need to actually USE the features that make API calls.

## Step 6: Check User Authentication

The tracking works even if `userId` is `null`, but it's better if you're logged in. Make sure:
- You're logged in (have a JWT token)
- Your user account exists in the database
- You can access other authenticated routes

## Step 7: Check Browser Console

Open your browser's developer tools (F12) and check:
- Network tab: Are requests to `/api/admin/api-usage` returning 200 OK?
- Console tab: Any JavaScript errors?

## Step 8: Verify Dashboard Query

The dashboard queries don't filter by userId, so even if userId is null, you should still see data. The query is:

```sql
SELECT service_name, COUNT(*) as total_requests, ...
FROM api_usage_logs
WHERE 1=1
GROUP BY service_name
```

If this returns 0 rows, no API calls have been logged.

## Common Issues

### Issue: "Database schema not initialized"
**Solution**: Run the SQL migration file (Step 1)

### Issue: Backend shows "Error logging API usage" in console
**Solution**: 
- Check database connection
- Verify tables exist
- Check database permissions

### Issue: Dashboard shows data but it's old
**Solution**: 
- The dashboard shows all-time data by default
- Use date filters in the dashboard UI to see recent data
- Check the "Last Used At" column in the API Usage table

### Issue: Some APIs tracked but others not
**Solution**:
- Some routes might not be integrated yet (see API_TRACKING_SUMMARY.md)
- Check backend console for tracking logs
- Verify the specific feature is actually making API calls

## Next Steps

Once tracking is working:
1. Use Company Research feature → Should log 3+ API calls
2. Use Interview Insights → Should log 2-3 API calls  
3. Check dashboard → Should show data immediately
4. Look for the console logs showing "✅ Tracked API call"

If you're still seeing 0 requests after all these steps, check your backend terminal/console for error messages.
