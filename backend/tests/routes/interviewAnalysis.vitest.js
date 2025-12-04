/**
 * Interview Analysis Routes - Full Coverage Tests
 * File: backend/routes/interviewAnalysis.js
 */

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import interviewAnalysisRouter from '../../routes/interviewAnalysis.js';

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
      select: vi.fn(() => Promise.resolve({ data: [], error: null })),
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
  app.use('/api/interview-analysis', interviewAnalysisRouter);
});

beforeEach(async () => {
  vi.clearAllMocks();
  const pool = (await import('../../db/pool.js')).default;
  mockQueryFn = pool.query;
});

// ============================================
// TESTS
// ============================================

describe('Interview Analysis Routes - Full Coverage', () => {
  describe('GET /api/interview-analysis/full', () => {
    it('should return full interview analysis', async () => {
      const mockJobs = [
        { id: 1, company: 'TechCorp', industry: 'Technology', status: 'Interview' },
      ];
      const mockInterviewOutcomes = [
        { job_id: 1, company: 'TechCorp', interview_date: '2024-01-01', outcome: 'positive' },
      ];

      mockQueryFn
        .mockResolvedValueOnce({ rows: mockJobs })
        .mockResolvedValueOnce({ rows: mockInterviewOutcomes });

      const res = await request(app)
        .get('/api/interview-analysis/full')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.analysis).toBeDefined();
    });

    it('should handle empty data', async () => {
      mockQueryFn
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/api/interview-analysis/full')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .get('/api/interview-analysis/full')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
    });

    it('should return 401 if no token provided', async () => {
      const res = await request(app)
        .get('/api/interview-analysis/full');

      expect(res.status).toBe(401);
    });
  });
});

