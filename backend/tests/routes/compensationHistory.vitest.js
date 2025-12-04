/**
 * Compensation History Routes - Full Coverage Tests
 * File: backend/routes/compensationHistory.js
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

const mockCompensationHistory = {
  id: 1,
  user_id: 1,
  offer_id: 1,
  company: 'TechCorp',
  role_title: 'Senior Engineer',
  role_level: 'senior',
  start_date: '2024-01-01',
  end_date: null,
  base_salary_start: 150000,
  total_comp_start: 180000,
  base_salary_current: 160000,
  total_comp_current: 190000,
  promotion_date: null,
  promotion_from_level: null,
  promotion_to_level: null,
  salary_increase_percent: null,
  equity_refresher_date: null,
  equity_refresher_value: null,
  pto_days: 20,
  benefits_value: 10000,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// ============================================
// SETUP
// ============================================

let app;
let compensationHistoryRouter;

beforeAll(async () => {
  compensationHistoryRouter = (await import('../../routes/compensationHistory.js')).default;
  app = express();
  app.use(express.json());
  app.use('/api/compensation-history', compensationHistoryRouter);
});

beforeEach(() => {
  vi.clearAllMocks();
});

// ============================================
// TESTS
// ============================================

describe('Compensation History Routes - Full Coverage', () => {
  describe('GET /api/compensation-history', () => {
    it('should return all compensation history entries', async () => {
      mockQueryFn.mockResolvedValue({
        rows: [mockCompensationHistory],
        rowCount: 1,
      });

      const res = await request(app)
        .get('/api/compensation-history')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.compensationHistory).toHaveLength(1);
      expect(res.body.compensationHistory[0].company).toBe('TechCorp');
    });

    it('should return empty array when no entries', async () => {
      mockQueryFn.mockResolvedValue({
        rows: [],
        rowCount: 0,
      });

      const res = await request(app)
        .get('/api/compensation-history')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.compensationHistory).toEqual([]);
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValue(new Error('Database error'));

      const res = await request(app)
        .get('/api/compensation-history')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to fetch compensation history');
    });
  });

  describe('POST /api/compensation-history', () => {
    it('should create compensation history entry successfully', async () => {
      const newEntry = {
        company: 'NewCorp',
        role_title: 'Engineer',
        start_date: '2024-06-01',
        base_salary_start: 120000,
        total_comp_start: 140000,
      };

      mockQueryFn.mockResolvedValue({
        rows: [{ ...mockCompensationHistory, ...newEntry, id: 2 }],
        rowCount: 1,
      });

      const res = await request(app)
        .post('/api/compensation-history')
        .set('Authorization', 'Bearer valid-token')
        .send(newEntry);

      expect(res.status).toBe(201);
      expect(res.body.compensationHistory).toBeDefined();
      expect(res.body.compensationHistory.company).toBe('NewCorp');
      expect(res.body.message).toBe('Compensation history entry created successfully');
    });

    it('should use base_salary_start for current if not provided', async () => {
      const newEntry = {
        company: 'NewCorp',
        role_title: 'Engineer',
        start_date: '2024-06-01',
        base_salary_start: 120000,
        total_comp_start: 140000,
      };

      mockQueryFn.mockResolvedValue({
        rows: [{ ...mockCompensationHistory, ...newEntry, base_salary_current: 120000 }],
        rowCount: 1,
      });

      const res = await request(app)
        .post('/api/compensation-history')
        .set('Authorization', 'Bearer valid-token')
        .send(newEntry);

      expect(res.status).toBe(201);
      expect(res.body.compensationHistory.base_salary_current).toBe(120000);
    });

    it('should handle all optional fields', async () => {
      const newEntry = {
        company: 'NewCorp',
        role_title: 'Engineer',
        start_date: '2024-06-01',
        base_salary_start: 120000,
        total_comp_start: 140000,
        role_level: 'mid',
        end_date: '2025-06-01',
        promotion_date: '2024-12-01',
        promotion_from_level: 'mid',
        promotion_to_level: 'senior',
        salary_increase_percent: 10,
        equity_refresher_date: '2024-12-01',
        equity_refresher_value: 50000,
        pto_days: 25,
        benefits_value: 15000,
      };

      mockQueryFn.mockResolvedValue({
        rows: [{ ...mockCompensationHistory, ...newEntry, id: 2 }],
        rowCount: 1,
      });

      const res = await request(app)
        .post('/api/compensation-history')
        .set('Authorization', 'Bearer valid-token')
        .send(newEntry);

      expect(res.status).toBe(201);
      expect(res.body.compensationHistory.promotion_date).toBe('2024-12-01');
    });

    it('should return 400 if required fields missing', async () => {
      const res = await request(app)
        .post('/api/compensation-history')
        .set('Authorization', 'Bearer valid-token')
        .send({ company: 'NewCorp' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Missing required fields');
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValue(new Error('Database error'));

      const res = await request(app)
        .post('/api/compensation-history')
        .set('Authorization', 'Bearer valid-token')
        .send({
          company: 'NewCorp',
          role_title: 'Engineer',
          start_date: '2024-06-01',
        });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to create compensation history entry');
    });
  });

  describe('PUT /api/compensation-history/:id', () => {
    it('should update compensation history entry successfully', async () => {
      mockQueryFn
        .mockResolvedValueOnce({ rows: [mockCompensationHistory], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ ...mockCompensationHistory, base_salary_current: 170000 }], rowCount: 1 });

      const res = await request(app)
        .put('/api/compensation-history/1')
        .set('Authorization', 'Bearer valid-token')
        .send({ base_salary_current: 170000 });

      expect(res.status).toBe(200);
      expect(res.body.compensationHistory.base_salary_current).toBe(170000);
      expect(res.body.message).toBe('Compensation history entry updated successfully');
    });

    it('should return 404 if entry not found', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = await request(app)
        .put('/api/compensation-history/999')
        .set('Authorization', 'Bearer valid-token')
        .send({ base_salary_current: 170000 });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Compensation history entry not found');
    });

    it('should return 400 if no fields to update', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [mockCompensationHistory], rowCount: 1 });

      const res = await request(app)
        .put('/api/compensation-history/1')
        .set('Authorization', 'Bearer valid-token')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('No fields to update');
    });

    it('should update multiple fields', async () => {
      const updated = {
        ...mockCompensationHistory,
        base_salary_current: 170000,
        total_comp_current: 200000,
        promotion_date: '2024-12-01',
      };

      mockQueryFn
        .mockResolvedValueOnce({ rows: [mockCompensationHistory], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [updated], rowCount: 1 });

      const res = await request(app)
        .put('/api/compensation-history/1')
        .set('Authorization', 'Bearer valid-token')
        .send({
          base_salary_current: 170000,
          total_comp_current: 200000,
          promotion_date: '2024-12-01',
        });

      expect(res.status).toBe(200);
      expect(res.body.compensationHistory.base_salary_current).toBe(170000);
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValue(new Error('Database error'));

      const res = await request(app)
        .put('/api/compensation-history/1')
        .set('Authorization', 'Bearer valid-token')
        .send({ base_salary_current: 170000 });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to update compensation history entry');
    });
  });

  describe('DELETE /api/compensation-history/:id', () => {
    it('should delete compensation history entry successfully', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [mockCompensationHistory], rowCount: 1 });

      const res = await request(app)
        .delete('/api/compensation-history/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Compensation history entry deleted successfully');
    });

    it('should return 404 if entry not found', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = await request(app)
        .delete('/api/compensation-history/999')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Compensation history entry not found');
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValue(new Error('Database error'));

      const res = await request(app)
        .delete('/api/compensation-history/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to delete compensation history entry');
    });
  });
});

