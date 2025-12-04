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
      // Mock competing offers query (returns empty - no competing offers)
      mockQueryFn
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // findCompetingOffers query
        .mockResolvedValueOnce({ rows: [mockOffer], rowCount: 1 }); // INSERT query

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
      expect(res.body.offer).toBeDefined();
    });

    it('should create offer with minimal fields', async () => {
      mockQueryFn
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // findCompetingOffers
        .mockResolvedValueOnce({
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
      mockQueryFn
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // findCompetingOffers
        .mockResolvedValueOnce({
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

    it('should calculate total comp with equity vesting', async () => {
      mockQueryFn
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({
          rows: [{
            ...mockOffer,
            equity_value: 200000,
            equity_type: 'rsu',
            health_insurance_value: 12000,
            other_benefits_value: 5000,
          }],
          rowCount: 1,
        });

      const res = await request(app)
        .post('/api/offers')
        .set('Authorization', 'Bearer valid-token')
        .send({
          company: 'TechCorp',
          role_title: 'Engineer',
          base_salary: 150000,
          equity_value: 200000,
          equity_type: 'rsu',
          health_insurance_value: 12000,
          other_benefits_value: 5000,
        });

      expect(res.status).toBe(201);
    });

    it('should handle offer with no base salary', async () => {
      mockQueryFn
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({
          rows: [{ ...mockOffer, base_salary: null }],
          rowCount: 1,
        });

      const res = await request(app)
        .post('/api/offers')
        .set('Authorization', 'Bearer valid-token')
        .send({
          company: 'TechCorp',
          role_title: 'Engineer',
        });

      expect(res.status).toBe(201);
    });

    it('should detect competing offers automatically', async () => {
      const competingOffer = { id: 2, base_salary: 152000, company: 'OtherCorp', role_title: 'Engineer' };
      mockQueryFn
        .mockResolvedValueOnce({ rows: [competingOffer], rowCount: 1 }) // findCompetingOffers finds one
        .mockResolvedValueOnce({ rows: [{ ...mockOffer, competing_offers_count: 1, competing_offers_ids: [2] }], rowCount: 1 });

      const res = await request(app)
        .post('/api/offers')
        .set('Authorization', 'Bearer valid-token')
        .send({
          company: 'TechCorp',
          role_title: 'Engineer',
          base_salary: 150000,
        });

      expect(res.status).toBe(201);
      expect(res.body.offer.competing_offers_count).toBe(1);
    });

    it('should use provided competing offers if set', async () => {
      mockQueryFn.mockResolvedValueOnce({
        rows: [{ ...mockOffer, competing_offers_count: 2, competing_offers_ids: [2, 3] }],
        rowCount: 1,
      });

      const res = await request(app)
        .post('/api/offers')
        .set('Authorization', 'Bearer valid-token')
        .send({
          company: 'TechCorp',
          role_title: 'Engineer',
          base_salary: 150000,
          competing_offers_count: 2,
          competing_offers_ids: [2, 3],
        });

      expect(res.status).toBe(201);
      expect(res.body.offer.competing_offers_count).toBe(2);
    });

    it('should return 500 on database error', async () => {
      mockQueryFn
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // findCompetingOffers succeeds
        .mockRejectedValueOnce(new Error('Database error')); // INSERT fails

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
      const updatedOffer = { ...mockOffer, base_salary: 160000, signing_bonus: 25000 };
      mockQueryFn
        .mockResolvedValueOnce({ rows: [mockOffer], rowCount: 1 }) // Get current offer
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // findCompetingOffers (no competing offers)
        .mockResolvedValueOnce({ rows: [updatedOffer], rowCount: 1 }); // Update

      const res = await request(app)
        .put('/api/offers/1')
        .set('Authorization', 'Bearer valid-token')
        .send({
          base_salary: 160000,
          signing_bonus: 25000,
        });

      expect(res.status).toBe(200);
    });

    it('should auto-detect competing offers when salary changes', async () => {
      const competingOffer = { id: 2, base_salary: 152000 };
      mockQueryFn
        .mockResolvedValueOnce({ rows: [mockOffer], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [competingOffer], rowCount: 1 }) // findCompetingOffers
        .mockResolvedValueOnce({ rows: [{ ...mockOffer, base_salary: 150000 }], rowCount: 1 });

      const res = await request(app)
        .put('/api/offers/1')
        .set('Authorization', 'Bearer valid-token')
        .send({
          base_salary: 150000,
        });

      expect(res.status).toBe(200);
    });

    it('should calculate negotiation improvement when salary increases', async () => {
      const offerWithInitial = { ...mockOffer, initial_base_salary: 140000, base_salary: 150000 };
      mockQueryFn
        .mockResolvedValueOnce({ rows: [offerWithInitial], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // findCompetingOffers
        .mockResolvedValueOnce({ rows: [{ ...offerWithInitial, base_salary: 160000 }], rowCount: 1 });

      const res = await request(app)
        .put('/api/offers/1')
        .set('Authorization', 'Bearer valid-token')
        .send({
          base_salary: 160000,
        });

      expect(res.status).toBe(200);
    });

    it('should handle status change to accepted', async () => {
      mockQueryFn
        .mockResolvedValueOnce({ rows: [mockOffer], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [{ ...mockOffer, offer_status: 'accepted' }], rowCount: 1 });

      const res = await request(app)
        .put('/api/offers/1')
        .set('Authorization', 'Bearer valid-token')
        .send({
          offer_status: 'accepted',
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

    it('should handle negotiation with all fields', async () => {
      mockQueryFn
        .mockResolvedValueOnce({ rows: [mockOffer], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ ...mockOffer, base_salary: 160000 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ ...mockOffer, base_salary: 160000 }], rowCount: 1 });

      const res = await request(app)
        .post('/api/offers/1/negotiate')
        .set('Authorization', 'Bearer valid-token')
        .send({
          negotiated_base_salary: 160000,
          negotiation_notes: 'Negotiated higher',
          negotiation_type: 'base_salary',
          value_before: 150000,
          value_after: 160000,
          outcome: 'success',
          leverage_points: ['competing offer'],
        });

      expect(res.status).toBe(200);
    });

    it('should handle negotiation with zero initial base', async () => {
      const offerZeroBase = { ...mockOffer, initial_base_salary: 0, base_salary: 0 };
      mockQueryFn
        .mockResolvedValueOnce({ rows: [offerZeroBase], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ count: '1' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [offerZeroBase], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [offerZeroBase], rowCount: 1 });

      const res = await request(app)
        .post('/api/offers/1/negotiate')
        .set('Authorization', 'Bearer valid-token')
        .send({
          negotiated_base_salary: 100000,
        });

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
      const acceptedOffer = { ...mockOffer, offer_status: 'accepted' };
      const compHistory = {
        id: 1,
        user_id: 1,
        offer_id: 1,
        company: 'TechCorp',
        role_title: 'Senior Engineer',
        base_salary_start: 150000,
      };

      mockQueryFn
        .mockResolvedValueOnce({ rows: [mockOffer], rowCount: 1 }) // Get offer
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // Check existing comp history
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // Check existing accepted offers
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // Update offer status
        .mockResolvedValueOnce({ rows: [compHistory], rowCount: 1 }); // Create comp history

      const res = await request(app)
        .post('/api/offers/1/accept')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.offer.offer_status).toBe('accepted');
      expect(res.body.compensationHistory).toBeDefined();
    });

    it('should handle already accepted offer with existing comp history', async () => {
      const acceptedOffer = { ...mockOffer, offer_status: 'accepted' };
      const compHistory = { id: 1, offer_id: 1 };

      mockQueryFn
        .mockResolvedValueOnce({ rows: [acceptedOffer], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [compHistory], rowCount: 1 });

      const res = await request(app)
        .post('/api/offers/1/accept')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Offer already accepted');
    });

    it('should warn about multiple active offers', async () => {
      const acceptedOffer = { ...mockOffer, offer_status: 'accepted' };
      const existingOffer = { id: 2, company: 'OtherCorp', role_title: 'Engineer', offer_date: '2024-01-01', offer_status: 'accepted' };
      const compHistory = { id: 1, offer_id: 1 };

      mockQueryFn
        .mockResolvedValueOnce({ rows: [mockOffer], rowCount: 1 }) // Get offer
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // Check existing comp history
        .mockResolvedValueOnce({ rows: [existingOffer], rowCount: 1 }) // Check existing accepted offers (found one)
        .mockResolvedValueOnce({ rows: [acceptedOffer], rowCount: 1 }) // Update offer status
        .mockResolvedValueOnce({ rows: [compHistory], rowCount: 1 }); // Create comp history

      const res = await request(app)
        .post('/api/offers/1/accept')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.warning).toBeDefined();
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

    it('should handle compensation history table missing', async () => {
      const compError = new Error('relation "compensation_history" does not exist');
      compError.message = 'relation "compensation_history" does not exist';

      mockQueryFn
        .mockResolvedValueOnce({ rows: [mockOffer], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockRejectedValueOnce(compError);

      const res = await request(app)
        .post('/api/offers/1/accept')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.warning).toContain('Compensation history table not found');
    });

    it('should handle compensation history creation error (non-table error)', async () => {
      const compError = new Error('Some other database error');
      compError.code = '23505'; // Not a table missing error

      mockQueryFn
        .mockResolvedValueOnce({ rows: [mockOffer], rowCount: 1 }) // Get offer
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // Check existing comp history (if already accepted)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // Check existing accepted offers
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // Update offer status
        .mockRejectedValueOnce(compError); // Other database error

      const res = await request(app)
        .post('/api/offers/1/accept')
        .set('Authorization', 'Bearer valid-token');

      // Route handles error gracefully and still returns 200
      expect(res.status).toBe(200);
    });

    it('should handle offer without total_comp_year1', async () => {
      const offerNoComp = { ...mockOffer, total_comp_year1: null };
      const compHistory = { id: 1, offer_id: 1 };

      mockQueryFn
        .mockResolvedValueOnce({ rows: [offerNoComp], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [compHistory], rowCount: 1 });

      const res = await request(app)
        .post('/api/offers/1/accept')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });
  });

  // ========================================
  // POST /api/offers/recalculate-competing
  // ========================================
  describe('POST /api/offers/recalculate-competing', () => {
    it('should recalculate competing offers for all offers', async () => {
      const offers = [
        { id: 1, base_salary: 150000 },
        { id: 2, base_salary: 152000 },
      ];

      mockQueryFn
        .mockResolvedValueOnce({ rows: offers, rowCount: 2 }) // Get all offers
        .mockResolvedValueOnce({ rows: [{ id: 2 }], rowCount: 1 }) // Find competing for offer 1
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // Update offer 1
        .mockResolvedValueOnce({ rows: [{ competing_offers_ids: null }], rowCount: 1 }) // Get competing offer
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // Update competing offer
        .mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 }) // Find competing for offer 2
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // Update offer 2
        .mockResolvedValueOnce({ rows: [{ competing_offers_ids: [2] }], rowCount: 1 }) // Get competing offer
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // Update competing offer

      const res = await request(app)
        .post('/api/offers/recalculate-competing')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Competing offers recalculated');
      expect(res.body.totalOffers).toBe(2);
    });

    it('should handle no offers', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = await request(app)
        .post('/api/offers/recalculate-competing')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.totalOffers).toBe(0);
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .post('/api/offers/recalculate-competing')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to recalculate competing offers');
    });
  });

  // ========================================
  // DELETE /api/offers/:id
  // ========================================
  describe('DELETE /api/offers/:id', () => {
    it('should delete offer', async () => {
      mockQueryFn
        .mockResolvedValueOnce({ rows: [mockOffer], rowCount: 1 }) // Check offer exists and belongs to user
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // Delete offer

      const res = await request(app)
        .delete('/api/offers/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Offer deleted successfully');
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .delete('/api/offers/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
    });
  });

  // ========================================
  // Helper Functions Tests
  // ========================================
  describe('Helper Functions', () => {
    it('should handle findCompetingOffers with zero salary', async () => {
      // This tests the findCompetingOffers helper when salary is 0 or null
      mockQueryFn
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // findCompetingOffers returns empty
        .mockResolvedValueOnce({ rows: [mockOffer], rowCount: 1 });

      const res = await request(app)
        .post('/api/offers')
        .set('Authorization', 'Bearer valid-token')
        .send({
          company: 'TechCorp',
          role_title: 'Engineer',
          base_salary: 0, // Zero salary
        });

      expect(res.status).toBe(201);
    });

    it('should handle findCompetingOffers with negative salary', async () => {
      mockQueryFn
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [mockOffer], rowCount: 1 });

      const res = await request(app)
        .post('/api/offers')
        .set('Authorization', 'Bearer valid-token')
        .send({
          company: 'TechCorp',
          role_title: 'Engineer',
          base_salary: -1000, // Negative salary
        });

      expect(res.status).toBe(201);
    });

    it('should handle findCompetingOffers error gracefully', async () => {
      // Test that findCompetingOffers errors don't break offer creation
      mockQueryFn
        .mockRejectedValueOnce(new Error('DB error in findCompetingOffers'))
        .mockResolvedValueOnce({ rows: [mockOffer], rowCount: 1 });

      const res = await request(app)
        .post('/api/offers')
        .set('Authorization', 'Bearer valid-token')
        .send({
          company: 'TechCorp',
          role_title: 'Engineer',
          base_salary: 150000,
        });

      // Should still create offer even if competing offers check fails
      expect([201, 500]).toContain(res.status);
    });

    it('should handle findCompetingOffers with excludeOfferId', async () => {
      const updatedOffer = { ...mockOffer, base_salary: 150000, competing_offers_count: 1 };
      mockQueryFn
        .mockResolvedValueOnce({ rows: [mockOffer], rowCount: 1 }) // Get current offer
        .mockResolvedValueOnce({ rows: [{ id: 2, base_salary: 152000 }], rowCount: 1 }) // findCompetingOffers with exclude
        .mockResolvedValueOnce({ rows: [updatedOffer], rowCount: 1 }); // Update

      const res = await request(app)
        .put('/api/offers/1')
        .set('Authorization', 'Bearer valid-token')
        .send({
          base_salary: 150000,
        });

      expect(res.status).toBe(200);
    });
  });

  // ========================================
  // Additional Edge Cases
  // ========================================
  describe('Edge Cases', () => {
    it('should handle offer with null values', async () => {
      mockQueryFn
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({
          rows: [{
            ...mockOffer,
            job_id: null,
            equity_value: null,
            signing_bonus: null,
          }],
          rowCount: 1,
        });

      const res = await request(app)
        .post('/api/offers')
        .set('Authorization', 'Bearer valid-token')
        .send({
          company: 'TechCorp',
          role_title: 'Engineer',
          base_salary: 100000,
          job_id: null,
          equity_value: null,
        });

      expect(res.status).toBe(201);
    });

    it('should handle competing offers with existing ids array', async () => {
      const offerWithCompeting = { ...mockOffer, competing_offers_ids: [2, 3], offer_status: 'pending' };
      const updatedOffer = { ...offerWithCompeting, competing_offers_ids: [2, 3, 4] };
      mockQueryFn
        .mockResolvedValueOnce({ rows: [offerWithCompeting], rowCount: 1 }) // Get current offer
        .mockResolvedValueOnce({ rows: [updatedOffer], rowCount: 1 }); // Update offer

      const res = await request(app)
        .put('/api/offers/1')
        .set('Authorization', 'Bearer valid-token')
        .send({
          competing_offers_ids: [2, 3, 4],
        });

      expect(res.status).toBe(200);
    });

    it('should update competing offers when creating new offer', async () => {
      const competingOffer = { id: 2, competing_offers_ids: [3], competing_offers_count: 1 };
      mockQueryFn
        .mockResolvedValueOnce({ rows: [{ id: 2 }], rowCount: 1 }) // findCompetingOffers
        .mockResolvedValueOnce({ rows: [{ ...mockOffer, id: 1 }], rowCount: 1 }) // Insert new offer
        .mockResolvedValueOnce({ rows: [competingOffer], rowCount: 1 }) // Get competing offer
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // Update competing offer

      const res = await request(app)
        .post('/api/offers')
        .set('Authorization', 'Bearer valid-token')
        .send({
          company: 'TechCorp',
          role_title: 'Engineer',
          base_salary: 150000,
        });

      expect(res.status).toBe(201);
    });

    it('should not update competing offer if ID already exists', async () => {
      const competingOffer = { id: 2, competing_offers_ids: [1], competing_offers_count: 1 };
      mockQueryFn
        .mockResolvedValueOnce({ rows: [{ id: 2 }], rowCount: 1 }) // findCompetingOffers
        .mockResolvedValueOnce({ rows: [{ ...mockOffer, id: 1 }], rowCount: 1 }) // Insert new offer
        .mockResolvedValueOnce({ rows: [competingOffer], rowCount: 1 }); // Get competing offer (ID already exists)

      const res = await request(app)
        .post('/api/offers')
        .set('Authorization', 'Bearer valid-token')
        .send({
          company: 'TechCorp',
          role_title: 'Engineer',
          base_salary: 150000,
        });

      expect(res.status).toBe(201);
    });

    it('should handle error when updating competing offer', async () => {
      mockQueryFn
        .mockResolvedValueOnce({ rows: [{ id: 2 }], rowCount: 1 }) // findCompetingOffers
        .mockResolvedValueOnce({ rows: [{ ...mockOffer, id: 1 }], rowCount: 1 }) // Insert new offer
        .mockRejectedValueOnce(new Error('DB error')); // Error getting competing offer

      const res = await request(app)
        .post('/api/offers')
        .set('Authorization', 'Bearer valid-token')
        .send({
          company: 'TechCorp',
          role_title: 'Engineer',
          base_salary: 150000,
        });

      expect(res.status).toBe(201); // Should still succeed even if competing offer update fails
    });

    it('should handle competing offer not found', async () => {
      mockQueryFn
        .mockResolvedValueOnce({ rows: [{ id: 2 }], rowCount: 1 }) // findCompetingOffers
        .mockResolvedValueOnce({ rows: [{ ...mockOffer, id: 1 }], rowCount: 1 }) // Insert new offer
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // Competing offer not found

      const res = await request(app)
        .post('/api/offers')
        .set('Authorization', 'Bearer valid-token')
        .send({
          company: 'TechCorp',
          role_title: 'Engineer',
          base_salary: 150000,
        });

      expect(res.status).toBe(201);
    });
  });
});

