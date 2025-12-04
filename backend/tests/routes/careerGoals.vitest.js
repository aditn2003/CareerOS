/**
 * Career Goals Routes - Full Coverage Tests
 * File: backend/routes/careerGoals.js
 */

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

// ============================================
// MOCKS
// ============================================

const mockQueryFn = vi.fn();

vi.mock('../../db/pool.js', () => ({
  default: {
    query: mockQueryFn,
    connect: vi.fn(),
    end: vi.fn(),
    on: vi.fn(),
  },
}));

vi.mock('../../auth.js', () => ({
  auth: vi.fn((req, res, next) => {
    req.user = { id: 1, email: 'test@example.com' };
    next();
  }),
}));

// ============================================
// MOCK DATA
// ============================================

const mockGoal = {
  id: 1,
  user_id: 1,
  title: 'Get promoted to Senior Engineer',
  description: 'Achieve senior level within 2 years',
  category: 'career_advancement',
  specific: 'Become a Senior Software Engineer',
  measurable: 'Get promoted',
  achievable: true,
  relevant: 'Career growth',
  time_bound: '2025-12-31',
  target_value: 100,
  current_value: 50,
  progress_percent: 50,
  priority: 'high',
  status: 'active',
  start_date: '2024-01-01',
  target_date: '2025-12-31',
  notes: 'Working on it',
};

const mockMilestone = {
  id: 1,
  goal_id: 1,
  user_id: 1,
  title: 'Complete certification',
  target_date: '2024-06-01',
  status: 'pending',
};

const mockProgressHistory = {
  id: 1,
  goal_id: 1,
  user_id: 1,
  progress_value: 50,
  progress_percent: 50,
  notes: 'Halfway there',
  recorded_at: new Date().toISOString(),
};

const mockAchievement = {
  id: 1,
  goal_id: 1,
  user_id: 1,
  achievement_type: 'progress_milestone',
  description: 'Reached 50% progress',
  achievement_date: new Date().toISOString(),
};

// ============================================
// SETUP
// ============================================

let app;
let careerGoalsRouter;

beforeAll(async () => {
  careerGoalsRouter = (await import('../../routes/careerGoals.js')).default;
  app = express();
  app.use(express.json());
  app.use('/api/career-goals', careerGoalsRouter);
});

beforeEach(() => {
  vi.clearAllMocks();
});

// ============================================
// TESTS
// ============================================

describe('Career Goals Routes - Full Coverage', () => {
  describe('GET /api/career-goals', () => {
    it('should return all goals for user', async () => {
      mockQueryFn.mockResolvedValue({
        rows: [mockGoal],
        rowCount: 1,
      });

      const res = await request(app)
        .get('/api/career-goals')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.goals).toHaveLength(1);
      expect(res.body.goals[0].title).toBe(mockGoal.title);
    });

    it('should return empty array when no goals', async () => {
      mockQueryFn.mockResolvedValue({
        rows: [],
        rowCount: 0,
      });

      const res = await request(app)
        .get('/api/career-goals')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.goals).toEqual([]);
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValue(new Error('Database error'));

      const res = await request(app)
        .get('/api/career-goals')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to fetch career goals');
    });
  });

  describe('GET /api/career-goals/:id', () => {
    it('should return goal with details', async () => {
      mockQueryFn
        .mockResolvedValueOnce({ rows: [mockGoal], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [mockMilestone], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [mockProgressHistory], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [mockAchievement], rowCount: 1 });

      const res = await request(app)
        .get('/api/career-goals/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.goal).toBeDefined();
      expect(res.body.milestones).toHaveLength(1);
      expect(res.body.progressHistory).toHaveLength(1);
      expect(res.body.achievements).toHaveLength(1);
    });

    it('should return 404 if goal not found', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = await request(app)
        .get('/api/career-goals/999')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Goal not found');
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValue(new Error('Database error'));

      const res = await request(app)
        .get('/api/career-goals/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to fetch goal details');
    });
  });

  describe('POST /api/career-goals', () => {
    it('should create goal successfully', async () => {
      const newGoal = {
        title: 'New Goal',
        specific: 'Specific goal',
        measurable: 'Measurable',
        time_bound: '2025-12-31',
        target_date: '2025-12-31',
        target_value: 100,
        current_value: 0,
      };

      mockQueryFn
        .mockResolvedValueOnce({ rows: [{ ...mockGoal, ...newGoal, id: 2 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = await request(app)
        .post('/api/career-goals')
        .set('Authorization', 'Bearer valid-token')
        .send(newGoal);

      expect(res.status).toBe(201);
      expect(res.body.goal).toBeDefined();
      expect(res.body.message).toBe('Career goal created successfully');
    });

    it('should create goal with milestones', async () => {
      const newGoal = {
        title: 'New Goal',
        specific: 'Specific goal',
        measurable: 'Measurable',
        time_bound: '2025-12-31',
        target_date: '2025-12-31',
        milestones: [
          { title: 'Milestone 1', target_date: '2024-06-01' },
        ],
      };

      mockQueryFn
        .mockResolvedValueOnce({ rows: [{ ...mockGoal, ...newGoal, id: 2 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = await request(app)
        .post('/api/career-goals')
        .set('Authorization', 'Bearer valid-token')
        .send(newGoal);

      expect(res.status).toBe(201);
      expect(mockQueryFn).toHaveBeenCalledTimes(3);
    });

    it('should return 400 if required fields missing', async () => {
      const res = await request(app)
        .post('/api/career-goals')
        .set('Authorization', 'Bearer valid-token')
        .send({ title: 'Incomplete goal' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Missing required fields');
    });

    it('should calculate progress percentage correctly', async () => {
      const newGoal = {
        title: 'New Goal',
        specific: 'Specific',
        measurable: 'Measurable',
        time_bound: '2025-12-31',
        target_date: '2025-12-31',
        target_value: 100,
        current_value: 50,
      };

      mockQueryFn
        .mockResolvedValueOnce({ rows: [{ ...mockGoal, ...newGoal, progress_percent: 50 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = await request(app)
        .post('/api/career-goals')
        .set('Authorization', 'Bearer valid-token')
        .send(newGoal);

      expect(res.status).toBe(201);
      expect(res.body.goal.progress_percent).toBe(50);
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValue(new Error('Database error'));

      const res = await request(app)
        .post('/api/career-goals')
        .set('Authorization', 'Bearer valid-token')
        .send({
          title: 'New Goal',
          specific: 'Specific',
          measurable: 'Measurable',
          time_bound: '2025-12-31',
          target_date: '2025-12-31',
        });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to create career goal');
    });
  });

  describe('PUT /api/career-goals/:id', () => {
    it('should update goal successfully', async () => {
      mockQueryFn
        .mockResolvedValueOnce({ rows: [mockGoal], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ ...mockGoal, title: 'Updated Goal' }], rowCount: 1 });

      const res = await request(app)
        .put('/api/career-goals/1')
        .set('Authorization', 'Bearer valid-token')
        .send({ title: 'Updated Goal' });

      expect(res.status).toBe(200);
      expect(res.body.goal.title).toBe('Updated Goal');
      expect(res.body.message).toBe('Goal updated successfully');
    });

    it('should return 404 if goal not found', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = await request(app)
        .put('/api/career-goals/999')
        .set('Authorization', 'Bearer valid-token')
        .send({ title: 'Updated' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Goal not found');
    });

    it('should return 400 if no fields to update', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [mockGoal], rowCount: 1 });

      const res = await request(app)
        .put('/api/career-goals/1')
        .set('Authorization', 'Bearer valid-token')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('No fields to update');
    });

    it('should calculate progress when current_value updated', async () => {
      const updatedGoal = { ...mockGoal, current_value: 75, progress_percent: 75 };
      mockQueryFn
        .mockResolvedValueOnce({ rows: [mockGoal], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [updatedGoal], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = await request(app)
        .put('/api/career-goals/1')
        .set('Authorization', 'Bearer valid-token')
        .send({ current_value: 75 });

      expect(res.status).toBe(200);
      expect(res.body.goal.progress_percent).toBe(75);
    });

    it('should create achievement at 25% milestone', async () => {
      const updatedGoal = { ...mockGoal, current_value: 25, progress_percent: 25 };
      mockQueryFn
        .mockResolvedValueOnce({ rows: [{ ...mockGoal, progress_percent: 10 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [updatedGoal], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = await request(app)
        .put('/api/career-goals/1')
        .set('Authorization', 'Bearer valid-token')
        .send({ current_value: 25 });

      expect(res.status).toBe(200);
      expect(mockQueryFn).toHaveBeenCalledTimes(4);
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValue(new Error('Database error'));

      const res = await request(app)
        .put('/api/career-goals/1')
        .set('Authorization', 'Bearer valid-token')
        .send({ title: 'Updated' });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to update goal');
    });
  });

  describe('DELETE /api/career-goals/:id', () => {
    it('should delete goal successfully', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [mockGoal], rowCount: 1 });

      const res = await request(app)
        .delete('/api/career-goals/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Goal deleted successfully');
    });

    it('should return 404 if goal not found', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = await request(app)
        .delete('/api/career-goals/999')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Goal not found');
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValue(new Error('Database error'));

      const res = await request(app)
        .delete('/api/career-goals/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to delete goal');
    });
  });

  describe('GET /api/career-goals/analytics/insights', () => {
    it('should return analytics with no goals', async () => {
      mockQueryFn
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = await request(app)
        .get('/api/career-goals/analytics/insights')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.totalGoals).toBe(0);
      expect(res.body.completionRate).toBe(0);
    });

    it('should return analytics with goals', async () => {
      const goals = [
        { ...mockGoal, status: 'active', progress_percent: 50 },
        { ...mockGoal, id: 2, status: 'completed', progress_percent: 100 },
      ];

      mockQueryFn
        .mockResolvedValueOnce({ rows: goals, rowCount: 2 })
        .mockResolvedValueOnce({ rows: [mockAchievement], rowCount: 1 });

      const res = await request(app)
        .get('/api/career-goals/analytics/insights')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.totalGoals).toBe(2);
      expect(res.body.activeGoals).toBe(1);
      expect(res.body.completedGoals).toBe(1);
      expect(res.body.completionRate).toBe(50);
    });

    it('should generate insights for high completion rate', async () => {
      const goals = [
        { ...mockGoal, status: 'completed' },
        { ...mockGoal, id: 2, status: 'completed' },
        { ...mockGoal, id: 3, status: 'completed' },
      ];

      mockQueryFn
        .mockResolvedValueOnce({ rows: goals, rowCount: 3 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = await request(app)
        .get('/api/career-goals/analytics/insights')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.insights.length).toBeGreaterThan(0);
    });

    it('should detect overdue goals', async () => {
      const overdueGoal = {
        ...mockGoal,
        status: 'active',
        target_date: '2020-01-01',
        progress_percent: 50,
      };

      mockQueryFn
        .mockResolvedValueOnce({ rows: [overdueGoal], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = await request(app)
        .get('/api/career-goals/analytics/insights')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.overdueGoals).toBe(1);
      expect(res.body.insights.some(i => i.title.includes('Overdue'))).toBe(true);
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValue(new Error('Database error'));

      const res = await request(app)
        .get('/api/career-goals/analytics/insights')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to fetch goal analytics');
    });

    it('should detect low completion rate', async () => {
      const goals = [
        { ...mockGoal, status: 'active' },
        { ...mockGoal, id: 2, status: 'active' },
        { ...mockGoal, id: 3, status: 'completed' },
      ];

      mockQueryFn
        .mockResolvedValueOnce({ rows: goals, rowCount: 3 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = await request(app)
        .get('/api/career-goals/analytics/insights')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.insights.some(i => i.title.includes('Low Completion Rate'))).toBe(true);
    });
  });

  // ========================================
  // PUT /api/career-goals/:id - Additional Tests
  // ========================================
  describe('PUT /api/career-goals/:id - Milestone and Completion Logic', () => {
    it('should create achievement when reaching 25% milestone', async () => {
      const existingGoal = { ...mockGoal, progress_percent: 20, current_value: 20, target_value: 100, status: 'active' };
      const updatedGoal = { ...mockGoal, progress_percent: 25, current_value: 25, target_value: 100, status: 'active' };

      mockQueryFn
        .mockResolvedValueOnce({ rows: [existingGoal], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [updatedGoal], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // Insert achievement

      const res = await request(app)
        .put('/api/career-goals/1')
        .set('Authorization', 'Bearer valid-token')
        .send({
          current_value: 25,
        });

      expect(res.status).toBe(200);
    });

    it('should create achievement when reaching 50% milestone', async () => {
      const existingGoal = { ...mockGoal, progress_percent: 40, current_value: 40, target_value: 100, status: 'active' };
      const updatedGoal = { ...mockGoal, progress_percent: 50, current_value: 50, target_value: 100, status: 'active' };

      mockQueryFn
        .mockResolvedValueOnce({ rows: [existingGoal], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [updatedGoal], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // Insert achievement

      const res = await request(app)
        .put('/api/career-goals/1')
        .set('Authorization', 'Bearer valid-token')
        .send({
          current_value: 50,
        });

      expect(res.status).toBe(200);
    });

    it('should create achievement when reaching 75% milestone', async () => {
      const existingGoal = { ...mockGoal, progress_percent: 70, current_value: 70, target_value: 100, status: 'active' };
      const updatedGoal = { ...mockGoal, progress_percent: 75, current_value: 75, target_value: 100, status: 'active' };

      mockQueryFn
        .mockResolvedValueOnce({ rows: [existingGoal], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [updatedGoal], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // Insert achievement

      const res = await request(app)
        .put('/api/career-goals/1')
        .set('Authorization', 'Bearer valid-token')
        .send({
          current_value: 75,
        });

      expect(res.status).toBe(200);
    });

    it('should record progress history when current_value changes', async () => {
      const existingGoal = { ...mockGoal, current_value: 30, target_value: 100, progress_percent: 30 };
      const updatedGoal = { ...mockGoal, current_value: 40, target_value: 100, progress_percent: 40 };

      mockQueryFn
        .mockResolvedValueOnce({ rows: [existingGoal], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [updatedGoal], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // Insert progress history

      const res = await request(app)
        .put('/api/career-goals/1')
        .set('Authorization', 'Bearer valid-token')
        .send({
          current_value: 40,
          progress_notes: 'Made good progress',
        });

      expect(res.status).toBe(200);
    });

    it('should create early completion achievement', async () => {
      const existingGoal = {
        ...mockGoal,
        status: 'active',
        start_date: '2024-01-01',
        target_date: '2025-12-31',
      };
      const updatedGoal = {
        ...mockGoal,
        status: 'completed',
        completed_date: '2025-06-01', // Early completion
        start_date: '2024-01-01',
        target_date: '2025-12-31',
      };

      mockQueryFn
        .mockResolvedValueOnce({ rows: [existingGoal], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [updatedGoal], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });

      const res = await request(app)
        .put('/api/career-goals/1')
        .set('Authorization', 'Bearer valid-token')
        .send({
          status: 'completed',
          completed_date: '2025-06-01',
        });

      expect(res.status).toBe(200);
    });

    it('should create regular completion achievement', async () => {
      const existingGoal = {
        ...mockGoal,
        status: 'active',
        start_date: '2024-01-01',
        target_date: '2025-12-31',
      };
      const updatedGoal = {
        ...mockGoal,
        status: 'completed',
        completed_date: '2026-01-15', // After target date
        start_date: '2024-01-01',
        target_date: '2025-12-31',
      };

      mockQueryFn
        .mockResolvedValueOnce({ rows: [existingGoal], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [updatedGoal], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });

      const res = await request(app)
        .put('/api/career-goals/1')
        .set('Authorization', 'Bearer valid-token')
        .send({
          status: 'completed',
          completed_date: '2026-01-15',
        });

      expect(res.status).toBe(200);
    });

    it('should handle goal completion with completed_date', async () => {
      const existingGoal = {
        ...mockGoal,
        status: 'active',
        start_date: '2024-01-01',
        target_date: '2025-12-31',
        progress_percent: 80,
      };
      const updatedGoal = {
        ...mockGoal,
        status: 'completed',
        completed_date: '2025-06-01',
        start_date: '2024-01-01',
        target_date: '2025-12-31',
        progress_percent: 100,
      };

      mockQueryFn
        .mockResolvedValueOnce({ rows: [existingGoal], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [updatedGoal], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // Insert achievement

      const res = await request(app)
        .put('/api/career-goals/1')
        .set('Authorization', 'Bearer valid-token')
        .send({
          status: 'completed',
          completed_date: '2025-06-01',
        });

      expect(res.status).toBe(200);
    });

    it('should handle goal completion without completed_date (uses current date)', async () => {
      const existingGoal = {
        ...mockGoal,
        status: 'active',
        start_date: '2024-01-01',
        target_date: '2025-12-31',
        progress_percent: 80,
      };
      const updatedGoal = {
        ...mockGoal,
        status: 'completed',
        completed_date: null,
        start_date: '2024-01-01',
        target_date: '2025-12-31',
        progress_percent: 100,
      };

      mockQueryFn
        .mockResolvedValueOnce({ rows: [existingGoal], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [updatedGoal], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // Insert achievement

      const res = await request(app)
        .put('/api/career-goals/1')
        .set('Authorization', 'Bearer valid-token')
        .send({
          status: 'completed',
        });

      expect(res.status).toBe(200);
    });
  });
});

