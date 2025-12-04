/**
 * Skills Routes - Full Coverage Tests
 * File: backend/routes/skills.js
 */

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import skillsRouter from '../../routes/skills.js';

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
    globalThis.__skillsMockQueryFn = queryFn;
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

// Initialize mockQueryFn after mocks are set up
beforeAll(() => {
  mockQueryFn = globalThis.__skillsMockQueryFn || vi.fn();
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
  process.env.JWT_SECRET = 'test-secret';
  
  app = express();
  app.use(express.json());
  app.use('/api/skills', skillsRouter);
});

beforeEach(() => {
  // Ensure mockQueryFn is available
  if (!mockQueryFn) {
    mockQueryFn = globalThis.__skillsMockQueryFn || vi.fn();
  }
  vi.clearAllMocks();
  // Re-assign after clearing to ensure it's still available
  mockQueryFn = globalThis.__skillsMockQueryFn || vi.fn();
});

// ============================================
// TESTS
// ============================================

describe('Skills Routes - Full Coverage', () => {
  describe('POST /api/skills', () => {
    it('should add new skill', async () => {
      const mockSkill = { id: 1, user_id: 1, name: 'JavaScript', category: 'Programming', proficiency: 'Advanced' };
      mockQueryFn
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // Check duplicate
        .mockResolvedValueOnce({ rows: [mockSkill], rowCount: 1 }); // Insert

      const res = await request(app)
        .post('/api/skills')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'JavaScript',
          category: 'Programming',
          proficiency: 'Advanced',
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Skill added');
      expect(res.body.skill).toEqual(mockSkill);
    });

    it('should return 409 for duplicate skill', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 }); // Duplicate found

      const res = await request(app)
        .post('/api/skills')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'JavaScript',
          category: 'Programming',
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('Duplicate skill');
    });

    it('should return 400 if skill name missing', async () => {
      const res = await request(app)
        .post('/api/skills')
        .set('Authorization', 'Bearer valid-token')
        .send({
          category: 'Programming',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Skill name required');
    });

    it('should return 409 if duplicate skill', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 });

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
  });

  describe('GET /api/skills', () => {
    it('should return all skills', async () => {
      const mockSkills = [
        { id: 1, name: 'JavaScript', category: 'Programming', proficiency: 'Advanced' },
        { id: 2, name: 'Python', category: 'Programming', proficiency: 'Intermediate' },
      ];

      mockQueryFn.mockResolvedValueOnce({ rows: mockSkills, rowCount: 2 });

      const res = await request(app)
        .get('/api/skills')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.skills).toEqual(mockSkills);
    });

    it('should return empty array when no skills', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [], rowCount: 0 });

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
  });

  describe('PUT /api/skills/:id', () => {
    it('should update skill', async () => {
      const updatedSkill = { id: 1, name: 'JavaScript', category: 'Frontend', proficiency: 'Expert' };
      mockQueryFn.mockResolvedValueOnce({ rows: [updatedSkill], rowCount: 1 });

      const res = await request(app)
        .put('/api/skills/1')
        .set('Authorization', 'Bearer valid-token')
        .send({
          category: 'Frontend',
          proficiency: 'Expert',
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Skill updated');
      expect(res.body.skill).toEqual(updatedSkill);
    });

    it('should return 404 if skill not found', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = await request(app)
        .put('/api/skills/999')
        .set('Authorization', 'Bearer valid-token')
        .send({
          proficiency: 'Expert',
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
          proficiency: 'Expert',
        });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Update failed');
    });
  });

  describe('DELETE /api/skills/:id', () => {
    it('should delete skill', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 });

      const res = await request(app)
        .delete('/api/skills/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Deleted');
    });

    it('should return 404 if skill not found', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [], rowCount: 0 });

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
  });
});

