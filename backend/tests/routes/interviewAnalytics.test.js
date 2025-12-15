/**
 * Interview Analytics Routes Tests
 * Tests routes/interviewAnalytics.js - analytics calculation, interview outcomes
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createInterviewAnalyticsRoutes } from '../../routes/interviewAnalytics.js';
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
        gte: vi.fn(function(column, value) {
          queryState.filters.push({ type: 'gte', column, value });
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
            return Promise.resolve({ 
              data: { id: 1, outcome: 'offer_received', interview_date: new Date().toISOString() }, 
              error: null 
            });
          }
          if (queryState.operation === 'insert' || queryState.operation === 'upsert') {
            const insertData = queryState.insertData || queryState.upsertData || {};
            return Promise.resolve({ 
              data: { 
                id: 1, 
                ...insertData,
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
              keyInsights: ['Strong technical skills', 'Good communication'],
              optimalStrategies: ['Focus on behavioral questions', 'Practice system design'],
              improvementRecommendations: ['Work on confidence', 'Practice more'],
              industryComparison: {
                vsAverage: 'Above average',
                standoutMetrics: 'Technical skills',
                concerningMetrics: 'Confidence level',
              },
            }),
          },
        }],
      },
    }),
  },
}));

vi.mock('../../utils/schedulingHelpers.js', () => ({
  syncToGoogleCalendar: vi.fn().mockResolvedValue('event-123'),
  sendInterviewConfirmation: vi.fn().mockResolvedValue(true),
  deleteFromGoogleCalendar: vi.fn().mockResolvedValue(true),
}));

vi.mock('resend', () => {
  const mockInstance = {
    emails: {
      send: vi.fn().mockResolvedValue({ data: { id: 'email-123' } }),
    },
  };
  
  return {
    Resend: class {
      constructor() {
        return mockInstance;
      }
    },
  };
});

describe('Interview Analytics Routes', () => {
  let app;
  let user;

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    
    const router = createInterviewAnalyticsRoutes();
    app.use('/api/interview-analytics', router);
    
    user = await createTestUser();
    
    vi.clearAllMocks();
  });

  describe('GET /api/interview-analytics/analytics', () => {
    it('should get comprehensive interview analytics', async () => {
      const response = await request(app)
        .get('/api/interview-analytics/analytics')
        .query({ userId: user.id, timeRange: 'all' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.summary).toBeDefined();
      expect(response.body.data.aiInsights).toBeDefined();
    });

    it('should filter by time range', async () => {
      const response = await request(app)
        .get('/api/interview-analytics/analytics')
        .query({ userId: user.id, timeRange: '30d' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 400 if userId is missing', async () => {
      const response = await request(app)
        .get('/api/interview-analytics/analytics');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/interview-analytics/outcome', () => {
    it('should record interview outcome', async () => {
      const response = await request(app)
        .post('/api/interview-analytics/outcome')
        .send({
          userId: user.id,
          company: 'Google',
          role: 'Software Engineer',
          interviewDate: '2024-01-15',
          interviewType: 'technical',
          selfRating: 4,
          confidenceLevel: 3,
          outcome: 'pending',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('should return 400 if required fields are missing', async () => {
      const response = await request(app)
        .post('/api/interview-analytics/outcome')
        .send({
          userId: user.id,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should handle calendar sync if requested', async () => {
      const response = await request(app)
        .post('/api/interview-analytics/outcome')
        .send({
          userId: user.id,
          company: 'Google',
          role: 'Software Engineer',
          interviewDate: '2024-01-15',
          interviewType: 'technical',
          syncToCalendar: true,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('PUT /api/interview-analytics/outcome/:id', () => {
    it('should update interview outcome', async () => {
      const response = await request(app)
        .put('/api/interview-analytics/outcome/1')
        .query({ userId: user.id })
        .send({
          outcome: 'offer_received',
          selfRating: 5,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 400 if userId is missing', async () => {
      const response = await request(app)
        .put('/api/interview-analytics/outcome/1')
        .send({
          outcome: 'offer_received',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/interview-analytics/outcome/:id', () => {
    it('should delete interview outcome', async () => {
      const response = await request(app)
        .delete('/api/interview-analytics/outcome/1')
        .query({ userId: user.id });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should handle calendar deletion if requested', async () => {
      const response = await request(app)
        .delete('/api/interview-analytics/outcome/1')
        .query({ userId: user.id, deleteFromCalendar: 'true' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/interview-analytics/outcomes', () => {
    it('should get list of interview outcomes', async () => {
      const response = await request(app)
        .get('/api/interview-analytics/outcomes')
        .query({ userId: user.id });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('should return 400 if userId is missing', async () => {
      const response = await request(app)
        .get('/api/interview-analytics/outcomes');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
});

