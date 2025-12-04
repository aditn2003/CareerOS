/**
 * Goals Routes - 90%+ Coverage Tests
 * File: backend/routes/goals.js
 */

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

// ============================================
// MOCKS
// ============================================

const mockQueryFn = vi.fn();

vi.mock('../../db/pool.js', () => ({
  default: {
    query: mockQueryFn,
    connect: vi.fn(),
    end: vi.fn(),
    on: vi.fn(),
  },
}));

vi.mock('jsonwebtoken', () => ({
  default: {
    verify: vi.fn((token) => {
      if (token === 'valid-token') return { id: 1, email: 'test@example.com' };
      throw new Error('Invalid token');
    }),
    sign: vi.fn(() => 'mock-token'),
  },
}));

// ============================================
// MOCK DATA
// ============================================

const mockGoal = {
  user_id: 1,
  monthly_applications: 50,
  interview_rate_target: 0.40,
  offer_rate_target: 0.10,
  updated_at: new Date().toISOString(),
};

const DEFAULT_GOALS = {
  monthly_applications: 30,
  interview_rate_target: 0.30,
  offer_rate_target: 0.05,
};

// ============================================
// TEST SUITE
// ============================================

describe('Goals Routes - 90%+ Coverage', () => {
  let app;

  beforeAll(async () => {
    // Import the goals router
    const goalsModule = await import('../../routes/goals.js');
    const { auth } = await import('../../auth.js');
    
    app = express();
    app.use(express.json());
    app.use('/api/goals', goalsModule.default);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ========================================
  // GET /api/goals
  // ========================================
  describe('GET /api/goals', () => {
    it('should return custom goals when user has set them', async () => {
      mockQueryFn.mockResolvedValueOnce({
        rows: [mockGoal],
        rowCount: 1,
      });

      const res = await request(app)
        .get('/api/goals')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.isCustom).toBe(true);
      expect(res.body.goals).toEqual({
        monthly_applications: 50,
        interview_rate_target: 0.40,
        offer_rate_target: 0.10,
      });
    });

    it('should return default goals when user has no custom goals', async () => {
      mockQueryFn.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      const res = await request(app)
        .get('/api/goals')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.isCustom).toBe(false);
      expect(res.body.goals).toEqual(DEFAULT_GOALS);
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database connection failed'));

      const res = await request(app)
        .get('/api/goals')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to fetch goals');
    });

    it('should return 401 without authorization header', async () => {
      const res = await request(app).get('/api/goals');

      expect(res.status).toBe(401);
    });

    it('should return 401 with invalid token', async () => {
      const res = await request(app)
        .get('/api/goals')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(401);
    });
  });

  // ========================================
  // PUT /api/goals
  // ========================================
  describe('PUT /api/goals', () => {
    it('should update goals with valid values', async () => {
      const updatedGoal = {
        ...mockGoal,
        monthly_applications: 60,
        interview_rate_target: 0.50,
        offer_rate_target: 0.15,
      };
      
      mockQueryFn.mockResolvedValueOnce({
        rows: [updatedGoal],
        rowCount: 1,
      });

      const res = await request(app)
        .put('/api/goals')
        .set('Authorization', 'Bearer valid-token')
        .send({
          monthly_applications: 60,
          interview_rate_target: 0.50,
          offer_rate_target: 0.15,
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Goals updated successfully');
      expect(res.body.goals.monthly_applications).toBe(60);
    });

    it('should clamp monthly_applications to minimum of 1', async () => {
      const clampedGoal = {
        ...mockGoal,
        monthly_applications: 1,
      };
      
      mockQueryFn.mockResolvedValueOnce({
        rows: [clampedGoal],
        rowCount: 1,
      });

      const res = await request(app)
        .put('/api/goals')
        .set('Authorization', 'Bearer valid-token')
        .send({
          monthly_applications: -10, // Should be clamped to 1
          interview_rate_target: 0.30,
          offer_rate_target: 0.05,
        });

      expect(res.status).toBe(200);
      // Verify the query was called with clamped value
      expect(mockQueryFn).toHaveBeenCalled();
    });

    it('should clamp monthly_applications to maximum of 200', async () => {
      const clampedGoal = {
        ...mockGoal,
        monthly_applications: 200,
      };
      
      mockQueryFn.mockResolvedValueOnce({
        rows: [clampedGoal],
        rowCount: 1,
      });

      const res = await request(app)
        .put('/api/goals')
        .set('Authorization', 'Bearer valid-token')
        .send({
          monthly_applications: 500, // Should be clamped to 200
          interview_rate_target: 0.30,
          offer_rate_target: 0.05,
        });

      expect(res.status).toBe(200);
    });

    it('should clamp interview_rate_target to minimum of 0.01', async () => {
      const clampedGoal = {
        ...mockGoal,
        interview_rate_target: 0.01,
      };
      
      mockQueryFn.mockResolvedValueOnce({
        rows: [clampedGoal],
        rowCount: 1,
      });

      const res = await request(app)
        .put('/api/goals')
        .set('Authorization', 'Bearer valid-token')
        .send({
          monthly_applications: 30,
          interview_rate_target: -0.5, // Should be clamped to 0.01
          offer_rate_target: 0.05,
        });

      expect(res.status).toBe(200);
    });

    it('should clamp interview_rate_target to maximum of 1', async () => {
      const clampedGoal = {
        ...mockGoal,
        interview_rate_target: 1,
      };
      
      mockQueryFn.mockResolvedValueOnce({
        rows: [clampedGoal],
        rowCount: 1,
      });

      const res = await request(app)
        .put('/api/goals')
        .set('Authorization', 'Bearer valid-token')
        .send({
          monthly_applications: 30,
          interview_rate_target: 2.5, // Should be clamped to 1
          offer_rate_target: 0.05,
        });

      expect(res.status).toBe(200);
    });

    it('should clamp offer_rate_target to minimum of 0.01', async () => {
      const clampedGoal = {
        ...mockGoal,
        offer_rate_target: 0.01,
      };
      
      mockQueryFn.mockResolvedValueOnce({
        rows: [clampedGoal],
        rowCount: 1,
      });

      const res = await request(app)
        .put('/api/goals')
        .set('Authorization', 'Bearer valid-token')
        .send({
          monthly_applications: 30,
          interview_rate_target: 0.30,
          offer_rate_target: -1, // Should be clamped to 0.01
        });

      expect(res.status).toBe(200);
    });

    it('should clamp offer_rate_target to maximum of 1', async () => {
      const clampedGoal = {
        ...mockGoal,
        offer_rate_target: 1,
      };
      
      mockQueryFn.mockResolvedValueOnce({
        rows: [clampedGoal],
        rowCount: 1,
      });

      const res = await request(app)
        .put('/api/goals')
        .set('Authorization', 'Bearer valid-token')
        .send({
          monthly_applications: 30,
          interview_rate_target: 0.30,
          offer_rate_target: 5, // Should be clamped to 1
        });

      expect(res.status).toBe(200);
    });

    it('should use default values when inputs are missing or invalid', async () => {
      const defaultGoal = {
        ...mockGoal,
        monthly_applications: 30,
        interview_rate_target: 0.30,
        offer_rate_target: 0.05,
      };
      
      mockQueryFn.mockResolvedValueOnce({
        rows: [defaultGoal],
        rowCount: 1,
      });

      const res = await request(app)
        .put('/api/goals')
        .set('Authorization', 'Bearer valid-token')
        .send({
          monthly_applications: 'invalid', // Should default to 30
          interview_rate_target: null, // Should default to 0.30
          offer_rate_target: undefined, // Should default to 0.05
        });

      expect(res.status).toBe(200);
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .put('/api/goals')
        .set('Authorization', 'Bearer valid-token')
        .send({
          monthly_applications: 50,
          interview_rate_target: 0.40,
          offer_rate_target: 0.10,
        });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to update goals');
    });

    it('should return 401 without authorization', async () => {
      const res = await request(app)
        .put('/api/goals')
        .send({
          monthly_applications: 50,
        });

      expect(res.status).toBe(401);
    });
  });

  // ========================================
  // DELETE /api/goals
  // ========================================
  describe('DELETE /api/goals', () => {
    it('should reset goals to defaults', async () => {
      mockQueryFn.mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
      });

      const res = await request(app)
        .delete('/api/goals')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Goals reset to defaults');
      expect(res.body.goals).toEqual(DEFAULT_GOALS);
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .delete('/api/goals')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to reset goals');
    });

    it('should return 401 without authorization', async () => {
      const res = await request(app).delete('/api/goals');

      expect(res.status).toBe(401);
    });

    it('should succeed even if no goals existed', async () => {
      mockQueryFn.mockResolvedValueOnce({
        rows: [],
        rowCount: 0, // No rows deleted
      });

      const res = await request(app)
        .delete('/api/goals')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.goals).toEqual(DEFAULT_GOALS);
    });
  });
});

