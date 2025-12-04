/**
 * Interview Insights Routes - Full Coverage Tests
 * File: backend/routes/interviewInsights.js
 */

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import interviewInsightsRouter from '../../routes/interviewInsights.js';

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
  app.use('/api/interview-insights', interviewInsightsRouter);
});

beforeEach(async () => {
  vi.clearAllMocks();
  const pool = (await import('../../db/pool.js')).default;
  mockQueryFn = pool.query;
});

// ============================================
// TESTS
// ============================================

describe('Interview Insights Routes - Full Coverage', () => {
  describe('GET /api/interview-insights', () => {
    it('should return interview insights', async () => {
      const res = await request(app)
        .get('/api/interview-insights')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.insights).toBeDefined();
    });
  });

  describe('GET /api/interview-insights/questions', () => {
    it('should return interview questions', async () => {
      const res = await request(app)
        .get('/api/interview-insights/questions')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.questions).toBeDefined();
    });
  });

  describe('POST /api/interview-insights/questions/practice', () => {
    it('should save practice question response', async () => {
      const res = await request(app)
        .post('/api/interview-insights/questions/practice')
        .set('Authorization', 'Bearer valid-token')
        .send({
          question_id: 1,
          response: 'My answer',
        });

      expect(res.status).toBe(200);
      expect(res.body.practice).toBeDefined();
    });
  });

  describe('GET /api/interview-insights/questions/practiced', () => {
    it('should get practiced questions', async () => {
      const res = await request(app)
        .get('/api/interview-insights/questions/practiced')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.questions).toBeDefined();
    });
  });

  describe('GET /api/interview-insights/questions/stats', () => {
    it('should get question practice statistics', async () => {
      const res = await request(app)
        .get('/api/interview-insights/questions/stats')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.stats).toBeDefined();
    });
  });

  describe('DELETE /api/interview-insights/questions/practice/:questionId', () => {
    it('should delete practice question', async () => {
      const res = await request(app)
        .delete('/api/interview-insights/questions/practice/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/interview-insights/checklist/toggle', () => {
    it('should toggle checklist item', async () => {
      const res = await request(app)
        .post('/api/interview-insights/checklist/toggle')
        .set('Authorization', 'Bearer valid-token')
        .send({
          item_id: 1,
          completed: true,
        });

      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/interview-insights/checklist/status', () => {
    it('should get checklist status', async () => {
      const res = await request(app)
        .get('/api/interview-insights/checklist/status')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.checklist).toBeDefined();
    });
  });

  describe('GET /api/interview-insights/checklist/stats', () => {
    it('should get checklist statistics', async () => {
      const res = await request(app)
        .get('/api/interview-insights/checklist/stats')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.stats).toBeDefined();
    });
  });

  describe('DELETE /api/interview-insights/checklist/regenerate', () => {
    it('should regenerate checklist', async () => {
      const res = await request(app)
        .delete('/api/interview-insights/checklist/regenerate')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/interview-insights/follow-up/generate', () => {
    it('should generate follow-up message', async () => {
      const res = await request(app)
        .post('/api/interview-insights/follow-up/generate')
        .set('Authorization', 'Bearer valid-token')
        .send({
          interview_id: 1,
          template_type: 'thank_you',
        });

      expect(res.status).toBe(200);
      expect(res.body.followUp).toBeDefined();
    });
  });

  describe('GET /api/interview-insights/follow-up/templates', () => {
    it('should get follow-up templates', async () => {
      const res = await request(app)
        .get('/api/interview-insights/follow-up/templates')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.templates).toBeDefined();
    });
  });

  describe('GET /api/interview-insights/follow-up/stats', () => {
    it('should get follow-up statistics', async () => {
      const res = await request(app)
        .get('/api/interview-insights/follow-up/stats')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.stats).toBeDefined();
    });
  });
});

