/**
 * Industry Contacts Routes Tests
 * Tests routes/industryContacts.js - industry contact discovery
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import industryContactsRoutes from '../../routes/industryContacts.js';
import { createTestUser } from '../helpers/auth.js';

// Mock external dependencies
vi.mock('@supabase/supabase-js', () => {
  const createMockSupabase = () => {
    const createMockQuery = (tableName) => {
      let queryState = {
        table: tableName,
        operation: null,
        filters: [],
        insertData: null,
        updateData: null,
      };

      const mockQuery = {
        select: vi.fn(function() {
          queryState.operation = 'select';
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
        ilike: vi.fn(function(column, value) {
          queryState.filters.push({ type: 'ilike', column, value });
          return this;
        }),
        order: vi.fn(function() {
          return this;
        }),
        single: vi.fn(function() {
          if (queryState.operation === 'select') {
            return Promise.resolve({ 
              data: { 
                id: 1, 
                user_id: 1,
                action_status: 'pending',
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
            // Check if update returns empty array (not found case)
            if (queryState.filters.some(f => f.column === 'id' && (f.value === '999' || f.value === 999))) {
              return Promise.resolve({ 
                data: [], 
                error: null 
              });
            }
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
          // Return mock data based on table
          if (queryState.table === 'alumni_connections') {
            return Promise.resolve({ 
              data: [{ 
                id: 1, 
                user_id: 1,
                education_institution: 'MIT',
                first_name: 'John',
                last_name: 'Doe',
              }], 
              error: null 
            }).then(onResolve);
          }
          if (queryState.table === 'event_participants') {
            return Promise.resolve({ 
              data: [{ 
                id: 1, 
                user_id: 1,
                event_name: 'Tech Conference',
                first_name: 'John',
                last_name: 'Doe',
              }], 
              error: null 
            }).then(onResolve);
          }
          return Promise.resolve({ 
            data: [{ 
              id: 1, 
              user_id: 1,
              action_status: 'pending',
            }], 
            error: null 
          }).then(onResolve);
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

vi.mock('../../auth.js', () => ({
  auth: vi.fn((req, res, next) => {
    // Verify JWT token if provided
    const h = req.headers.authorization || "";
    const token = h.startsWith("Bearer ") ? h.split(" ")[1] : null;
    if (token) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test-secret-key');
        req.user = { id: Number(decoded.id) };
      } catch (err) {
        return res.status(401).json({ error: "INVALID_TOKEN" });
      }
    } else {
      req.user = { id: 1 };
    }
    next();
  }),
}));

describe('Industry Contacts Routes', () => {
  let app;
  let user;

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    
    app.use('/api/industry-contacts', industryContactsRoutes);
    
    user = await createTestUser();
    
    vi.clearAllMocks();
  });

  describe('GET /api/industry-contacts/contact-suggestions', () => {
    it('should get contact suggestions by company', async () => {
      const response = await request(app)
        .get('/api/industry-contacts/contact-suggestions')
        .query({ company: 'Google' })
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.suggestions).toBeDefined();
      expect(Array.isArray(response.body.suggestions)).toBe(true);
    });

    it('should return empty array if company not provided', async () => {
      const response = await request(app)
        .get('/api/industry-contacts/contact-suggestions')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.suggestions).toEqual([]);
    });
  });

  describe('PUT /api/industry-contacts/suggestions/:id/action', () => {
    it('should track action on a contact suggestion', async () => {
      const response = await request(app)
        .put('/api/industry-contacts/suggestions/1/action')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          action_status: 'connected',
          action_notes: 'Successfully connected',
        });

      expect([200, 201]).toContain(response.status);
    });
  });

  describe('GET /api/industry-contacts/discovery-analytics', () => {
    it('should get discovery analytics', async () => {
      const response = await request(app)
        .get('/api/industry-contacts/discovery-analytics')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
    });
  });

  describe('GET /api/industry-contacts/alumni', () => {
    it('should get alumni connections', async () => {
      const response = await request(app)
        .get('/api/industry-contacts/alumni')
        .query({ institution: 'MIT' })
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
    });
  });

  describe('GET /api/industry-contacts/connection-paths', () => {
    it('should get connection paths', async () => {
      const response = await request(app)
        .get('/api/industry-contacts/connection-paths')
        .query({ target_company: 'Google' })
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
    });
  });

  describe('GET /api/industry-contacts/event-participants', () => {
    it('should get event participants', async () => {
      const response = await request(app)
        .get('/api/industry-contacts/event-participants')
        .query({ event_name: 'Tech Conference' })
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
    });
  });
});

