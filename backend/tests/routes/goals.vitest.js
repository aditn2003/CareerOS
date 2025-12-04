/**
 * Goals Routes - Full Coverage Tests
 * File: backend/routes/goals.js
 */

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import goalsRouter from '../../routes/goals.js';

// ============================================
// MOCKS
// ============================================

// Create mock query function using a getter to avoid hoisting issues
let mockQueryFn;

vi.mock('../../db/pool.js', () => {
  // Create the mock function inside the factory
  const queryFn = vi.fn();
  // Store reference in global to access from tests
  if (typeof globalThis !== 'undefined') {
    globalThis.__goalsMockQueryFn = queryFn;
  }
  
  return {
    default: {
      query: queryFn,
    },
  };
});

vi.mock('../../auth.js', () => ({
  auth: vi.fn((req, res, next) => {
    req.user = { id: 1 };
    next();
  }),
}));

// ============================================
// SETUP
// ============================================

let app;

beforeAll(() => {
  // Initialize mockQueryFn after mocks are set up
  mockQueryFn = globalThis.__goalsMockQueryFn || vi.fn();
  
  process.env.JWT_SECRET = 'test-secret';
  
  app = express();
  app.use(express.json());
  app.use('/api/goals', goalsRouter);
});

beforeEach(() => {
  // Ensure mockQueryFn is available
  if (!mockQueryFn) {
    mockQueryFn = globalThis.__goalsMockQueryFn || vi.fn();
  }
  vi.clearAllMocks();
  // Re-assign after clearing to ensure it's still available
  mockQueryFn = globalThis.__goalsMockQueryFn || vi.fn();
});

// ============================================
// TESTS
// ============================================

describe('Goals Routes - Full Coverage', () => {
  describe('GET /api/goals', () => {
    it('should return custom goals', async () => {
      const mockGoals = {
        monthly_applications: 50,
        interview_rate_target: 0.25,
        offer_rate_target: 0.10,
      };

      mockQueryFn.mockResolvedValueOnce({ rows: [mockGoals], rowCount: 1 });

      const res = await request(app)
        .get('/api/goals')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.goals).toEqual({
        monthly_applications: 50,
        interview_rate_target: 0.25,
        offer_rate_target: 0.10,
      });
      expect(res.body.isCustom).toBe(true);
    });

    it('should return default goals when no custom goals', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = await request(app)
        .get('/api/goals')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.goals).toEqual({
        monthly_applications: 30,
        interview_rate_target: 0.30,
        offer_rate_target: 0.05,
      });
      expect(res.body.isCustom).toBe(false);
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .get('/api/goals')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to fetch goals');
    });
  });

  describe('PUT /api/goals', () => {
    it('should update goals', async () => {
      const updatedGoals = {
        monthly_applications: 50,
        interview_rate_target: 0.25,
        offer_rate_target: 0.10,
      };

      mockQueryFn.mockResolvedValueOnce({ rows: [updatedGoals], rowCount: 1 });

      const res = await request(app)
        .put('/api/goals')
        .set('Authorization', 'Bearer valid-token')
        .send({
          monthly_applications: 50,
          interview_rate_target: 0.25,
          offer_rate_target: 0.10,
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Goals updated successfully');
      expect(res.body.goals).toEqual({
        monthly_applications: 50,
        interview_rate_target: 0.25,
        offer_rate_target: 0.10,
      });
    });

    it('should clamp values to valid ranges', async () => {
      const clampedGoals = {
        monthly_applications: 200,
        interview_rate_target: 1,
        offer_rate_target: 1,
      };

      mockQueryFn.mockResolvedValueOnce({ rows: [clampedGoals], rowCount: 1 });

      const res = await request(app)
        .put('/api/goals')
        .set('Authorization', 'Bearer valid-token')
        .send({
          monthly_applications: 500, // Should clamp to 200
          interview_rate_target: 2, // Should clamp to 1
          offer_rate_target: 1.5, // Should clamp to 1
        });

      expect(res.status).toBe(200);
    });

    it('should use defaults for missing values', async () => {
      const defaultGoals = {
        monthly_applications: 30,
        interview_rate_target: 0.30,
        offer_rate_target: 0.05,
      };

      mockQueryFn.mockResolvedValueOnce({ rows: [defaultGoals], rowCount: 1 });

      const res = await request(app)
        .put('/api/goals')
        .set('Authorization', 'Bearer valid-token')
        .send({});

      expect(res.status).toBe(200);
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .put('/api/goals')
        .set('Authorization', 'Bearer valid-token')
        .send({
          monthly_applications: 50,
        });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to update goals');
    });
  });

  describe('DELETE /api/goals', () => {
    it('should reset goals to defaults', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      const res = await request(app)
        .delete('/api/goals')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Goals reset to defaults');
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .delete('/api/goals')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to reset goals');
    });
  });
});

