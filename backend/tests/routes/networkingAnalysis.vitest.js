/**
 * Networking Analysis Routes - Full Coverage Tests
 * File: backend/routes/networkingAnalysis.js
 */

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import networkingAnalysisRouter from '../../routes/networkingAnalysis.js';

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
  app.use('/api/networking-analysis', networkingAnalysisRouter);
});

beforeEach(async () => {
  vi.clearAllMocks();
  const pool = (await import('../../db/pool.js')).default;
  mockQueryFn = pool.query;
});

// ============================================
// TESTS
// ============================================

describe('Networking Analysis Routes - Full Coverage', () => {
  describe('GET /api/networking-analysis/full', () => {
    it('should return full networking analysis', async () => {
      const mockContacts = [
        { id: 1, first_name: 'John', last_name: 'Doe', company: 'TechCorp' },
      ];
      const mockEvents = [
        { id: 1, event_name: 'Meetup', event_date: '2024-01-01' },
      ];
      const mockActivities = [
        { id: 1, activity_type: 'LinkedIn', created_at: '2024-01-01' },
      ];

      mockQueryFn
        .mockResolvedValueOnce({ rows: mockContacts })
        .mockResolvedValueOnce({ rows: mockEvents })
        .mockResolvedValueOnce({ rows: mockActivities });

      const res = await request(app)
        .get('/api/networking-analysis/full')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.analysis).toBeDefined();
    });

    it('should handle missing tables gracefully', async () => {
      mockQueryFn
        .mockResolvedValueOnce({ rows: [] })
        .mockRejectedValueOnce(new Error('Table does not exist'))
        .mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/api/networking-analysis/full')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .get('/api/networking-analysis/full')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
    });
  });
});

