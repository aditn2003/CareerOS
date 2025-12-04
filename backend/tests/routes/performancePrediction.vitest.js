/**
 * Performance Prediction Routes - Full Coverage Tests
 * File: backend/routes/performancePrediction.js
 */

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import performancePredictionRouter from '../../routes/performancePrediction.js';

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
    req.userId = 1;
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
  app.use('/api/performance-prediction', performancePredictionRouter);
});

beforeEach(async () => {
  vi.clearAllMocks();
  const pool = (await import('../../db/pool.js')).default;
  mockQueryFn = pool.query;
});

// ============================================
// TESTS
// ============================================

describe('Performance Prediction Routes - Full Coverage', () => {
  describe('GET /api/performance-prediction', () => {
    it('should return performance predictions', async () => {
      const mockJobs = [
        { id: 1, status: 'Applied', company: 'TechCorp', created_at: '2024-01-01' },
        { id: 2, status: 'Interview', company: 'Startup', created_at: '2024-01-02' },
      ];
      const mockSkills = [
        { name: 'JavaScript', category: 'Technical', proficiency: 'Expert' },
      ];
      const mockNetworkingActivities = [
        { id: 1, activity_type: 'LinkedIn', created_at: '2024-01-01' },
      ];
      const mockResearchHistory = [
        { company: 'TechCorp', created_at: '2024-01-01' },
      ];

      mockQueryFn
        .mockResolvedValueOnce({ rows: mockJobs }) // Jobs
        .mockResolvedValueOnce({ rows: mockSkills }) // Skills
        .mockResolvedValueOnce({ rows: mockNetworkingActivities }) // Networking activities
        .mockResolvedValueOnce({ rows: mockResearchHistory }); // Research history

      const res = await request(app)
        .get('/api/performance-prediction')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.predictions).toBeDefined();
    });

    it('should handle missing skills table', async () => {
      const mockJobs = [
        { id: 1, status: 'Applied', company: 'TechCorp' },
      ];

      mockQueryFn
        .mockResolvedValueOnce({ rows: mockJobs })
        .mockRejectedValueOnce(new Error('Table does not exist')) // Skills
        .mockResolvedValueOnce({ rows: [] }) // Networking activities
        .mockResolvedValueOnce({ rows: [] }); // Research history

      const res = await request(app)
        .get('/api/performance-prediction')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });

    it('should handle activity level parameter', async () => {
      const mockJobs = [
        { id: 1, status: 'Applied', company: 'TechCorp' },
      ];

      mockQueryFn
        .mockResolvedValueOnce({ rows: mockJobs })
        .mockResolvedValueOnce({ rows: [] }) // Skills
        .mockResolvedValueOnce({ rows: [] }) // Networking activities
        .mockResolvedValueOnce({ rows: [] }); // Research history

      const res = await request(app)
        .get('/api/performance-prediction?activityLevel=high')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .get('/api/performance-prediction')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
    });

    it('should return 401 if no token provided', async () => {
      const res = await request(app)
        .get('/api/performance-prediction');

      expect(res.status).toBe(401);
    });
  });
});

