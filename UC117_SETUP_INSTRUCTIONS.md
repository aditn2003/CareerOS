# UC-117: API Monitoring Dashboard - Setup Instructions

## Issue: 500 Internal Server Errors

If you're seeing 500 errors when accessing the API Monitoring Dashboard, it's because the database tables haven't been created yet.

## Quick Fix

**Run the database migration script:**

```bash
# Option 1: Using psql directly
psql -d your_database_name -f backend/db/add_api_monitoring_schema.sql

# Option 2: Using psql with connection string from .env
psql $DATABASE_URL -f backend/db/add_api_monitoring_schema.sql

# Option 3: Copy the SQL and run it in your database client
cat backend/db/add_api_monitoring_schema.sql | psql your_database_name
```

## Verify Tables Were Created

After running the migration, verify the tables exist:

```sql
-- Check if tables exist
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

-- Check if default services were inserted
SELECT service_name, display_name, enabled FROM api_services;
```

## After Migration

1. **Restart your backend server** (if it's running)
2. **Refresh the dashboard page** in your browser
3. The dashboard should now load without errors

## Accessing the Dashboard

1. **Make sure you're logged in as a mentor/admin user:**
   ```sql
   SELECT id, email, account_type FROM users WHERE email = 'your-email@example.com';
   -- Should show account_type = 'mentor'
   ```

2. **If not a mentor, update it:**
   ```sql
   UPDATE users SET account_type = 'mentor' WHERE email = 'your-email@example.com';
   ```

3. **Access the dashboard:**
   - Via navigation menu: Look for "Admin" → "API Monitoring"
   - Or directly: `http://localhost:5173/admin/api-monitoring`

## Troubleshooting

### Still seeing 500 errors?

1. **Check backend logs** for the actual error message
2. **Verify database connection** - make sure your backend can connect to the database
3. **Check PostgreSQL version** - make sure it supports the SQL syntax used

### Dashboard loads but shows no data?

This is expected! The dashboard will be empty until API calls are tracked. The tables exist but have no data yet. Once you start using APIs (or integrate the tracking service into your routes), data will appear.

## Next Steps

After the schema is set up, you can:
1. **Start using the dashboard** - it will show data as API calls are tracked
2. **Integrate API tracking** - Add tracking to your existing API routes (see `UC117_API_MONITORING_IMPLEMENTATION.md` if it exists)
3. **Generate weekly reports** - Use the "Generate Weekly Report" button once you have data
