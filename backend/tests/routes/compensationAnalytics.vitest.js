/**
 * Compensation Analytics Routes - Full Coverage Tests
 * File: backend/routes/compensationAnalytics.js
 */

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import compensationAnalyticsRouter from '../../routes/compensationAnalytics.js';

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
  app.use('/api/compensation-analytics', compensationAnalyticsRouter);
});

beforeEach(async () => {
  vi.clearAllMocks();
  const pool = (await import('../../db/pool.js')).default;
  mockQueryFn = pool.query;
});

// ============================================
// TESTS
// ============================================

describe('Compensation Analytics Routes - Full Coverage', () => {
  describe('GET /api/compensation-analytics/full', () => {
    it('should return full compensation analytics', async () => {
      const mockOffers = [
        { id: 1, base_salary: 100000, total_comp_year1: 120000, company: 'TechCorp' },
        { id: 2, base_salary: 120000, total_comp_year1: 140000, company: 'Startup' },
      ];

      mockQueryFn
        .mockResolvedValueOnce({ rows: mockOffers }) // Offers
        .mockResolvedValueOnce({ rows: [] }) // Compensation history
        .mockResolvedValueOnce({ rows: [] }); // Negotiation history

      const res = await request(app)
        .get('/api/compensation-analytics/full')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.analytics).toBeDefined();
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .get('/api/compensation-analytics/full')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
    });
  });

  describe('GET /api/compensation-analytics/negotiation-success', () => {
    it('should return negotiation success analytics', async () => {
      const mockOffers = [
        { id: 1, base_salary: 100000, initial_base_salary: 90000, negotiation_attempted: true },
      ];

      mockQueryFn
        .mockResolvedValueOnce({ rows: mockOffers }) // Offers
        .mockResolvedValueOnce({ rows: [] }) // Compensation history
        .mockResolvedValueOnce({ rows: [] }); // Negotiation history

      const res = await request(app)
        .get('/api/compensation-analytics/negotiation-success')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.analytics).toBeDefined();
    });
  });

  describe('GET /api/compensation-analytics/market-comparison/:offerId', () => {
    it('should return market comparison for offer', async () => {
      const mockOffer = { id: 1, base_salary: 100000, role_title: 'Engineer', industry: 'Technology' };
      const mockMarketData = [
        { role_title: 'Engineer', industry: 'Technology', avg_salary: 105000 },
      ];

      mockQueryFn
        .mockResolvedValueOnce({ rows: [mockOffer] }) // Get offer
        .mockResolvedValueOnce({ rows: mockMarketData }) // Market data
        .mockResolvedValueOnce({ rows: [] }); // Additional queries

      const res = await request(app)
        .get('/api/compensation-analytics/market-comparison/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.comparison).toBeDefined();
    });

    it('should return 404 if offer not found', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/api/compensation-analytics/market-comparison/999')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/compensation-analytics/evolution', () => {
    it('should return compensation evolution', async () => {
      const mockOffers = [
        { id: 1, base_salary: 100000, offer_date: '2024-01-01' },
        { id: 2, base_salary: 120000, offer_date: '2024-02-01' },
      ];

      mockQueryFn
        .mockResolvedValueOnce({ rows: mockOffers }) // Offers
        .mockResolvedValueOnce({ rows: [] }) // Compensation history
        .mockResolvedValueOnce({ rows: [] }); // Negotiation history

      const res = await request(app)
        .get('/api/compensation-analytics/evolution')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.evolution).toBeDefined();
    });
  });

  describe('GET /api/compensation-analytics/comprehensive', () => {
    it('should return comprehensive compensation analytics', async () => {
      const mockOffers = [
        { id: 1, base_salary: 100000, total_comp_year1: 120000 },
      ];

      mockQueryFn
        .mockResolvedValueOnce({ rows: mockOffers }) // Offers
        .mockResolvedValueOnce({ rows: [] }) // Compensation history
        .mockResolvedValueOnce({ rows: [] }); // Negotiation history

      const res = await request(app)
        .get('/api/compensation-analytics/comprehensive')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.analytics).toBeDefined();
    });
  });
});

