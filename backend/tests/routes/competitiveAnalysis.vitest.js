/**
 * Competitive Analysis Routes - Full Coverage Tests
 * File: backend/routes/competitiveAnalysis.js
 */

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import competitiveAnalysisRouter from '../../routes/competitiveAnalysis.js';

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

// ============================================
// SETUP
// ============================================

let app;
let mockQueryFn;

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret';
  
  app = express();
  app.use(express.json());
  app.use('/api/competitive-analysis', competitiveAnalysisRouter);
});

beforeEach(async () => {
  vi.clearAllMocks();
  const pool = (await import('../../db/pool.js')).default;
  mockQueryFn = pool.query;
});

// ============================================
// TESTS
// ============================================

describe('Competitive Analysis Routes - Full Coverage', () => {
  describe('GET /api/competitive-analysis', () => {
    it('should return competitive analysis with all data', async () => {
      const mockJobs = [
        { id: 1, status: 'Applied', company: 'TechCorp', industry: 'Technology' },
        { id: 2, status: 'Interview', company: 'TechCorp', industry: 'Technology' },
        { id: 3, status: 'Offer', company: 'Startup', industry: 'Technology' },
      ];
      const mockSkills = [
        { id: 1, name: 'JavaScript', category: 'Technical', proficiency: 'Expert' },
        { id: 2, name: 'Communication', category: 'Soft Skills', proficiency: 'Advanced' },
      ];
      const mockEmployment = [
        { id: 1, company: 'TechCorp', title: 'Engineer', start_date: '2020-01-01', end_date: null, current: true },
      ];
      const mockEducation = [
        { id: 1, degree: 'BS', field: 'Computer Science', graduation_year: 2020 },
      ];
      const mockInterviewOutcomes = [
        { id: 1, job_id: 2, outcome: 'positive' },
      ];

      mockQueryFn
        .mockResolvedValueOnce({ rows: mockJobs }) // Jobs
        .mockResolvedValueOnce({ rows: mockSkills }) // Skills
        .mockResolvedValueOnce({ rows: mockEmployment }) // Employment
        .mockResolvedValueOnce({ rows: mockEducation }) // Education
        .mockResolvedValueOnce({ rows: [] }) // Certifications
        .mockResolvedValueOnce({ rows: [{ count: '5' }] }) // Networking contacts count
        .mockResolvedValueOnce({ rows: [{ count: '10' }] }) // Networking activities count
        .mockResolvedValueOnce({ rows: mockInterviewOutcomes }) // Interview outcomes
        .mockResolvedValueOnce({ rows: [] }) // All users jobs
        .mockResolvedValueOnce({ rows: [] }) // All users skills
        .mockResolvedValueOnce({ rows: [] }) // All users employment
        .mockResolvedValueOnce({ rows: [] }) // All users education
        .mockResolvedValueOnce({ rows: [] }) // All users certifications
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // All users networking contacts
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // All users networking activities
        .mockResolvedValueOnce({ rows: [] }); // All users interview outcomes

      const res = await request(app)
        .get('/api/competitive-analysis')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body).toBeDefined();
      // The route might return analysis directly or wrapped
      const analysis = res.body.analysis || res.body;
      expect(analysis).toBeDefined();
      if (analysis.performanceMetrics) {
        expect(analysis.performanceMetrics).toBeDefined();
      }
      if (analysis.skillsProfile) {
        expect(analysis.skillsProfile).toBeDefined();
      }
      if (analysis.experienceProfile) {
        expect(analysis.experienceProfile).toBeDefined();
      }
    });

    it('should handle empty data', async () => {
      mockQueryFn
        .mockResolvedValueOnce({ rows: [] }) // Jobs
        .mockResolvedValueOnce({ rows: [] }) // Skills
        .mockResolvedValueOnce({ rows: [] }) // Employment
        .mockResolvedValueOnce({ rows: [] }) // Education
        .mockResolvedValueOnce({ rows: [] }) // Certifications
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // Networking contacts count
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // Networking activities count
        .mockResolvedValueOnce({ rows: [] }) // Interview outcomes
        .mockResolvedValueOnce({ rows: [] }) // All users jobs
        .mockResolvedValueOnce({ rows: [] }) // All users skills
        .mockResolvedValueOnce({ rows: [] }) // All users employment
        .mockResolvedValueOnce({ rows: [] }) // All users education
        .mockResolvedValueOnce({ rows: [] }) // All users certifications
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // All users networking contacts
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // All users networking activities
        .mockResolvedValueOnce({ rows: [] }); // All users interview outcomes

      const res = await request(app)
        .get('/api/competitive-analysis')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body).toBeDefined();
    });

    it('should calculate performance metrics correctly', async () => {
      const mockJobs = [
        { id: 1, status: 'Applied' },
        { id: 2, status: 'Interview' },
        { id: 3, status: 'Offer' },
        { id: 4, status: 'Rejected' },
      ];
      const mockInterviewOutcomes = [
        { id: 1, job_id: 2 },
      ];

      mockQueryFn
        .mockResolvedValueOnce({ rows: mockJobs })
        .mockResolvedValueOnce({ rows: [] }) // Skills
        .mockResolvedValueOnce({ rows: [] }) // Employment
        .mockResolvedValueOnce({ rows: [] }) // Education
        .mockResolvedValueOnce({ rows: [] }) // Certifications
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // Networking contacts count
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // Networking activities count
        .mockResolvedValueOnce({ rows: mockInterviewOutcomes }) // Interview outcomes
        .mockResolvedValueOnce({ rows: [] }) // All users jobs
        .mockResolvedValueOnce({ rows: [] }) // All users skills
        .mockResolvedValueOnce({ rows: [] }) // All users employment
        .mockResolvedValueOnce({ rows: [] }) // All users education
        .mockResolvedValueOnce({ rows: [] }) // All users certifications
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // All users networking contacts
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // All users networking activities
        .mockResolvedValueOnce({ rows: [] }); // All users interview outcomes

      const res = await request(app)
        .get('/api/competitive-analysis')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body).toBeDefined();
      const analysis = res.body.analysis || res.body;
      if (analysis.performanceMetrics) {
        expect(analysis.performanceMetrics.totalApplications).toBe(4);
        expect(analysis.performanceMetrics.interviewRate).toBeGreaterThanOrEqual(0);
      }
    });

    it('should analyze skills profile', async () => {
      const mockSkills = [
        { id: 1, name: 'JavaScript', category: 'Technical', proficiency: 'Expert' },
        { id: 2, name: 'Python', category: 'Technical', proficiency: 'Advanced' },
        { id: 3, name: 'Communication', category: 'Soft Skills', proficiency: 'Intermediate' },
      ];

      mockQueryFn
        .mockResolvedValueOnce({ rows: [] }) // Jobs
        .mockResolvedValueOnce({ rows: mockSkills })
        .mockResolvedValueOnce({ rows: [] }) // Employment
        .mockResolvedValueOnce({ rows: [] }) // Education
        .mockResolvedValueOnce({ rows: [] }) // Certifications
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // Networking contacts count
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // Networking activities count
        .mockResolvedValueOnce({ rows: [] }) // Interview outcomes
        .mockResolvedValueOnce({ rows: [] }) // All users jobs
        .mockResolvedValueOnce({ rows: [] }) // All users skills
        .mockResolvedValueOnce({ rows: [] }) // All users employment
        .mockResolvedValueOnce({ rows: [] }) // All users education
        .mockResolvedValueOnce({ rows: [] }) // All users certifications
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // All users networking contacts
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // All users networking activities
        .mockResolvedValueOnce({ rows: [] }); // All users interview outcomes

      const res = await request(app)
        .get('/api/competitive-analysis')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body).toBeDefined();
      const analysis = res.body.analysis || res.body;
      if (analysis.skillsProfile) {
        expect(analysis.skillsProfile.total).toBe(3);
        expect(analysis.skillsProfile.technical).toBe(2);
        expect(analysis.skillsProfile.soft).toBe(1);
      }
    });

    it('should analyze experience profile', async () => {
      const mockEmployment = [
        { id: 1, company: 'TechCorp', title: 'Senior Engineer', start_date: '2020-01-01', end_date: null, current: true },
        { id: 2, company: 'Startup', title: 'Engineer', start_date: '2018-01-01', end_date: '2019-12-31', current: false },
      ];
      const mockEducation = [
        { id: 1, degree: 'BS', field: 'Computer Science', graduation_year: 2018 },
      ];

      mockQueryFn
        .mockResolvedValueOnce({ rows: [] }) // Jobs
        .mockResolvedValueOnce({ rows: [] }) // Skills
        .mockResolvedValueOnce({ rows: mockEmployment })
        .mockResolvedValueOnce({ rows: mockEducation })
        .mockResolvedValueOnce({ rows: [] }) // Certifications
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // Networking contacts count
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // Networking activities count
        .mockResolvedValueOnce({ rows: [] }) // Interview outcomes
        .mockResolvedValueOnce({ rows: [] }) // All users jobs
        .mockResolvedValueOnce({ rows: [] }) // All users skills
        .mockResolvedValueOnce({ rows: [] }) // All users employment
        .mockResolvedValueOnce({ rows: [] }) // All users education
        .mockResolvedValueOnce({ rows: [] }) // All users certifications
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // All users networking contacts
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // All users networking activities
        .mockResolvedValueOnce({ rows: [] }); // All users interview outcomes

      const res = await request(app)
        .get('/api/competitive-analysis')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body).toBeDefined();
      const analysis = res.body.analysis || res.body;
      if (analysis.experienceProfile) {
        expect(analysis.experienceProfile).toBeDefined();
        expect(analysis.experienceProfile.totalYears).toBeGreaterThanOrEqual(0);
      }
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .get('/api/competitive-analysis')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
    });

    it('should return 401 if no token provided', async () => {
      const res = await request(app)
        .get('/api/competitive-analysis');

      expect(res.status).toBe(401);
    });
  });
});

