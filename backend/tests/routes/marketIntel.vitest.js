/**
 * Market Intel Routes - Full Coverage Tests
 * File: backend/routes/marketIntel.js
 */

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import marketIntelRouter from '../../routes/marketIntel.js';

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
  app.use('/api/market-intel', marketIntelRouter);
});

beforeEach(async () => {
  vi.clearAllMocks();
  const pool = (await import('../../db/pool.js')).default;
  mockQueryFn = pool.query;
});

// ============================================
// TESTS
// ============================================

describe('Market Intel Routes - Full Coverage', () => {
  describe('GET /api/market-intel', () => {
    it('should return market intelligence data', async () => {
      const mockUser = { id: 1, first_name: 'John', last_name: 'Doe', email: 'test@example.com' };
      const mockJobs = [
        { id: 1, title: 'Engineer', company: 'TechCorp', status: 'Applied', applied_on: '2024-01-01' },
        { id: 2, title: 'Developer', company: 'Startup', status: 'Interview', applied_on: '2024-01-02' },
      ];
      const mockInterviewOutcomes = [
        { job_id: 2, company: 'Startup', interview_date: '2024-01-10', outcome: 'positive' },
      ];
      const mockApplicationHistory = [
        { job_id: 1, event: 'Status changed', timestamp: '2024-01-01', from_status: null, to_status: 'Applied' },
      ];

      mockQueryFn
        .mockResolvedValueOnce({ rows: [mockUser] }) // User profile
        .mockResolvedValueOnce({ rows: mockJobs }) // Jobs
        .mockResolvedValueOnce({ rows: mockInterviewOutcomes }) // Interview outcomes
        .mockResolvedValueOnce({ rows: mockApplicationHistory }); // Application history

      const res = await request(app)
        .get('/api/market-intel')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.intel).toBeDefined();
      expect(res.body.intel.profile).toBeDefined();
      expect(res.body.intel.jobs).toBeDefined();
    });

    it('should handle missing interview outcomes table', async () => {
      const mockUser = { id: 1, first_name: 'John', last_name: 'Doe', email: 'test@example.com' };
      const mockJobs = [
        { id: 1, title: 'Engineer', company: 'TechCorp', status: 'Applied' },
      ];

      mockQueryFn
        .mockResolvedValueOnce({ rows: [mockUser] })
        .mockResolvedValueOnce({ rows: mockJobs })
        .mockRejectedValueOnce(new Error('Table does not exist')) // Interview outcomes
        .mockResolvedValueOnce({ rows: [] }); // Application history

      const res = await request(app)
        .get('/api/market-intel')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.intel).toBeDefined();
    });

    it('should handle missing application history table', async () => {
      const mockUser = { id: 1, first_name: 'John', last_name: 'Doe', email: 'test@example.com' };
      const mockJobs = [
        { id: 1, title: 'Engineer', company: 'TechCorp', status: 'Applied' },
      ];

      mockQueryFn
        .mockResolvedValueOnce({ rows: [mockUser] })
        .mockResolvedValueOnce({ rows: mockJobs })
        .mockResolvedValueOnce({ rows: [] }) // Interview outcomes
        .mockRejectedValueOnce(new Error('Table does not exist')); // Application history

      const res = await request(app)
        .get('/api/market-intel')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.intel).toBeDefined();
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .get('/api/market-intel')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
    });

    it('should return 401 if no token provided', async () => {
      const res = await request(app)
        .get('/api/market-intel');

      expect(res.status).toBe(401);
    });
  });
});

