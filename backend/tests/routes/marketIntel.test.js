/**
 * Market Intel Routes Tests
 * Tests routes/marketIntel.js
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import marketIntelRoutes from '../../routes/marketIntel.js';
import { createTestUser } from '../helpers/auth.js';

// Mock pg Pool - store in global to avoid hoisting issues
vi.mock('pg', () => {
  const mockPool = {
    query: vi.fn(),
  };
  return {
    default: {
      Pool: function() {
        return mockPool;
      },
    },
  };
});

// Mock auth
vi.mock('../../auth.js', () => ({
  auth: vi.fn((req, res, next) => {
    req.user = { id: 1 };
    next();
  }),
}));

describe('Market Intel Routes', () => {
  let app;
  let user;
  let userId;

  beforeEach(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';
    process.env.DATABASE_URL = 'postgresql://test:test@localhost/test';
    
    app = express();
    app.use(express.json());
    app.use('/api/market-intel', marketIntelRoutes);
    
    user = await createTestUser();
    
    const jwtModule = await import('jsonwebtoken');
    const decoded = jwtModule.verify(user.token, process.env.JWT_SECRET || 'test-secret-key');
    userId = Number(decoded.id);
    
    vi.clearAllMocks();
    
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

  describe('GET /api/market-intel', () => {
    it('should get market intelligence data', async () => {
      // Get the mocked pool instance
      const pkg = await import('pg');
      const poolInstance = new pkg.default.Pool();
      
      poolInstance.query.mockImplementation((query) => {
        if (query.includes('SELECT id, first_name, last_name, email FROM users')) {
          return Promise.resolve({
            rows: [{
              id: userId,
              first_name: 'Test',
              last_name: 'User',
              email: 'test@example.com',
            }],
          });
        }
        if (query.includes('SELECT id, title, company, location, industry, status')) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                title: 'Software Engineer',
                company: 'Tech Corp',
                location: 'San Francisco, CA',
                industry: 'Technology',
                status: 'Applied',
                applied_on: '2024-01-15',
                created_at: '2024-01-15',
              },
            ],
          });
        }
        if (query.includes('SELECT io.job_id, io.company')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT job_id, event, timestamp')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT name, category, proficiency FROM skills')) {
          return Promise.resolve({
            rows: [
              { name: 'JavaScript', category: 'Programming', proficiency: 'expert' },
            ],
          });
        }
        if (query.includes('SELECT company, created_at FROM company_research')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/market-intel')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.profile).toBeDefined();
      expect(response.body.jobs).toBeDefined();
      expect(response.body.topIndustry).toBeDefined();
      expect(response.body.jobTrends).toBeDefined();
      expect(response.body.salaryTrends).toBeDefined();
      expect(response.body.skillsDemand).toBeDefined();
      expect(response.body.timingAnalysis).toBeDefined();
      expect(response.body.successMetrics).toBeDefined();
      expect(response.body.competitiveLandscape).toBeDefined();
      expect(response.body.marketOpportunities).toBeDefined();
      expect(response.body.skillRecommendations).toBeDefined();
      expect(response.body.locationTrends).toBeDefined();
      expect(response.body.companyGrowth).toBeDefined();
      expect(response.body.stats).toBeDefined();
    });

    it('should handle empty job history', async () => {
      const pkg = await import('pg'); const poolInstance = new pkg.default.Pool(); poolInstance.query.mockImplementation((query) => {
        if (query.includes('SELECT id, first_name')) {
          return Promise.resolve({
            rows: [{ id: userId, first_name: 'Test', last_name: 'User', email: 'test@example.com' }],
          });
        }
        if (query.includes('SELECT id, title, company')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT io.job_id')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT job_id, event')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT name, category')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/market-intel')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.jobs).toEqual([]);
      expect(response.body.stats.totalApplications).toBe(0);
    });

    it('should calculate interview rate correctly', async () => {
      const pkg = await import('pg'); const poolInstance = new pkg.default.Pool(); poolInstance.query.mockImplementation((query) => {
        if (query.includes('SELECT id, first_name')) {
          return Promise.resolve({
            rows: [{ id: userId, first_name: 'Test', last_name: 'User', email: 'test@example.com' }],
          });
        }
        if (query.includes('SELECT id, title, company')) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                title: 'Software Engineer',
                company: 'Tech Corp',
                status: 'Applied',
                applied_on: '2024-01-15',
                created_at: '2024-01-15',
              },
              {
                id: 2,
                title: 'Data Scientist',
                company: 'Data Corp',
                status: 'Interview',
                applied_on: '2024-01-20',
                created_at: '2024-01-20',
              },
            ],
          });
        }
        if (query.includes('SELECT io.job_id')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT job_id, event')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT name, category')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/market-intel')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.stats.totalApplications).toBe(2);
      expect(response.body.stats.totalInterviews).toBe(1);
    });

    it('should handle interview outcomes table', async () => {
      const pkg = await import('pg'); const poolInstance = new pkg.default.Pool(); poolInstance.query.mockImplementation((query) => {
        if (query.includes('SELECT id, first_name')) {
          return Promise.resolve({
            rows: [{ id: userId, first_name: 'Test', last_name: 'User', email: 'test@example.com' }],
          });
        }
        if (query.includes('SELECT id, title, company')) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                title: 'Software Engineer',
                company: 'Tech Corp',
                status: 'Applied',
                applied_on: '2024-01-15',
                created_at: '2024-01-15',
              },
            ],
          });
        }
        if (query.includes('SELECT io.job_id, io.company')) {
          return Promise.resolve({
            rows: [
              {
                job_id: 1,
                company: 'Tech Corp',
                interview_date: '2024-01-20',
                outcome: 'passed',
              },
            ],
          });
        }
        if (query.includes('SELECT job_id, event')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT name, category')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/market-intel')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.stats.totalInterviews).toBeGreaterThanOrEqual(1);
    });

    it('should handle missing tables gracefully', async () => {
      const pkg = await import('pg'); const poolInstance = new pkg.default.Pool(); poolInstance.query.mockImplementation((query) => {
        if (query.includes('SELECT id, first_name')) {
          return Promise.resolve({
            rows: [{ id: userId, first_name: 'Test', last_name: 'User', email: 'test@example.com' }],
          });
        }
        if (query.includes('SELECT id, title, company')) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                title: 'Software Engineer',
                company: 'Tech Corp',
                status: 'Applied',
                applied_on: '2024-01-15',
                created_at: '2024-01-15',
              },
            ],
          });
        }
        if (query.includes('SELECT io.job_id')) {
          return Promise.reject(new Error('Table interview_outcomes does not exist'));
        }
        if (query.includes('SELECT job_id, event')) {
          return Promise.reject(new Error('Table application_history does not exist'));
        }
        if (query.includes('SELECT name, category')) {
          return Promise.reject(new Error('Table skills does not exist'));
        }
        if (query.includes('SELECT company, created_at FROM company_research')) {
          return Promise.reject(new Error('Table company_research does not exist'));
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/market-intel')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.jobs).toBeDefined();
    });

    it('should calculate competitive score correctly', async () => {
      const pkg = await import('pg'); const poolInstance = new pkg.default.Pool(); poolInstance.query.mockImplementation((query) => {
        if (query.includes('SELECT id, first_name')) {
          return Promise.resolve({
            rows: [{ id: userId, first_name: 'Test', last_name: 'User', email: 'test@example.com' }],
          });
        }
        if (query.includes('SELECT id, title, company')) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                title: 'Software Engineer',
                company: 'Tech Corp',
                status: 'Interview',
                applied_on: '2024-01-15',
                created_at: '2024-01-15',
              },
              {
                id: 2,
                title: 'Data Scientist',
                company: 'Data Corp',
                status: 'Offer',
                applied_on: '2024-01-20',
                created_at: '2024-01-20',
              },
            ],
          });
        }
        if (query.includes('SELECT io.job_id')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT job_id, event')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT name, category')) {
          return Promise.resolve({
            rows: [
              { name: 'JavaScript', category: 'Programming', proficiency: 'expert' },
              { name: 'Python', category: 'Programming', proficiency: 'expert' },
              { name: 'React', category: 'Frontend', proficiency: 'expert' },
              { name: 'Node.js', category: 'Backend', proficiency: 'expert' },
              { name: 'AWS', category: 'Cloud', proficiency: 'expert' },
              { name: 'Docker', category: 'DevOps', proficiency: 'expert' },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/market-intel')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.competitiveLandscape.competitiveScore).toBeGreaterThan(50);
      expect(response.body.competitiveLandscape.ranking).toBeDefined();
    });

    it('should generate skill recommendations', async () => {
      const pkg = await import('pg'); const poolInstance = new pkg.default.Pool(); poolInstance.query.mockImplementation((query) => {
        if (query.includes('SELECT id, first_name')) {
          return Promise.resolve({
            rows: [{ id: userId, first_name: 'Test', last_name: 'User', email: 'test@example.com' }],
          });
        }
        if (query.includes('SELECT id, title, company')) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                title: 'Software Engineer',
                company: 'Tech Corp',
                status: 'Applied',
                applied_on: '2024-01-15',
                created_at: '2024-01-15',
              },
            ],
          });
        }
        if (query.includes('SELECT io.job_id')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT job_id, event')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT name, category')) {
          return Promise.resolve({
            rows: [
              { name: 'JavaScript', category: 'Programming', proficiency: 'expert' },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/market-intel')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.skillRecommendations).toBeDefined();
      expect(Array.isArray(response.body.skillRecommendations)).toBe(true);
      expect(response.body.skillRecommendations.length).toBeGreaterThan(0);
    });

    it('should analyze company growth', async () => {
      const pkg = await import('pg'); const poolInstance = new pkg.default.Pool(); poolInstance.query.mockImplementation((query) => {
        if (query.includes('SELECT id, first_name')) {
          return Promise.resolve({
            rows: [{ id: userId, first_name: 'Test', last_name: 'User', email: 'test@example.com' }],
          });
        }
        if (query.includes('SELECT id, title, company')) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                title: 'Software Engineer',
                company: 'Tech Corp',
                status: 'Applied',
                applied_on: '2024-01-15',
                created_at: '2024-01-15',
                industry: 'Technology',
              },
              {
                id: 2,
                title: 'Senior Engineer',
                company: 'Tech Corp',
                status: 'Interview',
                applied_on: '2024-01-20',
                created_at: '2024-01-20',
                industry: 'Technology',
              },
            ],
          });
        }
        if (query.includes('SELECT io.job_id')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT job_id, event')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT name, category')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/market-intel')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.companyGrowth).toBeDefined();
      expect(Array.isArray(response.body.companyGrowth)).toBe(true);
      if (response.body.companyGrowth.length > 0) {
        expect(response.body.companyGrowth[0].name).toBe('Tech Corp');
        expect(response.body.companyGrowth[0].applications).toBe(2);
      }
    });
  });
});

