/**
 * Skills Routes - 90%+ Coverage Tests
 * File: backend/routes/skills.js
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

const mockSkill = {
  id: 1,
  user_id: 1,
  name: 'JavaScript',
  category: 'Programming Languages',
  proficiency: 'Expert',
};

// ============================================
// TEST SUITE
// ============================================

describe('Skills Routes - 90%+ Coverage', () => {
  let app;

  beforeAll(async () => {
    const skillsModule = await import('../../routes/skills.js');
    
    app = express();
    app.use(express.json());
    app.use('/api/skills', skillsModule.default);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ========================================
  // POST /api/skills - Add Skill
  // ========================================
  describe('POST /api/skills', () => {
    it('should add skill with all fields', async () => {
      // First query: duplicate check
      mockQueryFn.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });
      // Second query: insert
      mockQueryFn.mockResolvedValueOnce({
        rows: [mockSkill],
        rowCount: 1,
      });

      const res = await request(app)
        .post('/api/skills')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'JavaScript',
          category: 'Programming Languages',
          proficiency: 'Expert',
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Skill added');
      expect(res.body.skill).toEqual(mockSkill);
    });

    it('should add skill with only name', async () => {
      mockQueryFn.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });
      mockQueryFn.mockResolvedValueOnce({
        rows: [{ ...mockSkill, category: null, proficiency: null }],
        rowCount: 1,
      });

      const res = await request(app)
        .post('/api/skills')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'Python',
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Skill added');
    });

    it('should return 400 when name is missing', async () => {
      const res = await request(app)
        .post('/api/skills')
        .set('Authorization', 'Bearer valid-token')
        .send({
          category: 'Programming Languages',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Skill name required');
    });

    it('should return 409 for duplicate skill', async () => {
      mockQueryFn.mockResolvedValueOnce({
        rows: [{ id: 1 }],
        rowCount: 1,
      });

      const res = await request(app)
        .post('/api/skills')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'JavaScript',
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('Duplicate skill');
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .post('/api/skills')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'JavaScript',
        });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('DB error');
    });

    it('should return 401 without authorization', async () => {
      const res = await request(app)
        .post('/api/skills')
        .send({
          name: 'JavaScript',
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('No token');
    });

    it('should return 401 with invalid token', async () => {
      const res = await request(app)
        .post('/api/skills')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          name: 'JavaScript',
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid token');
    });
  });

  // ========================================
  // GET /api/skills - Get Skills
  // ========================================
  describe('GET /api/skills', () => {
    it('should return all skills for user', async () => {
      mockQueryFn.mockResolvedValueOnce({
        rows: [mockSkill, { ...mockSkill, id: 2, name: 'Python' }],
        rowCount: 2,
      });

      const res = await request(app)
        .get('/api/skills')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.skills).toHaveLength(2);
    });

    it('should return empty array when user has no skills', async () => {
      mockQueryFn.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      const res = await request(app)
        .get('/api/skills')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.skills).toEqual([]);
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .get('/api/skills')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to load skills');
    });

    it('should return 401 without authorization', async () => {
      const res = await request(app).get('/api/skills');

      expect(res.status).toBe(401);
    });
  });

  // ========================================
  // PUT /api/skills/:id - Update Skill
  // ========================================
  describe('PUT /api/skills/:id', () => {
    it('should update skill with all fields', async () => {
      const updatedSkill = {
        ...mockSkill,
        category: 'Web Technologies',
        proficiency: 'Advanced',
      };

      mockQueryFn.mockResolvedValueOnce({
        rows: [updatedSkill],
        rowCount: 1,
      });

      const res = await request(app)
        .put('/api/skills/1')
        .set('Authorization', 'Bearer valid-token')
        .send({
          category: 'Web Technologies',
          proficiency: 'Advanced',
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Skill updated');
    });

    it('should update skill with only category', async () => {
      mockQueryFn.mockResolvedValueOnce({
        rows: [{ ...mockSkill, category: 'Frameworks' }],
        rowCount: 1,
      });

      const res = await request(app)
        .put('/api/skills/1')
        .set('Authorization', 'Bearer valid-token')
        .send({
          category: 'Frameworks',
        });

      expect(res.status).toBe(200);
    });

    it('should update skill with only proficiency', async () => {
      mockQueryFn.mockResolvedValueOnce({
        rows: [{ ...mockSkill, proficiency: 'Beginner' }],
        rowCount: 1,
      });

      const res = await request(app)
        .put('/api/skills/1')
        .set('Authorization', 'Bearer valid-token')
        .send({
          proficiency: 'Beginner',
        });

      expect(res.status).toBe(200);
    });

    it('should return 404 when skill not found', async () => {
      mockQueryFn.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      const res = await request(app)
        .put('/api/skills/999')
        .set('Authorization', 'Bearer valid-token')
        .send({
          category: 'Updated',
        });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Not found');
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .put('/api/skills/1')
        .set('Authorization', 'Bearer valid-token')
        .send({
          category: 'Updated',
        });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Update failed');
    });

    it('should return 401 without authorization', async () => {
      const res = await request(app)
        .put('/api/skills/1')
        .send({
          category: 'Updated',
        });

      expect(res.status).toBe(401);
    });
  });

  // ========================================
  // DELETE /api/skills/:id - Delete Skill
  // ========================================
  describe('DELETE /api/skills/:id', () => {
    it('should delete skill', async () => {
      mockQueryFn.mockResolvedValueOnce({
        rows: [{ id: 1 }],
        rowCount: 1,
      });

      const res = await request(app)
        .delete('/api/skills/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Deleted');
    });

    it('should return 404 when skill not found', async () => {
      mockQueryFn.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      const res = await request(app)
        .delete('/api/skills/999')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Skill not found');
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .delete('/api/skills/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Delete failed');
    });

    it('should return 401 without authorization', async () => {
      const res = await request(app).delete('/api/skills/1');

      expect(res.status).toBe(401);
    });
  });
});

