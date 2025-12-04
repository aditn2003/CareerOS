-- Career Goals Tracking System
-- This migration adds support for SMART career goals with progress tracking

CREATE TABLE IF NOT EXISTS career_goals (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Goal Details (SMART Framework)
    title TEXT NOT NULL,
    description TEXT,
    category VARCHAR(50) CHECK (category IN ('salary', 'role_level', 'skills', 'networking', 'applications', 'interviews', 'offers', 'certifications', 'education', 'other')),
    
    -- SMART Criteria
    specific TEXT NOT NULL, -- Specific: What exactly do you want to achieve?
    measurable TEXT NOT NULL, -- Measurable: How will you measure success?
    achievable BOOLEAN DEFAULT TRUE, -- Achievable: Is this goal realistic?
    relevant TEXT, -- Relevant: Why is this goal important?
    time_bound DATE NOT NULL, -- Time-bound: When is the deadline?
    
    -- Progress Tracking
    target_value DECIMAL(10,2), -- Target metric value (e.g., $150K salary, 50 applications)
    current_value DECIMAL(10,2) DEFAULT 0, -- Current progress value
    progress_percent DECIMAL(5,2) DEFAULT 0, -- Calculated progress percentage
    
    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    
    -- Timeline
    start_date DATE DEFAULT CURRENT_DATE,
    target_date DATE NOT NULL,
    completed_date DATE,
    
    -- Milestones
    milestone_count INT DEFAULT 0,
    milestones_completed INT DEFAULT 0,
    
    -- Impact Tracking
    linked_job_ids INT[], -- Jobs related to this goal
    linked_offer_ids INT[], -- Offers related to this goal
    linked_skill_ids INT[], -- Skills related to this goal
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Goal Milestones (sub-goals or checkpoints)
CREATE TABLE IF NOT EXISTS goal_milestones (
    id SERIAL PRIMARY KEY,
    goal_id INT NOT NULL REFERENCES career_goals(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    title TEXT NOT NULL,
    description TEXT,
    target_date DATE,
    completed_date DATE,
    
    -- Progress
    target_value DECIMAL(10,2),
    current_value DECIMAL(10,2) DEFAULT 0,
    progress_percent DECIMAL(5,2) DEFAULT 0,
    
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Goal Progress History (for tracking changes over time)
CREATE TABLE IF NOT EXISTS goal_progress_history (
    id SERIAL PRIMARY KEY,
    goal_id INT NOT NULL REFERENCES career_goals(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    progress_value DECIMAL(10,2) NOT NULL,
    progress_percent DECIMAL(5,2) NOT NULL,
    notes TEXT,
    
    recorded_at TIMESTAMP DEFAULT NOW()
);

-- Goal Achievements (for celebrating milestones)
CREATE TABLE IF NOT EXISTS goal_achievements (
    id SERIAL PRIMARY KEY,
    goal_id INT NOT NULL REFERENCES career_goals(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    achievement_type VARCHAR(50) CHECK (achievement_type IN ('milestone', 'completion', 'progress_milestone', 'streak', 'early_completion')),
    achievement_date TIMESTAMP DEFAULT NOW(),
    description TEXT,
    
    -- Metrics
    progress_at_achievement DECIMAL(5,2),
    days_to_complete INT, -- Days from start to completion (if applicable)
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_career_goals_user_id ON career_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_career_goals_status ON career_goals(status);
CREATE INDEX IF NOT EXISTS idx_career_goals_target_date ON career_goals(target_date);
CREATE INDEX IF NOT EXISTS idx_goal_milestones_goal_id ON goal_milestones(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_progress_history_goal_id ON goal_progress_history(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_achievements_goal_id ON goal_achievements(goal_id);

-- Function to automatically update progress_percent
CREATE OR REPLACE FUNCTION update_goal_progress()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.target_value > 0 THEN
        NEW.progress_percent = (NEW.current_value / NEW.target_value) * 100;
    ELSE
        NEW.progress_percent = 0;
    END IF;
    
    -- Auto-update status based on progress
    IF NEW.progress_percent >= 100 AND NEW.status = 'active' THEN
        NEW.status = 'completed';
        NEW.completed_date = CURRENT_DATE;
    END IF;
    
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update progress
CREATE TRIGGER trigger_update_goal_progress
    BEFORE INSERT OR UPDATE ON career_goals
    FOR EACH ROW
    EXECUTE FUNCTION update_goal_progress();

-- Function to update milestone progress
CREATE OR REPLACE FUNCTION update_milestone_progress()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.target_value > 0 THEN
        NEW.progress_percent = (NEW.current_value / NEW.target_value) * 100;
    ELSE
        NEW.progress_percent = 0;
    END IF;
    
    -- Auto-update status
    IF NEW.progress_percent >= 100 AND NEW.status != 'completed' THEN
        NEW.status = 'completed';
        NEW.completed_date = CURRENT_DATE;
    END IF;
    
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for milestone progress
CREATE TRIGGER trigger_update_milestone_progress
    BEFORE INSERT OR UPDATE ON goal_milestones
    FOR EACH ROW
    EXECUTE FUNCTION update_milestone_progress();

