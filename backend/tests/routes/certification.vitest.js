/**
 * Certification Routes - 90%+ Coverage Tests
 * File: backend/routes/certification.js
 */

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

// ============================================
// MOCKS
// ============================================

const mockQueryFn = vi.fn();

vi.mock('pg', () => {
  return {
    default: {
      Pool: class {
        constructor() {}
        query = mockQueryFn;
        connect = vi.fn();
        end = vi.fn();
        on = vi.fn();
      },
    },
  };
});

vi.mock('jsonwebtoken', () => ({
  default: {
    verify: vi.fn((token, secret) => {
      if (token === 'valid-token') return { id: 1, email: 'test@example.com' };
      throw new Error('Invalid token');
    }),
    sign: vi.fn(() => 'mock-token'),
  },
}));

// ============================================
// MOCK DATA
// ============================================

const mockCertification = {
  id: 1,
  user_id: 1,
  name: 'AWS Solutions Architect',
  organization: 'Amazon Web Services',
  category: 'Cloud',
  cert_number: 'AWS-SA-12345',
  date_earned: '2023-06-15',
  expiration_date: '2026-06-15',
  does_not_expire: false,
  document_url: 'https://aws.amazon.com/verify/12345',
  renewal_reminder: '2026-03-15',
  verified: true,
};

// ============================================
// TEST SUITE
// ============================================

describe('Certification Routes - 90%+ Coverage', () => {
  let app;

  beforeAll(async () => {
    const certificationModule = await import('../../routes/certification.js');
    
    app = express();
    app.use(express.json());
    app.use('/api', certificationModule.default);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ========================================
  // POST /api/certifications - Add Certification
  // ========================================
  describe('POST /api/certifications', () => {
    it('should add certification with all fields', async () => {
      mockQueryFn.mockResolvedValueOnce({
        rows: [mockCertification],
        rowCount: 1,
      });

      const res = await request(app)
        .post('/api/certifications')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'AWS Solutions Architect',
          organization: 'Amazon Web Services',
          category: 'Cloud',
          cert_number: 'AWS-SA-12345',
          date_earned: '2023-06-15',
          expiration_date: '2026-06-15',
          does_not_expire: false,
          document_url: 'https://aws.amazon.com/verify/12345',
          renewal_reminder: '2026-03-15',
          verified: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Certification added');
      expect(res.body.certification).toEqual(mockCertification);
    });

    it('should add certification with only required fields', async () => {
      const minimalCert = {
        ...mockCertification,
        category: null,
        cert_number: null,
        date_earned: null,
        expiration_date: null,
        does_not_expire: false,
        document_url: null,
        renewal_reminder: null,
        verified: false,
      };

      mockQueryFn.mockResolvedValueOnce({
        rows: [minimalCert],
        rowCount: 1,
      });

      const res = await request(app)
        .post('/api/certifications')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'AWS Solutions Architect',
          organization: 'Amazon Web Services',
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Certification added');
    });

    it('should handle does_not_expire=true (expiration_date becomes null)', async () => {
      const noExpireCert = {
        ...mockCertification,
        expiration_date: null,
        does_not_expire: true,
      };

      mockQueryFn.mockResolvedValueOnce({
        rows: [noExpireCert],
        rowCount: 1,
      });

      const res = await request(app)
        .post('/api/certifications')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'AWS Solutions Architect',
          organization: 'Amazon Web Services',
          expiration_date: '2026-06-15', // Should be ignored
          does_not_expire: true,
        });

      expect(res.status).toBe(200);
    });

    it('should handle empty renewal_reminder string as null', async () => {
      mockQueryFn.mockResolvedValueOnce({
        rows: [{ ...mockCertification, renewal_reminder: null }],
        rowCount: 1,
      });

      const res = await request(app)
        .post('/api/certifications')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'AWS Solutions Architect',
          organization: 'Amazon Web Services',
          renewal_reminder: '   ', // Empty string with spaces
        });

      expect(res.status).toBe(200);
    });

    it('should return 400 when name is missing', async () => {
      const res = await request(app)
        .post('/api/certifications')
        .set('Authorization', 'Bearer valid-token')
        .send({
          organization: 'Amazon Web Services',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Certification name and organization are required');
    });

    it('should return 400 when organization is missing', async () => {
      const res = await request(app)
        .post('/api/certifications')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'AWS Solutions Architect',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Certification name and organization are required');
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .post('/api/certifications')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'AWS Solutions Architect',
          organization: 'Amazon Web Services',
        });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Database error while adding certification');
    });

    it('should return 401 without authorization', async () => {
      const res = await request(app)
        .post('/api/certifications')
        .send({
          name: 'AWS Solutions Architect',
          organization: 'Amazon Web Services',
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('No token provided');
    });

    it('should return 401 with invalid token', async () => {
      const res = await request(app)
        .post('/api/certifications')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          name: 'AWS Solutions Architect',
          organization: 'Amazon Web Services',
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid or expired token');
    });
  });

  // ========================================
  // GET /api/certifications - Get Certifications
  // ========================================
  describe('GET /api/certifications', () => {
    it('should return all certifications for user', async () => {
      mockQueryFn.mockResolvedValueOnce({
        rows: [mockCertification, { ...mockCertification, id: 2, name: 'GCP Certified' }],
        rowCount: 2,
      });

      const res = await request(app)
        .get('/api/certifications')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.certifications).toHaveLength(2);
    });

    it('should return empty array when user has no certifications', async () => {
      mockQueryFn.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

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

    it('should return 401 without authorization', async () => {
      const res = await request(app).get('/api/certifications');

      expect(res.status).toBe(401);
    });
  });

  // ========================================
  // PUT /api/certifications/:id - Update Certification
  // ========================================
  describe('PUT /api/certifications/:id', () => {
    it('should update certification with all fields', async () => {
      const updatedCert = {
        ...mockCertification,
        name: 'AWS Solutions Architect Professional',
        verified: true,
      };

      mockQueryFn.mockResolvedValueOnce({
        rows: [updatedCert],
        rowCount: 1,
      });

      const res = await request(app)
        .put('/api/certifications/1')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'AWS Solutions Architect Professional',
          organization: 'Amazon Web Services',
          category: 'Cloud',
          cert_number: 'AWS-SAP-12345',
          date_earned: '2024-01-15',
          expiration_date: '2027-01-15',
          does_not_expire: false,
          document_url: 'https://aws.amazon.com/verify/67890',
          renewal_reminder: '2026-10-15',
          verified: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Certification updated');
    });

    it('should update certification with partial fields', async () => {
      mockQueryFn.mockResolvedValueOnce({
        rows: [{ ...mockCertification, name: 'Updated Name' }],
        rowCount: 1,
      });

      const res = await request(app)
        .put('/api/certifications/1')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'Updated Name',
        });

      expect(res.status).toBe(200);
    });

    it('should convert empty date strings to null', async () => {
      mockQueryFn.mockResolvedValueOnce({
        rows: [{ ...mockCertification, date_earned: null, expiration_date: null }],
        rowCount: 1,
      });

      const res = await request(app)
        .put('/api/certifications/1')
        .set('Authorization', 'Bearer valid-token')
        .send({
          date_earned: '', // Empty string
          expiration_date: '  ', // Whitespace only
          renewal_reminder: '', // Empty string
        });

      expect(res.status).toBe(200);
    });

    it('should handle date fields with valid values', async () => {
      mockQueryFn.mockResolvedValueOnce({
        rows: [mockCertification],
        rowCount: 1,
      });

      const res = await request(app)
        .put('/api/certifications/1')
        .set('Authorization', 'Bearer valid-token')
        .send({
          date_earned: '2024-01-15',
          expiration_date: '2027-01-15',
          renewal_reminder: '2026-10-15',
        });

      expect(res.status).toBe(200);
    });

    it('should return 400 when no fields to update', async () => {
      const res = await request(app)
        .put('/api/certifications/1')
        .set('Authorization', 'Bearer valid-token')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('No fields to update');
    });

    it('should return 404 when certification not found', async () => {
      mockQueryFn.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      const res = await request(app)
        .put('/api/certifications/999')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'Updated Name',
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
          name: 'Updated Name',
        });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Update failed');
    });

    it('should return 401 without authorization', async () => {
      const res = await request(app)
        .put('/api/certifications/1')
        .send({
          name: 'Updated Name',
        });

      expect(res.status).toBe(401);
    });
  });

  // ========================================
  // DELETE /api/certifications/:id - Delete Certification
  // ========================================
  describe('DELETE /api/certifications/:id', () => {
    it('should delete certification', async () => {
      mockQueryFn.mockResolvedValueOnce({
        rows: [{ id: 1 }],
        rowCount: 1,
      });

      const res = await request(app)
        .delete('/api/certifications/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Certification deleted successfully');
    });

    it('should return 404 when certification not found', async () => {
      mockQueryFn.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

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

    it('should return 401 without authorization', async () => {
      const res = await request(app).delete('/api/certifications/1');

      expect(res.status).toBe(401);
    });
  });
});

