/**
 * Salary Negotiation Routes - Full Coverage Tests
 * File: backend/routes/salaryNegotiation.js
 */

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import salaryNegotiationRouter from '../../routes/salaryNegotiation.js';

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
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
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

vi.mock('axios', () => ({
  default: {
    get: vi.fn(() => Promise.resolve({ data: { average: 110000 } })),
  },
}));

vi.mock('openai', () => ({
  default: {
    chat: {
      completions: {
        create: vi.fn(() => Promise.resolve({
          choices: [{
            message: {
              content: JSON.stringify({
                strategies: ['Negotiate base salary'],
                scripts: ['Thank you for the offer...'],
              }),
            },
          }],
        })),
      },
    },
  },
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
  process.env.OPENAI_API_KEY = 'test-key';
  
  app = express();
  app.use(express.json());
  app.use('/api/salary-negotiation', salaryNegotiationRouter);
});

beforeEach(async () => {
  vi.clearAllMocks();
  const pool = (await import('../../db/pool.js')).default;
  mockQueryFn = pool.query;
});

// ============================================
// TESTS
// ============================================

describe('Salary Negotiation Routes - Full Coverage', () => {
  describe('POST /api/salary-negotiation/generate', () => {
    it('should generate negotiation package', async () => {
      const res = await request(app)
        .post('/api/salary-negotiation/generate')
        .set('Authorization', 'Bearer valid-token')
        .send({
          company: 'TechCorp',
          role: 'Engineer',
          location: 'San Francisco',
          offerAmount: 100000,
        });

      expect(res.status).toBe(200);
      expect(res.body.package).toBeDefined();
    });

    it('should return 400 for missing company', async () => {
      const res = await request(app)
        .post('/api/salary-negotiation/generate')
        .set('Authorization', 'Bearer valid-token')
        .send({
          role: 'Engineer',
        });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/salary-negotiation/list', () => {
    it('should list negotiation packages', async () => {
      const res = await request(app)
        .get('/api/salary-negotiation/list?userId=1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.packages).toBeDefined();
    });
  });

  describe('GET /api/salary-negotiation/:id', () => {
    it('should get negotiation package by id', async () => {
      const res = await request(app)
        .get('/api/salary-negotiation/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.package).toBeDefined();
    });
  });

  describe('PUT /api/salary-negotiation/:id/update', () => {
    it('should update negotiation package', async () => {
      const res = await request(app)
        .put('/api/salary-negotiation/1/update')
        .set('Authorization', 'Bearer valid-token')
        .send({
          targetSalary: 120000,
        });

      expect(res.status).toBe(200);
    });
  });

  describe('PUT /api/salary-negotiation/:id/outcome', () => {
    it('should update negotiation outcome', async () => {
      const res = await request(app)
        .put('/api/salary-negotiation/1/outcome')
        .set('Authorization', 'Bearer valid-token')
        .send({
          outcome: 'accepted',
          finalSalary: 115000,
        });

      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/salary-negotiation/stats', () => {
    it('should get negotiation statistics', async () => {
      const res = await request(app)
        .get('/api/salary-negotiation/stats?userId=1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.stats).toBeDefined();
    });
  });

  describe('DELETE /api/salary-negotiation/:id', () => {
    it('should delete negotiation package', async () => {
      const res = await request(app)
        .delete('/api/salary-negotiation/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });
  });
});

