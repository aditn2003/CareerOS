-- ======================================
-- Add Test Cover Letters for Multiple Jobs
-- These cover letters have user_id = NULL so any user can access them
-- ======================================

-- First, remove any existing test cover letters with the same names (optional cleanup)
DELETE FROM cover_letter_templates 
WHERE user_id IS NULL 
  AND name IN (
    'Data Analyst - Tech Industry',
    'Product Manager - SaaS',
    'UX Designer - E-commerce',
    'DevOps Engineer - Cloud Infrastructure'
  );

-- Insert test cover letters into cover_letter_templates table
-- Note: user_id is NULL to make them accessible to all users

INSERT INTO cover_letter_templates 
    (user_id, name, industry, category, content, is_custom, view_count, use_count)
VALUES
    (
        NULL,  -- NULL user_id = accessible to all users
        'Data Analyst - Tech Industry',
        'Data Analytics',
        'Professional',
        'Dear Hiring Manager,

I am writing to express my strong interest in the Data Analyst position at your company. With a proven track record in data analysis, statistical modeling, and business intelligence, I am excited about the opportunity to contribute to your data-driven decision-making processes.

In my previous role, I have successfully:
• Analyzed large datasets using SQL, Python, and R to identify key business insights
• Created comprehensive dashboards and reports that informed strategic decisions
• Developed predictive models that improved forecasting accuracy by 25%
• Collaborated with cross-functional teams to translate data insights into actionable recommendations

I am particularly drawn to your company''s commitment to leveraging data for innovation. My expertise in data visualization tools such as Tableau and Power BI, combined with my strong analytical skills, would enable me to make meaningful contributions to your team.

I am eager to discuss how my background in data analysis and passion for turning data into insights can benefit your organization. Thank you for considering my application.

Sincerely,
[Your Name]',
        FALSE,
        0,
        0
    ),
    (
        NULL,  -- NULL user_id = accessible to all users
        'Product Manager - SaaS',
        'Product Management',
        'Strategic',
        'Dear Product Team,

I am thrilled to apply for the Product Manager position at your company. With over five years of experience in product management, I have successfully led product initiatives from conception to launch, driving user engagement and revenue growth.

My key achievements include:
• Launched three major product features that increased user retention by 40%
• Managed product roadmaps for cross-functional teams of 15+ members
• Conducted extensive user research and A/B testing to optimize product features
• Collaborated with engineering, design, and marketing teams to deliver products on time and within budget

I am particularly excited about your company''s innovative approach to product development and your focus on user-centric design. My experience with agile methodologies, product analytics tools, and stakeholder management would allow me to make an immediate impact.

I would welcome the opportunity to discuss how my product management expertise and passion for building great products can contribute to your team''s success.

Best regards,
[Your Name]',
        FALSE,
        0,
        0
    ),
    (
        NULL,  -- NULL user_id = accessible to all users
        'UX Designer - E-commerce',
        'User Experience Design',
        'Creative',
        'Dear Design Team,

I am writing to express my enthusiasm for the UX Designer position at your company. As a user experience designer with a passion for creating intuitive and engaging digital experiences, I am excited about the opportunity to contribute to your design team.

Throughout my career, I have:
• Designed user interfaces for web and mobile applications used by over 1 million users
• Conducted user research, usability testing, and created user personas to inform design decisions
• Collaborated closely with product managers and developers to ensure design feasibility
• Created wireframes, prototypes, and high-fidelity designs using Figma, Sketch, and Adobe XD
• Improved user satisfaction scores by 35% through iterative design improvements

I am particularly drawn to your company''s commitment to user-centered design and innovation. My experience in e-commerce design, combined with my understanding of user psychology and design principles, would enable me to create experiences that delight users and drive business results.

I would love to discuss how my design skills and user-focused approach can help elevate your product experiences.

Warm regards,
[Your Name]',
        FALSE,
        0,
        0
    ),
    (
        NULL,  -- NULL user_id = accessible to all users
        'DevOps Engineer - Cloud Infrastructure',
        'DevOps & Cloud',
        'Technical',
        'Dear Engineering Team,

I am writing to apply for the DevOps Engineer position at your company. With extensive experience in cloud infrastructure, CI/CD pipelines, and infrastructure as code, I am excited about the opportunity to help scale your engineering operations.

My technical expertise includes:
• Designing and implementing cloud infrastructure on AWS, Azure, and GCP
• Building and maintaining CI/CD pipelines using Jenkins, GitLab CI, and GitHub Actions
• Automating infrastructure deployment using Terraform, Ansible, and Kubernetes
• Monitoring and optimizing system performance, reducing deployment time by 60%
• Implementing security best practices and compliance requirements

I am particularly interested in your company''s cloud-native approach and commitment to automation. My experience with containerization, microservices architecture, and infrastructure automation would allow me to contribute to your team''s efficiency and scalability goals.

I am eager to discuss how my DevOps expertise and passion for automation can help streamline your engineering processes and improve system reliability.

Sincerely,
[Your Name]',
        FALSE,
        0,
        0
    );

-- Verify the insertions
SELECT 
    id,
    name,
    industry,
    category,
    CASE 
        WHEN user_id IS NULL THEN 'Global (All Users)'
        ELSE 'User-Specific'
    END AS access_type,
    is_custom,
    created_at
FROM cover_letter_templates
WHERE user_id IS NULL
ORDER BY created_at DESC
LIMIT 10;

