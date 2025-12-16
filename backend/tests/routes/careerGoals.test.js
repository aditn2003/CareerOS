/**
 * Career Goals Routes Tests
 * Tests routes/careerGoals.js - career goal features
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import careerGoalsRoutes from '../../routes/careerGoals.js';
import { createTestUser } from '../helpers/auth.js';
import pool from '../../db/pool.js';

// Mock auth middleware
vi.mock('../../auth.js', () => ({
  auth: vi.fn((req, res, next) => {
    req.user = { id: 1 };
    next();
  }),
}));

// Mock pool
vi.mock('../../db/pool.js', () => ({
  default: {
    query: vi.fn(),
  },
}));

describe('Career Goals Routes', () => {
  let app;
  let user;
  let userId;

  beforeEach(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';
    
    app = express();
    app.use(express.json());
    app.use('/api/career-goals', careerGoalsRoutes);
    
    user = await createTestUser();
    
    // Decode JWT token to get the user ID
    const jwtModule = await import('jsonwebtoken');
    const decoded = jwtModule.verify(user.token, process.env.JWT_SECRET || 'test-secret-key');
    userId = Number(decoded.id);
    
    vi.clearAllMocks();
    
    // Update auth mock to verify JWT tokens
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

  describe('GET /api/career-goals', () => {
    it('should get all career goals for the user', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            user_id: userId,
            title: 'Get a Software Engineer Job',
            category: 'career',
            priority: 'high',
            progress_percent: 50,
            total_milestones: 5,
            completed_milestones: 2,
            achievement_count: 1,
          },
        ],
      });

      const response = await request(app)
        .get('/api/career-goals')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.goals).toBeDefined();
      expect(Array.isArray(response.body.goals)).toBe(true);
      expect(response.body.goals.length).toBeGreaterThan(0);
    });

    it('should return empty array if user has no goals', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/career-goals')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.goals).toEqual([]);
    });

    it('should return 401 if not authenticated', async () => {
      const response = await request(app)
        .get('/api/career-goals');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/career-goals/:id', () => {
    it('should get a single goal with details', async () => {
      const goalId = 1;

      pool.query.mockImplementation((query, params) => {
        if (query.includes('SELECT * FROM career_goals WHERE id = $1 AND user_id = $2')) {
          return Promise.resolve({
            rows: [{
              id: goalId,
              user_id: userId,
              title: 'Get a Software Engineer Job',
              description: 'Land a job at a top tech company',
              category: 'career',
              priority: 'high',
              progress_percent: 50,
            }],
          });
        }
        if (query.includes('SELECT * FROM goal_milestones WHERE goal_id')) {
          return Promise.resolve({
            rows: [
              { id: 1, goal_id: goalId, title: 'Complete resume', status: 'completed' },
              { id: 2, goal_id: goalId, title: 'Apply to 10 companies', status: 'in_progress' },
            ],
          });
        }
        if (query.includes('SELECT * FROM goal_progress_history WHERE goal_id')) {
          return Promise.resolve({
            rows: [
              { id: 1, goal_id: goalId, progress_percent: 25, recorded_at: new Date() },
              { id: 2, goal_id: goalId, progress_percent: 50, recorded_at: new Date() },
            ],
          });
        }
        if (query.includes('SELECT * FROM goal_achievements WHERE goal_id')) {
          return Promise.resolve({
            rows: [
              { id: 1, goal_id: goalId, achievement_type: 'progress_milestone', description: 'Reached 25%' },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get(`/api/career-goals/${goalId}`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.goal).toBeDefined();
      expect(response.body.milestones).toBeDefined();
      expect(response.body.progressHistory).toBeDefined();
      expect(response.body.achievements).toBeDefined();
    });

    it('should return 404 if goal not found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/career-goals/999')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/career-goals', () => {
    it('should create a new career goal', async () => {
      const goalData = {
        title: 'Get a Software Engineer Job',
        specific: 'Land a job at Google',
        measurable: 'Get an offer letter',
        time_bound: 'Within 6 months',
        target_date: '2024-12-31',
        target_value: 100,
        current_value: 0,
      };

      pool.query.mockImplementation((query, params) => {
        if (query.includes('INSERT INTO career_goals')) {
          return Promise.resolve({
            rows: [{
              id: 1,
              user_id: userId,
              ...goalData,
              progress_percent: 0,
            }],
          });
        }
        if (query.includes('INSERT INTO goal_progress_history')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .post('/api/career-goals')
        .set('Authorization', `Bearer ${user.token}`)
        .send(goalData);

      expect([200, 201]).toContain(response.status);
      expect(response.body.goal).toBeDefined();
      expect(response.body.message).toContain('created');
    });

    it('should create milestones if provided', async () => {
      const goalData = {
        title: 'Get a Software Engineer Job',
        specific: 'Land a job at Google',
        measurable: 'Get an offer letter',
        time_bound: 'Within 6 months',
        target_date: '2024-12-31',
        milestones: [
          { title: 'Complete resume', target_date: '2024-10-01' },
          { title: 'Apply to 10 companies', target_date: '2024-11-01' },
        ],
      };

      pool.query.mockImplementation((query, params) => {
        if (query.includes('INSERT INTO career_goals')) {
          return Promise.resolve({
            rows: [{
              id: 1,
              user_id: userId,
              ...goalData,
              progress_percent: 0,
            }],
          });
        }
        if (query.includes('INSERT INTO goal_milestones')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('INSERT INTO goal_progress_history')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .post('/api/career-goals')
        .set('Authorization', `Bearer ${user.token}`)
        .send(goalData);

      expect([200, 201]).toContain(response.status);
      expect(response.body.goal).toBeDefined();
    });

    it('should return 400 if required fields are missing', async () => {
      const response = await request(app)
        .post('/api/career-goals')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          title: 'Get a Job',
          // Missing required fields
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Missing required fields');
    });

    it('should calculate progress percentage correctly', async () => {
      const goalData = {
        title: 'Get a Software Engineer Job',
        specific: 'Land a job at Google',
        measurable: 'Get an offer letter',
        time_bound: 'Within 6 months',
        target_date: '2024-12-31',
        target_value: 100,
        current_value: 50,
      };

      pool.query.mockImplementation((query, params) => {
        if (query.includes('INSERT INTO career_goals')) {
          return Promise.resolve({
            rows: [{
              id: 1,
              user_id: userId,
              ...goalData,
              progress_percent: 50, // Should be calculated as (50/100) * 100 = 50
            }],
          });
        }
        if (query.includes('INSERT INTO goal_progress_history')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .post('/api/career-goals')
        .set('Authorization', `Bearer ${user.token}`)
        .send(goalData);

      expect([200, 201]).toContain(response.status);
      expect(response.body.goal.progress_percent).toBe(50);
    });
  });

  describe('PUT /api/career-goals/:id', () => {
    it('should update a career goal', async () => {
      const goalId = 1;
      const updateData = {
        title: 'Updated Goal Title',
        current_value: 75,
        target_value: 100,
      };

      pool.query.mockImplementation((query, params) => {
        if (query.includes('SELECT * FROM career_goals WHERE id = $1 AND user_id = $2')) {
          return Promise.resolve({
            rows: [{
              id: goalId,
              user_id: userId,
              title: 'Original Title',
              current_value: 50,
              target_value: 100,
              progress_percent: 50,
              status: 'active',
              start_date: '2024-01-01',
              target_date: '2024-12-31',
            }],
          });
        }
        if (query.includes('UPDATE career_goals')) {
          return Promise.resolve({
            rows: [{
              id: goalId,
              user_id: userId,
              ...updateData,
              progress_percent: 75,
            }],
          });
        }
        if (query.includes('INSERT INTO goal_progress_history')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .put(`/api/career-goals/${goalId}`)
        .set('Authorization', `Bearer ${user.token}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.goal).toBeDefined();
      expect(response.body.message).toContain('updated');
    });

    it('should create achievement when reaching 25% milestone', async () => {
      const goalId = 1;
      const updateData = {
        current_value: 25,
        target_value: 100,
      };

      pool.query.mockImplementation((query, params) => {
        if (query.includes('SELECT * FROM career_goals WHERE id = $1 AND user_id = $2')) {
          return Promise.resolve({
            rows: [{
              id: goalId,
              user_id: userId,
              current_value: 10,
              target_value: 100,
              progress_percent: 10,
              status: 'active',
              start_date: '2024-01-01',
              target_date: '2024-12-31',
            }],
          });
        }
        if (query.includes('UPDATE career_goals')) {
          return Promise.resolve({
            rows: [{
              id: goalId,
              user_id: userId,
              ...updateData,
              progress_percent: 25,
            }],
          });
        }
        if (query.includes('INSERT INTO goal_progress_history')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('INSERT INTO goal_achievements')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .put(`/api/career-goals/${goalId}`)
        .set('Authorization', `Bearer ${user.token}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.goal.progress_percent).toBe(25);
    });

    it('should return 404 if goal not found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .put('/api/career-goals/999')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ title: 'Updated Title' });

      expect(response.status).toBe(404);
    });

    it('should return 400 if no fields to update', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          user_id: userId,
        }],
      });

      const response = await request(app)
        .put('/api/career-goals/1')
        .set('Authorization', `Bearer ${user.token}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('No fields to update');
    });
  });

  describe('DELETE /api/career-goals/:id', () => {
    it('should delete a career goal', async () => {
      const goalId = 1;

      pool.query.mockResolvedValueOnce({
        rows: [{ id: goalId, user_id: userId }],
      });

      const response = await request(app)
        .delete(`/api/career-goals/${goalId}`)
        .set('Authorization', `Bearer ${user.token}`);

      expect([200, 204]).toContain(response.status);
      expect(response.body.message).toContain('deleted');
    });

    it('should return 404 if goal not found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .delete('/api/career-goals/999')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/career-goals/analytics/insights', () => {
    it('should return goal analytics and insights', async () => {
      pool.query.mockImplementation((query, params) => {
        if (query.includes('SELECT * FROM career_goals WHERE user_id')) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                user_id: userId,
                title: 'Goal 1',
                status: 'active',
                progress_percent: 50,
                category: 'career',
                target_date: '2024-12-31',
              },
              {
                id: 2,
                user_id: userId,
                title: 'Goal 2',
                status: 'completed',
                progress_percent: 100,
                category: 'career',
                target_date: '2024-11-30',
              },
            ],
          });
        }
        if (query.includes('SELECT * FROM goal_achievements WHERE user_id')) {
          return Promise.resolve({
            rows: [
              { id: 1, goal_id: 1, achievement_type: 'progress_milestone' },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/career-goals/analytics/insights')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.totalGoals).toBeDefined();
      expect(response.body.activeGoals).toBeDefined();
      expect(response.body.completedGoals).toBeDefined();
      expect(response.body.completionRate).toBeDefined();
      expect(response.body.avgProgress).toBeDefined();
      expect(response.body.insights).toBeDefined();
      expect(response.body.recommendations).toBeDefined();
    });

    it('should return empty analytics if user has no goals', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/career-goals/analytics/insights')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.totalGoals).toBe(0);
      expect(response.body.activeGoals).toBe(0);
      expect(response.body.completedGoals).toBe(0);
    });
  });
});



