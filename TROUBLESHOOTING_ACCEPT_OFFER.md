# Troubleshooting: "Failed to accept offer"

## Common Issues and Solutions

### Issue 1: `compensation_history` table doesn't exist

**Error in backend logs:**
```
relation "compensation_history" does not exist
```

**Solution:**
Run the database migration in Supabase:

1. Go to Supabase Dashboard → SQL Editor
2. Open the file: `backend/db/add_compensation_tracking.sql`
3. Copy the entire contents
4. Paste into Supabase SQL Editor
5. Click "Run"

This will create the `compensation_history` table.

### Issue 2: Missing required fields in offer

**Error:** The offer might be missing required fields like `company`, `role_title`, or `base_salary`.

**Solution:**
- Make sure your offer has at least:
  - `company` (required)
  - `role_title` (required)
  - `base_salary` (should have a value)

### Issue 3: Database connection error

**Error:** Connection timeout or database unavailable

**Solution:**
- Check your Supabase connection string in `.env`
- Verify the database is accessible
- Check Supabase dashboard for any service issues

### Issue 4: Offer already accepted

**Behavior:** If you try to accept an already-accepted offer, it will now:
- Check if compensation history exists
- Return the existing entry if found
- Or create a new one if missing

## How to Check What's Wrong

1. **Check Browser Console:**
   - Open Developer Tools (F12)
   - Go to Console tab
   - Look for error messages when clicking "Accept Offer"

2. **Check Backend Logs:**
   - Look at your terminal where the backend server is running
   - You should see detailed error messages like:
     - `❌ Error accepting offer: ...`
     - `❌ Error creating compensation history: ...`

3. **Check Network Tab:**
   - Open Developer Tools → Network tab
   - Click "Accept Offer"
   - Find the request to `/api/offers/:id/accept`
   - Check the response for error details

## Quick Fix: Verify Database Tables

Run this in Supabase SQL Editor to check if tables exist:

```sql
-- Check if compensation_history table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name = 'compensation_history'
);

-- Check if offers table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name = 'offers'
);
```

If either returns `false`, you need to run the migration.

## After Fixing

1. Refresh the page
2. Try accepting the offer again
3. The error message should now be more specific if something else is wrong

