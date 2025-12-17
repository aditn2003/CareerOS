/**
 * Compensation History Routes Tests
 * Tests routes/compensationHistory.js
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import compensationHistoryRoutes from '../../routes/compensationHistory.js';
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

describe('Compensation History Routes', () => {
  let app;
  let user;
  let userId;

  beforeEach(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';
    
    app = express();
    app.use(express.json());
    app.use('/api/compensation-history', compensationHistoryRoutes);
    
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

  describe('GET /api/compensation-history', () => {
    it('should get all compensation history entries', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            user_id: userId,
            company: 'Tech Corp',
            role_title: 'Software Engineer',
            start_date: '2024-01-01',
            base_salary_start: 100000,
            total_comp_start: 120000,
          },
        ],
      });

      const response = await request(app)
        .get('/api/compensation-history')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.compensationHistory).toBeDefined();
      expect(Array.isArray(response.body.compensationHistory)).toBe(true);
    });
  });

  describe('POST /api/compensation-history', () => {
    it('should create a new compensation history entry', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          user_id: userId,
          company: 'Tech Corp',
          role_title: 'Software Engineer',
          start_date: '2024-01-01',
          base_salary_start: 100000,
          total_comp_start: 120000,
        }],
      });

      const response = await request(app)
        .post('/api/compensation-history')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          company: 'Tech Corp',
          role_title: 'Software Engineer',
          start_date: '2024-01-01',
          base_salary_start: 100000,
          total_comp_start: 120000,
        });

      expect(response.status).toBe(201);
      expect(response.body.compensationHistory).toBeDefined();
      expect(response.body.message).toBeDefined();
    });

    it('should return 400 if required fields are missing', async () => {
      const response = await request(app)
        .post('/api/compensation-history')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          company: 'Tech Corp',
        });

      expect(response.status).toBe(400);
    });

    it('should use base_salary_start for base_salary_current if not provided', async () => {
      pool.query.mockImplementation((query, params) => {
        if (query.includes('INSERT INTO compensation_history')) {
          // Check that base_salary_current equals base_salary_start
          const baseSalaryStartIdx = params.indexOf(100000);
          const baseSalaryCurrentIdx = params.indexOf(100000, baseSalaryStartIdx + 1);
          expect(baseSalaryCurrentIdx).toBeGreaterThan(baseSalaryStartIdx);
          return Promise.resolve({
            rows: [{
              id: 1,
              base_salary_start: 100000,
              base_salary_current: 100000,
            }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .post('/api/compensation-history')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          company: 'Tech Corp',
          role_title: 'Software Engineer',
          start_date: '2024-01-01',
          base_salary_start: 100000,
          total_comp_start: 120000,
        });

      expect(response.status).toBe(201);
    });
  });

  describe('PUT /api/compensation-history/:id', () => {
    it('should update a compensation history entry', async () => {
      pool.query.mockImplementation((query, params) => {
        if (query.includes('SELECT * FROM compensation_history WHERE id = $1 AND user_id = $2')) {
          return Promise.resolve({
            rows: [{
              id: 1,
              user_id: userId,
              company: 'Tech Corp',
              role_title: 'Software Engineer',
            }],
          });
        }
        if (query.includes('UPDATE compensation_history')) {
          return Promise.resolve({
            rows: [{
              id: 1,
              company: 'Tech Corp',
              role_title: 'Senior Software Engineer',
              base_salary_current: 120000,
            }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .put('/api/compensation-history/1')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          role_title: 'Senior Software Engineer',
          base_salary_current: 120000,
        });

      expect(response.status).toBe(200);
      expect(response.body.compensationHistory).toBeDefined();
    });

    it('should return 404 if entry not found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .put('/api/compensation-history/999')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          role_title: 'Senior Software Engineer',
        });

      expect(response.status).toBe(404);
    });

    it('should return 400 if no fields to update', async () => {
      pool.query.mockImplementation((query, params) => {
        if (query.includes('SELECT * FROM compensation_history')) {
          return Promise.resolve({
            rows: [{ id: 1, user_id: userId }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .put('/api/compensation-history/1')
        .set('Authorization', `Bearer ${user.token}`)
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/compensation-history/:id', () => {
    it('should delete a compensation history entry', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ id: 1 }],
      });

      const response = await request(app)
        .delete('/api/compensation-history/1')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBeDefined();
    });

    it('should return 404 if entry not found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .delete('/api/compensation-history/999')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(404);
    });
  });
});





