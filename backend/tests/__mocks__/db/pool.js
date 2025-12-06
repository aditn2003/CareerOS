// Mock for db/pool.js - shared pool used by some routes
import { vi } from 'vitest';

// Sample data for mock responses
const mockJobData = {
  id: 1, user_id: 1, title: 'Software Engineer', company: 'Test Corp',
  location: 'Remote', status: 'Applied', deadline: '2024-12-31',
  salary_min: 100000, salary_max: 150000, description: 'Test job',
  skills_required: ['JavaScript', 'React'], role_type: 'Software Engineering',
  created_at: new Date().toISOString(), is_archived: false,
};

const mockProfileData = {
  id: 1, user_id: 1, full_name: 'Test User', email: 'test@example.com',
  phone: '555-1234', location: 'New York', title: 'Developer',
};

// Smart query handler
const createSmartQueryHandler = () => {
  return vi.fn().mockImplementation((sql, params) => {
    const sqlLower = sql?.toLowerCase() || '';
    
    if (sqlLower.includes('insert into')) {
      return Promise.resolve({ rows: [{ id: 1, ...params }], rowCount: 1 });
    }
    if (sqlLower.includes('update')) {
      return Promise.resolve({ rows: [{ id: 1 }], rowCount: 1 });
    }
    if (sqlLower.includes('delete')) {
      return Promise.resolve({ rows: [], rowCount: 1 });
    }
    if (sqlLower.includes('select')) {
      if (sqlLower.includes('count(')) return Promise.resolve({ rows: [{ count: '5' }], rowCount: 1 });
      if (sqlLower.includes('from jobs')) return Promise.resolve({ rows: [mockJobData], rowCount: 1 });
      if (sqlLower.includes('from profiles')) return Promise.resolve({ rows: [mockProfileData], rowCount: 1 });
      if (sqlLower.includes('from users')) return Promise.resolve({ rows: [{ id: 1, email: 'test@example.com', account_type: 'candidate' }], rowCount: 1 });
      if (sqlLower.includes('from teams')) return Promise.resolve({ rows: [{ id: 1, name: 'Test Team', created_by: 1 }], rowCount: 1 });
      if (sqlLower.includes('from team_members')) return Promise.resolve({ rows: [{ id: 1, team_id: 1, user_id: 1, role: 'mentor' }], rowCount: 1 });
      if (sqlLower.includes('from skills')) return Promise.resolve({ rows: [{ id: 1, name: 'JavaScript', user_id: 1 }], rowCount: 1 });
      if (sqlLower.includes('from education')) return Promise.resolve({ rows: [{ id: 1, institution: 'Test U', user_id: 1 }], rowCount: 1 });
      if (sqlLower.includes('from employment')) return Promise.resolve({ rows: [{ id: 1, company: 'Test Co', user_id: 1 }], rowCount: 1 });
      if (sqlLower.includes('from projects')) return Promise.resolve({ rows: [{ id: 1, name: 'Test Project', user_id: 1 }], rowCount: 1 });
      if (sqlLower.includes('from certifications')) return Promise.resolve({ rows: [{ id: 1, name: 'AWS', user_id: 1 }], rowCount: 1 });
      if (sqlLower.includes('from offers')) return Promise.resolve({ rows: [{ id: 1, job_id: 1, salary: 100000 }], rowCount: 1 });
      if (sqlLower.includes('from networking') || sqlLower.includes('from contacts')) return Promise.resolve({ rows: [{ id: 1, name: 'Contact', user_id: 1 }], rowCount: 1 });
      if (sqlLower.includes('from goals')) return Promise.resolve({ rows: [{ id: 1, title: 'Goal', user_id: 1 }], rowCount: 1 });
      if (sqlLower.includes('from cover_letters')) return Promise.resolve({ rows: [{ id: 1, name: 'CL', user_id: 1 }], rowCount: 1 });
      if (sqlLower.includes('from resumes')) return Promise.resolve({ rows: [{ id: 1, name: 'Resume', user_id: 1 }], rowCount: 1 });
      if (sqlLower.includes('from interviews') || sqlLower.includes('from mock_interviews')) return Promise.resolve({ rows: [{ id: 1, job_id: 1, user_id: 1 }], rowCount: 1 });
      if (sqlLower.includes('from companies')) return Promise.resolve({ rows: [{ id: 1, name: 'Company' }], rowCount: 1 });
      if (sqlLower.includes('status') && sqlLower.includes('group')) return Promise.resolve({ rows: [{ status: 'Applied', count: '5' }], rowCount: 1 });
      return Promise.resolve({ rows: [{ id: 1 }], rowCount: 1 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
};

// Export the smart mock pool as default
const mockPool = {
  query: createSmartQueryHandler(),
  connect: vi.fn().mockResolvedValue({
    query: createSmartQueryHandler(),
    release: vi.fn(),
  }),
  end: vi.fn().mockResolvedValue(undefined),
  on: vi.fn(),
};

export default mockPool;

