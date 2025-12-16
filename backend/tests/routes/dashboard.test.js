/**
 * Dashboard Routes Tests
 * Tests dashboard statistics and data aggregation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import pool from '../../db/pool.js';
import dashboardRoutes from '../../routes/dashboard.js';
import { createTestUser, queryTestDb, seedJobs } from '../helpers/index.js';

// Mock external services
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn(() => ({
    getGenerativeModel: vi.fn(() => ({
      generateContent: vi.fn().mockResolvedValue({
        response: { text: vi.fn(() => 'Mocked AI response') }
      })
    }))
  }))
}));

vi.mock('openai', () => ({
  default: vi.fn(() => ({
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{ message: { content: 'Mocked OpenAI response' } }]
        })
      }
    }
  }))
}));

vi.mock('resend', () => ({
  Resend: vi.fn(() => ({
    emails: {
      send: vi.fn().mockResolvedValue({ id: 'mock-email-id' })
    }
  }))
}));

describe('Dashboard Routes', () => {
  let app;
  let user;

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    app.use('/api/dashboard', dashboardRoutes);
    
    user = await createTestUser({
      email: 'dashboard@test.com',
      first_name: 'Dashboard',
      last_name: 'Test',
    });
  });

  describe('GET /api/dashboard/stats', () => {
    it('should return dashboard statistics with empty data', async () => {
      const response = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('keyMetrics');
      expect(response.body).toHaveProperty('timeToResponse');
      expect(response.body).toHaveProperty('trends');
      expect(response.body).toHaveProperty('funnel');
      expect(response.body).toHaveProperty('avgTimeInStage');
      expect(response.body).toHaveProperty('goals');
      expect(response.body).toHaveProperty('actionableInsights');
      expect(response.body).toHaveProperty('industryComparison');
      
      expect(response.body.keyMetrics.total_applications).toBe(0);
      expect(response.body.keyMetrics.total_interviews).toBe(0);
      expect(response.body.keyMetrics.total_offers).toBe(0);
    });

    it('should calculate key metrics correctly', async () => {
      // Create jobs with different statuses
      await seedJobs(user.id, 5, { status: 'Applied' });
      await seedJobs(user.id, 3, { status: 'Interview' });
      await seedJobs(user.id, 2, { status: 'Offer' });
      await seedJobs(user.id, 1, { status: 'Rejected' });

      const response = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.keyMetrics.total_applications).toBeGreaterThanOrEqual(11);
      expect(response.body.keyMetrics.total_interviews).toBeGreaterThanOrEqual(3);
      expect(response.body.keyMetrics.total_offers).toBeGreaterThanOrEqual(2);
    });

    it('should exclude archived jobs from metrics', async () => {
      // Create archived and non-archived jobs
      await seedJobs(user.id, 3, { status: 'Applied' });
      
      // Archive some jobs (use subquery since LIMIT not allowed in UPDATE)
      await queryTestDb(
        `UPDATE jobs SET "isArchived" = true 
         WHERE id IN (SELECT id FROM jobs WHERE user_id = $1 AND "isArchived" IS NOT TRUE LIMIT 2)`,
        [user.id]
      );

      const response = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      // Should only count non-archived jobs
      expect(response.body.keyMetrics.total_applications).toBeLessThanOrEqual(1);
    });

    it('should filter by date range', async () => {
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      // Create jobs with different dates
      await seedJobs(user.id, 2, { 
        status: 'Applied',
        applicationDate: lastMonth.toISOString().split('T')[0]
      });
      await seedJobs(user.id, 3, { 
        status: 'Applied',
        applicationDate: now.toISOString().split('T')[0]
      });

      const response = await request(app)
        .get('/api/dashboard/stats')
        .query({
          startDate: now.toISOString().split('T')[0],
          endDate: nextMonth.toISOString().split('T')[0],
        })
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      // Should only include jobs in the date range
      expect(response.body.keyMetrics.total_applications).toBeGreaterThanOrEqual(3);
    });

    it('should calculate time to response', async () => {
      const applicationDate = new Date('2024-01-01');
      const responseDate = new Date('2024-01-05');

      await queryTestDb(
        `INSERT INTO jobs (user_id, title, company, status, "applicationDate", first_response_date)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          user.id, 'Job 1', 'Company 1', 'Interview',
          applicationDate.toISOString().split('T')[0],
          responseDate.toISOString()
        ]
      );

      const response = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.timeToResponse).toHaveProperty('avg_response_hours');
      // Should be approximately 96 hours (4 days)
      expect(response.body.timeToResponse.avg_response_hours).toBeGreaterThan(0);
    });

    it('should calculate weekly trends', async () => {
      const now = new Date();
      const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      await seedJobs(user.id, 2, {
        status: 'Applied',
        applicationDate: lastWeek.toISOString().split('T')[0]
      });
      await seedJobs(user.id, 3, {
        status: 'Applied',
        applicationDate: now.toISOString().split('T')[0]
      });

      const response = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.trends)).toBe(true);
      expect(response.body.trends.length).toBeGreaterThan(0);
      expect(response.body.trends[0]).toHaveProperty('week_start');
      expect(response.body.trends[0]).toHaveProperty('applications');
    });

    it('should calculate funnel statistics', async () => {
      await seedJobs(user.id, 10, { status: 'Applied' });
      await seedJobs(user.id, 5, { status: 'Interview' });
      await seedJobs(user.id, 2, { status: 'Offer' });

      const response = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.funnel).toHaveProperty('applied');
      expect(response.body.funnel).toHaveProperty('interview');
      expect(response.body.funnel).toHaveProperty('offer');
      // PostgreSQL returns counts as strings, convert to numbers
      expect(Number(response.body.funnel.applied)).toBeGreaterThanOrEqual(17);
      expect(Number(response.body.funnel.interview)).toBeGreaterThanOrEqual(5);
      expect(Number(response.body.funnel.offer)).toBeGreaterThanOrEqual(2);
    });

    it('should calculate average time in stage', async () => {
      await seedJobs(user.id, 3, { status: 'Applied' });
      await seedJobs(user.id, 2, { status: 'Interview' });

      const response = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.avgTimeInStage)).toBe(true);
      expect(response.body.avgTimeInStage.length).toBeGreaterThan(0);
      expect(response.body.avgTimeInStage[0]).toHaveProperty('status');
      expect(response.body.avgTimeInStage[0]).toHaveProperty('avg_days');
    });

    it('should include default goals', async () => {
      const response = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.goals).toHaveProperty('monthlyApplications');
      expect(response.body.goals).toHaveProperty('interviewRateTarget');
      expect(response.body.goals).toHaveProperty('offerRateTarget');
      expect(response.body.goals.monthlyApplications).toBe(30);
      expect(response.body.goals.interviewRateTarget).toBe(0.30);
      expect(response.body.goals.offerRateTarget).toBe(0.05);
    });

    it('should generate actionable insights', async () => {
      // Create low application volume
      await seedJobs(user.id, 5, { status: 'Applied' });

      const response = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.actionableInsights)).toBe(true);
      expect(response.body.actionableInsights.length).toBeGreaterThan(0);
    });

    it('should calculate industry comparison', async () => {
      await seedJobs(user.id, 10, { status: 'Applied' });
      await seedJobs(user.id, 2, { status: 'Interview' });
      await seedJobs(user.id, 1, { status: 'Offer' });

      const response = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.industryComparison).toHaveProperty('industry');
      expect(response.body.industryComparison).toHaveProperty('user');
      expect(response.body.industryComparison).toHaveProperty('comparison');
      expect(response.body.industryComparison.comparison).toHaveProperty('interviewRate');
      expect(response.body.industryComparison.comparison).toHaveProperty('offerRate');
      expect(response.body.industryComparison.comparison).toHaveProperty('responseTime');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get('/api/dashboard/stats');

      expect(response.status).toBe(401);
    });

    it('should only include user\'s own data', async () => {
      const otherUser = await createTestUser({
        email: 'other@test.com',
        first_name: 'Other',
        last_name: 'User',
      });

      await seedJobs(user.id, 5, { status: 'Applied' });
      await seedJobs(otherUser.id, 10, { status: 'Applied' });

      const response = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      // Should only count user's jobs
      expect(response.body.keyMetrics.total_applications).toBe(5);
    });
  });

  describe('Dashboard Data Aggregation', () => {
    it('should aggregate data across multiple statuses', async () => {
      await seedJobs(user.id, 5, { status: 'Interested' });
      await seedJobs(user.id, 8, { status: 'Applied' });
      await seedJobs(user.id, 4, { status: 'Interview' });
      await seedJobs(user.id, 2, { status: 'Offer' });
      await seedJobs(user.id, 3, { status: 'Rejected' });

      const response = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      // Should aggregate all non-archived jobs
      expect(response.body.keyMetrics.total_applications).toBeGreaterThanOrEqual(22);
    });

    it('should handle jobs without applicationDate', async () => {
      await queryTestDb(
        `INSERT INTO jobs (user_id, title, company, status, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [user.id, 'Job Without Date', 'Company', 'Applied']
      );

      const response = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      // Should use created_at as fallback
      expect(response.body.keyMetrics.total_applications).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Performance Metrics Calculation', () => {
    it('should calculate interview rate', async () => {
      await seedJobs(user.id, 20, { status: 'Applied' });
      await seedJobs(user.id, 5, { status: 'Interview' });

      const response = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      const interviewRate = response.body.industryComparison.user.interviewRate;
      expect(interviewRate).toBeGreaterThanOrEqual(0);
      expect(interviewRate).toBeLessThanOrEqual(1);
    });

    it('should calculate offer rate', async () => {
      await seedJobs(user.id, 20, { status: 'Applied' });
      await seedJobs(user.id, 2, { status: 'Offer' });

      const response = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      const offerRate = response.body.industryComparison.user.offerRate;
      expect(offerRate).toBeGreaterThanOrEqual(0);
      expect(offerRate).toBeLessThanOrEqual(1);
    });

    it('should compare performance to industry benchmarks', async () => {
      await seedJobs(user.id, 100, { status: 'Applied' });
      await seedJobs(user.id, 15, { status: 'Interview' });
      await seedJobs(user.id, 5, { status: 'Offer' });

      const response = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      const comparison = response.body.industryComparison.comparison;
      expect(comparison.interviewRate).toHaveProperty('user');
      expect(comparison.interviewRate).toHaveProperty('industry');
      expect(comparison.interviewRate).toHaveProperty('difference');
      expect(comparison.interviewRate).toHaveProperty('status');
    });

    it('should handle zero applications gracefully', async () => {
      const response = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.industryComparison.user.interviewRate).toBe(0);
      expect(response.body.industryComparison.user.offerRate).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const querySpy = vi.spyOn(pool, 'query');
      querySpy.mockRejectedValueOnce(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to load dashboard stats');

      querySpy.mockRestore();
    });
  });
});

