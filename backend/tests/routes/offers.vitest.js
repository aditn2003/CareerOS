/**
 * Offers Routes - 90%+ Coverage Tests
 * File: backend/routes/offers.js
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

vi.mock('jsonwebtoken', () => ({
  default: {
    verify: vi.fn((token) => {
      if (token === 'valid-token') return { id: 1, email: 'test@example.com' };
      throw new Error('Invalid token');
    }),
    sign: vi.fn(() => 'mock-token'),
  },
}));

// ============================================
// MOCK DATA
// ============================================

const mockOffer = {
  id: 1,
  user_id: 1,
  job_id: 1,
  company: 'TechCorp',
  role_title: 'Senior Engineer',
  role_level: 'senior',
  location: 'San Francisco, CA',
  location_type: 'hybrid',
  industry: 'Technology',
  company_size: 'large',
  base_salary: 150000,
  signing_bonus: 20000,
  annual_bonus_percent: 15,
  annual_bonus_guaranteed: false,
  equity_type: 'rsu',
  equity_value: 100000,
  equity_vesting_schedule: '4 year with 1 year cliff',
  equity_valuation_date: '2024-01-01',
  pto_days: 20,
  health_insurance_value: 12000,
  retirement_match_percent: 6,
  retirement_match_cap: 9000,
  other_benefits_value: 5000,
  total_comp_year1: 200000,
  total_comp_year4: 800000,
  offer_status: 'pending',
  offer_date: '2024-01-15',
  expiration_date: '2024-02-15',
  initial_base_salary: 150000,
  years_of_experience: 5,
};

// ============================================
// TEST SUITE
// ============================================

describe('Offers Routes - 90%+ Coverage', () => {
  let app;

  beforeAll(async () => {
    const offersModule = await import('../../routes/offers.js');
    const { auth } = await import('../../auth.js');
    
    app = express();
    app.use(express.json());
    app.use('/api/offers', offersModule.default);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ========================================
  // GET /api/offers
  // ========================================
  describe('GET /api/offers', () => {
    it('should return all offers', async () => {
      mockQueryFn.mockResolvedValueOnce({
        rows: [mockOffer, { ...mockOffer, id: 2, company: 'StartupXYZ' }],
        rowCount: 2,
      });

      const res = await request(app)
        .get('/api/offers')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.offers).toHaveLength(2);
    });

    it('should return empty array when no offers', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = await request(app)
        .get('/api/offers')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.offers).toEqual([]);
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .get('/api/offers')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to fetch offers');
    });

    it('should return 401 without authorization', async () => {
      const res = await request(app).get('/api/offers');
      expect(res.status).toBe(401);
    });
  });

  // ========================================
  // GET /api/offers/:id
  // ========================================
  describe('GET /api/offers/:id', () => {
    it('should return single offer', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [mockOffer], rowCount: 1 });

      const res = await request(app)
        .get('/api/offers/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.offer).toEqual(mockOffer);
    });

    it('should return 404 when offer not found', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = await request(app)
        .get('/api/offers/999')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Offer not found');
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .get('/api/offers/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
    });
  });

  // ========================================
  // POST /api/offers
  // ========================================
  describe('POST /api/offers', () => {
    it('should create offer with all fields', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [mockOffer], rowCount: 1 });

      const res = await request(app)
        .post('/api/offers')
        .set('Authorization', 'Bearer valid-token')
        .send({
          job_id: 1,
          company: 'TechCorp',
          role_title: 'Senior Engineer',
          role_level: 'senior',
          location: 'San Francisco, CA',
          location_type: 'hybrid',
          industry: 'Technology',
          company_size: 'large',
          base_salary: 150000,
          signing_bonus: 20000,
          annual_bonus_percent: 15,
          annual_bonus_guaranteed: false,
          equity_type: 'rsu',
          equity_value: 100000,
          pto_days: 20,
          health_insurance_value: 12000,
          retirement_match_percent: 6,
          retirement_match_cap: 9000,
          other_benefits_value: 5000,
          offer_date: '2024-01-15',
          expiration_date: '2024-02-15',
          years_of_experience: 5,
        });

      expect(res.status).toBe(201);
      expect(res.body.offer).toEqual(mockOffer);
    });

    it('should create offer with minimal fields', async () => {
      mockQueryFn.mockResolvedValueOnce({
        rows: [{ ...mockOffer, signing_bonus: 0, equity_type: 'none' }],
        rowCount: 1,
      });

      const res = await request(app)
        .post('/api/offers')
        .set('Authorization', 'Bearer valid-token')
        .send({
          company: 'TechCorp',
          role_title: 'Engineer',
          base_salary: 100000,
        });

      expect(res.status).toBe(201);
    });

    it('should create offer with guaranteed bonus', async () => {
      mockQueryFn.mockResolvedValueOnce({
        rows: [{ ...mockOffer, annual_bonus_guaranteed: true }],
        rowCount: 1,
      });

      const res = await request(app)
        .post('/api/offers')
        .set('Authorization', 'Bearer valid-token')
        .send({
          company: 'TechCorp',
          role_title: 'Engineer',
          base_salary: 100000,
          annual_bonus_percent: 20,
          annual_bonus_guaranteed: true,
        });

      expect(res.status).toBe(201);
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .post('/api/offers')
        .set('Authorization', 'Bearer valid-token')
        .send({ company: 'TechCorp', base_salary: 100000 });

      expect(res.status).toBe(500);
    });
  });

  // ========================================
  // PUT /api/offers/:id
  // ========================================
  describe('PUT /api/offers/:id', () => {
    it('should update offer', async () => {
      mockQueryFn
        .mockResolvedValueOnce({ rows: [mockOffer], rowCount: 1 }) // Get current offer
        .mockResolvedValueOnce({ rows: [{ ...mockOffer, base_salary: 160000 }], rowCount: 1 }); // Update

      const res = await request(app)
        .put('/api/offers/1')
        .set('Authorization', 'Bearer valid-token')
        .send({
          base_salary: 160000,
          signing_bonus: 25000,
        });

      expect(res.status).toBe(200);
    });

    it('should return 404 when offer not found', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = await request(app)
        .put('/api/offers/999')
        .set('Authorization', 'Bearer valid-token')
        .send({ base_salary: 160000 });

      expect(res.status).toBe(404);
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .put('/api/offers/1')
        .set('Authorization', 'Bearer valid-token')
        .send({ base_salary: 160000 });

      expect(res.status).toBe(500);
    });
  });

  // ========================================
  // POST /api/offers/:id/negotiate
  // ========================================
  describe('POST /api/offers/:id/negotiate', () => {
    it('should record negotiation', async () => {
      mockQueryFn
        .mockResolvedValueOnce({ rows: [mockOffer], rowCount: 1 }) // Get offer
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // Update offer
        .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 }) // Count rounds
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // Insert history
        .mockResolvedValueOnce({ rows: [{ ...mockOffer, base_salary: 160000 }], rowCount: 1 }) // Get updated
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // Update total comp
        .mockResolvedValueOnce({ rows: [{ ...mockOffer, base_salary: 160000 }], rowCount: 1 }); // Final get

      const res = await request(app)
        .post('/api/offers/1/negotiate')
        .set('Authorization', 'Bearer valid-token')
        .send({
          negotiated_base_salary: 160000,
          negotiation_notes: 'Negotiated higher base',
          negotiation_type: 'base_salary',
          value_before: 150000,
          value_after: 160000,
          outcome: 'success',
          leverage_points: ['competing offer', 'experience'],
        });

      expect(res.status).toBe(200);
    });

    it('should handle negotiation without initial_base_salary', async () => {
      const offerNoInitial = { ...mockOffer, initial_base_salary: null };
      mockQueryFn
        .mockResolvedValueOnce({ rows: [offerNoInitial], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ count: '2' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [mockOffer], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [mockOffer], rowCount: 1 });

      const res = await request(app)
        .post('/api/offers/1/negotiate')
        .set('Authorization', 'Bearer valid-token')
        .send({ negotiation_notes: 'Updated' });

      expect(res.status).toBe(200);
    });

    it('should return 404 when offer not found', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = await request(app)
        .post('/api/offers/999/negotiate')
        .set('Authorization', 'Bearer valid-token')
        .send({ negotiated_base_salary: 160000 });

      expect(res.status).toBe(404);
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .post('/api/offers/1/negotiate')
        .set('Authorization', 'Bearer valid-token')
        .send({ negotiated_base_salary: 160000 });

      expect(res.status).toBe(500);
    });
  });

  // ========================================
  // POST /api/offers/:id/accept
  // ========================================
  describe('POST /api/offers/:id/accept', () => {
    it('should accept offer and create compensation history', async () => {
      mockQueryFn
        .mockResolvedValueOnce({ rows: [mockOffer], rowCount: 1 }) // Get offer
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // Update offer
        .mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 }); // Create comp history

      const res = await request(app)
        .post('/api/offers/1/accept')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.offer.offer_status).toBe('accepted');
      expect(res.body.compensationHistory).toBeDefined();
    });

    it('should return 404 when offer not found', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = await request(app)
        .post('/api/offers/999/accept')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(404);
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .post('/api/offers/1/accept')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
    });
  });

  // ========================================
  // DELETE /api/offers/:id
  // ========================================
  describe('DELETE /api/offers/:id', () => {
    it('should delete offer', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      const res = await request(app)
        .delete('/api/offers/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Offer deleted');
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .delete('/api/offers/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
    });
  });
});

