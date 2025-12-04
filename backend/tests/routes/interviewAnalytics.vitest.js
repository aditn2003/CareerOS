/**
 * Interview Analytics Routes - Full Coverage Tests
 * File: backend/routes/interviewAnalytics.js
 */

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import interviewAnalyticsRouter from '../../routes/interviewAnalytics.js';

// ============================================
// MOCKS
// ============================================

vi.mock('../../db/pool.js', () => ({
  default: {
    query: vi.fn(),
  },
}));

vi.mock('../../auth.js', () => ({
  auth: vi.fn((req, res, next) => {
    const h = req.headers.authorization || "";
    const token = h.startsWith("Bearer ") ? h.split(" ")[1]?.trim() : null;
    if (!token) {
      return res.status(401).json({ error: "NO_TOKEN" });
    }
    req.user = { id: 1 };
    next();
  }),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => Promise.resolve({ data: [{ id: 1 }], error: null })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => Promise.resolve({ data: [{ id: 1 }], error: null })),
        })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => Promise.resolve({ data: [{ id: 1 }], error: null })),
        })),
      })),
    })),
  })),
}));

// ============================================
// SETUP
// ============================================

let app;
let mockQueryFn;

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret';
  process.env.SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_ANON_KEY = 'test-key';
  
  app = express();
  app.use(express.json());
  app.use('/api/interview-analytics', interviewAnalyticsRouter);
});

beforeEach(async () => {
  vi.clearAllMocks();
  const pool = (await import('../../db/pool.js')).default;
  mockQueryFn = pool.query;
});

// ============================================
// TESTS
// ============================================

describe('Interview Analytics Routes - Full Coverage', () => {
  describe('GET /api/interview-analytics/analytics', () => {
    it('should return interview analytics', async () => {
      const mockJobs = [
        { id: 1, status: 'Interview', company: 'TechCorp' },
        { id: 2, status: 'Offer', company: 'Startup' },
      ];

      mockQueryFn.mockResolvedValueOnce({ rows: mockJobs });

      const res = await request(app)
        .get('/api/interview-analytics/analytics')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.analytics).toBeDefined();
    });

    it('should handle empty data', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/api/interview-analytics/analytics')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/interview-analytics/outcome', () => {
    it('should create interview outcome', async () => {
      const res = await request(app)
        .post('/api/interview-analytics/outcome')
        .set('Authorization', 'Bearer valid-token')
        .send({
          job_id: 1,
          company: 'TechCorp',
          interview_date: '2024-01-01',
          outcome: 'positive',
        });

      expect(res.status).toBe(201);
      expect(res.body.outcome).toBeDefined();
    });

    it('should return 400 for invalid data', async () => {
      const res = await request(app)
        .post('/api/interview-analytics/outcome')
        .set('Authorization', 'Bearer valid-token')
        .send({
          // Missing required fields
        });

      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/interview-analytics/outcome/:id', () => {
    it('should update interview outcome', async () => {
      const res = await request(app)
        .put('/api/interview-analytics/outcome/1')
        .set('Authorization', 'Bearer valid-token')
        .send({
          outcome: 'positive',
        });

      expect(res.status).toBe(200);
      expect(res.body.outcome).toBeDefined();
    });
  });

  describe('DELETE /api/interview-analytics/outcome/:id', () => {
    it('should delete interview outcome', async () => {
      const res = await request(app)
        .delete('/api/interview-analytics/outcome/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/interview-analytics/outcomes', () => {
    it('should get all interview outcomes', async () => {
      const res = await request(app)
        .get('/api/interview-analytics/outcomes')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.outcomes).toBeDefined();
    });
  });
});

