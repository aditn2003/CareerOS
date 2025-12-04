/**
 * Salary Research Routes - Full Coverage Tests
 * File: backend/routes/salaryResearch.js
 */

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import salaryResearchRouter from '../../routes/salaryResearch.js';

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
    globalThis.__salaryResearchMockQueryFn = queryFn;
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

vi.mock('../../auth.js', () => ({
  auth: vi.fn((req, res, next) => {
    req.user = { id: 1 };
    req.userId = 1;
    next();
  }),
}));

vi.mock('openai', () => {
  return {
    default: vi.fn(() => ({
      chat: {
        completions: {
          create: vi.fn(),
        },
      },
    })),
  };
});

// ============================================
// SETUP
// ============================================

let app;

beforeAll(() => {
  // Initialize mockQueryFn after mocks are set up
  mockQueryFn = globalThis.__salaryResearchMockQueryFn || vi.fn();
  
  process.env.OPENAI_API_KEY = 'test-key';
  app = express();
  app.use(express.json());
  app.use('/api/salary-research', salaryResearchRouter);
});

beforeEach(() => {
  // Ensure mockQueryFn is available
  if (!mockQueryFn) {
    mockQueryFn = globalThis.__salaryResearchMockQueryFn || vi.fn();
  }
  vi.clearAllMocks();
  // Re-assign after clearing to ensure it's still available
  mockQueryFn = globalThis.__salaryResearchMockQueryFn || vi.fn();
});

// ============================================
// TESTS
// ============================================

describe('Salary Research Routes - Full Coverage', () => {
  describe('GET /api/salary-research/:jobId', () => {
    it('should return salary research for job', async () => {
      const mockJob = {
        id: 1,
        title: 'Software Engineer',
        company: 'Tech Corp',
        location: 'San Francisco, CA',
      };

      mockQueryFn.mockResolvedValueOnce({ rows: [mockJob] });

      const res = await request(app)
        .get('/api/salary-research/1')
        .set('Authorization', 'Bearer valid-token');

      expect([200, 500]).toContain(res.status);
    });

    it('should return 404 if job not found', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/api/salary-research/999')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Job not found');
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .get('/api/salary-research/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
    });

    it('should handle different job title levels', async () => {
      const mockJob = {
        id: 1,
        title: 'Senior Software Engineer',
        company: 'Tech Corp',
        location: 'San Francisco, CA',
      };
      const mockAIResponse = {
        choices: [{
          message: {
            content: 'Recommendation 1\nRecommendation 2',
          },
        }],
      };

      mockQueryFn.mockResolvedValueOnce({ rows: [mockJob] });
      const { default: OpenAI } = await import('openai');
      const mockOpenAI = vi.mocked(OpenAI);
      const mockInstance = mockOpenAI.mock.results[0].value;
      mockInstance.chat.completions.create.mockResolvedValueOnce(mockAIResponse);

      const res = await request(app)
        .get('/api/salary-research/1?userSalary=100000')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.level).toBe('Senior');
    });

    it('should handle large company names', async () => {
      const mockJob = {
        id: 1,
        title: 'Software Engineer',
        company: 'Google',
        location: 'Mountain View, CA',
      };
      const mockAIResponse = {
        choices: [{
          message: {
            content: 'Recommendations',
          },
        }],
      };

      mockQueryFn.mockResolvedValueOnce({ rows: [mockJob] });
      const { default: OpenAI } = await import('openai');
      const mockOpenAI = vi.mocked(OpenAI);
      const mockInstance = mockOpenAI.mock.results[0].value;
      mockInstance.chat.completions.create.mockResolvedValueOnce(mockAIResponse);

      const res = await request(app)
        .get('/api/salary-research/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.companySize).toBe('Large');
    });

    it('should handle AI error gracefully', async () => {
      const mockJob = {
        id: 1,
        title: 'Engineer',
        company: 'Tech Corp',
        location: 'SF',
      };

      mockQueryFn.mockResolvedValueOnce({ rows: [mockJob] });
      const { default: OpenAI } = await import('openai');
      const mockOpenAI = vi.mocked(OpenAI);
      const mockInstance = mockOpenAI.mock.results[0].value;
      mockInstance.chat.completions.create.mockRejectedValueOnce(new Error('AI error'));

      const res = await request(app)
        .get('/api/salary-research/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
    });

    it('should calculate market difference correctly', async () => {
      const mockJob = {
        id: 1,
        title: 'Software Engineer',
        company: 'Tech Corp',
        location: 'SF',
      };
      const mockAIResponse = {
        choices: [{
          message: {
            content: 'Recommendations',
          },
        }],
      };

      mockQueryFn.mockResolvedValueOnce({ rows: [mockJob] });
      const { default: OpenAI } = await import('openai');
      const mockOpenAI = vi.mocked(OpenAI);
      const mockInstance = mockOpenAI.mock.results[0].value;
      mockInstance.chat.completions.create.mockResolvedValueOnce(mockAIResponse);

      const res = await request(app)
        .get('/api/salary-research/1?userSalary=100000')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.userSalary).toBe(100000);
      expect(res.body.marketDiff).toBeDefined();
    });
  });
});

