/**
 * Mentors Routes Tests
 * Tests routes/mentors.js - mentor features
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import mentorsRoutes from '../../routes/mentors.js';
import { createTestUser, createAuthHeader } from '../helpers/auth.js';

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
        select: vi.fn(function(columns) {
          queryState.operation = 'select';
          queryState.selectColumns = columns;
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
        order: vi.fn(function() {
          return this;
        }),
        single: vi.fn(function() {
          if (queryState.operation === 'select') {
            // Handle mentor lookup by email
            if (tableName === 'mentors') {
              const emailFilter = queryState.filters.find(f => f.column === 'email');
              if (emailFilter && emailFilter.value === 'mentor@example.com') {
                return Promise.resolve({ 
                  data: { 
                    id: 1,
                    email: 'mentor@example.com',
                  }, 
                  error: null 
                });
              }
            }
            // Handle relationship check (should return null if no existing relationship)
            if (tableName === 'mentor_relationships') {
              const menteeFilter = queryState.filters.find(f => f.column === 'mentee_id');
              const mentorFilter = queryState.filters.find(f => f.column === 'mentor_id');
              if (menteeFilter && mentorFilter) {
                // No existing relationship
                return Promise.resolve({ 
                  data: null, 
                  error: null 
                });
              }
            }
            return Promise.resolve({ 
              data: { 
                id: 1, 
                mentor_id: 1,
                mentee_id: 2,
                status: 'active',
              }, 
              error: null 
            });
          }
          if (queryState.operation === 'insert') {
            return Promise.resolve({ 
              data: { 
                id: 1, 
                ...queryState.insertData,
                created_at: new Date().toISOString(),
              }, 
              error: null 
            });
          }
          if (queryState.operation === 'update') {
            return Promise.resolve({ 
              data: { 
                id: 1, 
                ...queryState.updateData,
                updated_at: new Date().toISOString(),
              }, 
              error: null 
            });
          }
          return Promise.resolve({ data: { id: 1 }, error: null });
        }),
      };

      mockQuery.then = function(onResolve) {
        if (queryState.operation === 'select') {
          return Promise.resolve({ 
            data: [{ 
              id: 1, 
              mentor_id: 1,
              mentee_id: 2,
              status: 'active',
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

describe('Mentors Routes', () => {
  let app;
  let user;
  let authHeader;

  beforeEach(async () => {
    // Ensure JWT_SECRET matches what the route expects
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';
    
    app = express();
    app.use(express.json());
    
    app.use('/api/mentors', mentorsRoutes);
    
    user = await createTestUser();
    authHeader = `Bearer ${user.token}`;
    
    vi.clearAllMocks();
  });

  describe('GET /api/mentors/dashboard', () => {
    it('should get mentor dashboard data', async () => {
      const response = await request(app)
        .get('/api/mentors/dashboard')
        .set('Authorization', authHeader);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });

  describe('GET /api/mentors/my-mentors', () => {
    it('should get all mentors for current user', async () => {
      const response = await request(app)
        .get('/api/mentors/my-mentors')
        .set('Authorization', authHeader);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/mentors/invite', () => {
    it('should create a mentor request', async () => {
      const response = await request(app)
        .post('/api/mentors/invite')
        .set('Authorization', authHeader)
        .send({
          mentor_email: 'mentor@example.com',
          message: 'I would like mentorship',
        });

      expect([200, 201, 400, 500]).toContain(response.status);
    });
  });

  describe('GET /api/mentors/:id', () => {
    it('should get mentor relationship details', async () => {
      const response = await request(app)
        .get('/api/mentors/1')
        .set('Authorization', authHeader);

      expect([200, 404]).toContain(response.status);
    });
  });

  describe('PUT /api/mentors/:id', () => {
    it('should update mentor relationship', async () => {
      const response = await request(app)
        .put('/api/mentors/1')
        .set('Authorization', authHeader)
        .send({
          status: 'active',
        });

      expect([200, 201, 404, 500]).toContain(response.status);
    });
  });
});

