// backend/tests/vitest-setup.js
// Vitest setup file - runs before each test file

import { vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';

// Set Supabase environment variables for routes that create clients at import time
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'test-anon-key';

// ============================================
// MOCK DATA
// ============================================

export const mockJobData = {
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
  required_skills: ['JavaScript', 'React', 'Node.js'],
  role_type: 'Software Engineering',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  is_archived: false,
};

export const mockUserData = {
  id: 1,
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  password_hash: '$2a$10$abcdefghijklmnopqrstuvwxyz123456789', // bcrypt hash
  account_type: 'candidate',
  created_at: new Date().toISOString(),
};

export const mockProfileData = {
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

export const mockSkillData = {
  id: 1,
  user_id: 1,
  name: 'JavaScript',
  category: 'Programming',
  proficiency: 'Advanced',
};

export const mockEducationData = {
  id: 1,
  user_id: 1,
  institution: 'Test University',
  degree_type: 'Bachelor',
  field_of_study: 'Computer Science',
  graduation_date: '2020-05-15',
};

export const mockEmploymentData = {
  id: 1,
  user_id: 1,
  title: 'Software Engineer',
  company: 'Previous Corp',
  start_date: '2020-06-01',
  end_date: '2023-12-01',
  description: 'Built web applications',
  is_current: false,
};

export const mockProjectData = {
  id: 1,
  user_id: 1,
  name: 'Test Project',
  description: 'A test project',
  role: 'Lead Developer',
  start_date: '2023-01-01',
  end_date: '2023-06-01',
  technologies: ['React', 'Node.js'],
};

export const mockCertificationData = {
  id: 1,
  user_id: 1,
  name: 'AWS Certified',
  organization: 'Amazon',
  date_earned: '2023-01-15',
  expiration_date: '2026-01-15',
};

export const mockTeamData = {
  id: 1,
  name: 'Test Team',
  owner_id: 1,
  created_at: new Date().toISOString(),
};

export const mockTeamMemberData = {
  id: 1,
  team_id: 1,
  user_id: 1,
  role: 'admin',
  status: 'active',
  joined_at: new Date().toISOString(),
};

export const mockOfferData = {
  id: 1,
  user_id: 1,
  job_id: 1,
  salary: 120000,
  benefits: 'Health, 401k',
  status: 'pending',
  received_date: new Date().toISOString(),
};

export const mockNetworkingData = {
  id: 1,
  user_id: 1,
  name: 'John Contact',
  company: 'Contact Corp',
  email: 'john@contact.com',
  relationship: 'Professional',
};

export const mockInterviewData = {
  id: 1,
  user_id: 1,
  job_id: 1,
  interview_date: new Date().toISOString(),
  interview_type: 'Technical',
  notes: 'Good interview',
  outcome: 'Passed',
};

export const mockCoverLetterData = {
  id: 1,
  user_id: 1,
  name: 'My Cover Letter',
  content: 'Dear Hiring Manager...',
  created_at: new Date().toISOString(),
};

export const mockResumeData = {
  id: 1,
  user_id: 1,
  name: 'My Resume',
  file_path: '/uploads/resume.pdf',
  created_at: new Date().toISOString(),
};

export const mockGoalData = {
  id: 1,
  user_id: 1,
  title: 'Get a new job',
  description: 'Find a software engineering role',
  target_date: '2024-06-01',
  status: 'in_progress',
};

export const mockCompanyData = {
  id: 1,
  name: 'Test Company',
  industry: 'Technology',
  size: '1000-5000',
  website: 'https://testcompany.com',
};

// ============================================
// SMART QUERY HANDLER
// ============================================

export const createSmartQueryHandler = () => {
  return vi.fn().mockImplementation((sql, params) => {
    const sqlLower = sql?.toLowerCase() || '';
    
    // INSERT queries
    if (sqlLower.includes('insert into')) {
      if (sqlLower.includes('jobs')) return Promise.resolve({ rows: [mockJobData], rowCount: 1 });
      if (sqlLower.includes('users')) return Promise.resolve({ rows: [mockUserData], rowCount: 1 });
      if (sqlLower.includes('profiles')) return Promise.resolve({ rows: [mockProfileData], rowCount: 1 });
      if (sqlLower.includes('skills')) return Promise.resolve({ rows: [mockSkillData], rowCount: 1 });
      if (sqlLower.includes('education')) return Promise.resolve({ rows: [mockEducationData], rowCount: 1 });
      if (sqlLower.includes('employment')) return Promise.resolve({ rows: [mockEmploymentData], rowCount: 1 });
      if (sqlLower.includes('projects')) return Promise.resolve({ rows: [mockProjectData], rowCount: 1 });
      if (sqlLower.includes('certifications')) return Promise.resolve({ rows: [mockCertificationData], rowCount: 1 });
      if (sqlLower.includes('teams')) return Promise.resolve({ rows: [mockTeamData], rowCount: 1 });
      if (sqlLower.includes('team_members')) return Promise.resolve({ rows: [mockTeamMemberData], rowCount: 1 });
      if (sqlLower.includes('offers')) return Promise.resolve({ rows: [mockOfferData], rowCount: 1 });
      if (sqlLower.includes('networking') || sqlLower.includes('contacts')) return Promise.resolve({ rows: [mockNetworkingData], rowCount: 1 });
      if (sqlLower.includes('interviews') || sqlLower.includes('application_history')) return Promise.resolve({ rows: [mockInterviewData], rowCount: 1 });
      if (sqlLower.includes('cover_letters')) return Promise.resolve({ rows: [mockCoverLetterData], rowCount: 1 });
      if (sqlLower.includes('resumes')) return Promise.resolve({ rows: [mockResumeData], rowCount: 1 });
      if (sqlLower.includes('goals')) return Promise.resolve({ rows: [mockGoalData], rowCount: 1 });
      if (sqlLower.includes('companies')) return Promise.resolve({ rows: [mockCompanyData], rowCount: 1 });
      return Promise.resolve({ rows: [{ id: 1 }], rowCount: 1 });
    }
    
    // UPDATE queries
    if (sqlLower.includes('update')) {
      if (sqlLower.includes('jobs')) return Promise.resolve({ rows: [mockJobData], rowCount: 1 });
      if (sqlLower.includes('profiles')) return Promise.resolve({ rows: [mockProfileData], rowCount: 1 });
      if (sqlLower.includes('users')) return Promise.resolve({ rows: [mockUserData], rowCount: 1 });
      return Promise.resolve({ rows: [{ id: 1 }], rowCount: 1 });
    }
    
    // DELETE queries
    if (sqlLower.includes('delete')) {
      return Promise.resolve({ rows: [], rowCount: 1 });
    }
    
    // SELECT queries
    if (sqlLower.includes('select')) {
      if (sqlLower.includes('count(')) {
        return Promise.resolve({ rows: [{ count: '5' }], rowCount: 1 });
      }
      if (sqlLower.includes('from jobs')) return Promise.resolve({ rows: [mockJobData], rowCount: 1 });
      if (sqlLower.includes('from users')) return Promise.resolve({ rows: [mockUserData], rowCount: 1 });
      if (sqlLower.includes('from profiles')) return Promise.resolve({ rows: [mockProfileData], rowCount: 1 });
      if (sqlLower.includes('from skills')) return Promise.resolve({ rows: [mockSkillData], rowCount: 1 });
      if (sqlLower.includes('from education')) return Promise.resolve({ rows: [mockEducationData], rowCount: 1 });
      if (sqlLower.includes('from employment')) return Promise.resolve({ rows: [mockEmploymentData], rowCount: 1 });
      if (sqlLower.includes('from projects')) return Promise.resolve({ rows: [mockProjectData], rowCount: 1 });
      if (sqlLower.includes('from certifications')) return Promise.resolve({ rows: [mockCertificationData], rowCount: 1 });
      if (sqlLower.includes('from teams')) return Promise.resolve({ rows: [mockTeamData], rowCount: 1 });
      if (sqlLower.includes('from team_members')) return Promise.resolve({ rows: [mockTeamMemberData], rowCount: 1 });
      if (sqlLower.includes('from offers')) return Promise.resolve({ rows: [mockOfferData], rowCount: 1 });
      if (sqlLower.includes('from goals')) return Promise.resolve({ rows: [mockGoalData], rowCount: 1 });
      if (sqlLower.includes('from cover_letters')) return Promise.resolve({ rows: [mockCoverLetterData], rowCount: 1 });
      if (sqlLower.includes('from resumes')) return Promise.resolve({ rows: [mockResumeData], rowCount: 1 });
      if (sqlLower.includes('from companies')) return Promise.resolve({ rows: [mockCompanyData], rowCount: 1 });
      return Promise.resolve({ rows: [{ id: 1 }], rowCount: 1 });
    }
    
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
};

// ============================================
// MOCK POOL
// ============================================

export const mockPool = {
  query: createSmartQueryHandler(),
  connect: vi.fn().mockResolvedValue({
    query: createSmartQueryHandler(),
    release: vi.fn(),
  }),
  end: vi.fn().mockResolvedValue(undefined),
  on: vi.fn(),
};

// ============================================
// GLOBAL MOCKS
// ============================================

// Mock the database pool module
vi.mock('../db/pool.js', () => ({
  default: mockPool,
}));

// Mock jsonwebtoken
vi.mock('jsonwebtoken', () => ({
  default: {
    verify: vi.fn((token, secret) => {
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
    sign: vi.fn(() => 'mock-jwt-token'),
  },
  verify: vi.fn((token, secret) => {
    if (token && token !== 'invalid-token' && token !== 'expired-token') {
      return { id: 1, email: 'test@example.com' };
    }
    throw new Error('Invalid token');
  }),
  sign: vi.fn(() => 'mock-jwt-token'),
}));

// Mock bcryptjs
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('$2a$10$hashedpassword'),
    compare: vi.fn().mockResolvedValue(true),
  },
  hash: vi.fn().mockResolvedValue('$2a$10$hashedpassword'),
  compare: vi.fn().mockResolvedValue(true),
}));

// Mock Resend (email service) - must be a class for 'new Resend()'
// Hoist the mock function so it's available in the factory
const { mockSendEmail } = vi.hoisted(() => {
  return {
    mockSendEmail: vi.fn().mockResolvedValue({ data: { id: 'email-123' }, error: null }),
  };
});

vi.mock('resend', () => {
  class Resend {
    constructor(apiKey) {
      this.apiKey = apiKey || 'test-api-key';
      this.emails = {
        send: mockSendEmail,
      };
    }
  }
  
  return {
    Resend,
    default: Resend,
  };
});

// Mock nodemailer
vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn().mockReturnValue({
      sendMail: vi.fn().mockResolvedValue({ messageId: 'test-message-id' }),
    }),
  },
  createTransport: vi.fn().mockReturnValue({
    sendMail: vi.fn().mockResolvedValue({ messageId: 'test-message-id' }),
  }),
}));

// Mock Google Auth Library
// Mock Google Auth Library - OAuth2Client must be a class constructor
const { mockVerifyIdToken } = vi.hoisted(() => {
  return {
    mockVerifyIdToken: vi.fn().mockResolvedValue({
      getPayload: () => ({
        email: 'googleuser@gmail.com',
        given_name: 'Google',
        family_name: 'User',
      }),
    }),
  };
});

vi.mock('google-auth-library', () => {
  class OAuth2Client {
    constructor() {}
    verifyIdToken = mockVerifyIdToken;
  }
  
  return {
    OAuth2Client,
    default: { OAuth2Client },
  };
});

// Mock Puppeteer (for PDF generation)
vi.mock('puppeteer', () => ({
  default: {
    launch: vi.fn().mockResolvedValue({
      newPage: vi.fn().mockResolvedValue({
        setContent: vi.fn().mockResolvedValue(undefined),
        pdf: vi.fn().mockResolvedValue(Buffer.from('PDF content')),
        close: vi.fn().mockResolvedValue(undefined),
      }),
      close: vi.fn().mockResolvedValue(undefined),
    }),
  },
}));

// Mock Supabase Client with proper chaining support
vi.mock('@supabase/supabase-js', () => {
  // Create a chainable query builder that supports method chaining
  const createChainableQuery = () => {
    const chainable = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      like: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      contains: vi.fn().mockReturnThis(),
      containedBy: vi.fn().mockReturnThis(),
      rangeGt: vi.fn().mockReturnThis(),
      rangeGte: vi.fn().mockReturnThis(),
      rangeLt: vi.fn().mockReturnThis(),
      rangeLte: vi.fn().mockReturnThis(),
      rangeAdjacent: vi.fn().mockReturnThis(),
      overlaps: vi.fn().mockReturnThis(),
      textSearch: vi.fn().mockReturnThis(),
      match: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      filter: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      abortSignal: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      csv: vi.fn().mockReturnThis(),
      geojson: vi.fn().mockReturnThis(),
      explain: vi.fn().mockReturnThis(),
      rollback: vi.fn().mockReturnThis(),
      returns: vi.fn().mockReturnThis(),
      then: vi.fn(function(resolve) {
        return Promise.resolve({ data: [], error: null }).then(resolve);
      }),
    };
    
    // Make it thenable (Promise-like)
    chainable.then = vi.fn(function(resolve, reject) {
      return Promise.resolve({ data: [], error: null }).then(resolve, reject);
    });
    chainable.catch = vi.fn(function(reject) {
      return Promise.resolve({ data: [], error: null }).catch(reject);
    });
    
    return chainable;
  };

  const mockClient = {
    from: vi.fn(() => createChainableQuery()),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signInWithPassword: vi.fn().mockResolvedValue({ data: null, error: null }),
      signUp: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
  };

  return {
    createClient: vi.fn(() => mockClient),
  };
});

// Mock Google Generative AI (as a class for proper constructor support)
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: class {
    constructor() {}
    getGenerativeModel() {
      return {
        generateContent: vi.fn().mockResolvedValue({
          response: {
            text: () => 'AI generated content for testing',
          },
        }),
      };
    }
  },
}));

// Mock node-cron
vi.mock('node-cron', () => ({
  default: {
    schedule: vi.fn(),
  },
  schedule: vi.fn(),
}));

// ============================================
// HELPER FUNCTIONS
// ============================================

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

export const createMockResponse = () => {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    cookie: vi.fn().mockReturnThis(),
    clearCookie: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
    end: vi.fn().mockReturnThis(),
  };
  return res;
};

export const createMockNext = () => vi.fn();

// ============================================
// LIFECYCLE HOOKS
// ============================================

beforeEach(() => {
  vi.clearAllMocks();
  // Reset mock pool query handler
  mockPool.query = createSmartQueryHandler();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// Export all mock data
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
};

