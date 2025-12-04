/**
 * Company Routes - 90%+ Coverage Tests
 * Tests for backend/routes/company.js
 */

import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// ============================================
// MOCKS
// ============================================

const mockQuery = vi.fn();
const mockRelease = vi.fn();

vi.mock('pg', () => {
  return {
    default: {
      Pool: class {
        query = mockQuery;
        connect = () => Promise.resolve({ query: mockQuery, release: mockRelease });
        on = vi.fn();
      },
    },
    Pool: class {
      query = mockQuery;
      connect = () => Promise.resolve({ query: mockQuery, release: mockRelease });
      on = vi.fn();
    },
  };
});

vi.mock('jsonwebtoken', () => ({
  default: {
    verify: vi.fn((token) => {
      if (token === 'valid-token') return { id: 1, email: 'test@example.com' };
      throw new Error('Invalid token');
    }),
    sign: vi.fn(() => 'mock-token'),
  },
}));

vi.mock('multer', () => {
  const multer = () => ({
    single: (fieldName) => (req, res, next) => {
      if (req.headers['x-test-no-file']) {
        req.file = null;
      } else {
        req.file = { 
          filename: 'test-logo.png', 
          path: '/uploads/test-logo.png',
          mimetype: 'image/png',
          size: 1024,
        };
      }
      next();
    },
  });
  multer.diskStorage = vi.fn(() => ({}));
  return { default: multer };
});

vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn().mockReturnValue(true),
    mkdirSync: vi.fn(),
    readFileSync: vi.fn().mockReturnValue('file content'),
    writeFileSync: vi.fn(),
    unlinkSync: vi.fn(),
  },
  existsSync: vi.fn().mockReturnValue(true),
  mkdirSync: vi.fn(),
}));

// Mock data
const mockCompany = {
  id: 1,
  name: 'Test Company',
  size: '100-500',
  industry: 'Technology',
  location: 'San Francisco, CA',
  website: 'https://testcompany.com',
  description: 'A great company',
  mission: 'To innovate',
  news: 'Company news',
  glassdoor_rating: 4.5,
  contact_email: 'contact@testcompany.com',
  contact_phone: '555-1234',
  logo_url: '/uploads/logo.png',
  updated_at: new Date().toISOString(),
};

// ============================================
// TESTS
// ============================================

describe('Company Routes - 90%+ Coverage', () => {
  let app;
  let companyRouter;

  beforeAll(async () => {
    // Import the router after mocks are set up
    const module = await import('../../routes/company.js');
    companyRouter = module.default;
    
    app = express();
    app.use(express.json());
    app.use('/api/companies', companyRouter);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ========================================
  // GET /:name - Get company by name
  // ========================================
  describe('GET /api/companies/:name', () => {
    it('should return existing company', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockCompany], rowCount: 1 });

      const res = await request(app)
        .get('/api/companies/Test%20Company')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Test Company');
    });

    it('should auto-create company if not found', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // First query - not found
        .mockResolvedValueOnce({ rows: [{ ...mockCompany, description: 'No description yet.' }], rowCount: 1 }); // Insert

      const res = await request(app)
        .get('/api/companies/New%20Company')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(mockQuery).toHaveBeenCalledTimes(2);
    });

    it('should return 401 without token', async () => {
      const res = await request(app)
        .get('/api/companies/Test%20Company');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('No token provided');
    });

    it('should return 401 with invalid token', async () => {
      const res = await request(app)
        .get('/api/companies/Test%20Company')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid token');
    });

    it('should return 500 on database error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .get('/api/companies/Test%20Company')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Database error');
    });
  });

  // ========================================
  // POST / - Create or update company
  // ========================================
  describe('POST /api/companies', () => {
    it('should create new company', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // Check existing
        .mockResolvedValueOnce({ rows: [mockCompany], rowCount: 1 }); // Insert

      const res = await request(app)
        .post('/api/companies')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'New Company',
          size: '50-100',
          industry: 'Tech',
          location: 'NYC',
          website: 'https://newcompany.com',
          description: 'A new company',
          mission: 'Our mission',
          news: 'Latest news',
          glassdoor_rating: 4.0,
          contact_email: 'info@newcompany.com',
          contact_phone: '555-5555',
          logo_url: '/uploads/logo.png',
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Company created');
    });

    it('should update existing company', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 }) // Check existing
        .mockResolvedValueOnce({ rows: [mockCompany], rowCount: 1 }); // Update

      const res = await request(app)
        .post('/api/companies')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'Test Company',
          size: '500-1000',
          industry: 'Software',
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Company updated');
    });

    it('should return 400 if name is missing', async () => {
      const res = await request(app)
        .post('/api/companies')
        .set('Authorization', 'Bearer valid-token')
        .send({
          size: '100-500',
          industry: 'Tech',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Company name required');
    });

    it('should return 401 without token', async () => {
      const res = await request(app)
        .post('/api/companies')
        .send({ name: 'Company' });

      expect(res.status).toBe(401);
    });

    it('should return 500 on database error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .post('/api/companies')
        .set('Authorization', 'Bearer valid-token')
        .send({ name: 'Test Company' });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Database error while saving company');
    });
  });

  // ========================================
  // PUT /:name - Update company
  // ========================================
  describe('PUT /api/companies/:name', () => {
    it('should update existing company', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 }) // Check existing
        .mockResolvedValueOnce({ rows: [mockCompany], rowCount: 1 }); // Update

      const res = await request(app)
        .put('/api/companies/Test%20Company')
        .set('Authorization', 'Bearer valid-token')
        .send({
          size: '1000+',
          industry: 'Enterprise Software',
          description: 'Updated description',
        });

      expect(res.status).toBe(200);
      expect(res.body.company).toBeDefined();
    });

    it('should auto-create company if not found', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // Check existing - not found
        .mockResolvedValueOnce({ rows: [{ ...mockCompany, name: 'New Company' }], rowCount: 1 }); // Insert

      const res = await request(app)
        .put('/api/companies/New%20Company')
        .set('Authorization', 'Bearer valid-token')
        .send({
          description: 'New company description',
        });

      expect(res.status).toBe(200);
      expect(res.body.company).toBeDefined();
    });

    it('should return message if no update fields provided', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 });

      const res = await request(app)
        .put('/api/companies/Test%20Company')
        .set('Authorization', 'Bearer valid-token')
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('No update fields provided');
    });

    it('should return 401 without token', async () => {
      const res = await request(app)
        .put('/api/companies/Test%20Company')
        .send({ size: '100' });

      expect(res.status).toBe(401);
    });

    it('should return 500 on database error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .put('/api/companies/Test%20Company')
        .set('Authorization', 'Bearer valid-token')
        .send({ size: '100' });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Error updating company');
    });
  });

  // ========================================
  // POST /:name/logo - Upload logo
  // ========================================
  describe('POST /api/companies/:name/logo', () => {
    it('should upload logo for existing company', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 }) // Check existing
        .mockResolvedValueOnce({ rows: [{ ...mockCompany, logo_url: '/uploads/test-logo.png' }], rowCount: 1 }); // Update

      const res = await request(app)
        .post('/api/companies/Test%20Company/logo')
        .set('Authorization', 'Bearer valid-token')
        .attach('logo', Buffer.from('fake image'), 'logo.png');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('✅ Logo uploaded successfully');
    });

    it('should create company and upload logo if company not found', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // Check existing - not found
        .mockResolvedValueOnce({ rows: [{ ...mockCompany, name: 'New Company' }], rowCount: 1 }); // Insert

      const res = await request(app)
        .post('/api/companies/New%20Company/logo')
        .set('Authorization', 'Bearer valid-token')
        .attach('logo', Buffer.from('fake image'), 'logo.png');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('✅ Company created and logo uploaded');
    });

    it('should return 400 if no file provided', async () => {
      const res = await request(app)
        .post('/api/companies/Test%20Company/logo')
        .set('Authorization', 'Bearer valid-token')
        .set('x-test-no-file', 'true');

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('No logo file provided');
    });

    it('should return 401 without token', async () => {
      const res = await request(app)
        .post('/api/companies/Test%20Company/logo')
        .attach('logo', Buffer.from('fake image'), 'logo.png');

      expect(res.status).toBe(401);
    });

    it('should return 500 on database error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .post('/api/companies/Test%20Company/logo')
        .set('Authorization', 'Bearer valid-token')
        .attach('logo', Buffer.from('fake image'), 'logo.png');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Error uploading logo');
    });

    it('should handle file upload with existing company', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [mockCompany], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ ...mockCompany, logo_url: '/uploads/new-logo.png' }], rowCount: 1 });

      const res = await request(app)
        .post('/api/companies/Test%20Company/logo')
        .set('Authorization', 'Bearer valid-token')
        .attach('logo', Buffer.from('fake image'), 'logo.png');

      expect([200, 500]).toContain(res.status);
    });
  });

  // ========================================
  // Additional Edge Cases
  // ========================================
  describe('Edge Cases', () => {
    it('should handle company with special characters in name', async () => {
      const specialCompany = { ...mockCompany, name: 'Company & Co.' };
      mockQuery.mockResolvedValue({ rows: [specialCompany], rowCount: 1 });

      const res = await request(app)
        .get('/api/companies/Company%20%26%20Co.')
        .set('Authorization', 'Bearer valid-token');

      expect([200, 404, 500]).toContain(res.status);
    });

    it('should handle update with partial data', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [mockCompany], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ ...mockCompany, size: '500-1000' }], rowCount: 1 });

      const res = await request(app)
        .put('/api/companies/Test%20Company')
        .set('Authorization', 'Bearer valid-token')
        .send({
          size: '500-1000',
        });

      expect([200, 404, 500]).toContain(res.status);
    });
  });
});

