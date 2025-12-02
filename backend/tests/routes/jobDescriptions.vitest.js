/**
 * Job Descriptions Routes - 90%+ Coverage Tests
 * Tests for backend/routes/jobDescriptions.js
 */

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// ============================================
// MOCKS
// ============================================

const mockQuery = vi.fn();

vi.mock('pg', () => {
  return {
    Pool: class {
      query = mockQuery;
      connect = () => Promise.resolve({ query: mockQuery, release: vi.fn() });
      on = vi.fn();
    },
  };
});

vi.mock('jsonwebtoken', () => ({
  default: {
    verify: vi.fn((token) => {
      if (token === 'valid-token') return { id: 1, email: 'test@example.com' };
      throw new Error('Invalid token');
    }),
    sign: vi.fn(() => 'mock-token'),
  },
}));

// Mock data
const mockJobDescription = {
  id: 1,
  user_id: 1,
  content: 'Looking for a skilled software engineer with 5+ years of experience...',
  created_at: new Date().toISOString(),
};

// ============================================
// TESTS
// ============================================

describe('Job Descriptions Routes - 90%+ Coverage', () => {
  let app;
  let jobDescriptionsRouter;

  beforeAll(async () => {
    const module = await import('../../routes/jobDescriptions.js');
    jobDescriptionsRouter = module.default;
    
    app = express();
    app.use(express.json());
    app.use('/api', jobDescriptionsRouter);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ========================================
  // POST /job-descriptions - Save description
  // ========================================
  describe('POST /api/job-descriptions', () => {
    it('should save job description successfully', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockJobDescription], rowCount: 1 });

      const res = await request(app)
        .post('/api/job-descriptions')
        .set('Authorization', 'Bearer valid-token')
        .send({
          content: 'Looking for a skilled software engineer...',
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('✅ Job description saved');
      expect(res.body.jobDescription).toBeDefined();
    });

    it('should return 400 if content is missing', async () => {
      const res = await request(app)
        .post('/api/job-descriptions')
        .set('Authorization', 'Bearer valid-token')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Job description cannot be empty');
    });

    it('should return 400 if content is empty string', async () => {
      const res = await request(app)
        .post('/api/job-descriptions')
        .set('Authorization', 'Bearer valid-token')
        .send({
          content: '',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Job description cannot be empty');
    });

    it('should return 400 if content is whitespace only', async () => {
      const res = await request(app)
        .post('/api/job-descriptions')
        .set('Authorization', 'Bearer valid-token')
        .send({
          content: '   ',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Job description cannot be empty');
    });

    it('should return 500 on database error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .post('/api/job-descriptions')
        .set('Authorization', 'Bearer valid-token')
        .send({
          content: 'Job description content',
        });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Database error');
    });

    it('should return 401 without token', async () => {
      const res = await request(app)
        .post('/api/job-descriptions')
        .send({
          content: 'Content',
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('No token');
    });

    it('should return 401 with invalid token', async () => {
      const res = await request(app)
        .post('/api/job-descriptions')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          content: 'Content',
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid token');
    });
  });

  // ========================================
  // GET /job-descriptions - Get all descriptions
  // ========================================
  describe('GET /api/job-descriptions', () => {
    it('should return all job descriptions for user', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockJobDescription], rowCount: 1 });

      const res = await request(app)
        .get('/api/job-descriptions')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.jobDescriptions).toBeDefined();
      expect(Array.isArray(res.body.jobDescriptions)).toBe(true);
    });

    it('should return empty array if no descriptions', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = await request(app)
        .get('/api/job-descriptions')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.jobDescriptions).toEqual([]);
    });

    it('should return 500 on database error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .get('/api/job-descriptions')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Database error');
    });

    it('should return 401 without token', async () => {
      const res = await request(app)
        .get('/api/job-descriptions');

      expect(res.status).toBe(401);
    });
  });
});

