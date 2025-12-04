/**
 * Team Routes - Full Coverage Tests
 * File: backend/routes/team.js
 */

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import teamRouter from '../../routes/team.js';

// ============================================
// MOCKS
// ============================================

vi.mock('../../db/pool.js', () => ({
  default: {
    query: vi.fn(),
  },
}));

vi.mock('../../auth.js', () => ({
  auth: vi.fn((req, res, next) => {
    const h = req.headers.authorization || "";
    const token = h.startsWith("Bearer ") ? h.split(" ")[1]?.trim() : null;
    if (!token) {
      return res.status(401).json({ error: "NO_TOKEN" });
    }
    req.user = { id: 1 };
    next();
  }),
}));

// ============================================
// SETUP
// ============================================

let app;
let mockQueryFn;

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret';
  
  app = express();
  app.use(express.json());
  app.use('/api/team', teamRouter);
});

beforeEach(async () => {
  vi.clearAllMocks();
  const pool = (await import('../../db/pool.js')).default;
  mockQueryFn = pool.query;
});

// ============================================
// TESTS
// ============================================

describe('Team Routes - Full Coverage', () => {
  describe('GET /api/team/me', () => {
    it('should return user teams and role', async () => {
      const mockUser = { account_type: 'candidate' };
      const mockTeams = [
        { id: 1, name: 'Team 1', ownerId: 1, role: 'member', status: 'active' },
      ];

      mockQueryFn
        .mockResolvedValueOnce({ rows: [mockUser] }) // User account type
        .mockResolvedValueOnce({ rows: mockTeams }); // Teams

      const res = await request(app)
        .get('/api/team/me')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.teams).toBeDefined();
      expect(res.body.accountType).toBe('candidate');
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .get('/api/team/me')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
    });
  });

  describe('GET /api/team/mentor/all', () => {
    it('should return all teams for mentor', async () => {
      const mockTeams = [
        { id: 1, name: 'Team 1', owner_id: 1 },
      ];

      mockQueryFn
        .mockResolvedValueOnce({ rows: [{ account_type: 'mentor' }] }) // Account type check
        .mockResolvedValueOnce({ rows: mockTeams }); // Teams

      const res = await request(app)
        .get('/api/team/mentor/all')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.teams).toBeDefined();
    });

    it('should return 403 if not mentor', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [{ account_type: 'candidate' }] });

      const res = await request(app)
        .get('/api/team/mentor/all')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/team/admin/all', () => {
    it('should return all teams for admin', async () => {
      const mockTeams = [
        { id: 1, name: 'Team 1', owner_id: 1 },
      ];

      mockQueryFn
        .mockResolvedValueOnce({ rows: [{ account_type: 'admin' }] }) // Account type check
        .mockResolvedValueOnce({ rows: mockTeams }); // Teams

      const res = await request(app)
        .get('/api/team/admin/all')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.teams).toBeDefined();
    });
  });

  describe('POST /api/team/create', () => {
    it('should create a new team', async () => {
      const mockTeam = { id: 1, name: 'New Team', owner_id: 1 };

      mockQueryFn
        .mockResolvedValueOnce({ rows: [{ account_type: 'candidate' }] }) // Account type check
        .mockResolvedValueOnce({ rows: [mockTeam], rowCount: 1 }) // Create team
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // Add owner as member

      const res = await request(app)
        .post('/api/team/create')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'New Team',
        });

      expect(res.status).toBe(201);
      expect(res.body.team).toBeDefined();
    });

    it('should return 400 for missing name', async () => {
      const res = await request(app)
        .post('/api/team/create')
        .set('Authorization', 'Bearer valid-token')
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/team/mentor/create', () => {
    it('should create team as mentor', async () => {
      const mockTeam = { id: 1, name: 'Mentor Team', owner_id: 1 };

      mockQueryFn
        .mockResolvedValueOnce({ rows: [{ account_type: 'mentor' }] }) // Account type check
        .mockResolvedValueOnce({ rows: [mockTeam], rowCount: 1 }) // Create team
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // Add owner as member

      const res = await request(app)
        .post('/api/team/mentor/create')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'Mentor Team',
        });

      expect(res.status).toBe(201);
    });
  });

  describe('DELETE /api/team/:teamId', () => {
    it('should delete team if owner', async () => {
      mockQueryFn
        .mockResolvedValueOnce({ rows: [{ owner_id: 1 }] }) // Check ownership
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // Delete team

      const res = await request(app)
        .delete('/api/team/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });

    it('should return 403 if not owner', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [{ owner_id: 2 }] }); // Different owner

      const res = await request(app)
        .delete('/api/team/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/team/:teamId/members', () => {
    it('should get team members', async () => {
      const mockMembers = [
        { id: 1, user_id: 1, role: 'member', status: 'active' },
      ];

      mockQueryFn
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // Check team exists
        .mockResolvedValueOnce({ rows: mockMembers }); // Get members

      const res = await request(app)
        .get('/api/team/1/members')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.members).toBeDefined();
    });
  });

  describe('POST /api/team/:teamId/invite', () => {
    it('should invite user to team', async () => {
      mockQueryFn
        .mockResolvedValueOnce({ rows: [{ owner_id: 1 }] }) // Check ownership
        .mockResolvedValueOnce({ rows: [{ id: 2 }] }) // Check user exists
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // Create invitation

      const res = await request(app)
        .post('/api/team/1/invite')
        .set('Authorization', 'Bearer valid-token')
        .send({
          email: 'user@example.com',
        });

      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/team/search', () => {
    it('should search teams', async () => {
      const mockTeams = [
        { id: 1, name: 'Team 1' },
      ];

      mockQueryFn.mockResolvedValueOnce({ rows: mockTeams });

      const res = await request(app)
        .get('/api/team/search?q=Team')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.teams).toBeDefined();
    });
  });

  describe('POST /api/team/:teamId/request-join', () => {
    it('should request to join team', async () => {
      mockQueryFn
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // Check team exists
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // Create request

      const res = await request(app)
        .post('/api/team/1/request-join')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/team/:teamId/pending-requests', () => {
    it('should get pending join requests', async () => {
      const mockRequests = [
        { id: 1, user_id: 2, status: 'pending' },
      ];

      mockQueryFn
        .mockResolvedValueOnce({ rows: [{ owner_id: 1 }] }) // Check ownership
        .mockResolvedValueOnce({ rows: mockRequests }); // Get requests

      const res = await request(app)
        .get('/api/team/1/pending-requests')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.requests).toBeDefined();
    });
  });

  describe('POST /api/team/:teamId/requests/:memberId/approve', () => {
    it('should approve join request', async () => {
      mockQueryFn
        .mockResolvedValueOnce({ rows: [{ owner_id: 1 }] }) // Check ownership
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // Check request exists
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // Update request
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // Add member

      const res = await request(app)
        .post('/api/team/1/requests/2/approve')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/team/:teamId/requests/:memberId/reject', () => {
    it('should reject join request', async () => {
      mockQueryFn
        .mockResolvedValueOnce({ rows: [{ owner_id: 1 }] }) // Check ownership
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // Update request

      const res = await request(app)
        .post('/api/team/1/requests/2/reject')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/team/:teamId/leave', () => {
    it('should leave team', async () => {
      mockQueryFn
        .mockResolvedValueOnce({ rows: [{ owner_id: 2 }] }) // Check not owner
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // Remove member

      const res = await request(app)
        .post('/api/team/1/leave')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });

    it('should return 403 if trying to leave as owner', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [{ owner_id: 1 }] }); // Is owner

      const res = await request(app)
        .post('/api/team/1/leave')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/team/:teamId/members/:memberId/profile', () => {
    it('should get member profile', async () => {
      const mockProfile = { id: 2, first_name: 'John', last_name: 'Doe' };

      mockQueryFn
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // Check team exists
        .mockResolvedValueOnce({ rows: [{ user_id: 2 }] }) // Check member
        .mockResolvedValueOnce({ rows: [mockProfile] }); // Get profile

      const res = await request(app)
        .get('/api/team/1/members/2/profile')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.profile).toBeDefined();
    });
  });

  describe('GET /api/team/:teamId/feedback', () => {
    it('should get team feedback', async () => {
      const mockFeedback = [
        { id: 1, content: 'Great work!', created_at: '2024-01-01' },
      ];

      mockQueryFn
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // Check team exists
        .mockResolvedValueOnce({ rows: mockFeedback }); // Get feedback

      const res = await request(app)
        .get('/api/team/1/feedback')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.feedback).toBeDefined();
    });
  });

  describe('POST /api/team/:teamId/feedback', () => {
    it('should create feedback', async () => {
      const mockFeedback = { id: 1, content: 'Great work!', user_id: 1 };

      mockQueryFn
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // Check team exists
        .mockResolvedValueOnce({ rows: [mockFeedback], rowCount: 1 }); // Create feedback

      const res = await request(app)
        .post('/api/team/1/feedback')
        .set('Authorization', 'Bearer valid-token')
        .send({
          content: 'Great work!',
        });

      expect(res.status).toBe(201);
      expect(res.body.feedback).toBeDefined();
    });
  });

  describe('DELETE /api/team/:teamId/feedback/:feedbackId', () => {
    it('should delete feedback', async () => {
      mockQueryFn
        .mockResolvedValueOnce({ rows: [{ id: 1, user_id: 1 }] }) // Check feedback exists and owner
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // Delete feedback

      const res = await request(app)
        .delete('/api/team/1/feedback/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/team/:teamId/feedback/:feedbackId/replies', () => {
    it('should get feedback replies', async () => {
      const mockReplies = [
        { id: 1, content: 'Reply 1', feedback_id: 1 },
      ];

      mockQueryFn
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // Check feedback exists
        .mockResolvedValueOnce({ rows: mockReplies }); // Get replies

      const res = await request(app)
        .get('/api/team/1/feedback/1/replies')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.replies).toBeDefined();
    });
  });

  describe('POST /api/team/:teamId/feedback/:feedbackId/replies', () => {
    it('should create feedback reply', async () => {
      const mockReply = { id: 1, content: 'Reply', feedback_id: 1 };

      mockQueryFn
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // Check feedback exists
        .mockResolvedValueOnce({ rows: [mockReply], rowCount: 1 }); // Create reply

      const res = await request(app)
        .post('/api/team/1/feedback/1/replies')
        .set('Authorization', 'Bearer valid-token')
        .send({
          content: 'Reply',
        });

      expect(res.status).toBe(201);
      expect(res.body.reply).toBeDefined();
    });
  });

  describe('GET /api/team/:teamId/tasks', () => {
    it('should get team tasks', async () => {
      const mockTasks = [
        { id: 1, title: 'Task 1', status: 'pending' },
      ];

      mockQueryFn
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // Check team exists
        .mockResolvedValueOnce({ rows: mockTasks }); // Get tasks

      const res = await request(app)
        .get('/api/team/1/tasks')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.tasks).toBeDefined();
    });
  });

  describe('POST /api/team/:teamId/tasks', () => {
    it('should create team task', async () => {
      const mockTask = { id: 1, title: 'New Task', team_id: 1 };

      mockQueryFn
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // Check team exists
        .mockResolvedValueOnce({ rows: [mockTask], rowCount: 1 }); // Create task

      const res = await request(app)
        .post('/api/team/1/tasks')
        .set('Authorization', 'Bearer valid-token')
        .send({
          title: 'New Task',
          description: 'Task description',
        });

      expect(res.status).toBe(201);
      expect(res.body.task).toBeDefined();
    });
  });

  describe('DELETE /api/team/:teamId/tasks/:taskId', () => {
    it('should delete task', async () => {
      mockQueryFn
        .mockResolvedValueOnce({ rows: [{ id: 1, created_by: 1 }] }) // Check task exists and creator
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // Delete task

      const res = await request(app)
        .delete('/api/team/1/tasks/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/team/:teamId/activity', () => {
    it('should get team activity', async () => {
      const mockActivity = [
        { id: 1, event_type: 'task_created', created_at: '2024-01-01' },
      ];

      mockQueryFn
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // Check team exists
        .mockResolvedValueOnce({ rows: mockActivity }); // Get activity

      const res = await request(app)
        .get('/api/team/1/activity')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.activity).toBeDefined();
    });
  });

  describe('POST /api/team/:teamId/shared-jobs', () => {
    it('should share job with team', async () => {
      const mockSharedJob = { id: 1, job_id: 1, team_id: 1 };

      mockQueryFn
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // Check team exists
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // Check job exists
        .mockResolvedValueOnce({ rows: [mockSharedJob], rowCount: 1 }); // Share job

      const res = await request(app)
        .post('/api/team/1/shared-jobs')
        .set('Authorization', 'Bearer valid-token')
        .send({
          job_id: 1,
        });

      expect(res.status).toBe(201);
      expect(res.body.sharedJob).toBeDefined();
    });
  });

  describe('GET /api/team/:teamId/shared-jobs', () => {
    it('should get shared jobs', async () => {
      const mockSharedJobs = [
        { id: 1, job_id: 1, team_id: 1 },
      ];

      mockQueryFn
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // Check team exists
        .mockResolvedValueOnce({ rows: mockSharedJobs }); // Get shared jobs

      const res = await request(app)
        .get('/api/team/1/shared-jobs')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.sharedJobs).toBeDefined();
    });
  });

  describe('GET /api/team/:teamId/shared-jobs/progress', () => {
    it('should get shared jobs progress', async () => {
      const mockProgress = {
        total: 10,
        applied: 5,
        interviews: 2,
        offers: 1,
      };

      mockQueryFn
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // Check team exists
        .mockResolvedValueOnce({ rows: [{ count: 10 }] }) // Total jobs
        .mockResolvedValueOnce({ rows: [{ count: 5 }] }) // Applied
        .mockResolvedValueOnce({ rows: [{ count: 2 }] }) // Interviews
        .mockResolvedValueOnce({ rows: [{ count: 1 }] }); // Offers

      const res = await request(app)
        .get('/api/team/1/shared-jobs/progress')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.progress).toBeDefined();
    });
  });

  describe('GET /api/team/:teamId/analytics/milestones', () => {
    it('should get team milestones', async () => {
      const mockMilestones = [
        { id: 1, milestone: 'First interview', achieved_at: '2024-01-01' },
      ];

      mockQueryFn
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // Check team exists
        .mockResolvedValueOnce({ rows: mockMilestones }); // Get milestones

      const res = await request(app)
        .get('/api/team/1/analytics/milestones')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.milestones).toBeDefined();
    });
  });

  describe('GET /api/team/:teamId/analytics/performance', () => {
    it('should get team performance analytics', async () => {
      const mockJobs = [
        { id: 1, status: 'Applied' },
        { id: 2, status: 'Interview' },
      ];

      mockQueryFn
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // Check team exists
        .mockResolvedValueOnce({ rows: mockJobs }); // Get jobs

      const res = await request(app)
        .get('/api/team/1/analytics/performance')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.analytics).toBeDefined();
    });
  });

  describe('GET /api/team/:teamId/analytics/patterns', () => {
    it('should get team success patterns', async () => {
      const mockJobs = [
        { id: 1, status: 'Offer', company: 'TechCorp' },
      ];

      mockQueryFn
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // Check team exists
        .mockResolvedValueOnce({ rows: mockJobs }); // Get jobs

      const res = await request(app)
        .get('/api/team/1/analytics/patterns')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.patterns).toBeDefined();
    });
  });
});

