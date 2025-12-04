/**
 * Custom Reports Routes - Full Coverage Tests
 * File: backend/routes/customReports.js
 */

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import customReportsRouter from '../../routes/customReports.js';

// ============================================
// MOCKS
// ============================================

vi.mock('../../db/pool.js', () => ({
  default: {
    query: vi.fn(),
  },
}));

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

vi.mock('pdfkit', () => {
  const mockDoc = {
    pipe: vi.fn(),
    text: vi.fn(),
    font: vi.fn(),
    fontSize: vi.fn(),
    moveDown: vi.fn(),
    addPage: vi.fn(),
    end: vi.fn(),
  };
  return {
    default: vi.fn(() => mockDoc),
  };
});

// ============================================
// SETUP
// ============================================

let app;
let mockQueryFn;

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret';
  
  app = express();
  app.use(express.json());
  app.use('/api/custom-reports', customReportsRouter);
});

beforeEach(async () => {
  vi.clearAllMocks();
  const pool = (await import('../../db/pool.js')).default;
  mockQueryFn = pool.query;
});

// ============================================
// TESTS
// ============================================

describe('Custom Reports Routes - Full Coverage', () => {
  describe('GET /api/custom-reports/templates', () => {
    it('should return all report templates', async () => {
      const res = await request(app)
        .get('/api/custom-reports/templates')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.templates).toBeDefined();
      expect(Array.isArray(res.body.templates)).toBe(true);
    });

    it('should return 401 if no token provided', async () => {
      const res = await request(app)
        .get('/api/custom-reports/templates');

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/custom-reports/generate', () => {
    it('should generate comprehensive report', async () => {
      const mockJobs = [
        { id: 1, status: 'Applied', company: 'TechCorp', created_at: '2024-01-01' },
        { id: 2, status: 'Interview', company: 'Startup', created_at: '2024-01-02' },
      ];

      mockQueryFn.mockResolvedValueOnce({ rows: mockJobs });

      const res = await request(app)
        .post('/api/custom-reports/generate')
        .set('Authorization', 'Bearer valid-token')
        .send({
          template: 'comprehensive',
          format: 'pdf',
        });

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/pdf');
    });

    it('should generate overview report', async () => {
      const mockJobs = [
        { id: 1, status: 'Applied', company: 'TechCorp', created_at: '2024-01-01' },
      ];

      mockQueryFn.mockResolvedValueOnce({ rows: mockJobs });

      const res = await request(app)
        .post('/api/custom-reports/generate')
        .set('Authorization', 'Bearer valid-token')
        .send({
          template: 'overview',
          format: 'pdf',
        });

      expect(res.status).toBe(200);
    });

    it('should handle filters', async () => {
      const mockJobs = [
        { id: 1, status: 'Applied', company: 'TechCorp', industry: 'Technology', created_at: '2024-01-01' },
      ];

      mockQueryFn.mockResolvedValueOnce({ rows: mockJobs });

      const res = await request(app)
        .post('/api/custom-reports/generate')
        .set('Authorization', 'Bearer valid-token')
        .send({
          template: 'comprehensive',
          format: 'pdf',
          filters: {
            dateRange: { start: '2024-01-01', end: '2024-12-31' },
            industries: ['Technology'],
            companies: ['TechCorp'],
          },
        });

      expect(res.status).toBe(200);
    });

    it('should return 400 for invalid template', async () => {
      const res = await request(app)
        .post('/api/custom-reports/generate')
        .set('Authorization', 'Bearer valid-token')
        .send({
          template: 'invalid-template',
          format: 'pdf',
        });

      expect(res.status).toBe(400);
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .post('/api/custom-reports/generate')
        .set('Authorization', 'Bearer valid-token')
        .send({
          template: 'comprehensive',
          format: 'pdf',
        });

      expect(res.status).toBe(500);
    });
  });

  describe('GET /api/custom-reports/filter-options', () => {
    it('should return filter options', async () => {
      const mockJobs = [
        { company: 'TechCorp', industry: 'Technology', status: 'Applied' },
        { company: 'Startup', industry: 'Technology', status: 'Interview' },
      ];

      mockQueryFn.mockResolvedValueOnce({ rows: mockJobs });

      const res = await request(app)
        .get('/api/custom-reports/filter-options')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.options).toBeDefined();
      expect(res.body.options.companies).toBeDefined();
      expect(res.body.options.industries).toBeDefined();
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .get('/api/custom-reports/filter-options')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
    });
  });
});

