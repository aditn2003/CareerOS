/**
 * Education Routes - 90%+ Coverage Tests
 * File: backend/routes/education.js
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

const mockEducation = {
  id: 1,
  user_id: 1,
  institution: 'MIT',
  degree_type: 'Bachelor',
  field_of_study: 'Computer Science',
  graduation_date: '2020-05-15',
  currently_enrolled: false,
  education_level: 'Undergraduate',
  gpa: 3.8,
  gpa_private: false,
  honors: 'Magna Cum Laude',
};

// ============================================
// TEST SUITE
// ============================================

describe('Education Routes - 90%+ Coverage', () => {
  let app;

  beforeAll(async () => {
    const educationModule = await import('../../routes/education.js');
    
    app = express();
    app.use(express.json());
    app.use('/api', educationModule.default);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ========================================
  // POST /api/education - Add Education
  // ========================================
  describe('POST /api/education', () => {
    it('should add education with all fields', async () => {
      mockQueryFn.mockResolvedValueOnce({
        rows: [mockEducation],
        rowCount: 1,
      });

      const res = await request(app)
        .post('/api/education')
        .set('Authorization', 'Bearer valid-token')
        .send({
          institution: 'MIT',
          degree_type: 'Bachelor',
          field_of_study: 'Computer Science',
          graduation_date: '2020-05-15',
          currently_enrolled: false,
          education_level: 'Undergraduate',
          gpa: 3.8,
          gpa_private: false,
          honors: 'Magna Cum Laude',
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Education added successfully');
      expect(res.body.education).toEqual(mockEducation);
    });

    it('should add education with only required fields', async () => {
      const minimalEducation = {
        ...mockEducation,
        graduation_date: null,
        currently_enrolled: false,
        education_level: '',
        gpa: null,
        gpa_private: false,
        honors: '',
      };

      mockQueryFn.mockResolvedValueOnce({
        rows: [minimalEducation],
        rowCount: 1,
      });

      const res = await request(app)
        .post('/api/education')
        .set('Authorization', 'Bearer valid-token')
        .send({
          institution: 'MIT',
          degree_type: 'Bachelor',
          field_of_study: 'Computer Science',
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Education added successfully');
    });

    it('should return 400 when institution is missing', async () => {
      const res = await request(app)
        .post('/api/education')
        .set('Authorization', 'Bearer valid-token')
        .send({
          degree_type: 'Bachelor',
          field_of_study: 'Computer Science',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Missing required fields');
    });

    it('should return 400 when degree_type is missing', async () => {
      const res = await request(app)
        .post('/api/education')
        .set('Authorization', 'Bearer valid-token')
        .send({
          institution: 'MIT',
          field_of_study: 'Computer Science',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Missing required fields');
    });

    it('should return 400 when field_of_study is missing', async () => {
      const res = await request(app)
        .post('/api/education')
        .set('Authorization', 'Bearer valid-token')
        .send({
          institution: 'MIT',
          degree_type: 'Bachelor',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Missing required fields');
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .post('/api/education')
        .set('Authorization', 'Bearer valid-token')
        .send({
          institution: 'MIT',
          degree_type: 'Bachelor',
          field_of_study: 'Computer Science',
        });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Database error while adding education');
    });

    it('should return 401 without authorization', async () => {
      const res = await request(app)
        .post('/api/education')
        .send({
          institution: 'MIT',
          degree_type: 'Bachelor',
          field_of_study: 'Computer Science',
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('No token');
    });

    it('should return 401 with invalid token', async () => {
      const res = await request(app)
        .post('/api/education')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          institution: 'MIT',
          degree_type: 'Bachelor',
          field_of_study: 'Computer Science',
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid token');
    });

    it('should handle currently_enrolled as true', async () => {
      const enrolledEducation = {
        ...mockEducation,
        currently_enrolled: true,
        graduation_date: null,
      };

      mockQueryFn.mockResolvedValueOnce({
        rows: [enrolledEducation],
        rowCount: 1,
      });

      const res = await request(app)
        .post('/api/education')
        .set('Authorization', 'Bearer valid-token')
        .send({
          institution: 'MIT',
          degree_type: 'Master',
          field_of_study: 'Data Science',
          currently_enrolled: true,
        });

      expect(res.status).toBe(200);
    });

    it('should handle gpa_private as true', async () => {
      const privateGpaEducation = {
        ...mockEducation,
        gpa_private: true,
      };

      mockQueryFn.mockResolvedValueOnce({
        rows: [privateGpaEducation],
        rowCount: 1,
      });

      const res = await request(app)
        .post('/api/education')
        .set('Authorization', 'Bearer valid-token')
        .send({
          institution: 'MIT',
          degree_type: 'Bachelor',
          field_of_study: 'Computer Science',
          gpa: 3.9,
          gpa_private: true,
        });

      expect(res.status).toBe(200);
    });
  });

  // ========================================
  // GET /api/education - View Education
  // ========================================
  describe('GET /api/education', () => {
    it('should return all education entries for user', async () => {
      mockQueryFn.mockResolvedValueOnce({
        rows: [mockEducation, { ...mockEducation, id: 2, institution: 'Stanford' }],
        rowCount: 2,
      });

      const res = await request(app)
        .get('/api/education')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.education).toHaveLength(2);
    });

    it('should return empty array when user has no education entries', async () => {
      mockQueryFn.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

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

    it('should return 401 without authorization', async () => {
      const res = await request(app).get('/api/education');

      expect(res.status).toBe(401);
    });
  });

  // ========================================
  // PUT /api/education/:id - Update Education
  // ========================================
  describe('PUT /api/education/:id', () => {
    it('should update education with all fields', async () => {
      const updatedEducation = {
        ...mockEducation,
        institution: 'Stanford',
        gpa: 3.9,
      };

      mockQueryFn.mockResolvedValueOnce({
        rows: [updatedEducation],
        rowCount: 1,
      });

      const res = await request(app)
        .put('/api/education/1')
        .set('Authorization', 'Bearer valid-token')
        .send({
          institution: 'Stanford',
          degree_type: 'Bachelor',
          field_of_study: 'Computer Science',
          graduation_date: '2020-05-15',
          currently_enrolled: false,
          education_level: 'Undergraduate',
          gpa: 3.9,
          gpa_private: false,
          honors: 'Magna Cum Laude',
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Education updated successfully');
      expect(res.body.education.institution).toBe('Stanford');
    });

    it('should update education with optional fields as null/empty', async () => {
      const updatedEducation = {
        ...mockEducation,
        graduation_date: null,
        gpa: null,
        honors: '',
      };

      mockQueryFn.mockResolvedValueOnce({
        rows: [updatedEducation],
        rowCount: 1,
      });

      const res = await request(app)
        .put('/api/education/1')
        .set('Authorization', 'Bearer valid-token')
        .send({
          institution: 'MIT',
          degree_type: 'Bachelor',
          field_of_study: 'Computer Science',
        });

      expect(res.status).toBe(200);
    });

    it('should return 404 when education not found', async () => {
      mockQueryFn.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      const res = await request(app)
        .put('/api/education/999')
        .set('Authorization', 'Bearer valid-token')
        .send({
          institution: 'MIT',
          degree_type: 'Bachelor',
          field_of_study: 'Computer Science',
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
          institution: 'MIT',
          degree_type: 'Bachelor',
          field_of_study: 'Computer Science',
        });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Database error while updating education');
    });

    it('should return 401 without authorization', async () => {
      const res = await request(app)
        .put('/api/education/1')
        .send({
          institution: 'MIT',
          degree_type: 'Bachelor',
          field_of_study: 'Computer Science',
        });

      expect(res.status).toBe(401);
    });
  });

  // ========================================
  // DELETE /api/education/:id - Delete Education
  // ========================================
  describe('DELETE /api/education/:id', () => {
    it('should delete education entry', async () => {
      mockQueryFn.mockResolvedValueOnce({
        rows: [{ id: 1 }],
        rowCount: 1,
      });

      const res = await request(app)
        .delete('/api/education/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Education deleted successfully');
    });

    it('should return 404 when education not found', async () => {
      mockQueryFn.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

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

    it('should return 401 without authorization', async () => {
      const res = await request(app).delete('/api/education/1');

      expect(res.status).toBe(401);
    });
  });
});

