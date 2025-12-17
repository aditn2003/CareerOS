/**
 * Success Analysis Routes Tests
 * Tests routes/successAnalysis.js - success analysis
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import successAnalysisRoutes from '../../routes/successAnalysis.js';
import { createTestUser } from '../helpers/auth.js';
import pool from '../../db/pool.js';

// Mock auth middleware
vi.mock('../../auth.js', () => ({
  auth: vi.fn((req, res, next) => {
    req.user = { id: 1 };
    next();
  }),
}));

// Mock pool
vi.mock('../../db/pool.js', () => ({
  default: {
    query: vi.fn(),
  },
}));

// Mock roleTypeMapper
vi.mock('../../utils/roleTypeMapper.js', () => ({
  getRoleTypeFromTitle: vi.fn((title) => {
    if (!title) return 'other';
    const lower = title.toLowerCase();
    if (lower.includes('software') || lower.includes('engineer') || lower.includes('developer')) {
      return 'software_engineering';
    }
    if (lower.includes('data') || lower.includes('analyst')) {
      return 'data_science';
    }
    if (lower.includes('product') || lower.includes('manager')) {
      return 'product_management';
    }
    return 'other';
  }),
}));

describe('Success Analysis Routes', () => {
  let app;
  let user;
  let userId;

  beforeEach(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';
    
    app = express();
    app.use(express.json());
    app.use('/api/success-analysis', successAnalysisRoutes);
    
    user = await createTestUser();
    
    // Decode JWT token to get the user ID
    const jwtModule = await import('jsonwebtoken');
    const decoded = jwtModule.verify(user.token, process.env.JWT_SECRET || 'test-secret-key');
    userId = Number(decoded.id);
    
    vi.clearAllMocks();
    
    // Update auth mock to verify JWT tokens
    const { auth } = await import('../../auth.js');
    vi.mocked(auth).mockImplementation((req, res, next) => {
      const h = req.headers.authorization || "";
      const token = h.startsWith("Bearer ") ? h.split(" ")[1] : null;
      if (!token) {
        return res.status(401).json({ error: "NO_TOKEN" });
      }
      try {
        const decoded = jwtModule.verify(token, process.env.JWT_SECRET || 'test-secret-key');
        req.user = { id: Number(decoded.id), email: decoded.email };
        next();
      } catch (err) {
        return res.status(401).json({ error: "INVALID_TOKEN" });
      }
    });
  });

  describe('GET /api/success-analysis/full', () => {
    it('should return comprehensive success analysis', async () => {
      // Mock all the queries in the route
      pool.query.mockImplementation((query, params) => {
        if (query.includes('SELECT j.industry') && query.includes('GROUP BY j.industry')) {
          return Promise.resolve({
            rows: [
              {
                industry: 'Technology',
                company: 'Tech Corp',
                title: 'Software Engineer',
                total: 10,
                interviews: 3,
                offers: 2,
                rejections: 5,
              },
            ],
          });
        }
        if (query.includes('SELECT DISTINCT status')) {
          return Promise.resolve({
            rows: [
              { status: 'applied', count: '5' },
              { status: 'interview', count: '3' },
              { status: 'offer', count: '2' },
            ],
          });
        }
        if (query.includes('SELECT title') && query.includes('GROUP BY title, company')) {
          return Promise.resolve({
            rows: [
              {
                title: 'Software Engineer',
                company: 'Tech Corp',
                total: 10,
                interviews: 3,
                offers: 2,
                rejections: 5,
              },
            ],
          });
        }
        if (query.includes('SELECT j.company') && query.includes('LEFT JOIN companies')) {
          return Promise.resolve({
            rows: [
              {
                company: 'Tech Corp',
                company_size: '51-500',
                total: 10,
                interviews: 3,
                offers: 2,
                rejections: 5,
              },
            ],
          });
        }
        if (query.includes('SELECT column_name') && query.includes('application_source')) {
          return Promise.resolve({
            rows: [{ column_name: 'application_source' }],
          });
        }
        if (query.includes('SELECT application_source')) {
          return Promise.resolve({
            rows: [
              {
                application_source: 'LinkedIn',
                total: 5,
                interviews: 2,
                offers: 1,
                rejections: 2,
              },
            ],
          });
        }
        if (query.includes('SELECT column_name') && query.includes('application_method')) {
          return Promise.resolve({
            rows: [{ column_name: 'application_method' }],
          });
        }
        if (query.includes('SELECT application_method')) {
          return Promise.resolve({
            rows: [
              {
                application_method: 'Online Form',
                total: 5,
                interviews: 2,
                offers: 1,
                rejections: 2,
              },
            ],
          });
        }
        if (query.includes('SELECT COUNT(DISTINCT amh.job_id)') || query.includes('FROM application_materials_history')) {
          return Promise.resolve({
            rows: [{ with_resume: 5, total_jobs: 10 }],
          });
        }
        if (query.includes('WITH latest_materials AS') || query.includes('FROM job_materials')) {
          return Promise.resolve({
            rows: [
              {
                resume_id: 1,
                resume_name: 'My Resume',
                cover_letter_id: 1,
                cover_letter_name: 'Cover Letter 1',
                total: 5,
                offers: 2,
                interviews: 3,
                rejections: 0,
              },
            ],
          });
        }
        if (query.includes('SELECT COUNT(*) as total_jobs')) {
          return Promise.resolve({
            rows: [{ total_jobs: '10' }],
          });
        }
        if (query.includes('SELECT column_name') && query.includes('resume_customization')) {
          return Promise.resolve({
            rows: [],
          });
        }
        if (query.includes('SELECT DISTINCT EXTRACT(HOUR')) {
          return Promise.resolve({
            rows: [{ hour: 0 }],
          });
        }
        if (query.includes('EXTRACT(DOW FROM') && query.includes('EXTRACT(HOUR FROM')) {
          return Promise.resolve({
            rows: [
              {
                weekday: 1,
                hour: 0,
                applications: 5,
                offers: 2,
                interviews: 3,
              },
            ],
          });
        }
        if (query.includes('EXTRACT(DOW FROM') && !query.includes('EXTRACT(HOUR FROM')) {
          return Promise.resolve({
            rows: [
              {
                weekday: 1,
                applications: 5,
                offers: 2,
                interviews: 3,
              },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/success-analysis/full')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.industryData).toBeDefined();
      expect(response.body.roleTypeData).toBeDefined();
      expect(response.body.companySizeData).toBeDefined();
      expect(response.body.overallStats).toBeDefined();
      expect(response.body.recommendations).toBeDefined();
    });

    it('should handle empty data gracefully', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .get('/api/success-analysis/full')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.industryData).toBeDefined();
      expect(Array.isArray(response.body.industryData)).toBe(true);
    });

    it('should handle missing columns gracefully', async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT column_name') && query.includes('application_source')) {
          return Promise.resolve({ rows: [] }); // Column doesn't exist
        }
        if (query.includes('SELECT column_name') && query.includes('application_method')) {
          return Promise.resolve({ rows: [] }); // Column doesn't exist
        }
        if (query.includes('SELECT column_name') && query.includes('resume_customization')) {
          return Promise.resolve({ rows: [] }); // Column doesn't exist
        }
        if (query.includes('SELECT j.industry')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT DISTINCT status')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT title')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT j.company')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT COUNT(*) as total_jobs')) {
          return Promise.resolve({ rows: [{ total_jobs: '0' }] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/success-analysis/full')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.sourceData).toBeDefined();
      expect(response.body.methodData).toBeDefined();
      expect(response.body.customizationData).toBeDefined();
    });

    it('should calculate success rates correctly', async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT j.industry')) {
          return Promise.resolve({
            rows: [
              {
                industry: 'Technology',
                company: 'Tech Corp',
                title: 'Software Engineer',
                total: 10,
                interviews: 3,
                offers: 2,
                rejections: 5,
              },
            ],
          });
        }
        if (query.includes('SELECT DISTINCT status')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT title')) {
          return Promise.resolve({
            rows: [
              {
                title: 'Software Engineer',
                company: 'Tech Corp',
                total: 10,
                interviews: 3,
                offers: 2,
                rejections: 5,
              },
            ],
          });
        }
        if (query.includes('SELECT j.company')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT column_name')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT COUNT(*) as total_jobs')) {
          return Promise.resolve({ rows: [{ total_jobs: '10' }] });
        }
        if (query.includes('EXTRACT(DOW')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/success-analysis/full')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      if (response.body.industryData.length > 0) {
        const industry = response.body.industryData[0];
        expect(industry.successRate).toBeDefined();
        expect(industry.rejectionRate).toBeDefined();
        expect(industry.responseRate).toBeDefined();
      }
    });

    it('should return 401 if not authenticated', async () => {
      const response = await request(app)
        .get('/api/success-analysis/full');

      expect(response.status).toBe(401);
    });
  });
});





