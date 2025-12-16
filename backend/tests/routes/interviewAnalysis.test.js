/**
 * Interview Analysis Routes Tests
 * Tests routes/interviewAnalysis.js - full analysis features
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import interviewAnalysisRoutes from '../../routes/interviewAnalysis.js';
import { createTestUser } from '../helpers/auth.js';
import pool from '../../db/pool.js';

// Mock external dependencies
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
      limit: vi.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    })),
  })),
}));

vi.mock('../../auth.js', () => ({
  auth: vi.fn((req, res, next) => {
    // Mock authenticated user
    req.user = { id: 1 };
    next();
  }),
}));

describe('Interview Analysis Routes', () => {
  let app;
  let user;

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    app.use('/api/interview-analysis', interviewAnalysisRoutes);
    
    user = await createTestUser();
    
    // Mock pool.query for database queries
    vi.spyOn(pool, 'query').mockResolvedValue({
      rows: [
        {
          month: '2024-01-01',
          total_interviews: 5,
          offers: 2,
        },
      ],
    });
    
    vi.clearAllMocks();
  });

  describe('GET /api/interview-analysis/full', () => {
    it('should get comprehensive interview analysis', async () => {
      const response = await request(app)
        .get('/api/interview-analysis/full');

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
      expect(response.body.summaryCards).toBeDefined();
      expect(response.body.conversionOverTime).toBeDefined();
      expect(response.body.mockInterviewStats).toBeDefined();
    });

    it('should include mock vs real comparison', async () => {
      const response = await request(app)
        .get('/api/interview-analysis/full');

      expect(response.status).toBe(200);
      expect(response.body.mockVsReal).toBeDefined();
    });

    it('should include feedback themes analysis', async () => {
      const response = await request(app)
        .get('/api/interview-analysis/full');

      expect(response.status).toBe(200);
      expect(response.body.feedbackThemes).toBeDefined();
    });

    it('should include industry performance analysis', async () => {
      const response = await request(app)
        .get('/api/interview-analysis/full');

      expect(response.status).toBe(200);
      expect(response.body.industryPerformance).toBeDefined();
    });

    it('should include benchmark comparison', async () => {
      const response = await request(app)
        .get('/api/interview-analysis/full');

      expect(response.status).toBe(200);
      expect(response.body.benchmarkComparison).toBeDefined();
    });

    it('should include personalized recommendations', async () => {
      const response = await request(app)
        .get('/api/interview-analysis/full');

      expect(response.status).toBe(200);
      expect(response.body.recommendations).toBeDefined();
      expect(Array.isArray(response.body.recommendations)).toBe(true);
    });

    it('should include anxiety data', async () => {
      const response = await request(app)
        .get('/api/interview-analysis/full');

      expect(response.status).toBe(200);
      expect(response.body.anxietyData).toBeDefined();
    });
  });
});



