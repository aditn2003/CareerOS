/**
 * Time Investment Routes - Full Coverage Tests
 * File: backend/routes/timeInvestment.js
 */

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import timeInvestmentRouter from '../../routes/timeInvestment.js';

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
  app.use('/api/time-investment', timeInvestmentRouter);
});

beforeEach(async () => {
  vi.clearAllMocks();
  const pool = (await import('../../db/pool.js')).default;
  mockQueryFn = pool.query;
});

// ============================================
// TESTS
// ============================================

describe('Time Investment Routes - Full Coverage', () => {
  describe('GET /api/time-investment', () => {
    it('should return time investment analysis', async () => {
      const mockJobs = [
        { id: 1, title: 'Engineer', company: 'TechCorp', status: 'Applied', applied_on: '2024-01-01' },
      ];
      const mockApplicationHistory = [
        { id: 1, job_id: 1, event: 'Status changed', timestamp: '2024-01-01', from_status: null, to_status: 'Applied' },
      ];
      const mockNetworkingActivities = [
        { id: 1, activity_type: 'LinkedIn', time_spent_minutes: 30, created_at: '2024-01-01' },
      ];
      const mockNetworkingEvents = [
        { id: 1, event_name: 'Meetup', event_date: '2024-01-01', event_start_time: '10:00', event_end_time: '12:00' },
      ];

      mockQueryFn
        .mockResolvedValueOnce({ rows: mockJobs }) // Jobs
        .mockResolvedValueOnce({ rows: mockApplicationHistory }) // Application history
        .mockResolvedValueOnce({ rows: mockNetworkingActivities }) // Networking activities
        .mockResolvedValueOnce({ rows: mockNetworkingEvents }); // Networking events

      const res = await request(app)
        .get('/api/time-investment')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.analysis).toBeDefined();
    });

    it('should handle missing application history table', async () => {
      const mockJobs = [
        { id: 1, title: 'Engineer', company: 'TechCorp', status: 'Applied' },
      ];

      mockQueryFn
        .mockResolvedValueOnce({ rows: mockJobs })
        .mockRejectedValueOnce(new Error('Table does not exist')) // Application history
        .mockResolvedValueOnce({ rows: [] }) // Networking activities
        .mockResolvedValueOnce({ rows: [] }); // Networking events

      const res = await request(app)
        .get('/api/time-investment')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .get('/api/time-investment')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
    });
  });

  describe('POST /api/time-investment/activities', () => {
    it('should create time investment activity', async () => {
      const mockActivity = { id: 1, activity_type: 'Application', time_spent_minutes: 60, created_at: '2024-01-01' };

      mockQueryFn.mockResolvedValueOnce({ rows: [mockActivity], rowCount: 1 });

      const res = await request(app)
        .post('/api/time-investment/activities')
        .set('Authorization', 'Bearer valid-token')
        .send({
          activity_type: 'Application',
          time_spent_minutes: 60,
        });

      expect(res.status).toBe(201);
      expect(res.body.activity).toBeDefined();
    });

    it('should return 400 for invalid data', async () => {
      const res = await request(app)
        .post('/api/time-investment/activities')
        .set('Authorization', 'Bearer valid-token')
        .send({
          activity_type: '', // Invalid
        });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/time-investment/activities', () => {
    it('should return all activities', async () => {
      const mockActivities = [
        { id: 1, activity_type: 'Application', time_spent_minutes: 60 },
        { id: 2, activity_type: 'Networking', time_spent_minutes: 30 },
      ];

      mockQueryFn.mockResolvedValueOnce({ rows: mockActivities });

      const res = await request(app)
        .get('/api/time-investment/activities')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.activities).toBeDefined();
      expect(res.body.activities).toHaveLength(2);
    });
  });

  describe('PUT /api/time-investment/activities/:id', () => {
    it('should update activity', async () => {
      const mockActivity = { id: 1, activity_type: 'Application', time_spent_minutes: 90 };

      mockQueryFn
        .mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 }) // Check exists
        .mockResolvedValueOnce({ rows: [mockActivity], rowCount: 1 }); // Update

      const res = await request(app)
        .put('/api/time-investment/activities/1')
        .set('Authorization', 'Bearer valid-token')
        .send({
          time_spent_minutes: 90,
        });

      expect(res.status).toBe(200);
      expect(res.body.activity).toBeDefined();
    });

    it('should return 404 if activity not found', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = await request(app)
        .put('/api/time-investment/activities/999')
        .set('Authorization', 'Bearer valid-token')
        .send({
          time_spent_minutes: 90,
        });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/time-investment/activities/:id', () => {
    it('should delete activity', async () => {
      mockQueryFn
        .mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 }) // Check exists
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // Delete

      const res = await request(app)
        .delete('/api/time-investment/activities/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('deleted');
    });
  });

  describe('GET /api/time-investment/activity-types', () => {
    it('should return activity types', async () => {
      const res = await request(app)
        .get('/api/time-investment/activity-types')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.types).toBeDefined();
      expect(Array.isArray(res.body.types)).toBe(true);
    });
  });
});

