/**
 * Mentors Routes - Full Coverage Tests
 * File: backend/routes/mentors.js
 */

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import mentorsRouter from '../../routes/mentors.js';

// ============================================
// MOCKS
// ============================================

const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        data: [],
        error: null,
      })),
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        data: [{ id: 1 }],
        error: null,
      })),
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        data: [{ id: 1 }],
        error: null,
      })),
    })),
    delete: vi.fn(() => ({
      eq: vi.fn(() => ({
        data: [],
        error: null,
      })),
    })),
  })),
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabase),
}));

vi.mock('jsonwebtoken', () => ({
  default: {
    verify: vi.fn((token) => {
      if (token === 'valid-token') return { id: 1, email: 'test@example.com' };
      throw new Error('Invalid token');
    }),
  },
}));

// ============================================
// SETUP
// ============================================

let app;

beforeAll(() => {
  process.env.SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_ANON_KEY = 'test-key';
  process.env.JWT_SECRET = 'test-secret';
  
  app = express();
  app.use(express.json());
  app.use('/api/mentors', mentorsRouter);
});

beforeEach(() => {
  vi.clearAllMocks();
});

// ============================================
// TESTS
// ============================================

describe('Mentors Routes - Full Coverage', () => {
  describe('GET /api/mentors/dashboard', () => {
    it('should return mentor dashboard', async () => {
      const mockRelationships = [{ id: 1, mentor_id: 1, mentee_id: 2 }];
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            data: mockRelationships,
            error: null,
          })),
        })),
      });

      const res = await request(app)
        .get('/api/mentors/dashboard')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /api/mentors/my-mentors', () => {
    it('should return user mentors', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              data: [],
              error: null,
            })),
          })),
        })),
      });

      const res = await request(app)
        .get('/api/mentors/my-mentors')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/mentors/invite', () => {
    it('should invite mentor', async () => {
      mockSupabase.from.mockReturnValue({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            data: [{ id: 1 }],
            error: null,
          })),
        })),
      });

      const res = await request(app)
        .post('/api/mentors/invite')
        .set('Authorization', 'Bearer valid-token')
        .send({
          mentor_email: 'mentor@example.com',
        });

      expect(res.status).toBe(200);
    });
  });
});

