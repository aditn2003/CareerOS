/**
 * Informational Interviews Routes Tests
 * Tests routes/informationalInterviews.js - informational interview features
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import informationalInterviewsRoutes from '../../routes/informationalInterviews.js';
import { createTestUser } from '../helpers/auth.js';
import pool from '../../db/pool.js';

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
        order: vi.fn(function() {
          return this;
        }),
        single: vi.fn(function() {
          if (queryState.operation === 'select') {
            return Promise.resolve({ 
              data: { 
                id: 1, 
                user_id: 1,
                status: 'scheduled',
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
          return Promise.resolve({ 
            data: [{ 
              id: 1, 
              user_id: 1,
              status: 'scheduled',
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
    req.user = { id: 1 };
    next();
  }),
}));

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

describe('Informational Interviews Routes', () => {
  let app;
  let user;

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    
    app.use('/api/informational-interviews', informationalInterviewsRoutes);
    
    user = await createTestUser();
    
    vi.clearAllMocks();
    
    pool.query.mockResolvedValue({
      rows: [{
        id: 1,
        user_id: user.id,
        full_name: 'John Doe',
        email: 'john@example.com',
      }],
    });
  });

  describe('GET /api/informational-interviews/candidates', () => {
    it('should get all interview candidates', async () => {
      const response = await request(app)
        .get('/api/informational-interviews/candidates');

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
    });
  });

  describe('POST /api/informational-interviews/candidates', () => {
    it('should create a new interview candidate', async () => {
      const response = await request(app)
        .post('/api/informational-interviews/candidates')
        .send({
          first_name: 'Jane',
          last_name: 'Smith',
          email: 'jane@example.com',
          company: 'Tech Corp',
        });

      expect([200, 201]).toContain(response.status);
      expect(response.body.data).toBeDefined();
    });

    it('should return 400 if first_name or last_name is missing', async () => {
      const response = await request(app)
        .post('/api/informational-interviews/candidates')
        .send({
          email: 'jane@example.com',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('PUT /api/informational-interviews/candidates/:id', () => {
    it('should update candidate status', async () => {
      const response = await request(app)
        .put('/api/informational-interviews/candidates/1')
        .send({
          status: 'scheduled',
        });

      expect([200, 201]).toContain(response.status);
    });
  });

  describe('GET /api/informational-interviews/interviews', () => {
    it('should get all informational interviews', async () => {
      const response = await request(app)
        .get('/api/informational-interviews/interviews');

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
    });
  });

  describe('POST /api/informational-interviews/interviews', () => {
    it('should create a new informational interview', async () => {
      const response = await request(app)
        .post('/api/informational-interviews/interviews')
        .send({
          candidate_id: 1,
          scheduled_date: new Date().toISOString(),
          format: 'virtual',
        });

      expect([200, 201]).toContain(response.status);
    });
  });

  describe('GET /api/informational-interviews/dashboard/summary', () => {
    it('should get dashboard summary', async () => {
      const response = await request(app)
        .get('/api/informational-interviews/dashboard/summary');

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
    });
  });
});



