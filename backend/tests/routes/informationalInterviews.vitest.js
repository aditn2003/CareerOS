/**
 * Informational Interviews Routes - Full Coverage Tests
 * File: backend/routes/informationalInterviews.js
 */

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import informationalInterviewsRouter from '../../routes/informationalInterviews.js';
import { createClient } from '@supabase/supabase-js';

// ============================================
// MOCKS
// ============================================

// Create a chainable query builder mock
function createQueryBuilder(initialData = [], initialError = null) {
  let queryData = initialData;
  let queryError = initialError;

  const builder = {
    select: vi.fn((columns) => builder),
    eq: vi.fn((column, value) => builder),
    order: vi.fn((column, options) => builder),
    single: vi.fn(() => Promise.resolve({ data: queryData[0] || null, error: queryError })),
  };

  builder.then = function(resolve) {
    return Promise.resolve({ data: queryData, error: queryError }).then(resolve);
  };
  builder.catch = function(reject) {
    return Promise.resolve({ data: queryData, error: queryError }).catch(reject);
  };

  return builder;
}

vi.mock('@supabase/supabase-js', () => {
  const createQueryBuilder = (initialData = [], initialError = null) => {
    let queryData = initialData;
    let queryError = initialError;

    const builder = {
      select: vi.fn((columns) => builder),
      eq: vi.fn((column, value) => builder),
      order: vi.fn((column, options) => builder),
      single: vi.fn(() => Promise.resolve({ data: queryData[0] || null, error: queryError })),
    };

    builder.then = function(resolve) {
      return Promise.resolve({ data: queryData, error: queryError }).then(resolve);
    };
    builder.catch = function(reject) {
      return Promise.resolve({ data: queryData, error: queryError }).catch(reject);
    };

    return builder;
  };

  const mockSupabase = {
    from: vi.fn((table) => {
      const tableBuilder = {
        select: vi.fn((columns) => createQueryBuilder([], null)),
        insert: vi.fn((data) => ({
          select: vi.fn(() => Promise.resolve({ data: Array.isArray(data) ? data : [data], error: null })),
        })),
        update: vi.fn((data) => {
          const chainableBuilder = {
            eq: vi.fn(() => chainableBuilder),
            select: vi.fn(() => Promise.resolve({ data: [{ id: 1, ...data }], error: null })),
          };
          return chainableBuilder;
        }),
        delete: vi.fn(() => {
          const chainableBuilder = {
            eq: vi.fn(() => chainableBuilder),
            select: vi.fn(() => Promise.resolve({ data: [{ id: 1 }], error: null })),
            then: (resolve) => Promise.resolve({ data: [{ id: 1 }], error: null }).then(resolve),
            catch: (reject) => Promise.resolve({ data: [], error: null }).catch(reject),
          };
          return chainableBuilder;
        }),
      };
      return tableBuilder;
    }),
  };

  return {
    createClient: vi.fn(() => mockSupabase),
  };
});

vi.mock('../../auth.js', () => ({
  auth: vi.fn((req, res, next) => {
    const h = req.headers.authorization || "";
    const token = h.startsWith("Bearer ") ? h.split(" ")[1]?.trim() : null;
    if (!token) {
      return res.status(401).json({ error: "NO_TOKEN" });
    }
    req.user = { id: 1 };
    next();
  }),
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
  app.use('/api/informational-interviews', informationalInterviewsRouter);
});

beforeEach(() => {
  vi.clearAllMocks();
});

// ============================================
// TESTS
// ============================================

describe('Informational Interviews Routes - Full Coverage', () => {
  describe('GET /api/informational-interviews/candidates', () => {
    it('should return all candidates', async () => {
      const mockData = [{ id: 1, first_name: 'John', last_name: 'Doe' }];
      const queryBuilder = createQueryBuilder(mockData, null);
      const mockSupabase = vi.mocked(createClient)();
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => queryBuilder),
      });

      const res = await request(app)
        .get('/api/informational-interviews/candidates')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual(mockData);
    });

    it('should return 500 on error', async () => {
      const queryBuilder = createQueryBuilder(null, { message: 'Database error' });
      const mockSupabase = vi.mocked(createClient)();
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => queryBuilder),
      });

      const res = await request(app)
        .get('/api/informational-interviews/candidates')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
    });
  });

  describe('POST /api/informational-interviews/candidates', () => {
    it('should create candidate', async () => {
      const mockCandidate = { id: 1, first_name: 'John', last_name: 'Doe' };
      const mockSupabase = vi.mocked(createClient)();
      mockSupabase.from.mockReturnValueOnce({
        insert: vi.fn(() => ({
          select: vi.fn(() => Promise.resolve({ data: [mockCandidate], error: null })),
        })),
      });

      const res = await request(app)
        .post('/api/informational-interviews/candidates')
        .set('Authorization', 'Bearer valid-token')
        .send({
          first_name: 'John',
          last_name: 'Doe',
        });

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual(mockCandidate);
    });

    it('should return 400 if required fields missing', async () => {
      const res = await request(app)
        .post('/api/informational-interviews/candidates')
        .set('Authorization', 'Bearer valid-token')
        .send({
          first_name: 'John',
          // Missing last_name
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('required');
    });
  });

  describe('GET /api/informational-interviews/interviews', () => {
    it('should return all interviews', async () => {
      const mockInterviews = [{ id: 1, candidate_id: 1 }];
      const queryBuilder = createQueryBuilder(mockInterviews, null);
      const mockSupabase = vi.mocked(createClient)();
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => queryBuilder),
      });
      // Mock the preparation query
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
      });

      const res = await request(app)
        .get('/api/informational-interviews/interviews')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/informational-interviews/interviews', () => {
    it('should create interview', async () => {
      const mockInterview = { id: 1, candidate_id: 1 };
      const mockSupabase = vi.mocked(createClient)();
      mockSupabase.from.mockReturnValueOnce({
        insert: vi.fn(() => ({
          select: vi.fn(() => Promise.resolve({ data: [mockInterview], error: null })),
        })),
      });

      const res = await request(app)
        .post('/api/informational-interviews/interviews')
        .set('Authorization', 'Bearer valid-token')
        .send({
          candidate_id: 1,
          scheduled_date: '2024-01-01',
        });

      expect(res.status).toBe(200);
    });

    it('should return 400 if candidate_id missing', async () => {
      const res = await request(app)
        .post('/api/informational-interviews/interviews')
        .set('Authorization', 'Bearer valid-token')
        .send({
          scheduled_date: '2024-01-01',
        });

      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/informational-interviews/candidates/:id', () => {
    it('should update candidate', async () => {
      const mockCandidate = { id: 1, first_name: 'Jane', last_name: 'Doe' };
      const mockSupabase = vi.mocked(createClient)();
      mockSupabase.from.mockReturnValueOnce({
        update: vi.fn(() => {
          const chainableBuilder = {
            eq: vi.fn(() => chainableBuilder),
            select: vi.fn(() => Promise.resolve({ data: [mockCandidate], error: null })),
          };
          return chainableBuilder;
        }),
      });

      const res = await request(app)
        .put('/api/informational-interviews/candidates/1')
        .set('Authorization', 'Bearer valid-token')
        .send({
          first_name: 'Jane',
          last_name: 'Doe',
        });

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual(mockCandidate);
    });

    it('should return 500 if candidate not found (empty data array)', async () => {
      const mockSupabase = vi.mocked(createClient)();
      mockSupabase.from.mockReturnValueOnce({
        update: vi.fn(() => {
          const chainableBuilder = {
            eq: vi.fn(() => chainableBuilder),
            select: vi.fn(() => Promise.resolve({ data: [], error: null })),
          };
          return chainableBuilder;
        }),
      });

      const res = await request(app)
        .put('/api/informational-interviews/candidates/999')
        .set('Authorization', 'Bearer valid-token')
        .send({
          first_name: 'Jane',
        });

      // The route returns 500 when data[0] is undefined
      expect(res.status).toBe(500);
    });
  });

  describe('DELETE /api/informational-interviews/candidates/:id', () => {
    it('should delete candidate', async () => {
      const mockSupabase = vi.mocked(createClient)();
      mockSupabase.from.mockReturnValueOnce({
        delete: vi.fn(() => {
          const chainableBuilder = {
            eq: vi.fn(() => chainableBuilder),
            then: (resolve) => Promise.resolve({ data: [], error: null }).then(resolve),
            catch: (reject) => Promise.resolve({ data: [], error: null }).catch(reject),
          };
          return chainableBuilder;
        }),
      });

      const res = await request(app)
        .delete('/api/informational-interviews/candidates/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });
  });

  describe('PUT /api/informational-interviews/interviews/:id', () => {
    it('should update interview', async () => {
      const mockInterview = { id: 1, candidate_id: 1, scheduled_date: '2024-01-01' };
      const mockSupabase = vi.mocked(createClient)();
      mockSupabase.from.mockReturnValueOnce({
        update: vi.fn(() => {
          const chainableBuilder = {
            eq: vi.fn(() => chainableBuilder),
            select: vi.fn(() => Promise.resolve({ data: [mockInterview], error: null })),
          };
          return chainableBuilder;
        }),
      });

      const res = await request(app)
        .put('/api/informational-interviews/interviews/1')
        .set('Authorization', 'Bearer valid-token')
        .send({
          scheduled_date: '2024-01-02',
        });

      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/informational-interviews/interviews/:id', () => {
    it('should return single interview', async () => {
      const mockInterview = { id: 1, candidate_id: 1 };
      const mockSupabase = vi.mocked(createClient)();
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: mockInterview, error: null })),
          })),
        })),
      });

      const res = await request(app)
        .get('/api/informational-interviews/interviews/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual(mockInterview);
    });
  });

  describe('DELETE /api/informational-interviews/interviews/:id', () => {
    it('should delete interview', async () => {
      const mockSupabase = vi.mocked(createClient)();
      mockSupabase.from.mockReturnValueOnce({
        delete: vi.fn(() => {
          const chainableBuilder = {
            eq: vi.fn(() => chainableBuilder),
            then: (resolve) => Promise.resolve({ data: [], error: null }).then(resolve),
            catch: (reject) => Promise.resolve({ data: [], error: null }).catch(reject),
          };
          return chainableBuilder;
        }),
      });

      const res = await request(app)
        .delete('/api/informational-interviews/interviews/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/informational-interviews/preparation/:interviewId', () => {
    it('should return preparation for interview', async () => {
      const mockPrep = { id: 1, interview_id: 1, questions: [] };
      const mockSupabase = vi.mocked(createClient)();
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: mockPrep, error: null })),
          })),
        })),
      });

      const res = await request(app)
        .get('/api/informational-interviews/preparation/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/informational-interviews/preparation', () => {
    it('should create preparation', async () => {
      const mockPrep = { id: 1, interview_id: 1, questions: [] };
      const mockSupabase = vi.mocked(createClient)();
      mockSupabase.from.mockReturnValueOnce({
        insert: vi.fn(() => ({
          select: vi.fn(() => Promise.resolve({ data: [mockPrep], error: null })),
        })),
      });

      const res = await request(app)
        .post('/api/informational-interviews/preparation')
        .set('Authorization', 'Bearer valid-token')
        .send({
          interview_id: 1,
          questions: [],
        });

      expect(res.status).toBe(200);
    });
  });

  describe('PUT /api/informational-interviews/preparation/:id', () => {
    it('should update preparation', async () => {
      const mockPrep = { id: 1, interview_id: 1, questions: ['Q1'] };
      const mockSupabase = vi.mocked(createClient)();
      mockSupabase.from.mockReturnValueOnce({
        update: vi.fn(() => {
          const chainableBuilder = {
            eq: vi.fn(() => chainableBuilder),
            select: vi.fn(() => Promise.resolve({ data: [mockPrep], error: null })),
          };
          return chainableBuilder;
        }),
      });

      const res = await request(app)
        .put('/api/informational-interviews/preparation/1')
        .set('Authorization', 'Bearer valid-token')
        .send({
          questions: ['Q1'],
        });

      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/informational-interviews/followups/:interviewId', () => {
    it('should return followups for interview', async () => {
      const mockFollowups = [{ id: 1, interview_id: 1 }];
      const queryBuilder = createQueryBuilder(mockFollowups, null);
      const mockSupabase = vi.mocked(createClient)();
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => queryBuilder),
      });

      const res = await request(app)
        .get('/api/informational-interviews/followups/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/informational-interviews/followups', () => {
    it('should create followup', async () => {
      const mockFollowup = { id: 1, interview_id: 1, notes: 'Thank you' };
      const mockSupabase = vi.mocked(createClient)();
      mockSupabase.from.mockReturnValueOnce({
        insert: vi.fn(() => ({
          select: vi.fn(() => Promise.resolve({ data: [mockFollowup], error: null })),
        })),
      });

      const res = await request(app)
        .post('/api/informational-interviews/followups')
        .set('Authorization', 'Bearer valid-token')
        .send({
          interview_id: 1,
          notes: 'Thank you',
        });

      expect(res.status).toBe(200);
    });
  });

  describe('PUT /api/informational-interviews/followups/:id', () => {
    it('should update followup', async () => {
      const mockFollowup = { id: 1, interview_id: 1, notes: 'Updated' };
      const mockSupabase = vi.mocked(createClient)();
      mockSupabase.from.mockReturnValueOnce({
        update: vi.fn(() => {
          const chainableBuilder = {
            eq: vi.fn(() => chainableBuilder),
            select: vi.fn(() => Promise.resolve({ data: [mockFollowup], error: null })),
          };
          return chainableBuilder;
        }),
      });

      const res = await request(app)
        .put('/api/informational-interviews/followups/1')
        .set('Authorization', 'Bearer valid-token')
        .send({
          notes: 'Updated',
        });

      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/informational-interviews/insights', () => {
    it('should return all insights', async () => {
      const mockInsights = [{ id: 1, interview_id: 1 }];
      const queryBuilder = createQueryBuilder(mockInsights, null);
      const mockSupabase = vi.mocked(createClient)();
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => queryBuilder),
      });

      const res = await request(app)
        .get('/api/informational-interviews/insights')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/informational-interviews/insights/:interviewId', () => {
    it('should return insights for interview', async () => {
      const mockInsight = { id: 1, interview_id: 1, key_takeaways: [] };
      const mockSupabase = vi.mocked(createClient)();
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: mockInsight, error: null })),
          })),
        })),
      });

      const res = await request(app)
        .get('/api/informational-interviews/insights/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/informational-interviews/insights', () => {
    it('should create insight', async () => {
      const mockInsight = { id: 1, interview_id: 1, key_takeaways: [] };
      const mockSupabase = vi.mocked(createClient)();
      mockSupabase.from.mockReturnValueOnce({
        insert: vi.fn(() => ({
          select: vi.fn(() => Promise.resolve({ data: [mockInsight], error: null })),
        })),
      });

      const res = await request(app)
        .post('/api/informational-interviews/insights')
        .set('Authorization', 'Bearer valid-token')
        .send({
          interview_id: 1,
          key_takeaways: [],
        });

      expect(res.status).toBe(200);
    });
  });

  describe('PUT /api/informational-interviews/insights/:id', () => {
    it('should update insight', async () => {
      const mockInsight = { id: 1, interview_id: 1, key_takeaways: ['Takeaway 1'] };
      const mockSupabase = vi.mocked(createClient)();
      mockSupabase.from.mockReturnValueOnce({
        update: vi.fn(() => {
          const chainableBuilder = {
            eq: vi.fn(() => chainableBuilder),
            select: vi.fn(() => Promise.resolve({ data: [mockInsight], error: null })),
          };
          return chainableBuilder;
        }),
      });

      const res = await request(app)
        .put('/api/informational-interviews/insights/1')
        .set('Authorization', 'Bearer valid-token')
        .send({
          key_takeaways: ['Takeaway 1'],
        });

      expect(res.status).toBe(200);
    });
  });

  describe('DELETE /api/informational-interviews/insights/:id', () => {
    it('should delete insight', async () => {
      const mockSupabase = vi.mocked(createClient)();
      mockSupabase.from.mockReturnValueOnce({
        delete: vi.fn(() => {
          const chainableBuilder = {
            eq: vi.fn(() => chainableBuilder),
            then: (resolve) => Promise.resolve({ data: [], error: null }).then(resolve),
            catch: (reject) => Promise.resolve({ data: [], error: null }).catch(reject),
          };
          return chainableBuilder;
        }),
      });

      const res = await request(app)
        .delete('/api/informational-interviews/insights/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/informational-interviews/dashboard/summary', () => {
    it('should return dashboard summary', async () => {
      const queryBuilder = createQueryBuilder([], null);
      const mockSupabase = vi.mocked(createClient)();
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => queryBuilder),
      });

      const res = await request(app)
        .get('/api/informational-interviews/dashboard/summary')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });
  });

  describe('Error handling', () => {
    it('should handle database errors', async () => {
      const queryBuilder = createQueryBuilder(null, { message: 'Database error' });
      const mockSupabase = vi.mocked(createClient)();
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => queryBuilder),
      });

      const res = await request(app)
        .get('/api/informational-interviews/candidates')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
    });

    it('should handle missing authentication', async () => {
      const res = await request(app)
        .get('/api/informational-interviews/candidates');

      expect(res.status).toBe(401);
    });
  });
});

