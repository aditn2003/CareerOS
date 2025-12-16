-- ============================================================
-- CAREER GROWTH TRACKING FOR OFFERS
-- ============================================================

-- Add career milestones and notes columns to offers table
ALTER TABLE offers 
ADD COLUMN IF NOT EXISTS career_milestones JSONB,
ADD COLUMN IF NOT EXISTS career_notes TEXT;

-- Add index for faster queries on career milestones
CREATE INDEX IF NOT EXISTS idx_offers_career_milestones ON offers USING GIN (career_milestones);

-- Comments
COMMENT ON COLUMN offers.career_milestones IS 'Array of career milestone objects: [{year, title, salary}]';
COMMENT ON COLUMN offers.career_notes IS 'User notes about non-financial career goals and priorities';

