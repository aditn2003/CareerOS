/**
 * Response Coaching Routes - Full Coverage Tests
 * File: backend/routes/responseCoaching.js
 */

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import responseCoachingRouter from '../../routes/responseCoaching.js';

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

vi.mock('openai', () => ({
  default: {
    chat: {
      completions: {
        create: vi.fn(() => Promise.resolve({
          choices: [{
            message: {
              content: JSON.stringify({
                score: 85,
                feedback: 'Good response',
                improvements: ['Add more detail'],
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
  process.env.OPENAI_API_KEY = 'test-key';
  
  app = express();
  app.use(express.json());
  app.use('/api/response-coaching', responseCoachingRouter);
});

beforeEach(async () => {
  vi.clearAllMocks();
  const pool = (await import('../../db/pool.js')).default;
  mockQueryFn = pool.query;
});

// ============================================
// TESTS
// ============================================

describe('Response Coaching Routes - Full Coverage', () => {
  describe('POST /api/response-coaching/analyze', () => {
    it('should analyze interview response', async () => {
      const res = await request(app)
        .post('/api/response-coaching/analyze')
        .set('Authorization', 'Bearer valid-token')
        .send({
          question: 'Tell me about yourself',
          response: 'I am a software engineer with 5 years of experience',
          question_type: 'behavioral',
        });

      expect(res.status).toBe(200);
      expect(res.body.analysis).toBeDefined();
    });

    it('should return 400 for missing data', async () => {
      const res = await request(app)
        .post('/api/response-coaching/analyze')
        .set('Authorization', 'Bearer valid-token')
        .send({
          question: 'Tell me about yourself',
          // Missing response
        });

      expect(res.status).toBe(400);
    });

    it('should save analysis to database', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 });

      const res = await request(app)
        .post('/api/response-coaching/analyze')
        .set('Authorization', 'Bearer valid-token')
        .send({
          question: 'Tell me about yourself',
          response: 'I am a software engineer',
          question_type: 'behavioral',
        });

      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/response-coaching/history/:questionId', () => {
    it('should get response history for question', async () => {
      const mockHistory = [
        { id: 1, question_id: 1, response: 'Answer 1', score: 80 },
        { id: 2, question_id: 1, response: 'Answer 2', score: 85 },
      ];

      mockQueryFn.mockResolvedValueOnce({ rows: mockHistory });

      const res = await request(app)
        .get('/api/response-coaching/history/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.history).toBeDefined();
      expect(res.body.history).toHaveLength(2);
    });
  });

  describe('GET /api/response-coaching/stats', () => {
    it('should get coaching statistics', async () => {
      const mockStats = {
        total_responses: 10,
        avg_score: 82.5,
        improvement_trend: 'positive',
      };

      mockQueryFn.mockResolvedValueOnce({ rows: [{ count: 10 }] });
      mockQueryFn.mockResolvedValueOnce({ rows: [{ avg: 82.5 }] });

      const res = await request(app)
        .get('/api/response-coaching/stats')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.stats).toBeDefined();
    });
  });
});

