/**
 * Referrals Routes - Full Coverage Tests
 * File: backend/routes/referrals.js
 */

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import referralsRouter from '../../routes/referrals.js';

// ============================================
// MOCKS
// ============================================

const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            data: [],
            error: null,
          })),
        })),
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
        eq: vi.fn(() => ({
          data: [{ id: 1 }],
          error: null,
        })),
      })),
    })),
    delete: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          data: [],
          error: null,
        })),
      })),
    })),
  })),
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabase),
}));

// ============================================
// SETUP
// ============================================

let app;

beforeAll(() => {
  process.env.SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_ANON_KEY = 'test-key';
  
  app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.user = { id: 1 };
    next();
  });
  app.use('/api/referrals', referralsRouter);
});

beforeEach(() => {
  vi.clearAllMocks();
});

// ============================================
// TESTS
// ============================================

describe('Referrals Routes - Full Coverage', () => {
  describe('GET /api/referrals/requests', () => {
    it('should return all referral requests', async () => {
      const mockRequests = [{ id: 1, contact_id: 1, job_id: 1 }];
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              data: mockRequests,
              error: null,
            })),
          })),
        })),
      });

      const res = await request(app)
        .get('/api/referrals/requests');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should filter by status', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => ({
                data: [],
                error: null,
              })),
            })),
          })),
        })),
      });

      const res = await request(app)
        .get('/api/referrals/requests?status=pending');

      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/referrals/requests', () => {
    it('should create referral request', async () => {
      const mockRequest = { id: 1, contact_id: 1, job_id: 1 };
      mockSupabase.from.mockReturnValue({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            data: [mockRequest],
            error: null,
          })),
        })),
      });

      const res = await request(app)
        .post('/api/referrals/requests')
        .send({
          contact_id: 1,
          job_id: 1,
          job_title: 'Engineer',
          company: 'Tech Corp',
        });

      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/referrals/statistics', () => {
    it('should return statistics', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            data: [],
            error: null,
          })),
        })),
      });

      const res = await request(app)
        .get('/api/referrals/statistics');

      expect(res.status).toBe(200);
    });
  });
});

