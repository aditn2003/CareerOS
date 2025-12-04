# Migration Instructions: Job Application Materials

## Overview
This migration creates a new `job_application_materials` table to store application materials (resumes and cover letters) for each job, replacing the previous history-based approach.

## Prerequisites
- Database is running and accessible
- You have database connection credentials

## Step 1: Clean Up Invalid References

First, fix any existing invalid foreign key references in your database:

### Option A: Using Docker (if using docker-compose)
```bash
# Connect to the database container
docker exec -i ats_db psql -U <POSTGRES_USER> -d <POSTGRES_DB> < backend/db/cleanup_invalid_material_references.sql
```

Replace `<POSTGRES_USER>` and `<POSTGRES_DB>` with your actual values from `.env` file.

### Option B: Using psql directly
```bash
psql -U <username> -d <database_name> -f backend/db/cleanup_invalid_material_references.sql
```

### Option C: Using a database GUI tool
1. Open your database GUI (pgAdmin, DBeaver, etc.)
2. Connect to your database
3. Open and execute `backend/db/cleanup_invalid_material_references.sql`

**Expected output:** The script will report how many invalid references were fixed (should be 0 if everything is clean).

## Step 2: Ensure the New Table Exists

The `job_application_materials` table should be created automatically when `init.sql` runs. If it doesn't exist yet:

### Option A: Using Docker
```bash
docker exec -i ats_db psql -U <POSTGRES_USER> -d <POSTGRES_DB> < backend/db/create_job_application_materials.sql
```

### Option B: Using psql
```bash
psql -U <username> -d <database_name> -f backend/db/create_job_application_materials.sql
```

## Step 3: Run the Migration

Populate the new table with existing data:

### Option A: Using Docker
```bash
docker exec -i ats_db psql -U <POSTGRES_USER> -d <POSTGRES_DB> < backend/db/migrate_to_job_application_materials.sql
```

### Option B: Using psql
```bash
psql -U <username> -d <database_name> -f backend/db/migrate_to_job_application_materials.sql
```

### Option C: Using a database GUI tool
1. Open and execute `backend/db/migrate_to_job_application_materials.sql`

**Expected output:** The migration should complete without errors. It will:
- Migrate data from the `jobs` table
- Migrate data from `application_materials_history` (if it exists)
- Only insert valid references (invalid ones are set to NULL)

## Step 4: Verify the Migration

Check that the migration was successful:

```sql
-- Check how many jobs have materials in the new table
SELECT COUNT(*) FROM job_application_materials;

-- Check a few sample records
SELECT 
    jam.job_id,
    j.title,
    j.company,
    jam.resume_id,
    r.title AS resume_title,
    jam.cover_letter_id,
    cl.name AS cover_letter_title
FROM job_application_materials jam
JOIN jobs j ON j.id = jam.job_id
LEFT JOIN resumes r ON r.id = jam.resume_id
LEFT JOIN cover_letters cl ON cl.id = jam.cover_letter_id
LIMIT 10;
```

## Step 5: Test the Application

1. **Restart your backend server** (if it's running):
   ```bash
   # If using Docker
   docker-compose restart backend
   
   # Or if running directly
   # Stop and restart your Node.js server
   ```

2. **Test creating a new job with materials:**
   - Create a new job through the UI
   - Add a resume and/or cover letter
   - Verify it saves correctly

3. **Test updating a job's materials:**
   - Edit an existing job
   - Change the resume or cover letter
   - Verify it updates correctly

4. **Test the mentor section:**
   - Navigate to the mentor section
   - Go to "Application Materials" tab
   - Verify resumes and cover letters display correctly

## Troubleshooting

### If you get foreign key constraint errors:
- Make sure Step 1 (cleanup script) ran successfully
- Check that all resume_ids and cover_letter_ids in the jobs table actually exist in their respective tables

### If the new table doesn't exist:
- Run Step 2 to create it manually
- Or check that `init.sql` includes the table definition (it should after our changes)

### If materials don't show up in mentor section:
- Verify the migration completed successfully (Step 3)
- Check the backend logs for any errors
- Verify the query in `backend/routes/team.js` is using the new table

## Rollback (if needed)

If you need to rollback, you can:
1. Drop the new table: `DROP TABLE IF EXISTS job_application_materials;`
2. The old `jobs` table still has `resume_id` and `cover_letter_id` columns, so data isn't lost
3. The application will fall back to using the `jobs` table directly

## Notes

- The migration is **safe** - it only reads from existing tables and doesn't delete anything
- Invalid references are set to NULL instead of causing errors
- The old `jobs` table columns are kept for backward compatibility
- New jobs will automatically use the new table structure

