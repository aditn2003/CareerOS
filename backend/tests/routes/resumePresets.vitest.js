/**
 * Resume Presets Routes - Full Coverage Tests
 * File: backend/routes/resumePresets.js
 */

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import resumePresetsRouter from '../../routes/resumePresets.js';

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
    globalThis.__resumePresetsMockQueryFn = queryFn;
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
  mockQueryFn = globalThis.__resumePresetsMockQueryFn || vi.fn();
  
  process.env.JWT_SECRET = 'test-secret';
  
  app = express();
  app.use(express.json());
  app.use('/api', resumePresetsRouter);
});

beforeEach(() => {
  // Ensure mockQueryFn is available
  if (!mockQueryFn) {
    mockQueryFn = globalThis.__resumePresetsMockQueryFn || vi.fn();
  }
  vi.clearAllMocks();
  // Re-assign after clearing to ensure it's still available
  mockQueryFn = globalThis.__resumePresetsMockQueryFn || vi.fn();
});

// ============================================
// TESTS
// ============================================

describe('Resume Presets Routes - Full Coverage', () => {
  describe('POST /api/resume-presets', () => {
    it('should create resume preset', async () => {
      const mockPreset = {
        id: 1,
        user_id: 1,
        name: 'Tech Resume',
        section_order: ['education', 'experience', 'skills'],
        visible_sections: ['education', 'experience', 'skills'],
        created_at: '2024-01-01',
      };

      mockQueryFn.mockResolvedValueOnce({ rows: [mockPreset], rowCount: 1 });

      const res = await request(app)
        .post('/api/resume-presets')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'Tech Resume',
          section_order: ['education', 'experience', 'skills'],
          visible_sections: ['education', 'experience', 'skills'],
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('✅ Preset saved successfully');
      expect(res.body.preset).toEqual(mockPreset);
    });

    it('should return 400 if name missing', async () => {
      const res = await request(app)
        .post('/api/resume-presets')
        .set('Authorization', 'Bearer valid-token')
        .send({
          section_order: ['education', 'experience'],
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid data');
    });

    it('should return 400 if section_order not array', async () => {
      const res = await request(app)
        .post('/api/resume-presets')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'Tech Resume',
          section_order: 'not-an-array',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid data');
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .post('/api/resume-presets')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'Tech Resume',
          section_order: ['education', 'experience'],
        });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Database error');
    });
  });

  describe('GET /api/resume-presets', () => {
    it('should return all presets', async () => {
      const mockPresets = [
        { id: 1, name: 'Tech Resume', section_order: ['education', 'experience'] },
        { id: 2, name: 'Academic Resume', section_order: ['education', 'publications'] },
      ];

      mockQueryFn.mockResolvedValueOnce({ rows: mockPresets, rowCount: 2 });

      const res = await request(app)
        .get('/api/resume-presets')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.presets).toEqual(mockPresets);
    });

    it('should return empty array when no presets', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = await request(app)
        .get('/api/resume-presets')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.presets).toEqual([]);
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .get('/api/resume-presets')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Database error');
    });
  });

  describe('DELETE /api/resume-presets/:id', () => {
    it('should delete preset', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      const res = await request(app)
        .delete('/api/resume-presets/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('🗑️ Preset deleted');
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .delete('/api/resume-presets/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Database error');
    });
  });
});

