# Market Benchmark Data Guide

## Where to Get Market Benchmark Data

### 1. **Levels.fyi** (Best for Tech Roles) ⭐
- **URL**: https://www.levels.fyi
- **Best for**: Software Engineering, Product Management, Data Science roles
- **Data includes**: Base salary, total compensation, equity, by level and location
- **How to use**: 
  - Search for your role (e.g., "Software Engineer")
  - Filter by location and level
  - Use the salary distribution percentiles
  - Example: Senior SWE in SF shows 10th, 25th, 50th, 75th, 90th percentiles

### 2. **Glassdoor**
- **URL**: https://www.glassdoor.com/Salaries
- **Best for**: All roles across industries
- **Data includes**: Salary ranges, company-specific data
- **How to use**: Search "Job Title + Location" to get salary ranges

### 3. **PayScale**
- **URL**: https://www.payscale.com
- **Best for**: Detailed salary data with experience levels
- **Data includes**: Salary by experience, location, company size

### 4. **LinkedIn Salary Insights**
- **URL**: https://www.linkedin.com/salary
- **Best for**: Role-specific data with location breakdowns
- **Data includes**: Salary ranges by location and experience

### 5. **H1B Salary Database**
- **URL**: https://h1bdata.info
- **Best for**: Actual salary data from H1B visa filings
- **Data includes**: Real salaries by company, role, location

### 6. **Bureau of Labor Statistics (BLS)**
- **URL**: https://www.bls.gov/oes/
- **Best for**: Official government salary data
- **Data includes**: Occupational Employment Statistics by location

### 7. **Stack Overflow Developer Survey**
- **URL**: https://survey.stackoverflow.co
- **Best for**: Developer salary trends globally
- **Data includes**: Salary by country, experience, technology stack

## How to Structure the Data

The `market_benchmarks` table requires:

```sql
INSERT INTO market_benchmarks (
  role_title,           -- e.g., "Software Engineer"
  role_level,           -- 'intern', 'entry', 'junior', 'mid', 'senior', 'staff', 'principal', 'lead', 'manager', 'director', 'vp'
  industry,             -- e.g., "Technology", "Finance", "Healthcare"
  company_size,         -- 'startup', 'small', 'medium', 'large', 'enterprise'
  location,             -- e.g., "San Francisco, CA"
  location_type,        -- 'remote', 'hybrid', 'on_site', 'flexible'
  percentile_10,        -- 10th percentile salary
  percentile_25,        -- 25th percentile salary
  percentile_50,        -- 50th percentile (median) salary
  percentile_75,        -- 75th percentile salary
  percentile_90,        -- 90th percentile salary
  total_comp_percentile_50,  -- Total compensation median (optional)
  years_of_experience_min,    -- Minimum years of experience
  years_of_experience_max,    -- Maximum years of experience
  sample_size,          -- Number of data points
  data_source,          -- e.g., "levels.fyi", "glassdoor"
  data_date             -- Date of data collection
) VALUES (...);
```

## Quick Start (Supabase)

### Option 1: Using Supabase SQL Editor (Recommended)

1. **Open Supabase Dashboard**:
   - Go to https://supabase.com/dashboard
   - Select your project

2. **Navigate to SQL Editor**:
   - Click "SQL Editor" in the left sidebar
   - Click "New query"

3. **Run the sample data script**:
   - Open `backend/db/sample_market_benchmarks.sql` in your code editor
   - Copy the entire contents
   - Paste into the Supabase SQL Editor
   - Click "Run" (or press Cmd/Ctrl + Enter)

4. **Verify the data**:
   - Run: `SELECT COUNT(*) FROM market_benchmarks;`
   - Run: `SELECT COUNT(*) FROM cost_of_living_index;`
   - You should see the inserted rows

### Option 2: Using psql Command Line

If you prefer command line:

1. **Get your connection string** from Supabase:
   - Go to Settings → Database
   - Copy the "Connection string" (use the "Session" mode connection string)

2. **Run the script**:
   ```bash
   psql "your-supabase-connection-string" -f backend/db/sample_market_benchmarks.sql
   ```

### Adding Your Own Data

1. **Get data from Levels.fyi or Glassdoor** (see sources above)
2. **Use the sample SQL as a template**
3. **Insert into Supabase SQL Editor**:
   - Open SQL Editor in Supabase Dashboard
   - Paste your INSERT statements
   - Run the query

### Update Regularly

- Market data changes over time
- Update `data_date` when refreshing data
- Consider quarterly or annual updates
- You can update existing records using the `ON CONFLICT` clause (already included in the sample)

## Example: Getting Data from Levels.fyi

1. Go to https://www.levels.fyi
2. Search for "Software Engineer" in "San Francisco"
3. Select "Senior" level
4. Look at the salary distribution chart
5. Extract percentiles:
   - 10th percentile: $150k
   - 25th percentile: $170k
   - 50th percentile (median): $190k
   - 75th percentile: $220k
   - 90th percentile: $260k
6. Insert into database using the SQL template

## Cost of Living Data Sources

- **Numbeo**: https://www.numbeo.com/cost-of-living/
- **Expatistan**: https://www.expatistan.com/cost-of-living
- **Mercer Cost of Living**: https://www.mercer.com

## Tips

- Start with your most common roles/locations
- Use multiple sources and average them for better accuracy
- Update data annually or when you notice significant market changes
- Focus on roles you're actively applying for
- Remote roles may use different benchmarks (often SF/NY rates or location-adjusted)

