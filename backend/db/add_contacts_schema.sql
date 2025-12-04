-- ======================================
-- PROFESSIONAL NETWORK CONTACTS SCHEMA
-- ======================================

-- Main contacts table
CREATE TABLE IF NOT EXISTS professional_contacts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    title VARCHAR(255),
    company VARCHAR(255),
    industry VARCHAR(100),
    relationship_type VARCHAR(50) NOT NULL CHECK (
        relationship_type IN (
            'Colleague',
            'Manager',
            'Mentor',
            'Friend',
            'Acquaintance',
            'Recruiter',
            'Client',
            'Other'
        )
    ),
    relationship_strength INTEGER DEFAULT 3 CHECK (relationship_strength BETWEEN 1 AND 5),
    -- 1=weak, 5=strong
    location VARCHAR(255),
    linkedin_profile VARCHAR(500),
    notes TEXT,
    personal_interests TEXT,
    professional_interests TEXT,
    mutual_connections TEXT ARRAY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, email)
);

-- Interaction history table
CREATE TABLE IF NOT EXISTS contact_interactions (
    id SERIAL PRIMARY KEY,
    contact_id INTEGER NOT NULL REFERENCES professional_contacts(id) ON DELETE CASCADE,
    interaction_type VARCHAR(50) NOT NULL CHECK (
        interaction_type IN (
            'Email',
            'Phone Call',
            'In-Person Meeting',
            'LinkedIn Message',
            'Video Call',
            'Coffee Chat',
            'Other'
        )
    ),
    interaction_date DATE NOT NULL,
    notes TEXT,
    outcome VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Relationship reminders table
CREATE TABLE IF NOT EXISTS contact_reminders (
    id SERIAL PRIMARY KEY,
    contact_id INTEGER NOT NULL REFERENCES professional_contacts(id) ON DELETE CASCADE,
    reminder_type VARCHAR(50) NOT NULL CHECK (
        reminder_type IN (
            'Follow-up',
            'Birthday',
            'Anniversary',
            'Catch-up',
            'Custom'
        )
    ),
    reminder_date DATE NOT NULL,
    description TEXT,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Contact links to companies and opportunities
CREATE TABLE IF NOT EXISTS contact_links (
    id SERIAL PRIMARY KEY,
    contact_id INTEGER NOT NULL REFERENCES professional_contacts(id) ON DELETE CASCADE,
    link_type VARCHAR(50) NOT NULL CHECK (
        link_type IN (
            'Company',
            'Job Opportunity',
            'Project',
            'Other'
        )
    ),
    link_id INTEGER,
    -- references companies.id or jobs.id based on link_type
    link_description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Contact groups/categories
CREATE TABLE IF NOT EXISTS contact_groups (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, name)
);

-- Junction table for contacts to groups (many-to-many)
CREATE TABLE IF NOT EXISTS contact_group_mapping (
    id SERIAL PRIMARY KEY,
    contact_id INTEGER NOT NULL REFERENCES professional_contacts(id) ON DELETE CASCADE,
    group_id INTEGER NOT NULL REFERENCES contact_groups(id) ON DELETE CASCADE,
    UNIQUE(contact_id, group_id)
);

-- Imported contacts tracking
CREATE TABLE IF NOT EXISTS imported_contacts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    import_source VARCHAR(100) NOT NULL CHECK (
        import_source IN (
            'Google Contacts',
            'CSV',
            'Email',
            'Manual',
            'LinkedIn'
        )
    ),
    contact_count INTEGER,
    import_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    import_data JSONB
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_professional_contacts_user_id ON professional_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_professional_contacts_relationship_type ON professional_contacts(relationship_type);
CREATE INDEX IF NOT EXISTS idx_professional_contacts_industry ON professional_contacts(industry);
CREATE INDEX IF NOT EXISTS idx_professional_contacts_company ON professional_contacts(company);
CREATE INDEX IF NOT EXISTS idx_contact_interactions_contact_id ON contact_interactions(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_interactions_date ON contact_interactions(interaction_date);
CREATE INDEX IF NOT EXISTS idx_contact_reminders_contact_id ON contact_reminders(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_reminders_date ON contact_reminders(reminder_date);
CREATE INDEX IF NOT EXISTS idx_contact_links_contact_id ON contact_links(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_groups_user_id ON contact_groups(user_id);
CREATE INDEX IF NOT EXISTS idx_contact_group_mapping_group_id ON contact_group_mapping(group_id);
CREATE INDEX IF NOT EXISTS idx_imported_contacts_user_id ON imported_contacts(user_id);
