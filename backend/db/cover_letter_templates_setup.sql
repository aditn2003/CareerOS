-- ============================================================
-- COVER LETTER TEMPLATES TABLE SETUP FOR SUPABASE
-- ============================================================
-- Run this SQL in your Supabase SQL Editor to create the table
-- and add some sample global templates
-- ============================================================

-- Create the cover_letter_templates table
CREATE TABLE IF NOT EXISTS cover_letter_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    industry VARCHAR(100),
    category VARCHAR(50) DEFAULT 'Formal',
    content TEXT NOT NULL,
    is_custom BOOLEAN DEFAULT false,
    view_count INTEGER DEFAULT 0,
    use_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_cover_letter_templates_industry ON cover_letter_templates(industry);
CREATE INDEX IF NOT EXISTS idx_cover_letter_templates_is_custom ON cover_letter_templates(is_custom);

-- Add some sample global templates (is_custom = false means they're global)
INSERT INTO cover_letter_templates (name, industry, category, content, is_custom) VALUES
(
    'Software Engineer Template',
    'Technology',
    'Professional',
    'Dear Hiring Manager,

I am writing to express my strong interest in the [Position Title] role at [Company Name]. With [X years] of experience in software development and a passion for creating innovative solutions, I am excited about the opportunity to contribute to your team.

In my current role at [Current Company], I have successfully [Key Achievement 1], resulting in [Quantifiable Result]. Additionally, I have [Key Achievement 2], which demonstrates my ability to [Relevant Skill].

I am particularly drawn to [Company Name] because of [Specific Reason - Company Research]. Your commitment to [Company Value/Mission] aligns with my professional values and career goals.

I would welcome the opportunity to discuss how my technical skills and experience can contribute to your team''s continued success.

Sincerely,
[Your Name]',
    false
),
(
    'Data Analyst Template',
    'Technology',
    'Professional',
    'Dear Hiring Manager,

I am excited to apply for the [Position Title] position at [Company Name]. With a strong background in data analysis and a proven track record of turning complex data into actionable insights, I am confident I can make a valuable contribution to your team.

Throughout my career, I have [Key Achievement 1], which led to [Quantifiable Result]. My expertise in [Relevant Skill/Tool] has enabled me to [Key Achievement 2].

What particularly interests me about [Company Name] is [Specific Reason]. I am eager to bring my analytical skills and passion for data-driven decision making to your organization.

Thank you for considering my application. I look forward to discussing how I can contribute to your team.

Best regards,
[Your Name]',
    false
),
(
    'General Professional Template',
    'General',
    'Formal',
    'Dear Hiring Manager,

I am writing to express my interest in the [Position Title] position at [Company Name]. With [X years] of experience in [Industry/Field] and a commitment to excellence, I am excited about the opportunity to contribute to your organization.

In my previous roles, I have [Key Achievement 1], demonstrating my ability to [Relevant Skill]. Additionally, I have [Key Achievement 2], which showcases my [Another Skill].

I am particularly interested in [Company Name] because [Specific Reason]. Your reputation for [Company Strength] and commitment to [Company Value] align with my professional goals.

I would appreciate the opportunity to discuss how my experience and skills can contribute to your team''s success.

Sincerely,
[Your Name]',
    false
)
ON CONFLICT DO NOTHING;

-- Verify the table was created
SELECT 
    id, 
    name, 
    industry, 
    category, 
    is_custom,
    created_at
FROM cover_letter_templates
ORDER BY created_at DESC;

