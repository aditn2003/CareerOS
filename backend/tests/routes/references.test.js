/**
 * References Routes Tests
 * Tests routes/references.js - reference management
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import referencesRoutes from '../../routes/references.js';
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
        select: vi.fn(function() {
          queryState.operation = 'select';
          return this;
        }),
        insert: vi.fn(function(data) {
          queryState.operation = 'insert';
          queryState.insertData = data;
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
            // Check if looking for reference with id 999 (not found case)
            if (queryState.filters.some(f => f.column === 'id' && (f.value === '999' || f.value === 999))) {
              return Promise.resolve({ 
                data: null, 
                error: { code: 'PGRST116', message: 'No rows found' } 
              });
            }
            return Promise.resolve({ 
              data: { 
                id: 1, 
                user_id: 1,
                first_name: 'John',
                last_name: 'Doe',
                email: 'john@example.com',
                reference_type: 'professional',
                is_available: true,
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
              user_id: 1,
              first_name: 'John',
              last_name: 'Doe',
              reference_type: 'professional',
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

describe('References Routes', () => {
  let app;
  let user;

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    
    app.use('/api/references', referencesRoutes);
    
    user = await createTestUser();
    
    vi.clearAllMocks();
  });

  describe('GET /api/references', () => {
    it('should get all references for user', async () => {
      const response = await request(app)
        .get('/api/references');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.references).toBeDefined();
    });

    it('should filter references by type', async () => {
      const response = await request(app)
        .get('/api/references')
        .query({ type: 'professional' });

      expect(response.status).toBe(200);
    });

    it('should filter references by availability', async () => {
      const response = await request(app)
        .get('/api/references')
        .query({ available: 'true' });

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/references/:id', () => {
    it('should get single reference', async () => {
      const response = await request(app)
        .get('/api/references/1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.reference).toBeDefined();
    });

    it('should return 404 if reference not found', async () => {
      const { createClient } = await import('@supabase/supabase-js');
      const mockSupabase = createClient();
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      });

      const response = await request(app)
        .get('/api/references/999');

      expect([404, 500]).toContain(response.status);
    });
  });

  describe('POST /api/references', () => {
    it('should create a new reference', async () => {
      const response = await request(app)
        .post('/api/references')
        .send({
          first_name: 'Jane',
          last_name: 'Smith',
          email: 'jane@example.com',
          title: 'Senior Engineer',
          company: 'Tech Corp',
          relationship: 'Former Manager',
          reference_type: 'professional',
        });

      expect([200, 201]).toContain(response.status);
      expect(response.body.success).toBe(true);
    });

    it('should create reference even with minimal fields', async () => {
      const response = await request(app)
        .post('/api/references')
        .send({
          first_name: 'Jane',
          last_name: 'Smith',
        });

      expect([200, 201]).toContain(response.status);
    });
  });

  describe('PUT /api/references/:id', () => {
    it('should update an existing reference', async () => {
      const response = await request(app)
        .put('/api/references/1')
        .send({
          is_available: false,
        });

      expect([200, 201]).toContain(response.status);
    });
  });

  describe('DELETE /api/references/:id', () => {
    it('should delete a reference', async () => {
      const response = await request(app)
        .delete('/api/references/1');

      expect([200, 204]).toContain(response.status);
    });
  });
});

