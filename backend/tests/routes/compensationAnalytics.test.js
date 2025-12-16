/**
 * Compensation Analytics Routes Tests
 * Tests routes/compensationAnalytics.js
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import compensationAnalyticsRoutes from '../../routes/compensationAnalytics.js';
import { createTestUser } from '../helpers/auth.js';
import pool from '../../db/pool.js';

// Mock dependencies
vi.mock('../../auth.js', () => ({
  auth: vi.fn((req, res, next) => {
    req.user = { id: 1 };
    next();
  }),
}));

vi.mock('../../db/pool.js', () => ({
  default: {
    query: vi.fn(),
  },
}));

describe('Compensation Analytics Routes', () => {
  let app;
  let user;
  let userId;

  beforeEach(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';
    
    app = express();
    app.use(express.json());
    app.use('/api/compensation-analytics', compensationAnalyticsRoutes);
    
    user = await createTestUser();
    
    const jwtModule = await import('jsonwebtoken');
    const decoded = jwtModule.verify(user.token, process.env.JWT_SECRET || 'test-secret-key');
    userId = Number(decoded.id);
    
    vi.clearAllMocks();
    
    const { auth } = await import('../../auth.js');
    vi.mocked(auth).mockImplementation((req, res, next) => {
      const h = req.headers.authorization || "";
      const token = h.startsWith("Bearer ") ? h.split(" ")[1] : null;
      if (!token) {
        return res.status(401).json({ error: "NO_TOKEN" });
      }
      try {
        const decoded = jwtModule.verify(token, process.env.JWT_SECRET || 'test-secret-key');
        req.user = { id: Number(decoded.id), email: decoded.email };
        next();
      } catch (err) {
        return res.status(401).json({ error: "INVALID_TOKEN" });
      }
    });
  });

  describe('GET /api/compensation-analytics/full', () => {
    it('should get full compensation analytics', async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT * FROM offers')) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                user_id: userId,
                company: 'Tech Corp',
                role_title: 'Software Engineer',
                base_salary: 120000,
                total_comp_year1: 140000,
                offer_status: 'accepted',
                offer_date: '2024-01-15',
                role_level: 'mid',
              },
            ],
          });
        }
        if (query.includes('SELECT * FROM compensation_history')) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                user_id: userId,
                company: 'Tech Corp',
                role_title: 'Software Engineer',
                start_date: '2024-01-01',
                base_salary_start: 100000,
                base_salary_current: 120000,
                total_comp_start: 120000,
              },
            ],
          });
        }
        if (query.includes('SELECT nh.*, o.company')) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                user_id: userId,
                offer_id: 1,
                negotiation_round: 1,
                improvement_percent: 10,
                negotiation_date: '2024-01-10',
                company: 'Tech Corp',
                role_title: 'Software Engineer',
              },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/compensation-analytics/full')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.offers).toBeDefined();
      expect(response.body.compensationHistory).toBeDefined();
      expect(response.body.negotiationHistory).toBeDefined();
      expect(response.body.negotiationMetrics).toBeDefined();
      expect(response.body.offerStats).toBeDefined();
    });

    it('should handle empty data', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .get('/api/compensation-analytics/full')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.offers).toEqual([]);
      expect(response.body.compensationHistory).toEqual([]);
    });
  });

  describe('GET /api/compensation-analytics/negotiation-success', () => {
    it('should get negotiation success rate', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{
          total_negotiations: '5',
          successful: '3',
          avg_improvement: '8.5',
          median_improvement: '7.0',
        }],
      });

      const response = await request(app)
        .get('/api/compensation-analytics/negotiation-success')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.totalNegotiations).toBe(5);
      expect(response.body.successfulNegotiations).toBe(3);
      expect(response.body.successRate).toBe(60);
    });

    it('should handle no negotiations', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{
          total_negotiations: '0',
          successful: '0',
          avg_improvement: null,
          median_improvement: null,
        }],
      });

      const response = await request(app)
        .get('/api/compensation-analytics/negotiation-success')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.successRate).toBe(0);
    });
  });

  describe('GET /api/compensation-analytics/market-comparison/:offerId', () => {
    it('should get market comparison for an offer', async () => {
      pool.query.mockImplementation((query, params) => {
        if (query.includes('SELECT * FROM offers WHERE id = $1')) {
          if (params && String(params[0]) === '1' && params[1] == userId) {
            return Promise.resolve({
              rows: [{
                id: 1,
                user_id: userId,
                role_title: 'Software Engineer',
                role_level: 'mid',
                industry: 'Technology',
                company_size: 'large',
                location: 'San Francisco, CA',
                location_type: 'on_site',
                base_salary: 120000,
              }],
            });
          }
        }
        if (query.includes('SELECT * FROM market_benchmarks')) {
          return Promise.resolve({
            rows: [{
              id: 1,
              role_title: 'Software Engineer',
              role_level: 'mid',
              percentile_10: 100000,
              percentile_25: 110000,
              percentile_50: 130000,
              percentile_75: 150000,
              percentile_90: 170000,
            }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/compensation-analytics/market-comparison/1')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.offer).toBeDefined();
      expect(response.body.benchmark).toBeDefined();
      expect(response.body.comparison).toBeDefined();
      expect(response.body.comparison.percentile).toBeDefined();
    });

    it('should return 404 if offer not found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/compensation-analytics/market-comparison/999')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(404);
    });

    it('should use approximation if no benchmark found', async () => {
      pool.query.mockImplementation((query, params) => {
        if (query.includes('SELECT * FROM offers WHERE id = $1')) {
          return Promise.resolve({
            rows: [{
              id: 1,
              user_id: userId,
              role_title: 'Software Engineer',
              role_level: 'mid',
              base_salary: 120000,
            }],
          });
        }
        if (query.includes('SELECT * FROM market_benchmarks') && query.includes('WHERE role_title ILIKE')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('AVG(percentile_50)')) {
          return Promise.resolve({
            rows: [{
              avg_median: 130000,
              avg_q3: 150000,
              sample_count: '10',
            }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/compensation-analytics/market-comparison/1')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.approximation).toBeDefined();
      expect(response.body.approximation.confidence).toBe('low');
    });
  });

  describe('GET /api/compensation-analytics/evolution', () => {
    it('should get compensation evolution timeline', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            user_id: userId,
            company: 'Tech Corp',
            role_title: 'Software Engineer',
            start_date: '2024-01-01',
            end_date: null,
            base_salary_start: 100000,
            total_comp_start: 120000,
            role_level: 'mid',
            promotion_date: null,
            tenure_years: 0.5,
          },
        ],
      });

      const response = await request(app)
        .get('/api/compensation-analytics/evolution')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.timeline).toBeDefined();
      expect(response.body.milestones).toBeDefined();
      expect(response.body.plateaus).toBeDefined();
    });

    it('should detect milestones', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            user_id: userId,
            start_date: '2024-01-01',
            base_salary_start: 100000,
            total_comp_start: 200000,
            promotion_date: '2024-06-01',
            promotion_from_level: 'mid',
            promotion_to_level: 'senior',
            salary_increase_percent: 20,
          },
        ],
      });

      const response = await request(app)
        .get('/api/compensation-analytics/evolution')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.milestones.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/compensation-analytics/comprehensive', () => {
    it('should get comprehensive compensation analytics', async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT * FROM offers')) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                user_id: userId,
                company: 'Tech Corp',
                role_title: 'Software Engineer',
                base_salary: 120000,
                offer_status: 'accepted',
                job_id: 1,
              },
            ],
          });
        }
        if (query.includes('SELECT * FROM compensation_history')) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                user_id: userId,
                company: 'Tech Corp',
                role_title: 'Software Engineer',
                start_date: '2024-01-01',
                base_salary_start: 100000,
                base_salary_current: 120000,
                role_level: 'mid',
                offer_id: 1,
              },
            ],
          });
        }
        if (query.includes('SELECT id FROM jobs WHERE') && query.includes('isArchived')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT nh.*, o.company')) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                user_id: userId,
                offer_id: 1,
                negotiation_round: 1,
                improvement_percent: 10,
                negotiation_date: '2024-01-10',
                company: 'Tech Corp',
                role_title: 'Software Engineer',
                industry: 'Technology',
                company_size: 'large',
                location_type: 'on_site',
                role_level: 'mid',
              },
            ],
          });
        }
        if (query.includes('SELECT id, title, company')) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                title: 'Software Engineer',
                company: 'Tech Corp',
                location: 'San Francisco, CA',
                salary_min: 100000,
                salary_max: 150000,
                status: 'Offer',
                industry: 'Technology',
                role_level: 'mid',
                created_at: '2024-01-01',
                offerDate: null,
                status_updated_at: '2024-01-15',
              },
            ],
          });
        }
        if (query.includes('SELECT DISTINCT ON (job_id)')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT col_index FROM cost_of_living_index')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/compensation-analytics/comprehensive')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.offerTracking).toBeDefined();
      expect(response.body.negotiationAnalytics).toBeDefined();
      expect(response.body.compensationEvolution).toBeDefined();
      expect(response.body.careerProgression).toBeDefined();
      expect(response.body.recommendations).toBeDefined();
    });

    it('should handle database errors gracefully', async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT * FROM offers')) {
          return Promise.reject(new Error('Database error'));
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/compensation-analytics/comprehensive')
        .set('Authorization', `Bearer ${user.token}`);

      // Should still return 200 with empty data due to Promise.allSettled
      expect(response.status).toBe(200);
    });
  });
});



