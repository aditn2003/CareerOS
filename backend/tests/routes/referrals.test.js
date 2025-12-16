/**
 * Referrals Routes Tests
 * Tests routes/referrals.js - referral management
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import referralsRoutes from '../../routes/referrals.js';
import { createTestUser, createAuthHeader } from '../helpers/auth.js';
import pool from '../../db/pool.js';

// Mock external dependencies
vi.mock('@supabase/supabase-js', () => {
  const createMockSupabase = () => {
    const createMockQuery = (tableName) => {
      let queryState = {
        table: tableName,
        operation: null,
        fields: null,
        filters: [],
        insertData: null,
        updateData: null,
        options: null,
      };

      const mockQuery = {
        select: vi.fn(function(fields, options) {
          queryState.operation = 'select';
          queryState.fields = fields;
          queryState.options = options;
          return this;
        }),
        insert: vi.fn(function(data) {
          queryState.operation = 'insert';
          queryState.insertData = Array.isArray(data) ? data[0] : data;
          return this;
        }),
        update: vi.fn(function(data) {
          queryState.operation = 'update';
          queryState.updateData = data;
          return this;
        }),
        delete: vi.fn(function() {
          queryState.operation = 'delete';
          return this;
        }),
        eq: vi.fn(function(column, value) {
          queryState.filters.push({ type: 'eq', column, value });
          return this;
        }),
        is: vi.fn(function(column, value) {
          queryState.filters.push({ type: 'is', column, value });
          return this;
        }),
        order: vi.fn(function(column, options) {
          return this;
        }),
        single: vi.fn(function() {
          if (queryState.operation === 'select') {
            // Check if looking for contact with id 999 (not found case)
            if (queryState.table === 'professional_contacts' && 
                queryState.filters.some(f => f.column === 'id' && f.value === 999)) {
              return Promise.resolve({ 
                data: null, 
                error: { code: 'PGRST116', message: 'No rows found' } 
              });
            }
            // Check if looking for referral request with id 999 (not found case)
            if (queryState.filters.some(f => f.column === 'id' && (f.value === '999' || f.value === 999))) {
              return Promise.resolve({ 
                data: null, 
                error: { code: 'PGRST116', message: 'No rows found' } 
              });
            }
            // Return contact data for professional_contacts table
            if (queryState.table === 'professional_contacts') {
              return Promise.resolve({ 
                data: { 
                  id: 1,
                  relationship_strength: 5,
                }, 
                error: null 
              });
            }
            return Promise.resolve({ 
              data: { 
                id: 1, 
                user_id: 1,
                contact_id: 1,
                job_title: 'Software Engineer',
                company: 'Tech Corp',
                status: 'pending',
                contact: { first_name: 'John', last_name: 'Doe' },
                job: { id: 1, title: 'Software Engineer' },
                followups: [],
              }, 
              error: null 
            });
          }
          if (queryState.operation === 'insert') {
            return Promise.resolve({ 
              data: [{ 
                id: 1, 
                ...queryState.insertData,
                created_at: new Date().toISOString(),
              }], 
              error: null 
            });
          }
          if (queryState.operation === 'update') {
            return Promise.resolve({ 
              data: [{ 
                id: 1, 
                ...queryState.updateData,
                updated_at: new Date().toISOString(),
              }], 
              error: null 
            });
          }
          return Promise.resolve({ data: { id: 1 }, error: null });
        }),
      };

      mockQuery.then = function(onResolve) {
        if (queryState.operation === 'select') {
          // Handle select queries - return array of data
          if (queryState.table === 'referral_requests') {
            return Promise.resolve({ 
              data: [{ 
                id: 1, 
                user_id: 1,
                contact_id: 1,
                job_title: 'Software Engineer',
                company: 'Tech Corp',
                status: 'pending',
                contact: { first_name: 'John', last_name: 'Doe' },
                job: { id: 1, title: 'Software Engineer' },
              }], 
              error: null 
            }).then(onResolve);
          }
          if (queryState.table === 'professional_contacts') {
            return Promise.resolve({ 
              data: { 
                id: 1,
                relationship_strength: 5,
              }, 
              error: null 
            }).then(onResolve);
          }
          return Promise.resolve({ data: [], error: null }).then(onResolve);
        }
        return Promise.resolve({ data: null, error: null }).then(onResolve);
      };
      mockQuery.catch = function(onReject) {
        return Promise.resolve({ data: null, error: null }).catch(onReject);
      };

      return mockQuery;
    };
    
    return {
      from: vi.fn((tableName) => createMockQuery(tableName)),
    };
  };
  
  return {
    createClient: vi.fn(() => createMockSupabase()),
  };
});

vi.mock('../../db/pool.js', () => ({
  default: {
    query: vi.fn(),
  },
}));


vi.mock('resend', () => {
  const mockInstance = {
    emails: {
      send: vi.fn().mockResolvedValue({ data: { id: 'email-123' } }),
    },
  };
  
  return {
    Resend: class {
      constructor() {
        return mockInstance;
      }
    },
  };
});

describe('Referrals Routes', () => {
  let app;
  let user;
  let authHeader;

  beforeEach(async () => {
    // Ensure JWT_SECRET matches what the route expects
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';
    
    app = express();
    app.use(express.json());
    
    app.use('/api/referrals', referralsRoutes);
    
    user = await createTestUser();
    authHeader = `Bearer ${user.token}`;
    
    vi.clearAllMocks();
    
    // Mock pool.query for contact verification
    pool.query.mockResolvedValue({
      rows: [{
        id: 1,
        user_id: user.id,
        first_name: 'John',
        last_name: 'Doe',
        relationship_strength: 5,
      }],
    });
  });

  describe('GET /api/referrals/requests', () => {
    it('should get all referral requests for user', async () => {
      const response = await request(app)
        .get('/api/referrals/requests')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should filter requests by status', async () => {
      const response = await request(app)
        .get('/api/referrals/requests')
        .query({ status: 'pending' })
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
    });

    it('should filter requests by contact_id', async () => {
      const response = await request(app)
        .get('/api/referrals/requests')
        .query({ contact_id: 1 })
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/referrals/requests/:id', () => {
    it('should get single referral request', async () => {
      const response = await request(app)
        .get('/api/referrals/requests/1')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
    });

    it('should return 404 if request not found', async () => {
      const response = await request(app)
        .get('/api/referrals/requests/999')
        .set('Authorization', `Bearer ${user.token}`);

      expect([404, 500]).toContain(response.status);
    });
  });

  describe('POST /api/referrals/requests', () => {
    it('should create a new referral request', async () => {
      const response = await request(app)
        .post('/api/referrals/requests')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          contact_id: 1,
          job_title: 'Software Engineer',
          company: 'Tech Corp',
          referral_message: 'I would be a great fit',
        });

      expect([200, 201]).toContain(response.status);
      expect(response.body.referralRequest).toBeDefined();
    });

    it('should return 400 if required fields are missing', async () => {
      const response = await request(app)
        .post('/api/referrals/requests')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          contact_id: 1,
        });

      expect(response.status).toBe(400);
    });

    it('should return 404 if contact not found', async () => {
      const response = await request(app)
        .post('/api/referrals/requests')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          contact_id: 999,
          job_title: 'Software Engineer',
          company: 'Tech Corp',
        });

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/referrals/requests/:id', () => {
    it('should update referral request', async () => {
      const response = await request(app)
        .put('/api/referrals/requests/1')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          status: 'accepted',
          referral_outcome: 'interview',
        });

      expect([200, 201]).toContain(response.status);
    });
  });

  describe('DELETE /api/referrals/requests/:id', () => {
    it('should delete referral request', async () => {
      const response = await request(app)
        .delete('/api/referrals/requests/1')
        .set('Authorization', `Bearer ${user.token}`);

      expect([200, 204]).toContain(response.status);
    });
  });

  describe('POST /api/referrals/requests/:id/followups', () => {
    it('should create a follow-up for referral request', async () => {
      const response = await request(app)
        .post('/api/referrals/requests/1/followups')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          followup_type: 'thank_you',
          followup_date: new Date().toISOString(),
          followup_message: 'Thank you for the referral',
        });

      expect([200, 201]).toContain(response.status);
    });
  });
});

