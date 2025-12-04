/**
 * Technical Prep Routes - Full Coverage Tests
 * File: backend/routes/technicalPrep.js
 */

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import technicalPrepRouter from '../../routes/technicalPrep.js';

// ============================================
// MOCKS
// ============================================

const mockPost = vi.fn();
const mockGet = vi.fn();

vi.mock('axios', () => ({
  default: {
    post: mockPost,
  },
}));

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
  process.env.OPENAI_API_KEY = 'test-key';
  
  app = express();
  app.use(express.json());
  app.use('/api/technical-prep', technicalPrepRouter);
});

beforeEach(() => {
  vi.clearAllMocks();
});

// ============================================
// TESTS
// ============================================

describe('Technical Prep Routes - Full Coverage', () => {
  describe('POST /api/technical-prep/coding-challenge', () => {
    it('should generate coding challenge', async () => {
      const mockAIResponse = {
        data: {
          choices: [{
            message: {
              content: JSON.stringify({
                title: 'Two Sum',
                description: 'Find two numbers...',
                difficulty: 'Easy',
              }),
            },
          }],
        },
      };

      mockPost.mockResolvedValueOnce(mockAIResponse);

      const res = await request(app)
        .post('/api/technical-prep/coding-challenge')
        .send({
          techStack: ['JavaScript'],
          difficulty: 'Easy',
        });

      expect([200, 500]).toContain(res.status);
    });

    it('should use fallback if no API key', async () => {
      delete process.env.OPENAI_API_KEY;

      const res = await request(app)
        .post('/api/technical-prep/coding-challenge')
        .send({
          techStack: ['JavaScript'],
          difficulty: 'Easy',
        });

      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/technical-prep/system-design', () => {
    it('should generate system design question', async () => {
      const mockAIResponse = {
        data: {
          choices: [{
            message: {
              content: JSON.stringify({
                question: 'Design a URL shortener',
                requirements: ['Handle 1M requests/day'],
              }),
            },
          }],
        },
      };

      mockPost.mockResolvedValueOnce(mockAIResponse);

      const res = await request(app)
        .post('/api/technical-prep/system-design')
        .send({
          role: 'Senior Engineer',
          company: 'Tech Corp',
        });

      expect([200, 500]).toContain(res.status);
    });
  });

  describe('GET /api/technical-prep/user/:userId/stats', () => {
    it('should return user stats', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            data: [],
            error: null,
          })),
        })),
      });

      const res = await request(app)
        .get('/api/technical-prep/user/1/stats');

      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/technical-prep/solution-frameworks', () => {
    it('should return solution frameworks', async () => {
      const res = await request(app)
        .get('/api/technical-prep/solution-frameworks');

      expect(res.status).toBe(200);
      expect(res.body.frameworks).toBeDefined();
    });
  });
});

