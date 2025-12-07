-- ======================================
-- DEMO VERSION CONTROL DATA
-- ======================================
-- Add hardcoded demo versions for a couple of resumes and cover letters

-- First, let's get a user ID (assuming there's at least one user)
-- We'll use the first user in the system, or you can specify a user_id

-- Demo Resume Versions (for resume with title "Software Engineer Resume")
-- Assuming we have a resume with id=1 for demo purposes
-- You may need to adjust the resume_id and user_id based on your actual data

-- Insert demo resume versions
INSERT INTO resume_versions (resume_id, user_id, version_number, title, sections, format, change_summary, created_at)
SELECT 
    1, -- resume_id (adjust based on your actual resume)
    user_id,
    1,
    'Software Engineer Resume',
    '{"summary": "Experienced software engineer with 5+ years in full-stack development", "experience": [{"company": "Tech Corp", "title": "Senior Developer", "duration": "2020-Present"}]}'::jsonb,
    'pdf',
    'Initial version - Basic resume structure',
    NOW() - INTERVAL '30 days'
FROM resumes WHERE id = 1
LIMIT 1
ON CONFLICT (resume_id, version_number) DO NOTHING;

INSERT INTO resume_versions (resume_id, user_id, version_number, title, sections, format, change_summary, created_at)
SELECT 
    1,
    user_id,
    2,
    'Software Engineer Resume',
    '{"summary": "Experienced software engineer with 5+ years in full-stack development. Specialized in React, Node.js, and cloud technologies.", "experience": [{"company": "Tech Corp", "title": "Senior Developer", "duration": "2020-Present", "achievements": ["Led team of 5 developers", "Improved performance by 40%"]}]}'::jsonb,
    'pdf',
    'Added detailed achievements and expanded summary',
    NOW() - INTERVAL '20 days'
FROM resumes WHERE id = 1
LIMIT 1
ON CONFLICT (resume_id, version_number) DO NOTHING;

INSERT INTO resume_versions (resume_id, user_id, version_number, title, sections, format, change_summary, created_at)
SELECT 
    1,
    user_id,
    3,
    'Software Engineer Resume',
    '{"summary": "Experienced software engineer with 5+ years in full-stack development. Specialized in React, Node.js, and cloud technologies. Passionate about building scalable applications.", "experience": [{"company": "Tech Corp", "title": "Senior Developer", "duration": "2020-Present", "achievements": ["Led team of 5 developers", "Improved performance by 40%", "Implemented CI/CD pipeline"]}], "skills": ["React", "Node.js", "AWS", "Docker", "Kubernetes"]}'::jsonb,
    'pdf',
    'Added skills section and updated summary with passion statement',
    NOW() - INTERVAL '10 days'
FROM resumes WHERE id = 1
LIMIT 1
ON CONFLICT (resume_id, version_number) DO NOTHING;

-- Demo Cover Letter Versions (for cover letter with title "Software Engineer Cover Letter")
-- Assuming we have a cover letter with id=1 for demo purposes
INSERT INTO cover_letter_versions (cover_letter_id, user_id, version_number, title, content, format, change_summary, created_at)
SELECT 
    1, -- cover_letter_id (adjust based on your actual cover letter)
    user_id,
    1,
    'Software Engineer Cover Letter',
    'Dear Hiring Manager,

I am writing to express my interest in the Software Engineer position at your company. I have 5 years of experience in software development and am excited about this opportunity.

Best regards,
[Your Name]',
    'pdf',
    'Initial version - Basic cover letter',
    NOW() - INTERVAL '25 days'
FROM uploaded_cover_letters WHERE id = 1
LIMIT 1
ON CONFLICT (cover_letter_id, version_number) DO NOTHING;

INSERT INTO cover_letter_versions (cover_letter_id, user_id, version_number, title, content, format, change_summary, created_at)
SELECT 
    1,
    user_id,
    2,
    'Software Engineer Cover Letter',
    'Dear Hiring Manager,

I am writing to express my strong interest in the Software Engineer position at your company. With 5 years of experience in full-stack development, I have a proven track record of building scalable applications using React, Node.js, and cloud technologies.

In my current role at Tech Corp, I led a team of 5 developers and improved application performance by 40%. I am excited about the opportunity to bring my expertise to your team.

Best regards,
[Your Name]',
    'pdf',
    'Expanded with specific achievements and technologies',
    NOW() - INTERVAL '15 days'
FROM uploaded_cover_letters WHERE id = 1
LIMIT 1
ON CONFLICT (cover_letter_id, version_number) DO NOTHING;

INSERT INTO cover_letter_versions (cover_letter_id, user_id, version_number, title, content, format, change_summary, created_at)
SELECT 
    1,
    user_id,
    3,
    'Software Engineer Cover Letter',
    'Dear Hiring Manager,

I am writing to express my strong interest in the Software Engineer position at your company. With 5 years of experience in full-stack development, I have a proven track record of building scalable applications using React, Node.js, and cloud technologies.

In my current role at Tech Corp, I led a team of 5 developers and improved application performance by 40%. I also implemented a CI/CD pipeline that reduced deployment time by 60%. I am particularly drawn to your company''s commitment to innovation and would be thrilled to contribute to your engineering team.

I am excited about the opportunity to discuss how my skills and experience align with your needs.

Best regards,
[Your Name]',
    'pdf',
    'Added CI/CD achievement and company-specific interest statement',
    NOW() - INTERVAL '5 days'
FROM uploaded_cover_letters WHERE id = 1
LIMIT 1
ON CONFLICT (cover_letter_id, version_number) DO NOTHING;

-- Verification
SELECT 
    '✅ Demo version data inserted!' AS Status,
    COUNT(*) FILTER (WHERE resume_id IS NOT NULL) AS resume_versions,
    COUNT(*) FILTER (WHERE cover_letter_id IS NOT NULL) AS cover_letter_versions
FROM (
    SELECT resume_id, NULL AS cover_letter_id FROM resume_versions
    UNION ALL
    SELECT NULL AS resume_id, cover_letter_id FROM cover_letter_versions
) AS combined;

