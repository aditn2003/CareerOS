-- ============================================================
-- COMPENSATION & OFFER TRACKING SYSTEM
-- ============================================================

-- OFFERS TABLE: Track all job offers received
CREATE TABLE IF NOT EXISTS offers (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_id INT REFERENCES jobs(id) ON DELETE SET NULL,
    
    -- Offer Details
    company TEXT NOT NULL,
    role_title TEXT NOT NULL,
    role_level VARCHAR(50) CHECK (role_level IN ('intern', 'entry', 'junior', 'mid', 'senior', 'staff', 'principal', 'lead', 'manager', 'director', 'vp')),
    location TEXT,
    location_type VARCHAR(20) CHECK (location_type IN ('remote', 'hybrid', 'on_site', 'flexible')),
    industry TEXT,
    company_size VARCHAR(20) CHECK (company_size IN ('startup', 'small', 'medium', 'large', 'enterprise')),
    
    -- Compensation Components
    base_salary DECIMAL(10,2),
    signing_bonus DECIMAL(10,2) DEFAULT 0,
    annual_bonus_percent DECIMAL(5,2) DEFAULT 0,
    annual_bonus_guaranteed BOOLEAN DEFAULT FALSE,
    equity_type VARCHAR(20) CHECK (equity_type IN ('stock_options', 'rsu', 'restricted_stock', 'none')),
    equity_value DECIMAL(10,2) DEFAULT 0,
    equity_vesting_schedule TEXT,
    equity_valuation_date DATE,
    
    -- Benefits & Perks
    pto_days INT DEFAULT 0,
    health_insurance_value DECIMAL(8,2) DEFAULT 0,
    retirement_match_percent DECIMAL(5,2) DEFAULT 0,
    retirement_match_cap DECIMAL(8,2) DEFAULT 0,
    other_benefits_value DECIMAL(8,2) DEFAULT 0,
    
    -- Total Compensation
    total_comp_year1 DECIMAL(10,2),
    total_comp_year4 DECIMAL(10,2),
    
    -- Offer Status
    offer_status VARCHAR(20) DEFAULT 'pending' CHECK (offer_status IN ('pending', 'accepted', 'rejected', 'expired', 'withdrawn')),
    offer_date DATE NOT NULL,
    expiration_date DATE,
    decision_date DATE,
    
    -- Negotiation Tracking
    initial_base_salary DECIMAL(10,2),
    negotiated_base_salary DECIMAL(10,2),
    negotiation_attempted BOOLEAN DEFAULT FALSE,
    negotiation_successful BOOLEAN DEFAULT FALSE,
    negotiation_improvement_percent DECIMAL(5,2),
    negotiation_notes TEXT,
    
    -- Multiple Offers
    competing_offers_count INT DEFAULT 0,
    competing_offers_ids INT[],
    
    -- Metadata
    years_of_experience DECIMAL(4,1),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- COMPENSATION_HISTORY TABLE
CREATE TABLE IF NOT EXISTS compensation_history (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    offer_id INT REFERENCES offers(id) ON DELETE SET NULL,
    
    company TEXT NOT NULL,
    role_title TEXT NOT NULL,
    role_level VARCHAR(50),
    start_date DATE NOT NULL,
    end_date DATE,
    
    base_salary_start DECIMAL(10,2),
    total_comp_start DECIMAL(10,2),
    base_salary_current DECIMAL(10,2),
    total_comp_current DECIMAL(10,2),
    
    promotion_date DATE,
    promotion_from_level VARCHAR(50),
    promotion_to_level VARCHAR(50),
    salary_increase_percent DECIMAL(5,2),
    
    equity_refresher_date DATE,
    equity_refresher_value DECIMAL(10,2),
    
    pto_days INT,
    benefits_value DECIMAL(8,2),
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- NEGOTIATION_HISTORY TABLE
CREATE TABLE IF NOT EXISTS negotiation_history (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    offer_id INT NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
    
    negotiation_round INT DEFAULT 1,
    negotiation_date DATE NOT NULL,
    negotiation_type VARCHAR(50) CHECK (negotiation_type IN ('base_salary', 'signing_bonus', 'equity', 'pto', 'start_date', 'other')),
    
    value_before DECIMAL(10,2),
    value_after DECIMAL(10,2),
    improvement_percent DECIMAL(5,2),
    
    negotiation_strategy TEXT,
    company_response TEXT,
    outcome VARCHAR(20) CHECK (outcome IN ('accepted', 'rejected', 'countered', 'pending')),
    
    had_competing_offer BOOLEAN DEFAULT FALSE,
    leverage_points TEXT[],
    
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- MARKET_BENCHMARKS TABLE
CREATE TABLE IF NOT EXISTS market_benchmarks (
    id SERIAL PRIMARY KEY,
    
    role_title TEXT NOT NULL,
    role_level VARCHAR(50) NOT NULL,
    industry TEXT,
    company_size VARCHAR(20),
    
    location TEXT,
    location_type VARCHAR(20),
    cost_of_living_index DECIMAL(5,2),
    
    percentile_10 DECIMAL(10,2),
    percentile_25 DECIMAL(10,2),
    percentile_50 DECIMAL(10,2),
    percentile_75 DECIMAL(10,2),
    percentile_90 DECIMAL(10,2),
    
    total_comp_percentile_50 DECIMAL(10,2),
    total_comp_percentile_75 DECIMAL(10,2),
    total_comp_percentile_90 DECIMAL(10,2),
    
    years_of_experience_min DECIMAL(4,1),
    years_of_experience_max DECIMAL(4,1),
    sample_size INT,
    data_source VARCHAR(50),
    data_date DATE,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(role_title, role_level, industry, company_size, location, location_type)
);

-- COST_OF_LIVING_INDEX TABLE
CREATE TABLE IF NOT EXISTS cost_of_living_index (
    id SERIAL PRIMARY KEY,
    location TEXT NOT NULL UNIQUE,
    location_type VARCHAR(20),
    col_index DECIMAL(5,2) NOT NULL,
    housing_index DECIMAL(5,2),
    food_index DECIMAL(5,2),
    transportation_index DECIMAL(5,2),
    healthcare_index DECIMAL(5,2),
    data_source VARCHAR(50),
    data_year INT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_offers_user_id ON offers(user_id);
CREATE INDEX IF NOT EXISTS idx_offers_job_id ON offers(job_id);
CREATE INDEX IF NOT EXISTS idx_offers_status ON offers(offer_status);
CREATE INDEX IF NOT EXISTS idx_compensation_history_user_id ON compensation_history(user_id);
CREATE INDEX IF NOT EXISTS idx_negotiation_history_user_id ON negotiation_history(user_id);
CREATE INDEX IF NOT EXISTS idx_negotiation_history_offer_id ON negotiation_history(offer_id);
CREATE INDEX IF NOT EXISTS idx_market_benchmarks_lookup ON market_benchmarks(role_title, role_level, location);

