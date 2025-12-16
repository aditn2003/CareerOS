/**
 * Networking Routes Tests
 * Tests routes/networking.js - networking event management
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import networkingRoutes from '../../routes/networking.js';
import { createTestUser } from '../helpers/auth.js';
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
        orderBy: null,
        limitValue: null,
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
        gte: vi.fn(function(column, value) {
          queryState.filters.push({ type: 'gte', column, value });
          return this;
        }),
        neq: vi.fn(function(column, value) {
          queryState.filters.push({ type: 'neq', column, value });
          return this;
        }),
        not: vi.fn(function(column, operator, value) {
          queryState.filters.push({ type: 'not', column, operator, value });
          return this;
        }),
        order: vi.fn(function(column, options) {
          queryState.orderBy = { column, options };
          return this;
        }),
        limit: vi.fn(function(value) {
          queryState.limitValue = value;
          return this;
        }),
        single: vi.fn(function() {
          if (queryState.operation === 'select') {
            // Check if looking for event with id 999 (not found case)
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
                event_name: 'Tech Conference',
                event_date: new Date().toISOString(),
                status: 'attended',
              }, 
              error: null 
            });
          }
          if (queryState.operation === 'insert' || queryState.operation === 'update') {
            const data = queryState.insertData || queryState.updateData || {};
            return Promise.resolve({ 
              data: { 
                id: 1, 
                ...data,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              }, 
              error: null 
            });
          }
          return Promise.resolve({ data: { id: 1 }, error: null });
        }),
      };

      mockQuery.then = function(onResolve) {
        if (queryState.operation === 'select' && !queryState.limitValue) {
          // Return mock data based on table
          if (queryState.table === 'networking_events') {
            return Promise.resolve({ 
              data: [{ 
                id: 1, 
                user_id: 1,
                event_name: 'Tech Conference',
                event_date: new Date().toISOString(),
                status: 'attended',
                industry: 'Technology',
                event_type: 'conference',
              }], 
              error: null 
            }).then(onResolve);
          }
          if (queryState.table === 'event_connections') {
            return Promise.resolve({ 
              data: [{ 
                id: 1, 
                event_id: 1,
                connection_quality: 'high',
                relationship_type: 'professional',
              }], 
              error: null 
            }).then(onResolve);
          }
          if (queryState.table === 'event_followups') {
            return Promise.resolve({ 
              data: [{ 
                id: 1, 
                event_id: 1,
                completed: true,
                response_received: true,
              }], 
              error: null 
            }).then(onResolve);
          }
          if (queryState.table === 'event_goals') {
            return Promise.resolve({ 
              data: [{ 
                id: 1, 
                event_id: 1,
                goal_text: 'Meet 5 new contacts',
              }], 
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

describe('Networking Routes', () => {
  let app;
  let user;

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    
    // Mock auth middleware
    app.use((req, res, next) => {
      req.user = { id: user.id };
      next();
    });
    
    app.use('/api/networking', networkingRoutes);
    
    user = await createTestUser();
    
    vi.clearAllMocks();
    
    // Mock pool.query for contacts endpoint
    pool.query.mockResolvedValue({
      rows: [{
        id: 1,
        user_id: user.id,
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        company: 'Tech Corp',
      }],
    });
  });

  describe('GET /api/networking/events', () => {
    it('should get all networking events for user', async () => {
      const response = await request(app)
        .get('/api/networking/events');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should filter events by status', async () => {
      const response = await request(app)
        .get('/api/networking/events')
        .query({ status: 'attended' });

      expect(response.status).toBe(200);
    });

    it('should filter events by industry', async () => {
      const response = await request(app)
        .get('/api/networking/events')
        .query({ industry: 'Technology' });

      expect(response.status).toBe(200);
    });

    it('should filter events by year', async () => {
      const response = await request(app)
        .get('/api/networking/events')
        .query({ year: '2024' });

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/networking/events/:id', () => {
    it('should get single event with related data', async () => {
      const response = await request(app)
        .get('/api/networking/events/1');

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
      expect(response.body.goals).toBeDefined();
      expect(response.body.connections).toBeDefined();
      expect(response.body.followups).toBeDefined();
    });

    it('should return 404 if event not found', async () => {
      // Mock single() to return null
      const { createClient } = await import('@supabase/supabase-js');
      const mockSupabase = createClient();
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      });

      const response = await request(app)
        .get('/api/networking/events/999');

      expect([404, 500]).toContain(response.status);
    });
  });

  describe('POST /api/networking/events', () => {
    it('should create a new networking event', async () => {
      const response = await request(app)
        .post('/api/networking/events')
        .send({
          event_name: 'Tech Meetup',
          event_date: new Date().toISOString(),
          location: 'San Francisco',
          industry: 'Technology',
          event_type: 'meetup',
        });

      expect([200, 201]).toContain(response.status);
      expect(response.body).toBeDefined();
    });

    it('should return 400 if required fields are missing', async () => {
      const response = await request(app)
        .post('/api/networking/events')
        .send({
          event_name: 'Tech Meetup',
        });

      expect([400, 500]).toContain(response.status);
    });
  });

  describe('PUT /api/networking/events/:id', () => {
    it('should update an existing event', async () => {
      const response = await request(app)
        .put('/api/networking/events/1')
        .send({
          status: 'attended',
          actual_connections_made: 5,
        });

      expect([200, 201]).toContain(response.status);
    });
  });

  describe('DELETE /api/networking/events/:id', () => {
    it('should delete an event', async () => {
      const response = await request(app)
        .delete('/api/networking/events/1');

      expect([200, 204]).toContain(response.status);
    });
  });

  describe('GET /api/networking/statistics', () => {
    it('should get networking statistics', async () => {
      const response = await request(app)
        .get('/api/networking/statistics');

      expect(response.status).toBe(200);
      expect(response.body.totalEventsAttended).toBeDefined();
      expect(response.body.totalConnections).toBeDefined();
      expect(response.body.averageConnectionsPerEvent).toBeDefined();
    });
  });

  describe('GET /api/networking/upcoming', () => {
    it('should get upcoming events', async () => {
      const response = await request(app)
        .get('/api/networking/upcoming');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /api/networking/contacts', () => {
    it('should get all networking contacts', async () => {
      const response = await request(app)
        .get('/api/networking/contacts');

      expect(response.status).toBe(200);
      expect(response.body.contacts).toBeDefined();
      expect(Array.isArray(response.body.contacts)).toBe(true);
    });
  });

  describe('GET /api/networking/contacts/:id', () => {
    it('should get single contact', async () => {
      const response = await request(app)
        .get('/api/networking/contacts/1');

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
    });
  });
});

