-- ============================================================
-- ADD DESCRIPTION COLUMN TO uploaded_cover_letters
-- ============================================================
-- Add description field to store "Published from..." metadata
-- ============================================================

ALTER TABLE uploaded_cover_letters
ADD COLUMN IF NOT EXISTS description TEXT;

COMMENT ON COLUMN uploaded_cover_letters.description IS 'Metadata about the cover letter, e.g., "Published from [Original Title] - Version [N]"';

