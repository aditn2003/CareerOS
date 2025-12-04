# Clean Migration: Application Materials

## Overview
We've completely reworked the application materials system with a single, clean table: `job_materials`

## Step 1: Drop Old Tables

Run this to remove all the old/complex tables:

```bash
# Using Docker
docker exec -i ats_db psql -U <POSTGRES_USER> -d <POSTGRES_DB> < backend/db/drop_all_materials_tables.sql

# Or using psql directly
psql -U <username> -d <database_name> -f backend/db/drop_all_materials_tables.sql
```

This will drop:
- `job_application_materials` (old new table)
- `application_materials_history` (old history table)

## Step 2: Create New Clean Table

The new table is already in `init.sql`, but if you need to create it manually:

```bash
docker exec -i ats_db psql -U <POSTGRES_USER> -d <POSTGRES_DB> < backend/db/create_clean_job_materials.sql
```

## Step 3: Migrate Existing Data

Migrate data from the `jobs` table:

```bash
docker exec -i ats_db psql -U <POSTGRES_USER> -d <POSTGRES_DB> < backend/db/migrate_to_clean_materials.sql
```

## Step 4: Restart Backend

```bash
docker-compose restart backend
```

## What Changed

### New Table: `job_materials`
- **Simple**: Just `job_id`, `user_id`, `resume_id`, `cover_letter_id`
- **One row per job**: Unique constraint on `job_id`
- **No history**: We don't track history anymore (simpler)
- **No customization fields**: Removed complexity

### Updated Routes
- **Job creation**: Stores materials in `job_materials`
- **Job update**: Updates `job_materials`
- **Job details**: Reads from `job_materials`
- **Mentor section**: Queries `job_materials`
- **Resume download**: Uses `job_materials` to find correct resume

## Testing

1. Create a new job with materials - should save to `job_materials`
2. Update a job's materials - should update `job_materials`
3. View job details - should show materials from `job_materials`
4. Mentor section - should display materials correctly
5. Resume view button - should work correctly

## Rollback

If needed, you can drop the new table:
```sql
DROP TABLE IF EXISTS job_materials;
```

The `jobs` table still has `resume_id` and `cover_letter_id` columns, so data isn't lost.

