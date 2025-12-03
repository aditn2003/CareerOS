# Setting Up Networking Events Schema in Supabase

## Problem
You're getting an error: **"Could not find the 'connections' column of 'networking_events' in the schema cache"**

This means the database schema hasn't been created in Supabase yet.

## Solution

### Step 1: Copy the SQL Schema
The schema file is located at:
```
backend/db/add_networking_events_schema.sql
```

### Step 2: Go to Supabase SQL Editor
1. Open your Supabase project: https://app.supabase.com
2. Navigate to **SQL Editor** in the left sidebar
3. Click **"New Query"** button

### Step 3: Paste and Run the SQL
1. Copy the entire contents of `backend/db/add_networking_events_schema.sql`
2. Paste it into the SQL editor in Supabase
3. Click **"Run"** button

### Step 4: Verify Tables Created
After running the SQL, you should see these new tables in your database:
- `networking_events`
- `event_goals`
- `event_connections`
- `event_followups`
- `networking_statistics`

### Step 5: Test
Once the schema is created:
1. The modal close issue will be resolved (no more 500 errors)
2. You can create events, add connections, and schedule follow-ups
3. The status dropdown will work properly

## Important Notes
- **Do this only ONCE** - the schema uses `CREATE TABLE IF NOT EXISTS` so it won't error if tables already exist
- Make sure you're in the correct Supabase project for your ATS application
- All tables are properly linked with foreign keys and indexes for performance

## If You Need Help
If you get an error running the SQL:
1. Check that you're logged into the correct Supabase account
2. Make sure you have permission to create tables
3. Contact your database administrator if you don't have permissions

---

**After running this setup, the Networking Events feature will be fully functional!**
