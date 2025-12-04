/**
 * Success Patterns Routes - Full Coverage Tests
 * File: backend/routes/successPatterns.js
 */

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import successPatternsRouter from '../../routes/successPatterns.js';

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
  app.use('/api/success-patterns', successPatternsRouter);
});

beforeEach(async () => {
  vi.clearAllMocks();
  const pool = (await import('../../db/pool.js')).default;
  mockQueryFn = pool.query;
});

// ============================================
// TESTS
// ============================================

describe('Success Patterns Routes - Full Coverage', () => {
  describe('GET /api/success-patterns', () => {
    it('should return success patterns', async () => {
      const mockJobs = [
        { id: 1, title: 'Engineer', company: 'TechCorp', industry: 'Technology', status: 'Offer', applied_on: '2024-01-01' },
        { id: 2, title: 'Developer', company: 'Startup', industry: 'Technology', status: 'Applied', applied_on: '2024-01-02' },
      ];
      const mockNetworkingActivities = [
        { id: 1, activity_type: 'LinkedIn', created_at: '2024-01-01' },
      ];
      const mockResearchHistory = [
        { company: 'TechCorp', created_at: '2024-01-01' },
      ];

      mockQueryFn
        .mockResolvedValueOnce({ rows: mockJobs }) // Jobs
        .mockResolvedValueOnce({ rows: mockNetworkingActivities }) // Networking activities
        .mockResolvedValueOnce({ rows: mockResearchHistory }); // Research history

      const res = await request(app)
        .get('/api/success-patterns')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.patterns).toBeDefined();
    });

    it('should handle missing networking activities table', async () => {
      const mockJobs = [
        { id: 1, title: 'Engineer', company: 'TechCorp', status: 'Applied' },
      ];

      mockQueryFn
        .mockResolvedValueOnce({ rows: mockJobs })
        .mockRejectedValueOnce(new Error('Table does not exist')) // Networking activities
        .mockResolvedValueOnce({ rows: [] }); // Research history

      const res = await request(app)
        .get('/api/success-patterns')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });

    it('should handle missing research history', async () => {
      const mockJobs = [
        { id: 1, title: 'Engineer', company: 'TechCorp', status: 'Applied' },
      ];

      mockQueryFn
        .mockResolvedValueOnce({ rows: mockJobs })
        .mockResolvedValueOnce({ rows: [] }) // Networking activities
        .mockRejectedValueOnce(new Error('Table does not exist')); // Research history

      const res = await request(app)
        .get('/api/success-patterns')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });

    it('should analyze industry patterns', async () => {
      const mockJobs = [
        { id: 1, title: 'Engineer', company: 'TechCorp', industry: 'Technology', status: 'Offer' },
        { id: 2, title: 'Developer', company: 'Startup', industry: 'Technology', status: 'Applied' },
      ];

      mockQueryFn
        .mockResolvedValueOnce({ rows: mockJobs })
        .mockResolvedValueOnce({ rows: [] }) // Networking activities
        .mockResolvedValueOnce({ rows: [] }); // Research history

      const res = await request(app)
        .get('/api/success-patterns')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.patterns.industryPatterns).toBeDefined();
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .get('/api/success-patterns')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
    });

    it('should return 401 if no token provided', async () => {
      const res = await request(app)
        .get('/api/success-patterns');

      expect(res.status).toBe(401);
    });
  });
});

