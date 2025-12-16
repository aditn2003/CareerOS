-- ======================================
-- SALARY DATA CACHE TABLE (UC-112)
-- ======================================
-- Stores cached salary data from external APIs (BLS, etc.)
-- to minimize API calls and improve performance

CREATE TABLE IF NOT EXISTS salary_cache (
    id SERIAL PRIMARY KEY,
    job_title TEXT NOT NULL,
    location TEXT NOT NULL,
    experience_level VARCHAR(50), -- Entry, Mid, Senior, Lead, etc.
    
    -- Percentile breakdowns
    percentile_25 DECIMAL(10, 2), -- 25th percentile (lower quartile)
    percentile_50 DECIMAL(10, 2), -- 50th percentile (median)
    percentile_75 DECIMAL(10, 2), -- 75th percentile (upper quartile)
    
    -- Additional data
    salary_low DECIMAL(10, 2),
    salary_high DECIMAL(10, 2),
    salary_average DECIMAL(10, 2),
    data_source TEXT, -- 'BLS', 'Glassdoor', 'Computed', etc.
    metadata JSONB, -- Additional structured data (company comparisons, trends, etc.)
    
    -- Cache management
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP, -- Cache expiration (defaults to 7 days for weekly updates)
    
    -- Composite index for fast lookups
    UNIQUE(job_title, location, experience_level)
);

-- Index for efficient cache lookups
CREATE INDEX IF NOT EXISTS idx_salary_cache_lookup 
    ON salary_cache(job_title, location, experience_level);

-- Index for cache expiration cleanup
CREATE INDEX IF NOT EXISTS idx_salary_cache_expires 
    ON salary_cache(expires_at);

-- Function to automatically set expires_at to 7 days from now
CREATE OR REPLACE FUNCTION set_salary_cache_expiry()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.expires_at IS NULL THEN
        NEW.expires_at := NOW() + INTERVAL '7 days';
    END IF;
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to set expiration on insert/update
CREATE TRIGGER set_salary_cache_expiry_trigger
    BEFORE INSERT OR UPDATE ON salary_cache
    FOR EACH ROW
    EXECUTE FUNCTION set_salary_cache_expiry();

-- Comments for documentation
COMMENT ON TABLE salary_cache IS 'Caches salary benchmark data from external APIs to minimize API calls';
COMMENT ON COLUMN salary_cache.percentile_25 IS '25th percentile salary (lower quartile)';
COMMENT ON COLUMN salary_cache.percentile_50 IS '50th percentile salary (median)';
COMMENT ON COLUMN salary_cache.percentile_75 IS '75th percentile salary (upper quartile)';
COMMENT ON COLUMN salary_cache.expires_at IS 'Cache expiration timestamp (defaults to 7 days for weekly updates)';
