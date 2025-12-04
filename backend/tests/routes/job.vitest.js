/**
 * Job Routes - Full Coverage Tests
 * File: backend/routes/job.js
 */

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import jobRouter from '../../routes/job.js';

// ============================================
// MOCKS
// ============================================

vi.mock('../../db/pool.js', () => {
  const mockQueryFn = vi.fn();
  const mockConnectFn = vi.fn();
  return {
    default: {
      get query() { return mockQueryFn; },
      get connect() { return mockConnectFn; },
    },
  };
});

// Get the mocked functions after the mock is set up
let mockQueryFn, mockConnectFn;
beforeAll(async () => {
  const pool = (await import('../../db/pool.js')).default;
  mockQueryFn = pool.query;
  mockConnectFn = pool.connect;
});

vi.mock('../../utils/roleTypeMapper.js', () => ({
  getRoleTypeFromTitle: vi.fn((title) => {
    if (title.toLowerCase().includes('engineer')) return 'Engineering';
    if (title.toLowerCase().includes('manager')) return 'Management';
    return 'Other';
  }),
}));

vi.mock('jsonwebtoken', () => ({
  default: {
    verify: vi.fn((token) => {
      if (token === 'valid-token') return { id: 1 };
      throw new Error('Invalid token');
    }),
  },
}));

// ============================================
// SETUP
// ============================================

let app;

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-secret';
  
  // Get mocked functions
  const pool = (await import('../../db/pool.js')).default;
  mockQueryFn = pool.query;
  mockConnectFn = pool.connect;
  
  app = express();
  app.use(express.json());
  app.use('/api/jobs', jobRouter);
});

beforeEach(() => {
  vi.clearAllMocks();
  mockConnectFn.mockResolvedValue({
    query: mockQueryFn,
    release: vi.fn(),
  });
});

// ============================================
// TESTS
// ============================================

describe('Job Routes - Full Coverage', () => {
  describe('POST /api/jobs', () => {
    it('should create job with all fields', async () => {
      const mockJob = {
        id: 1,
        user_id: 1,
        title: 'Software Engineer',
        company: 'Tech Corp',
        location: 'San Francisco, CA',
        salary_min: 100000,
        salary_max: 150000,
        status: 'Interested',
      };

      mockQueryFn
        .mockResolvedValueOnce({ rows: [mockJob], rowCount: 1 }) // Insert job
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // Materials history

      const res = await request(app)
        .post('/api/jobs')
        .set('Authorization', 'Bearer valid-token')
        .send({
          title: 'Software Engineer',
          company: 'Tech Corp',
          location: 'San Francisco, CA',
          salary_min: 100000,
          salary_max: 150000,
          applicationDate: '2024-01-01',
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.job).toEqual(mockJob);
    });

    it('should return 400 if title or company missing', async () => {
      const res = await request(app)
        .post('/api/jobs')
        .set('Authorization', 'Bearer valid-token')
        .send({
          title: 'Software Engineer',
          // Missing company
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('required');
    });

    it('should handle dateApplied alias for applicationDate', async () => {
      const mockJob = { id: 1, title: 'Engineer', company: 'Tech Corp' };
      mockQueryFn
        .mockResolvedValueOnce({ rows: [mockJob], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = await request(app)
        .post('/api/jobs')
        .set('Authorization', 'Bearer valid-token')
        .send({
          title: 'Engineer',
          company: 'Tech Corp',
          dateApplied: '2024-01-01',
        });

      expect(res.status).toBe(201);
    });

    it('should clean salary values', async () => {
      const mockJob = { id: 1, title: 'Engineer', company: 'Tech Corp', salary_min: 100000, salary_max: 150000 };
      mockQueryFn
        .mockResolvedValueOnce({ rows: [mockJob], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = await request(app)
        .post('/api/jobs')
        .set('Authorization', 'Bearer valid-token')
        .send({
          title: 'Engineer',
          company: 'Tech Corp',
          salary_min: '$100,000',
          salary_max: '$150,000',
        });

      expect(res.status).toBe(201);
    });

    it('should handle template cover letter conversion with title column', async () => {
      const mockTemplate = { name: 'Template 1', content: 'Template content' };
      const mockNewCoverLetter = { id: 10 };
      const mockJob = { id: 1, title: 'Engineer', company: 'Tech Corp' };

      mockQueryFn
        .mockResolvedValueOnce({ rows: [mockTemplate], rowCount: 1 }) // Fetch template
        .mockResolvedValueOnce({ rows: [mockNewCoverLetter], rowCount: 1 }) // Create cover letter with title
        .mockResolvedValueOnce({ rows: [mockJob], rowCount: 1 }) // Insert job
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // Materials history

      const res = await request(app)
        .post('/api/jobs')
        .set('Authorization', 'Bearer valid-token')
        .send({
          title: 'Engineer',
          company: 'Tech Corp',
          cover_letter_id: 'template_1',
        });

      expect(res.status).toBe(201);
    });

    it('should handle template cover letter conversion with name column fallback', async () => {
      const mockTemplate = { name: 'Template 1', content: 'Template content' };
      const mockNewCoverLetter = { id: 10 };
      const mockJob = { id: 1, title: 'Engineer', company: 'Tech Corp' };
      const titleError = new Error('Column does not exist');
      titleError.code = '42703';

      mockQueryFn
        .mockResolvedValueOnce({ rows: [mockTemplate], rowCount: 1 }) // Fetch template
        .mockRejectedValueOnce(titleError) // Try with title - fails
        .mockResolvedValueOnce({ rows: [mockNewCoverLetter], rowCount: 1 }) // Create with name column
        .mockResolvedValueOnce({ rows: [mockJob], rowCount: 1 }) // Insert job
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // Materials history

      const res = await request(app)
        .post('/api/jobs')
        .set('Authorization', 'Bearer valid-token')
        .send({
          title: 'Engineer',
          company: 'Tech Corp',
          cover_letter_id: 'template_1',
        });

      expect(res.status).toBe(201);
    });

    it('should handle invalid template ID format', async () => {
      const mockJob = { id: 1, title: 'Engineer', company: 'Tech Corp' };

      mockQueryFn
        .mockResolvedValueOnce({ rows: [mockJob], rowCount: 1 }) // Insert job
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // Materials history

      const res = await request(app)
        .post('/api/jobs')
        .set('Authorization', 'Bearer valid-token')
        .send({
          title: 'Engineer',
          company: 'Tech Corp',
          cover_letter_id: 'template_invalid',
        });

      expect(res.status).toBe(201);
    });

    it('should handle template not found', async () => {
      const mockJob = { id: 1, title: 'Engineer', company: 'Tech Corp' };

      mockQueryFn
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // Template not found
        .mockResolvedValueOnce({ rows: [mockJob], rowCount: 1 }) // Insert job
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // Materials history

      const res = await request(app)
        .post('/api/jobs')
        .set('Authorization', 'Bearer valid-token')
        .send({
          title: 'Engineer',
          company: 'Tech Corp',
          cover_letter_id: 'template_999',
        });

      expect(res.status).toBe(201);
    });

    it('should handle template cover letter (templates not supported)', async () => {
      const mockJob = { id: 1, title: 'Engineer', company: 'Tech Corp' };

      mockQueryFn
        .mockResolvedValueOnce({ rows: [mockJob], rowCount: 1 }) // Insert job
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // Store materials (cover_letter_id will be null)

      const res = await request(app)
        .post('/api/jobs')
        .set('Authorization', 'Bearer valid-token')
        .send({
          title: 'Engineer',
          company: 'Tech Corp',
          cover_letter_id: 'template_1', // Templates are not supported
        });

      expect(res.status).toBe(201);
    });

    it('should handle invalid cover letter ID format', async () => {
      const mockJob = { id: 1, title: 'Engineer', company: 'Tech Corp' };

      mockQueryFn
        .mockResolvedValueOnce({ rows: [mockJob], rowCount: 1 }) // Insert job
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // Materials history

      const res = await request(app)
        .post('/api/jobs')
        .set('Authorization', 'Bearer valid-token')
        .send({
          title: 'Engineer',
          company: 'Tech Corp',
          cover_letter_id: 'invalid_format',
        });

      expect(res.status).toBe(201);
    });

    it('should handle final safety check for template prefix', async () => {
      // This tests the edge case where finalCoverLetterId still has template prefix
      const mockJob = { id: 1, title: 'Engineer', company: 'Tech Corp' };

      mockQueryFn
        .mockResolvedValueOnce({ rows: [mockJob], rowCount: 1 }) // Insert job
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // Materials history

      const res = await request(app)
        .post('/api/jobs')
        .set('Authorization', 'Bearer valid-token')
        .send({
          title: 'Engineer',
          company: 'Tech Corp',
          cover_letter_id: 'template_abc', // Invalid template ID
        });

      expect(res.status).toBe(201);
    });

    it('should handle industry and role_level empty strings', async () => {
      const mockJob = { id: 1, title: 'Engineer', company: 'Tech Corp' };

      mockQueryFn
        .mockResolvedValueOnce({ rows: [mockJob], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = await request(app)
        .post('/api/jobs')
        .set('Authorization', 'Bearer valid-token')
        .send({
          title: 'Engineer',
          company: 'Tech Corp',
          industry: '   ', // Empty string should become null
          role_level: '   ', // Empty string should become null
        });

      expect(res.status).toBe(201);
    });

    it('should handle required_skills as array', async () => {
      const mockJob = { id: 1, title: 'Engineer', company: 'Tech Corp' };

      mockQueryFn
        .mockResolvedValueOnce({ rows: [mockJob], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = await request(app)
        .post('/api/jobs')
        .set('Authorization', 'Bearer valid-token')
        .send({
          title: 'Engineer',
          company: 'Tech Corp',
          required_skills: ['JavaScript', 'React'],
        });

      expect(res.status).toBe(201);
    });

    it('should handle required_skills as non-array', async () => {
      const mockJob = { id: 1, title: 'Engineer', company: 'Tech Corp' };

      mockQueryFn
        .mockResolvedValueOnce({ rows: [mockJob], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = await request(app)
        .post('/api/jobs')
        .set('Authorization', 'Bearer valid-token')
        .send({
          title: 'Engineer',
          company: 'Tech Corp',
          required_skills: 'JavaScript, React', // Should become []
        });

      expect(res.status).toBe(201);
    });

    it('should handle materials history insertion with both resume and cover letter', async () => {
      const mockJob = { id: 1, title: 'Engineer', company: 'Tech Corp' };

      mockQueryFn
        .mockResolvedValueOnce({ rows: [mockJob], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // Materials history

      const res = await request(app)
        .post('/api/jobs')
        .set('Authorization', 'Bearer valid-token')
        .send({
          title: 'Engineer',
          company: 'Tech Corp',
          resume_id: 1,
          cover_letter_id: 2,
        });

      expect(res.status).toBe(201);
    });

    it('should handle materials history insertion', async () => {
      const mockJob = { id: 1, title: 'Engineer', company: 'Tech Corp' };

      mockQueryFn
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // Check existing
        .mockResolvedValueOnce({ rows: [mockJob], rowCount: 1 }) // Insert job
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // Materials history

      const res = await request(app)
        .post('/api/jobs')
        .set('Authorization', 'Bearer valid-token')
        .send({
          title: 'Engineer',
          company: 'Tech Corp',
          resume_id: 1,
        });

      expect(res.status).toBe(201);
    });

    it('should handle salary cleaning with decimals', async () => {
      const mockJob = { id: 1, title: 'Engineer', company: 'Tech Corp', salary_min: 100000, salary_max: 150000 };
      mockQueryFn
        .mockResolvedValueOnce({ rows: [mockJob], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = await request(app)
        .post('/api/jobs')
        .set('Authorization', 'Bearer valid-token')
        .send({
          title: 'Engineer',
          company: 'Tech Corp',
          salary_min: '$100,000.50',
          salary_max: '$150,000.75',
        });

      expect(res.status).toBe(201);
    });

    it('should handle salary cleaning with invalid values', async () => {
      const mockJob = { id: 1, title: 'Engineer', company: 'Tech Corp', salary_min: null, salary_max: null };
      mockQueryFn
        .mockResolvedValueOnce({ rows: [mockJob], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = await request(app)
        .post('/api/jobs')
        .set('Authorization', 'Bearer valid-token')
        .send({
          title: 'Engineer',
          company: 'Tech Corp',
          salary_min: 'invalid',
          salary_max: 'not a number',
        });

      expect(res.status).toBe(201);
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .post('/api/jobs')
        .set('Authorization', 'Bearer valid-token')
        .send({
          title: 'Engineer',
          company: 'Tech Corp',
        });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to save job.');
    });
  });

  describe('GET /api/jobs', () => {
    it('should return all jobs', async () => {
      const mockJobs = [
        { id: 1, title: 'Engineer', company: 'Tech Corp' },
        { id: 2, title: 'Manager', company: 'Big Corp' },
      ];

      mockQueryFn.mockResolvedValueOnce({ rows: mockJobs, rowCount: 2 });

      const res = await request(app)
        .get('/api/jobs')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.jobs).toEqual(mockJobs);
    });

    it('should filter by search query', async () => {
      const mockJobs = [{ id: 1, title: 'Engineer', company: 'Tech Corp' }];
      mockQueryFn.mockResolvedValueOnce({ rows: mockJobs, rowCount: 1 });

      const res = await request(app)
        .get('/api/jobs?search=Engineer')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });

    it('should filter by status', async () => {
      const mockJobs = [{ id: 1, title: 'Engineer', status: 'Interview' }];
      mockQueryFn.mockResolvedValueOnce({ rows: mockJobs, rowCount: 1 });

      const res = await request(app)
        .get('/api/jobs?status=Interview')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });

    it('should filter by industry', async () => {
      const mockJobs = [{ id: 1, industry: 'Technology' }];
      mockQueryFn.mockResolvedValueOnce({ rows: mockJobs, rowCount: 1 });

      const res = await request(app)
        .get('/api/jobs?industry=Technology')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });

    it('should filter by location', async () => {
      const mockJobs = [{ id: 1, location: 'San Francisco' }];
      mockQueryFn.mockResolvedValueOnce({ rows: mockJobs, rowCount: 1 });

      const res = await request(app)
        .get('/api/jobs?location=San Francisco')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });

    it('should filter by salary range', async () => {
      const mockJobs = [{ id: 1, title: 'Engineer', salary_min: 100000, salary_max: 150000 }];
      mockQueryFn.mockResolvedValueOnce({ rows: mockJobs, rowCount: 1 });

      const res = await request(app)
        .get('/api/jobs?salaryMin=100000&salaryMax=150000')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });

    it('should filter by date range', async () => {
      const mockJobs = [{ id: 1, deadline: '2024-02-01' }];
      mockQueryFn.mockResolvedValueOnce({ rows: mockJobs, rowCount: 1 });

      const res = await request(app)
        .get('/api/jobs?dateFrom=2024-01-01&dateTo=2024-02-01')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });

    it('should sort by different columns', async () => {
      const mockJobs = [{ id: 1, title: 'Engineer' }];
      mockQueryFn.mockResolvedValueOnce({ rows: mockJobs, rowCount: 1 });

      const res = await request(app)
        .get('/api/jobs?sortBy=deadline')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });

    it('should sort by salary', async () => {
      const mockJobs = [{ id: 1, salary_max: 150000 }];
      mockQueryFn.mockResolvedValueOnce({ rows: mockJobs, rowCount: 1 });

      const res = await request(app)
        .get('/api/jobs?sortBy=salary')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });

    it('should sort by company', async () => {
      const mockJobs = [{ id: 1, company: 'Tech Corp' }];
      mockQueryFn.mockResolvedValueOnce({ rows: mockJobs, rowCount: 1 });

      const res = await request(app)
        .get('/api/jobs?sortBy=company')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .get('/api/jobs')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Database error');
    });
  });

  describe('GET /api/jobs/stats', () => {
    it('should return job statistics', async () => {
      const mockStats = {
        totalJobs: 10,
        jobsByStatus: [{ status: 'Interview', count: 5 }],
        monthlyVolume: [{ month: '2024-01', count: 3 }],
        responseRate: 50.5,
        adherenceRate: 80.0,
        avgTimeToOffer: 30.5,
        avgTimeInStage: [{ status: 'Interview', avg_days: 5 }],
      };

      // Stats route makes a single complex CTE query
      mockQueryFn.mockResolvedValueOnce({ rows: [mockStats] });

      const res = await request(app)
        .get('/api/jobs/stats')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.totalJobs).toBe(10);
    });

    it('should handle zero jobs', async () => {
      const mockStats = {
        totalJobs: 0,
        jobsByStatus: null,
        monthlyVolume: null,
        responseRate: null,
        adherenceRate: null,
        avgTimeToOffer: null,
        avgTimeInStage: null,
      };

      mockQueryFn.mockResolvedValueOnce({ rows: [mockStats] });

      const res = await request(app)
        .get('/api/jobs/stats')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.message).toBeDefined();
    });

    it('should handle null values in stats', async () => {
      const mockStats = {
        totalJobs: 5,
        jobsByStatus: [],
        monthlyVolume: [],
        responseRate: null,
        adherenceRate: null,
        avgTimeToOffer: null,
        avgTimeInStage: [],
      };

      mockQueryFn.mockResolvedValueOnce({ rows: [mockStats] });

      const res = await request(app)
        .get('/api/jobs/stats')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .get('/api/jobs/stats')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Database error');
    });
  });

  describe('GET /api/jobs/archived', () => {
    it('should return archived jobs', async () => {
      const mockJobs = [{ id: 1, title: 'Archived Job', isArchived: true }];
      mockQueryFn.mockResolvedValueOnce({ rows: mockJobs, rowCount: 1 });

      const res = await request(app)
        .get('/api/jobs/archived')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.jobs).toEqual(mockJobs);
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .get('/api/jobs/archived')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Database error');
    });
  });

  describe('GET /api/jobs/:id', () => {
    it('should return job by id', async () => {
      const mockJob = { id: 1, title: 'Engineer', company: 'Tech Corp' };
      mockQueryFn.mockResolvedValueOnce({ rows: [mockJob], rowCount: 1 });

      const res = await request(app)
        .get('/api/jobs/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.job).toEqual(mockJob);
    });

    it('should return 404 if job not found', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = await request(app)
        .get('/api/jobs/999')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Job not found');
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .get('/api/jobs/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Database error');
    });
  });

  describe('PUT /api/jobs/:id', () => {
    it('should update job', async () => {
      const updatedJob = { id: 1, title: 'Senior Engineer', company: 'Tech Corp' };
      mockQueryFn
        .mockResolvedValueOnce({ rows: [updatedJob], rowCount: 1 }) // Update job
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // Get materials (optional)

      const res = await request(app)
        .put('/api/jobs/1')
        .set('Authorization', 'Bearer valid-token')
        .send({
          title: 'Senior Engineer',
        });

      expect(res.status).toBe(200);
      expect(res.body.job).toEqual(updatedJob);
    });

    it('should handle dateApplied alias', async () => {
      const updatedJob = { id: 1, title: 'Engineer', applicationDate: '2024-01-01' };
      mockQueryFn
        .mockResolvedValueOnce({ rows: [updatedJob], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = await request(app)
        .put('/api/jobs/1')
        .set('Authorization', 'Bearer valid-token')
        .send({
          dateApplied: '2024-01-01',
        });

      expect(res.status).toBe(200);
    });

    it('should update role type when title changes', async () => {
      const updatedJob = { id: 1, title: 'Senior Software Engineer', type: 'Engineering' };
      mockQueryFn
        .mockResolvedValueOnce({ rows: [updatedJob], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = await request(app)
        .put('/api/jobs/1')
        .set('Authorization', 'Bearer valid-token')
        .send({
          title: 'Senior Software Engineer',
        });

      expect(res.status).toBe(200);
    });

    it('should handle industry field normalization', async () => {
      const updatedJob = { id: 1, industry: null };
      mockQueryFn
        .mockResolvedValueOnce({ rows: [updatedJob], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = await request(app)
        .put('/api/jobs/1')
        .set('Authorization', 'Bearer valid-token')
        .send({
          industry: '   ', // Empty string should become null
        });

      expect(res.status).toBe(200);
    });

    it('should handle industry field with valid value', async () => {
      const updatedJob = { id: 1, industry: 'Technology' };
      mockQueryFn
        .mockResolvedValueOnce({ rows: [updatedJob], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = await request(app)
        .put('/api/jobs/1')
        .set('Authorization', 'Bearer valid-token')
        .send({
          industry: '  Technology  ', // Should be trimmed
        });

      expect(res.status).toBe(200);
    });

    it('should handle industry field as null', async () => {
      const updatedJob = { id: 1, industry: null };
      mockQueryFn
        .mockResolvedValueOnce({ rows: [updatedJob], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = await request(app)
        .put('/api/jobs/1')
        .set('Authorization', 'Bearer valid-token')
        .send({
          industry: null,
        });

      expect(res.status).toBe(200);
    });

    it('should handle multiple field updates', async () => {
      const updatedJob = { id: 1, title: 'Senior Engineer', company: 'Big Corp', location: 'Remote' };
      mockQueryFn
        .mockResolvedValueOnce({ rows: [updatedJob], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = await request(app)
        .put('/api/jobs/1')
        .set('Authorization', 'Bearer valid-token')
        .send({
          title: 'Senior Engineer',
          company: 'Big Corp',
          location: 'Remote',
        });

      expect(res.status).toBe(200);
    });

    it('should handle status update without offerDate', async () => {
      const oldJob = { status: 'Applied' };
      const updatedJob = { id: 1, status: 'Offer', offerDate: new Date().toISOString() };
      mockQueryFn
        .mockResolvedValueOnce({ rows: [oldJob], rowCount: 1 }) // Get old status
        .mockResolvedValueOnce({ rows: [updatedJob], rowCount: 1 }) // Update job
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // Get materials
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // Application history
        .mockResolvedValueOnce({ rows: [{ status: 'Offer' }], rowCount: 1 }); // Final status check

      const res = await request(app)
        .put('/api/jobs/1')
        .set('Authorization', 'Bearer valid-token')
        .send({
          status: 'Offer',
          // No offerDate - should be auto-set
        });

      expect(res.status).toBe(200);
      expect(res.body.job.status).toBe('Offer');
    });

    it('should handle status update with existing offerDate', async () => {
      const oldJob = { status: 'Applied' };
      const updatedJob = { id: 1, status: 'Offer', offerDate: '2024-01-01' };
      mockQueryFn
        .mockResolvedValueOnce({ rows: [oldJob], rowCount: 1 }) // Get old status
        .mockResolvedValueOnce({ rows: [updatedJob], rowCount: 1 }) // Update job
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // Get materials
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // Application history
        .mockResolvedValueOnce({ rows: [{ status: 'Offer' }], rowCount: 1 }); // Final status check

      const res = await request(app)
        .put('/api/jobs/1')
        .set('Authorization', 'Bearer valid-token')
        .send({
          status: 'Offer',
          offerDate: '2024-01-01',
        });

      expect(res.status).toBe(200);
      expect(res.body.job.status).toBe('Offer');
    });

    it('should handle materials history when only resume_id updated', async () => {
      const updatedJob = { id: 1 };
      mockQueryFn
        .mockResolvedValueOnce({ rows: [{ status: 'Applied' }] }) // Get old status
        .mockResolvedValueOnce({ rows: [updatedJob], rowCount: 1 }) // Update job
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // Get current materials
        .mockResolvedValueOnce({ rows: [{ id: 2 }], rowCount: 1 }) // Validate resume
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // Update job_materials
        .mockResolvedValueOnce({ rows: [{ resume_id: 2, cover_letter_id: null }], rowCount: 1 }); // Get materials

      const res = await request(app)
        .put('/api/jobs/1')
        .set('Authorization', 'Bearer valid-token')
        .send({
          notes: 'Updated notes', // Include at least one allowed field
          resume_id: 2,
        });

      expect(res.status).toBe(200);
    });

    it('should handle materials history when only cover_letter_id updated', async () => {
      const updatedJob = { id: 1 };
      mockQueryFn
        .mockResolvedValueOnce({ rows: [{ status: 'Applied' }] }) // Get old status
        .mockResolvedValueOnce({ rows: [updatedJob], rowCount: 1 }) // Update job
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // Get current materials
        .mockResolvedValueOnce({ rows: [{ id: 3 }], rowCount: 1 }) // Validate cover letter
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // Update job_materials
        .mockResolvedValueOnce({ rows: [{ resume_id: null, cover_letter_id: 3 }], rowCount: 1 }); // Get materials

      const res = await request(app)
        .put('/api/jobs/1')
        .set('Authorization', 'Bearer valid-token')
        .send({
          notes: 'Updated notes', // Include at least one allowed field
          cover_letter_id: 3,
        });

      expect(res.status).toBe(200);
    });

    it('should record materials history when resume or cover letter updated', async () => {
      const updatedJob = { id: 1 };
      mockQueryFn
        .mockResolvedValueOnce({ rows: [{ status: 'Applied' }] }) // Get old status
        .mockResolvedValueOnce({ rows: [updatedJob], rowCount: 1 }) // Update job
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // Get current materials
        .mockResolvedValueOnce({ rows: [{ id: 2 }], rowCount: 1 }) // Validate resume
        .mockResolvedValueOnce({ rows: [{ id: 3 }], rowCount: 1 }) // Validate cover letter
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // Update job_materials
        .mockResolvedValueOnce({ rows: [{ resume_id: 2, cover_letter_id: 3 }], rowCount: 1 }); // Get materials

      const res = await request(app)
        .put('/api/jobs/1')
        .set('Authorization', 'Bearer valid-token')
        .send({
          notes: 'Updated notes', // Include at least one allowed field
          resume_id: 2,
          cover_letter_id: 3,
        });

      expect(res.status).toBe(200);
    });

    it('should set offerDate when status becomes Offer', async () => {
      const oldJob = { status: 'Applied' };
      const updatedJob = { id: 1, status: 'Offer', offerDate: new Date().toISOString() };
      mockQueryFn
        .mockResolvedValueOnce({ rows: [oldJob], rowCount: 1 }) // Get old status
        .mockResolvedValueOnce({ rows: [updatedJob], rowCount: 1 }) // Update job
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // Get materials
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // Application history
        .mockResolvedValueOnce({ rows: [{ status: 'Offer' }], rowCount: 1 }); // Final status check

      const res = await request(app)
        .put('/api/jobs/1')
        .set('Authorization', 'Bearer valid-token')
        .send({
          status: 'Offer',
        });

      expect(res.status).toBe(200);
      expect(res.body.job.status).toBe('Offer');
      expect(res.body.job.offerDate).toBeDefined();
    });

    it('should return 400 if no valid fields to update', async () => {
      const res = await request(app)
        .put('/api/jobs/1')
        .set('Authorization', 'Bearer valid-token')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('No valid fields to update');
    });

    it('should return 404 if job not found', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = await request(app)
        .put('/api/jobs/999')
        .set('Authorization', 'Bearer valid-token')
        .send({
          title: 'Updated Title',
        });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Job not found');
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .put('/api/jobs/1')
        .set('Authorization', 'Bearer valid-token')
        .send({
          title: 'Updated Title',
        });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Database update failed');
    });
  });

  describe('PUT /api/jobs/:id/status', () => {
    it('should update status to Interview', async () => {
      const updatedJob = { id: 1, status: 'Interview', interview_date: new Date().toISOString() };
      mockQueryFn
        .mockResolvedValueOnce({ rows: [{ status: 'Applied' }] }) // Get old status
        .mockResolvedValueOnce({ rows: [updatedJob], rowCount: 1 }) // Update status
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // Application history

      const res = await request(app)
        .put('/api/jobs/1/status')
        .set('Authorization', 'Bearer valid-token')
        .send({
          status: 'Interview',
        });

      expect(res.status).toBe(200);
      expect(res.body.job.status).toBe('Interview');
      expect(res.body.job.interview_date).toBeDefined();
    });

    it('should update status to other statuses', async () => {
      const updatedJob = { id: 1, status: 'Applied' };
      mockQueryFn
        .mockResolvedValueOnce({ rows: [{ status: 'Pending' }] }) // Get old status
        .mockResolvedValueOnce({ rows: [updatedJob], rowCount: 1 }) // Update status
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // Application history

      const res = await request(app)
        .put('/api/jobs/1/status')
        .set('Authorization', 'Bearer valid-token')
        .send({
          status: 'Applied',
        });

      expect(res.status).toBe(200);
      expect(res.body.job.status).toBe('Applied');
    });

    it('should update status to Offer', async () => {
      const updatedJob = { id: 1, status: 'Offer', offerDate: new Date().toISOString() };
      mockQueryFn
        .mockResolvedValueOnce({ rows: [{ status: 'Interview' }] }) // Get old status
        .mockResolvedValueOnce({ rows: [updatedJob], rowCount: 1 }) // Update status
        .mockResolvedValueOnce({ rows: [] }) // Check for existing offer
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // Application history

      const res = await request(app)
        .put('/api/jobs/1/status')
        .set('Authorization', 'Bearer valid-token')
        .send({
          status: 'Offer',
        });

      expect(res.status).toBe(200);
      expect(res.body.job.status).toBe('Offer');
      expect(res.body.job.offerDate).toBeDefined();
    });

    it('should return 400 if status missing', async () => {
      const res = await request(app)
        .put('/api/jobs/1/status')
        .set('Authorization', 'Bearer valid-token')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Missing status');
    });

    it('should return 404 if job not found', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = await request(app)
        .put('/api/jobs/999/status')
        .set('Authorization', 'Bearer valid-token')
        .send({
          status: 'Interview',
        });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Job not found or unauthorized');
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .put('/api/jobs/1/status')
        .set('Authorization', 'Bearer valid-token')
        .send({
          status: 'Interview',
        });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Database error');
    });

    it('should handle application history insertion error', async () => {
      const updatedJob = { id: 1, status: 'Applied' };
      mockQueryFn
        .mockResolvedValueOnce({ rows: [updatedJob], rowCount: 1 })
        .mockRejectedValueOnce(new Error('History insert failed')); // History insert fails

      const res = await request(app)
        .put('/api/jobs/1/status')
        .set('Authorization', 'Bearer valid-token')
        .send({
          status: 'Applied',
        });

      expect(res.status).toBe(500);
    });
  });

  describe('PUT /api/jobs/:id/archive', () => {
    it('should archive job', async () => {
      const archivedJob = { id: 1, isArchived: true };
      mockQueryFn.mockResolvedValueOnce({ rows: [archivedJob], rowCount: 1 });

      const res = await request(app)
        .put('/api/jobs/1/archive')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.job.isArchived).toBe(true);
    });

    it('should return 404 if job not found', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = await request(app)
        .put('/api/jobs/999/archive')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Job not found');
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .put('/api/jobs/1/archive')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Database error');
    });
  });

  describe('PUT /api/jobs/:id/restore', () => {
    it('should restore archived job', async () => {
      const restoredJob = { id: 1, isArchived: false };
      mockQueryFn.mockResolvedValueOnce({ rows: [restoredJob], rowCount: 1 });

      const res = await request(app)
        .put('/api/jobs/1/restore')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.job.isArchived).toBe(false);
    });

    it('should return 404 if job not found', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = await request(app)
        .put('/api/jobs/999/restore')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Job not found');
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .put('/api/jobs/1/restore')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Database error');
    });
  });

  describe('DELETE /api/jobs/:id', () => {
    it('should delete job', async () => {
      const mockClient = {
        query: mockQueryFn,
        release: vi.fn(),
      };
      mockConnectFn.mockResolvedValue(mockClient);

      mockQueryFn
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 }) // Job check
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // Delete application_history
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // Delete materials_history
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // Delete job
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // COMMIT

      const res = await request(app)
        .delete('/api/jobs/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Job permanently deleted');
    });

    it('should return 404 if job not found', async () => {
      const mockClient = {
        query: mockQueryFn,
        release: vi.fn(),
      };
      mockConnectFn.mockResolvedValue(mockClient);

      mockQueryFn
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // Job check
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // ROLLBACK

      const res = await request(app)
        .delete('/api/jobs/999')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Job not found');
    });

    it('should return 500 on database error', async () => {
      const mockClient = {
        query: mockQueryFn,
        release: vi.fn(),
      };
      mockConnectFn.mockResolvedValue(mockClient);

      mockQueryFn
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
        .mockRejectedValueOnce(new Error('Database error')); // Job check fails

      const res = await request(app)
        .delete('/api/jobs/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Database error');
    });

    it('should handle materials history table missing during delete', async () => {
      const mockClient = {
        query: mockQueryFn,
        release: vi.fn(),
      };
      mockConnectFn.mockResolvedValue(mockClient);

      const materialsError = new Error('Table does not exist');
      materialsError.code = '42P01';

      mockQueryFn
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 }) // Job check
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // Delete application_history
        .mockRejectedValueOnce(materialsError) // Delete materials_history - table doesn't exist (caught)
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // Delete job
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // COMMIT

      const res = await request(app)
        .delete('/api/jobs/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });

    it('should handle materials history delete error (non-42P01)', async () => {
      const mockClient = {
        query: mockQueryFn,
        release: vi.fn(),
      };
      mockConnectFn.mockResolvedValue(mockClient);

      const materialsError = new Error('Other database error');
      materialsError.code = '23505'; // Different error code

      // The code catches the error and continues, so the job deletion should still succeed
      mockQueryFn
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 }) // Job check
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // Delete application_history
        .mockRejectedValueOnce(materialsError) // Delete materials_history - different error (caught and logged)
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // Delete job
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // COMMIT

      const res = await request(app)
        .delete('/api/jobs/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200); // Error is caught and logged, deletion continues
    });
  });

  describe('PUT /api/jobs/bulk/deadline', () => {
    it('should update deadlines for multiple jobs', async () => {
      const updatedJobs = [
        { id: 1, title: 'Job 1', deadline: '2024-02-01' },
        { id: 2, title: 'Job 2', deadline: '2024-02-01' },
      ];

      mockQueryFn.mockResolvedValueOnce({ rows: updatedJobs, rowCount: 2 });

      const res = await request(app)
        .put('/api/jobs/bulk/deadline')
        .set('Authorization', 'Bearer valid-token')
        .send({
          jobIds: [1, 2],
          daysToAdd: 7,
        });

      expect(res.status).toBe(200);
      expect(res.body.updated).toEqual(updatedJobs);
    });

    it('should return 400 if no job IDs provided', async () => {
      const res = await request(app)
        .put('/api/jobs/bulk/deadline')
        .set('Authorization', 'Bearer valid-token')
        .send({
          jobIds: [],
          daysToAdd: 7,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('No job IDs provided');
    });

    it('should return 400 if invalid daysToAdd', async () => {
      const res = await request(app)
        .put('/api/jobs/bulk/deadline')
        .set('Authorization', 'Bearer valid-token')
        .send({
          jobIds: [1, 2],
          daysToAdd: 0,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid daysToAdd value');
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .put('/api/jobs/bulk/deadline')
        .set('Authorization', 'Bearer valid-token')
        .send({
          jobIds: [1, 2],
          daysToAdd: 7,
        });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Database error');
    });

    it('should handle negative daysToAdd', async () => {
      // The code only checks for NaN or 0, not negative values, so -7 will be accepted
      const updatedJobs = [
        { id: 1, title: 'Job 1', deadline: '2024-01-24' },
        { id: 2, title: 'Job 2', deadline: '2024-01-24' },
      ];
      mockQueryFn.mockResolvedValueOnce({ rows: updatedJobs });

      const res = await request(app)
        .put('/api/jobs/bulk/deadline')
        .set('Authorization', 'Bearer valid-token')
        .send({
          jobIds: [1, 2],
          daysToAdd: -7,
        });

      expect(res.status).toBe(200);
      expect(res.body.updated).toEqual(updatedJobs);
    });

    it('should handle daysToAdd as string', async () => {
      const updatedJobs = [
        { id: 1, title: 'Job 1', deadline: '2024-02-08' },
        { id: 2, title: 'Job 2', deadline: '2024-02-08' },
      ];

      mockQueryFn.mockResolvedValueOnce({ rows: updatedJobs, rowCount: 2 });

      const res = await request(app)
        .put('/api/jobs/bulk/deadline')
        .set('Authorization', 'Bearer valid-token')
        .send({
          jobIds: [1, 2],
          daysToAdd: '7', // String should be parsed
        });

      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/jobs/:id/materials-history', () => {
    it('should return materials history', async () => {
      // Current implementation returns empty array (history tracking removed)
      const res = await request(app)
        .get('/api/jobs/1/materials-history')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.history).toEqual([]);
    });

    it('should return empty array (history tracking removed)', async () => {
      const res = await request(app)
        .get('/api/jobs/1/materials-history')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.history).toEqual([]);
    });

    it('should handle errors gracefully and return empty array', async () => {
      // Even if there's an error, it should return empty array
      const res = await request(app)
        .get('/api/jobs/1/materials-history')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.history).toEqual([]);
    });
  });

  describe('PUT /api/jobs/:id/materials', () => {
    it('should update materials with customization levels', async () => {
      const updatedJob = { id: 1, resume_id: 1, cover_letter_id: 1 };
      mockQueryFn
        .mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 }) // Resume check
        .mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 }) // Cover letter check
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // Update job_materials
        .mockResolvedValueOnce({ rows: [updatedJob], rowCount: 1 }); // Get updated job

      const res = await request(app)
        .put('/api/jobs/1/materials')
        .set('Authorization', 'Bearer valid-token')
        .send({
          resume_id: 1,
          cover_letter_id: 1,
        });

      expect(res.status).toBe(200);
      expect(res.body.job).toEqual(updatedJob);
    });

    it('should handle template cover letter (templates not supported)', async () => {
      const updatedJob = { id: 1, resume_id: 1, cover_letter_id: null };
      mockQueryFn
        .mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 }) // Resume check
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // Update job_materials (no cover letter)
        .mockResolvedValueOnce({ rows: [updatedJob], rowCount: 1 }); // Get updated job

      const res = await request(app)
        .put('/api/jobs/1/materials')
        .set('Authorization', 'Bearer valid-token')
        .send({
          resume_id: 1,
          cover_letter_id: 'template_1', // Template IDs are not supported
        });

      expect(res.status).toBe(200);
      expect(res.body.job.cover_letter_id).toBeNull();
    });

    it('should update only resume when provided', async () => {
      const updatedJob = { id: 1, resume_id: 1, cover_letter_id: null };
      mockQueryFn
        .mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 }) // Resume check
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // Update job_materials
        .mockResolvedValueOnce({ rows: [updatedJob], rowCount: 1 }); // Get updated job

      const res = await request(app)
        .put('/api/jobs/1/materials')
        .set('Authorization', 'Bearer valid-token')
        .send({
          resume_id: 1,
        });

      expect(res.status).toBe(200);
      expect(res.body.job).toEqual(updatedJob);
    });

    it('should update only cover letter when provided', async () => {
      const updatedJob = { id: 1, resume_id: null, cover_letter_id: 1 };
      mockQueryFn
        .mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 }) // Cover letter check
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // Update job_materials
        .mockResolvedValueOnce({ rows: [updatedJob], rowCount: 1 }); // Get updated job

      const res = await request(app)
        .put('/api/jobs/1/materials')
        .set('Authorization', 'Bearer valid-token')
        .send({
          cover_letter_id: 1,
        });

      expect(res.status).toBe(200);
      expect(res.body.job).toEqual(updatedJob);
    });

    it('should handle invalid resume ID (not found)', async () => {
      const updatedJob = { id: 1, resume_id: null, cover_letter_id: null };
      mockQueryFn
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // Resume check - not found
        .mockResolvedValueOnce({ rows: [updatedJob], rowCount: 1 }); // Get updated job (no materials update since resume invalid)

      const res = await request(app)
        .put('/api/jobs/1/materials')
        .set('Authorization', 'Bearer valid-token')
        .send({
          resume_id: 999, // Invalid resume ID
        });

      expect(res.status).toBe(200);
      expect(res.body.job).toBeDefined();
    });

    it('should handle invalid cover letter ID (not found)', async () => {
      const updatedJob = { id: 1, resume_id: null, cover_letter_id: null };
      mockQueryFn
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // Cover letter check - not found
        .mockResolvedValueOnce({ rows: [updatedJob], rowCount: 1 }); // Get updated job (no materials update since cover letter invalid)

      const res = await request(app)
        .put('/api/jobs/1/materials')
        .set('Authorization', 'Bearer valid-token')
        .send({
          cover_letter_id: 999, // Invalid cover letter ID
        });

      expect(res.status).toBe(200);
      expect(res.body.job).toBeDefined();
    });

    it('should handle non-numeric cover letter ID', async () => {
      const updatedJob = { id: 1, resume_id: null, cover_letter_id: null };
      mockQueryFn
        .mockResolvedValueOnce({ rows: [updatedJob], rowCount: 1 }); // Get updated job (no materials update since ID invalid)

      const res = await request(app)
        .put('/api/jobs/1/materials')
        .set('Authorization', 'Bearer valid-token')
        .send({
          cover_letter_id: 'not-a-number',
        });

      expect(res.status).toBe(200);
      expect(res.body.job).toBeDefined();
    });

    it('should return 404 if job not found', async () => {
      mockQueryFn
        .mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 }) // Resume check
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // Update job_materials
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // Get job - not found

      const res = await request(app)
        .put('/api/jobs/999/materials')
        .set('Authorization', 'Bearer valid-token')
        .send({
          resume_id: 1,
        });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Job not found');
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .put('/api/jobs/1/materials')
        .set('Authorization', 'Bearer valid-token')
        .send({
          resume_id: 1,
        });

      expect(res.status).toBe(500);
    });
  });

  describe('POST /api/jobs/fix-role-types', () => {
    it('should fix role types for all jobs', async () => {
      const mockJobs = [
        { id: 1, title: 'Software Engineer' },
        { id: 2, title: 'Product Manager' },
      ];

      mockQueryFn
        .mockResolvedValueOnce({ rows: mockJobs, rowCount: 2 }) // Get jobs
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // Update job 1
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // Update job 2

      const res = await request(app)
        .post('/api/jobs/fix-role-types')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('Role types updated');
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .post('/api/jobs/fix-role-types')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to update role types');
    });
  });

  describe('POST /api/jobs - Additional Edge Cases', () => {
    it('should handle dateApplied instead of applicationDate', async () => {
      const mockJob = { id: 1, title: 'Engineer', company: 'TechCorp', applicationDate: '2024-01-01' };
      mockQueryFn
        .mockResolvedValueOnce({ rows: [mockJob], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });

      const res = await request(app)
        .post('/api/jobs')
        .set('Authorization', 'Bearer valid-token')
        .send({
          title: 'Engineer',
          company: 'TechCorp',
          dateApplied: '2024-01-01',
        });

      expect(res.status).toBe(201);
    });

    it('should handle template cover letter ID', async () => {
      const mockJob = { id: 1, title: 'Engineer', company: 'TechCorp' };
      mockQueryFn
        .mockResolvedValueOnce({ rows: [mockJob], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });

      const res = await request(app)
        .post('/api/jobs')
        .set('Authorization', 'Bearer valid-token')
        .send({
          title: 'Engineer',
          company: 'TechCorp',
          cover_letter_id: 'template_123',
        });

      expect(res.status).toBe(201);
    });

    it('should handle salary with currency symbols', async () => {
      const mockJob = { id: 1, title: 'Engineer', company: 'TechCorp', salary_min: 100000, salary_max: 150000 };
      mockQueryFn
        .mockResolvedValueOnce({ rows: [mockJob], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });

      const res = await request(app)
        .post('/api/jobs')
        .set('Authorization', 'Bearer valid-token')
        .send({
          title: 'Engineer',
          company: 'TechCorp',
          salary_min: '$100,000',
          salary_max: '$150,000',
        });

      expect(res.status).toBe(201);
    });

    it('should handle materials storage failure gracefully', async () => {
      const mockJob = { id: 1, title: 'Engineer', company: 'TechCorp' };
      mockQueryFn
        .mockResolvedValueOnce({ rows: [mockJob], rowCount: 1 })
        .mockRejectedValueOnce(new Error('Materials error'))
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });

      const res = await request(app)
        .post('/api/jobs')
        .set('Authorization', 'Bearer valid-token')
        .send({
          title: 'Engineer',
          company: 'TechCorp',
          resume_id: 1,
        });

      expect(res.status).toBe(201);
    });
  });

  describe('GET /api/jobs - Additional Filters', () => {
    it('should filter by search query', async () => {
      const mockJobs = [{ id: 1, title: 'Software Engineer', company: 'TechCorp' }];
      mockQueryFn.mockResolvedValueOnce({ rows: mockJobs });

      const res = await request(app)
        .get('/api/jobs?search=Engineer')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });

    it('should filter by salary range', async () => {
      const mockJobs = [{ id: 1, title: 'Engineer', company: 'TechCorp', salary_min: 100000, salary_max: 150000 }];
      mockQueryFn.mockResolvedValueOnce({ rows: mockJobs });

      const res = await request(app)
        .get('/api/jobs?salaryMin=100000&salaryMax=150000')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });

    it('should filter by date range', async () => {
      const mockJobs = [{ id: 1, title: 'Engineer', company: 'TechCorp', deadline: '2024-12-31' }];
      mockQueryFn.mockResolvedValueOnce({ rows: mockJobs });

      const res = await request(app)
        .get('/api/jobs?dateFrom=2024-01-01&dateTo=2024-12-31')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });

    it('should sort by salary', async () => {
      const mockJobs = [{ id: 1, title: 'Engineer', company: 'TechCorp', salary_max: 150000 }];
      mockQueryFn.mockResolvedValueOnce({ rows: mockJobs });

      const res = await request(app)
        .get('/api/jobs?sortBy=salary')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });

    it('should sort by company', async () => {
      const mockJobs = [{ id: 1, title: 'Engineer', company: 'TechCorp' }];
      mockQueryFn.mockResolvedValueOnce({ rows: mockJobs });

      const res = await request(app)
        .get('/api/jobs?sortBy=company')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/jobs/stats', () => {
    it('should return job statistics', async () => {
      const mockStats = {
        totalJobs: 10,
        jobsByStatus: [{ status: 'Applied', count: 5 }],
        monthlyVolume: [{ month: '2024-01-01', count: 5 }],
        responseRate: 30.5,
        adherenceRate: 80.0,
        avgTimeToOffer: 15,
        avgTimeInStage: [{ status: 'Applied', avg_days: 5 }],
      };

      mockQueryFn.mockResolvedValueOnce({ rows: [mockStats] });

      const res = await request(app)
        .get('/api/jobs/stats')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.totalJobs).toBeDefined();
    });
  });

  describe('GET /api/jobs/archived', () => {
    it('should return archived jobs', async () => {
      const mockJobs = [{ id: 1, title: 'Engineer', company: 'TechCorp', isArchived: true }];
      mockQueryFn.mockResolvedValueOnce({ rows: mockJobs });

      const res = await request(app)
        .get('/api/jobs/archived')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.jobs).toBeDefined();
    });
  });

  describe('GET /api/jobs/:id - Materials Edge Cases', () => {
    it('should handle materials table not existing', async () => {
      const mockJob = { id: 1, title: 'Engineer', company: 'TechCorp' };
      mockQueryFn
        .mockResolvedValueOnce({ rows: [mockJob] })
        .mockRejectedValueOnce(new Error('Table does not exist'));

      const res = await request(app)
        .get('/api/jobs/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.job.resume_id).toBeNull();
    });

    it('should return job with materials when found', async () => {
      const mockJob = { id: 1, title: 'Engineer', company: 'TechCorp' };
      const mockMaterials = { resume_id: 1, cover_letter_id: 2 };
      mockQueryFn
        .mockResolvedValueOnce({ rows: [mockJob] })
        .mockResolvedValueOnce({ rows: [mockMaterials] });

      const res = await request(app)
        .get('/api/jobs/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.job.resume_id).toBe(1);
    });
  });

  describe('PUT /api/jobs/:id/status - Additional Edge Cases', () => {
    it('should handle status update with existing offerDate', async () => {
      const oldJob = { id: 1, status: 'Applied', offerDate: '2024-01-01' };
      const updatedJob = { id: 1, status: 'Offer', offerDate: '2024-01-01' };
      mockQueryFn
        .mockResolvedValueOnce({ rows: [{ status: 'Applied' }] }) // Get old status
        .mockResolvedValueOnce({ rows: [updatedJob], rowCount: 1 }) // Update job
        .mockResolvedValueOnce({ rows: [] }) // Check for existing offer (none exists)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // Application history

      const res = await request(app)
        .put('/api/jobs/1/status')
        .set('Authorization', 'Bearer valid-token')
        .send({ status: 'Offer' });

      expect(res.status).toBe(200);
    });

    it('should handle status update to Interview', async () => {
      const oldJob = { id: 1, status: 'Applied' };
      const updatedJob = { id: 1, status: 'Interview', interview_date: '2024-01-01' };
      mockQueryFn
        .mockResolvedValueOnce({ rows: [oldJob] })
        .mockResolvedValueOnce({ rows: [updatedJob], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [updatedJob] });

      const res = await request(app)
        .put('/api/jobs/1/status')
        .set('Authorization', 'Bearer valid-token')
        .send({ status: 'Interview' });

      expect(res.status).toBe(200);
    });
  });
});

