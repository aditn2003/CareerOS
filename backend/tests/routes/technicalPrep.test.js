/**
 * Technical Prep Routes Tests
 * Tests routes/technicalPrep.js - technical preparation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import technicalPrepRoutes from '../../routes/technicalPrep.js';
import { createTestUser } from '../helpers/auth.js';

// Mock external dependencies
vi.mock('@supabase/supabase-js', () => {
  const createMockSupabase = () => {
    const createMockQuery = (tableName) => {
      let queryState = {
        table: tableName,
        operation: null,
        fields: null,
        filters: [],
        orderBy: null,
        limitValue: null,
        insertData: null,
        updateData: null,
        upsertData: null,
        options: null,
      };

      const mockQuery = {
        select: vi.fn(function(fields, options) {
          queryState.operation = 'select';
          queryState.fields = fields;
          queryState.options = options;
          return this;
        }),
        insert: vi.fn(function(data) {
          queryState.operation = 'insert';
          queryState.insertData = data;
          return this;
        }),
        update: vi.fn(function(data) {
          queryState.operation = 'update';
          queryState.updateData = data;
          return this;
        }),
        delete: vi.fn(function() {
          queryState.operation = 'delete';
          return this;
        }),
        upsert: vi.fn(function(data, options) {
          queryState.operation = 'upsert';
          queryState.upsertData = data;
          queryState.options = options;
          return this;
        }),
        eq: vi.fn(function(column, value) {
          queryState.filters.push({ type: 'eq', column, value });
          return this;
        }),
        order: vi.fn(function(column, options) {
          queryState.orderBy = { column, options };
          return this;
        }),
        limit: vi.fn(function(value) {
          queryState.limitValue = value;
          return this;
        }),
        single: vi.fn(function() {
          if (queryState.operation === 'select') {
            // Check if looking for challenge with id 999 (not found case)
            if (queryState.filters.some(f => f.column === 'id' && f.value === 999)) {
              return Promise.resolve({ 
                data: null, 
                error: { code: 'PGRST116', message: 'No rows found' } 
              });
            }
            return Promise.resolve({ 
              data: { 
                id: 1,
                title: 'Two Sum',
                description: 'Find two numbers',
                difficulty: 'easy',
                user_id: 1,
                hints: [{ level: 1, hint: 'Use a hash map' }],
              }, 
              error: null 
            });
          }
          if (queryState.operation === 'insert' || queryState.operation === 'upsert') {
            const insertData = queryState.insertData || queryState.upsertData || {};
            return Promise.resolve({ 
              data: { 
                id: 1, 
                ...insertData,
                user_id: insertData.user_id || 1,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              }, 
              error: null 
            });
          }
          if (queryState.operation === 'update') {
            return Promise.resolve({ 
              data: { 
                id: 1, 
                ...queryState.updateData,
                updated_at: new Date().toISOString(),
              }, 
              error: null 
            });
          }
          return Promise.resolve({ data: { id: 1 }, error: null });
        }),
      };

      mockQuery.then = function(onResolve) {
        if (queryState.operation === 'select' && queryState.options?.count === 'exact' && queryState.options?.head) {
          return Promise.resolve({ count: 0 }).then(onResolve);
        }
        if (queryState.operation === 'select' && !queryState.limitValue) {
          return Promise.resolve({ data: [], error: null }).then(onResolve);
        }
        return Promise.resolve({ data: null, error: null }).then(onResolve);
      };
      mockQuery.catch = function(onReject) {
        return Promise.resolve({ data: null, error: null }).catch(onReject);
      };

      return mockQuery;
    };
    
    return {
      from: vi.fn((tableName) => createMockQuery(tableName)),
    };
  };
  
  return {
    createClient: vi.fn(() => createMockSupabase()),
  };
});

vi.mock('axios', () => ({
  default: {
    post: vi.fn().mockResolvedValue({
      data: {
        choices: [{
          message: {
            content: JSON.stringify({
              title: 'Two Sum',
              description: 'Find two numbers that add up to target',
              difficulty: 'easy',
              category: 'arrays',
              starter_code: 'function twoSum(nums, target) {}',
              test_cases: [
                { input: '[2,7,11,15], 9', expected_output: '[0,1]' },
              ],
              hints: [
                { level: 1, hint: 'Use a hash map' },
              ],
              optimal_solution: 'function twoSum(nums, target) { const map = new Map(); ... }',
              solution_explanation: 'Use hash map to store complements',
              time_complexity: 'O(n)',
              space_complexity: 'O(n)',
            }),
          },
        }],
      },
    }),
  },
}));

describe('Technical Prep Routes', () => {
  let app;
  let user;

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    app.use('/api/technical-prep', technicalPrepRoutes);
    
    user = await createTestUser();
    
    vi.clearAllMocks();
  });

  describe('POST /api/technical-prep/start-session', () => {
    it('should start a new technical prep session', async () => {
      const response = await request(app)
        .post('/api/technical-prep/start-session')
        .send({
          userId: user.id,
          company: 'Google',
          role: 'Software Engineer',
          techStack: ['JavaScript', 'React'],
          seniorityLevel: 'mid',
          prepType: 'coding',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.sessionId).toBeDefined();
    });

    it('should return 400 if required fields are missing', async () => {
      const response = await request(app)
        .post('/api/technical-prep/start-session')
        .send({
          userId: user.id,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/technical-prep/coding-challenge', () => {
    it('should generate a coding challenge', async () => {
      const response = await request(app)
        .post('/api/technical-prep/coding-challenge')
        .send({
          userId: user.id,
          sessionId: 1,
          techStack: ['JavaScript'],
          difficulty: 'medium',
          category: 'arrays',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.challenge).toBeDefined();
      expect(response.body.data.challenge.title).toBeDefined();
      expect(response.body.data.challenge.description).toBeDefined();
    });

    it('should return 400 if userId is missing', async () => {
      const response = await request(app)
        .post('/api/technical-prep/coding-challenge')
        .send({
          techStack: ['JavaScript'],
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/technical-prep/submit-solution', () => {
    it('should submit and evaluate coding solution', async () => {
      const response = await request(app)
        .post('/api/technical-prep/submit-solution')
        .send({
          challengeId: 1,
          userSolution: 'function twoSum(nums, target) { return [0, 1]; }',
          timeSpent: 300,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.evaluation).toBeDefined();
    });

    it('should return 400 if required fields are missing', async () => {
      const response = await request(app)
        .post('/api/technical-prep/submit-solution')
        .send({
          challengeId: 1,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 404 if challenge not found', async () => {
      // Mock challenge not found
      const { createClient } = await import('@supabase/supabase-js');
      const mockSupabase = createClient();
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      });

      const response = await request(app)
        .post('/api/technical-prep/submit-solution')
        .send({
          challengeId: 999,
          userSolution: 'code',
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/technical-prep/system-design', () => {
    it('should generate a system design question', async () => {
      const response = await request(app)
        .post('/api/technical-prep/system-design')
        .send({
          userId: user.id,
          sessionId: 1,
          role: 'Senior Engineer',
          seniorityLevel: 'senior',
          category: 'distributed_systems',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.question).toBeDefined();
      expect(response.body.data.question.title).toBeDefined();
    });

    it('should return 400 if userId is missing', async () => {
      const response = await request(app)
        .post('/api/technical-prep/system-design')
        .send({
          role: 'Senior Engineer',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/technical-prep/save-system-design', () => {
    it('should save system design progress', async () => {
      const response = await request(app)
        .post('/api/technical-prep/save-system-design')
        .send({
          questionId: 1,
          userId: user.id,
          userResponse: 'I would design a distributed system with...',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 400 if required fields are missing', async () => {
      const response = await request(app)
        .post('/api/technical-prep/save-system-design')
        .send({
          questionId: 1,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/technical-prep/system-design/:questionId', () => {
    it('should get a specific system design question', async () => {
      const response = await request(app)
        .get('/api/technical-prep/system-design/1');

      expect([200, 404]).toContain(response.status);
    });
  });

  describe('POST /api/technical-prep/whiteboard', () => {
    it('should generate whiteboard practice session', async () => {
      const response = await request(app)
        .post('/api/technical-prep/whiteboard')
        .send({
          userId: user.id,
          sessionId: 1,
          techStack: ['JavaScript'],
          topic: 'algorithms',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.session).toBeDefined();
    });

    it('should return 400 if userId is missing', async () => {
      const response = await request(app)
        .post('/api/technical-prep/whiteboard')
        .send({
          techStack: ['JavaScript'],
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/technical-prep/generate-questions', () => {
    it('should generate technical questions based on job', async () => {
      const response = await request(app)
        .post('/api/technical-prep/generate-questions')
        .send({
          jobDescription: 'Looking for a software engineer...',
          techStack: ['JavaScript', 'React'],
          seniorityLevel: 'mid',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.questions).toBeDefined();
    });

    it('should return 400 if jobDescription and techStack are both missing', async () => {
      const response = await request(app)
        .post('/api/technical-prep/generate-questions')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/technical-prep/user/:userId/stats', () => {
    it('should get user technical prep statistics', async () => {
      const response = await request(app)
        .get(`/api/technical-prep/user/${user.id}/stats`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.coding).toBeDefined();
      expect(response.body.data.systemDesign).toBeDefined();
    });
  });

  describe('GET /api/technical-prep/user/:userId/history', () => {
    it('should get user challenge history', async () => {
      const response = await request(app)
        .get(`/api/technical-prep/user/${user.id}/history`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.codingChallenges).toBeDefined();
      expect(response.body.data.systemDesignQuestions).toBeDefined();
    });

    it('should filter by type if provided', async () => {
      const response = await request(app)
        .get(`/api/technical-prep/user/${user.id}/history`)
        .query({ type: 'coding' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/technical-prep/challenge/:id', () => {
    it('should get a specific challenge', async () => {
      const response = await request(app)
        .get('/api/technical-prep/challenge/1');

      expect([200, 404]).toContain(response.status);
    });
  });

  describe('GET /api/technical-prep/hint/:challengeId/:level', () => {
    it('should get a hint for a challenge', async () => {
      const response = await request(app)
        .get('/api/technical-prep/hint/1/1');

      expect([200, 404]).toContain(response.status);
    });
  });

  describe('GET /api/technical-prep/solution-frameworks', () => {
    it('should get solution frameworks and best practices', async () => {
      const response = await request(app)
        .get('/api/technical-prep/solution-frameworks');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.frameworks).toBeDefined();
      expect(response.body.data.frameworks.coding).toBeDefined();
      expect(response.body.data.frameworks.systemDesign).toBeDefined();
    });
  });
});

