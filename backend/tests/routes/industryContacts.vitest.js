/**
 * Industry Contacts Routes - Full Coverage Tests
 * File: backend/routes/industryContacts.js
 */

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import industryContactsRouter from '../../routes/industryContacts.js';

// ============================================
// MOCKS
// ============================================

// Create a chainable query builder mock
function createQueryBuilder(initialData = [], initialError = null) {
  let queryData = initialData;
  let queryError = initialError;

  const builder = {
    select: vi.fn((columns) => builder),
    eq: vi.fn((column, value) => builder),
    ilike: vi.fn((column, pattern) => builder),
    gte: vi.fn((column, value) => builder),
    order: vi.fn((column, options) => builder),
    single: vi.fn(() => Promise.resolve({ data: queryData[0] || null, error: queryError })),
  };

  // Make it thenable (Promise-like)
  builder.then = function(resolve) {
    return Promise.resolve({ data: queryData, error: queryError }).then(resolve);
  };
  builder.catch = function(reject) {
    return Promise.resolve({ data: queryData, error: queryError }).catch(reject);
  };

  return builder;
}

vi.mock('@supabase/supabase-js', () => {
  const createQueryBuilder = (initialData = [], initialError = null) => {
    let queryData = initialData;
    let queryError = initialError;

    const builder = {
      select: vi.fn((columns) => builder),
      eq: vi.fn((column, value) => builder),
      ilike: vi.fn((column, pattern) => builder),
      gte: vi.fn((column, value) => builder),
      order: vi.fn((column, options) => builder),
      single: vi.fn(() => Promise.resolve({ data: queryData[0] || null, error: queryError })),
    };

    builder.then = function(resolve) {
      return Promise.resolve({ data: queryData, error: queryError }).then(resolve);
    };
    builder.catch = function(reject) {
      return Promise.resolve({ data: queryData, error: queryError }).catch(reject);
    };

    return builder;
  };

  const mockSupabase = {
    from: vi.fn((table) => {
      const tableBuilder = {
        select: vi.fn((columns) => createQueryBuilder([], null)),
        insert: vi.fn((data) => ({
          select: vi.fn(() => Promise.resolve({ data: [{ id: 1, ...data }], error: null })),
        })),
        update: vi.fn((data) => {
          const chainableBuilder = {
            eq: vi.fn(() => chainableBuilder),
            select: vi.fn(() => chainableBuilder),
            single: vi.fn(() => Promise.resolve({ data: { id: 1, ...data }, error: null })),
            then: (resolve) => Promise.resolve({ data: [{ id: 1, ...data }], error: null }).then(resolve),
            catch: (reject) => Promise.resolve({ data: [], error: null }).catch(reject),
          };
          return chainableBuilder;
        }),
        delete: vi.fn(() => {
          const chainableBuilder = {
            eq: vi.fn(() => chainableBuilder),
            select: vi.fn(() => Promise.resolve({ data: [{ id: 1 }], error: null })),
            then: (resolve) => Promise.resolve({ data: [{ id: 1 }], error: null }).then(resolve),
            catch: (reject) => Promise.resolve({ data: [], error: null }).catch(reject),
          };
          return chainableBuilder;
        }),
      };
      return tableBuilder;
    }),
  };

  return {
    createClient: vi.fn(() => mockSupabase),
  };
});

vi.mock('../../auth.js', () => ({
  auth: vi.fn((req, res, next) => {
    const h = req.headers.authorization || "";
    const token = h.startsWith("Bearer ") ? h.split(" ")[1]?.trim() : null;
    if (!token) {
      return res.status(401).json({ error: "NO_TOKEN" });
    }
    req.user = { id: 1 };
    next();
  }),
}));

// ============================================
// SETUP
// ============================================

let app;

beforeAll(() => {
  process.env.SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_ANON_KEY = 'test-key';
  
  app = express();
  app.use(express.json());
  app.use('/api/industry-contacts', industryContactsRouter);
});

beforeEach(() => {
  vi.clearAllMocks();
});

// ============================================
// TESTS
// ============================================

describe('Industry Contacts Routes - Full Coverage', () => {
  describe('GET /api/industry-contacts/contact-suggestions', () => {
    it('should return contact suggestions by company', async () => {
      const res = await request(app)
        .get('/api/industry-contacts/contact-suggestions?company=Google')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.suggestions).toBeDefined();
    });

    it('should return empty array if no company', async () => {
      const res = await request(app)
        .get('/api/industry-contacts/contact-suggestions')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.suggestions).toEqual([]);
    });
  });

  describe('GET /api/industry-contacts/suggestions', () => {
    it('should return suggestions', async () => {
      const res = await request(app)
        .get('/api/industry-contacts/suggestions')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });

    it('should filter by company', async () => {
      const res = await request(app)
        .get('/api/industry-contacts/suggestions?company=Google')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });

    it('should filter by role', async () => {
      const res = await request(app)
        .get('/api/industry-contacts/suggestions?role=Engineer')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/industry-contacts/suggestions', () => {
    it('should create suggestion', async () => {
      const res = await request(app)
        .post('/api/industry-contacts/suggestions')
        .set('Authorization', 'Bearer valid-token')
        .send({
          first_name: 'John',
          last_name: 'Doe',
          company: 'Tech Corp',
        });

      expect(res.status).toBe(201);
    });

    it('should return 400 for missing required fields', async () => {
      const res = await request(app)
        .post('/api/industry-contacts/suggestions')
        .set('Authorization', 'Bearer valid-token')
        .send({
          first_name: 'John',
        });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/industry-contacts/discovery-analytics', () => {
    it('should return analytics', async () => {
      const res = await request(app)
        .get('/api/industry-contacts/discovery-analytics')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/industry-contacts/companies', () => {
    it('should return companies', async () => {
      const res = await request(app)
        .get('/api/industry-contacts/companies')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('PUT /api/industry-contacts/suggestions/:id/action', () => {
    it('should update suggestion action', async () => {
      const res = await request(app)
        .put('/api/industry-contacts/suggestions/1/action')
        .set('Authorization', 'Bearer valid-token')
        .send({ action_status: 'contacted' });

      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/industry-contacts/connection-paths', () => {
    it('should return connection paths', async () => {
      const res = await request(app)
        .get('/api/industry-contacts/connection-paths')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });

    it('should filter by degree', async () => {
      const res = await request(app)
        .get('/api/industry-contacts/connection-paths?degree_filter=2')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/industry-contacts/connection-paths', () => {
    it('should create connection path', async () => {
      const res = await request(app)
        .post('/api/industry-contacts/connection-paths')
        .set('Authorization', 'Bearer valid-token')
        .send({
          mutual_contact_name: 'John Doe',
          target_contact_name: 'Jane Smith',
          target_company: 'Tech Corp',
          connection_degree: 2,
        });

      expect(res.status).toBe(201);
    });

    it('should return 400 for missing required fields', async () => {
      const res = await request(app)
        .post('/api/industry-contacts/connection-paths')
        .set('Authorization', 'Bearer valid-token')
        .send({
          mutual_contact_name: 'John Doe',
        });

      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/industry-contacts/connection-paths/:id/introduce', () => {
    it('should mark introduction as sent', async () => {
      const res = await request(app)
        .put('/api/industry-contacts/connection-paths/1/introduce')
        .set('Authorization', 'Bearer valid-token')
        .send({ introduction_message: 'Hello' });

      expect(res.status).toBe(200);
    });
  });

  describe('PUT /api/industry-contacts/connection-paths/:id', () => {
    it('should update connection path', async () => {
      const res = await request(app)
        .put('/api/industry-contacts/connection-paths/1')
        .set('Authorization', 'Bearer valid-token')
        .send({ 
          mutual_contact_name: 'Updated Name',
          introduction_message: 'Updated notes' 
        });

      expect(res.status).toBe(200);
    });
  });

  describe('DELETE /api/industry-contacts/connection-paths/:id', () => {
    it('should delete connection path', async () => {
      const res = await request(app)
        .delete('/api/industry-contacts/connection-paths/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/industry-contacts/industry-leaders', () => {
    it('should return industry leaders', async () => {
      const res = await request(app)
        .get('/api/industry-contacts/industry-leaders')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });

    it('should filter by industry', async () => {
      const res = await request(app)
        .get('/api/industry-contacts/industry-leaders?industry=Technology')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/industry-contacts/industry-leaders', () => {
    it('should create industry leader', async () => {
      const res = await request(app)
        .post('/api/industry-contacts/industry-leaders')
        .set('Authorization', 'Bearer valid-token')
        .send({
          first_name: 'John',
          last_name: 'Leader',
          company: 'Tech Corp',
          industry: 'Technology',
        });

      expect(res.status).toBe(201);
    });

    it('should return 400 for missing required fields', async () => {
      const res = await request(app)
        .post('/api/industry-contacts/industry-leaders')
        .set('Authorization', 'Bearer valid-token')
        .send({
          first_name: 'John',
        });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/industry-contacts/alumni', () => {
    it('should return alumni', async () => {
      const res = await request(app)
        .get('/api/industry-contacts/alumni')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });

    it('should filter by institution', async () => {
      const res = await request(app)
        .get('/api/industry-contacts/alumni?institution=MIT')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/industry-contacts/alumni', () => {
    it('should create alumni contact', async () => {
      const res = await request(app)
        .post('/api/industry-contacts/alumni')
        .set('Authorization', 'Bearer valid-token')
        .send({
          first_name: 'Jane',
          last_name: 'Alumni',
          education_institution: 'MIT',
          graduation_year: 2020,
        });

      expect(res.status).toBe(201);
    });

    it('should return 400 for missing required fields', async () => {
      const res = await request(app)
        .post('/api/industry-contacts/alumni')
        .set('Authorization', 'Bearer valid-token')
        .send({
          first_name: 'Jane',
        });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/industry-contacts/event-participants', () => {
    it('should return event participants', async () => {
      const res = await request(app)
        .get('/api/industry-contacts/event-participants')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/industry-contacts/event-participants', () => {
    it('should create event participant', async () => {
      const res = await request(app)
        .post('/api/industry-contacts/event-participants')
        .set('Authorization', 'Bearer valid-token')
        .send({
          first_name: 'Bob',
          last_name: 'Speaker',
          event_name: 'Tech Conference 2024',
        });

      expect(res.status).toBe(201);
    });

    it('should return 400 for missing required fields', async () => {
      const res = await request(app)
        .post('/api/industry-contacts/event-participants')
        .set('Authorization', 'Bearer valid-token')
        .send({
          first_name: 'Bob',
        });

      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/industry-contacts/suggestions/:id', () => {
    it('should update suggestion', async () => {
      const res = await request(app)
        .put('/api/industry-contacts/suggestions/1')
        .set('Authorization', 'Bearer valid-token')
        .send({ first_name: 'Updated Name' });

      expect(res.status).toBe(200);
    });
  });

  describe('DELETE /api/industry-contacts/suggestions/:id', () => {
    it('should delete suggestion', async () => {
      const res = await request(app)
        .delete('/api/industry-contacts/suggestions/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });
  });

  describe('PUT /api/industry-contacts/alumni/:id', () => {
    it('should update alumni', async () => {
      const res = await request(app)
        .put('/api/industry-contacts/alumni/1')
        .set('Authorization', 'Bearer valid-token')
        .send({ first_name: 'Updated' });

      expect(res.status).toBe(200);
    });
  });

  describe('DELETE /api/industry-contacts/alumni/:id', () => {
    it('should delete alumni', async () => {
      const res = await request(app)
        .delete('/api/industry-contacts/alumni/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });
  });

  describe('PUT /api/industry-contacts/event-participants/:id', () => {
    it('should update event participant', async () => {
      const res = await request(app)
        .put('/api/industry-contacts/event-participants/1')
        .set('Authorization', 'Bearer valid-token')
        .send({ first_name: 'Updated' });

      expect(res.status).toBe(200);
    });
  });

  describe('DELETE /api/industry-contacts/event-participants/:id', () => {
    it('should delete event participant', async () => {
      const res = await request(app)
        .delete('/api/industry-contacts/event-participants/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });
  });

  describe('PUT /api/industry-contacts/discovery-outreach/:type/:id', () => {
    it('should update outreach for suggestion', async () => {
      const res = await request(app)
        .put('/api/industry-contacts/discovery-outreach/suggestion/1')
        .set('Authorization', 'Bearer valid-token')
        .send({ outreach_date: '2024-01-01' });

      expect(res.status).toBe(200);
    });

    it('should update outreach for alumni', async () => {
      const res = await request(app)
        .put('/api/industry-contacts/discovery-outreach/alumni/1')
        .set('Authorization', 'Bearer valid-token')
        .send({ outreach_date: '2024-01-01' });

      expect(res.status).toBe(200);
    });

    it('should update outreach for event participant', async () => {
      const res = await request(app)
        .put('/api/industry-contacts/discovery-outreach/event_participant/1')
        .set('Authorization', 'Bearer valid-token')
        .send({ outreach_date: '2024-01-01' });

      expect(res.status).toBe(200);
    });

    it('should return 400 for invalid type', async () => {
      const res = await request(app)
        .put('/api/industry-contacts/discovery-outreach/invalid/1')
        .set('Authorization', 'Bearer valid-token')
        .send({ outreach_date: '2024-01-01' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/industry-contacts/reminders', () => {
    it('should create reminder', async () => {
      const res = await request(app)
        .post('/api/industry-contacts/reminders')
        .set('Authorization', 'Bearer valid-token')
        .send({
          contact_id: 1,
          reminder_date: '2024-01-01',
          reminder_notes: 'Follow up',
        });

      expect(res.status).toBe(201);
    });

    it('should return 400 for missing required fields', async () => {
      const res = await request(app)
        .post('/api/industry-contacts/reminders')
        .set('Authorization', 'Bearer valid-token')
        .send({
          reminder_notes: 'Follow up',
        });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/industry-contacts/reminders', () => {
    it('should return reminders', async () => {
      const res = await request(app)
        .get('/api/industry-contacts/reminders')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });
  });

  describe('DELETE /api/industry-contacts/reminders/:id', () => {
    it('should delete reminder', async () => {
      const res = await request(app)
        .delete('/api/industry-contacts/reminders/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/industry-contacts/recurring-check-ins', () => {
    it('should create recurring check-in', async () => {
      const res = await request(app)
        .post('/api/industry-contacts/recurring-check-ins')
        .set('Authorization', 'Bearer valid-token')
        .send({
          contact_id: 1,
          frequency: 'monthly',
        });

      expect(res.status).toBe(201);
    });

    it('should return 400 for missing required fields', async () => {
      const res = await request(app)
        .post('/api/industry-contacts/recurring-check-ins')
        .set('Authorization', 'Bearer valid-token')
        .send({
          frequency: 'monthly',
        });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/industry-contacts/recurring-check-ins', () => {
    it('should return recurring check-ins', async () => {
      const res = await request(app)
        .get('/api/industry-contacts/recurring-check-ins')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/industry-contacts/generate-periodic-reminders', () => {
    it('should generate periodic reminders', async () => {
      const res = await request(app)
        .post('/api/industry-contacts/generate-periodic-reminders')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });
  });

  describe('DELETE /api/industry-contacts/recurring-check-ins/:id', () => {
    it('should delete recurring check-in', async () => {
      const res = await request(app)
        .delete('/api/industry-contacts/recurring-check-ins/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/industry-contacts/seed-demo-data', () => {
    it('should seed demo data', async () => {
      const res = await request(app)
        .post('/api/industry-contacts/seed-demo-data')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/industry-contacts/all-outreach', () => {
    it('should return all outreach', async () => {
      const res = await request(app)
        .get('/api/industry-contacts/all-outreach')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });
  });

  describe('Error handling', () => {
    it('should handle missing authentication', async () => {
      const res = await request(app)
        .get('/api/industry-contacts/suggestions');

      expect(res.status).toBe(401);
    });
  });
});

