/**
 * Resume Presets Routes - 90%+ Coverage Tests
 * Tests for backend/routes/resumePresets.js
 */

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// ============================================
// MOCKS
// ============================================

const mockQuery = vi.fn();

vi.mock('pg', () => {
  return {
    Pool: class {
      query = mockQuery;
      connect = () => Promise.resolve({ query: mockQuery, release: vi.fn() });
      on = vi.fn();
    },
  };
});

vi.mock('jsonwebtoken', () => ({
  default: {
    verify: vi.fn((token) => {
      if (token === 'valid-token') return { id: 1, email: 'test@example.com' };
      throw new Error('Invalid token');
    }),
    sign: vi.fn(() => 'mock-token'),
  },
}));

// Mock data
const mockPreset = {
  id: 1,
  user_id: 1,
  name: 'Tech Resume',
  section_order: ['summary', 'experience', 'skills', 'education'],
  visible_sections: ['summary', 'experience', 'skills'],
  created_at: new Date().toISOString(),
};

// ============================================
// TESTS
// ============================================

describe('Resume Presets Routes - 90%+ Coverage', () => {
  let app;
  let resumePresetsRouter;

  beforeAll(async () => {
    const module = await import('../../routes/resumePresets.js');
    resumePresetsRouter = module.default;
    
    app = express();
    app.use(express.json());
    app.use('/api', resumePresetsRouter);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ========================================
  // POST /resume-presets - Create preset
  // ========================================
  describe('POST /api/resume-presets', () => {
    it('should create resume preset successfully', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockPreset], rowCount: 1 });

      const res = await request(app)
        .post('/api/resume-presets')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'Tech Resume',
          section_order: ['summary', 'experience', 'skills'],
          visible_sections: ['summary', 'experience'],
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('✅ Preset saved successfully');
      expect(res.body.preset).toBeDefined();
    });

    it('should return 400 if name is missing', async () => {
      const res = await request(app)
        .post('/api/resume-presets')
        .set('Authorization', 'Bearer valid-token')
        .send({
          section_order: ['summary', 'experience'],
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid data');
    });

    it('should return 400 if section_order is missing', async () => {
      const res = await request(app)
        .post('/api/resume-presets')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'My Preset',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid data');
    });

    it('should return 400 if section_order is not an array', async () => {
      const res = await request(app)
        .post('/api/resume-presets')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'My Preset',
          section_order: 'not-an-array',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid data');
    });

    it('should return 500 on database error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .post('/api/resume-presets')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'Tech Resume',
          section_order: ['summary'],
        });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Database error');
    });

    it('should return 401 without token', async () => {
      const res = await request(app)
        .post('/api/resume-presets')
        .send({
          name: 'Preset',
          section_order: ['summary'],
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('No token');
    });

    it('should return 401 with invalid token', async () => {
      const res = await request(app)
        .post('/api/resume-presets')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          name: 'Preset',
          section_order: ['summary'],
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid token');
    });
  });

  // ========================================
  // GET /resume-presets - Get all presets
  // ========================================
  describe('GET /api/resume-presets', () => {
    it('should return all presets for user', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockPreset], rowCount: 1 });

      const res = await request(app)
        .get('/api/resume-presets')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.presets).toBeDefined();
      expect(Array.isArray(res.body.presets)).toBe(true);
    });

    it('should return empty array if no presets', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = await request(app)
        .get('/api/resume-presets')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.presets).toEqual([]);
    });

    it('should return 500 on database error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .get('/api/resume-presets')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Database error');
    });

    it('should return 401 without token', async () => {
      const res = await request(app)
        .get('/api/resume-presets');

      expect(res.status).toBe(401);
    });
  });

  // ========================================
  // DELETE /resume-presets/:id - Delete preset
  // ========================================
  describe('DELETE /api/resume-presets/:id', () => {
    it('should delete preset successfully', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      const res = await request(app)
        .delete('/api/resume-presets/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('🗑️ Preset deleted');
    });

    it('should return 500 on database error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .delete('/api/resume-presets/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Database error');
    });

    it('should return 401 without token', async () => {
      const res = await request(app)
        .delete('/api/resume-presets/1');

      expect(res.status).toBe(401);
    });
  });
});

