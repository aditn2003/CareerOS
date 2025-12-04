/**
 * Employment Routes - Full Coverage Tests
 * File: backend/routes/employment.js
 */

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import employmentRouter from '../../routes/employment.js';

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
    globalThis.__employmentMockQueryFn = queryFn;
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
  mockQueryFn = globalThis.__employmentMockQueryFn || vi.fn();
  
  process.env.JWT_SECRET = 'test-secret';
  
  app = express();
  app.use(express.json());
  app.use('/api', employmentRouter);
});

beforeEach(() => {
  // Ensure mockQueryFn is available
  if (!mockQueryFn) {
    mockQueryFn = globalThis.__employmentMockQueryFn || vi.fn();
  }
  vi.clearAllMocks();
  // Re-assign after clearing to ensure it's still available
  mockQueryFn = globalThis.__employmentMockQueryFn || vi.fn();
});

// ============================================
// TESTS
// ============================================

describe('Employment Routes - Full Coverage', () => {
  describe('POST /api/employment', () => {
    it('should add employment entry', async () => {
      const mockEmployment = {
        id: 1,
        user_id: 1,
        title: 'Software Engineer',
        company: 'Tech Corp',
        location: 'San Francisco, CA',
        start_date: '2020-01-01',
        end_date: null,
        current: true,
        description: 'Developed web applications',
      };

      mockQueryFn.mockResolvedValueOnce({ rows: [mockEmployment], rowCount: 1 });

      const res = await request(app)
        .post('/api/employment')
        .set('Authorization', 'Bearer valid-token')
        .send({
          title: 'Software Engineer',
          company: 'Tech Corp',
          location: 'San Francisco, CA',
          start_date: '2020-01-01',
          current: true,
          description: 'Developed web applications',
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Employment entry added successfully');
      expect(res.body.employment).toEqual(mockEmployment);
    });

    it('should return 400 if required fields missing', async () => {
      const res = await request(app)
        .post('/api/employment')
        .set('Authorization', 'Bearer valid-token')
        .send({
          title: 'Software Engineer',
          // Missing company and start_date
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('required fields');
    });

    it('should return 400 if end_date before start_date', async () => {
      const res = await request(app)
        .post('/api/employment')
        .set('Authorization', 'Bearer valid-token')
        .send({
          title: 'Software Engineer',
          company: 'Tech Corp',
          start_date: '2020-01-01',
          end_date: '2019-01-01',
          current: false,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('End date must be after start date');
    });

    it('should allow end_date when current is false', async () => {
      const mockEmployment = {
        id: 1,
        title: 'Software Engineer',
        company: 'Tech Corp',
        start_date: '2020-01-01',
        end_date: '2022-01-01',
        current: false,
      };

      mockQueryFn.mockResolvedValueOnce({ rows: [mockEmployment], rowCount: 1 });

      const res = await request(app)
        .post('/api/employment')
        .set('Authorization', 'Bearer valid-token')
        .send({
          title: 'Software Engineer',
          company: 'Tech Corp',
          start_date: '2020-01-01',
          end_date: '2022-01-01',
          current: false,
        });

      expect(res.status).toBe(200);
    });

    it('should allow current=true without end_date', async () => {
      const mockEmployment = {
        id: 1,
        title: 'Software Engineer',
        company: 'Tech Corp',
        start_date: '2020-01-01',
        end_date: null,
        current: true,
      };

      mockQueryFn.mockResolvedValueOnce({ rows: [mockEmployment], rowCount: 1 });

      const res = await request(app)
        .post('/api/employment')
        .set('Authorization', 'Bearer valid-token')
        .send({
          title: 'Software Engineer',
          company: 'Tech Corp',
          start_date: '2020-01-01',
          current: true,
        });

      expect(res.status).toBe(200);
    });

    it('should handle optional fields', async () => {
      const mockEmployment = {
        id: 1,
        user_id: 1,
        title: 'Software Engineer',
        company: 'Tech Corp',
        location: null,
        start_date: '2020-01-01',
        end_date: null,
        current: false,
        description: '',
      };

      mockQueryFn.mockResolvedValueOnce({ rows: [mockEmployment], rowCount: 1 });

      const res = await request(app)
        .post('/api/employment')
        .set('Authorization', 'Bearer valid-token')
        .send({
          title: 'Software Engineer',
          company: 'Tech Corp',
          start_date: '2020-01-01',
        });

      expect(res.status).toBe(200);
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .post('/api/employment')
        .set('Authorization', 'Bearer valid-token')
        .send({
          title: 'Software Engineer',
          company: 'Tech Corp',
          start_date: '2020-01-01',
        });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Database error while adding employment');
    });
  });

  describe('GET /api/employment', () => {
    it('should return all employment entries', async () => {
      const mockEmployment = [
        { id: 1, title: 'Software Engineer', company: 'Tech Corp', start_date: '2020-01-01' },
        { id: 2, title: 'Senior Engineer', company: 'Big Tech', start_date: '2018-01-01' },
      ];

      mockQueryFn.mockResolvedValueOnce({ rows: mockEmployment, rowCount: 2 });

      const res = await request(app)
        .get('/api/employment')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.employment).toEqual(mockEmployment);
    });

    it('should return empty array when no employment', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = await request(app)
        .get('/api/employment')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.employment).toEqual([]);
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .get('/api/employment')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Database error while fetching employment');
    });
  });

  describe('PUT /api/employment/:id', () => {
    it('should update employment entry', async () => {
      const updatedEmployment = {
        id: 1,
        title: 'Senior Software Engineer',
        company: 'Tech Corp',
        start_date: '2020-01-01',
      };

      mockQueryFn.mockResolvedValueOnce({ rows: [updatedEmployment], rowCount: 1 });

      const res = await request(app)
        .put('/api/employment/1')
        .set('Authorization', 'Bearer valid-token')
        .send({
          title: 'Senior Software Engineer',
          company: 'Tech Corp',
          start_date: '2020-01-01',
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Employment updated successfully');
    });

    it('should return 404 if employment not found', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = await request(app)
        .put('/api/employment/999')
        .set('Authorization', 'Bearer valid-token')
        .send({
          title: 'Senior Software Engineer',
          company: 'Tech Corp',
          start_date: '2020-01-01',
        });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Employment not found');
    });

    it('should return 400 if required fields missing in update', async () => {
      const res = await request(app)
        .put('/api/employment/1')
        .set('Authorization', 'Bearer valid-token')
        .send({
          title: 'Senior Software Engineer',
          // Missing company and start_date
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('required');
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .put('/api/employment/1')
        .set('Authorization', 'Bearer valid-token')
        .send({
          title: 'Senior Software Engineer',
          company: 'Tech Corp',
          start_date: '2020-01-01',
        });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Database error while updating employment');
    });
  });

  describe('DELETE /api/employment/:id', () => {
    it('should delete employment entry', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 });

      const res = await request(app)
        .delete('/api/employment/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Employment entry deleted successfully');
    });

    it('should return 404 if employment not found', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = await request(app)
        .delete('/api/employment/999')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Employment not found');
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .delete('/api/employment/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Database error while deleting employment');
    });
  });
});

