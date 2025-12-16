/**
 * Team Routes Tests
 * Tests routes/team.js - team management, members, shared jobs, tasks, feedback, analytics
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import teamRoutes from '../../routes/team.js';
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
    connect: vi.fn(),
  },
}));

describe('Team Routes', () => {
  let app;
  let user;
  let userId;

  beforeEach(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';
    
    app = express();
    app.use(express.json());
    app.use('/api/team', teamRoutes);
    
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

  describe('GET /api/team/me', () => {
    it('should get user teams and role info', async () => {
      pool.query.mockImplementation((query, params) => {
        if (query.includes('SELECT account_type FROM users')) {
          return Promise.resolve({ rows: [{ account_type: 'candidate' }] });
        }
        if (query.includes('FROM team_members tm')) {
          return Promise.resolve({
            rows: [{
              id: 1,
              name: 'Test Team',
              ownerId: userId,
              createdAt: new Date(),
              role: 'candidate',
              status: 'active',
              userId: userId,
            }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/team/me')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.teams).toBeDefined();
      expect(response.body.accountType).toBeDefined();
    });
  });

  describe('POST /api/team/create', () => {
    it('should create a new team', async () => {
      const mockClient = {
        query: vi.fn(),
        release: vi.fn(),
      };
      
      pool.connect.mockResolvedValue(mockClient);
      
      mockClient.query.mockImplementation((query, params) => {
        if (query.includes('SELECT account_type FROM users')) {
          return Promise.resolve({ rows: [{ account_type: 'candidate' }] });
        }
        if (query.includes('SELECT COUNT(*) as count FROM team_members')) {
          return Promise.resolve({ rows: [{ count: '0' }] });
        }
        if (query === 'BEGIN') {
          return Promise.resolve();
        }
        if (query.includes('INSERT INTO teams')) {
          return Promise.resolve({
            rows: [{
              id: 1,
              name: 'New Team',
              ownerId: userId,
              createdAt: new Date(),
            }],
          });
        }
        if (query.includes('INSERT INTO team_members')) {
          return Promise.resolve({ rows: [] });
        }
        if (query === 'COMMIT') {
          return Promise.resolve();
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .post('/api/team/create')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ name: 'New Team' });

      expect([200, 201]).toContain(response.status);
      expect(response.body.team).toBeDefined();
    });

    it('should return 400 if team name is missing', async () => {
      const response = await request(app)
        .post('/api/team/create')
        .set('Authorization', `Bearer ${user.token}`)
        .send({});

      expect(response.status).toBe(400);
    });

    it('should return 403 if candidate already has a team', async () => {
      pool.query.mockImplementation((query, params) => {
        if (query.includes('SELECT account_type FROM users')) {
          return Promise.resolve({ rows: [{ account_type: 'candidate' }] });
        }
        if (query.includes('SELECT COUNT(*) as count') || query.includes('COUNT(*) as count')) {
          return Promise.resolve({ rows: [{ count: '1' }] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .post('/api/team/create')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ name: 'New Team' });

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/team/:teamId/members', () => {
    it('should get team members', async () => {
      pool.query.mockImplementation((query, params) => {
        if (query.includes('SELECT role, status FROM team_members')) {
          return Promise.resolve({ rows: [{ role: 'candidate', status: 'active' }] });
        }
        if (query.includes('FROM team_members tm')) {
          return Promise.resolve({
            rows: [{
              id: userId,
              email: user.email,
              role: 'candidate',
              status: 'active',
            }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/team/1/members')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.members).toBeDefined();
    });
  });

  describe('POST /api/team/:teamId/invite', () => {
    it('should invite a member to the team', async () => {
      pool.query.mockImplementation((query, params) => {
        if (query.includes('SELECT role, status FROM team_members')) {
          return Promise.resolve({ rows: [{ role: 'mentor', status: 'active' }] });
        }
        if (query.includes('SELECT id FROM users WHERE email')) {
          return Promise.resolve({ rows: [{ id: 2 }] });
        }
        if (query.includes('SELECT id FROM team_members WHERE team_id')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('INSERT INTO team_members')) {
          return Promise.resolve({
            rows: [{
              id: 1,
              team_id: 1,
              user_id: 2,
              role: 'candidate',
              status: 'invited',
            }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .post('/api/team/1/invite')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ email: 'newmember@example.com', role: 'candidate' });

      expect([200, 201]).toContain(response.status);
    });

    it('should return 403 if user is not mentor or owner', async () => {
      pool.query.mockImplementation((query, params) => {
        // Return 'requested' status so user is not active member
        if (query.includes('SELECT role, status FROM team_members WHERE team_id=$1 AND user_id=$2')) {
          return Promise.resolve({ rows: [{ role: 'candidate', status: 'requested' }] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .post('/api/team/1/invite')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ email: 'newmember@example.com' });

      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /api/team/:teamId/members/:memberId', () => {
    it('should remove a member from the team', async () => {
      pool.query.mockImplementation((query, params) => {
        if (query.includes('SELECT owner_id FROM teams WHERE id=$1 AND owner_id=$2')) {
          return Promise.resolve({ rows: [{ owner_id: userId }] });
        }
        if (query.includes('SELECT role, status FROM team_members WHERE team_id=$1 AND user_id=$2')) {
          return Promise.resolve({ rows: [{ role: 'candidate', status: 'active' }] });
        }
        if (query.includes('DELETE FROM team_members WHERE team_id=$1 AND user_id=$2')) {
          return Promise.resolve({ rows: [{ user_id: 2 }] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .delete('/api/team/1/members/2')
        .set('Authorization', `Bearer ${user.token}`);

      expect([200, 204]).toContain(response.status);
    });
  });

  describe('POST /api/team/:teamId/shared-jobs', () => {
    it('should share a job with the team', async () => {
      pool.query.mockImplementation((query, params) => {
        if (query.includes('SELECT role, status FROM team_members WHERE team_id=$1 AND user_id=$2')) {
          return Promise.resolve({ rows: [{ role: 'mentor', status: 'active' }] });
        }
        if (query.includes('SELECT id, title, company FROM jobs WHERE id = $1 AND user_id = $2')) {
          return Promise.resolve({ rows: [{ id: 1, title: 'Test Job', company: 'Test Corp' }] });
        }
        if (query.includes('SELECT id FROM shared_jobs WHERE team_id = $1 AND job_id = $2')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('INSERT INTO shared_jobs')) {
          return Promise.resolve({
            rows: [{
              id: 1,
              team_id: 1,
              job_id: 1,
              shared_by_mentor_id: userId,
            }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .post('/api/team/1/shared-jobs')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ jobId: 1 });

      expect([200, 201]).toContain(response.status);
    });
  });

  describe('GET /api/team/:teamId/shared-jobs', () => {
    it('should get shared jobs for the team', async () => {
      pool.query.mockImplementation((query, params) => {
        if (query.includes('SELECT role, status FROM team_members')) {
          return Promise.resolve({ rows: [{ role: 'candidate', status: 'active' }] });
        }
        if (query.includes('FROM shared_jobs')) {
          return Promise.resolve({
            rows: [{
              id: 1,
              job_id: 1,
              shared_by: userId,
              job: {
                id: 1,
                title: 'Software Engineer',
                company: 'Tech Corp',
              },
            }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/team/1/shared-jobs')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.sharedJobs).toBeDefined();
    });
  });

  describe('GET /api/team/:teamId/tasks', () => {
    it('should get tasks for the team', async () => {
      pool.query.mockImplementation((query, params) => {
        if (query.includes('SELECT role, status FROM team_members')) {
          return Promise.resolve({ rows: [{ role: 'candidate', status: 'active' }] });
        }
        if (query.includes('FROM team_tasks')) {
          return Promise.resolve({
            rows: [{
              id: 1,
              team_id: 1,
              title: 'Complete application',
              status: 'pending',
              assigned_to: userId,
            }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/team/1/tasks')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.tasks).toBeDefined();
    });
  });

  describe('POST /api/team/:teamId/tasks', () => {
    it('should create a new task', async () => {
      const candidateId = userId + 1;
      pool.query.mockImplementation((query, params) => {
        // First check: getMembership for the creator (mentor)
        if (query.includes('SELECT role, status FROM team_members WHERE team_id=$1 AND user_id=$2') && params && params[1] === userId) {
          return Promise.resolve({ rows: [{ role: 'mentor', status: 'active' }] });
        }
        // Second check: getMembership for the candidate
        if (query.includes('SELECT role, status FROM team_members WHERE team_id=$1 AND user_id=$2') && params && params[1] === candidateId) {
          return Promise.resolve({ rows: [{ role: 'candidate', status: 'active' }] });
        }
        if (query.includes('INSERT INTO tasks')) {
          return Promise.resolve({
            rows: [{
              id: 1,
              team_id: 1,
              mentor_id: userId,
              candidate_id: candidateId,
              title: 'New Task',
              description: 'Task description',
              status: 'pending',
            }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .post('/api/team/1/tasks')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          candidateId: candidateId,
          title: 'New Task',
          description: 'Task description',
        });

      expect([200, 201]).toContain(response.status);
      expect(response.body.task).toBeDefined();
    });
  });

  describe('DELETE /api/team/:teamId/tasks/:taskId', () => {
    it('should delete a task', async () => {
      pool.query.mockImplementation((query, params) => {
        if (query.includes('SELECT role, status FROM team_members WHERE team_id=$1 AND user_id=$2')) {
          return Promise.resolve({ rows: [{ role: 'mentor', status: 'active' }] });
        }
        if (query.includes('SELECT mentor_id FROM tasks WHERE id = $1 AND team_id = $2')) {
          return Promise.resolve({ rows: [{ mentor_id: userId }] });
        }
        if (query.includes('DELETE FROM tasks WHERE id = $1 AND team_id = $2')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .delete('/api/team/1/tasks/1')
        .set('Authorization', `Bearer ${user.token}`);

      expect([200, 204]).toContain(response.status);
    });
  });

  describe('GET /api/team/:teamId/feedback', () => {
    it('should get feedback for the team', async () => {
      pool.query.mockImplementation((query, params) => {
        if (query.includes('SELECT role, status FROM team_members')) {
          return Promise.resolve({ rows: [{ role: 'candidate', status: 'active' }] });
        }
        if (query.includes('FROM team_feedback')) {
          return Promise.resolve({
            rows: [{
              id: 1,
              team_id: 1,
              author_id: userId,
              content: 'Great work!',
              created_at: new Date(),
            }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/team/1/feedback')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.feedback).toBeDefined();
    });
  });

  describe('POST /api/team/:teamId/feedback', () => {
    it('should create feedback', async () => {
      const candidateId = userId + 1;
      pool.query.mockImplementation((query, params) => {
        // First check: getMembership for the creator (mentor)
        if (query.includes('SELECT role, status FROM team_members WHERE team_id=$1 AND user_id=$2') && params && params[1] === userId) {
          return Promise.resolve({ rows: [{ role: 'mentor', status: 'active' }] });
        }
        // Second check: getMembership for the candidate
        if (query.includes('SELECT role, status FROM team_members WHERE team_id=$1 AND user_id=$2') && params && params[1] === candidateId) {
          return Promise.resolve({ rows: [{ role: 'candidate', status: 'active' }] });
        }
        if (query.includes('SELECT column_name FROM information_schema.columns')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('INSERT INTO mentor_feedback')) {
          return Promise.resolve({
            rows: [{
              id: 1,
              team_id: 1,
              mentor_id: userId,
              candidate_id: candidateId,
              feedback_type: 'general',
              content: 'New feedback',
              created_at: new Date(),
            }],
          });
        }
        if (query.includes('SELECT full_name FROM profiles WHERE user_id')) {
          return Promise.resolve({ rows: [{ full_name: 'Test User' }] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .post('/api/team/1/feedback')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ 
          candidateId: candidateId,
          feedbackType: 'general',
          content: 'New feedback' 
        });

      expect([200, 201]).toContain(response.status);
      expect(response.body.id).toBeDefined();
    });
  });

  describe('GET /api/team/:teamId/analytics/performance', () => {
    it('should get team performance analytics', async () => {
      pool.query.mockImplementation((query, params) => {
        if (query.includes('SELECT role, status FROM team_members')) {
          return Promise.resolve({ rows: [{ role: 'candidate', status: 'active' }] });
        }
        if (query.includes('FROM jobs') || query.includes('FROM applications')) {
          return Promise.resolve({
            rows: [{
              total_applications: 10,
              interviews_scheduled: 5,
              offers_received: 2,
            }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/team/1/analytics/performance')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
    });
  });

  describe('GET /api/team/:teamId/analytics/milestones', () => {
    it('should get team milestones', async () => {
      pool.query.mockImplementation((query, params) => {
        if (query.includes('SELECT role, status FROM team_members')) {
          return Promise.resolve({ rows: [{ role: 'candidate', status: 'active' }] });
        }
        if (query.includes('FROM jobs') || query.includes('milestones')) {
          return Promise.resolve({
            rows: [{
              milestone: 'First Interview',
              achieved_at: new Date(),
            }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/team/1/analytics/milestones')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.milestones).toBeDefined();
    });
  });

  describe('POST /api/team/:teamId/request-join', () => {
    it('should request to join a team', async () => {
      pool.query.mockImplementation((query, params) => {
        if (query.includes('SELECT id FROM teams')) {
          return Promise.resolve({ rows: [{ id: 1 }] });
        }
        if (query.includes('SELECT COUNT(*) as count') || query.includes('COUNT(*) as count')) {
          return Promise.resolve({ rows: [{ count: '0' }] });
        }
        if (query.includes('SELECT id FROM team_members')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('INSERT INTO team_members')) {
          return Promise.resolve({
            rows: [{
              id: 1,
              team_id: 1,
              user_id: userId,
              status: 'requested',
            }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .post('/api/team/1/request-join')
        .set('Authorization', `Bearer ${user.token}`);

      expect([200, 201]).toContain(response.status);
    });
  });

  describe('POST /api/team/:teamId/leave', () => {
    it('should leave a team', async () => {
      pool.query.mockImplementation((query, params) => {
        if (query.includes('SELECT role, status FROM team_members')) {
          return Promise.resolve({ rows: [{ role: 'candidate', status: 'active' }] });
        }
        if (query.includes('DELETE FROM team_members')) {
          return Promise.resolve({ rows: [{ id: 1 }] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .post('/api/team/1/leave')
        .set('Authorization', `Bearer ${user.token}`);

      expect([200, 204]).toContain(response.status);
    });
  });
});

