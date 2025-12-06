// Test mocks - import this in test files that need mocks
import { vi } from 'vitest';

// Sample data for mock responses
const mockJobData = {
  id: 1,
  user_id: 1,
  title: 'Software Engineer',
  company: 'Test Corp',
  location: 'Remote',
  status: 'Applied',
  deadline: '2024-12-31',
  salary_min: 100000,
  salary_max: 150000,
  description: 'Test job description',
  skills_required: ['JavaScript', 'React', 'Node.js'],
  role_type: 'Software Engineering',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  is_archived: false,
};

const mockUserData = {
  id: 1,
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  account_type: 'candidate',
  created_at: new Date().toISOString(),
};

const mockProfileData = {
  id: 1,
  user_id: 1,
  full_name: 'Test User',
  email: 'test@example.com',
  phone: '555-1234',
  location: 'New York, NY',
  title: 'Software Engineer',
  bio: 'Experienced developer',
  industry: 'Technology',
  experience: '5 years',
};

const mockSkillData = {
  id: 1,
  user_id: 1,
  name: 'JavaScript',
  category: 'Programming',
  proficiency: 'Advanced',
};

const mockEducationData = {
  id: 1,
  user_id: 1,
  institution: 'Test University',
  degree_type: 'Bachelor',
  field_of_study: 'Computer Science',
  graduation_date: '2020-05-15',
};

const mockEmploymentData = {
  id: 1,
  user_id: 1,
  title: 'Software Engineer',
  company: 'Previous Corp',
  start_date: '2020-06-01',
  end_date: '2023-12-01',
  description: 'Built web applications',
  is_current: false,
};

const mockProjectData = {
  id: 1,
  user_id: 1,
  name: 'Test Project',
  description: 'A test project',
  role: 'Lead Developer',
  start_date: '2023-01-01',
  end_date: '2023-06-01',
  technologies: ['React', 'Node.js'],
};

const mockCertificationData = {
  id: 1,
  user_id: 1,
  name: 'AWS Certified',
  organization: 'Amazon',
  date_earned: '2023-01-15',
  expiration_date: '2026-01-15',
};

const mockTeamData = {
  id: 1,
  name: 'Test Team',
  created_by: 1,
  created_at: new Date().toISOString(),
};

const mockTeamMemberData = {
  id: 1,
  team_id: 1,
  user_id: 1,
  role: 'mentor',
  joined_at: new Date().toISOString(),
};

const mockOfferData = {
  id: 1,
  user_id: 1,
  job_id: 1,
  salary: 120000,
  benefits: 'Health, 401k',
  status: 'pending',
  received_date: new Date().toISOString(),
};

const mockNetworkingData = {
  id: 1,
  user_id: 1,
  name: 'John Contact',
  company: 'Contact Corp',
  email: 'john@contact.com',
  relationship: 'Professional',
};

const mockInterviewData = {
  id: 1,
  user_id: 1,
  job_id: 1,
  interview_date: new Date().toISOString(),
  interview_type: 'Technical',
  notes: 'Good interview',
  outcome: 'Passed',
};

const mockCoverLetterData = {
  id: 1,
  user_id: 1,
  name: 'My Cover Letter',
  content: 'Dear Hiring Manager...',
  created_at: new Date().toISOString(),
};

const mockResumeData = {
  id: 1,
  user_id: 1,
  name: 'My Resume',
  file_path: '/uploads/resume.pdf',
  created_at: new Date().toISOString(),
};

const mockGoalData = {
  id: 1,
  user_id: 1,
  title: 'Get a new job',
  description: 'Find a software engineering role',
  target_date: '2024-06-01',
  status: 'in_progress',
};

const mockCompanyData = {
  id: 1,
  name: 'Test Company',
  industry: 'Technology',
  size: '1000-5000',
  website: 'https://testcompany.com',
};

const mockDashboardStats = {
  total_applications: 25,
  interviews_scheduled: 5,
  offers_received: 2,
  response_rate: 0.4,
};

// Smart query handler that returns appropriate mock data based on SQL pattern
const createSmartQueryHandler = () => {
  return vi.fn().mockImplementation((sql, params) => {
    const sqlLower = sql?.toLowerCase() || '';
    
    // INSERT queries - return the inserted row
    if (sqlLower.includes('insert into')) {
      if (sqlLower.includes('jobs')) return { rows: [{ ...mockJobData, ...(params?.[0] && { user_id: params[0] }) }], rowCount: 1 };
      if (sqlLower.includes('users')) return { rows: [{ ...mockUserData, id: params?.[0] || 1 }], rowCount: 1 };
      if (sqlLower.includes('profiles')) return { rows: [mockProfileData], rowCount: 1 };
      if (sqlLower.includes('skills')) return { rows: [mockSkillData], rowCount: 1 };
      if (sqlLower.includes('education')) return { rows: [mockEducationData], rowCount: 1 };
      if (sqlLower.includes('employment')) return { rows: [mockEmploymentData], rowCount: 1 };
      if (sqlLower.includes('projects')) return { rows: [mockProjectData], rowCount: 1 };
      if (sqlLower.includes('certifications')) return { rows: [mockCertificationData], rowCount: 1 };
      if (sqlLower.includes('teams')) return { rows: [mockTeamData], rowCount: 1 };
      if (sqlLower.includes('team_members')) return { rows: [mockTeamMemberData], rowCount: 1 };
      if (sqlLower.includes('offers')) return { rows: [mockOfferData], rowCount: 1 };
      if (sqlLower.includes('networking') || sqlLower.includes('contacts')) return { rows: [mockNetworkingData], rowCount: 1 };
      if (sqlLower.includes('interviews')) return { rows: [mockInterviewData], rowCount: 1 };
      if (sqlLower.includes('cover_letters')) return { rows: [mockCoverLetterData], rowCount: 1 };
      if (sqlLower.includes('resumes')) return { rows: [mockResumeData], rowCount: 1 };
      if (sqlLower.includes('goals')) return { rows: [mockGoalData], rowCount: 1 };
      if (sqlLower.includes('companies')) return { rows: [mockCompanyData], rowCount: 1 };
      return { rows: [{ id: 1 }], rowCount: 1 };
    }
    
    // UPDATE queries - return updated row
    if (sqlLower.includes('update')) {
      if (sqlLower.includes('jobs')) return { rows: [mockJobData], rowCount: 1 };
      if (sqlLower.includes('profiles')) return { rows: [mockProfileData], rowCount: 1 };
      if (sqlLower.includes('skills')) return { rows: [mockSkillData], rowCount: 1 };
      return { rows: [{ id: 1 }], rowCount: 1 };
    }
    
    // DELETE queries
    if (sqlLower.includes('delete')) {
      return { rows: [], rowCount: 1 };
    }
    
    // SELECT queries - return appropriate data
    if (sqlLower.includes('select')) {
      // Count queries
      if (sqlLower.includes('count(')) {
        return { rows: [{ count: '5' }], rowCount: 1 };
      }
      
      // Jobs
      if (sqlLower.includes('from jobs') || sqlLower.includes('from job')) {
        if (sqlLower.includes('where') && sqlLower.includes('id')) {
          return { rows: [mockJobData], rowCount: 1 };
        }
        return { rows: [mockJobData, { ...mockJobData, id: 2, title: 'Another Job' }], rowCount: 2 };
      }
      
      // Users
      if (sqlLower.includes('from users')) {
        return { rows: [mockUserData], rowCount: 1 };
      }
      
      // Profiles
      if (sqlLower.includes('from profiles') || sqlLower.includes('from profile')) {
        return { rows: [mockProfileData], rowCount: 1 };
      }
      
      // Skills
      if (sqlLower.includes('from skills')) {
        return { rows: [mockSkillData, { ...mockSkillData, id: 2, name: 'React' }], rowCount: 2 };
      }
      
      // Education
      if (sqlLower.includes('from education')) {
        return { rows: [mockEducationData], rowCount: 1 };
      }
      
      // Employment
      if (sqlLower.includes('from employment')) {
        return { rows: [mockEmploymentData], rowCount: 1 };
      }
      
      // Projects
      if (sqlLower.includes('from projects')) {
        return { rows: [mockProjectData], rowCount: 1 };
      }
      
      // Certifications
      if (sqlLower.includes('from certifications')) {
        return { rows: [mockCertificationData], rowCount: 1 };
      }
      
      // Teams
      if (sqlLower.includes('from teams') || sqlLower.includes('from team')) {
        return { rows: [mockTeamData], rowCount: 1 };
      }
      
      // Team members
      if (sqlLower.includes('from team_members')) {
        return { rows: [mockTeamMemberData], rowCount: 1 };
      }
      
      // Offers
      if (sqlLower.includes('from offers')) {
        return { rows: [mockOfferData], rowCount: 1 };
      }
      
      // Networking/Contacts
      if (sqlLower.includes('from networking') || sqlLower.includes('from contacts')) {
        return { rows: [mockNetworkingData], rowCount: 1 };
      }
      
      // Interviews
      if (sqlLower.includes('from interviews') || sqlLower.includes('from mock_interviews')) {
        return { rows: [mockInterviewData], rowCount: 1 };
      }
      
      // Cover letters
      if (sqlLower.includes('from cover_letters')) {
        return { rows: [mockCoverLetterData], rowCount: 1 };
      }
      
      // Resumes
      if (sqlLower.includes('from resumes')) {
        return { rows: [mockResumeData], rowCount: 1 };
      }
      
      // Goals
      if (sqlLower.includes('from goals')) {
        return { rows: [mockGoalData], rowCount: 1 };
      }
      
      // Companies
      if (sqlLower.includes('from companies')) {
        return { rows: [mockCompanyData], rowCount: 1 };
      }
      
      // Job descriptions
      if (sqlLower.includes('from job_descriptions')) {
        return { rows: [{ id: 1, user_id: 1, content: 'Job description content' }], rowCount: 1 };
      }
      
      // Cover letter templates
      if (sqlLower.includes('from cover_letter_templates')) {
        return { rows: [{ id: 1, name: 'Professional', content: 'Template content', category: 'formal' }], rowCount: 1 };
      }
      
      // Resume presets
      if (sqlLower.includes('from resume_presets')) {
        return { rows: [{ id: 1, user_id: 1, name: 'Default', section_order: ['education', 'experience'] }], rowCount: 1 };
      }
      
      // Section presets
      if (sqlLower.includes('from section_presets')) {
        return { rows: [{ id: 1, user_id: 1, section_name: 'summary', preset_name: 'Default', section_data: {} }], rowCount: 1 };
      }
      
      // Skill progress
      if (sqlLower.includes('from skill_progress')) {
        return { rows: [{ id: 1, user_id: 1, skill_id: 1, progress: 75, notes: 'Good progress' }], rowCount: 1 };
      }
      
      // Dashboard/Stats queries
      if (sqlLower.includes('status') && (sqlLower.includes('group by') || sqlLower.includes('count'))) {
        return { rows: [
          { status: 'Applied', count: '10' },
          { status: 'Interview', count: '5' },
          { status: 'Offer', count: '2' },
        ], rowCount: 3 };
      }
      
      // Default - return generic success
      return { rows: [{ id: 1 }], rowCount: 1 };
    }
    
    // Default fallback
    return { rows: [], rowCount: 0 };
  });
};

// Mock database pool with smart query handler
export const mockPool = {
  query: createSmartQueryHandler(),
  connect: vi.fn().mockResolvedValue({
    query: createSmartQueryHandler(),
    release: vi.fn(),
  }),
  end: vi.fn().mockResolvedValue(undefined),
  on: vi.fn(),
};

// Export mock data for use in tests
export const mockData = {
  job: mockJobData,
  user: mockUserData,
  profile: mockProfileData,
  skill: mockSkillData,
  education: mockEducationData,
  employment: mockEmploymentData,
  project: mockProjectData,
  certification: mockCertificationData,
  team: mockTeamData,
  teamMember: mockTeamMemberData,
  offer: mockOfferData,
  networking: mockNetworkingData,
  interview: mockInterviewData,
  coverLetter: mockCoverLetterData,
  resume: mockResumeData,
  goal: mockGoalData,
  company: mockCompanyData,
  dashboardStats: mockDashboardStats,
};

// Mock JWT
export const mockJWT = {
  verify: vi.fn((token, secret) => {
    // Accept any token that's not explicitly invalid
    if (token && token !== 'invalid-token' && token !== 'expired-token') {
      return { id: 1, email: 'test@example.com' };
    }
    if (token === 'expired-token') {
      const error = new Error('Token expired');
      error.name = 'TokenExpiredError';
      throw error;
    }
    throw new Error('Invalid token');
  }),
  sign: vi.fn((payload, secret) => 'mock-jwt-token'),
};

// Helper to create mock request
export const createMockRequest = (overrides = {}) => ({
  body: {},
  params: {},
  query: {},
  headers: {
    authorization: 'Bearer valid-token',
  },
  userId: 1,
  user: { id: 1, email: 'test@example.com' },
  ...overrides,
});

// Helper to create mock response
export const createMockResponse = () => {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    cookie: vi.fn().mockReturnThis(),
    clearCookie: vi.fn().mockReturnThis(),
  };
  return res;
};

// Helper to create mock next function
export const createMockNext = () => vi.fn();

// Reset mocks before each test
export const resetMocks = () => {
  vi.clearAllMocks();
  // Re-apply smart query handler
  mockPool.query = createSmartQueryHandler();
  mockPool.connect.mockResolvedValue({
    query: createSmartQueryHandler(),
    release: vi.fn(),
  });
  mockJWT.verify.mockImplementation((token, secret) => {
    // Accept any token that's not explicitly invalid
    if (token && token !== 'invalid-token' && token !== 'expired-token') {
      return { id: 1, email: 'test@example.com' };
    }
    if (token === 'expired-token') {
      const error = new Error('Token expired');
      error.name = 'TokenExpiredError';
      throw error;
    }
    throw new Error('Invalid token');
  });
  mockJWT.sign.mockImplementation((payload, secret) => 'mock-jwt-token');
};

// Helper to set custom mock response for specific query
export const setMockQueryResponse = (pattern, response) => {
  const originalHandler = mockPool.query;
  mockPool.query = vi.fn().mockImplementation((sql, params) => {
    if (sql?.toLowerCase().includes(pattern.toLowerCase())) {
      return Promise.resolve(response);
    }
    return originalHandler(sql, params);
  });
};

