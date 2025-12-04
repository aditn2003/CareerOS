/* ========================================================================
   UC-093: Relationship Maintenance Automation Schema
   
   Table: relationship_reminders - Stores relationship maintenance reminders
======================================================================== */

-- ============================================================
-- relationship_reminders (UC-093)
-- Stores relationship maintenance reminders
-- ============================================================
CREATE TABLE IF NOT EXISTS relationship_reminders (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contact_name VARCHAR(255) NOT NULL,
  contact_company VARCHAR(255),
  reminder_type VARCHAR(50), -- check_in, follow_up, congratulations, birthday, anniversary, custom
  reminder_date DATE NOT NULL,
  custom_message TEXT,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_relationship_reminders_user ON relationship_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_relationship_reminders_date ON relationship_reminders(reminder_date);
CREATE INDEX IF NOT EXISTS idx_relationship_reminders_completed ON relationship_reminders(is_completed);

-- ============================================================
-- recurring_check_ins (New - UC-093 Enhancement)
-- Stores recurring check-in schedules for important contacts
-- ============================================================
CREATE TABLE IF NOT EXISTS recurring_check_ins (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contact_name VARCHAR(255) NOT NULL,
  contact_company VARCHAR(255),
  frequency VARCHAR(50) NOT NULL, -- weekly, biweekly, monthly, quarterly
  frequency_days INTEGER, -- actual days between check-ins (7, 14, 30, 90)
  priority VARCHAR(50) DEFAULT 'medium', -- high, medium, low
  last_reminder_date DATE,
  next_reminder_date DATE,
  custom_message TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recurring_check_ins_user ON recurring_check_ins(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_check_ins_next_date ON recurring_check_ins(next_reminder_date);
CREATE INDEX IF NOT EXISTS idx_recurring_check_ins_active ON recurring_check_ins(is_active);
