/**
 * Mock Interviews Routes - Full Coverage Tests
 * File: backend/routes/mockInterviews.js
 */

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import mockInterviewsRouter from '../../routes/mockInterviews.js';

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
  app.use('/api/mock-interviews', mockInterviewsRouter);
});

beforeEach(async () => {
  vi.clearAllMocks();
  const pool = (await import('../../db/pool.js')).default;
  mockQueryFn = pool.query;
});

// ============================================
// TESTS
// ============================================

describe('Mock Interviews Routes - Full Coverage', () => {
  describe('POST /api/mock-interviews/start', () => {
    it('should start a mock interview session', async () => {
      const mockSession = { id: 1, user_id: 1, created_at: '2024-01-01' };

      mockQueryFn.mockResolvedValueOnce({ rows: [mockSession], rowCount: 1 });

      const res = await request(app)
        .post('/api/mock-interviews/start')
        .set('Authorization', 'Bearer valid-token')
        .send({
          job_id: 1,
          interview_type: 'technical',
        });

      expect(res.status).toBe(201);
      expect(res.body.session).toBeDefined();
    });

    it('should return 400 for invalid data', async () => {
      const res = await request(app)
        .post('/api/mock-interviews/start')
        .set('Authorization', 'Bearer valid-token')
        .send({});

      expect(res.status).toBe(400);
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .post('/api/mock-interviews/start')
        .set('Authorization', 'Bearer valid-token')
        .send({
          job_id: 1,
          interview_type: 'technical',
        });

      expect(res.status).toBe(500);
    });
  });

  describe('POST /api/mock-interviews/respond', () => {
    it('should save interview response', async () => {
      const mockResponse = { id: 1, session_id: 1, question_id: 1, response: 'Answer' };

      mockQueryFn.mockResolvedValueOnce({ rows: [mockResponse], rowCount: 1 });

      const res = await request(app)
        .post('/api/mock-interviews/respond')
        .set('Authorization', 'Bearer valid-token')
        .send({
          session_id: 1,
          question_id: 1,
          response: 'Answer',
        });

      expect(res.status).toBe(200);
      expect(res.body.response).toBeDefined();
    });
  });

  describe('GET /api/mock-interviews/:sessionId/next-question', () => {
    it('should get next question', async () => {
      const mockQuestion = { id: 1, question: 'What is your experience?', type: 'behavioral' };

      mockQueryFn.mockResolvedValueOnce({ rows: [mockQuestion] });

      const res = await request(app)
        .get('/api/mock-interviews/1/next-question')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.question).toBeDefined();
    });
  });

  describe('POST /api/mock-interviews/:sessionId/complete', () => {
    it('should complete interview session', async () => {
      const mockSession = { id: 1, user_id: 1, completed: true };

      mockQueryFn
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // Check session
        .mockResolvedValueOnce({ rows: [mockSession], rowCount: 1 }); // Update

      const res = await request(app)
        .post('/api/mock-interviews/1/complete')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.session).toBeDefined();
    });
  });

  describe('GET /api/mock-interviews/user/:userId', () => {
    it('should get user interview sessions', async () => {
      const mockSessions = [
        { id: 1, user_id: 1, interview_type: 'technical' },
        { id: 2, user_id: 1, interview_type: 'behavioral' },
      ];

      mockQueryFn.mockResolvedValueOnce({ rows: mockSessions });

      const res = await request(app)
        .get('/api/mock-interviews/user/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.sessions).toBeDefined();
      expect(res.body.sessions).toHaveLength(2);
    });
  });

  describe('GET /api/mock-interviews/:sessionId/summary', () => {
    it('should get interview summary', async () => {
      const mockSummary = { id: 1, session_id: 1, score: 85, feedback: 'Good performance' };

      mockQueryFn.mockResolvedValueOnce({ rows: [mockSummary] });

      const res = await request(app)
        .get('/api/mock-interviews/1/summary')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.summary).toBeDefined();
    });
  });
});

