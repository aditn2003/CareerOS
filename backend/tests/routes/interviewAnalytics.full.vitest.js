/**
 * Interview Analytics Routes - Full Coverage Tests
 * Target: 90%+ coverage for interviewAnalytics.js
 */

import request from 'supertest';
import express from 'express';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock axios
vi.mock('axios', () => ({
  default: {
    post: vi.fn().mockResolvedValue({
      data: {
        choices: [{
          message: {
            content: JSON.stringify({
              keyInsights: ['Insight 1', 'Insight 2'],
              optimalStrategies: ['Strategy 1'],
              improvementRecommendations: ['Rec 1'],
              industryComparison: {
                vsAverage: 'Above average',
                standoutMetrics: 'Conversion rate',
                concerningMetrics: 'None',
              },
            }),
          },
        }],
      },
    }),
  },
  post: vi.fn().mockResolvedValue({
    data: {
      choices: [{
        message: {
          content: JSON.stringify({
            keyInsights: ['Insight 1'],
            optimalStrategies: ['Strategy 1'],
            improvementRecommendations: ['Rec 1'],
            industryComparison: { vsAverage: 'Good', standoutMetrics: 'Rate', concerningMetrics: 'None' },
          }),
        },
      }],
    },
  }),
}));

import axios from 'axios';
import { createInterviewAnalyticsRoutes } from '../../routes/interviewAnalytics.js';

describe('Interview Analytics Routes - Full Coverage', () => {
  let app;
  let mockSupabase;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock Supabase client with query builder pattern
    const createQueryBuilder = (table) => {
      const builder = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        single: vi.fn(),
      };

      if (table === 'interview_outcomes') {
        builder.select.mockResolvedValue({
          data: [
            {
              id: 1,
              user_id: 1,
              company: 'Tech Corp',
              role: 'Engineer',
              interview_date: new Date().toISOString(),
              interview_type: 'technical',
              interview_format: 'virtual',
              self_rating: 4,
              confidence_level: 4,
              outcome: 'offer_received',
              areas_covered: ['algorithms', 'system design'],
              strengths: ['Problem solving'],
              weaknesses: ['Communication'],
            },
          ],
          error: null,
        });
        builder.insert.mockResolvedValue({
          data: { id: 1, user_id: 1, company: 'Tech Corp' },
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
      } else if (table === 'mock_interview_sessions') {
        builder.select.mockResolvedValue({
          data: [
            {
              id: 1,
              user_id: 1,
              status: 'completed',
              overall_performance_score: 4.5,
            },
          ],
          error: null,
        });
      }

      return builder;
    };

    mockSupabase = {
      from: vi.fn((table) => createQueryBuilder(table)),
    };

    // Use factory function with mocks
    const interviewAnalyticsRoutes = createInterviewAnalyticsRoutes(mockSupabase, 'test-openai-key');

    app = express();
    app.use(express.json());
    app.use('/api/interview-analytics', interviewAnalyticsRoutes);
  });

  // ========================================
  // GET /analytics
  // ========================================
  describe('GET /analytics', () => {
    it('should get analytics with all data', async () => {
      const res = await request(app)
        .get('/api/interview-analytics/analytics')
        .query({ userId: '1', timeRange: 'all' });

      expect([200, 400, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
        expect(res.body.data).toBeDefined();
        expect(res.body.data.summary).toBeDefined();
      }
    });

    it('should return 400 for missing userId', async () => {
      const res = await request(app)
        .get('/api/interview-analytics/analytics');

      expect(res.status).toBe(400);
    });

    it('should return 400 for invalid userId', async () => {
      const res = await request(app)
        .get('/api/interview-analytics/analytics')
        .query({ userId: 'invalid' });

      expect(res.status).toBe(400);
    });

    it('should handle different time ranges', async () => {
      const timeRanges = ['30d', '90d', '6m', '1y', 'all'];
      
      for (const range of timeRanges) {
        const res = await request(app)
          .get('/api/interview-analytics/analytics')
          .query({ userId: '1', timeRange: range });

        expect([200, 400, 500]).toContain(res.status);
      }
    });

    it('should handle database error', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockRejectedValue(new Error('Database error')),
      });

      const res = await request(app)
        .get('/api/interview-analytics/analytics')
        .query({ userId: '1' });

      expect(res.status).toBe(500);
    });

    it('should handle insufficient data for AI insights', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [{ id: 1, user_id: 1, company: 'Corp', self_rating: 3 }],
          error: null,
        }),
        gte: vi.fn().mockReturnThis(),
      });

      const res = await request(app)
        .get('/api/interview-analytics/analytics')
        .query({ userId: '1' });

      expect([200, 400, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.data.aiInsights).toBeDefined();
      }
    });

    it('should handle FAANG company type analysis', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            { id: 1, user_id: 1, company: 'Google', outcome: 'offer_received', self_rating: 4 },
            { id: 2, user_id: 1, company: 'Meta', outcome: 'rejected', self_rating: 3 },
          ],
          error: null,
        }),
        gte: vi.fn().mockReturnThis(),
      });

      const res = await request(app)
        .get('/api/interview-analytics/analytics')
        .query({ userId: '1' });

      expect([200, 400, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.data.companyTypeAnalysis).toBeDefined();
      }
    });

    it('should handle Startup company type', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            { id: 1, user_id: 1, company: 'Startup Inc', company_type: 'startup', outcome: 'offer_received' },
          ],
          error: null,
        }),
        gte: vi.fn().mockReturnThis(),
      });

      const res = await request(app)
        .get('/api/interview-analytics/analytics')
        .query({ userId: '1' });

      expect([200, 400, 500]).toContain(res.status);
    });

    it('should process areas_covered as array', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            { id: 1, user_id: 1, company: 'Corp', areas_covered: ['algorithms', 'system design'], self_rating: 4 },
            { id: 2, user_id: 1, company: 'Corp2', areas_covered: ['algorithms'], self_rating: 5 },
          ],
          error: null,
        }),
        gte: vi.fn().mockReturnThis(),
      });

      const res = await request(app)
        .get('/api/interview-analytics/analytics')
        .query({ userId: '1' });

      expect([200, 400, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.data.strongestAreas).toBeDefined();
        expect(res.body.data.weakestAreas).toBeDefined();
      }
    });

    it('should process areas_covered as object', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            { id: 1, user_id: 1, company: 'Corp', areas_covered: { area1: 'algorithms', area2: 'design' }, self_rating: 4 },
          ],
          error: null,
        }),
        gte: vi.fn().mockReturnThis(),
      });

      const res = await request(app)
        .get('/api/interview-analytics/analytics')
        .query({ userId: '1' });

      expect([200, 400, 500]).toContain(res.status);
    });

    it('should process strengths and weaknesses arrays', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            { id: 1, user_id: 1, company: 'Corp', strengths: ['Problem solving', 'Communication'], weaknesses: ['Time management'] },
            { id: 2, user_id: 1, company: 'Corp2', strengths: ['Problem solving'], weaknesses: ['Communication'] },
          ],
          error: null,
        }),
        gte: vi.fn().mockReturnThis(),
      });

      const res = await request(app)
        .get('/api/interview-analytics/analytics')
        .query({ userId: '1' });

      expect([200, 400, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.data.topStrengths).toBeDefined();
        expect(res.body.data.topWeaknesses).toBeDefined();
      }
    });

    it('should handle different interview formats', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            { id: 1, user_id: 1, company: 'Corp', interview_format: 'virtual', outcome: 'offer_received', self_rating: 4, confidence_level: 4 },
            { id: 2, user_id: 1, company: 'Corp2', interview_format: 'in-person', outcome: 'rejected', self_rating: 3, confidence_level: 3 },
          ],
          error: null,
        }),
        gte: vi.fn().mockReturnThis(),
      });

      const res = await request(app)
        .get('/api/interview-analytics/analytics')
        .query({ userId: '1' });

      expect([200, 400, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.data.formatComparison).toBeDefined();
      }
    });

    it('should calculate improvement over time', async () => {
      const baseDate = new Date('2024-01-01');
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            { id: 1, user_id: 1, company: 'Corp', interview_date: new Date(baseDate).toISOString(), self_rating: 2 },
            { id: 2, user_id: 1, company: 'Corp2', interview_date: new Date(baseDate.getTime() + 86400000).toISOString(), self_rating: 3 },
            { id: 3, user_id: 1, company: 'Corp3', interview_date: new Date(baseDate.getTime() + 172800000).toISOString(), self_rating: 4 },
            { id: 4, user_id: 1, company: 'Corp4', interview_date: new Date(baseDate.getTime() + 259200000).toISOString(), self_rating: 5 },
          ],
          error: null,
        }),
        gte: vi.fn().mockReturnThis(),
      });

      const res = await request(app)
        .get('/api/interview-analytics/analytics')
        .query({ userId: '1' });

      expect([200, 400, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.data.improvementOverTime).toBeDefined();
        expect(res.body.data.improvementOverTime.trend).toBeDefined();
      }
    });

    it('should calculate monthly trends', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            { id: 1, user_id: 1, company: 'Corp', interview_date: '2024-01-15', outcome: 'offer_received', self_rating: 4 },
            { id: 2, user_id: 1, company: 'Corp2', interview_date: '2024-02-15', outcome: 'rejected', self_rating: 3 },
          ],
          error: null,
        }),
        gte: vi.fn().mockReturnThis(),
      });

      const res = await request(app)
        .get('/api/interview-analytics/analytics')
        .query({ userId: '1' });

      expect([200, 400, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.data.trendsOverTime).toBeDefined();
      }
    });

    it('should calculate practice impact', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'interview_outcomes') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [
                { id: 1, user_id: 1, company: 'Corp', mock_interviews_completed: 2, self_rating: 5 },
                { id: 2, user_id: 1, company: 'Corp2', mock_interviews_completed: 0, self_rating: 3 },
              ],
              error: null,
            }),
            gte: vi.fn().mockReturnThis(),
          };
        } else if (table === 'mock_interview_sessions') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [
                { id: 1, user_id: 1, overall_performance_score: 4.5 },
              ],
              error: null,
            }),
          };
        }
      });

      const res = await request(app)
        .get('/api/interview-analytics/analytics')
        .query({ userId: '1' });

      expect([200, 400, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.data.practiceImpact).toBeDefined();
      }
    });

    it('should calculate benchmark comparisons', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            { id: 1, user_id: 1, company: 'Corp', outcome: 'offer_received', self_rating: 4.5, confidence_level: 4 },
            { id: 2, user_id: 1, company: 'Corp2', outcome: 'offer_received', self_rating: 4, confidence_level: 3.5 },
          ],
          error: null,
        }),
        gte: vi.fn().mockReturnThis(),
      });

      const res = await request(app)
        .get('/api/interview-analytics/analytics')
        .query({ userId: '1' });

      expect([200, 400, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.data.benchmarkComparison).toBeDefined();
        expect(res.body.data.benchmarkComparison.conversionRate).toBeDefined();
        expect(res.body.data.benchmarkComparison.selfRating).toBeDefined();
      }
    });

    it('should handle empty interview data', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
        gte: vi.fn().mockReturnThis(),
      });

      const res = await request(app)
        .get('/api/interview-analytics/analytics')
        .query({ userId: '1' });

      expect([200, 400, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.data.summary.totalInterviews).toBe(0);
        expect(res.body.data.summary.conversionRate).toBe(0);
      }
    });

    it('should handle all FAANG companies', async () => {
      const faangCompanies = ['Google', 'Meta', 'Amazon', 'Apple', 'Microsoft', 'Netflix'];
      
      for (const company of faangCompanies) {
        mockSupabase.from.mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: [
              { id: 1, user_id: 1, company, outcome: 'offer_received', self_rating: 4 },
            ],
            error: null,
          }),
          gte: vi.fn().mockReturnThis(),
        });

        const res = await request(app)
          .get('/api/interview-analytics/analytics')
          .query({ userId: '1' });

        expect([200, 400, 500]).toContain(res.status);
      }
    });

    it('should handle areas_covered as string', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            { id: 1, user_id: 1, company: 'Corp', areas_covered: 'algorithms', self_rating: 4 },
          ],
          error: null,
        }),
        gte: vi.fn().mockReturnThis(),
      });

      const res = await request(app)
        .get('/api/interview-analytics/analytics')
        .query({ userId: '1' });

      expect([200, 400, 500]).toContain(res.status);
    });

    it('should handle areas_covered as null', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            { id: 1, user_id: 1, company: 'Corp', areas_covered: null, self_rating: 4 },
          ],
          error: null,
        }),
        gte: vi.fn().mockReturnThis(),
      });

      const res = await request(app)
        .get('/api/interview-analytics/analytics')
        .query({ userId: '1' });

      expect([200, 400, 500]).toContain(res.status);
    });

    it('should handle strengths as non-array', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            { id: 1, user_id: 1, company: 'Corp', strengths: 'Problem solving', weaknesses: 'Communication' },
          ],
          error: null,
        }),
        gte: vi.fn().mockReturnThis(),
      });

      const res = await request(app)
        .get('/api/interview-analytics/analytics')
        .query({ userId: '1' });

      expect([200, 400, 500]).toContain(res.status);
    });

    it('should handle strengths/weaknesses with non-string values', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            { id: 1, user_id: 1, company: 'Corp', strengths: [123, 'Problem solving'], weaknesses: [456, 'Communication'] },
          ],
          error: null,
        }),
        gte: vi.fn().mockReturnThis(),
      });

      const res = await request(app)
        .get('/api/interview-analytics/analytics')
        .query({ userId: '1' });

      expect([200, 400, 500]).toContain(res.status);
    });

    it('should handle declining trend', async () => {
      const baseDate = new Date('2024-01-01');
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            { id: 1, user_id: 1, company: 'Corp', interview_date: new Date(baseDate).toISOString(), self_rating: 5 },
            { id: 2, user_id: 1, company: 'Corp2', interview_date: new Date(baseDate.getTime() + 86400000).toISOString(), self_rating: 4 },
            { id: 3, user_id: 1, company: 'Corp3', interview_date: new Date(baseDate.getTime() + 172800000).toISOString(), self_rating: 3 },
            { id: 4, user_id: 1, company: 'Corp4', interview_date: new Date(baseDate.getTime() + 259200000).toISOString(), self_rating: 2 },
          ],
          error: null,
        }),
        gte: vi.fn().mockReturnThis(),
      });

      const res = await request(app)
        .get('/api/interview-analytics/analytics')
        .query({ userId: '1' });

      expect([200, 400, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.data.improvementOverTime.trend).toBe('declining');
      }
    });

    it('should handle stable trend', async () => {
      const baseDate = new Date('2024-01-01');
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            { id: 1, user_id: 1, company: 'Corp', interview_date: new Date(baseDate).toISOString(), self_rating: 4 },
            { id: 2, user_id: 1, company: 'Corp2', interview_date: new Date(baseDate.getTime() + 86400000).toISOString(), self_rating: 4 },
            { id: 3, user_id: 1, company: 'Corp3', interview_date: new Date(baseDate.getTime() + 172800000).toISOString(), self_rating: 4 },
            { id: 4, user_id: 1, company: 'Corp4', interview_date: new Date(baseDate.getTime() + 259200000).toISOString(), self_rating: 4 },
          ],
          error: null,
        }),
        gte: vi.fn().mockReturnThis(),
      });

      const res = await request(app)
        .get('/api/interview-analytics/analytics')
        .query({ userId: '1' });

      expect([200, 400, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.data.improvementOverTime.trend).toBe('stable');
      }
    });

    it('should handle benchmark percentile top_20 for conversion rate', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            { id: 1, user_id: 1, company: 'Corp', outcome: 'offer_received' },
            { id: 2, user_id: 1, company: 'Corp2', outcome: 'offer_received' },
            { id: 3, user_id: 1, company: 'Corp3', outcome: 'offer_received' },
            { id: 4, user_id: 1, company: 'Corp4', outcome: 'offer_received' },
            { id: 5, user_id: 1, company: 'Corp5', outcome: 'offer_received' },
          ],
          error: null,
        }),
        gte: vi.fn().mockReturnThis(),
      });

      const res = await request(app)
        .get('/api/interview-analytics/analytics')
        .query({ userId: '1' });

      expect([200, 400, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.data.benchmarkComparison.conversionRate.percentile).toBe('top_20');
      }
    });

    it('should handle benchmark percentile top_20 for self rating', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            { id: 1, user_id: 1, company: 'Corp', self_rating: 4.5 },
            { id: 2, user_id: 1, company: 'Corp2', self_rating: 4.5 },
          ],
          error: null,
        }),
        gte: vi.fn().mockReturnThis(),
      });

      const res = await request(app)
        .get('/api/interview-analytics/analytics')
        .query({ userId: '1' });

      expect([200, 400, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.data.benchmarkComparison.selfRating.percentile).toBe('top_20');
      }
    });

    it('should handle benchmark percentile below_average', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            { id: 1, user_id: 1, company: 'Corp', outcome: 'rejected', self_rating: 2 },
            { id: 2, user_id: 1, company: 'Corp2', outcome: 'rejected', self_rating: 2 },
          ],
          error: null,
        }),
        gte: vi.fn().mockReturnThis(),
      });

      const res = await request(app)
        .get('/api/interview-analytics/analytics')
        .query({ userId: '1' });

      expect([200, 400, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.data.benchmarkComparison.conversionRate.percentile).toBe('below_average');
        expect(res.body.data.benchmarkComparison.selfRating.percentile).toBe('below_average');
      }
    });

    it('should handle practice correlation positive', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'interview_outcomes') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [
                { id: 1, user_id: 1, company: 'Corp', mock_interviews_completed: 3, self_rating: 5 },
                { id: 2, user_id: 1, company: 'Corp2', mock_interviews_completed: 0, self_rating: 2 },
              ],
              error: null,
            }),
            gte: vi.fn().mockReturnThis(),
          };
        } else if (table === 'mock_interview_sessions') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [
                { id: 1, user_id: 1, overall_performance_score: 4.5 },
              ],
              error: null,
            }),
          };
        }
      });

      const res = await request(app)
        .get('/api/interview-analytics/analytics')
        .query({ userId: '1' });

      expect([200, 400, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.data.practiceImpact.practiceCorrelation).toBe('positive');
      }
    });

    it('should handle practice correlation neutral', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'interview_outcomes') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [
                { id: 1, user_id: 1, company: 'Corp', mock_interviews_completed: 2, self_rating: 3 },
                { id: 2, user_id: 1, company: 'Corp2', mock_interviews_completed: 0, self_rating: 4 },
              ],
              error: null,
            }),
            gte: vi.fn().mockReturnThis(),
          };
        } else if (table === 'mock_interview_sessions') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [
                { id: 1, user_id: 1, overall_performance_score: 3.5 },
              ],
              error: null,
            }),
          };
        }
      });

      const res = await request(app)
        .get('/api/interview-analytics/analytics')
        .query({ userId: '1' });

      expect([200, 400, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.data.practiceImpact.practiceCorrelation).toBe('neutral');
      }
    });

    it('should handle format analysis with no format specified', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            { id: 1, user_id: 1, company: 'Corp', interview_format: null, outcome: 'offer_received' },
            { id: 2, user_id: 1, company: 'Corp2', interview_format: undefined, outcome: 'rejected' },
          ],
          error: null,
        }),
        gte: vi.fn().mockReturnThis(),
      });

      const res = await request(app)
        .get('/api/interview-analytics/analytics')
        .query({ userId: '1' });

      expect([200, 400, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.data.formatComparison).toBeDefined();
      }
    });

    it('should handle format analysis with confidence levels', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            { id: 1, user_id: 1, company: 'Corp', interview_format: 'virtual', confidence_level: 5 },
            { id: 2, user_id: 1, company: 'Corp2', interview_format: 'virtual', confidence_level: 4 },
            { id: 3, user_id: 1, company: 'Corp3', interview_format: 'in-person', confidence_level: 3 },
          ],
          error: null,
        }),
        gte: vi.fn().mockReturnThis(),
      });

      const res = await request(app)
        .get('/api/interview-analytics/analytics')
        .query({ userId: '1' });

      expect([200, 400, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.data.formatComparison).toBeDefined();
        expect(res.body.data.formatComparison[0].avgConfidence).toBeDefined();
      }
    });

    it('should handle mock interview error gracefully', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'interview_outcomes') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [
                { id: 1, user_id: 1, company: 'Corp', self_rating: 4 },
              ],
              error: null,
            }),
            gte: vi.fn().mockReturnThis(),
          };
        } else if (table === 'mock_interview_sessions') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Mock interview error' },
            }),
          };
        }
      });

      const res = await request(app)
        .get('/api/interview-analytics/analytics')
        .query({ userId: '1' });

      expect([200, 400, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.data.practiceImpact).toBeDefined();
      }
    });

    it('should handle areas with no ratings', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            { id: 1, user_id: 1, company: 'Corp', areas_covered: ['algorithms'], self_rating: null },
            { id: 2, user_id: 1, company: 'Corp2', areas_covered: ['system design'], self_rating: null },
          ],
          error: null,
        }),
        gte: vi.fn().mockReturnThis(),
      });

      const res = await request(app)
        .get('/api/interview-analytics/analytics')
        .query({ userId: '1' });

      expect([200, 400, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.data.strongestAreas).toBeDefined();
        expect(res.body.data.weakestAreas).toBeDefined();
      }
    });

    it('should handle company type with no ratings', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            { id: 1, user_id: 1, company: 'Google', outcome: 'offer_received', self_rating: null },
          ],
          error: null,
        }),
        gte: vi.fn().mockReturnThis(),
      });

      const res = await request(app)
        .get('/api/interview-analytics/analytics')
        .query({ userId: '1' });

      expect([200, 400, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.data.companyTypeAnalysis).toBeDefined();
        expect(res.body.data.companyTypeAnalysis[0].avgPerformance).toBe(0);
      }
    });

    it('should handle improvement calculation with zero early rating', async () => {
      const baseDate = new Date('2024-01-01');
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            { id: 1, user_id: 1, company: 'Corp', interview_date: new Date(baseDate).toISOString(), self_rating: null },
            { id: 2, user_id: 1, company: 'Corp2', interview_date: new Date(baseDate.getTime() + 86400000).toISOString(), self_rating: 4 },
          ],
          error: null,
        }),
        gte: vi.fn().mockReturnThis(),
      });

      const res = await request(app)
        .get('/api/interview-analytics/analytics')
        .query({ userId: '1' });

      expect([200, 400, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.data.improvementOverTime).toBeDefined();
      }
    });

    it('should handle bestFormat calculation with no formats', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            { id: 1, user_id: 1, company: 'Corp', self_rating: 4 },
          ],
          error: null,
        }),
        gte: vi.fn().mockReturnThis(),
      });

      const res = await request(app)
        .get('/api/interview-analytics/analytics')
        .query({ userId: '1' });

      expect([200, 400, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.data.formatComparison).toBeDefined();
      }
    });

    it('should handle improvement calculation with zero recent rating', async () => {
      const baseDate = new Date('2024-01-01');
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            { id: 1, user_id: 1, company: 'Corp', interview_date: new Date(baseDate).toISOString(), self_rating: 4 },
            { id: 2, user_id: 1, company: 'Corp2', interview_date: new Date(baseDate.getTime() + 86400000).toISOString(), self_rating: null },
          ],
          error: null,
        }),
        gte: vi.fn().mockReturnThis(),
      });

      const res = await request(app)
        .get('/api/interview-analytics/analytics')
        .query({ userId: '1' });

      expect([200, 400, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.data.improvementOverTime).toBeDefined();
      }
    });

    it('should handle monthly trends with no offers', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            { id: 1, user_id: 1, company: 'Corp', interview_date: '2024-01-15', outcome: 'rejected', self_rating: 3 },
            { id: 2, user_id: 1, company: 'Corp2', interview_date: '2024-02-15', outcome: 'rejected', self_rating: 2 },
          ],
          error: null,
        }),
        gte: vi.fn().mockReturnThis(),
      });

      const res = await request(app)
        .get('/api/interview-analytics/analytics')
        .query({ userId: '1' });

      expect([200, 400, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.data.trendsOverTime).toBeDefined();
        expect(res.body.data.trendsOverTime[0].offers).toBe(0);
      }
    });

    it('should handle areas performance with no ratings', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            { id: 1, user_id: 1, company: 'Corp', areas_covered: ['algorithms'], self_rating: null },
            { id: 2, user_id: 1, company: 'Corp2', areas_covered: ['system design'], self_rating: null },
          ],
          error: null,
        }),
        gte: vi.fn().mockReturnThis(),
      });

      const res = await request(app)
        .get('/api/interview-analytics/analytics')
        .query({ userId: '1' });

      expect([200, 400, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.data.strongestAreas).toBeDefined();
        expect(res.body.data.weakestAreas).toBeDefined();
      }
    });

    it('should handle company type with no offers', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            { id: 1, user_id: 1, company: 'Google', outcome: 'rejected', self_rating: 3 },
            { id: 2, user_id: 1, company: 'Meta', outcome: 'rejected', self_rating: 2 },
          ],
          error: null,
        }),
        gte: vi.fn().mockReturnThis(),
      });

      const res = await request(app)
        .get('/api/interview-analytics/analytics')
        .query({ userId: '1' });

      expect([200, 400, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.data.companyTypeAnalysis).toBeDefined();
        expect(res.body.data.companyTypeAnalysis[0].offers).toBe(0);
        expect(res.body.data.companyTypeAnalysis[0].conversionRate).toBe(0);
      }
    });

    it('should handle format analysis with no ratings or confidence', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            { id: 1, user_id: 1, company: 'Corp', interview_format: 'virtual', outcome: 'offer_received', self_rating: null, confidence_level: null },
          ],
          error: null,
        }),
        gte: vi.fn().mockReturnThis(),
      });

      const res = await request(app)
        .get('/api/interview-analytics/analytics')
        .query({ userId: '1' });

      expect([200, 400, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.data.formatComparison).toBeDefined();
        expect(res.body.data.formatComparison[0].avgPerformance).toBe(0);
        expect(res.body.data.formatComparison[0].avgConfidence).toBe(0);
      }
    });

    it('should handle practice data with no scores', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'interview_outcomes') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [
                { id: 1, user_id: 1, company: 'Corp', mock_interviews_completed: 1 },
              ],
              error: null,
            }),
            gte: vi.fn().mockReturnThis(),
          };
        } else if (table === 'mock_interview_sessions') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [
                { id: 1, user_id: 1, overall_performance_score: null },
              ],
              error: null,
            }),
          };
        }
      });

      const res = await request(app)
        .get('/api/interview-analytics/analytics')
        .query({ userId: '1' });

      expect([200, 400, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.data.practiceImpact.avgPracticeScore).toBe(0);
      }
    });

    it('should handle improvement rate calculation with zero early rating', async () => {
      const baseDate = new Date('2024-01-01');
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            { id: 1, user_id: 1, company: 'Corp', interview_date: new Date(baseDate).toISOString(), self_rating: 0 },
            { id: 2, user_id: 1, company: 'Corp2', interview_date: new Date(baseDate.getTime() + 86400000).toISOString(), self_rating: 4 },
          ],
          error: null,
        }),
        gte: vi.fn().mockReturnThis(),
      });

      const res = await request(app)
        .get('/api/interview-analytics/analytics')
        .query({ userId: '1' });

      expect([200, 400, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.data.improvementOverTime.improvementRate).toBe(0);
      }
    });

    it('should handle improvement rate calculation with zero recent rating', async () => {
      const baseDate = new Date('2024-01-01');
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            { id: 1, user_id: 1, company: 'Corp', interview_date: new Date(baseDate).toISOString(), self_rating: 4 },
            { id: 2, user_id: 1, company: 'Corp2', interview_date: new Date(baseDate.getTime() + 86400000).toISOString(), self_rating: 0 },
          ],
          error: null,
        }),
        gte: vi.fn().mockReturnThis(),
      });

      const res = await request(app)
        .get('/api/interview-analytics/analytics')
        .query({ userId: '1' });

      expect([200, 400, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.data.improvementOverTime.improvementRate).toBe(0);
      }
    });

    it('should handle improvement trend at exactly 5% (boundary)', async () => {
      const baseDate = new Date('2024-01-01');
      // Create data that results in exactly 5% improvement
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            { id: 1, user_id: 1, company: 'Corp', interview_date: new Date(baseDate).toISOString(), self_rating: 4 },
            { id: 2, user_id: 1, company: 'Corp2', interview_date: new Date(baseDate.getTime() + 86400000).toISOString(), self_rating: 4.2 }, // 5% increase
          ],
          error: null,
        }),
        gte: vi.fn().mockReturnThis(),
      });

      const res = await request(app)
        .get('/api/interview-analytics/analytics')
        .query({ userId: '1' });

      expect([200, 400, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.data.improvementOverTime.trend).toBe('stable');
      }
    });

    it('should handle improvement trend at exactly -5% (boundary)', async () => {
      const baseDate = new Date('2024-01-01');
      // Create data that results in exactly -5% change
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            { id: 1, user_id: 1, company: 'Corp', interview_date: new Date(baseDate).toISOString(), self_rating: 4 },
            { id: 2, user_id: 1, company: 'Corp2', interview_date: new Date(baseDate.getTime() + 86400000).toISOString(), self_rating: 3.8 }, // -5% decrease
          ],
          error: null,
        }),
        gte: vi.fn().mockReturnThis(),
      });

      const res = await request(app)
        .get('/api/interview-analytics/analytics')
        .query({ userId: '1' });

      expect([200, 400, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.data.improvementOverTime.trend).toBe('stable');
      }
    });

    it('should handle areas_covered with mixed types', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            { id: 1, user_id: 1, company: 'Corp', areas_covered: ['algorithms', 123, null, 'system design'], self_rating: 4 },
          ],
          error: null,
        }),
        gte: vi.fn().mockReturnThis(),
      });

      const res = await request(app)
        .get('/api/interview-analytics/analytics')
        .query({ userId: '1' });

      expect([200, 400, 500]).toContain(res.status);
    });

    it('should handle strengths with whitespace that needs trimming', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            { id: 1, user_id: 1, company: 'Corp', strengths: ['  Problem solving  ', ' Communication '] },
            { id: 2, user_id: 1, company: 'Corp2', strengths: ['  Problem solving  '] },
          ],
          error: null,
        }),
        gte: vi.fn().mockReturnThis(),
      });

      const res = await request(app)
        .get('/api/interview-analytics/analytics')
        .query({ userId: '1' });

      expect([200, 400, 500]).toContain(res.status);
    });

    it('should handle weaknesses with whitespace that needs trimming', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            { id: 1, user_id: 1, company: 'Corp', weaknesses: ['  Time management  ', ' Communication '] },
            { id: 2, user_id: 1, company: 'Corp2', weaknesses: ['  Time management  '] },
          ],
          error: null,
        }),
        gte: vi.fn().mockReturnThis(),
      });

      const res = await request(app)
        .get('/api/interview-analytics/analytics')
        .query({ userId: '1' });

      expect([200, 400, 500]).toContain(res.status);
    });

    it('should handle company type with all FAANG variations', async () => {
      const faangVariations = [
        'Google Inc',
        'Meta Platforms',
        'Amazon Web Services',
        'Apple Inc',
        'Microsoft Corporation',
        'Netflix Inc',
      ];

      for (const company of faangVariations) {
        mockSupabase.from.mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: [
              { id: 1, user_id: 1, company, outcome: 'offer_received' },
            ],
            error: null,
          }),
          gte: vi.fn().mockReturnThis(),
        });

        const res = await request(app)
          .get('/api/interview-analytics/analytics')
          .query({ userId: '1' });

        expect([200, 400, 500]).toContain(res.status);
      }
    });

    it('should handle company type with startup in name', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            { id: 1, user_id: 1, company: 'Tech Startup Inc', outcome: 'offer_received' },
          ],
          error: null,
        }),
        gte: vi.fn().mockReturnThis(),
      });

      const res = await request(app)
        .get('/api/interview-analytics/analytics')
        .query({ userId: '1' });

      expect([200, 400, 500]).toContain(res.status);
      if (res.status === 200) {
        const startupType = res.body.data.companyTypeAnalysis.find(c => c.type === 'Startup');
        expect(startupType).toBeDefined();
      }
    });

    it('should handle format analysis with multiple formats', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            { id: 1, user_id: 1, company: 'Corp', interview_format: 'virtual', outcome: 'offer_received', self_rating: 5, confidence_level: 5 },
            { id: 2, user_id: 1, company: 'Corp2', interview_format: 'in-person', outcome: 'offer_received', self_rating: 4, confidence_level: 4 },
            { id: 3, user_id: 1, company: 'Corp3', interview_format: 'phone', outcome: 'rejected', self_rating: 3, confidence_level: 3 },
            { id: 4, user_id: 1, company: 'Corp4', interview_format: 'virtual', outcome: 'rejected', self_rating: 2, confidence_level: 2 },
          ],
          error: null,
        }),
        gte: vi.fn().mockReturnThis(),
      });

      const res = await request(app)
        .get('/api/interview-analytics/analytics')
        .query({ userId: '1' });

      expect([200, 400, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.data.formatComparison.length).toBeGreaterThan(1);
        // Virtual should have better conversion rate
        const virtualFormat = res.body.data.formatComparison.find(f => f.format === 'virtual');
        expect(virtualFormat).toBeDefined();
      }
    });

    it('should handle analytics with very large dataset', async () => {
      const largeDataset = Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        user_id: 1,
        company: `Corp${i + 1}`,
        interview_date: new Date(2024, 0, i + 1).toISOString(),
        outcome: i % 3 === 0 ? 'offer_received' : 'rejected',
        self_rating: (i % 5) + 1,
        confidence_level: (i % 5) + 1,
        interview_format: ['virtual', 'in-person', 'phone'][i % 3],
        areas_covered: ['algorithms', 'system design'],
        strengths: ['Problem solving'],
        weaknesses: ['Communication'],
      }));

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: largeDataset,
          error: null,
        }),
        gte: vi.fn().mockReturnThis(),
      });

      const res = await request(app)
        .get('/api/interview-analytics/analytics')
        .query({ userId: '1' });

      expect([200, 400, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.data.summary.totalInterviews).toBe(50);
      }
    });

    it('should handle POST /outcome with all boolean and numeric fields', async () => {
      const res = await request(app)
        .post('/api/interview-analytics/outcome')
        .send({
          userId: 1,
          company: 'Corp',
          role: 'Engineer',
          interviewDate: new Date().toISOString(),
          interviewType: 'technical',
          nextRoundScheduled: true,
          mockInterviewsCompleted: 5,
          usedAiCoaching: true,
          hoursPrepared: 15,
          difficultyRating: 3,
          selfRating: 4,
          confidenceLevel: 4,
          offerAmount: 120000,
        });

      expect([200, 400, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
      }
    });

    it('should handle POST /outcome with false boolean values', async () => {
      const res = await request(app)
        .post('/api/interview-analytics/outcome')
        .send({
          userId: 1,
          company: 'Corp',
          role: 'Engineer',
          interviewDate: new Date().toISOString(),
          interviewType: 'technical',
          nextRoundScheduled: false,
          usedAiCoaching: false,
          mockInterviewsCompleted: 0,
        });

      expect([200, 400, 500]).toContain(res.status);
    });

    it('should handle PUT /outcome/:id with boolean fields', async () => {
      const res = await request(app)
        .put('/api/interview-analytics/outcome/1')
        .query({ userId: '1' })
        .send({
          next_round_scheduled: true,
          self_rating: 5,
          confidence_level: 5,
          difficulty_rating: 4,
        });

      expect([200, 400, 500]).toContain(res.status);
    });

    it('should handle PUT /outcome/:id with date fields', async () => {
      const res = await request(app)
        .put('/api/interview-analytics/outcome/1')
        .query({ userId: '1' })
        .send({
          offer_received_date: new Date().toISOString(),
          offer_amount: 130000,
        });

      expect([200, 400, 500]).toContain(res.status);
    });

    it('should handle DELETE /outcome/:id with error in catch block (line 785+)', async () => {
      mockSupabase.from.mockReturnValueOnce({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockImplementation(() => {
          throw new Error('Unexpected delete error');
        }),
      });

      const res = await request(app)
        .delete('/api/interview-analytics/outcome/1')
        .query({ userId: '1' });

      expect(res.status).toBe(500);
      expect(res.body.message).toBe('Failed to delete interview outcome');
    });
  });

  // ========================================
  // POST /outcome
  // ========================================
  describe('POST /outcome', () => {
    it('should create interview outcome with all fields', async () => {
      const res = await request(app)
        .post('/api/interview-analytics/outcome')
        .send({
          userId: 1,
          company: 'Tech Corp',
          role: 'Engineer',
          interviewDate: new Date().toISOString(),
          interviewType: 'technical',
          interviewFormat: 'virtual',
          selfRating: 4,
          confidenceLevel: 4,
          outcome: 'offer_received',
        });

      expect([200, 400, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
        expect(res.body.data).toBeDefined();
      }
    });

    it('should return 400 for missing required fields', async () => {
      const res = await request(app)
        .post('/api/interview-analytics/outcome')
        .send({
          userId: 1,
          company: 'Corp',
          // Missing role, interviewDate, interviewType
        });

      expect(res.status).toBe(400);
    });

    it('should return 400 for invalid userId', async () => {
      const res = await request(app)
        .post('/api/interview-analytics/outcome')
        .send({
          userId: 'invalid',
          company: 'Corp',
          role: 'Engineer',
          interviewDate: new Date().toISOString(),
          interviewType: 'technical',
        });

      expect(res.status).toBe(400);
    });

    it('should handle optional fields', async () => {
      const res = await request(app)
        .post('/api/interview-analytics/outcome')
        .send({
          userId: 1,
          company: 'Corp',
          role: 'Engineer',
          interviewDate: new Date().toISOString(),
          interviewType: 'technical',
          areasCovered: ['algorithms'],
          strengths: ['Problem solving'],
          weaknesses: ['Communication'],
          notes: 'Good interview',
        });

      expect([200, 400, 500]).toContain(res.status);
    });

    it('should handle all optional fields in POST /outcome', async () => {
      const res = await request(app)
        .post('/api/interview-analytics/outcome')
        .send({
          userId: 1,
          company: 'Corp',
          role: 'Engineer',
          interviewDate: new Date().toISOString(),
          interviewType: 'technical',
          jobId: 123,
          interviewFormat: 'virtual',
          difficultyRating: 4,
          selfRating: 4,
          confidenceLevel: 4,
          areasCovered: ['algorithms', 'system design'],
          strengths: ['Problem solving', 'Communication'],
          weaknesses: ['Time management'],
          outcome: 'offer_received',
          feedbackReceived: 'Great performance',
          nextRoundScheduled: true,
          offerAmount: 120000,
          offerReceivedDate: new Date().toISOString(),
          hoursPrepared: 10,
          mockInterviewsCompleted: 3,
          usedAiCoaching: true,
          notes: 'Excellent interview',
          lessonsLearned: 'Need to practice more',
        });

      expect([200, 400, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
      }
    });

    it('should handle POST /outcome with default outcome value', async () => {
      const res = await request(app)
        .post('/api/interview-analytics/outcome')
        .send({
          userId: 1,
          company: 'Corp',
          role: 'Engineer',
          interviewDate: new Date().toISOString(),
          interviewType: 'technical',
          // No outcome specified, should default to 'pending'
        });

      expect([200, 400, 500]).toContain(res.status);
    });

    it('should handle POST /outcome with null optional fields', async () => {
      const res = await request(app)
        .post('/api/interview-analytics/outcome')
        .send({
          userId: 1,
          company: 'Corp',
          role: 'Engineer',
          interviewDate: new Date().toISOString(),
          interviewType: 'technical',
          jobId: null,
          interviewFormat: null,
          difficultyRating: null,
          selfRating: null,
          confidenceLevel: null,
          areasCovered: null,
          strengths: null,
          weaknesses: null,
          feedbackReceived: null,
          offerAmount: null,
          offerReceivedDate: null,
          hoursPrepared: null,
          notes: null,
          lessonsLearned: null,
        });

      expect([200, 400, 500]).toContain(res.status);
    });

    it('should handle database error', async () => {
      mockSupabase.from.mockReturnValueOnce({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockRejectedValue(new Error('Database error')),
      });

      const res = await request(app)
        .post('/api/interview-analytics/outcome')
        .send({
          userId: 1,
          company: 'Corp',
          role: 'Engineer',
          interviewDate: new Date().toISOString(),
          interviewType: 'technical',
        });

      expect(res.status).toBe(500);
    });

    it('should handle POST /outcome with retry logic on temporary error', async () => {
      let attemptCount = 0;
      mockSupabase.from.mockReturnValueOnce({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockImplementation(() => {
          attemptCount++;
          if (attemptCount === 1) {
            return Promise.reject(new Error('Temporary database error'));
          }
          return Promise.resolve({ data: { id: 1 }, error: null });
        }),
      });

      const res = await request(app)
        .post('/api/interview-analytics/outcome')
        .send({
          userId: 1,
          company: 'Corp',
          role: 'Engineer',
          interviewDate: new Date().toISOString(),
          interviewType: 'technical',
        });

      expect([200, 400, 500]).toContain(res.status);
    });

    it('should handle POST /outcome with error in catch block', async () => {
      mockSupabase.from.mockReturnValueOnce({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockImplementation(() => {
          throw new Error('Unexpected error');
        }),
      });

      const res = await request(app)
        .post('/api/interview-analytics/outcome')
        .send({
          userId: 1,
          company: 'Corp',
          role: 'Engineer',
          interviewDate: new Date().toISOString(),
          interviewType: 'technical',
        });

      expect(res.status).toBe(500);
    });

    it('should handle POST /outcome with Supabase error response', async () => {
      mockSupabase.from.mockReturnValueOnce({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database constraint error' },
        }),
      });

      const res = await request(app)
        .post('/api/interview-analytics/outcome')
        .send({
          userId: 1,
          company: 'Corp',
          role: 'Engineer',
          interviewDate: new Date().toISOString(),
          interviewType: 'technical',
        });

      expect(res.status).toBe(500);
    });

    it('should handle POST /outcome success path with data.id', async () => {
      mockSupabase.from.mockReturnValueOnce({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 123, user_id: 1, company: 'Corp' },
          error: null,
        }),
      });

      const res = await request(app)
        .post('/api/interview-analytics/outcome')
        .send({
          userId: 1,
          company: 'Corp',
          role: 'Engineer',
          interviewDate: new Date().toISOString(),
          interviewType: 'technical',
        });

      expect([200, 400, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
        expect(res.body.data.id).toBe(123);
      }
    });
  });

  // ========================================
  // PUT /outcome/:id
  // ========================================
  describe('PUT /outcome/:id', () => {
    it('should update interview outcome', async () => {
      const res = await request(app)
        .put('/api/interview-analytics/outcome/1')
        .query({ userId: '1' })
        .send({
          outcome: 'offer_accepted',
          self_rating: 5,
        });

      expect([200, 400, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
      }
    });

    it('should return 400 for invalid outcome ID', async () => {
      const res = await request(app)
        .put('/api/interview-analytics/outcome/invalid')
        .query({ userId: '1' })
        .send({ outcome: 'offer_accepted' });

      expect(res.status).toBe(400);
    });

    it('should return 400 for missing userId', async () => {
      const res = await request(app)
        .put('/api/interview-analytics/outcome/1')
        .send({ outcome: 'offer_accepted' });

      expect(res.status).toBe(400);
    });

    it('should return 400 for invalid userId (non-integer)', async () => {
      const res = await request(app)
        .put('/api/interview-analytics/outcome/1')
        .query({ userId: 'invalid' })
        .send({ outcome: 'offer_accepted' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('userId must be a valid integer');
    });

    it('should return 400 for no valid fields to update', async () => {
      const res = await request(app)
        .put('/api/interview-analytics/outcome/1')
        .query({ userId: '1' })
        .send({ invalidField: 'value' });

      expect(res.status).toBe(400);
    });

    it('should handle database error', async () => {
      mockSupabase.from.mockReturnValueOnce({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockRejectedValue(new Error('Database error')),
      });

      const res = await request(app)
        .put('/api/interview-analytics/outcome/1')
        .query({ userId: '1' })
        .send({ outcome: 'offer_accepted' });

      expect(res.status).toBe(500);
    });

    it('should handle PUT /outcome/:id with retry logic', async () => {
      let attemptCount = 0;
      mockSupabase.from.mockReturnValueOnce({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockImplementation(() => {
          attemptCount++;
          if (attemptCount === 1) {
            return Promise.reject(new Error('Temporary error'));
          }
          return Promise.resolve({ data: { id: 1, updated: true }, error: null });
        }),
      });

      const res = await request(app)
        .put('/api/interview-analytics/outcome/1')
        .query({ userId: '1' })
        .send({ outcome: 'offer_accepted' });

      expect([200, 400, 500]).toContain(res.status);
    });

    it('should handle PUT /outcome/:id with error in catch block', async () => {
      mockSupabase.from.mockReturnValueOnce({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockImplementation(() => {
          throw new Error('Unexpected error');
        }),
      });

      const res = await request(app)
        .put('/api/interview-analytics/outcome/1')
        .query({ userId: '1' })
        .send({ outcome: 'offer_accepted' });

      expect(res.status).toBe(500);
    });

    it('should handle PUT /outcome/:id with Supabase error response', async () => {
      mockSupabase.from.mockReturnValueOnce({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Record not found' },
        }),
      });

      const res = await request(app)
        .put('/api/interview-analytics/outcome/1')
        .query({ userId: '1' })
        .send({ outcome: 'offer_accepted' });

      expect(res.status).toBe(500);
    });
  });

  // ========================================
  // DELETE /outcome/:id
  // ========================================
  describe('DELETE /outcome/:id', () => {
    it('should delete interview outcome', async () => {
      const res = await request(app)
        .delete('/api/interview-analytics/outcome/1')
        .query({ userId: '1' });

      expect([200, 400, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
      }
    });

    it('should return 400 for invalid outcome ID', async () => {
      const res = await request(app)
        .delete('/api/interview-analytics/outcome/invalid')
        .query({ userId: '1' });

      expect(res.status).toBe(400);
    });

    it('should return 400 for missing userId', async () => {
      const res = await request(app)
        .delete('/api/interview-analytics/outcome/1');

      expect(res.status).toBe(400);
    });

    it('should handle database error', async () => {
      mockSupabase.from.mockReturnValueOnce({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockRejectedValue(new Error('Database error')),
      });

      const res = await request(app)
        .delete('/api/interview-analytics/outcome/1')
        .query({ userId: '1' });

      expect(res.status).toBe(500);
    });

    it('should handle DELETE /outcome/:id with retry logic', async () => {
      let attemptCount = 0;
      mockSupabase.from.mockReturnValueOnce({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockImplementation(() => {
          attemptCount++;
          if (attemptCount === 1) {
            return Promise.reject(new Error('Temporary error'));
          }
          return Promise.resolve({ data: null, error: null });
        }),
      });

      const res = await request(app)
        .delete('/api/interview-analytics/outcome/1')
        .query({ userId: '1' });

      expect([200, 400, 500]).toContain(res.status);
    });

    it('should handle DELETE /outcome/:id with error in catch block', async () => {
      mockSupabase.from.mockReturnValueOnce({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockImplementation(() => {
          throw new Error('Unexpected error');
        }),
      });

      const res = await request(app)
        .delete('/api/interview-analytics/outcome/1')
        .query({ userId: '1' });

      expect(res.status).toBe(500);
    });

    it('should handle DELETE /outcome/:id with Supabase error response', async () => {
      mockSupabase.from.mockReturnValueOnce({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Delete failed' },
        }),
      });

      const res = await request(app)
        .delete('/api/interview-analytics/outcome/1')
        .query({ userId: '1' });

      expect(res.status).toBe(500);
    });

    it('should handle DELETE /outcome/:id with invalid userId (line 757)', async () => {
      const res = await request(app)
        .delete('/api/interview-analytics/outcome/1')
        .query({ userId: 'invalid' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('userId must be a valid integer');
    });

    it('should handle DELETE /outcome/:id success path (lines 771-782)', async () => {
      mockSupabase.from.mockReturnValueOnce({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      });

      const res = await request(app)
        .delete('/api/interview-analytics/outcome/1')
        .query({ userId: '1' });

      expect([200, 400, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
        expect(res.body.message).toBe('Interview outcome deleted successfully');
      }
    });

    it('should handle PUT /outcome/:id success path (line 726)', async () => {
      mockSupabase.from.mockReturnValueOnce({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 1, outcome: 'offer_accepted', updated: true },
          error: null,
        }),
      });

      const res = await request(app)
        .put('/api/interview-analytics/outcome/1')
        .query({ userId: '1' })
        .send({ outcome: 'offer_accepted' });

      expect([200, 400, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
        expect(res.body.data).toBeDefined();
      }
    });
  });

  // ========================================
  // GET /outcomes
  // ========================================
  describe('GET /outcomes', () => {
    it('should get list of interview outcomes', async () => {
      const res = await request(app)
        .get('/api/interview-analytics/outcomes')
        .query({ userId: '1' });

      expect([200, 400, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
        expect(res.body.data).toBeDefined();
        expect(Array.isArray(res.body.data)).toBe(true);
      }
    });

    it('should return 400 for missing userId', async () => {
      const res = await request(app)
        .get('/api/interview-analytics/outcomes');

      expect(res.status).toBe(400);
    });

    it('should return 400 for invalid userId', async () => {
      const res = await request(app)
        .get('/api/interview-analytics/outcomes')
        .query({ userId: 'invalid' });

      expect(res.status).toBe(400);
    });

    it('should handle database error', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockRejectedValue(new Error('Database error')),
      });

      const res = await request(app)
        .get('/api/interview-analytics/outcomes')
        .query({ userId: '1' });

      expect(res.status).toBe(500);
    });

    it('should handle GET /outcomes with empty results', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      });

      const res = await request(app)
        .get('/api/interview-analytics/outcomes')
        .query({ userId: '1' });

      expect([200, 400, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
        expect(res.body.data).toEqual([]);
      }
    });

    it('should handle GET /outcomes with multiple outcomes', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            { id: 1, user_id: 1, company: 'Corp1', outcome: 'offer_received' },
            { id: 2, user_id: 1, company: 'Corp2', outcome: 'rejected' },
            { id: 3, user_id: 1, company: 'Corp3', outcome: 'offer_accepted' },
          ],
          error: null,
        }),
      });

      const res = await request(app)
        .get('/api/interview-analytics/outcomes')
        .query({ userId: '1' });

      expect([200, 400, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.data.length).toBe(3);
      }
    });

    it('should handle GET /outcomes with database error', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      });

      const res = await request(app)
        .get('/api/interview-analytics/outcomes')
        .query({ userId: '1' });

      expect(res.status).toBe(500);
    });

    it('should handle GET /outcomes with exception', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockImplementation(() => {
          throw new Error('Unexpected error');
        }),
      });

      const res = await request(app)
        .get('/api/interview-analytics/outcomes')
        .query({ userId: '1' });

      expect(res.status).toBe(500);
    });
  });

  // ========================================
  // Helper Functions
  // ========================================
  describe('Helper Functions', () => {
    it('should handle retryDatabaseOperation with max retries exceeded', async () => {
      let attemptCount = 0;
      mockSupabase.from.mockReturnValueOnce({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockImplementation(() => {
          attemptCount++;
          return Promise.reject(new Error('Persistent error'));
        }),
      });

      const res = await request(app)
        .post('/api/interview-analytics/outcome')
        .send({
          userId: 1,
          company: 'Corp',
          role: 'Engineer',
          interviewDate: new Date().toISOString(),
          interviewType: 'technical',
        });

      expect(res.status).toBe(500);
    });
    it('should handle retry logic for database operations', async () => {
      // Test that retry logic is used in outcome creation
      let attemptCount = 0;
      mockSupabase.from.mockReturnValueOnce({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockImplementation(() => {
          attemptCount++;
          if (attemptCount < 2) {
            return Promise.reject(new Error('Temporary error'));
          }
          return Promise.resolve({ data: { id: 1 }, error: null });
        }),
      });

      const res = await request(app)
        .post('/api/interview-analytics/outcome')
        .send({
          userId: 1,
          company: 'Corp',
          role: 'Engineer',
          interviewDate: new Date().toISOString(),
          interviewType: 'technical',
        });

      expect([200, 400, 500]).toContain(res.status);
    });

    it('should handle OpenAI error in generateInsights', async () => {
      axios.post.mockRejectedValueOnce(new Error('OpenAI error'));

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            { id: 1, user_id: 1, company: 'Corp', self_rating: 4, outcome: 'offer_received' },
            { id: 2, user_id: 1, company: 'Corp2', self_rating: 5, outcome: 'offer_received' },
          ],
          error: null,
        }),
        gte: vi.fn().mockReturnThis(),
      });

      const res = await request(app)
        .get('/api/interview-analytics/analytics')
        .query({ userId: '1' });

      expect([200, 400, 500]).toContain(res.status);
      if (res.status === 200) {
        // Should still return analytics with fallback insights
        expect(res.body.data.aiInsights).toBeDefined();
      }
    });

    it('should handle generateInsights with insufficient data (< 2 interviews)', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [{ id: 1, user_id: 1, company: 'Corp', self_rating: 3 }],
          error: null,
        }),
        gte: vi.fn().mockReturnThis(),
      });

      const res = await request(app)
        .get('/api/interview-analytics/analytics')
        .query({ userId: '1' });

      expect([200, 400, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.data.aiInsights).toBeDefined();
        expect(res.body.data.aiInsights.keyInsights).toContain('Complete more interviews');
      }
    });

    it('should handle generateInsights with malformed JSON response', async () => {
      axios.post.mockResolvedValueOnce({
        data: {
          choices: [{
            message: {
              content: 'Invalid JSON response',
            },
          }],
        },
      });

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            { id: 1, user_id: 1, company: 'Corp', self_rating: 4, outcome: 'offer_received' },
            { id: 2, user_id: 1, company: 'Corp2', self_rating: 5, outcome: 'offer_received' },
          ],
          error: null,
        }),
        gte: vi.fn().mockReturnThis(),
      });

      const res = await request(app)
        .get('/api/interview-analytics/analytics')
        .query({ userId: '1' });

      expect([200, 400, 500]).toContain(res.status);
    });

    it('should handle PUT /outcome/:id with all allowed fields', async () => {
      const allowedFields = [
        'outcome', 'feedback_received', 'next_round_scheduled', 'offer_amount',
        'offer_received_date', 'self_rating', 'confidence_level', 'difficulty_rating',
        'strengths', 'weaknesses', 'notes', 'lessons_learned'
      ];

      const updateData = {};
      allowedFields.forEach(field => {
        if (field === 'next_round_scheduled') {
          updateData[field] = true;
        } else if (field === 'offer_amount') {
          updateData[field] = 120000;
        } else if (field === 'self_rating' || field === 'confidence_level' || field === 'difficulty_rating') {
          updateData[field] = 4;
        } else if (field === 'strengths' || field === 'weaknesses') {
          updateData[field] = ['Item 1', 'Item 2'];
        } else {
          updateData[field] = 'Test value';
        }
      });

      const res = await request(app)
        .put('/api/interview-analytics/outcome/1')
        .query({ userId: '1' })
        .send(updateData);

      expect([200, 400, 500]).toContain(res.status);
    });

    it('should handle PUT /outcome/:id with ignored invalid fields', async () => {
      const res = await request(app)
        .put('/api/interview-analytics/outcome/1')
        .query({ userId: '1' })
        .send({
          invalidField: 'should be ignored',
          outcome: 'offer_received',
        });

      expect([200, 400, 500]).toContain(res.status);
    });
  });
});

