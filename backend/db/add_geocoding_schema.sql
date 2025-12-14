-- ======================================
-- GEOCODING SCHEMA FOR UC-116
-- Location and Geo-coding Services
-- ======================================

-- Geocoding cache table
CREATE TABLE IF NOT EXISTS geocoding_cache (
    id SERIAL PRIMARY KEY,
    location_string TEXT NOT NULL UNIQUE,
    latitude DECIMAL(10, 7) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL,
    display_name TEXT,
    location_type VARCHAR(20), -- remote, hybrid, on_site, flexible
    country_code VARCHAR(2),
    timezone VARCHAR(100), -- e.g., "America/New_York", "Europe/London"
    utc_offset INTEGER, -- UTC offset in minutes (e.g., -300 for EST)
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Add geocoding columns to jobs table
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 7);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS longitude DECIMAL(10, 7);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS location_type VARCHAR(20); -- remote, hybrid, on_site, flexible
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS timezone VARCHAR(100);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS utc_offset INTEGER;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS geocoded_at TIMESTAMP;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS geocoding_error TEXT;

-- Add home location columns to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS home_latitude DECIMAL(10, 7);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS home_longitude DECIMAL(10, 7);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS home_timezone VARCHAR(100);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS home_utc_offset INTEGER;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS home_location_geocoded_at TIMESTAMP;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_geocoding_cache_location ON geocoding_cache(location_string);
CREATE INDEX IF NOT EXISTS idx_jobs_latitude_longitude ON jobs(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_jobs_location_type ON jobs(location_type);
CREATE INDEX IF NOT EXISTS idx_profiles_home_location ON profiles(home_latitude, home_longitude);
