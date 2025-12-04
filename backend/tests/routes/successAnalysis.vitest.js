/**
 * Success Analysis Routes - Full Coverage Tests
 * File: backend/routes/successAnalysis.js
 */

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import successAnalysisRouter from '../../routes/successAnalysis.js';

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

// ============================================
// SETUP
// ============================================

let app;
let mockQueryFn;

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret';
  
  app = express();
  app.use(express.json());
  app.use('/api/success-analysis', successAnalysisRouter);
});

beforeEach(async () => {
  vi.clearAllMocks();
  const pool = (await import('../../db/pool.js')).default;
  mockQueryFn = pool.query;
});

// ============================================
// TESTS
// ============================================

describe('Success Analysis Routes - Full Coverage', () => {
  describe('GET /api/success-analysis/full', () => {
    it('should return full success analysis', async () => {
      const mockJobs = [
        { id: 1, status: 'Offer', company: 'TechCorp', applied_on: '2024-01-01' },
        { id: 2, status: 'Applied', company: 'Startup', applied_on: '2024-01-02' },
      ];

      mockQueryFn.mockResolvedValueOnce({ rows: mockJobs });

      const res = await request(app)
        .get('/api/success-analysis/full')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.analysis).toBeDefined();
    });

    it('should handle empty jobs', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/api/success-analysis/full')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .get('/api/success-analysis/full')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
    });

    it('should return 401 if no token provided', async () => {
      const res = await request(app)
        .get('/api/success-analysis/full');

      expect(res.status).toBe(401);
    });
  });
});

