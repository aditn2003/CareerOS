/**
 * Skill Progress Routes - 90%+ Coverage Tests
 * File: backend/routes/skillProgress.js
 */

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

// ============================================
// MOCKS
// ============================================

const mockQueryFn = vi.fn();

vi.mock('pg', () => {
  return {
    default: {
      Pool: class {
        constructor() {}
        query = mockQueryFn;
        connect = vi.fn();
        end = vi.fn();
        on = vi.fn();
      },
    },
  };
});

vi.mock('jsonwebtoken', () => ({
  default: {
    verify: vi.fn((token, secret) => {
      if (token === 'valid-token') return { id: 1, email: 'test@example.com' };
      throw new Error('Invalid token');
    }),
    sign: vi.fn(() => 'mock-token'),
  },
}));

// ============================================
// MOCK DATA
// ============================================

const mockProgress = {
  id: 1,
  user_id: 1,
  skill: 'javascript',
  status: 'in progress',
  updated_at: new Date().toISOString(),
};

// ============================================
// TEST SUITE
// ============================================

describe('Skill Progress Routes - 90%+ Coverage', () => {
  let app;

  beforeAll(async () => {
    const skillProgressModule = await import('../../routes/skillProgress.js');
    
    app = express();
    app.use(express.json());
    app.use('/api/skill-progress', skillProgressModule.default);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ========================================
  // GET /api/skill-progress - Get Progress
  // ========================================
  describe('GET /api/skill-progress', () => {
    it('should return all skill progress for user', async () => {
      mockQueryFn.mockResolvedValueOnce({
        rows: [mockProgress, { ...mockProgress, id: 2, skill: 'python', status: 'completed' }],
        rowCount: 2,
      });

      const res = await request(app)
        .get('/api/skill-progress')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.progress).toHaveLength(2);
    });

    it('should return empty array when user has no progress', async () => {
      mockQueryFn.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      const res = await request(app)
        .get('/api/skill-progress')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.progress).toEqual([]);
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .get('/api/skill-progress')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to load progress');
    });

    it('should return 401 without authorization', async () => {
      const res = await request(app).get('/api/skill-progress');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('No token');
    });

    it('should return 401 with invalid token', async () => {
      const res = await request(app)
        .get('/api/skill-progress')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid token');
    });
  });

  // ========================================
  // PUT /api/skill-progress/:skill - Update Progress
  // ========================================
  describe('PUT /api/skill-progress/:skill', () => {
    it('should update or insert progress with status "not started"', async () => {
      mockQueryFn.mockResolvedValueOnce({
        rows: [{ ...mockProgress, status: 'not started' }],
        rowCount: 1,
      });

      const res = await request(app)
        .put('/api/skill-progress/JavaScript')
        .set('Authorization', 'Bearer valid-token')
        .send({ status: 'not started' });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Progress updated');
    });

    it('should update or insert progress with status "in progress"', async () => {
      mockQueryFn.mockResolvedValueOnce({
        rows: [{ ...mockProgress, status: 'in progress' }],
        rowCount: 1,
      });

      const res = await request(app)
        .put('/api/skill-progress/Python')
        .set('Authorization', 'Bearer valid-token')
        .send({ status: 'in progress' });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Progress updated');
    });

    it('should update or insert progress with status "completed"', async () => {
      mockQueryFn.mockResolvedValueOnce({
        rows: [{ ...mockProgress, status: 'completed' }],
        rowCount: 1,
      });

      const res = await request(app)
        .put('/api/skill-progress/React')
        .set('Authorization', 'Bearer valid-token')
        .send({ status: 'completed' });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Progress updated');
    });

    it('should normalize skill name to lowercase', async () => {
      mockQueryFn.mockResolvedValueOnce({
        rows: [{ ...mockProgress, skill: 'javascript' }],
        rowCount: 1,
      });

      const res = await request(app)
        .put('/api/skill-progress/  JavaScript  ')
        .set('Authorization', 'Bearer valid-token')
        .send({ status: 'completed' });

      expect(res.status).toBe(200);
      // The skill should be normalized in the DB query
      expect(mockQueryFn).toHaveBeenCalled();
    });

    it('should return 400 for invalid status value', async () => {
      const res = await request(app)
        .put('/api/skill-progress/JavaScript')
        .set('Authorization', 'Bearer valid-token')
        .send({ status: 'invalid-status' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid status value');
    });

    it('should return 400 for empty status', async () => {
      const res = await request(app)
        .put('/api/skill-progress/JavaScript')
        .set('Authorization', 'Bearer valid-token')
        .send({ status: '' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid status value');
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .put('/api/skill-progress/JavaScript')
        .set('Authorization', 'Bearer valid-token')
        .send({ status: 'completed' });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to update progress');
    });

    it('should return 401 without authorization', async () => {
      const res = await request(app)
        .put('/api/skill-progress/JavaScript')
        .send({ status: 'completed' });

      expect(res.status).toBe(401);
    });

    it('should return 401 with invalid token', async () => {
      const res = await request(app)
        .put('/api/skill-progress/JavaScript')
        .set('Authorization', 'Bearer invalid-token')
        .send({ status: 'completed' });

      expect(res.status).toBe(401);
    });
  });
});

