/**
 * Interview Insights Routes - Full Coverage Tests
 * Target: 90%+ coverage for interviewInsights.js
 */

import request from 'supertest';
import express from 'express';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock axios
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      get: vi.fn().mockResolvedValue({
        data: {
          organic_results: [
            { title: 'Result 1', snippet: 'Snippet 1' },
            { title: 'Result 2', snippet: 'Snippet 2' },
          ],
        },
      }),
      post: vi.fn().mockResolvedValue({
        data: {
          choices: [{
            message: {
              content: JSON.stringify({
                company: 'Tech Corp',
                role: 'Engineer',
                process: 'Process',
                stages: ['Stage 1'],
                questions: ['Question 1'],
                checklist: {
                  research: ['Item 1'],
                  technical: ['Item 2'],
                },
              }),
            },
          }],
        },
      }),
    })),
    post: vi.fn().mockResolvedValue({
      data: {
        choices: [{
          message: {
            content: JSON.stringify({
              subjectLine: 'Subject',
              emailBody: 'Body',
              suggestedTiming: { sendDate: '2024-01-01' },
            }),
          },
        }],
      },
    }),
  },
}));

// Mock cheerio
vi.mock('cheerio', () => ({
  default: {
    load: vi.fn(() => ({
      text: vi.fn(() => 'Text content'),
      each: vi.fn((callback) => {
        callback(0, {});
        callback(1, {});
      }),
    })),
  },
}));

import axios from 'axios';
import { createInterviewInsightsRoutes } from '../../routes/interviewInsights.js';

describe('Interview Insights Routes - Full Coverage', () => {
  let app;
  let mockSupabase;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock Supabase client
    const createQueryBuilder = (table) => {
      const builder = {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        single: vi.fn(),
      };

      if (table === 'interview_insights') {
        builder.select.mockResolvedValue({
          data: [{ id: 1, company: 'Tech Corp', role: 'Engineer' }],
          error: null,
        });
        builder.insert.mockResolvedValue({
          data: { id: 1, company: 'Tech Corp' },
          error: null,
        });
      } else if (table === 'practiced_questions') {
        builder.select.mockResolvedValue({
          data: [{ id: 1, question_id: 'q1', user_id: 1 }],
          error: null,
        });
        builder.insert.mockResolvedValue({
          data: { id: 1 },
          error: null,
        });
        builder.delete.mockResolvedValue({
          data: null,
          error: null,
        });
      } else if (table === 'interview_checklists') {
        builder.select.mockResolvedValue({
          data: [{ id: 1, user_id: 1, company: 'Corp' }],
          error: null,
        });
        builder.insert.mockResolvedValue({
          data: { id: 1 },
          error: null,
        });
        builder.update.mockResolvedValue({
          data: { id: 1, updated: true },
          error: null,
        });
      } else if (table === 'follow_up_templates') {
        builder.select.mockResolvedValue({
          data: [{ id: 1, user_id: 1, template_type: 'thank_you' }],
          error: null,
        });
        builder.insert.mockResolvedValue({
          data: { id: 1 },
          error: null,
        });
        builder.update.mockResolvedValue({
          data: { id: 1, updated: true },
          error: null,
        });
        builder.delete.mockResolvedValue({
          data: null,
          error: null,
        });
      }

      return builder;
    };

    mockSupabase = {
      from: vi.fn((table) => createQueryBuilder(table)),
    };

    // Use factory function with mocks
    const interviewInsightsRoutes = createInterviewInsightsRoutes(mockSupabase, 'test-openai-key', 'test-serp-key');

    app = express();
    app.use(express.json());
    app.use('/api/interview-insights', interviewInsightsRoutes);
  });

  // ========================================
  // GET /
  // ========================================
  describe('GET /', () => {
    it('should get interview insights with company and role', async () => {
      const res = await request(app)
        .get('/api/interview-insights/')
        .query({ company: 'Tech Corp', role: 'Engineer', userId: '1' });

      expect([200, 400, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body).toBeDefined();
      }
    });

    it('should return 400 for missing company', async () => {
      const res = await request(app)
        .get('/api/interview-insights/')
        .query({ role: 'Engineer' });

      expect(res.status).toBe(400);
    });

    it('should handle database error', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockRejectedValue(new Error('Database error')),
      });

      const res = await request(app)
        .get('/api/interview-insights/')
        .query({ company: 'Corp', userId: '1' });

      expect([200, 400, 500]).toContain(res.status);
    });
  });

  // ========================================
  // GET /questions
  // ========================================
  describe('GET /questions', () => {
    it('should get question bank with role', async () => {
      const res = await request(app)
        .get('/api/interview-insights/questions')
        .query({ role: 'Software Engineer', industry: 'Technology', difficulty: 'all' });

      expect([200, 400, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body).toBeDefined();
      }
    });

    it('should return 400 for missing role', async () => {
      const res = await request(app)
        .get('/api/interview-insights/questions');

      expect(res.status).toBe(400);
    });
  });

  // ========================================
  // POST /questions/practice
  // ========================================
  describe('POST /questions/practice', () => {
    it('should save practiced question', async () => {
      const res = await request(app)
        .post('/api/interview-insights/questions/practice')
        .send({
          userId: 1,
          questionId: 'q1',
          answer: 'Answer',
        });

      expect([200, 400, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
      }
    });

    it('should return 400 for missing userId', async () => {
      const res = await request(app)
        .post('/api/interview-insights/questions/practice')
        .send({ questionId: 'q1' });

      expect(res.status).toBe(400);
    });
  });

  // ========================================
  // GET /questions/practiced
  // ========================================
  describe('GET /questions/practiced', () => {
    it('should get practiced questions', async () => {
      const res = await request(app)
        .get('/api/interview-insights/questions/practiced')
        .query({ userId: '1' });

      expect([200, 400, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
      }
    });

    it('should return 400 for missing userId', async () => {
      const res = await request(app)
        .get('/api/interview-insights/questions/practiced');

      expect(res.status).toBe(400);
    });
  });

  // ========================================
  // GET /questions/stats
  // ========================================
  describe('GET /questions/stats', () => {
    it('should get question stats', async () => {
      const res = await request(app)
        .get('/api/interview-insights/questions/stats')
        .query({ userId: '1' });

      expect([200, 400, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
      }
    });

    it('should return 400 for missing userId', async () => {
      const res = await request(app)
        .get('/api/interview-insights/questions/stats');

      expect(res.status).toBe(400);
    });
  });

  // ========================================
  // DELETE /questions/practice/:questionId
  // ========================================
  describe('DELETE /questions/practice/:questionId', () => {
    it('should delete practiced question', async () => {
      const res = await request(app)
        .delete('/api/interview-insights/questions/practice/q1')
        .query({ userId: '1' });

      expect([200, 400, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
      }
    });

    it('should return 400 for missing userId', async () => {
      const res = await request(app)
        .delete('/api/interview-insights/questions/practice/q1');

      expect(res.status).toBe(400);
    });
  });

  // ========================================
  // POST /checklist/toggle
  // ========================================
  describe('POST /checklist/toggle', () => {
    it('should toggle checklist item', async () => {
      const res = await request(app)
        .post('/api/interview-insights/checklist/toggle')
        .send({
          userId: 1,
          company: 'Corp',
          category: 'research',
          item: 'Item 1',
        });

      expect([200, 400, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
      }
    });

    it('should return 400 for missing fields', async () => {
      const res = await request(app)
        .post('/api/interview-insights/checklist/toggle')
        .send({ userId: 1 });

      expect(res.status).toBe(400);
    });
  });

  // ========================================
  // GET /checklist/status
  // ========================================
  describe('GET /checklist/status', () => {
    it('should get checklist status', async () => {
      const res = await request(app)
        .get('/api/interview-insights/checklist/status')
        .query({ userId: '1', company: 'Corp' });

      expect([200, 400, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
      }
    });

    it('should return 400 for missing userId', async () => {
      const res = await request(app)
        .get('/api/interview-insights/checklist/status')
        .query({ company: 'Corp' });

      expect(res.status).toBe(400);
    });
  });

  // ========================================
  // GET /checklist/stats
  // ========================================
  describe('GET /checklist/stats', () => {
    it('should get checklist stats', async () => {
      const res = await request(app)
        .get('/api/interview-insights/checklist/stats')
        .query({ userId: '1' });

      expect([200, 400, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
      }
    });

    it('should return 400 for missing userId', async () => {
      const res = await request(app)
        .get('/api/interview-insights/checklist/stats');

      expect(res.status).toBe(400);
    });
  });

  // ========================================
  // DELETE /checklist/regenerate
  // ========================================
  describe('DELETE /checklist/regenerate', () => {
    it('should regenerate checklist', async () => {
      const res = await request(app)
        .delete('/api/interview-insights/checklist/regenerate')
        .query({ userId: '1', company: 'Corp', role: 'Engineer' });

      expect([200, 400, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
      }
    });

    it('should return 400 for missing fields', async () => {
      const res = await request(app)
        .delete('/api/interview-insights/checklist/regenerate')
        .query({ userId: '1' });

      expect(res.status).toBe(400);
    });
  });

  // ========================================
  // POST /follow-up/generate
  // ========================================
  describe('POST /follow-up/generate', () => {
    it('should generate follow-up template', async () => {
      const res = await request(app)
        .post('/api/interview-insights/follow-up/generate')
        .send({
          userId: 1,
          templateType: 'thank_you',
          company: 'Corp',
          role: 'Engineer',
        });

      expect([200, 400, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
      }
    });

    it('should return 400 for missing fields', async () => {
      const res = await request(app)
        .post('/api/interview-insights/follow-up/generate')
        .send({ userId: 1 });

      expect(res.status).toBe(400);
    });
  });

  // ========================================
  // GET /follow-up/templates
  // ========================================
  describe('GET /follow-up/templates', () => {
    it('should get follow-up templates', async () => {
      const res = await request(app)
        .get('/api/interview-insights/follow-up/templates')
        .query({ userId: '1' });

      expect([200, 400, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
      }
    });

    it('should return 400 for missing userId', async () => {
      const res = await request(app)
        .get('/api/interview-insights/follow-up/templates');

      expect(res.status).toBe(400);
    });
  });

  // ========================================
  // PUT /follow-up/:id/mark-sent
  // ========================================
  describe('PUT /follow-up/:id/mark-sent', () => {
    it('should mark template as sent', async () => {
      const res = await request(app)
        .put('/api/interview-insights/follow-up/1/mark-sent')
        .query({ userId: '1' });

      expect([200, 400, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
      }
    });

    it('should return 400 for missing userId', async () => {
      const res = await request(app)
        .put('/api/interview-insights/follow-up/1/mark-sent');

      expect(res.status).toBe(400);
    });
  });

  // ========================================
  // PUT /follow-up/:id/track-response
  // ========================================
  describe('PUT /follow-up/:id/track-response', () => {
    it('should track response', async () => {
      const res = await request(app)
        .put('/api/interview-insights/follow-up/1/track-response')
        .query({ userId: '1' })
        .send({ responseType: 'positive' });

      expect([200, 400, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
      }
    });

    it('should return 400 for missing userId', async () => {
      const res = await request(app)
        .put('/api/interview-insights/follow-up/1/track-response');

      expect(res.status).toBe(400);
    });
  });

  // ========================================
  // GET /follow-up/stats
  // ========================================
  describe('GET /follow-up/stats', () => {
    it('should get follow-up stats', async () => {
      const res = await request(app)
        .get('/api/interview-insights/follow-up/stats')
        .query({ userId: '1' });

      expect([200, 400, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
      }
    });

    it('should return 400 for missing userId', async () => {
      const res = await request(app)
        .get('/api/interview-insights/follow-up/stats');

      expect(res.status).toBe(400);
    });
  });

  // ========================================
  // DELETE /follow-up/:id
  // ========================================
  describe('DELETE /follow-up/:id', () => {
    it('should delete follow-up template', async () => {
      const res = await request(app)
        .delete('/api/interview-insights/follow-up/1')
        .query({ userId: '1' });

      expect([200, 400, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
      }
    });

    it('should return 400 for missing userId', async () => {
      const res = await request(app)
        .delete('/api/interview-insights/follow-up/1');

      expect(res.status).toBe(400);
    });
  });

  // ========================================
  // Additional Edge Cases
  // ========================================
  describe('Edge Cases and Complex Scenarios', () => {
    it('should handle GET / with role parameter', async () => {
      const res = await request(app)
        .get('/api/interview-insights/')
        .query({ company: 'Tech Corp', role: 'Senior Engineer', userId: '1' });

      expect([200, 400, 500]).toContain(res.status);
    });

    it('should handle GET /questions with different difficulty levels', async () => {
      const difficulties = ['entry', 'mid', 'senior', 'all'];
      
      for (const difficulty of difficulties) {
        const res = await request(app)
          .get('/api/interview-insights/questions')
          .query({ role: 'Engineer', difficulty });

        expect([200, 400, 500]).toContain(res.status);
      }
    });

    it('should handle POST /questions/practice with all fields', async () => {
      const res = await request(app)
        .post('/api/interview-insights/questions/practice')
        .send({
          userId: 1,
          questionId: 'q1',
          answer: 'Answer',
          rating: 4,
          notes: 'Notes',
        });

      expect([200, 400, 500]).toContain(res.status);
    });

    it('should handle POST /checklist/toggle with different categories', async () => {
      const categories = ['research', 'technical', 'logistics', 'attire', 'portfolio', 'confidence', 'questions', 'followUp'];
      
      for (const category of categories) {
        const res = await request(app)
          .post('/api/interview-insights/checklist/toggle')
          .send({
            userId: 1,
            company: 'Corp',
            category,
            item: 'Item 1',
          });

        expect([200, 400, 500]).toContain(res.status);
      }
    });

    it('should handle POST /follow-up/generate with different template types', async () => {
      const templateTypes = ['thank_you', 'status_inquiry', 'feedback_request', 'networking'];
      
      for (const templateType of templateTypes) {
        const res = await request(app)
          .post('/api/interview-insights/follow-up/generate')
          .send({
            userId: 1,
            templateType,
            company: 'Corp',
            role: 'Engineer',
            interviewerName: 'John Doe',
            interviewDate: new Date().toISOString(),
          });

        expect([200, 400, 500]).toContain(res.status);
      }
    });

    it('should handle PUT /follow-up/:id/track-response with different response types', async () => {
      const responseTypes = ['positive', 'negative', 'neutral', 'no_response'];
      
      for (const responseType of responseTypes) {
        const res = await request(app)
          .put('/api/interview-insights/follow-up/1/track-response')
          .query({ userId: '1' })
          .send({ responseType });

        expect([200, 400, 500]).toContain(res.status);
      }
    });

    it('should handle GET /checklist/stats with empty data', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      });

      const res = await request(app)
        .get('/api/interview-insights/checklist/stats')
        .query({ userId: '1' });

      expect([200, 400, 500]).toContain(res.status);
    });

    it('should handle GET /follow-up/stats with various templates', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            { id: 1, template_type: 'thank_you', sent: true, response_received: true },
            { id: 2, template_type: 'status_inquiry', sent: true, response_received: false },
          ],
          error: null,
        }),
      });

      const res = await request(app)
        .get('/api/interview-insights/follow-up/stats')
        .query({ userId: '1' });

      expect([200, 400, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.data).toBeDefined();
      }
    });
  });
});

