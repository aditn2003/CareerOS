/**
 * Mock Factories
 * Provides factory functions to create mock data for common entities
 */

/**
 * Creates a mock user object
 * @param {Object} overrides - Properties to override
 * @returns {Object} Mock user object
 */
export function createMockUser(overrides = {}) {
  const id = overrides.id || Math.floor(Math.random() * 10000);
  
  return {
    id,
    email: overrides.email || `user${id}@example.com`,
    password_hash: overrides.password_hash || '$2a$10$hashedpassword',
    first_name: overrides.first_name || 'Test',
    last_name: overrides.last_name || 'User',
    provider: overrides.provider || 'local',
    created_at: overrides.created_at || new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Creates a mock profile object
 * @param {Object} overrides - Properties to override
 * @returns {Object} Mock profile object
 */
export function createMockProfile(overrides = {}) {
  const userId = overrides.user_id || Math.floor(Math.random() * 10000);
  
  return {
    id: overrides.id || Math.floor(Math.random() * 10000),
    user_id: userId,
    full_name: overrides.full_name || 'Test User',
    email: overrides.email || `user${userId}@example.com`,
    phone: overrides.phone || '+1234567890',
    location: overrides.location || 'San Francisco, CA',
    title: overrides.title || 'Software Engineer',
    bio: overrides.bio || 'Test bio',
    industry: overrides.industry || 'Technology',
    experience: overrides.experience || 'Mid-level',
    picture_url: overrides.picture_url || null,
    created_at: overrides.created_at || new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Creates a mock job object
 * @param {Object} overrides - Properties to override
 * @returns {Object} Mock job object
 */
export function createMockJob(overrides = {}) {
  const userId = overrides.user_id || Math.floor(Math.random() * 10000);
  
  return {
    id: overrides.id || Math.floor(Math.random() * 10000),
    user_id: userId,
    title: overrides.title || 'Software Engineer',
    company: overrides.company || 'Tech Company',
    location: overrides.location || 'San Francisco, CA',
    salary_min: overrides.salary_min || 100000,
    salary_max: overrides.salary_max || 150000,
    url: overrides.url || 'https://example.com/job',
    deadline: overrides.deadline || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    description: overrides.description || 'Job description',
    industry: overrides.industry || 'Technology',
    type: overrides.type || 'Full-time',
    status: overrides.status || 'Interested',
    notes: overrides.notes || null,
    contact_name: overrides.contact_name || null,
    contact_email: overrides.contact_email || null,
    contact_phone: overrides.contact_phone || null,
    created_at: overrides.created_at || new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Creates a mock resume object
 * @param {Object} overrides - Properties to override
 * @returns {Object} Mock resume object
 */
export function createMockResume(overrides = {}) {
  const userId = overrides.user_id || Math.floor(Math.random() * 10000);
  
  return {
    id: overrides.id || Math.floor(Math.random() * 10000),
    user_id: userId,
    name: overrides.name || 'My Resume',
    content: overrides.content || JSON.stringify({ sections: [] }),
    template_name: overrides.template_name || 'professional',
    format: overrides.format || 'pdf',
    file_url: overrides.file_url || null,
    preview_url: overrides.preview_url || null,
    created_at: overrides.created_at || new Date().toISOString(),
    updated_at: overrides.updated_at || new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Creates a mock education object
 * @param {Object} overrides - Properties to override
 * @returns {Object} Mock education object
 */
export function createMockEducation(overrides = {}) {
  const userId = overrides.user_id || Math.floor(Math.random() * 10000);
  
  return {
    id: overrides.id || Math.floor(Math.random() * 10000),
    user_id: userId,
    institution: overrides.institution || 'Test University',
    degree_type: overrides.degree_type || 'Bachelor',
    field_of_study: overrides.field_of_study || 'Computer Science',
    graduation_date: overrides.graduation_date || '2020-05-01',
    currently_enrolled: overrides.currently_enrolled || false,
    education_level: overrides.education_level || 'Bachelor',
    gpa: overrides.gpa || 3.5,
    gpa_private: overrides.gpa_private || false,
    honors: overrides.honors || null,
    created_at: overrides.created_at || new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Creates a mock employment object
 * @param {Object} overrides - Properties to override
 * @returns {Object} Mock employment object
 */
export function createMockEmployment(overrides = {}) {
  const userId = overrides.user_id || Math.floor(Math.random() * 10000);
  
  return {
    id: overrides.id || Math.floor(Math.random() * 10000),
    user_id: userId,
    title: overrides.title || 'Software Engineer',
    company: overrides.company || 'Tech Company',
    location: overrides.location || 'San Francisco, CA',
    start_date: overrides.start_date || '2020-01-01',
    end_date: overrides.end_date || null,
    current: overrides.current !== undefined ? overrides.current : true,
    description: overrides.description || 'Worked on software development',
    created_at: overrides.created_at || new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Creates a mock skill object
 * @param {Object} overrides - Properties to override
 * @returns {Object} Mock skill object
 */
export function createMockSkill(overrides = {}) {
  const userId = overrides.user_id || Math.floor(Math.random() * 10000);
  
  return {
    id: overrides.id || Math.floor(Math.random() * 10000),
    user_id: userId,
    name: overrides.name || 'JavaScript',
    category: overrides.category || 'Technical',
    proficiency: overrides.proficiency || 'Advanced',
    created_at: overrides.created_at || new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Creates a mock project object
 * @param {Object} overrides - Properties to override
 * @returns {Object} Mock project object
 */
export function createMockProject(overrides = {}) {
  const userId = overrides.user_id || Math.floor(Math.random() * 10000);
  
  return {
    id: overrides.id || Math.floor(Math.random() * 10000),
    user_id: userId,
    name: overrides.name || 'Test Project',
    description: overrides.description || 'Project description',
    role: overrides.role || 'Developer',
    start_date: overrides.start_date || '2023-01-01',
    end_date: overrides.end_date || null,
    technologies: overrides.technologies || ['JavaScript', 'React'],
    repository_link: overrides.repository_link || null,
    team_size: overrides.team_size || null,
    collaboration_details: overrides.collaboration_details || null,
    outcomes: overrides.outcomes || null,
    industry: overrides.industry || null,
    project_type: overrides.project_type || null,
    media_url: overrides.media_url || null,
    status: overrides.status || 'Completed',
    created_at: overrides.created_at || new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Creates a mock certification object
 * @param {Object} overrides - Properties to override
 * @returns {Object} Mock certification object
 */
export function createMockCertification(overrides = {}) {
  const userId = overrides.user_id || Math.floor(Math.random() * 10000);
  
  return {
    id: overrides.id || Math.floor(Math.random() * 10000),
    user_id: userId,
    name: overrides.name || 'Test Certification',
    organization: overrides.organization || 'Test Org',
    category: overrides.category || 'Technology',
    cert_number: overrides.cert_number || null,
    date_earned: overrides.date_earned || '2023-01-01',
    expiration_date: overrides.expiration_date || null,
    does_not_expire: overrides.does_not_expire || false,
    document_url: overrides.document_url || null,
    verified: overrides.verified || false,
    renewal_reminder: overrides.renewal_reminder || null,
    created_at: overrides.created_at || new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Creates a mock company research object
 * @param {Object} overrides - Properties to override
 * @returns {Object} Mock company research object
 */
export function createMockCompanyResearch(overrides = {}) {
  return {
    id: overrides.id || Math.floor(Math.random() * 10000),
    company: overrides.company || 'Tech Company',
    basics: overrides.basics || { industry: 'Technology', size: '1000-5000' },
    mission_values_culture: overrides.mission_values_culture || { mission: 'Test mission' },
    executives: overrides.executives || [],
    products_services: overrides.products_services || [],
    competitive_landscape: overrides.competitive_landscape || {},
    summary: overrides.summary || 'Company summary',
    news: overrides.news || [],
    created_at: overrides.created_at || new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Creates multiple mock objects using a factory function
 * @param {Function} factory - Factory function to use
 * @param {number} count - Number of objects to create
 * @param {Object} baseOverrides - Base overrides for all objects
 * @returns {Array} Array of mock objects
 */
export function createMultiple(factory, count, baseOverrides = {}) {
  return Array.from({ length: count }, (_, index) => 
    factory({ ...baseOverrides, id: baseOverrides.id || index + 1 })
  );
}

export default {
  createMockUser,
  createMockProfile,
  createMockJob,
  createMockResume,
  createMockEducation,
  createMockEmployment,
  createMockSkill,
  createMockProject,
  createMockCertification,
  createMockCompanyResearch,
  createMultiple,
};

