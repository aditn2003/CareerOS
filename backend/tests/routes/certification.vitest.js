/**
 * Certification Routes - Full Coverage Tests
 * File: backend/routes/certification.js
 */

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import certificationRouter from '../../routes/certification.js';

// ============================================
// MOCKS
// ============================================

// Create mock query function using a getter to avoid hoisting issues
let mockQueryFn;

vi.mock('pg', () => {
  // Create the mock function inside the factory
  const queryFn = vi.fn();
  // Store reference in global to access from tests
  if (typeof globalThis !== 'undefined') {
    globalThis.__certificationMockQueryFn = queryFn;
  }
  
  const mockPool = {
    query: queryFn,
  };
  // Create a proper constructor function
  function MockPool() {
    return mockPool;
  }
  return {
    default: {
      Pool: MockPool,
    },
    Pool: MockPool,
  };
});

vi.mock('jsonwebtoken', () => ({
  default: {
    verify: vi.fn((token) => {
      if (token === 'valid-token') return { id: 1 };
      throw new Error('Invalid token');
    }),
  },
}));

// ============================================
// SETUP
// ============================================

let app;

beforeAll(() => {
  // Initialize mockQueryFn after mocks are set up
  mockQueryFn = globalThis.__certificationMockQueryFn || vi.fn();
  
  process.env.JWT_SECRET = 'test-secret';
  
  app = express();
  app.use(express.json());
  app.use('/api', certificationRouter);
});

beforeEach(() => {
  // Ensure mockQueryFn is available
  if (!mockQueryFn) {
    mockQueryFn = globalThis.__certificationMockQueryFn || vi.fn();
  }
  vi.clearAllMocks();
  // Re-assign after clearing to ensure it's still available
  mockQueryFn = globalThis.__certificationMockQueryFn || vi.fn();
});

// ============================================
// TESTS
// ============================================

describe('Certification Routes - Full Coverage', () => {
  describe('POST /api/certifications', () => {
    it('should add certification', async () => {
      const mockCert = {
        id: 1,
        user_id: 1,
        name: 'AWS Certified Solutions Architect',
        organization: 'Amazon Web Services',
        category: 'Cloud',
        cert_number: 'AWS-12345',
        date_earned: '2023-01-15',
        expiration_date: '2026-01-15',
        does_not_expire: false,
        document_url: null,
        renewal_reminder: null,
        verified: true,
      };

      mockQueryFn.mockResolvedValueOnce({ rows: [mockCert], rowCount: 1 });

      const res = await request(app)
        .post('/api/certifications')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'AWS Certified Solutions Architect',
          organization: 'Amazon Web Services',
          category: 'Cloud',
          cert_number: 'AWS-12345',
          date_earned: '2023-01-15',
          expiration_date: '2026-01-15',
          does_not_expire: false,
          verified: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Certification added');
      expect(res.body.certification).toEqual(mockCert);
    });

    it('should return 400 if required fields missing', async () => {
      const res = await request(app)
        .post('/api/certifications')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'AWS Certified Solutions Architect',
          // Missing organization
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('required');
    });

    it('should handle does_not_expire flag', async () => {
      const mockCert = {
        id: 1,
        name: 'Permanent Certification',
        organization: 'Test Org',
        expiration_date: null,
        does_not_expire: true,
      };

      mockQueryFn.mockResolvedValueOnce({ rows: [mockCert], rowCount: 1 });

      const res = await request(app)
        .post('/api/certifications')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'Permanent Certification',
          organization: 'Test Org',
          does_not_expire: true,
        });

      expect(res.status).toBe(200);
    });

    it('should handle optional fields', async () => {
      const mockCert = {
        id: 1,
        name: 'Basic Certification',
        organization: 'Test Org',
        category: null,
        cert_number: null,
        date_earned: null,
        expiration_date: null,
        does_not_expire: false,
        document_url: null,
        renewal_reminder: null,
        verified: false,
      };

      mockQueryFn.mockResolvedValueOnce({ rows: [mockCert], rowCount: 1 });

      const res = await request(app)
        .post('/api/certifications')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'Basic Certification',
          organization: 'Test Org',
        });

      expect(res.status).toBe(200);
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .post('/api/certifications')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'Test Certification',
          organization: 'Test Org',
        });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Database error while adding certification');
    });
  });

  describe('GET /api/certifications', () => {
    it('should return all certifications', async () => {
      const mockCerts = [
        { id: 1, name: 'AWS Certified', organization: 'AWS' },
        { id: 2, name: 'GCP Certified', organization: 'Google' },
      ];

      mockQueryFn.mockResolvedValueOnce({ rows: mockCerts, rowCount: 2 });

      const res = await request(app)
        .get('/api/certifications')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.certifications).toEqual(mockCerts);
    });

    it('should return empty array when no certifications', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = await request(app)
        .get('/api/certifications')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.certifications).toEqual([]);
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .get('/api/certifications')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to load certifications');
    });
  });

  describe('PUT /api/certifications/:id', () => {
    it('should update certification', async () => {
      const updatedCert = {
        id: 1,
        name: 'Updated Certification',
        organization: 'Updated Org',
      };

      mockQueryFn.mockResolvedValueOnce({ rows: [updatedCert], rowCount: 1 });

      const res = await request(app)
        .put('/api/certifications/1')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'Updated Certification',
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Certification updated');
    });

    it('should return 404 if certification not found', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = await request(app)
        .put('/api/certifications/999')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'Updated Certification',
        });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Certification not found');
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .put('/api/certifications/1')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'Updated Certification',
        });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Update failed');
    });
  });

  describe('DELETE /api/certifications/:id', () => {
    it('should delete certification', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 });

      const res = await request(app)
        .delete('/api/certifications/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Certification deleted successfully');
    });

    it('should return 404 if certification not found', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = await request(app)
        .delete('/api/certifications/999')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Certification not found');
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .delete('/api/certifications/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Delete failed');
    });
  });
});

