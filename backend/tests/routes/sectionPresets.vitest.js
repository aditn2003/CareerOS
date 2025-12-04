/**
 * Section Presets Routes - Full Coverage Tests
 * File: backend/routes/sectionPresets.js
 */

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import sectionPresetsRouter from '../../routes/sectionPresets.js';

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
    globalThis.__sectionPresetsMockQueryFn = queryFn;
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
  mockQueryFn = globalThis.__sectionPresetsMockQueryFn || vi.fn();
  
  process.env.JWT_SECRET = 'test-secret';
  
  app = express();
  app.use(express.json());
  app.use('/api', sectionPresetsRouter);
});

beforeEach(() => {
  // Ensure mockQueryFn is available
  if (!mockQueryFn) {
    mockQueryFn = globalThis.__sectionPresetsMockQueryFn || vi.fn();
  }
  vi.clearAllMocks();
  // Re-assign after clearing to ensure it's still available
  mockQueryFn = globalThis.__sectionPresetsMockQueryFn || vi.fn();
});

// ============================================
// TESTS
// ============================================

describe('Section Presets Routes - Full Coverage', () => {
  describe('POST /api/section-presets', () => {
    it('should create section preset', async () => {
      const mockPreset = {
        id: 1,
        user_id: 1,
        section_name: 'experience',
        preset_name: 'Tech Experience',
        section_data: { company: 'Tech Corp', role: 'Engineer' },
        created_at: '2024-01-01',
      };

      mockQueryFn.mockResolvedValueOnce({ rows: [mockPreset], rowCount: 1 });

      const res = await request(app)
        .post('/api/section-presets')
        .set('Authorization', 'Bearer valid-token')
        .send({
          section_name: 'experience',
          preset_name: 'Tech Experience',
          section_data: { company: 'Tech Corp', role: 'Engineer' },
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('✅ Section preset saved');
      expect(res.body.preset).toEqual(mockPreset);
    });

    it('should return 400 if required fields missing', async () => {
      const res = await request(app)
        .post('/api/section-presets')
        .set('Authorization', 'Bearer valid-token')
        .send({
          section_name: 'experience',
          // Missing preset_name and section_data
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Missing required fields');
    });

    it('should stringify section_data', async () => {
      const mockPreset = {
        id: 1,
        section_data: '{"company":"Tech Corp"}',
      };

      mockQueryFn.mockResolvedValueOnce({ rows: [mockPreset], rowCount: 1 });

      const res = await request(app)
        .post('/api/section-presets')
        .set('Authorization', 'Bearer valid-token')
        .send({
          section_name: 'experience',
          preset_name: 'Tech Experience',
          section_data: { company: 'Tech Corp' },
        });

      expect(res.status).toBe(200);
      // Verify section_data was stringified
      expect(mockQueryFn).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO section_presets'),
        expect.arrayContaining([1, 'experience', 'Tech Experience', expect.stringContaining('company')])
      );
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .post('/api/section-presets')
        .set('Authorization', 'Bearer valid-token')
        .send({
          section_name: 'experience',
          preset_name: 'Tech Experience',
          section_data: { company: 'Tech Corp' },
        });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Database error');
    });
  });

  describe('GET /api/section-presets/:section_name', () => {
    it('should return presets for section', async () => {
      const mockPresets = [
        { id: 1, preset_name: 'Tech Experience', section_data: '{"company":"Tech Corp"}' },
        { id: 2, preset_name: 'Academic Experience', section_data: '{"company":"University"}' },
      ];

      mockQueryFn.mockResolvedValueOnce({ rows: mockPresets, rowCount: 2 });

      const res = await request(app)
        .get('/api/section-presets/experience')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.presets).toEqual(mockPresets);
    });

    it('should return empty array when no presets', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = await request(app)
        .get('/api/section-presets/experience')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.presets).toEqual([]);
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .get('/api/section-presets/experience')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Database error');
    });
  });

  describe('DELETE /api/section-presets/:id', () => {
    it('should delete preset', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      const res = await request(app)
        .delete('/api/section-presets/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('🗑️ Preset deleted');
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .delete('/api/section-presets/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Database error');
    });
  });
});

