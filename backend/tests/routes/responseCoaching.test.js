/**
 * Response Coaching Routes Tests
 * Tests routes/responseCoaching.js - coaching features
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import responseCoachingRoutes from '../../routes/responseCoaching.js';
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
            // For calculateImprovement - return previous attempts
            if (queryState.filters.some(f => f.column === 'question_text')) {
              return Promise.resolve({ 
                data: { id: 1, overall_score: 50, attempt_number: 1, practiced_at: new Date().toISOString() }, 
                error: null 
              });
            }
            return Promise.resolve({ 
              data: { id: 1, practiced_at: new Date().toISOString() }, 
              error: null 
            });
          }
          if (queryState.operation === 'insert' || queryState.operation === 'upsert') {
            const insertData = queryState.insertData || queryState.upsertData || {};
            return Promise.resolve({ 
              data: { 
                id: 1, 
                ...insertData,
                practiced_at: insertData.practiced_at || new Date().toISOString(),
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
          // For calculateImprovement - return array of attempts
          if (queryState.filters.some(f => f.column === 'question_text')) {
            return Promise.resolve({ 
              data: [{ id: 1, overall_score: 50, attempt_number: 1, practiced_at: new Date().toISOString() }], 
              error: null 
            }).then(onResolve);
          }
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
              content_feedback: {
                strengths: ['Clear communication', 'Good structure'],
                weaknesses: ['Could add more examples'],
                clarity_score: 85,
                structure_score: 80,
              },
              timing_analysis: {
                word_count: 150,
                estimated_speaking_time_seconds: 60,
                timing_recommendation: 'optimal',
                timing_feedback: 'Good timing',
              },
              language_patterns: {
                weak_phrases: [],
                filler_words: [],
                passive_voice_count: 2,
                strong_action_verbs: ['implemented', 'delivered'],
                suggestions: ['Use more active voice'],
              },
              scores: {
                relevance_score: 90,
                specificity_score: 85,
                impact_score: 88,
                overall_score: 87,
              },
              star_analysis: {
                situation_present: true,
                task_present: true,
                action_present: true,
                result_present: true,
                star_adherence_score: 95,
                missing_elements: [],
                star_feedback: 'Excellent STAR structure',
              },
              alternative_approaches: [
                {
                  approach: 'Focus on metrics',
                  example: 'I increased revenue by 20%...',
                  why_better: 'More quantifiable impact',
                },
              ],
              key_improvements: [
                'Add specific metrics',
                'Emphasize results more',
              ],
              overall_feedback: 'Strong response with room for improvement',
            }),
          },
        }],
      },
    }),
  },
}));

describe('Response Coaching Routes', () => {
  let app;
  let user;

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    app.use('/api/response-coaching', responseCoachingRoutes);
    
    user = await createTestUser();
    
    vi.clearAllMocks();
  });

  describe('POST /api/response-coaching/analyze', () => {
    it('should analyze response and provide coaching feedback', async () => {
      const response = await request(app)
        .post('/api/response-coaching/analyze')
        .send({
          userId: user.id,
          questionId: 'q-123',
          questionText: 'Tell me about a challenging project',
          questionCategory: 'behavioral',
          responseText: 'I worked on a project where we had to deliver under tight deadlines...',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.analysis).toBeDefined();
      expect(response.body.data.analysis.scores).toBeDefined();
      expect(response.body.data.analysis.star_analysis).toBeDefined();
    });

    it('should return 400 if required fields are missing', async () => {
      const response = await request(app)
        .post('/api/response-coaching/analyze')
        .send({
          userId: user.id,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should track improvement from previous attempts', async () => {
      const response = await request(app)
        .post('/api/response-coaching/analyze')
        .send({
          userId: user.id,
          questionId: 'q-123',
          questionText: 'Tell me about yourself',
          responseText: 'I am a software engineer...',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.attemptNumber).toBeDefined();
    });
  });

  describe('GET /api/response-coaching/history/:questionId', () => {
    it('should get coaching history for a question', async () => {
      const response = await request(app)
        .get('/api/response-coaching/history/q-123')
        .query({ userId: user.id });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.attempts).toBeDefined();
      expect(response.body.data.totalAttempts).toBeDefined();
    });

    it('should return 400 if userId is missing', async () => {
      const response = await request(app)
        .get('/api/response-coaching/history/q-123');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/response-coaching/stats', () => {
    it('should get overall coaching statistics', async () => {
      const response = await request(app)
        .get('/api/response-coaching/stats')
        .query({ userId: user.id });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.totalResponses).toBeDefined();
      expect(response.body.data.averageScore).toBeDefined();
    });

    it('should return 400 if userId is missing', async () => {
      const response = await request(app)
        .get('/api/response-coaching/stats');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
});

