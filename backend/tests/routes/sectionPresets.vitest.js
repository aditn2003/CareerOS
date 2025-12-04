/**
 * Section Presets Routes - 90%+ Coverage Tests
 * Tests for backend/routes/sectionPresets.js
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
  section_name: 'experience',
  preset_name: 'Tech Experience',
  section_data: { format: 'detailed', items: [] },
  created_at: new Date().toISOString(),
};

// ============================================
// TESTS
// ============================================

describe('Section Presets Routes - 90%+ Coverage', () => {
  let app;
  let sectionPresetsRouter;

  beforeAll(async () => {
    const module = await import('../../routes/sectionPresets.js');
    sectionPresetsRouter = module.default;
    
    app = express();
    app.use(express.json());
    app.use('/api', sectionPresetsRouter);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ========================================
  // POST /section-presets - Create preset
  // ========================================
  describe('POST /api/section-presets', () => {
    it('should create section preset successfully', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockPreset], rowCount: 1 });

      const res = await request(app)
        .post('/api/section-presets')
        .set('Authorization', 'Bearer valid-token')
        .send({
          section_name: 'experience',
          preset_name: 'Tech Experience',
          section_data: { format: 'detailed' },
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('✅ Section preset saved');
      expect(res.body.preset).toBeDefined();
    });

    it('should return 400 if section_name is missing', async () => {
      const res = await request(app)
        .post('/api/section-presets')
        .set('Authorization', 'Bearer valid-token')
        .send({
          preset_name: 'My Preset',
          section_data: {},
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Missing required fields');
    });

    it('should return 400 if preset_name is missing', async () => {
      const res = await request(app)
        .post('/api/section-presets')
        .set('Authorization', 'Bearer valid-token')
        .send({
          section_name: 'experience',
          section_data: {},
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Missing required fields');
    });

    it('should return 400 if section_data is missing', async () => {
      const res = await request(app)
        .post('/api/section-presets')
        .set('Authorization', 'Bearer valid-token')
        .send({
          section_name: 'experience',
          preset_name: 'My Preset',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Missing required fields');
    });

    it('should return 500 on database error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .post('/api/section-presets')
        .set('Authorization', 'Bearer valid-token')
        .send({
          section_name: 'experience',
          preset_name: 'Tech',
          section_data: {},
        });

      expect(res.status).toBe(500);
    });

    it('should return 401 without token', async () => {
      const res = await request(app)
        .post('/api/section-presets')
        .send({
          section_name: 'experience',
          preset_name: 'Tech',
          section_data: {},
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('No token');
    });

    it('should return 401 with invalid token', async () => {
      const res = await request(app)
        .post('/api/section-presets')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          section_name: 'experience',
          preset_name: 'Tech',
          section_data: {},
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid token');
    });
  });

  // ========================================
  // GET /section-presets/:section_name - Get presets
  // ========================================
  describe('GET /api/section-presets/:section_name', () => {
    it('should return presets for section', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockPreset], rowCount: 1 });

      const res = await request(app)
        .get('/api/section-presets/experience')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.presets).toBeDefined();
      expect(Array.isArray(res.body.presets)).toBe(true);
    });

    it('should return empty array if no presets found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = await request(app)
        .get('/api/section-presets/skills')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.presets).toEqual([]);
    });

    it('should return 500 on database error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .get('/api/section-presets/experience')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Database error');
    });

    it('should return 401 without token', async () => {
      const res = await request(app)
        .get('/api/section-presets/experience');

      expect(res.status).toBe(401);
    });
  });

  // ========================================
  // DELETE /section-presets/:id - Delete preset
  // ========================================
  describe('DELETE /api/section-presets/:id', () => {
    it('should delete preset successfully', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      const res = await request(app)
        .delete('/api/section-presets/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('🗑️ Preset deleted');
    });

    it('should return 500 on database error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .delete('/api/section-presets/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Database error');
    });

    it('should return 401 without token', async () => {
      const res = await request(app)
        .delete('/api/section-presets/1');

      expect(res.status).toBe(401);
    });
  });
});

