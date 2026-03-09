-- ============================================================
-- CHECK AND POPULATE COVER LETTER TEMPLATES
-- ============================================================
-- Run this in Supabase SQL Editor to:
-- 1. Check current templates
-- 2. Verify table structure
-- 3. Add sample templates if needed
-- ============================================================

-- Step 1: Check current templates
SELECT 
    id, 
    name, 
    industry, 
    category, 
    is_custom,
    LENGTH(content) as content_length,
    view_count,
    use_count,
    created_at
FROM cover_letter_templates
ORDER BY created_at DESC;

-- Step 2: Count templates by type
SELECT 
    is_custom,
    COUNT(*) as count
FROM cover_letter_templates
GROUP BY is_custom;

-- Step 3: Check table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'cover_letter_templates'
ORDER BY ordinal_position;

-- Step 4: Add sample global templates (only if they don't exist)
-- These will only insert if no templates with these names exist
INSERT INTO cover_letter_templates (name, industry, category, content, is_custom) 
SELECT * FROM (VALUES
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
) AS v(name, industry, category, content, is_custom)
WHERE NOT EXISTS (
    SELECT 1 FROM cover_letter_templates 
    WHERE name = v.name AND is_custom = false
);

-- Step 5: Verify templates were added
SELECT 
    id, 
    name, 
    industry, 
    is_custom,
    created_at
FROM cover_letter_templates
WHERE is_custom = false OR is_custom IS NULL
ORDER BY created_at DESC;

