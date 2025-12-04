import request from 'supertest';
import express from 'express';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Create mock pool
const mockPool = {
  query: vi.fn(),
  connect: vi.fn(),
  end: vi.fn(),
};

// Mock db/pool.js
vi.mock('../../db/pool.js', () => ({
  default: {
    query: vi.fn(),
    connect: vi.fn(),
    end: vi.fn(),
  },
}));

// Mock auth.js
vi.mock('../../auth.js', () => ({
  auth: (req, res, next) => {
    req.user = { id: 1 };
    req.userId = 1;
    next();
  },
}));

import pool from '../../db/pool.js';
import dashboardRoutes from '../../routes/dashboard.js';

describe('Dashboard Routes - 90%+ Coverage', () => {
  let app;

  beforeEach(() => {
    vi.clearAllMocks();

    // Assign mock methods to the pool
    pool.query = mockPool.query;
    pool.connect = mockPool.connect;
    pool.end = mockPool.end;

    app = express();
    app.use(express.json());
    app.use('/api/dashboard', dashboardRoutes);
  });

  describe('GET /stats - Dashboard Statistics', () => {
    it('should return dashboard stats successfully', async () => {
      // Mock all queries in order
      // Test query 1: total jobs
      mockPool.query.mockResolvedValueOnce({
        rows: [{ total: 10 }],
      });

      // Test query 2: jobs in date range
      mockPool.query.mockResolvedValueOnce({
        rows: [{ total: 8, earliest_date: '2024-01-01', latest_date: '2024-12-01' }],
      });

      // Test query 3: archive status
      mockPool.query.mockResolvedValueOnce({
        rows: [{ total: 10, archived: 2, not_archived: 8 }],
      });

      // Key metrics query
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          total_applications: 10,
          total_interviews: 3,
          total_offers: 1,
        }],
      });

      // Benchmark query
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          interview_rate: 0.3,
          offer_rate: 0.1,
          avg_response_hours: 48,
        }],
      });

      // Time to response query
      mockPool.query.mockResolvedValueOnce({
        rows: [{ avg_response_hours: 48 }],
      });

      // Trends query
      mockPool.query.mockResolvedValueOnce({
        rows: [
          { week_start: '2024-01-01', applications: 5, interviews: 1, offers: 0 },
          { week_start: '2024-01-08', applications: 3, interviews: 2, offers: 1 },
        ],
      });

      // Funnel query
      mockPool.query.mockResolvedValueOnce({
        rows: [{ applied: 10, interview: 3, offer: 1 }],
      });

      // Stage times query
      mockPool.query.mockResolvedValueOnce({
        rows: [
          { status: 'Applied', avg_days: 5 },
          { status: 'Interview', avg_days: 10 },
        ],
      });

      // Goals query
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          monthly_applications: 40,
          interview_rate_target: 0.25,
          offer_rate_target: 0.08,
        }],
      });

      const res = await request(app)
        .get('/api/dashboard/stats');

      expect(res.status).toBe(200);
      expect(res.body.keyMetrics).toBeDefined();
      expect(res.body.timeToResponse).toBeDefined();
      expect(res.body.trends).toBeDefined();
      expect(res.body.funnel).toBeDefined();
      expect(res.body.avgTimeInStage).toBeDefined();
      expect(res.body.goals).toBeDefined();
      expect(res.body.actionableInsights).toBeDefined();
      expect(res.body.industryComparison).toBeDefined();
    });

    it('should use date filters when provided', async () => {
      // Mock all necessary queries
      mockPool.query.mockResolvedValueOnce({ rows: [{ total: 5 }] });
      mockPool.query.mockResolvedValueOnce({ rows: [{ total: 5 }] });
      mockPool.query.mockResolvedValueOnce({ rows: [{ total: 5, archived: 0, not_archived: 5 }] });
      mockPool.query.mockResolvedValueOnce({
        rows: [{ total_applications: 5, total_interviews: 2, total_offers: 0 }],
      });
      mockPool.query.mockResolvedValueOnce({
        rows: [{ interview_rate: 0.4, offer_rate: 0, avg_response_hours: 24 }],
      });
      mockPool.query.mockResolvedValueOnce({ rows: [{ avg_response_hours: 24 }] });
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      mockPool.query.mockResolvedValueOnce({ rows: [{ applied: 5, interview: 2, offer: 0 }] });
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      mockPool.query.mockResolvedValueOnce({ rows: [] }); // No user goals

      const res = await request(app)
        .get('/api/dashboard/stats?startDate=2024-01-01&endDate=2024-06-30');

      expect(res.status).toBe(200);
    });

    it('should use default goals when user goals not found', async () => {
      // Mock all necessary queries
      mockPool.query.mockResolvedValueOnce({ rows: [{ total: 5 }] });
      mockPool.query.mockResolvedValueOnce({ rows: [{ total: 5 }] });
      mockPool.query.mockResolvedValueOnce({ rows: [{ total: 5, archived: 0, not_archived: 5 }] });
      mockPool.query.mockResolvedValueOnce({
        rows: [{ total_applications: 5, total_interviews: 2, total_offers: 0 }],
      });
      mockPool.query.mockResolvedValueOnce({
        rows: [{ interview_rate: 0.4, offer_rate: 0, avg_response_hours: 24 }],
      });
      mockPool.query.mockResolvedValueOnce({ rows: [{ avg_response_hours: 24 }] });
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      mockPool.query.mockResolvedValueOnce({ rows: [{ applied: 5, interview: 2, offer: 0 }] });
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      mockPool.query.mockResolvedValueOnce({ rows: [] }); // Empty - no user goals

      const res = await request(app)
        .get('/api/dashboard/stats');

      expect(res.status).toBe(200);
      // Should use default goals
      expect(res.body.goals.monthlyApplications).toBe(30);
      expect(res.body.goals.interviewRateTarget).toBe(0.30);
      expect(res.body.goals.offerRateTarget).toBe(0.05);
    });

    it('should handle goals query error and use defaults', async () => {
      // Mock all necessary queries
      mockPool.query.mockResolvedValueOnce({ rows: [{ total: 5 }] });
      mockPool.query.mockResolvedValueOnce({ rows: [{ total: 5 }] });
      mockPool.query.mockResolvedValueOnce({ rows: [{ total: 5, archived: 0, not_archived: 5 }] });
      mockPool.query.mockResolvedValueOnce({
        rows: [{ total_applications: 5, total_interviews: 2, total_offers: 0 }],
      });
      mockPool.query.mockResolvedValueOnce({
        rows: [{ interview_rate: 0.4, offer_rate: 0, avg_response_hours: 24 }],
      });
      mockPool.query.mockResolvedValueOnce({ rows: [{ avg_response_hours: 24 }] });
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      mockPool.query.mockResolvedValueOnce({ rows: [{ applied: 5, interview: 2, offer: 0 }] });
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      mockPool.query.mockRejectedValueOnce(new Error('Goals table not found')); // Goals error

      const res = await request(app)
        .get('/api/dashboard/stats');

      expect(res.status).toBe(200);
      // Should still return with defaults
      expect(res.body.goals.monthlyApplications).toBe(30);
    });

    it('should generate insights for low applications', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ total: 2 }] });
      mockPool.query.mockResolvedValueOnce({ rows: [{ total: 2 }] });
      mockPool.query.mockResolvedValueOnce({ rows: [{ total: 2, archived: 0, not_archived: 2 }] });
      mockPool.query.mockResolvedValueOnce({
        rows: [{ total_applications: 2, total_interviews: 0, total_offers: 0 }],
      });
      mockPool.query.mockResolvedValueOnce({
        rows: [{ interview_rate: 0, offer_rate: 0, avg_response_hours: null }],
      });
      mockPool.query.mockResolvedValueOnce({ rows: [{ avg_response_hours: null }] });
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      mockPool.query.mockResolvedValueOnce({ rows: [{ applied: 2, interview: 0, offer: 0 }] });
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/api/dashboard/stats');

      expect(res.status).toBe(200);
      expect(res.body.actionableInsights).toContain('Increase application volume to reach your monthly goal.');
    });

    it('should generate insights for low interview rate', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ total: 50 }] });
      mockPool.query.mockResolvedValueOnce({ rows: [{ total: 50 }] });
      mockPool.query.mockResolvedValueOnce({ rows: [{ total: 50, archived: 0, not_archived: 50 }] });
      mockPool.query.mockResolvedValueOnce({
        rows: [{ total_applications: 50, total_interviews: 2, total_offers: 0 }],
      });
      mockPool.query.mockResolvedValueOnce({
        rows: [{ interview_rate: 0.04, offer_rate: 0, avg_response_hours: 48 }],
      });
      mockPool.query.mockResolvedValueOnce({ rows: [{ avg_response_hours: 48 }] });
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      mockPool.query.mockResolvedValueOnce({ rows: [{ applied: 50, interview: 2, offer: 0 }] });
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/api/dashboard/stats');

      expect(res.status).toBe(200);
      expect(res.body.actionableInsights).toContain('Improve resume or apply to better-fit roles to boost interviews.');
    });

    it('should generate insights for low offer rate', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ total: 50 }] });
      mockPool.query.mockResolvedValueOnce({ rows: [{ total: 50 }] });
      mockPool.query.mockResolvedValueOnce({ rows: [{ total: 50, archived: 0, not_archived: 50 }] });
      mockPool.query.mockResolvedValueOnce({
        rows: [{ total_applications: 50, total_interviews: 20, total_offers: 0 }],
      });
      mockPool.query.mockResolvedValueOnce({
        rows: [{ interview_rate: 0.4, offer_rate: 0, avg_response_hours: 48 }],
      });
      mockPool.query.mockResolvedValueOnce({ rows: [{ avg_response_hours: 48 }] });
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      mockPool.query.mockResolvedValueOnce({ rows: [{ applied: 50, interview: 20, offer: 0 }] });
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/api/dashboard/stats');

      expect(res.status).toBe(200);
      expect(res.body.actionableInsights).toContain('Improve interview performance to raise offer rate.');
    });

    it('should show "on track" insight when all goals are met', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ total: 50 }] });
      mockPool.query.mockResolvedValueOnce({ rows: [{ total: 50 }] });
      mockPool.query.mockResolvedValueOnce({ rows: [{ total: 50, archived: 0, not_archived: 50 }] });
      mockPool.query.mockResolvedValueOnce({
        rows: [{ total_applications: 50, total_interviews: 20, total_offers: 5 }],
      });
      mockPool.query.mockResolvedValueOnce({
        rows: [{ interview_rate: 0.4, offer_rate: 0.1, avg_response_hours: 24 }],
      });
      mockPool.query.mockResolvedValueOnce({ rows: [{ avg_response_hours: 24 }] });
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      mockPool.query.mockResolvedValueOnce({ rows: [{ applied: 50, interview: 20, offer: 5 }] });
      mockPool.query.mockResolvedValueOnce({ rows: [{ status: 'Interview', avg_days: 5 }] });
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/api/dashboard/stats');

      expect(res.status).toBe(200);
      expect(res.body.actionableInsights).toContain("Great progress! You're on track.");
    });

    it('should handle null avg_response_hours', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ total: 5 }] });
      mockPool.query.mockResolvedValueOnce({ rows: [{ total: 5 }] });
      mockPool.query.mockResolvedValueOnce({ rows: [{ total: 5, archived: 0, not_archived: 5 }] });
      mockPool.query.mockResolvedValueOnce({
        rows: [{ total_applications: 5, total_interviews: 2, total_offers: 0 }],
      });
      mockPool.query.mockResolvedValueOnce({
        rows: [{ interview_rate: 0.4, offer_rate: 0, avg_response_hours: null }],
      });
      mockPool.query.mockResolvedValueOnce({ rows: [{ avg_response_hours: null }] });
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      mockPool.query.mockResolvedValueOnce({ rows: [{ applied: 5, interview: 2, offer: 0 }] });
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/api/dashboard/stats');

      expect(res.status).toBe(200);
      expect(res.body.timeToResponse.avg_response_hours).toBe(0);
    });

    it('should calculate industry comparison correctly', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ total: 50 }] });
      mockPool.query.mockResolvedValueOnce({ rows: [{ total: 50 }] });
      mockPool.query.mockResolvedValueOnce({ rows: [{ total: 50, archived: 0, not_archived: 50 }] });
      mockPool.query.mockResolvedValueOnce({
        rows: [{ total_applications: 50, total_interviews: 10, total_offers: 3 }],
      });
      mockPool.query.mockResolvedValueOnce({
        rows: [{ interview_rate: 0.2, offer_rate: 0.06, avg_response_hours: 120 }],
      });
      mockPool.query.mockResolvedValueOnce({ rows: [{ avg_response_hours: 120 }] });
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      mockPool.query.mockResolvedValueOnce({ rows: [{ applied: 50, interview: 10, offer: 3 }] });
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/api/dashboard/stats');

      expect(res.status).toBe(200);
      expect(res.body.industryComparison).toBeDefined();
      expect(res.body.industryComparison.industry).toBeDefined();
      expect(res.body.industryComparison.user).toBeDefined();
      expect(res.body.industryComparison.comparison).toBeDefined();
    });

    it('should handle database error gracefully', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database connection failed'));

      const res = await request(app)
        .get('/api/dashboard/stats');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to load dashboard stats');
    });

    it('should handle zero interview rate for comparison', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ total: 5 }] });
      mockPool.query.mockResolvedValueOnce({ rows: [{ total: 5 }] });
      mockPool.query.mockResolvedValueOnce({ rows: [{ total: 5, archived: 0, not_archived: 5 }] });
      mockPool.query.mockResolvedValueOnce({
        rows: [{ total_applications: 5, total_interviews: 0, total_offers: 0 }],
      });
      mockPool.query.mockResolvedValueOnce({
        rows: [{ interview_rate: 0, offer_rate: 0, avg_response_hours: 0 }],
      });
      mockPool.query.mockResolvedValueOnce({ rows: [{ avg_response_hours: 0 }] });
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      mockPool.query.mockResolvedValueOnce({ rows: [{ applied: 5, interview: 0, offer: 0 }] });
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/api/dashboard/stats');

      expect(res.status).toBe(200);
      expect(res.body.industryComparison.comparison.interviewRate.status).toBe('below');
    });

    it('should normalize stage times correctly', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ total: 10 }] });
      mockPool.query.mockResolvedValueOnce({ rows: [{ total: 10 }] });
      mockPool.query.mockResolvedValueOnce({ rows: [{ total: 10, archived: 0, not_archived: 10 }] });
      mockPool.query.mockResolvedValueOnce({
        rows: [{ total_applications: 10, total_interviews: 5, total_offers: 2 }],
      });
      mockPool.query.mockResolvedValueOnce({
        rows: [{ interview_rate: 0.5, offer_rate: 0.2, avg_response_hours: 36 }],
      });
      mockPool.query.mockResolvedValueOnce({ rows: [{ avg_response_hours: 36 }] });
      mockPool.query.mockResolvedValueOnce({ rows: [{ week_start: '2024-01-01', applications: 10, interviews: 5, offers: 2 }] });
      mockPool.query.mockResolvedValueOnce({ rows: [{ applied: 10, interview: 5, offer: 2 }] });
      mockPool.query.mockResolvedValueOnce({
        rows: [
          { status: 'Applied', avg_days: '3.5' }, // String should be converted to number
          { status: 'Interview', avg_days: null }, // Null should become 0
        ],
      });
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/api/dashboard/stats');

      expect(res.status).toBe(200);
      expect(typeof res.body.avgTimeInStage[0].avg_days).toBe('number');
    });
  });
});

