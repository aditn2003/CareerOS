/**
 * Education Routes - Full Coverage Tests
 * File: backend/routes/education.js
 */

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import educationRouter from '../../routes/education.js';

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
    globalThis.__educationMockQueryFn = queryFn;
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
  mockQueryFn = globalThis.__educationMockQueryFn || vi.fn();
  
  process.env.JWT_SECRET = 'test-secret';
  
  app = express();
  app.use(express.json());
  app.use('/api', educationRouter);
});

beforeEach(() => {
  // Ensure mockQueryFn is available
  if (!mockQueryFn) {
    mockQueryFn = globalThis.__educationMockQueryFn || vi.fn();
  }
  vi.clearAllMocks();
  // Re-assign after clearing to ensure it's still available
  mockQueryFn = globalThis.__educationMockQueryFn || vi.fn();
});

// ============================================
// TESTS
// ============================================

describe('Education Routes - Full Coverage', () => {
  describe('POST /api/education', () => {
    it('should add education entry', async () => {
      const mockEducation = {
        id: 1,
        user_id: 1,
        institution: 'University of Example',
        degree_type: 'Bachelor',
        field_of_study: 'Computer Science',
        graduation_date: '2020-05-01',
        currently_enrolled: false,
        education_level: 'Undergraduate',
        gpa: 3.8,
        gpa_private: false,
        honors: 'Summa Cum Laude',
      };

      mockQueryFn.mockResolvedValueOnce({ rows: [mockEducation], rowCount: 1 });

      const res = await request(app)
        .post('/api/education')
        .set('Authorization', 'Bearer valid-token')
        .send({
          institution: 'University of Example',
          degree_type: 'Bachelor',
          field_of_study: 'Computer Science',
          graduation_date: '2020-05-01',
          currently_enrolled: false,
          education_level: 'Undergraduate',
          gpa: 3.8,
          gpa_private: false,
          honors: 'Summa Cum Laude',
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Education added successfully');
      expect(res.body.education).toEqual(mockEducation);
    });

    it('should return 400 if required fields missing', async () => {
      const res = await request(app)
        .post('/api/education')
        .set('Authorization', 'Bearer valid-token')
        .send({
          institution: 'University of Example',
          // Missing degree_type and field_of_study
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Missing required fields');
    });

    it('should handle optional fields', async () => {
      const mockEducation = {
        id: 1,
        user_id: 1,
        institution: 'University of Example',
        degree_type: 'Bachelor',
        field_of_study: 'Computer Science',
        graduation_date: null,
        currently_enrolled: false,
        education_level: '',
        gpa: null,
        gpa_private: false,
        honors: '',
      };

      mockQueryFn.mockResolvedValueOnce({ rows: [mockEducation], rowCount: 1 });

      const res = await request(app)
        .post('/api/education')
        .set('Authorization', 'Bearer valid-token')
        .send({
          institution: 'University of Example',
          degree_type: 'Bachelor',
          field_of_study: 'Computer Science',
        });

      expect(res.status).toBe(200);
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .post('/api/education')
        .set('Authorization', 'Bearer valid-token')
        .send({
          institution: 'University of Example',
          degree_type: 'Bachelor',
          field_of_study: 'Computer Science',
        });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Database error while adding education');
    });
  });

  describe('GET /api/education', () => {
    it('should return all education entries', async () => {
      const mockEducation = [
        { id: 1, institution: 'University A', degree_type: 'Bachelor' },
        { id: 2, institution: 'University B', degree_type: 'Master' },
      ];

      mockQueryFn.mockResolvedValueOnce({ rows: mockEducation, rowCount: 2 });

      const res = await request(app)
        .get('/api/education')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.education).toEqual(mockEducation);
    });

    it('should return empty array when no education', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = await request(app)
        .get('/api/education')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.education).toEqual([]);
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .get('/api/education')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Database error while fetching education');
    });
  });

  describe('PUT /api/education/:id', () => {
    it('should update education entry', async () => {
      const updatedEducation = {
        id: 1,
        institution: 'Updated University',
        degree_type: 'Master',
        field_of_study: 'Data Science',
      };

      mockQueryFn.mockResolvedValueOnce({ rows: [updatedEducation], rowCount: 1 });

      const res = await request(app)
        .put('/api/education/1')
        .set('Authorization', 'Bearer valid-token')
        .send({
          institution: 'Updated University',
          degree_type: 'Master',
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Education updated successfully');
    });

    it('should return 404 if education not found', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = await request(app)
        .put('/api/education/999')
        .set('Authorization', 'Bearer valid-token')
        .send({
          institution: 'Updated University',
        });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Education not found');
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .put('/api/education/1')
        .set('Authorization', 'Bearer valid-token')
        .send({
          institution: 'Updated University',
        });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Database error while updating education');
    });
  });

  describe('DELETE /api/education/:id', () => {
    it('should delete education entry', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 });

      const res = await request(app)
        .delete('/api/education/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Education deleted successfully');
    });

    it('should return 404 if education not found', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = await request(app)
        .delete('/api/education/999')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Education not found');
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .delete('/api/education/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Database error while deleting education');
    });
  });
});

