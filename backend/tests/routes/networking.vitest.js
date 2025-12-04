/**
 * Networking Routes - 90%+ Coverage Tests
 * File: backend/routes/networking.js
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

const mockContact = {
  id: 1,
  user_id: 1,
  name: 'John Smith',
  email: 'john@company.com',
  company: 'TechCorp',
  title: 'Engineering Manager',
  industry: 'Technology',
  linkedin_url: 'https://linkedin.com/in/johnsmith',
  relationship_strength: 3,
  engagement_score: 50,
  reciprocity_score: 40,
  notes: 'Met at conference',
  tags: ['referral', 'tech'],
};

const mockActivity = {
  id: 1,
  user_id: 1,
  contact_id: 1,
  activity_type: 'email',
  channel: 'email',
  direction: 'outbound',
  subject: 'Follow-up',
  notes: 'Discussed opportunities',
  outcome: 'positive',
  relationship_impact: 5,
  time_spent_minutes: 15,
};

const mockEvent = {
  id: 1,
  user_id: 1,
  event_name: 'Tech Conference 2024',
  event_type: 'conference',
  organization: 'TechOrg',
  location: 'San Francisco, CA',
  event_date: '2024-06-15',
  duration_hours: 8,
  cost: 500,
  contacts_met: 10,
  opportunities_generated: 3,
  notes: 'Great networking event',
};

const mockReferral = {
  id: 1,
  user_id: 1,
  contact_id: 1,
  job_id: 1,
  referral_type: 'internal',
  referrer_name: 'John Smith',
  referrer_company: 'TechCorp',
  company_referred_to: 'StartupXYZ',
  position_referred_for: 'Senior Developer',
  quality_score: 8,
  status: 'pending',
};

// ============================================
// TEST SUITE
// ============================================

describe('Networking Routes - 90%+ Coverage', () => {
  let app;

  beforeAll(async () => {
    const networkingModule = await import('../../routes/networking.js');
    const { auth } = await import('../../auth.js');
    
    app = express();
    app.use(express.json());
    app.use('/api/networking', networkingModule.default);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ========================================
  // CONTACTS CRUD
  // ========================================
  describe('GET /api/networking/contacts', () => {
    it('should return all contacts', async () => {
      mockQueryFn.mockResolvedValueOnce({
        rows: [mockContact, { ...mockContact, id: 2, name: 'Jane Doe' }],
        rowCount: 2,
      });

      const res = await request(app)
        .get('/api/networking/contacts')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.contacts).toHaveLength(2);
    });

    it('should return empty array when no contacts', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = await request(app)
        .get('/api/networking/contacts')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.contacts).toEqual([]);
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .get('/api/networking/contacts')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to fetch contacts');
    });

    it('should return 401 without authorization', async () => {
      const res = await request(app).get('/api/networking/contacts');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/networking/contacts/:id', () => {
    it('should return single contact', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [mockContact], rowCount: 1 });

      const res = await request(app)
        .get('/api/networking/contacts/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.contact).toEqual(mockContact);
    });

    it('should return 404 when contact not found', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = await request(app)
        .get('/api/networking/contacts/999')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Contact not found');
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .get('/api/networking/contacts/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
    });
  });

  describe('POST /api/networking/contacts', () => {
    it('should create contact with all fields', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [mockContact], rowCount: 1 });

      const res = await request(app)
        .post('/api/networking/contacts')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'John Smith',
          email: 'john@company.com',
          company: 'TechCorp',
          title: 'Engineering Manager',
          industry: 'Technology',
          linkedin_url: 'https://linkedin.com/in/johnsmith',
          relationship_strength: 3,
          engagement_score: 50,
          reciprocity_score: 40,
          notes: 'Met at conference',
          tags: ['referral', 'tech'],
        });

      expect(res.status).toBe(201);
      expect(res.body.contact).toEqual(mockContact);
    });

    it('should create contact with only name', async () => {
      mockQueryFn.mockResolvedValueOnce({
        rows: [{ ...mockContact, email: null, company: null }],
        rowCount: 1,
      });

      const res = await request(app)
        .post('/api/networking/contacts')
        .set('Authorization', 'Bearer valid-token')
        .send({ name: 'John Smith' });

      expect(res.status).toBe(201);
    });

    it('should return 400 when name is missing', async () => {
      const res = await request(app)
        .post('/api/networking/contacts')
        .set('Authorization', 'Bearer valid-token')
        .send({ email: 'john@company.com' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Name is required');
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .post('/api/networking/contacts')
        .set('Authorization', 'Bearer valid-token')
        .send({ name: 'John Smith' });

      expect(res.status).toBe(500);
    });
  });

  describe('PUT /api/networking/contacts/:id', () => {
    it('should update contact', async () => {
      mockQueryFn.mockResolvedValueOnce({
        rows: [{ ...mockContact, name: 'Updated Name' }],
        rowCount: 1,
      });

      const res = await request(app)
        .put('/api/networking/contacts/1')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'Updated Name',
          company: 'NewCompany',
          last_contact_date: '2024-01-15',
          next_followup_date: '2024-02-15',
        });

      expect(res.status).toBe(200);
    });

    it('should return 404 when contact not found', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = await request(app)
        .put('/api/networking/contacts/999')
        .set('Authorization', 'Bearer valid-token')
        .send({ name: 'Updated' });

      expect(res.status).toBe(404);
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .put('/api/networking/contacts/1')
        .set('Authorization', 'Bearer valid-token')
        .send({ name: 'Updated' });

      expect(res.status).toBe(500);
    });
  });

  describe('DELETE /api/networking/contacts/:id', () => {
    it('should delete contact', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      const res = await request(app)
        .delete('/api/networking/contacts/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Contact deleted');
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .delete('/api/networking/contacts/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
    });
  });

  // ========================================
  // ACTIVITIES CRUD
  // ========================================
  describe('GET /api/networking/activities', () => {
    it('should return all activities', async () => {
      mockQueryFn.mockResolvedValueOnce({
        rows: [mockActivity],
        rowCount: 1,
      });

      const res = await request(app)
        .get('/api/networking/activities')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.activities).toHaveLength(1);
    });

    it('should filter activities by contact_id', async () => {
      mockQueryFn.mockResolvedValueOnce({
        rows: [mockActivity],
        rowCount: 1,
      });

      const res = await request(app)
        .get('/api/networking/activities?contact_id=1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .get('/api/networking/activities')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
    });
  });

  describe('POST /api/networking/activities', () => {
    it('should create activity with contact_id', async () => {
      mockQueryFn
        .mockResolvedValueOnce({ rows: [mockActivity], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // Update contact

      const res = await request(app)
        .post('/api/networking/activities')
        .set('Authorization', 'Bearer valid-token')
        .send({
          contact_id: 1,
          activity_type: 'email',
          channel: 'email',
          direction: 'outbound',
          subject: 'Follow-up',
          notes: 'Discussed opportunities',
          outcome: 'positive',
          relationship_impact: 5,
          time_spent_minutes: 15,
        });

      expect(res.status).toBe(201);
    });

    it('should create activity without contact_id', async () => {
      mockQueryFn.mockResolvedValueOnce({
        rows: [{ ...mockActivity, contact_id: null }],
        rowCount: 1,
      });

      const res = await request(app)
        .post('/api/networking/activities')
        .set('Authorization', 'Bearer valid-token')
        .send({ activity_type: 'networking' });

      expect(res.status).toBe(201);
    });

    it('should return 400 when activity_type is missing', async () => {
      const res = await request(app)
        .post('/api/networking/activities')
        .set('Authorization', 'Bearer valid-token')
        .send({ notes: 'Some notes' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Activity type is required');
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .post('/api/networking/activities')
        .set('Authorization', 'Bearer valid-token')
        .send({ activity_type: 'email' });

      expect(res.status).toBe(500);
    });
  });

  // ========================================
  // EVENTS CRUD
  // ========================================
  describe('GET /api/networking/events', () => {
    it('should return all events', async () => {
      mockQueryFn.mockResolvedValueOnce({
        rows: [mockEvent],
        rowCount: 1,
      });

      const res = await request(app)
        .get('/api/networking/events')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.events).toHaveLength(1);
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .get('/api/networking/events')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
    });
  });

  describe('POST /api/networking/events', () => {
    it('should create event with all fields', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [mockEvent], rowCount: 1 });

      const res = await request(app)
        .post('/api/networking/events')
        .set('Authorization', 'Bearer valid-token')
        .send({
          event_name: 'Tech Conference 2024',
          event_type: 'conference',
          organization: 'TechOrg',
          location: 'San Francisco, CA',
          event_date: '2024-06-15',
          duration_hours: 8,
          cost: 500,
          contacts_met: 10,
          opportunities_generated: 3,
          notes: 'Great networking event',
        });

      expect(res.status).toBe(201);
    });

    it('should return 400 when event_name is missing', async () => {
      const res = await request(app)
        .post('/api/networking/events')
        .set('Authorization', 'Bearer valid-token')
        .send({ event_date: '2024-06-15' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Event name and date are required');
    });

    it('should return 400 when event_date is missing', async () => {
      const res = await request(app)
        .post('/api/networking/events')
        .set('Authorization', 'Bearer valid-token')
        .send({ event_name: 'Conference' });

      expect(res.status).toBe(400);
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .post('/api/networking/events')
        .set('Authorization', 'Bearer valid-token')
        .send({ event_name: 'Conference', event_date: '2024-06-15' });

      expect(res.status).toBe(500);
    });
  });

  // ========================================
  // REFERRALS CRUD
  // ========================================
  describe('GET /api/networking/referrals', () => {
    it('should return all referrals', async () => {
      mockQueryFn.mockResolvedValueOnce({
        rows: [mockReferral],
        rowCount: 1,
      });

      const res = await request(app)
        .get('/api/networking/referrals')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.referrals).toHaveLength(1);
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .get('/api/networking/referrals')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
    });
  });

  describe('POST /api/networking/referrals', () => {
    it('should create referral with all fields', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [mockReferral], rowCount: 1 });

      const res = await request(app)
        .post('/api/networking/referrals')
        .set('Authorization', 'Bearer valid-token')
        .send({
          contact_id: 1,
          job_id: 1,
          referral_type: 'internal',
          referrer_name: 'John Smith',
          referrer_company: 'TechCorp',
          company_referred_to: 'StartupXYZ',
          position_referred_for: 'Senior Developer',
          quality_score: 8,
        });

      expect(res.status).toBe(201);
    });

    it('should create referral with minimal fields', async () => {
      mockQueryFn.mockResolvedValueOnce({
        rows: [{ ...mockReferral, contact_id: null, job_id: null }],
        rowCount: 1,
      });

      const res = await request(app)
        .post('/api/networking/referrals')
        .set('Authorization', 'Bearer valid-token')
        .send({ referral_type: 'external' });

      expect(res.status).toBe(201);
    });

    it('should return 400 when referral_type is missing', async () => {
      const res = await request(app)
        .post('/api/networking/referrals')
        .set('Authorization', 'Bearer valid-token')
        .send({ contact_id: 1 });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Referral type is required');
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .post('/api/networking/referrals')
        .set('Authorization', 'Bearer valid-token')
        .send({ referral_type: 'internal' });

      expect(res.status).toBe(500);
    });
  });

  describe('PUT /api/networking/referrals/:id', () => {
    it('should update referral', async () => {
      mockQueryFn.mockResolvedValueOnce({
        rows: [{ ...mockReferral, status: 'accepted' }],
        rowCount: 1,
      });

      const res = await request(app)
        .put('/api/networking/referrals/1')
        .set('Authorization', 'Bearer valid-token')
        .send({
          status: 'accepted',
          converted_to_interview: true,
          converted_to_offer: false,
          quality_score: 9,
        });

      expect(res.status).toBe(200);
    });

    it('should return 404 when referral not found', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = await request(app)
        .put('/api/networking/referrals/999')
        .set('Authorization', 'Bearer valid-token')
        .send({ status: 'accepted' });

      expect(res.status).toBe(404);
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .put('/api/networking/referrals/1')
        .set('Authorization', 'Bearer valid-token')
        .send({ status: 'accepted' });

      expect(res.status).toBe(500);
    });
  });
});

