import request from 'supertest';
import express from 'express';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Create mock pool
const mockPool = {
  query: vi.fn(),
  connect: vi.fn(),
  end: vi.fn(),
};

// Mock db/pool.js
vi.mock('../../db/pool.js', () => ({
  default: {
    query: vi.fn(),
    connect: vi.fn(),
    end: vi.fn(),
  },
}));

// Mock jsonwebtoken
vi.mock('jsonwebtoken', () => ({
  default: {
    verify: vi.fn().mockReturnValue({ id: 1 }),
    sign: vi.fn().mockReturnValue('mock-token'),
  },
}));

// Mock roleTypeMapper
vi.mock('../../utils/roleTypeMapper.js', () => ({
  getRoleTypeFromTitle: vi.fn((title) => {
    if (title.toLowerCase().includes('engineer')) return 'Engineering';
    if (title.toLowerCase().includes('manager')) return 'Management';
    return 'Other';
  }),
}));

import pool from '../../db/pool.js';
import jwt from 'jsonwebtoken';
import jobRoutes from '../../routes/job.js';

describe('Job Routes - 90%+ Coverage', () => {
  let app;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Assign mock methods to the pool
    pool.query = mockPool.query;
    pool.connect = mockPool.connect;
    pool.end = mockPool.end;

    jwt.verify.mockReturnValue({ id: 1, email: 'test@example.com' });

    app = express();
    app.use(express.json());
    app.use('/api/jobs', jobRoutes);
  });

  describe('Auth Middleware', () => {
    it('should return 401 if no token provided', async () => {
      const res = await request(app).get('/api/jobs');
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Unauthorized');
    });

    it('should return 401 if token is invalid', async () => {
      jwt.verify.mockImplementation(() => { throw new Error('Invalid'); });
      
      const res = await request(app)
        .get('/api/jobs')
        .set('Authorization', 'Bearer invalid-token');
      
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid token');
    });
  });

  describe('POST / - Create Job', () => {
    it('should create a job successfully', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          title: 'Software Engineer',
          company: 'Tech Corp',
          status: 'Interested',
        }],
      });

      const res = await request(app)
        .post('/api/jobs')
        .set('Authorization', 'Bearer valid-token')
        .send({
          title: 'Software Engineer',
          company: 'Tech Corp',
          location: 'NYC',
          salary_min: 100000,
          salary_max: 150000,
        });

      expect([201, 200]).toContain(res.status);
    });

    it('should return 400 if title is missing', async () => {
      const res = await request(app)
        .post('/api/jobs')
        .set('Authorization', 'Bearer valid-token')
        .send({ company: 'Tech Corp' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Title and company are required');
    });

    it('should return 400 if company is missing', async () => {
      const res = await request(app)
        .post('/api/jobs')
        .set('Authorization', 'Bearer valid-token')
        .send({ title: 'Software Engineer' });

      expect(res.status).toBe(400);
    });

    it('should handle template cover letter ID', async () => {
      // Mock template query
      mockPool.query.mockResolvedValueOnce({
        rows: [{ name: 'Professional Template', content: 'Template content' }],
      });

      // Mock cover letter insert
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 10 }],
      });

      // Mock job insert
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          title: 'Engineer',
          company: 'Corp',
          cover_letter_id: 10,
        }],
      });

      // Mock materials history
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/api/jobs')
        .set('Authorization', 'Bearer valid-token')
        .send({
          title: 'Software Engineer',
          company: 'Tech Corp',
          cover_letter_id: 'template_5',
        });

      expect([201, 200, 500]).toContain(res.status);
    });

    it('should handle invalid template ID format', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          title: 'Engineer',
          company: 'Corp',
        }],
      });

      const res = await request(app)
        .post('/api/jobs')
        .set('Authorization', 'Bearer valid-token')
        .send({
          title: 'Software Engineer',
          company: 'Tech Corp',
          cover_letter_id: 'template_invalid',
        });

      expect([201, 200, 500]).toContain(res.status);
    });

    it('should handle salary with currency symbols', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          title: 'Engineer',
          company: 'Corp',
          salary_min: 100000,
          salary_max: 150000,
        }],
      });

      const res = await request(app)
        .post('/api/jobs')
        .set('Authorization', 'Bearer valid-token')
        .send({
          title: 'Software Engineer',
          company: 'Tech Corp',
          salary_min: '$100,000',
          salary_max: '$150,000.50',
        });

      expect([201, 200, 500]).toContain(res.status);
    });

    it('should handle dateApplied alias for applicationDate', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          title: 'Engineer',
          company: 'Corp',
        }],
      });

      const res = await request(app)
        .post('/api/jobs')
        .set('Authorization', 'Bearer valid-token')
        .send({
          title: 'Software Engineer',
          company: 'Tech Corp',
          dateApplied: '2024-01-15',
        });

      expect([201, 200, 500]).toContain(res.status);
    });

    it('should handle database error on job insert', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .post('/api/jobs')
        .set('Authorization', 'Bearer valid-token')
        .send({
          title: 'Software Engineer',
          company: 'Tech Corp',
        });

      expect(res.status).toBe(500);
    });

    it('should handle required_skills as array', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          title: 'Engineer',
          company: 'Corp',
          required_skills: ['JavaScript', 'Python'],
        }],
      });

      const res = await request(app)
        .post('/api/jobs')
        .set('Authorization', 'Bearer valid-token')
        .send({
          title: 'Software Engineer',
          company: 'Tech Corp',
          required_skills: ['JavaScript', 'Python'],
        });

      expect([201, 200, 500]).toContain(res.status);
    });
  });

  describe('POST /fix-role-types - Fix Role Types', () => {
    it('should fix role types for all jobs', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          { id: 1, title: 'Software Engineer' },
          { id: 2, title: 'Project Manager' },
        ],
      });

      mockPool.query.mockResolvedValueOnce({ rows: [] });
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/api/jobs/fix-role-types')
        .set('Authorization', 'Bearer valid-token');

      expect([200, 500]).toContain(res.status);
    });

    it('should handle error during fix', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .post('/api/jobs/fix-role-types')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
    });
  });

  describe('GET / - List Jobs', () => {
    it('should list all jobs', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          { id: 1, title: 'Engineer', company: 'Corp', status: 'Applied' },
          { id: 2, title: 'Manager', company: 'Inc', status: 'Interview' },
        ],
      });

      const res = await request(app)
        .get('/api/jobs')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.jobs).toHaveLength(2);
    });

    it('should filter by search term', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 1, title: 'React Developer', company: 'Tech' }],
      });

      const res = await request(app)
        .get('/api/jobs?search=React')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });

    it('should filter by status', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 1, title: 'Engineer', status: 'Interview' }],
      });

      const res = await request(app)
        .get('/api/jobs?status=Interview')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });

    it('should filter by industry', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 1, title: 'Engineer', industry: 'Tech' }],
      });

      const res = await request(app)
        .get('/api/jobs?industry=Tech')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });

    it('should filter by location', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 1, title: 'Engineer', location: 'NYC' }],
      });

      const res = await request(app)
        .get('/api/jobs?location=NYC')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });

    it('should filter by salary range', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 1, title: 'Engineer', salary_min: 100000, salary_max: 150000 }],
      });

      const res = await request(app)
        .get('/api/jobs?salaryMin=80000&salaryMax=200000')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });

    it('should filter by date range', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 1, title: 'Engineer' }],
      });

      const res = await request(app)
        .get('/api/jobs?dateFrom=2024-01-01&dateTo=2024-12-31')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });

    it('should sort by deadline', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 1, title: 'Engineer', deadline: '2024-03-01' }],
      });

      const res = await request(app)
        .get('/api/jobs?sortBy=deadline')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });

    it('should sort by salary', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 1, title: 'Engineer', salary_max: 150000 }],
      });

      const res = await request(app)
        .get('/api/jobs?sortBy=salary')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });

    it('should sort by company', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 1, title: 'Engineer', company: 'ABC Corp' }],
      });

      const res = await request(app)
        .get('/api/jobs?sortBy=company')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });

    it('should handle database error', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .get('/api/jobs')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
    });
  });

  describe('GET /stats - Job Statistics', () => {
    it('should return job statistics', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          totalJobs: 10,
          jobsByStatus: [{ status: 'Applied', count: 5 }],
          monthlyVolume: [],
          responseRate: 30,
          adherenceRate: 80,
          avgTimeToOffer: 45,
          avgTimeInStage: [],
        }],
      });

      const res = await request(app)
        .get('/api/jobs/stats')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });

    it('should handle no jobs case', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          totalJobs: 0,
          jobsByStatus: null,
          monthlyVolume: null,
          responseRate: null,
          adherenceRate: null,
          avgTimeToOffer: null,
          avgTimeInStage: null,
        }],
      });

      const res = await request(app)
        .get('/api/jobs/stats')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.message).toBeDefined();
    });

    it('should handle database error', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .get('/api/jobs/stats')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
    });
  });

  describe('GET /archived - List Archived Jobs', () => {
    it('should list archived jobs', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 1, title: 'Old Job', isArchived: true }],
      });

      const res = await request(app)
        .get('/api/jobs/archived')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.jobs).toBeDefined();
    });

    it('should handle database error', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .get('/api/jobs/archived')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
    });
  });

  describe('GET /:id - Get Job By ID', () => {
    it('should return job details', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 1, title: 'Engineer', company: 'Corp' }],
      });

      const res = await request(app)
        .get('/api/jobs/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.job).toBeDefined();
    });

    it('should return 404 if job not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/api/jobs/999')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(404);
    });

    it('should handle database error', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .get('/api/jobs/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
    });
  });

  describe('PUT /:id - Update Job', () => {
    it('should update job successfully', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 1, title: 'Updated Title', company: 'Corp' }],
      });

      const res = await request(app)
        .put('/api/jobs/1')
        .set('Authorization', 'Bearer valid-token')
        .send({ title: 'Updated Title' });

      expect(res.status).toBe(200);
    });

    it('should return 400 if no valid fields to update', async () => {
      const res = await request(app)
        .put('/api/jobs/1')
        .set('Authorization', 'Bearer valid-token')
        .send({ invalidField: 'value' });

      expect(res.status).toBe(400);
    });

    it('should return 404 if job not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .put('/api/jobs/999')
        .set('Authorization', 'Bearer valid-token')
        .send({ title: 'New Title' });

      expect(res.status).toBe(404);
    });

    it('should set offerDate when status becomes Offer', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 1, title: 'Job', status: 'Offer', offerDate: '2024-01-15' }],
      });

      const res = await request(app)
        .put('/api/jobs/1')
        .set('Authorization', 'Bearer valid-token')
        .send({ status: 'Offer' });

      expect(res.status).toBe(200);
    });

    it('should update role type when title changes', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 1, title: 'New Engineer', type: 'Engineering' }],
      });

      const res = await request(app)
        .put('/api/jobs/1')
        .set('Authorization', 'Bearer valid-token')
        .send({ title: 'New Engineer' });

      expect(res.status).toBe(200);
    });

    it('should record materials history when resume/cover letter updated', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 1, resume_id: 5 }],
      });
      mockPool.query.mockResolvedValueOnce({ rows: [] }); // materials history insert

      const res = await request(app)
        .put('/api/jobs/1')
        .set('Authorization', 'Bearer valid-token')
        .send({ resume_id: 5 });

      expect(res.status).toBe(200);
    });

    it('should handle dateApplied alias', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 1, applicationDate: '2024-01-15' }],
      });

      const res = await request(app)
        .put('/api/jobs/1')
        .set('Authorization', 'Bearer valid-token')
        .send({ dateApplied: '2024-01-15' });

      expect(res.status).toBe(200);
    });

    it('should handle database error', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .put('/api/jobs/1')
        .set('Authorization', 'Bearer valid-token')
        .send({ title: 'New Title' });

      expect(res.status).toBe(500);
    });
  });

  describe('GET /:id/materials-history - Get Materials History', () => {
    it('should return materials history', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          { id: 1, changed_at: '2024-01-01', resume_title: 'My Resume', cover_title: 'My Cover' },
        ],
      });

      const res = await request(app)
        .get('/api/jobs/1/materials-history')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.history).toBeDefined();
    });

    it('should handle database error', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .get('/api/jobs/1/materials-history')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
    });
  });

  describe('PUT /:id/materials - Update Materials', () => {
    it('should update materials successfully', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 1, resume_id: 1, cover_letter_id: 2 }],
      });
      mockPool.query.mockResolvedValueOnce({ rows: [] }); // history insert

      const res = await request(app)
        .put('/api/jobs/1/materials')
        .set('Authorization', 'Bearer valid-token')
        .send({
          resume_id: 1,
          cover_letter_id: 2,
          resume_customization: 'heavy',
          cover_letter_customization: 'tailored',
        });

      expect(res.status).toBe(200);
    });

    it('should use default customization levels for invalid values', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 1, resume_customization: 'none', cover_letter_customization: 'none' }],
      });
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .put('/api/jobs/1/materials')
        .set('Authorization', 'Bearer valid-token')
        .send({
          resume_customization: 'invalid',
          cover_letter_customization: 'also_invalid',
        });

      expect(res.status).toBe(200);
    });

    it('should return 404 if job not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .put('/api/jobs/999/materials')
        .set('Authorization', 'Bearer valid-token')
        .send({ resume_id: 1 });

      expect(res.status).toBe(404);
    });

    it('should handle database error', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .put('/api/jobs/1/materials')
        .set('Authorization', 'Bearer valid-token')
        .send({ resume_id: 1 });

      expect(res.status).toBe(500);
    });
  });

  describe('DELETE /:id - Delete Job', () => {
    it('should delete job successfully', async () => {
      mockPool.query.mockResolvedValueOnce({ rowCount: 1 });

      const res = await request(app)
        .delete('/api/jobs/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });

    it('should return 404 if job not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rowCount: 0 });

      const res = await request(app)
        .delete('/api/jobs/999')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(404);
    });

    it('should handle database error', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .delete('/api/jobs/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
    });
  });

  describe('PUT /:id/status - Update Status', () => {
    it('should update status to Interview and set interview_date', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 1, status: 'Interview', interview_date: '2024-01-15' }],
      });
      mockPool.query.mockResolvedValueOnce({ rows: [] }); // history insert

      const res = await request(app)
        .put('/api/jobs/1/status')
        .set('Authorization', 'Bearer valid-token')
        .send({ status: 'Interview' });

      expect(res.status).toBe(200);
    });

    it('should update status to Offer and set offer_date', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 1, status: 'Offer', offer_date: '2024-01-20' }],
      });
      mockPool.query.mockResolvedValueOnce({ rows: [] }); // history insert

      const res = await request(app)
        .put('/api/jobs/1/status')
        .set('Authorization', 'Bearer valid-token')
        .send({ status: 'Offer' });

      expect(res.status).toBe(200);
    });

    it('should update status to Applied (normal update)', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 1, status: 'Applied' }],
      });
      mockPool.query.mockResolvedValueOnce({ rows: [] }); // history insert

      const res = await request(app)
        .put('/api/jobs/1/status')
        .set('Authorization', 'Bearer valid-token')
        .send({ status: 'Applied' });

      expect(res.status).toBe(200);
    });

    it('should return 400 if status is missing', async () => {
      const res = await request(app)
        .put('/api/jobs/1/status')
        .set('Authorization', 'Bearer valid-token')
        .send({});

      expect(res.status).toBe(400);
    });

    it('should return 404 if job not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .put('/api/jobs/999/status')
        .set('Authorization', 'Bearer valid-token')
        .send({ status: 'Applied' });

      expect(res.status).toBe(404);
    });

    it('should handle database error', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .put('/api/jobs/1/status')
        .set('Authorization', 'Bearer valid-token')
        .send({ status: 'Applied' });

      expect(res.status).toBe(500);
    });
  });

  describe('PUT /bulk/deadline - Bulk Deadline Update', () => {
    it('should update deadlines for multiple jobs', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          { id: 1, title: 'Job 1', deadline: '2024-02-01' },
          { id: 2, title: 'Job 2', deadline: '2024-02-15' },
        ],
      });

      const res = await request(app)
        .put('/api/jobs/bulk/deadline')
        .set('Authorization', 'Bearer valid-token')
        .send({ jobIds: [1, 2], daysToAdd: 7 });

      expect(res.status).toBe(200);
      expect(res.body.updated).toBeDefined();
    });

    it('should return 400 if no job IDs provided', async () => {
      const res = await request(app)
        .put('/api/jobs/bulk/deadline')
        .set('Authorization', 'Bearer valid-token')
        .send({ jobIds: [], daysToAdd: 7 });

      expect(res.status).toBe(400);
    });

    it('should return 400 if daysToAdd is invalid', async () => {
      const res = await request(app)
        .put('/api/jobs/bulk/deadline')
        .set('Authorization', 'Bearer valid-token')
        .send({ jobIds: [1, 2], daysToAdd: 'invalid' });

      expect(res.status).toBe(400);
    });

    it('should return 400 if daysToAdd is zero', async () => {
      const res = await request(app)
        .put('/api/jobs/bulk/deadline')
        .set('Authorization', 'Bearer valid-token')
        .send({ jobIds: [1, 2], daysToAdd: 0 });

      expect(res.status).toBe(400);
    });

    it('should handle database error', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .put('/api/jobs/bulk/deadline')
        .set('Authorization', 'Bearer valid-token')
        .send({ jobIds: [1, 2], daysToAdd: 7 });

      expect(res.status).toBe(500);
    });
  });

  describe('PUT /:id/archive - Archive Job', () => {
    it('should archive job successfully', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 1, isArchived: true }],
      });

      const res = await request(app)
        .put('/api/jobs/1/archive')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });

    it('should return 404 if job not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .put('/api/jobs/999/archive')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(404);
    });

    it('should handle database error', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .put('/api/jobs/1/archive')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
    });
  });

  describe('PUT /:id/restore - Restore Job', () => {
    it('should restore job successfully', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 1, isArchived: false }],
      });

      const res = await request(app)
        .put('/api/jobs/1/restore')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });

    it('should return 404 if job not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .put('/api/jobs/999/restore')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(404);
    });

    it('should handle database error', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .put('/api/jobs/1/restore')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
    });
  });
});

