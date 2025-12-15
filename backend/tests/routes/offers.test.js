/**
 * Offers Routes Tests
 * Tests routes/offers.js - job offers management
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import offersRoutes from '../../routes/offers.js';
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

describe('Offers Routes', () => {
  let app;
  let user;
  let userId;

  beforeEach(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';
    
    app = express();
    app.use(express.json());
    app.use('/api/offers', offersRoutes);
    
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

  describe('GET /api/offers', () => {
    it('should get all offers for the user', async () => {
      pool.query.mockImplementation((query, params) => {
        if (query.includes('SELECT * FROM offers WHERE user_id = $1') && params && (params[0] === userId || Number(params[0]) === userId)) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                user_id: userId,
                company: 'Test Company',
                role_title: 'Software Engineer',
                base_salary: 120000,
                offer_status: 'pending',
              },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/offers')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.offers).toBeDefined();
      expect(Array.isArray(response.body.offers)).toBe(true);
    });
  });

  describe('GET /api/offers/:id', () => {
    it('should get a single offer', async () => {
      const offerId = 1;
      pool.query.mockImplementation((query, params) => {
        if (query.includes('SELECT * FROM offers WHERE id = $1 AND user_id = $2') && params && (params[1] === userId || Number(params[1]) === userId)) {
          return Promise.resolve({
            rows: [{
              id: offerId,
              user_id: userId,
              company: 'Test Company',
              role_title: 'Software Engineer',
              base_salary: 120000,
              offer_status: 'pending',
            }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get(`/api/offers/${offerId}`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.offer).toBeDefined();
      expect(response.body.offer.id).toBe(offerId);
    });

    it('should return 404 if offer not found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/offers/999')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/offers', () => {
    it('should create a new offer', async () => {
      const offerData = {
        company: 'Test Company',
        role_title: 'Software Engineer',
        base_salary: 120000,
        offer_status: 'pending',
      };

      pool.query.mockImplementation((query, params) => {
        if (query.includes('SELECT id, base_salary, company, role_title FROM offers') && params && params[0] === userId) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('INSERT INTO offers')) {
          return Promise.resolve({
            rows: [{
              id: 1,
              user_id: userId,
              ...offerData,
              total_comp_year1: 120000,
              total_comp_year4: 480000,
            }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .post('/api/offers')
        .set('Authorization', `Bearer ${user.token}`)
        .send(offerData);

      expect([200, 201]).toContain(response.status);
      expect(response.body.offer).toBeDefined();
      expect(response.body.offer.company).toBe(offerData.company);
    });

    it('should calculate total compensation', async () => {
      const offerData = {
        company: 'Test Company',
        role_title: 'Software Engineer',
        base_salary: 120000,
        signing_bonus: 10000,
        annual_bonus_percent: 10,
        equity_value: 40000,
      };

      pool.query.mockImplementation((query, params) => {
        if (query.includes('SELECT id, base_salary, company, role_title FROM offers')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('INSERT INTO offers')) {
          return Promise.resolve({
            rows: [{
              id: 1,
              user_id: userId,
              ...offerData,
              total_comp_year1: 150000,
              total_comp_year4: 530000,
            }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .post('/api/offers')
        .set('Authorization', `Bearer ${user.token}`)
        .send(offerData);

      expect([200, 201]).toContain(response.status);
      expect(response.body.offer.total_comp_year1).toBeDefined();
      expect(response.body.offer.total_comp_year4).toBeDefined();
    });
  });

  describe('PUT /api/offers/:id', () => {
    it('should update an offer', async () => {
      const offerId = 1;
      const updateData = {
        base_salary: 130000,
        offer_status: 'accepted',
      };

      pool.query.mockImplementation((query, params) => {
        if (query.includes('SELECT * FROM offers WHERE id = $1 AND user_id = $2') && params && (params[1] === userId || Number(params[1]) === userId)) {
          return Promise.resolve({
            rows: [{
              id: offerId,
              user_id: userId,
              company: 'Test Company',
              role_title: 'Software Engineer',
              base_salary: 120000,
              offer_status: 'pending',
              initial_base_salary: 120000,
            }],
          });
        }
        if (query.includes('SELECT id, base_salary, company, role_title FROM offers') && params && params[0] === userId) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('UPDATE offers SET')) {
          return Promise.resolve({
            rows: [{
              id: offerId,
              user_id: userId,
              company: 'Test Company',
              role_title: 'Software Engineer',
              ...updateData,
              total_comp_year1: 130000,
              total_comp_year4: 520000,
            }],
          });
        }
        if (query.includes('SELECT * FROM compensation_history WHERE offer_id')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('INSERT INTO compensation_history')) {
          return Promise.resolve({
            rows: [{
              id: 1,
              offer_id: offerId,
              user_id: userId,
            }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .put(`/api/offers/${offerId}`)
        .set('Authorization', `Bearer ${user.token}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.offer).toBeDefined();
      expect(response.body.offer.base_salary).toBe(updateData.base_salary);
    });

    it('should return 404 if offer not found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .put('/api/offers/999')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ base_salary: 130000 });

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/offers/recalculate-competing', () => {
    it('should recalculate competing offers', async () => {
      pool.query.mockImplementation((query, params) => {
        if (query.includes('SELECT id, base_salary FROM offers WHERE user_id = $1') && params && (params[0] === userId || Number(params[0]) === userId)) {
          return Promise.resolve({
            rows: [
              { id: 1, base_salary: 120000 },
              { id: 2, base_salary: 125000 },
            ],
          });
        }
        if (query.includes('SELECT id, base_salary, company, role_title FROM offers') && query.includes('ABS(base_salary - $2)')) {
          return Promise.resolve({
            rows: [{ id: 2, base_salary: 125000, company: 'Other Company', role_title: 'Engineer' }],
          });
        }
        if (query.includes('SELECT competing_offers_ids FROM offers WHERE id = $1')) {
          return Promise.resolve({ rows: [{ competing_offers_ids: [] }] });
        }
        if (query.includes('UPDATE offers SET competing_offers_count')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .post('/api/offers/recalculate-competing')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('recalculated');
      expect(response.body.totalOffers).toBeDefined();
    });
  });

  describe('POST /api/offers/:id/negotiate', () => {
    it('should record a negotiation', async () => {
      const offerId = 1;
      const negotiationData = {
        negotiated_base_salary: 130000,
        negotiation_notes: 'Successfully negotiated',
        negotiation_type: 'base_salary',
        value_before: 120000,
        value_after: 130000,
        outcome: 'accepted',
      };

      pool.query.mockImplementation((query, params) => {
        if (query.includes('SELECT * FROM offers WHERE id = $1 AND user_id = $2') && params && (params[1] === userId || Number(params[1]) === userId)) {
          return Promise.resolve({
            rows: [{
              id: offerId,
              user_id: userId,
              base_salary: 120000,
              initial_base_salary: 120000,
            }],
          });
        }
        if (query.includes('UPDATE offers SET') && query.includes('negotiated_base_salary')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT COUNT(*) as count FROM negotiation_history')) {
          return Promise.resolve({ rows: [{ count: '0' }] });
        }
        if (query.includes('INSERT INTO negotiation_history')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT * FROM offers WHERE id = $1')) {
          return Promise.resolve({
            rows: [{
              id: offerId,
              base_salary: 130000,
              total_comp_year1: 130000,
              total_comp_year4: 520000,
            }],
          });
        }
        if (query.includes('UPDATE offers SET total_comp_year1')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .post(`/api/offers/${offerId}/negotiate`)
        .set('Authorization', `Bearer ${user.token}`)
        .send(negotiationData);

      expect(response.status).toBe(200);
      expect(response.body.offer).toBeDefined();
    });

    it('should return 404 if offer not found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/offers/999/negotiate')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ negotiated_base_salary: 130000 });

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/offers/:id/accept', () => {
    it('should accept an offer', async () => {
      const offerId = 1;

      pool.query.mockImplementation((query, params) => {
        if (query.includes('SELECT * FROM offers WHERE id = $1 AND user_id = $2') && params && (params[1] === userId || Number(params[1]) === userId)) {
          return Promise.resolve({
            rows: [{
              id: offerId,
              user_id: userId,
              company: 'Test Company',
              role_title: 'Software Engineer',
              base_salary: 120000,
              offer_status: 'pending',
              total_comp_year1: 120000,
              pto_days: 20,
              health_insurance_value: 5000,
              other_benefits_value: 2000,
            }],
          });
        }
        if (query.includes('SELECT o.*, ch.end_date FROM offers o') && params && (params[0] === userId || Number(params[0]) === userId)) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('UPDATE offers SET offer_status = \'accepted\'')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('INSERT INTO compensation_history')) {
          return Promise.resolve({
            rows: [{
              id: 1,
              offer_id: offerId,
              user_id: userId,
              company: 'Test Company',
            }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .post(`/api/offers/${offerId}/accept`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.offer).toBeDefined();
      expect(response.body.offer.offer_status).toBe('accepted');
      expect(response.body.compensationHistory).toBeDefined();
    });

    it('should return 404 if offer not found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/offers/999/accept')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/offers/:id', () => {
    it('should delete an offer', async () => {
      const offerId = 1;

      pool.query.mockImplementation((query, params) => {
        if (query.includes('SELECT id FROM offers WHERE id = $1 AND user_id = $2') && params && (params[1] === userId || Number(params[1]) === userId)) {
          return Promise.resolve({ rows: [{ id: offerId }] });
        }
        if (query.includes('DELETE FROM compensation_history WHERE offer_id')) {
          return Promise.resolve({ rowCount: 0 });
        }
        if (query.includes('DELETE FROM offers WHERE id = $1 AND user_id = $2')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .delete(`/api/offers/${offerId}`)
        .set('Authorization', `Bearer ${user.token}`);

      expect([200, 204]).toContain(response.status);
      expect(response.body.message).toContain('deleted');
    });

    it('should return 404 if offer not found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .delete('/api/offers/999')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(404);
    });
  });
});


