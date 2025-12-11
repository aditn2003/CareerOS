# Running the Resume Version Control Migration

The database schema needs to be updated to support the new version control features.

## Option 1: Run the Migration Script (Recommended)

From the `backend` directory, run:

```bash
node run_version_control_migration.js
```

This will automatically:
- Add all new columns to `resume_versions` table
- Create necessary indexes
- Add constraints

## Option 2: Run SQL Directly

If you prefer to run the SQL directly, connect to your PostgreSQL database and run:

```bash
psql -d your_database_name -f backend/db/enhance_resume_versions_schema.sql
```

Or using a database GUI tool (pgAdmin, DBeaver, etc.):
1. Open the SQL file: `backend/db/enhance_resume_versions_schema.sql`
2. Execute it against your database

## What the Migration Does

The migration adds the following columns to `resume_versions`:

- `description` (TEXT) - Detailed description of changes
- `job_id` (INTEGER) - Link to job applications
- `is_default` (BOOLEAN) - Mark as default/master version
- `is_archived` (BOOLEAN) - Soft delete flag
- `parent_version_number` (INTEGER) - Track version lineage
- `tags` (TEXT[]) - Categorization tags

It also creates indexes for performance and a unique constraint to ensure only one default version per resume.

## Verification

After running the migration, you can verify it worked by checking:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'resume_versions' 
ORDER BY ordinal_position;
```

You should see all the new columns listed.

## Troubleshooting

If you get an error about columns already existing, that's fine - the migration uses `IF NOT EXISTS` so it's safe to run multiple times.

If you get connection errors, make sure your `.env` file has the correct `DATABASE_URL`.

