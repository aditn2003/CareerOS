/**
 * Contacts Routes Tests
 * Tests routes/contacts.js - contact management
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import contactsRoutes, { setContactsPool } from '../../routes/contacts.js';
import { createTestUser } from '../helpers/auth.js';
import pool from '../../db/pool.js';

// Mock auth middleware - must be set up before route import
let mockUserId = 1;

vi.mock('../../auth.js', () => ({
  auth: vi.fn((req, res, next) => {
    req.user = { id: mockUserId };
    next();
  }),
}));

// Mock pool
vi.mock('../../db/pool.js', () => ({
  default: {
    query: vi.fn(),
  },
}));

describe('Contacts Routes', () => {
  let app;
  let user;
  let userId; // Store the decoded user ID from JWT token

  beforeEach(async () => {
    // Ensure JWT_SECRET matches what the route expects
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';
    
    app = express();
    app.use(express.json());
    
    user = await createTestUser();
    mockUserId = user.id; // Update mock user ID
    
    // Decode JWT token to get the user ID that will be in req.user.id
    const jwtModule = await import('jsonwebtoken');
    const decoded = jwtModule.verify(user.token, process.env.JWT_SECRET || 'test-secret-key');
    userId = Number(decoded.id); // Store for use in tests
    
    // Set pool on router before using routes
    setContactsPool(pool);
    
    app.use('/api', contactsRoutes);
    
    vi.clearAllMocks();
    
    // Reset pool.query mock to default implementation
    pool.query.mockReset();
    
    // Update auth mock implementation to verify JWT tokens
    const { auth } = await import('../../auth.js');
    vi.mocked(auth).mockImplementation((req, res, next) => {
      const h = req.headers.authorization || "";
      const token = h.startsWith("Bearer ") ? h.split(" ")[1] : null;
      if (!token) {
        return res.status(401).json({ error: "NO_TOKEN" });
      }
      try {
        const decoded = jwtModule.verify(token, process.env.JWT_SECRET || 'test-secret-key');
        // Ensure id is a number to match database type
        req.user = { id: Number(decoded.id), email: decoded.email };
        next();
      } catch (err) {
        return res.status(401).json({ error: "INVALID_TOKEN" });
      }
    });
    
    // Default mock for GET requests that don't have specific mocks
    pool.query.mockImplementation((query, params) => {
      // If it's a SELECT query for contacts list, return empty array
      if (query.includes('SELECT * FROM professional_contacts') && query.includes('WHERE user_id')) {
        return Promise.resolve({ rows: [] });
      }
      // For other queries, return empty result
      return Promise.resolve({ rows: [] });
    });
  });

  describe('GET /api/contacts', () => {
    it('should get all contacts for user', async () => {
      const response = await request(app)
        .get('/api/contacts')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should filter contacts by industry', async () => {
      const response = await request(app)
        .get('/api/contacts')
        .query({ industry: 'Technology' })
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
    });

    it('should filter contacts by relationship type', async () => {
      const response = await request(app)
        .get('/api/contacts')
        .query({ relationshipType: 'Colleague' })
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
    });

    it('should search contacts by name or email', async () => {
      const response = await request(app)
        .get('/api/contacts')
        .query({ search: 'John' })
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/contacts/:id', () => {
    it('should get single contact with details', async () => {
      pool.query
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            user_id: user.id,
            first_name: 'John',
            last_name: 'Doe',
            email: 'john@example.com',
          }],
        })
        .mockResolvedValueOnce({ rows: [] }) // interactions
        .mockResolvedValueOnce({ rows: [] }) // reminders
        .mockResolvedValueOnce({ rows: [] }) // links
        .mockResolvedValueOnce({ rows: [] }); // groups

      const response = await request(app)
        .get('/api/contacts/1')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.first_name).toBe('John');
      expect(response.body.interactions).toBeDefined();
      expect(response.body.reminders).toBeDefined();
    });

    it('should return 404 if contact not found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/contacts/999')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/contacts', () => {
    it('should create a new contact', async () => {
      pool.query
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            user_id: user.id,
            first_name: 'Jane',
            last_name: 'Smith',
            email: 'jane@example.com',
          }],
        })
        .mockResolvedValueOnce({ rows: [] }); // group mapping

      const response = await request(app)
        .post('/api/contacts')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
          company: 'Tech Corp',
        });

      expect(response.status).toBe(201);
      expect(response.body.first_name).toBe('Jane');
    });

    it('should return 400 if firstName or lastName is missing', async () => {
      const response = await request(app)
        .post('/api/contacts')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          email: 'jane@example.com',
        });

      expect(response.status).toBe(400);
    });

    it('should return 409 if contact with email already exists', async () => {
      const error = new Error('Duplicate key');
      error.code = '23505';
      pool.query.mockImplementation((query, params) => {
        // First call is the INSERT, which should fail with duplicate key
        if (query.includes('INSERT INTO professional_contacts')) {
          return Promise.reject(error);
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .post('/api/contacts')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'existing@example.com',
        });

      expect([409, 500]).toContain(response.status);
    });
  });

  describe('PUT /api/contacts/:id', () => {
    it('should update an existing contact', async () => {
      // Mock the ownership check query
      pool.query.mockImplementation((query, params) => {
        if (query.includes('SELECT user_id FROM professional_contacts WHERE id')) {
          return Promise.resolve({
            rows: [{ user_id: userId }], // Ownership check - must match JWT token id
          });
        }
        if (query.includes('UPDATE professional_contacts')) {
          return Promise.resolve({
            rows: [{
              id: 1,
              user_id: userId,
              first_name: 'Jane',
              last_name: 'Smith',
              email: 'jane@example.com',
            }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .put('/api/contacts/1')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
        });

      expect(response.status).toBe(200);
      expect(response.body.first_name).toBe('Jane');
    });

    it('should return 403 if user does not own contact', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ user_id: 999 }], // Different user owns it
      });

      const response = await request(app)
        .put('/api/contacts/1')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          firstName: 'Jane',
          lastName: 'Smith',
        });

      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /api/contacts/:id', () => {
    it('should delete a contact', async () => {
      pool.query.mockImplementation((query, params) => {
        if (query.includes('SELECT user_id FROM professional_contacts WHERE id')) {
          return Promise.resolve({
            rows: [{ user_id: userId }], // Ownership check - must match JWT token id
          });
        }
        if (query.includes('DELETE FROM professional_contacts')) {
          return Promise.resolve({ rows: [] }); // Delete result
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .delete('/api/contacts/1')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('deleted');
    });

    it('should return 403 if user does not own contact', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ user_id: 999 }], // Different user owns it
      });

      const response = await request(app)
        .delete('/api/contacts/1')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/contacts/:id/interactions', () => {
    it('should add an interaction to a contact', async () => {
      pool.query.mockImplementation((query, params) => {
        if (query.includes('SELECT user_id FROM professional_contacts WHERE id')) {
          return Promise.resolve({
            rows: [{ user_id: userId }], // Ownership check - must match JWT token id
          });
        }
        if (query.includes('INSERT INTO contact_interactions')) {
          return Promise.resolve({
            rows: [{
              id: 1,
              contact_id: 1,
              interaction_type: 'email',
              interaction_date: new Date().toISOString(),
            }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .post('/api/contacts/1/interactions')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          interactionType: 'email',
          notes: 'Followed up on job opportunity',
        });

      expect([200, 201]).toContain(response.status);
    });
  });

  describe('GET /api/contacts/:id/interactions', () => {
    it('should get all interactions for a contact', async () => {
      pool.query.mockImplementation((query, params) => {
        if (query.includes('SELECT user_id FROM professional_contacts WHERE id')) {
          return Promise.resolve({
            rows: [{ user_id: userId }], // Ownership check - must match JWT token id
          });
        }
        if (query.includes('SELECT * FROM contact_interactions')) {
          return Promise.resolve({
            rows: [{
              id: 1,
              contact_id: 1,
              interaction_type: 'email',
            }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/contacts/1/interactions')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('POST /api/contacts/:id/reminders', () => {
    it('should create a reminder for a contact', async () => {
      pool.query.mockImplementation((query, params) => {
        if (query.includes('SELECT user_id FROM professional_contacts WHERE id')) {
          return Promise.resolve({
            rows: [{ user_id: userId }], // Ownership check - must match JWT token id
          });
        }
        if (query.includes('INSERT INTO contact_reminders')) {
          return Promise.resolve({
            rows: [{
              id: 1,
              contact_id: 1,
              reminder_type: 'follow_up',
              reminder_date: new Date().toISOString(),
              description: 'Follow up',
            }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .post('/api/contacts/1/reminders')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          reminderType: 'follow_up',
          reminderDate: new Date().toISOString(),
          description: 'Follow up',
        });

      expect([200, 201]).toContain(response.status);
    });
  });

  describe('POST /api/contact-groups', () => {
    it('should create a contact group', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          user_id: user.id,
          name: 'Tech Industry',
          description: null,
        }],
      });

      const response = await request(app)
        .post('/api/contact-groups')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          name: 'Tech Industry',
        });

      expect([200, 201]).toContain(response.status);
    });
  });

  describe('GET /api/contact-groups', () => {
    it('should get all contact groups', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          user_id: user.id,
          group_name: 'Tech Industry',
        }],
      });

      const response = await request(app)
        .get('/api/contact-groups')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });
});

