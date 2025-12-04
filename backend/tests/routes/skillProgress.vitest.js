/**
 * Skill Progress Routes - Full Coverage Tests
 * File: backend/routes/skillProgress.js
 */

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import skillProgressRouter from '../../routes/skillProgress.js';

// ============================================
// MOCKS
// ============================================

// Create mock query function using a getter to avoid hoisting issues
let mockQueryFn;

vi.mock('pg', () => {
  // Create the mock function inside the factory
  const queryFn = vi.fn();
  // Store reference in global to access from tests
  if (typeof globalThis !== 'undefined') {
    globalThis.__skillProgressMockQueryFn = queryFn;
  }
  
  const mockPool = {
    query: queryFn,
  };
  // Create a proper constructor function
  function MockPool() {
    return mockPool;
  }
  return {
    default: {
      Pool: MockPool,
    },
    Pool: MockPool,
  };
});

vi.mock('jsonwebtoken', () => ({
  default: {
    verify: vi.fn((token) => {
      if (token === 'valid-token') return { id: 1 };
      throw new Error('Invalid token');
    }),
  },
}));

// ============================================
// SETUP
// ============================================

let app;

beforeAll(() => {
  // Initialize mockQueryFn after mocks are set up
  mockQueryFn = globalThis.__skillProgressMockQueryFn || vi.fn();
  
  process.env.JWT_SECRET = 'test-secret';
  
  app = express();
  app.use(express.json());
  app.use('/api/skill-progress', skillProgressRouter);
});

beforeEach(() => {
  // Ensure mockQueryFn is available
  if (!mockQueryFn) {
    mockQueryFn = globalThis.__skillProgressMockQueryFn || vi.fn();
  }
  vi.clearAllMocks();
  // Re-assign after clearing to ensure it's still available
  mockQueryFn = globalThis.__skillProgressMockQueryFn || vi.fn();
});

// ============================================
// TESTS
// ============================================

describe('Skill Progress Routes - Full Coverage', () => {
  describe('GET /api/skill-progress', () => {
    it('should return all skill progress', async () => {
      const mockProgress = [
        { id: 1, skill: 'javascript', status: 'completed', updated_at: '2024-01-01' },
        { id: 2, skill: 'python', status: 'in progress', updated_at: '2024-01-02' },
      ];

      mockQueryFn.mockResolvedValueOnce({ rows: mockProgress, rowCount: 2 });

      const res = await request(app)
        .get('/api/skill-progress')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.progress).toEqual(mockProgress);
    });

    it('should return empty array when no progress', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [], rowCount: 0 });

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
  });

  describe('PUT /api/skill-progress/:skill', () => {
    it('should update skill progress', async () => {
      const mockProgress = {
        id: 1,
        user_id: 1,
        skill: 'javascript',
        status: 'completed',
        updated_at: '2024-01-01',
      };

      mockQueryFn.mockResolvedValueOnce({ rows: [mockProgress], rowCount: 1 });

      const res = await request(app)
        .put('/api/skill-progress/JavaScript')
        .set('Authorization', 'Bearer valid-token')
        .send({
          status: 'completed',
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Progress updated');
      expect(res.body.entry).toEqual(mockProgress);
    });

    it('should normalize skill name to lowercase', async () => {
      const mockProgress = {
        id: 1,
        skill: 'javascript',
        status: 'in progress',
      };

      mockQueryFn.mockResolvedValueOnce({ rows: [mockProgress], rowCount: 1 });

      const res = await request(app)
        .put('/api/skill-progress/JavaScript')
        .set('Authorization', 'Bearer valid-token')
        .send({
          status: 'in progress',
        });

      expect(res.status).toBe(200);
      // Verify skill was normalized to lowercase
      expect(mockQueryFn).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO skill_progress'),
        expect.arrayContaining([1, 'javascript', 'in progress'])
      );
    });

    it('should return 400 for invalid status', async () => {
      const res = await request(app)
        .put('/api/skill-progress/javascript')
        .set('Authorization', 'Bearer valid-token')
        .send({
          status: 'invalid_status',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid status value');
    });

    it('should handle all valid statuses', async () => {
      const statuses = ['not started', 'in progress', 'completed'];
      
      for (const status of statuses) {
        mockQueryFn.mockResolvedValueOnce({
          rows: [{ id: 1, skill: 'javascript', status }],
          rowCount: 1,
        });

        const res = await request(app)
          .put('/api/skill-progress/javascript')
          .set('Authorization', 'Bearer valid-token')
          .send({ status });

        expect(res.status).toBe(200);
      }
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .put('/api/skill-progress/javascript')
        .set('Authorization', 'Bearer valid-token')
        .send({
          status: 'completed',
        });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to update progress');
    });
  });
});

