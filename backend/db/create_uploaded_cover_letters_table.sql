-- ======================================
-- CREATE uploaded_cover_letters TABLE
-- ======================================
-- This table stores only uploaded cover letter files (PDF, DOC, DOCX, TXT)
-- Separate from the existing cover_letters table which may have different structure

CREATE TABLE IF NOT EXISTS uploaded_cover_letters (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    format VARCHAR(10) NOT NULL DEFAULT 'pdf', -- pdf, doc, docx, txt
    file_url TEXT NOT NULL, -- Path to uploaded file
    content TEXT, -- Extracted text content from the file
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_uploaded_cover_letters_user_id ON uploaded_cover_letters(user_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_cover_letters_created_at ON uploaded_cover_letters(created_at);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_uploaded_cover_letters_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_uploaded_cover_letters_updated_at ON uploaded_cover_letters;
CREATE TRIGGER trigger_update_uploaded_cover_letters_updated_at
    BEFORE UPDATE ON uploaded_cover_letters
    FOR EACH ROW
    EXECUTE FUNCTION update_uploaded_cover_letters_updated_at();

-- Verification
SELECT '✅ uploaded_cover_letters table created successfully!' AS Status;

