# Supabase Setup Guide for Market Benchmarks

## Step-by-Step: Adding Market Benchmark Data to Supabase

### 1. Access Supabase SQL Editor

1. Go to https://supabase.com/dashboard
2. Select your project
3. Click **"SQL Editor"** in the left sidebar
4. Click **"New query"** button

### 2. Run the Sample Data Script

1. Open the file: `backend/db/sample_market_benchmarks.sql`
2. **Copy the entire file contents** (Cmd/Ctrl + A, then Cmd/Ctrl + C)
3. **Paste into the Supabase SQL Editor** (Cmd/Ctrl + V)
4. Click **"Run"** button (or press Cmd/Ctrl + Enter)

### 3. Verify the Data Was Inserted

Run these queries in the SQL Editor to verify:

```sql
-- Check market benchmarks
SELECT COUNT(*) as benchmark_count FROM market_benchmarks;

-- Check cost of living data
SELECT COUNT(*) as col_count FROM cost_of_living_index;

-- View sample benchmarks
SELECT 
  role_title, 
  role_level, 
  location, 
  percentile_50 as median_salary,
  data_source
FROM market_benchmarks
ORDER BY role_title, location
LIMIT 10;
```

### 4. Add Your Own Data

#### Example: Adding a New Benchmark

```sql
INSERT INTO market_benchmarks (
  role_title, role_level, industry, company_size, location, location_type,
  percentile_10, percentile_25, percentile_50, percentile_75, percentile_90,
  years_of_experience_min, years_of_experience_max, sample_size, data_source, data_date
) VALUES (
  'Data Scientist', 'senior', 'Technology', 'large', 'San Francisco, CA', 'on_site',
  140000, 160000, 180000, 210000, 250000,
  4.0, 7.0, 200, 'levels.fyi', '2024-01-01'
) ON CONFLICT (role_title, role_level, industry, company_size, location, location_type) 
DO UPDATE SET
  percentile_10 = EXCLUDED.percentile_10,
  percentile_25 = EXCLUDED.percentile_25,
  percentile_50 = EXCLUDED.percentile_50,
  percentile_75 = EXCLUDED.percentile_75,
  percentile_90 = EXCLUDED.percentile_90,
  sample_size = EXCLUDED.sample_size,
  data_date = EXCLUDED.data_date,
  updated_at = NOW();
```

### 5. View Your Data in Supabase Table Editor

1. Go to **"Table Editor"** in the left sidebar
2. Select **"market_benchmarks"** table
3. You should see all the inserted rows
4. You can also edit/add data directly here if preferred

### 6. Troubleshooting

#### If you get "relation does not exist" error:
- Make sure you've run the compensation tracking migration first:
  - Run `backend/db/add_compensation_tracking.sql` in the SQL Editor

#### If you get duplicate key errors:
- The `ON CONFLICT` clause should handle this automatically
- If you still get errors, you can delete existing rows first:
  ```sql
  DELETE FROM market_benchmarks WHERE data_source = 'levels.fyi';
  ```

#### If you want to update existing data:
- The sample script uses `ON CONFLICT ... DO UPDATE` which will update existing rows
- Or you can manually update:
  ```sql
  UPDATE market_benchmarks 
  SET percentile_50 = 195000, updated_at = NOW()
  WHERE role_title = 'Software Engineer' 
    AND role_level = 'senior' 
    AND location = 'San Francisco, CA';
  ```

### 7. Quick Reference: Finding Your Connection String

If you need the connection string for command-line tools:

1. Go to **Settings** → **Database**
2. Scroll to **"Connection string"**
3. Copy the **"Session mode"** connection string
4. Format: `postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`

**Note**: For security, use environment variables, never commit connection strings to git!

