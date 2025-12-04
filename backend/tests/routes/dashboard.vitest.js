/**
 * Dashboard Routes - Full Coverage Tests
 * File: backend/routes/dashboard.js
 */

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import dashboardRouter from '../../routes/dashboard.js';

// ============================================
// MOCKS
// ============================================

const mockQueryFn = vi.fn();

vi.mock('../../db/pool.js', () => ({
  default: {
    get query() {
      return mockQueryFn;
    },
  },
}));

vi.mock('../../auth.js', () => ({
  auth: vi.fn((req, res, next) => {
    req.user = { id: 1 };
    next();
  }),
}));

// ============================================
// SETUP
// ============================================

let app;

beforeAll(() => {
  app = express();
  app.use(express.json());
  app.use('/api/dashboard', dashboardRouter);
});

beforeEach(() => {
  vi.clearAllMocks();
});

// ============================================
// TESTS
// ============================================

describe('Dashboard Routes - Full Coverage', () => {
  describe('GET /api/dashboard/stats', () => {
    it('should return dashboard stats', async () => {
      const mockStats = {
        total_applications: 10,
        total_interviews: 3,
        total_offers: 1,
        interview_rate: 0.3,
        offer_rate: 0.1,
        avg_response_hours: 24.5,
        weekly_trends: [
          { week_start: '2024-01-01', applications: 5, interviews: 2, offers: 1 },
        ],
        status_breakdown: [
          { status: 'Applied', count: 5 },
          { status: 'Interview', count: 3 },
        ],
        top_companies: [
          { company: 'Tech Corp', count: 3 },
        ],
        top_locations: [
          { location: 'San Francisco', count: 5 },
        ],
      };

      // Mock all the queries (dashboard.js makes exactly 10 queries)
      mockQueryFn
        .mockResolvedValueOnce({ rows: [{ total: 10 }] }) // Test query 1: Total jobs
        .mockResolvedValueOnce({ rows: [{ total: 10, earliest_date: '2024-01-01', latest_date: '2024-01-31' }] }) // Test query 2: Date range
        .mockResolvedValueOnce({ rows: [{ total: 10, archived: 0, not_archived: 10 }] }) // Test query 3: Archive status
        .mockResolvedValueOnce({ rows: [{ total_applications: 10, total_interviews: 3, total_offers: 1 }] }) // Key metrics
        .mockResolvedValueOnce({ rows: [{ interview_rate: 0.3, offer_rate: 0.1, avg_response_hours: 24.5 }] }) // Benchmark query
        .mockResolvedValueOnce({ rows: [{ avg_response_hours: 24.5 }] }) // Time to response
        .mockResolvedValueOnce({ rows: mockStats.weekly_trends }) // Trends
        .mockResolvedValueOnce({ rows: [{ applied: 10, interview: 3, offer: 1 }] }) // Funnel
        .mockResolvedValueOnce({ rows: [{ status: 'Applied', avg_days: 5 }] }) // Stage times
        .mockResolvedValueOnce({ rows: [] }); // Goals (use defaults)

      const res = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.keyMetrics.total_applications).toBe(10);
      expect(res.body.keyMetrics.total_interviews).toBe(3);
    });

    it('should handle date filters', async () => {
      mockQueryFn
        .mockResolvedValueOnce({ rows: [{ total: 5 }] }) // Test query 1
        .mockResolvedValueOnce({ rows: [{ total: 5, earliest_date: '2024-01-15', latest_date: '2024-01-20' }] }) // Test query 2
        .mockResolvedValueOnce({ rows: [{ total: 5, archived: 0, not_archived: 5 }] }) // Test query 3
        .mockResolvedValueOnce({ rows: [{ total_applications: 5, total_interviews: 1, total_offers: 0 }] }) // Key metrics
        .mockResolvedValueOnce({ rows: [{ interview_rate: 0.2, offer_rate: 0, avg_response_hours: null }] }) // Benchmark
        .mockResolvedValueOnce({ rows: [{ avg_response_hours: null }] }) // Time to response
        .mockResolvedValueOnce({ rows: [] }) // Trends
        .mockResolvedValueOnce({ rows: [{ applied: 5, interview: 1, offer: 0 }] }) // Funnel
        .mockResolvedValueOnce({ rows: [] }) // Stage times
        .mockResolvedValueOnce({ rows: [] }); // Goals

      const res = await request(app)
        .get('/api/dashboard/stats?startDate=2024-01-15&endDate=2024-01-20')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });

    it('should handle custom goals', async () => {
      mockQueryFn
        .mockResolvedValueOnce({ rows: [{ total: 10 }] }) // Test query 1
        .mockResolvedValueOnce({ rows: [{ total: 10, earliest_date: '2024-01-01', latest_date: '2024-01-31' }] }) // Test query 2
        .mockResolvedValueOnce({ rows: [{ total: 10, archived: 0, not_archived: 10 }] }) // Test query 3
        .mockResolvedValueOnce({ rows: [{ total_applications: 10, total_interviews: 3, total_offers: 1 }] }) // Key metrics
        .mockResolvedValueOnce({ rows: [{ interview_rate: 0.3, offer_rate: 0.1, avg_response_hours: 24.5 }] }) // Benchmark
        .mockResolvedValueOnce({ rows: [{ avg_response_hours: 24.5 }] }) // Time to response
        .mockResolvedValueOnce({ rows: [] }) // Trends
        .mockResolvedValueOnce({ rows: [{ applied: 10, interview: 3, offer: 1 }] }) // Funnel
        .mockResolvedValueOnce({ rows: [] }) // Stage times
        .mockResolvedValueOnce({ rows: [{ monthly_applications: 50, interview_rate_target: 0.25, offer_rate_target: 0.10 }] }); // Custom goals

      const res = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.goals).toBeDefined();
    });

    it('should handle goals query error gracefully', async () => {
      const goalsError = new Error('Table does not exist');
      mockQueryFn
        .mockResolvedValueOnce({ rows: [{ total: 10 }] })
        .mockResolvedValueOnce({ rows: [{ total: 10, earliest_date: '2024-01-01', latest_date: '2024-01-31' }] })
        .mockResolvedValueOnce({ rows: [{ total: 10, archived: 0, not_archived: 10 }] })
        .mockResolvedValueOnce({ rows: [{ total_applications: 10, total_interviews: 3, total_offers: 1 }] })
        .mockResolvedValueOnce({ rows: [{ interview_rate: 0.3, offer_rate: 0.1, avg_response_hours: 24.5 }] })
        .mockResolvedValueOnce({ rows: [{ avg_response_hours: 24.5 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ applied: 10, interview: 3, offer: 1 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockRejectedValueOnce(goalsError); // Goals query fails

      const res = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200); // Should use defaults
      expect(res.body.goals).toBeDefined();
    });

    it('should handle industry comparison calculations', async () => {
      mockQueryFn
        .mockResolvedValueOnce({ rows: [{ total: 10 }] })
        .mockResolvedValueOnce({ rows: [{ total: 10, earliest_date: '2024-01-01', latest_date: '2024-01-31' }] })
        .mockResolvedValueOnce({ rows: [{ total: 10, archived: 0, not_archived: 10 }] })
        .mockResolvedValueOnce({ rows: [{ total_applications: 10, total_interviews: 3, total_offers: 1 }] })
        .mockResolvedValueOnce({ rows: [{ interview_rate: 0.15, offer_rate: 0.05, avg_response_hours: 240 }] }) // Above industry benchmarks
        .mockResolvedValueOnce({ rows: [{ avg_response_hours: 240 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ applied: 10, interview: 3, offer: 1 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.industryComparison).toBeDefined();
      expect(res.body.industryComparison.comparison.interviewRate.status).toBe('above');
    });

    it('should generate actionable insights', async () => {
      mockQueryFn
        .mockResolvedValueOnce({ rows: [{ total: 5 }] })
        .mockResolvedValueOnce({ rows: [{ total: 5, earliest_date: '2024-01-01', latest_date: '2024-01-31' }] })
        .mockResolvedValueOnce({ rows: [{ total: 5, archived: 0, not_archived: 5 }] })
        .mockResolvedValueOnce({ rows: [{ total_applications: 5, total_interviews: 0, total_offers: 0 }] }) // Low numbers
        .mockResolvedValueOnce({ rows: [{ interview_rate: 0, offer_rate: 0, avg_response_hours: null }] })
        .mockResolvedValueOnce({ rows: [{ avg_response_hours: null }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ applied: 5, interview: 0, offer: 0 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.actionableInsights).toBeDefined();
      expect(Array.isArray(res.body.actionableInsights)).toBe(true);
    });

    it('should handle null response hours', async () => {
      mockQueryFn
        .mockResolvedValueOnce({ rows: [{ total: 10 }] })
        .mockResolvedValueOnce({ rows: [{ total: 10, earliest_date: '2024-01-01', latest_date: '2024-01-31' }] })
        .mockResolvedValueOnce({ rows: [{ total: 10, archived: 0, not_archived: 10 }] })
        .mockResolvedValueOnce({ rows: [{ total_applications: 10, total_interviews: 3, total_offers: 1 }] })
        .mockResolvedValueOnce({ rows: [{ interview_rate: 0.3, offer_rate: 0.1, avg_response_hours: null }] })
        .mockResolvedValueOnce({ rows: [{ avg_response_hours: null }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ applied: 10, interview: 3, offer: 1 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.timeToResponse.avg_response_hours).toBe(0);
    });

    it('should handle trends with multiple weeks', async () => {
      const mockTrends = [
        { week_start: '2024-01-01', applications: 5, interviews: 2, offers: 0 },
        { week_start: '2024-01-08', applications: 3, interviews: 1, offers: 1 },
        { week_start: '2024-01-15', applications: 2, interviews: 0, offers: 0 },
      ];

      mockQueryFn
        .mockResolvedValueOnce({ rows: [{ total: 10 }] })
        .mockResolvedValueOnce({ rows: [{ total: 10, earliest_date: '2024-01-01', latest_date: '2024-01-31' }] })
        .mockResolvedValueOnce({ rows: [{ total: 10, archived: 0, not_archived: 10 }] })
        .mockResolvedValueOnce({ rows: [{ total_applications: 10, total_interviews: 3, total_offers: 1 }] })
        .mockResolvedValueOnce({ rows: [{ interview_rate: 0.3, offer_rate: 0.1, avg_response_hours: 24.5 }] })
        .mockResolvedValueOnce({ rows: [{ avg_response_hours: 24.5 }] })
        .mockResolvedValueOnce({ rows: mockTrends })
        .mockResolvedValueOnce({ rows: [{ applied: 10, interview: 3, offer: 1 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.trends.length).toBe(3);
    });

    it('should handle stage times with multiple statuses', async () => {
      const mockStageTimes = [
        { status: 'Applied', avg_days: 5 },
        { status: 'Interview', avg_days: 10 },
        { status: 'Offer', avg_days: 15 },
        { status: 'Rejected', avg_days: 3 },
      ];

      mockQueryFn
        .mockResolvedValueOnce({ rows: [{ total: 10 }] })
        .mockResolvedValueOnce({ rows: [{ total: 10, earliest_date: '2024-01-01', latest_date: '2024-01-31' }] })
        .mockResolvedValueOnce({ rows: [{ total: 10, archived: 0, not_archived: 10 }] })
        .mockResolvedValueOnce({ rows: [{ total_applications: 10, total_interviews: 3, total_offers: 1 }] })
        .mockResolvedValueOnce({ rows: [{ interview_rate: 0.3, offer_rate: 0.1, avg_response_hours: 24.5 }] })
        .mockResolvedValueOnce({ rows: [{ avg_response_hours: 24.5 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ applied: 10, interview: 3, offer: 1 }] })
        .mockResolvedValueOnce({ rows: mockStageTimes })
        .mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.avgTimeInStage.length).toBe(4);
    });

    it('should handle industry comparison with below benchmarks', async () => {
      mockQueryFn
        .mockResolvedValueOnce({ rows: [{ total: 10 }] })
        .mockResolvedValueOnce({ rows: [{ total: 10, earliest_date: '2024-01-01', latest_date: '2024-01-31' }] })
        .mockResolvedValueOnce({ rows: [{ total: 10, archived: 0, not_archived: 10 }] })
        .mockResolvedValueOnce({ rows: [{ total_applications: 10, total_interviews: 1, total_offers: 0 }] })
        .mockResolvedValueOnce({ rows: [{ interview_rate: 0.05, offer_rate: 0, avg_response_hours: 480 }] }) // Below benchmarks
        .mockResolvedValueOnce({ rows: [{ avg_response_hours: 480 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ applied: 10, interview: 1, offer: 0 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.industryComparison.comparison.interviewRate.status).toBe('below');
      expect(res.body.industryComparison.comparison.offerRate.status).toBe('below');
    });

    it('should handle zero division in industry comparison', async () => {
      mockQueryFn
        .mockResolvedValueOnce({ rows: [{ total: 10 }] })
        .mockResolvedValueOnce({ rows: [{ total: 10, earliest_date: '2024-01-01', latest_date: '2024-01-31' }] })
        .mockResolvedValueOnce({ rows: [{ total: 10, archived: 0, not_archived: 10 }] })
        .mockResolvedValueOnce({ rows: [{ total_applications: 10, total_interviews: 3, total_offers: 1 }] })
        .mockResolvedValueOnce({ rows: [{ interview_rate: 0, offer_rate: 0, avg_response_hours: null }] })
        .mockResolvedValueOnce({ rows: [{ avg_response_hours: null }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ applied: 10, interview: 3, offer: 1 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.industryComparison).toBeDefined();
    });

    it('should generate insight for low application volume', async () => {
      mockQueryFn
        .mockResolvedValueOnce({ rows: [{ total: 5 }] })
        .mockResolvedValueOnce({ rows: [{ total: 5, earliest_date: '2024-01-01', latest_date: '2024-01-31' }] })
        .mockResolvedValueOnce({ rows: [{ total: 5, archived: 0, not_archived: 5 }] })
        .mockResolvedValueOnce({ rows: [{ total_applications: 5, total_interviews: 2, total_offers: 0 }] }) // Below monthly goal (30)
        .mockResolvedValueOnce({ rows: [{ interview_rate: 0.4, offer_rate: 0, avg_response_hours: 24 }] })
        .mockResolvedValueOnce({ rows: [{ avg_response_hours: 24 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ applied: 5, interview: 2, offer: 0 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.actionableInsights.some(insight => insight.includes('application volume'))).toBe(true);
    });

    it('should generate insight for low interview rate', async () => {
      mockQueryFn
        .mockResolvedValueOnce({ rows: [{ total: 10 }] })
        .mockResolvedValueOnce({ rows: [{ total: 10, earliest_date: '2024-01-01', latest_date: '2024-01-31' }] })
        .mockResolvedValueOnce({ rows: [{ total: 10, archived: 0, not_archived: 10 }] })
        .mockResolvedValueOnce({ rows: [{ total_applications: 10, total_interviews: 1, total_offers: 0 }] }) // Low interview rate
        .mockResolvedValueOnce({ rows: [{ interview_rate: 0.1, offer_rate: 0, avg_response_hours: 24 }] })
        .mockResolvedValueOnce({ rows: [{ avg_response_hours: 24 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ applied: 10, interview: 1, offer: 0 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.actionableInsights.some(insight => insight.includes('resume') || insight.includes('interview'))).toBe(true);
    });

    it('should generate insight for low offer rate', async () => {
      mockQueryFn
        .mockResolvedValueOnce({ rows: [{ total: 10 }] })
        .mockResolvedValueOnce({ rows: [{ total: 10, earliest_date: '2024-01-01', latest_date: '2024-01-31' }] })
        .mockResolvedValueOnce({ rows: [{ total: 10, archived: 0, not_archived: 10 }] })
        .mockResolvedValueOnce({ rows: [{ total_applications: 10, total_interviews: 5, total_offers: 0 }] }) // Low offer rate
        .mockResolvedValueOnce({ rows: [{ interview_rate: 0.5, offer_rate: 0, avg_response_hours: 24 }] })
        .mockResolvedValueOnce({ rows: [{ avg_response_hours: 24 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ applied: 10, interview: 5, offer: 0 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.actionableInsights.some(insight => insight.includes('interview performance') || insight.includes('offer'))).toBe(true);
    });

    it('should generate positive insight when on track', async () => {
      mockQueryFn
        .mockResolvedValueOnce({ rows: [{ total: 50 }] })
        .mockResolvedValueOnce({ rows: [{ total: 50, earliest_date: '2024-01-01', latest_date: '2024-01-31' }] })
        .mockResolvedValueOnce({ rows: [{ total: 50, archived: 0, not_archived: 50 }] })
        .mockResolvedValueOnce({ rows: [{ total_applications: 50, total_interviews: 15, total_offers: 3 }] }) // Good numbers
        .mockResolvedValueOnce({ rows: [{ interview_rate: 0.3, offer_rate: 0.06, avg_response_hours: 120 }] })
        .mockResolvedValueOnce({ rows: [{ avg_response_hours: 120 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ applied: 50, interview: 15, offer: 3 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.actionableInsights.some(insight => insight.includes('Great progress') || insight.includes('on track'))).toBe(true);
    });

    it('should handle archived jobs correctly', async () => {
      mockQueryFn
        .mockResolvedValueOnce({ rows: [{ total: 20 }] })
        .mockResolvedValueOnce({ rows: [{ total: 20, earliest_date: '2024-01-01', latest_date: '2024-01-31' }] })
        .mockResolvedValueOnce({ rows: [{ total: 20, archived: 10, not_archived: 10 }] }) // Some archived
        .mockResolvedValueOnce({ rows: [{ total_applications: 10, total_interviews: 3, total_offers: 1 }] }) // Only non-archived
        .mockResolvedValueOnce({ rows: [{ interview_rate: 0.3, offer_rate: 0.1, avg_response_hours: 24.5 }] })
        .mockResolvedValueOnce({ rows: [{ avg_response_hours: 24.5 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ applied: 10, interview: 3, offer: 1 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.keyMetrics.total_applications).toBe(10);
    });

    it('should handle empty date range', async () => {
      mockQueryFn
        .mockResolvedValueOnce({ rows: [{ total: 0 }] })
        .mockResolvedValueOnce({ rows: [{ total: 0, earliest_date: null, latest_date: null }] })
        .mockResolvedValueOnce({ rows: [{ total: 0, archived: 0, not_archived: 0 }] })
        .mockResolvedValueOnce({ rows: [{ total_applications: 0, total_interviews: 0, total_offers: 0 }] })
        .mockResolvedValueOnce({ rows: [{ interview_rate: null, offer_rate: null, avg_response_hours: null }] })
        .mockResolvedValueOnce({ rows: [{ avg_response_hours: null }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ applied: 0, interview: 0, offer: 0 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/api/dashboard/stats?startDate=2024-12-01&endDate=2024-12-31')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.keyMetrics.total_applications).toBe(0);
    });

    it('should handle goals with null values', async () => {
      mockQueryFn
        .mockResolvedValueOnce({ rows: [{ total: 10 }] })
        .mockResolvedValueOnce({ rows: [{ total: 10, earliest_date: '2024-01-01', latest_date: '2024-01-31' }] })
        .mockResolvedValueOnce({ rows: [{ total: 10, archived: 0, not_archived: 10 }] })
        .mockResolvedValueOnce({ rows: [{ total_applications: 10, total_interviews: 3, total_offers: 1 }] })
        .mockResolvedValueOnce({ rows: [{ interview_rate: 0.3, offer_rate: 0.1, avg_response_hours: 24.5 }] })
        .mockResolvedValueOnce({ rows: [{ avg_response_hours: 24.5 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ applied: 10, interview: 3, offer: 1 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ monthly_applications: null, interview_rate_target: null, offer_rate_target: null }] }); // Null values

      const res = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.goals.monthlyApplications).toBe(30); // Should use defaults
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to load dashboard stats');
    });
  });
});

