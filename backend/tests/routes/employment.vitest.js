/**
 * Employment Routes - 90%+ Coverage Tests
 * File: backend/routes/employment.js
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

const mockEmployment = {
  id: 1,
  user_id: 1,
  title: 'Software Engineer',
  company: 'Google',
  location: 'Mountain View, CA',
  start_date: '2020-01-15',
  end_date: '2023-06-30',
  current: false,
  description: 'Developed scalable web applications',
};

// ============================================
// TEST SUITE
// ============================================

describe('Employment Routes - 90%+ Coverage', () => {
  let app;

  beforeAll(async () => {
    const employmentModule = await import('../../routes/employment.js');
    
    app = express();
    app.use(express.json());
    app.use('/api', employmentModule.default);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ========================================
  // POST /api/employment - Add Employment
  // ========================================
  describe('POST /api/employment', () => {
    it('should add employment with all fields', async () => {
      mockQueryFn.mockResolvedValueOnce({
        rows: [mockEmployment],
        rowCount: 1,
      });

      const res = await request(app)
        .post('/api/employment')
        .set('Authorization', 'Bearer valid-token')
        .send({
          title: 'Software Engineer',
          company: 'Google',
          location: 'Mountain View, CA',
          start_date: '2020-01-15',
          end_date: '2023-06-30',
          current: false,
          description: 'Developed scalable web applications',
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Employment entry added successfully');
      expect(res.body.employment).toEqual(mockEmployment);
    });

    it('should add employment with only required fields', async () => {
      const minimalEmployment = {
        ...mockEmployment,
        location: null,
        end_date: null,
        current: false,
        description: '',
      };

      mockQueryFn.mockResolvedValueOnce({
        rows: [minimalEmployment],
        rowCount: 1,
      });

      const res = await request(app)
        .post('/api/employment')
        .set('Authorization', 'Bearer valid-token')
        .send({
          title: 'Software Engineer',
          company: 'Google',
          start_date: '2020-01-15',
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Employment entry added successfully');
    });

    it('should add current employment (no end_date)', async () => {
      const currentEmployment = {
        ...mockEmployment,
        end_date: null,
        current: true,
      };

      mockQueryFn.mockResolvedValueOnce({
        rows: [currentEmployment],
        rowCount: 1,
      });

      const res = await request(app)
        .post('/api/employment')
        .set('Authorization', 'Bearer valid-token')
        .send({
          title: 'Senior Engineer',
          company: 'Meta',
          start_date: '2023-07-01',
          current: true,
        });

      expect(res.status).toBe(200);
    });

    it('should return 400 when title is missing', async () => {
      const res = await request(app)
        .post('/api/employment')
        .set('Authorization', 'Bearer valid-token')
        .send({
          company: 'Google',
          start_date: '2020-01-15',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Title, company, and start date are required fields.');
    });

    it('should return 400 when company is missing', async () => {
      const res = await request(app)
        .post('/api/employment')
        .set('Authorization', 'Bearer valid-token')
        .send({
          title: 'Software Engineer',
          start_date: '2020-01-15',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Title, company, and start date are required fields.');
    });

    it('should return 400 when start_date is missing', async () => {
      const res = await request(app)
        .post('/api/employment')
        .set('Authorization', 'Bearer valid-token')
        .send({
          title: 'Software Engineer',
          company: 'Google',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Title, company, and start date are required fields.');
    });

    it('should return 400 when end_date is before start_date and not current', async () => {
      const res = await request(app)
        .post('/api/employment')
        .set('Authorization', 'Bearer valid-token')
        .send({
          title: 'Software Engineer',
          company: 'Google',
          start_date: '2023-01-15',
          end_date: '2022-01-15', // Before start_date
          current: false,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('End date must be after start date.');
    });

    it('should allow end_date before start_date when current is true', async () => {
      // When current is true, we don't validate end_date
      mockQueryFn.mockResolvedValueOnce({
        rows: [{ ...mockEmployment, current: true }],
        rowCount: 1,
      });

      const res = await request(app)
        .post('/api/employment')
        .set('Authorization', 'Bearer valid-token')
        .send({
          title: 'Software Engineer',
          company: 'Google',
          start_date: '2023-01-15',
          end_date: '2022-01-15', // Before start_date but current=true
          current: true,
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
          company: 'Google',
          start_date: '2020-01-15',
        });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Database error while adding employment');
    });

    it('should return 401 without authorization', async () => {
      const res = await request(app)
        .post('/api/employment')
        .send({
          title: 'Software Engineer',
          company: 'Google',
          start_date: '2020-01-15',
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('No token provided');
    });

    it('should return 401 with invalid token', async () => {
      const res = await request(app)
        .post('/api/employment')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          title: 'Software Engineer',
          company: 'Google',
          start_date: '2020-01-15',
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid token');
    });
  });

  // ========================================
  // GET /api/employment - View Employment
  // ========================================
  describe('GET /api/employment', () => {
    it('should return all employment entries for user', async () => {
      mockQueryFn.mockResolvedValueOnce({
        rows: [mockEmployment, { ...mockEmployment, id: 2, company: 'Meta' }],
        rowCount: 2,
      });

      const res = await request(app)
        .get('/api/employment')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.employment).toHaveLength(2);
    });

    it('should return empty array when user has no employment entries', async () => {
      mockQueryFn.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

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

    it('should return 401 without authorization', async () => {
      const res = await request(app).get('/api/employment');

      expect(res.status).toBe(401);
    });
  });

  // ========================================
  // PUT /api/employment/:id - Update Employment
  // ========================================
  describe('PUT /api/employment/:id', () => {
    it('should update employment with all fields', async () => {
      const updatedEmployment = {
        ...mockEmployment,
        title: 'Senior Software Engineer',
        company: 'Meta',
      };

      mockQueryFn.mockResolvedValueOnce({
        rows: [updatedEmployment],
        rowCount: 1,
      });

      const res = await request(app)
        .put('/api/employment/1')
        .set('Authorization', 'Bearer valid-token')
        .send({
          title: 'Senior Software Engineer',
          company: 'Meta',
          location: 'Menlo Park, CA',
          start_date: '2023-07-01',
          end_date: null,
          current: true,
          description: 'Leading a team of engineers',
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Employment updated successfully');
    });

    it('should update employment with minimal fields', async () => {
      mockQueryFn.mockResolvedValueOnce({
        rows: [mockEmployment],
        rowCount: 1,
      });

      const res = await request(app)
        .put('/api/employment/1')
        .set('Authorization', 'Bearer valid-token')
        .send({
          title: 'Software Engineer',
          company: 'Google',
          start_date: '2020-01-15',
        });

      expect(res.status).toBe(200);
    });

    it('should return 400 when title is missing', async () => {
      const res = await request(app)
        .put('/api/employment/1')
        .set('Authorization', 'Bearer valid-token')
        .send({
          company: 'Google',
          start_date: '2020-01-15',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Title, company, and start date are required.');
    });

    it('should return 400 when company is missing', async () => {
      const res = await request(app)
        .put('/api/employment/1')
        .set('Authorization', 'Bearer valid-token')
        .send({
          title: 'Software Engineer',
          start_date: '2020-01-15',
        });

      expect(res.status).toBe(400);
    });

    it('should return 400 when start_date is missing', async () => {
      const res = await request(app)
        .put('/api/employment/1')
        .set('Authorization', 'Bearer valid-token')
        .send({
          title: 'Software Engineer',
          company: 'Google',
        });

      expect(res.status).toBe(400);
    });

    it('should return 404 when employment not found', async () => {
      mockQueryFn.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      const res = await request(app)
        .put('/api/employment/999')
        .set('Authorization', 'Bearer valid-token')
        .send({
          title: 'Software Engineer',
          company: 'Google',
          start_date: '2020-01-15',
        });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Employment not found');
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .put('/api/employment/1')
        .set('Authorization', 'Bearer valid-token')
        .send({
          title: 'Software Engineer',
          company: 'Google',
          start_date: '2020-01-15',
        });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Database error while updating employment');
    });

    it('should return 401 without authorization', async () => {
      const res = await request(app)
        .put('/api/employment/1')
        .send({
          title: 'Software Engineer',
          company: 'Google',
          start_date: '2020-01-15',
        });

      expect(res.status).toBe(401);
    });
  });

  // ========================================
  // DELETE /api/employment/:id - Delete Employment
  // ========================================
  describe('DELETE /api/employment/:id', () => {
    it('should delete employment entry', async () => {
      mockQueryFn.mockResolvedValueOnce({
        rows: [{ id: 1 }],
        rowCount: 1,
      });

      const res = await request(app)
        .delete('/api/employment/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Employment entry deleted successfully');
    });

    it('should return 404 when employment not found', async () => {
      mockQueryFn.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

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

    it('should return 401 without authorization', async () => {
      const res = await request(app).delete('/api/employment/1');

      expect(res.status).toBe(401);
    });
  });
});

