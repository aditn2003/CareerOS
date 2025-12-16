/**
 * Time Investment Routes Tests
 * Tests routes/timeInvestment.js
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import timeInvestmentRoutes from '../../routes/timeInvestment.js';
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

describe('Time Investment Routes', () => {
  let app;
  let user;
  let userId;

  beforeEach(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';
    
    app = express();
    app.use(express.json());
    app.use('/api/time-investment', timeInvestmentRoutes);
    
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

  describe('GET /api/time-investment', () => {
    it('should get time investment analytics', async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT id, title, company, status, notes, applied_on')) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                title: 'Software Engineer',
                company: 'Tech Corp',
                status: 'Applied',
                applied_on: '2024-01-15',
                created_at: '2024-01-15',
              },
            ],
          });
        }
        if (query.includes('SELECT id, job_id, event, timestamp')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT id, activity_type, time_spent_minutes')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT id, event_name, event_date')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT id, company, role, interview_date')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT id, activity_type, title, duration_minutes')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT id, company, role, status')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT id, prep_type, status, time_spent_seconds')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/time-investment')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.summary).toBeDefined();
      expect(response.body.activityDistribution).toBeDefined();
      expect(response.body.productivityPatterns).toBeDefined();
      expect(response.body.taskCompletion).toBeDefined();
      expect(response.body.burnoutAnalysis).toBeDefined();
      expect(response.body.energyLevels).toBeDefined();
      expect(response.body.recommendations).toBeDefined();
    });

    it('should handle missing tables gracefully', async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT id, title, company')) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                title: 'Software Engineer',
                company: 'Tech Corp',
                status: 'Applied',
                applied_on: '2024-01-15',
                created_at: '2024-01-15',
              },
            ],
          });
        }
        if (query.includes('SELECT id, job_id, event')) {
          return Promise.reject(new Error('Table application_history does not exist'));
        }
        if (query.includes('SELECT id, activity_type')) {
          return Promise.reject(new Error('Table networking_activities does not exist'));
        }
        if (query.includes('SELECT id, event_name')) {
          return Promise.reject(new Error('Table networking_events does not exist'));
        }
        if (query.includes('SELECT id, company, role')) {
          return Promise.reject(new Error('Table interview_outcomes does not exist'));
        }
        if (query.includes('SELECT id, activity_type, title')) {
          return Promise.reject(new Error('Table job_search_activities does not exist'));
        }
        if (query.includes('SELECT id, company, role, status')) {
          return Promise.reject(new Error('Table mock_interview_sessions does not exist'));
        }
        if (query.includes('SELECT id, prep_type')) {
          return Promise.reject(new Error('Table technical_prep_sessions does not exist'));
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/time-investment')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.summary).toBeDefined();
    });

    it('should calculate activity distribution correctly', async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT id, title, company, status')) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                title: 'Software Engineer',
                company: 'Tech Corp',
                status: 'Applied',
                applied_on: '2024-01-15',
                created_at: '2024-01-15',
              },
              {
                id: 2,
                title: 'Data Scientist',
                company: 'Data Corp',
                status: 'Interested',
                created_at: '2024-01-16',
              },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/time-investment')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.activityDistribution.applications.count).toBeGreaterThan(0);
    });
  });

  describe('POST /api/time-investment/activities', () => {
    it('should log a manual activity', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          user_id: userId,
          activity_type: 'application',
          title: 'Applied to Tech Corp',
          duration_minutes: 30,
          activity_date: '2024-01-15',
        }],
      });

      const response = await request(app)
        .post('/api/time-investment/activities')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          activity_type: 'application',
          title: 'Applied to Tech Corp',
          duration_minutes: 30,
          activity_date: '2024-01-15',
        });

      expect(response.status).toBe(201);
      expect(response.body.activity).toBeDefined();
    });

    it('should return 400 if activity_type is missing', async () => {
      const response = await request(app)
        .post('/api/time-investment/activities')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          title: 'Applied to Tech Corp',
          duration_minutes: 30,
        });

      expect(response.status).toBe(400);
    });

    it('should return 400 if duration_minutes is invalid', async () => {
      const response = await request(app)
        .post('/api/time-investment/activities')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          activity_type: 'application',
          duration_minutes: 0,
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/time-investment/activities', () => {
    it('should get user activities', async () => {
      pool.query
        .mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              user_id: userId,
              activity_type: 'application',
              title: 'Applied to Tech Corp',
              duration_minutes: 30,
              activity_date: '2024-01-15',
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [{ count: '1' }],
        });

      const response = await request(app)
        .get('/api/time-investment/activities')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.activities).toBeDefined();
      expect(response.body.total).toBe(1);
    });

    it('should filter by activity_type', async () => {
      pool.query
        .mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              activity_type: 'application',
              title: 'Applied to Tech Corp',
              duration_minutes: 30,
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [{ count: '1' }],
        });

      const response = await request(app)
        .get('/api/time-investment/activities?activity_type=application')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.activities.length).toBe(1);
    });

    it('should filter by date range', async () => {
      pool.query
        .mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              activity_type: 'application',
              activity_date: '2024-01-15',
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [{ count: '1' }],
        });

      const response = await request(app)
        .get('/api/time-investment/activities?start_date=2024-01-01&end_date=2024-01-31')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
    });
  });

  describe('PUT /api/time-investment/activities/:id', () => {
    it('should update an activity', async () => {
      pool.query
        .mockResolvedValueOnce({
          rows: [{ id: 1 }],
        })
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            user_id: userId,
            activity_type: 'application',
            title: 'Updated Title',
            duration_minutes: 45,
          }],
        });

      const response = await request(app)
        .put('/api/time-investment/activities/1')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          title: 'Updated Title',
          duration_minutes: 45,
        });

      expect(response.status).toBe(200);
      expect(response.body.activity.title).toBe('Updated Title');
    });

    it('should return 404 if activity not found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .put('/api/time-investment/activities/999')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          title: 'Updated Title',
        });

      expect(response.status).toBe(404);
    });

    it('should return 400 if no valid fields to update', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ id: 1 }],
      });

      const response = await request(app)
        .put('/api/time-investment/activities/1')
        .set('Authorization', `Bearer ${user.token}`)
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/time-investment/activities/:id', () => {
    it('should delete an activity', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ id: 1 }],
      });

      const response = await request(app)
        .delete('/api/time-investment/activities/1')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('deleted successfully');
    });

    it('should return 404 if activity not found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .delete('/api/time-investment/activities/999')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/time-investment/activity-types', () => {
    it('should return activity type options', async () => {
      const response = await request(app)
        .get('/api/time-investment/activity-types')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.activityTypes).toBeDefined();
      expect(Array.isArray(response.body.activityTypes)).toBe(true);
      expect(response.body.activityTypes.length).toBeGreaterThan(0);
    });
  });
});



