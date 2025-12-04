/**
 * Job Descriptions Routes - Full Coverage Tests
 * File: backend/routes/jobDescriptions.js
 */

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import jobDescriptionsRouter from '../../routes/jobDescriptions.js';

// ============================================
// MOCKS
// ============================================

// Create mock query function using a getter to avoid hoisting issues
let mockQueryFn;

vi.mock('pg', () => {
  // Create the mock function inside the factory
  const queryFn = vi.fn();
  // Store reference in global to access from tests
  if (typeof globalThis !== 'undefined') {
    globalThis.__jobDescriptionsMockQueryFn = queryFn;
  }
  
  const mockPool = {
    query: queryFn,
  };
  // Create a proper constructor function
  function MockPool() {
    return mockPool;
  }
  return {
    default: {
      Pool: MockPool,
    },
    Pool: MockPool,
  };
});

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

beforeAll(() => {
  // Initialize mockQueryFn after mocks are set up
  mockQueryFn = globalThis.__jobDescriptionsMockQueryFn || vi.fn();
  
  process.env.JWT_SECRET = 'test-secret';
  
  app = express();
  app.use(express.json());
  app.use('/api', jobDescriptionsRouter);
});

beforeEach(() => {
  // Ensure mockQueryFn is available
  if (!mockQueryFn) {
    mockQueryFn = globalThis.__jobDescriptionsMockQueryFn || vi.fn();
  }
  vi.clearAllMocks();
  // Re-assign after clearing to ensure it's still available
  mockQueryFn = globalThis.__jobDescriptionsMockQueryFn || vi.fn();
});

// ============================================
// TESTS
// ============================================

describe('Job Descriptions Routes - Full Coverage', () => {
  describe('POST /api/job-descriptions', () => {
    it('should save job description', async () => {
      const mockJobDesc = {
        id: 1,
        user_id: 1,
        content: 'We are looking for a software engineer...',
        created_at: '2024-01-01',
      };

      mockQueryFn.mockResolvedValueOnce({ rows: [mockJobDesc], rowCount: 1 });

      const res = await request(app)
        .post('/api/job-descriptions')
        .set('Authorization', 'Bearer valid-token')
        .send({
          content: 'We are looking for a software engineer...',
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('✅ Job description saved');
      expect(res.body.jobDescription).toEqual(mockJobDesc);
    });

    it('should return 400 if content empty', async () => {
      const res = await request(app)
        .post('/api/job-descriptions')
        .set('Authorization', 'Bearer valid-token')
        .send({
          content: '',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Job description cannot be empty');
    });

    it('should return 400 if content only whitespace', async () => {
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
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .post('/api/job-descriptions')
        .set('Authorization', 'Bearer valid-token')
        .send({
          content: 'Job description content',
        });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Database error');
    });
  });

  describe('GET /api/job-descriptions', () => {
    it('should return all job descriptions', async () => {
      const mockJobDescs = [
        { id: 1, content: 'Job description 1', created_at: '2024-01-01' },
        { id: 2, content: 'Job description 2', created_at: '2024-01-02' },
      ];

      mockQueryFn.mockResolvedValueOnce({ rows: mockJobDescs, rowCount: 2 });

      const res = await request(app)
        .get('/api/job-descriptions')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.jobDescriptions).toEqual(mockJobDescs);
    });

    it('should return empty array when no descriptions', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = await request(app)
        .get('/api/job-descriptions')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.jobDescriptions).toEqual([]);
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .get('/api/job-descriptions')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Database error');
    });
  });
});

