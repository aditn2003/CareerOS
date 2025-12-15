/**
 * Timing Routes Tests
 * Tests routes/timing.js - timing analytics
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import timingRoutes from '../../routes/timing.js';
import { createTestUser } from '../helpers/auth.js';
import pool from '../../db/pool.js';

// Mock dependencies
vi.mock('../../db/pool.js', () => ({
  default: {
    query: vi.fn(),
  },
}));

describe('Timing Routes', () => {
  let app;
  let user;
  let userId;

  beforeEach(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';
    
    app = express();
    app.use(express.json());
    app.use('/api/timing', timingRoutes);
    
    user = await createTestUser();
    
    const jwtModule = await import('jsonwebtoken');
    const decoded = jwtModule.verify(user.token, process.env.JWT_SECRET || 'test-secret-key');
    userId = Number(decoded.id);
    
    vi.clearAllMocks();
    
    // Mock the auth middleware used by timing routes (uses req.userId)
    // The route has its own auth function, so we need to ensure it works correctly
  });

  describe('POST /api/timing/submit', () => {
    it('should record an application submission', async () => {
      pool.query.mockImplementation((query, params) => {
        if (query.includes('SELECT id, industry, type FROM jobs') && params && params[0] === 1 && params[1] === userId) {
          return Promise.resolve({
            rows: [{ id: 1, industry: 'Technology', type: 'Full-time' }],
          });
        }
        if (query.includes('INSERT INTO application_submissions')) {
          return Promise.resolve({
            rows: [{
              id: 1,
              job_id: 1,
              user_id: userId,
              submitted_at: new Date(),
              day_of_week: 1,
              hour_of_day: 10,
            }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .post('/api/timing/submit')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          jobId: 1,
          submittedAt: new Date().toISOString(),
          industry: 'Technology',
          companySize: 'Large',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.submission).toBeDefined();
    });

    it('should return 400 if jobId is missing', async () => {
      const response = await request(app)
        .post('/api/timing/submit')
        .set('Authorization', `Bearer ${user.token}`)
        .send({});

      expect(response.status).toBe(400);
    });

    it('should return 404 if job not found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/timing/submit')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ jobId: 999 });

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/timing/recommendations/:jobId', () => {
    it('should get timing recommendations for a job', async () => {
      pool.query.mockImplementation((query, params) => {
        // jobId comes as string from req.params, route uses it directly
        if (query.includes('SELECT * FROM jobs WHERE id = $1 AND user_id = $2')) {
          if (params && String(params[0]) === '1' && params[1] == userId) {
            return Promise.resolve({
              rows: [{ id: 1, title: 'Software Engineer', company: 'Tech Corp', industry: 'Technology' }],
            });
          }
        }
        if (query.includes('SELECT * FROM timing_recommendations') && query.includes('status = \'active\'')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT day_of_week, hour_of_day') && query.includes('FROM application_submissions')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('INSERT INTO timing_recommendations')) {
          return Promise.resolve({
            rows: [{
              id: 1,
              job_id: 1,
              user_id: userId,
              recommended_date: '2024-01-15',
              recommended_time: '10:00:00',
              day_of_week: 1,
              hour_of_day: 10,
              confidence_score: 0.5,
            }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/timing/recommendations/1')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.recommendation).toBeDefined();
      expect(response.body.job).toBeDefined();
    });

    it('should return 404 if job not found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/timing/recommendations/999')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/timing/optimal-times', () => {
    it('should get optimal times', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [
          {
            day_of_week: 1,
            hour_of_day: 10,
            total_submissions: 10,
            responses: 5,
            interviews: 2,
            offers: 1,
          },
        ],
      });

      const response = await request(app)
        .get('/api/timing/optimal-times')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.optimal_times).toBeDefined();
      expect(Array.isArray(response.body.optimal_times)).toBe(true);
    });

    it('should filter by industry if provided', async () => {
      pool.query.mockImplementation((query, params) => {
        if (query.includes('AND industry = $') && params && params[1] === 'Technology') {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/timing/optimal-times?industry=Technology')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/timing/schedule', () => {
    it('should schedule an application submission', async () => {
      pool.query.mockImplementation((query, params) => {
        if (query.includes('SELECT id FROM jobs') && params && params[0] === 1 && params[1] === userId) {
          return Promise.resolve({ rows: [{ id: 1 }] });
        }
        if (query.includes('SELECT id FROM scheduled_submissions') && query.includes('status = \'pending\'')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('INSERT INTO scheduled_submissions')) {
          return Promise.resolve({
            rows: [{
              id: 1,
              job_id: 1,
              user_id: userId,
              scheduled_date: '2024-01-15',
              scheduled_time: '10:00:00',
              status: 'pending',
            }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .post('/api/timing/schedule')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          jobId: 1,
          scheduledDate: '2024-01-15',
          scheduledTime: '10:00:00',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.schedule).toBeDefined();
    });

    it('should return 400 if required fields are missing', async () => {
      const response = await request(app)
        .post('/api/timing/schedule')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ jobId: 1 });

      expect(response.status).toBe(400);
    });

    it('should return 400 if pending schedule already exists', async () => {
      pool.query.mockImplementation((query, params) => {
        if (query.includes('SELECT id FROM jobs') && params && params[0] === 1 && params[1] === userId) {
          return Promise.resolve({ rows: [{ id: 1 }] });
        }
        if (query.includes('SELECT id FROM scheduled_submissions') && query.includes('status = \'pending\'')) {
          return Promise.resolve({ rows: [{ id: 1 }] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .post('/api/timing/schedule')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          jobId: 1,
          scheduledDate: '2024-01-15',
          scheduledTime: '10:00:00',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/timing/scheduled', () => {
    it('should get all scheduled submissions', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            job_id: 1,
            user_id: userId,
            scheduled_date: '2024-01-15',
            scheduled_time: '10:00:00',
            status: 'pending',
            job_title: 'Software Engineer',
            job_company: 'Tech Corp',
          },
        ],
      });

      const response = await request(app)
        .get('/api/timing/scheduled')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.schedules).toBeDefined();
      expect(Array.isArray(response.body.schedules)).toBe(true);
    });

    it('should filter by status if provided', async () => {
      pool.query.mockImplementation((query, params) => {
        if (query.includes('AND ss.status = $') && params && params[1] === 'completed') {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/timing/scheduled?status=completed')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
    });
  });

  describe('PUT /api/timing/schedule/:id', () => {
    it('should update a scheduled submission', async () => {
      pool.query.mockImplementation((query, params) => {
        // id comes as string from req.params
        if (query.includes('SELECT * FROM scheduled_submissions WHERE id = $1 AND user_id = $2') && 
            params && String(params[0]) === '1' && params[1] == userId) {
          return Promise.resolve({
            rows: [{
              id: 1,
              job_id: 1,
              user_id: userId,
              scheduled_date: '2024-01-15',
              scheduled_time: '10:00:00',
              status: 'pending',
            }],
          });
        }
        if (query.includes('UPDATE scheduled_submissions')) {
          return Promise.resolve({
            rows: [{
              id: 1,
              scheduled_date: '2024-01-16',
              scheduled_time: '11:00:00',
              status: 'pending',
            }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .put('/api/timing/schedule/1')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          scheduledDate: '2024-01-16',
          scheduledTime: '11:00:00',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.schedule).toBeDefined();
    });

    it('should return 404 if schedule not found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .put('/api/timing/schedule/999')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ scheduledDate: '2024-01-16' });

      expect(response.status).toBe(404);
    });

    it('should record submission when status is completed', async () => {
      pool.query.mockImplementation((query, params) => {
        if (query.includes('SELECT * FROM scheduled_submissions WHERE id = $1 AND user_id = $2')) {
          return Promise.resolve({
            rows: [{
              id: 1,
              job_id: 1,
              user_id: userId,
              scheduled_date: '2024-01-15',
              scheduled_time: '10:00:00',
              status: 'pending',
            }],
          });
        }
        if (query.includes('SELECT industry, type FROM jobs')) {
          return Promise.resolve({ rows: [{ industry: 'Technology', type: 'Full-time' }] });
        }
        if (query.includes('SELECT id FROM application_submissions')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('INSERT INTO application_submissions')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('UPDATE scheduled_submissions')) {
          return Promise.resolve({
            rows: [{ id: 1, status: 'completed' }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .put('/api/timing/schedule/1')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ status: 'completed' });

      expect(response.status).toBe(200);
    });
  });

  describe('DELETE /api/timing/schedule/:id', () => {
    it('should delete a scheduled submission', async () => {
      pool.query.mockImplementation((query, params) => {
        if (query.includes('SELECT id FROM scheduled_submissions WHERE id = $1 AND user_id = $2')) {
          return Promise.resolve({ rows: [{ id: 1 }] });
        }
        if (query.includes('DELETE FROM scheduled_submissions')) {
          return Promise.resolve({ rows: [{ id: 1 }] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .delete('/api/timing/schedule/1')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 404 if schedule not found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .delete('/api/timing/schedule/999')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/timing/analytics', () => {
    it('should get comprehensive timing analytics', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{
          total_submissions: 10,
          total_responses: 5,
          total_interviews: 2,
          total_offers: 1,
        }],
      });

      const response = await request(app)
        .get('/api/timing/analytics')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.summary).toBeDefined();
      expect(response.body.summary.total_submissions).toBe(10);
    });
  });

  describe('GET /api/timing/response-rates', () => {
    it('should get response rates grouped by day', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [
          {
            day_of_week: 1,
            total_submissions: 5,
            responses: 3,
            interviews: 1,
            offers: 0,
          },
        ],
      });

      const response = await request(app)
        .get('/api/timing/response-rates?groupBy=day')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should get response rates grouped by hour', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [
          {
            hour_of_day: 10,
            total_submissions: 5,
            responses: 3,
            interviews: 1,
            offers: 0,
          },
        ],
      });

      const response = await request(app)
        .get('/api/timing/response-rates?groupBy=hour')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.group_by).toBe('hour');
    });

    it('should get response rates grouped by industry', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [
          {
            industry: 'Technology',
            total_submissions: 5,
            responses: 3,
            interviews: 1,
            offers: 0,
          },
        ],
      });

      const response = await request(app)
        .get('/api/timing/response-rates?groupBy=industry')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.group_by).toBe('industry');
    });
  });

  describe('GET /api/timing/correlation', () => {
    it('should get correlation data between timing and success', async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes('ORDER BY') && query.includes('DESC') && query.includes('LIMIT 5')) {
          return Promise.resolve({
            rows: [
              {
                day_of_week: 1,
                hour_of_day: 10,
                total_submissions: 10,
                responses: 5,
                interviews: 2,
                offers: 1,
              },
            ],
          });
        }
        if (query.includes('ORDER BY') && query.includes('ASC') && query.includes('LIMIT 5')) {
          return Promise.resolve({
            rows: [
              {
                day_of_week: 6,
                hour_of_day: 20,
                total_submissions: 5,
                responses: 0,
                interviews: 0,
                offers: 0,
              },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/timing/correlation')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.best_performing).toBeDefined();
      expect(response.body.worst_performing).toBeDefined();
    });
  });

  describe('POST /api/timing/ab-test', () => {
    it('should create a new A/B test', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          user_id: userId,
          test_type: 'day_of_week',
          test_name: 'Monday vs Tuesday',
          variant_a: JSON.stringify({ day_of_week: 1 }),
          variant_b: JSON.stringify({ day_of_week: 2 }),
        }],
      });

      const response = await request(app)
        .post('/api/timing/ab-test')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          testType: 'day_of_week',
          testName: 'Monday vs Tuesday',
          variantA: { day_of_week: 1 },
          variantB: { day_of_week: 2 },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.test).toBeDefined();
    });

    it('should return 400 if required fields are missing', async () => {
      const response = await request(app)
        .post('/api/timing/ab-test')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ testType: 'day_of_week' });

      expect(response.status).toBe(400);
    });

    it('should update existing A/B test if testId provided', async () => {
      pool.query.mockImplementation((query, params) => {
        if (query.includes('SELECT * FROM timing_ab_tests WHERE id = $1 AND user_id = $2')) {
          return Promise.resolve({
            rows: [{
              id: 1,
              user_id: userId,
              test_type: 'day_of_week',
              variant_a: JSON.stringify({ day_of_week: 1 }),
              variant_b: JSON.stringify({ day_of_week: 2 }),
            }],
          });
        }
        if (query.includes('SELECT COUNT(*) as total_submissions') && query.includes('day_of_week = $')) {
          return Promise.resolve({
            rows: [{ total_submissions: 10, responses: 5, interviews: 2, offers: 1 }],
          });
        }
        if (query.includes('UPDATE timing_ab_tests')) {
          return Promise.resolve({
            rows: [{
              id: 1,
              results_a: JSON.stringify({ total_submissions: 10, responses: 5 }),
              results_b: JSON.stringify({ total_submissions: 8, responses: 3 }),
            }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .post('/api/timing/ab-test')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          testId: 1,
          testType: 'day_of_week',
          variantA: { day_of_week: 1 },
          variantB: { day_of_week: 2 },
        });

      expect(response.status).toBe(200);
      expect(response.body.statistics).toBeDefined();
    });
  });

  describe('GET /api/timing/ab-tests', () => {
    it('should get all A/B tests for the user', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            user_id: userId,
            test_type: 'day_of_week',
            test_name: 'Monday vs Tuesday',
            variant_a: JSON.stringify({ day_of_week: 1 }),
            variant_b: JSON.stringify({ day_of_week: 2 }),
            results_a: JSON.stringify({ total_submissions: 10, responses: 5 }),
            results_b: JSON.stringify({ total_submissions: 8, responses: 3 }),
          },
        ],
      });

      const response = await request(app)
        .get('/api/timing/ab-tests')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.tests).toBeDefined();
      expect(Array.isArray(response.body.tests)).toBe(true);
    });

    it('should filter by status if provided', async () => {
      pool.query.mockImplementation((query, params) => {
        if (query.includes('AND status = $') && params && params[1] === 'completed') {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/timing/ab-tests?status=completed')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
    });
  });
});

