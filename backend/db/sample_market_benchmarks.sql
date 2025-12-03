-- ============================================================
-- SAMPLE MARKET BENCHMARK DATA
-- ============================================================
-- This file contains sample market benchmark data
-- You can use this as a template and add more data from various sources
--
-- DATA SOURCES:
-- 1. Levels.fyi - https://www.levels.fyi (Best for tech roles)
-- 2. Glassdoor - https://www.glassdoor.com/Salaries
-- 3. PayScale - https://www.payscale.com
-- 4. LinkedIn Salary Insights
-- 5. H1B Salary Database - https://h1bdata.info
-- 6. Bureau of Labor Statistics (BLS) - https://www.bls.gov
-- 7. Stack Overflow Developer Survey
-- 8. Company-specific data (if available)

-- ============================================================
-- SOFTWARE ENGINEER BENCHMARKS
-- ============================================================

-- Senior Software Engineer - San Francisco, CA - Large Tech Company
INSERT INTO market_benchmarks (
  role_title, role_level, industry, company_size, location, location_type,
  percentile_10, percentile_25, percentile_50, percentile_75, percentile_90,
  total_comp_percentile_50, total_comp_percentile_75, total_comp_percentile_90,
  years_of_experience_min, years_of_experience_max, sample_size, data_source, data_date
) VALUES (
  'Software Engineer', 'senior', 'Technology', 'large', 'San Francisco, CA', 'on_site',
  150000, 170000, 190000, 220000, 260000,
  250000, 300000, 400000,
  4.0, 7.0, 500, 'levels.fyi', '2024-01-01'
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

-- Mid-Level Software Engineer - San Francisco, CA
INSERT INTO market_benchmarks (
  role_title, role_level, industry, company_size, location, location_type,
  percentile_10, percentile_25, percentile_50, percentile_75, percentile_90,
  years_of_experience_min, years_of_experience_max, sample_size, data_source, data_date
) VALUES (
  'Software Engineer', 'mid', 'Technology', 'large', 'San Francisco, CA', 'on_site',
  120000, 140000, 160000, 180000, 210000,
  2.0, 4.0, 800, 'levels.fyi', '2024-01-01'
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

-- Senior Software Engineer - Remote (US)
INSERT INTO market_benchmarks (
  role_title, role_level, industry, company_size, location, location_type,
  percentile_10, percentile_25, percentile_50, percentile_75, percentile_90,
  years_of_experience_min, years_of_experience_max, sample_size, data_source, data_date
) VALUES (
  'Software Engineer', 'senior', 'Technology', 'large', 'Remote', 'remote',
  130000, 150000, 170000, 200000, 240000,
  4.0, 7.0, 300, 'levels.fyi', '2024-01-01'
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

-- Senior Software Engineer - New York, NY
INSERT INTO market_benchmarks (
  role_title, role_level, industry, company_size, location, location_type,
  percentile_10, percentile_25, percentile_50, percentile_75, percentile_90,
  years_of_experience_min, years_of_experience_max, sample_size, data_source, data_date
) VALUES (
  'Software Engineer', 'senior', 'Technology', 'large', 'New York, NY', 'on_site',
  145000, 165000, 185000, 215000, 255000,
  4.0, 7.0, 400, 'levels.fyi', '2024-01-01'
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

-- Senior Software Engineer - Seattle, WA
INSERT INTO market_benchmarks (
  role_title, role_level, industry, company_size, location, location_type,
  percentile_10, percentile_25, percentile_50, percentile_75, percentile_90,
  years_of_experience_min, years_of_experience_max, sample_size, data_source, data_date
) VALUES (
  'Software Engineer', 'senior', 'Technology', 'large', 'Seattle, WA', 'on_site',
  140000, 160000, 180000, 210000, 250000,
  4.0, 7.0, 350, 'levels.fyi', '2024-01-01'
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

-- Senior Software Engineer - Austin, TX
INSERT INTO market_benchmarks (
  role_title, role_level, industry, company_size, location, location_type,
  percentile_10, percentile_25, percentile_50, percentile_75, percentile_90,
  years_of_experience_min, years_of_experience_max, sample_size, data_source, data_date
) VALUES (
  'Software Engineer', 'senior', 'Technology', 'large', 'Austin, TX', 'on_site',
  120000, 140000, 160000, 185000, 220000,
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

-- ============================================================
-- DATA ENGINEER BENCHMARKS
-- ============================================================

-- Senior Data Engineer - San Francisco, CA
INSERT INTO market_benchmarks (
  role_title, role_level, industry, company_size, location, location_type,
  percentile_10, percentile_25, percentile_50, percentile_75, percentile_90,
  years_of_experience_min, years_of_experience_max, sample_size, data_source, data_date
) VALUES (
  'Data Engineer', 'senior', 'Technology', 'large', 'San Francisco, CA', 'on_site',
  145000, 165000, 185000, 215000, 255000,
  4.0, 7.0, 150, 'levels.fyi', '2024-01-01'
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

-- ============================================================
-- PRODUCT MANAGER BENCHMARKS
-- ============================================================

-- Senior Product Manager - San Francisco, CA
INSERT INTO market_benchmarks (
  role_title, role_level, industry, company_size, location, location_type,
  percentile_10, percentile_25, percentile_50, percentile_75, percentile_90,
  years_of_experience_min, years_of_experience_max, sample_size, data_source, data_date
) VALUES (
  'Product Manager', 'senior', 'Technology', 'large', 'San Francisco, CA', 'on_site',
  140000, 160000, 180000, 210000, 250000,
  4.0, 7.0, 200, 'glassdoor', '2024-01-01'
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

-- ============================================================
-- COST OF LIVING INDEX DATA
-- ============================================================

-- San Francisco, CA (High COL)
INSERT INTO cost_of_living_index (location, location_type, col_index, housing_index, data_source, data_year)
VALUES ('San Francisco, CA', 'on_site', 169.0, 245.0, 'numbeo', 2024)
ON CONFLICT (location) DO UPDATE SET
  col_index = EXCLUDED.col_index,
  housing_index = EXCLUDED.housing_index,
  data_year = EXCLUDED.data_year;

-- New York, NY (High COL)
INSERT INTO cost_of_living_index (location, location_type, col_index, housing_index, data_source, data_year)
VALUES ('New York, NY', 'on_site', 163.0, 220.0, 'numbeo', 2024)
ON CONFLICT (location) DO UPDATE SET
  col_index = EXCLUDED.col_index,
  housing_index = EXCLUDED.housing_index,
  data_year = EXCLUDED.data_year;

-- Seattle, WA (High COL)
INSERT INTO cost_of_living_index (location, location_type, col_index, housing_index, data_source, data_year)
VALUES ('Seattle, WA', 'on_site', 132.0, 180.0, 'numbeo', 2024)
ON CONFLICT (location) DO UPDATE SET
  col_index = EXCLUDED.col_index,
  housing_index = EXCLUDED.housing_index,
  data_year = EXCLUDED.data_year;

-- Austin, TX (Medium COL)
INSERT INTO cost_of_living_index (location, location_type, col_index, housing_index, data_source, data_year)
VALUES ('Austin, TX', 'on_site', 105.0, 120.0, 'numbeo', 2024)
ON CONFLICT (location) DO UPDATE SET
  col_index = EXCLUDED.col_index,
  housing_index = EXCLUDED.housing_index,
  data_year = EXCLUDED.data_year;

-- Remote (US Average)
INSERT INTO cost_of_living_index (location, location_type, col_index, housing_index, data_source, data_year)
VALUES ('Remote', 'remote', 100.0, 100.0, 'us_average', 2024)
ON CONFLICT (location) DO UPDATE SET
  col_index = EXCLUDED.col_index,
  housing_index = EXCLUDED.housing_index,
  data_year = EXCLUDED.data_year;

