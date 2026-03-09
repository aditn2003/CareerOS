-- ============================================================
-- MISSING TABLE: event_contacts
-- ============================================================
-- This table links contacts you met at events (many-to-many relationship)
-- Run this in Supabase SQL Editor if you don't have this table
-- ============================================================

-- Event-Contact Relationships (many-to-many)
CREATE TABLE IF NOT EXISTS event_contacts (
    id SERIAL PRIMARY KEY,
    event_id INT NOT NULL REFERENCES networking_events(id) ON DELETE CASCADE,
    contact_id INT NOT NULL REFERENCES networking_contacts(id) ON DELETE CASCADE,
    relationship_boost INT DEFAULT 1 CHECK (relationship_boost BETWEEN 1 AND 3),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(event_id, contact_id)
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_event_contacts_event_id ON event_contacts(event_id);
CREATE INDEX IF NOT EXISTS idx_event_contacts_contact_id ON event_contacts(contact_id);

-- ============================================================
-- VERIFICATION
-- ============================================================
-- Run this to check if the table was created:
-- SELECT * FROM information_schema.tables 
-- WHERE table_name = 'event_contacts';
-- ============================================================

