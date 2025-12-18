/**
 * Optimization Dashboard Routes Tests
 * Tests routes/optimizationDashboard.js - UC-119: Application Success Optimization Dashboard
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import optimizationDashboardRoutes from '../../routes/optimizationDashboard.js';
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

describe('Optimization Dashboard Routes', () => {
  let app;
  let user;
  let userId;

  beforeEach(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
    
    app = express();
    app.use(express.json());
    app.use('/api/optimization', optimizationDashboardRoutes);
    
    user = await createTestUser();
    
    const jwtModule = await import('jsonwebtoken');
    const decoded = jwtModule.verify(user.token, process.env.JWT_SECRET || 'dev_secret_change_me');
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
        const decoded = jwtModule.verify(token, process.env.JWT_SECRET || 'dev_secret_change_me');
        req.user = { id: Number(decoded.id), email: decoded.email };
        next();
      } catch (err) {
        return res.status(401).json({ error: "INVALID_TOKEN" });
      }
    });
  });

  describe('GET /api/optimization', () => {
    it('should return optimization dashboard data', async () => {
      pool.query.mockImplementation((query, params) => {
        // Success metrics query
        if (query.includes('total_applications') && query.includes('total_responses')) {
          return Promise.resolve({
            rows: [{
              total_applications: '50',
              total_responses: '15',
              total_interviews: '10',
              total_offers: '2',
              applications_with_response: '15',
              response_rate: '30.00',
              interview_rate: '20.00',
              offer_rate: '4.00',
              interview_to_offer_rate: '20.00',
            }],
          });
        }
        // Table existence check
        if (query.includes('information_schema.tables') && query.includes('job_materials')) {
          return Promise.resolve({ rows: [{ exists: false }] });
        }
        // Jobs columns check
        if (query.includes('information_schema.columns') && query.includes("'resume_id', 'cover_letter_id'")) {
          return Promise.resolve({ rows: [] });
        }
        // Customization columns check (jobs)
        if (query.includes('information_schema.columns') && query.includes("'resume_customization', 'cover_letter_customization'") && query.includes("table_name = 'jobs'")) {
          return Promise.resolve({ rows: [] });
        }
        // Customization columns check (job_application_materials)
        if (query.includes('information_schema.columns') && query.includes("table_name = 'job_application_materials'")) {
          return Promise.resolve({ rows: [] });
        }
        // Referral requests table check
        if (query.includes('information_schema.tables') && query.includes('referral_requests')) {
          return Promise.resolve({ rows: [{ exists: false }] });
        }
        // Approach performance fallback
        if (query.includes('application_approach') && query.includes('contact_email')) {
          return Promise.resolve({
            rows: [
              { application_approach: 'Standard Application', total_applications: '40', successful: '5', success_rate: '12.50' },
              { application_approach: 'Direct Contact', total_applications: '10', successful: '5', success_rate: '50.00' },
            ],
          });
        }
        // Timing analysis
        if (query.includes('EXTRACT(DOW FROM') && query.includes('EXTRACT(HOUR FROM')) {
          return Promise.resolve({
            rows: [
              { day_of_week: '2', hour_of_day: '10', total_applications: '5', successful: '2', success_rate: '40.00' },
            ],
          });
        }
        // Role type performance
        if (query.includes('type as role_type')) {
          return Promise.resolve({
            rows: [
              { role_type: 'Full-time', total_applications: '30', successful: '8', success_rate: '26.67' },
            ],
          });
        }
        // Industry performance
        if (query.includes('industry') && query.includes('GROUP BY industry')) {
          return Promise.resolve({
            rows: [
              { industry: 'Technology', total_applications: '25', successful: '7', success_rate: '28.00' },
            ],
          });
        }
        // Trend over time
        if (query.includes("DATE_TRUNC('month'")) {
          return Promise.resolve({
            rows: [
              { month: '2024-01-01', total_applications: '15', successful: '3', success_rate: '20.00' },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/optimization')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.successMetrics).toBeDefined();
      expect(response.body.successMetrics.totalApplications).toBe(50);
      expect(response.body.resumePerformance).toBeDefined();
      expect(response.body.recommendations).toBeDefined();
      expect(response.body.abTestResults).toBeDefined();
    });

    it('should handle custom date range', async () => {
      pool.query.mockImplementation((query, params) => {
        // Verify date params are passed
        if (params && params[1] && params[2]) {
          expect(params[1]).toContain('2024-01-01');
          expect(params[2]).toContain('2024-06-30');
        }
        
        if (query.includes('total_applications')) {
          return Promise.resolve({
            rows: [{
              total_applications: '20',
              total_responses: '5',
              total_interviews: '3',
              total_offers: '1',
              applications_with_response: '5',
              response_rate: '25.00',
              interview_rate: '15.00',
              offer_rate: '5.00',
              interview_to_offer_rate: '33.33',
            }],
          });
        }
        if (query.includes('information_schema')) {
          return Promise.resolve({ rows: [{ exists: false }] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/optimization?startDate=2024-01-01&endDate=2024-06-30')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
    });

    it('should use job_materials table when available', async () => {
      pool.query.mockImplementation((query, params) => {
        if (query.includes('total_applications') && query.includes('total_responses')) {
          return Promise.resolve({
            rows: [{
              total_applications: '30',
              total_responses: '10',
              total_interviews: '5',
              total_offers: '1',
              applications_with_response: '10',
              response_rate: '33.33',
              interview_rate: '16.67',
              offer_rate: '3.33',
              interview_to_offer_rate: '20.00',
            }],
          });
        }
        // job_materials table exists
        if (query.includes('information_schema.tables') && query.includes('job_materials')) {
          return Promise.resolve({ rows: [{ exists: true }] });
        }
        // Resume performance from job_materials
        if (query.includes('jm.resume_id') && query.includes('INNER JOIN job_materials')) {
          return Promise.resolve({
            rows: [
              { resume_id: 1, resume_name: 'Technical Resume', total_applications: '10', successful: '5', success_rate: '50.00' },
              { resume_id: 2, resume_name: 'General Resume', total_applications: '5', successful: '1', success_rate: '20.00' },
            ],
          });
        }
        // Cover letter table check
        if (query.includes('information_schema.tables') && query.includes("IN ('cover_letters', 'uploaded_cover_letters')")) {
          return Promise.resolve({ rows: [{ exists: true }] });
        }
        // Cover letter performance
        if (query.includes('jm.cover_letter_id') && query.includes('INNER JOIN job_materials')) {
          return Promise.resolve({
            rows: [
              { cover_letter_id: 1, cover_letter_name: 'Custom CL', total_applications: '8', successful: '4', success_rate: '50.00' },
            ],
          });
        }
        if (query.includes('information_schema.columns')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('information_schema.tables') && query.includes('referral_requests')) {
          return Promise.resolve({ rows: [{ exists: false }] });
        }
        if (query.includes('application_approach')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('EXTRACT(DOW FROM')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('type as role_type')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('GROUP BY industry')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes("DATE_TRUNC('month'")) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/optimization')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.resumePerformance.length).toBeGreaterThan(0);
    });

    it('should handle cover letter performance error', async () => {
      pool.query.mockImplementation((query, params) => {
        if (query.includes('total_applications') && query.includes('total_responses')) {
          return Promise.resolve({
            rows: [{
              total_applications: '30',
              total_responses: '10',
              total_interviews: '5',
              total_offers: '1',
              applications_with_response: '10',
              response_rate: '33.33',
              interview_rate: '16.67',
              offer_rate: '3.33',
              interview_to_offer_rate: '20.00',
            }],
          });
        }
        if (query.includes('information_schema.tables') && query.includes('job_materials')) {
          return Promise.resolve({ rows: [{ exists: true }] });
        }
        if (query.includes('jm.resume_id') && query.includes('INNER JOIN job_materials')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('information_schema.tables') && query.includes("IN ('cover_letters', 'uploaded_cover_letters')")) {
          return Promise.resolve({ rows: [{ exists: true }] });
        }
        // Cover letter query fails
        if (query.includes('jm.cover_letter_id') && query.includes('INNER JOIN job_materials')) {
          return Promise.reject(new Error('Cover letter query error'));
        }
        if (query.includes('information_schema.columns')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('information_schema.tables') && query.includes('referral_requests')) {
          return Promise.resolve({ rows: [{ exists: false }] });
        }
        if (query.includes('application_approach')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/optimization')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.coverLetterPerformance).toEqual([]);
    });

    it('should use jobs table columns when job_materials not available', async () => {
      pool.query.mockImplementation((query, params) => {
        if (query.includes('total_applications') && query.includes('total_responses')) {
          return Promise.resolve({
            rows: [{
              total_applications: '30',
              total_responses: '10',
              total_interviews: '5',
              total_offers: '1',
              applications_with_response: '10',
              response_rate: '33.33',
              interview_rate: '16.67',
              offer_rate: '3.33',
              interview_to_offer_rate: '20.00',
            }],
          });
        }
        if (query.includes('information_schema.tables') && query.includes('job_materials')) {
          return Promise.resolve({ rows: [{ exists: false }] });
        }
        // Jobs has resume_id and cover_letter_id columns
        if (query.includes('information_schema.columns') && query.includes("'resume_id', 'cover_letter_id'")) {
          return Promise.resolve({
            rows: [
              { column_name: 'resume_id' },
              { column_name: 'cover_letter_id' },
            ],
          });
        }
        // Resume performance from jobs table
        if (query.includes('j.resume_id') && query.includes('LEFT JOIN resumes r ON j.resume_id')) {
          return Promise.resolve({
            rows: [
              { resume_id: 1, resume_name: 'Main Resume', total_applications: '15', successful: '5', success_rate: '33.33' },
            ],
          });
        }
        // Cover letter performance from jobs table
        if (query.includes('j.cover_letter_id') && query.includes('LEFT JOIN uploaded_cover_letters')) {
          return Promise.resolve({
            rows: [
              { cover_letter_id: 1, cover_letter_name: 'Default CL', total_applications: '10', successful: '3', success_rate: '30.00' },
            ],
          });
        }
        if (query.includes('information_schema.columns') && query.includes("'resume_customization', 'cover_letter_customization'")) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('information_schema.tables') && query.includes('referral_requests')) {
          return Promise.resolve({ rows: [{ exists: false }] });
        }
        if (query.includes('application_approach')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/optimization')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.resumePerformance.length).toBeGreaterThan(0);
      expect(response.body.coverLetterPerformance.length).toBeGreaterThan(0);
    });

    it('should handle resume/cover letter performance error gracefully', async () => {
      pool.query.mockImplementation((query, params) => {
        if (query.includes('total_applications') && query.includes('total_responses')) {
          return Promise.resolve({
            rows: [{
              total_applications: '30',
              total_responses: '10',
              total_interviews: '5',
              total_offers: '1',
              applications_with_response: '10',
              response_rate: '33.33',
              interview_rate: '16.67',
              offer_rate: '3.33',
              interview_to_offer_rate: '20.00',
            }],
          });
        }
        // First table check fails
        if (query.includes('information_schema.tables') && query.includes('job_materials')) {
          return Promise.reject(new Error('Table check error'));
        }
        if (query.includes('information_schema.columns')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('information_schema.tables') && query.includes('referral_requests')) {
          return Promise.resolve({ rows: [{ exists: false }] });
        }
        if (query.includes('application_approach')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/optimization')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.resumePerformance).toEqual([]);
      expect(response.body.coverLetterPerformance).toEqual([]);
    });

    it('should handle customization columns in jobs table', async () => {
      pool.query.mockImplementation((query, params) => {
        if (query.includes('total_applications') && query.includes('total_responses')) {
          return Promise.resolve({
            rows: [{
              total_applications: '30',
              total_responses: '10',
              total_interviews: '5',
              total_offers: '1',
              applications_with_response: '10',
              response_rate: '33.33',
              interview_rate: '16.67',
              offer_rate: '3.33',
              interview_to_offer_rate: '20.00',
            }],
          });
        }
        if (query.includes('information_schema.tables') && query.includes('job_materials')) {
          return Promise.resolve({ rows: [{ exists: false }] });
        }
        if (query.includes('information_schema.columns') && query.includes("'resume_id', 'cover_letter_id'")) {
          return Promise.resolve({ rows: [] });
        }
        // Jobs has both customization columns
        if (query.includes('information_schema.columns') && query.includes("'resume_customization', 'cover_letter_customization'") && query.includes("table_name = 'jobs'")) {
          return Promise.resolve({
            rows: [
              { column_name: 'resume_customization' },
              { column_name: 'cover_letter_customization' },
            ],
          });
        }
        if (query.includes("table_name = 'job_application_materials'")) {
          return Promise.resolve({ rows: [] });
        }
        // Customization performance
        if (query.includes('resume_customization') && query.includes('cover_letter_customization') && query.includes('GROUP BY')) {
          return Promise.resolve({
            rows: [
              { resume_customization: 'high', cover_letter_customization: 'high', total_applications: '10', successful: '5', success_rate: '50.00' },
              { resume_customization: 'low', cover_letter_customization: 'none', total_applications: '10', successful: '1', success_rate: '10.00' },
            ],
          });
        }
        if (query.includes('information_schema.tables') && query.includes('referral_requests')) {
          return Promise.resolve({ rows: [{ exists: false }] });
        }
        if (query.includes('application_approach')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/optimization')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.customizationPerformance.length).toBeGreaterThan(0);
    });

    it('should handle only resume_customization column in jobs table', async () => {
      pool.query.mockImplementation((query, params) => {
        if (query.includes('total_applications') && query.includes('total_responses')) {
          return Promise.resolve({
            rows: [{
              total_applications: '30',
              total_responses: '10',
              total_interviews: '5',
              total_offers: '1',
              applications_with_response: '10',
              response_rate: '33.33',
              interview_rate: '16.67',
              offer_rate: '3.33',
              interview_to_offer_rate: '20.00',
            }],
          });
        }
        if (query.includes('information_schema.tables') && query.includes('job_materials')) {
          return Promise.resolve({ rows: [{ exists: false }] });
        }
        if (query.includes('information_schema.columns') && query.includes("'resume_id', 'cover_letter_id'")) {
          return Promise.resolve({ rows: [] });
        }
        // Only resume_customization column
        if (query.includes('information_schema.columns') && query.includes("'resume_customization', 'cover_letter_customization'") && query.includes("table_name = 'jobs'")) {
          return Promise.resolve({
            rows: [{ column_name: 'resume_customization' }],
          });
        }
        if (query.includes("table_name = 'job_application_materials'")) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('resume_customization') && query.includes('GROUP BY')) {
          return Promise.resolve({
            rows: [
              { resume_customization: 'high', cover_letter_customization: 'none', total_applications: '10', successful: '3', success_rate: '30.00' },
            ],
          });
        }
        if (query.includes('information_schema.tables') && query.includes('referral_requests')) {
          return Promise.resolve({ rows: [{ exists: false }] });
        }
        if (query.includes('application_approach')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/optimization')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
    });

    it('should handle only cover_letter_customization column in jobs table', async () => {
      pool.query.mockImplementation((query, params) => {
        if (query.includes('total_applications') && query.includes('total_responses')) {
          return Promise.resolve({
            rows: [{
              total_applications: '30',
              total_responses: '10',
              total_interviews: '5',
              total_offers: '1',
              applications_with_response: '10',
              response_rate: '33.33',
              interview_rate: '16.67',
              offer_rate: '3.33',
              interview_to_offer_rate: '20.00',
            }],
          });
        }
        if (query.includes('information_schema.tables') && query.includes('job_materials')) {
          return Promise.resolve({ rows: [{ exists: false }] });
        }
        if (query.includes('information_schema.columns') && query.includes("'resume_id', 'cover_letter_id'")) {
          return Promise.resolve({ rows: [] });
        }
        // Only cover_letter_customization column
        if (query.includes('information_schema.columns') && query.includes("'resume_customization', 'cover_letter_customization'") && query.includes("table_name = 'jobs'")) {
          return Promise.resolve({
            rows: [{ column_name: 'cover_letter_customization' }],
          });
        }
        if (query.includes("table_name = 'job_application_materials'")) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('cover_letter_customization') && query.includes('GROUP BY')) {
          return Promise.resolve({
            rows: [
              { resume_customization: 'none', cover_letter_customization: 'high', total_applications: '8', successful: '4', success_rate: '50.00' },
            ],
          });
        }
        if (query.includes('information_schema.tables') && query.includes('referral_requests')) {
          return Promise.resolve({ rows: [{ exists: false }] });
        }
        if (query.includes('application_approach')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/optimization')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
    });

    it('should handle customization columns in job_application_materials table', async () => {
      pool.query.mockImplementation((query, params) => {
        if (query.includes('total_applications') && query.includes('total_responses')) {
          return Promise.resolve({
            rows: [{
              total_applications: '30',
              total_responses: '10',
              total_interviews: '5',
              total_offers: '1',
              applications_with_response: '10',
              response_rate: '33.33',
              interview_rate: '16.67',
              offer_rate: '3.33',
              interview_to_offer_rate: '20.00',
            }],
          });
        }
        if (query.includes('information_schema.tables') && query.includes('job_materials')) {
          return Promise.resolve({ rows: [{ exists: false }] });
        }
        if (query.includes('information_schema.columns') && query.includes("'resume_id', 'cover_letter_id'")) {
          return Promise.resolve({ rows: [] });
        }
        // No customization in jobs
        if (query.includes('information_schema.columns') && query.includes("'resume_customization', 'cover_letter_customization'") && query.includes("table_name = 'jobs'")) {
          return Promise.resolve({ rows: [] });
        }
        // Customization in job_application_materials
        if (query.includes("table_name = 'job_application_materials'")) {
          return Promise.resolve({
            rows: [
              { column_name: 'resume_customization' },
              { column_name: 'cover_letter_customization' },
            ],
          });
        }
        // Customization from job_application_materials
        if (query.includes('jam.resume_customization') && query.includes('LEFT JOIN job_application_materials')) {
          return Promise.resolve({
            rows: [
              { resume_customization: 'high', cover_letter_customization: 'medium', total_applications: '12', successful: '6', success_rate: '50.00' },
            ],
          });
        }
        if (query.includes('information_schema.tables') && query.includes('referral_requests')) {
          return Promise.resolve({ rows: [{ exists: false }] });
        }
        if (query.includes('application_approach')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/optimization')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
    });

    it('should handle only resume_customization in job_application_materials', async () => {
      pool.query.mockImplementation((query, params) => {
        if (query.includes('total_applications') && query.includes('total_responses')) {
          return Promise.resolve({
            rows: [{
              total_applications: '30',
              total_responses: '10',
              total_interviews: '5',
              total_offers: '1',
              applications_with_response: '10',
              response_rate: '33.33',
              interview_rate: '16.67',
              offer_rate: '3.33',
              interview_to_offer_rate: '20.00',
            }],
          });
        }
        if (query.includes('information_schema.tables') && query.includes('job_materials')) {
          return Promise.resolve({ rows: [{ exists: false }] });
        }
        if (query.includes('information_schema.columns') && query.includes("'resume_id', 'cover_letter_id'")) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('information_schema.columns') && query.includes("'resume_customization', 'cover_letter_customization'") && query.includes("table_name = 'jobs'")) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes("table_name = 'job_application_materials'")) {
          return Promise.resolve({
            rows: [{ column_name: 'resume_customization' }],  // Only resume
          });
        }
        if (query.includes('jam.resume_customization') && query.includes('LEFT JOIN job_application_materials')) {
          return Promise.resolve({
            rows: [
              { resume_customization: 'high', cover_letter_customization: 'none', total_applications: '8', successful: '4', success_rate: '50.00' },
            ],
          });
        }
        if (query.includes('information_schema.tables') && query.includes('referral_requests')) {
          return Promise.resolve({ rows: [{ exists: false }] });
        }
        if (query.includes('application_approach')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/optimization')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
    });

    it('should handle only cover_letter_customization in job_application_materials', async () => {
      pool.query.mockImplementation((query, params) => {
        if (query.includes('total_applications') && query.includes('total_responses')) {
          return Promise.resolve({
            rows: [{
              total_applications: '30',
              total_responses: '10',
              total_interviews: '5',
              total_offers: '1',
              applications_with_response: '10',
              response_rate: '33.33',
              interview_rate: '16.67',
              offer_rate: '3.33',
              interview_to_offer_rate: '20.00',
            }],
          });
        }
        if (query.includes('information_schema.tables') && query.includes('job_materials')) {
          return Promise.resolve({ rows: [{ exists: false }] });
        }
        if (query.includes('information_schema.columns') && query.includes("'resume_id', 'cover_letter_id'")) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('information_schema.columns') && query.includes("'resume_customization', 'cover_letter_customization'") && query.includes("table_name = 'jobs'")) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes("table_name = 'job_application_materials'")) {
          return Promise.resolve({
            rows: [{ column_name: 'cover_letter_customization' }],  // Only cover letter
          });
        }
        if (query.includes('jam.cover_letter_customization') && query.includes('LEFT JOIN job_application_materials')) {
          return Promise.resolve({
            rows: [
              { resume_customization: 'none', cover_letter_customization: 'high', total_applications: '6', successful: '3', success_rate: '50.00' },
            ],
          });
        }
        if (query.includes('information_schema.tables') && query.includes('referral_requests')) {
          return Promise.resolve({ rows: [{ exists: false }] });
        }
        if (query.includes('application_approach')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/optimization')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
    });

    it('should handle customization performance error', async () => {
      pool.query.mockImplementation((query, params) => {
        if (query.includes('total_applications') && query.includes('total_responses')) {
          return Promise.resolve({
            rows: [{
              total_applications: '30',
              total_responses: '10',
              total_interviews: '5',
              total_offers: '1',
              applications_with_response: '10',
              response_rate: '33.33',
              interview_rate: '16.67',
              offer_rate: '3.33',
              interview_to_offer_rate: '20.00',
            }],
          });
        }
        if (query.includes('information_schema.tables') && query.includes('job_materials')) {
          return Promise.resolve({ rows: [{ exists: false }] });
        }
        if (query.includes('information_schema.columns') && query.includes("'resume_id', 'cover_letter_id'")) {
          return Promise.resolve({ rows: [] });
        }
        // Customization check fails
        if (query.includes('information_schema.columns') && query.includes("'resume_customization', 'cover_letter_customization'")) {
          return Promise.reject(new Error('Customization check error'));
        }
        if (query.includes('information_schema.tables') && query.includes('referral_requests')) {
          return Promise.resolve({ rows: [{ exists: false }] });
        }
        if (query.includes('application_approach')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/optimization')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.customizationPerformance).toEqual([]);
    });

    it('should use referral_requests table when available', async () => {
      pool.query.mockImplementation((query, params) => {
        if (query.includes('total_applications') && query.includes('total_responses')) {
          return Promise.resolve({
            rows: [{
              total_applications: '30',
              total_responses: '10',
              total_interviews: '5',
              total_offers: '1',
              applications_with_response: '10',
              response_rate: '33.33',
              interview_rate: '16.67',
              offer_rate: '3.33',
              interview_to_offer_rate: '20.00',
            }],
          });
        }
        if (query.includes('information_schema.tables') && query.includes('job_materials')) {
          return Promise.resolve({ rows: [{ exists: false }] });
        }
        if (query.includes('information_schema.columns')) {
          return Promise.resolve({ rows: [] });
        }
        // referral_requests table exists
        if (query.includes('information_schema.tables') && query.includes('referral_requests')) {
          return Promise.resolve({ rows: [{ exists: true }] });
        }
        // Approach performance with referrals
        if (query.includes('application_approach') && query.includes('referral_requests')) {
          return Promise.resolve({
            rows: [
              { application_approach: 'Referral', total_applications: '5', successful: '3', success_rate: '60.00' },
              { application_approach: 'Direct Contact', total_applications: '10', successful: '4', success_rate: '40.00' },
              { application_approach: 'Standard Application', total_applications: '15', successful: '3', success_rate: '20.00' },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/optimization')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.approachPerformance.length).toBeGreaterThan(0);
    });

    it('should handle referral_requests table check error', async () => {
      pool.query.mockImplementation((query, params) => {
        if (query.includes('total_applications') && query.includes('total_responses')) {
          return Promise.resolve({
            rows: [{
              total_applications: '30',
              total_responses: '10',
              total_interviews: '5',
              total_offers: '1',
              applications_with_response: '10',
              response_rate: '33.33',
              interview_rate: '16.67',
              offer_rate: '3.33',
              interview_to_offer_rate: '20.00',
            }],
          });
        }
        if (query.includes('information_schema.tables') && query.includes('job_materials')) {
          return Promise.resolve({ rows: [{ exists: false }] });
        }
        if (query.includes('information_schema.columns')) {
          return Promise.resolve({ rows: [] });
        }
        // referral_requests check fails
        if (query.includes('information_schema.tables') && query.includes('referral_requests')) {
          return Promise.reject(new Error('Table check error'));
        }
        // Fallback approach query
        if (query.includes('application_approach') && query.includes('contact_email')) {
          return Promise.resolve({
            rows: [
              { application_approach: 'Standard Application', total_applications: '30', successful: '5', success_rate: '16.67' },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/optimization')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
    });

    it('should generate low response rate recommendation', async () => {
      pool.query.mockImplementation((query, params) => {
        if (query.includes('total_applications') && query.includes('total_responses')) {
          return Promise.resolve({
            rows: [{
              total_applications: '100',
              total_responses: '10',
              total_interviews: '5',
              total_offers: '1',
              applications_with_response: '10',
              response_rate: '10.00',  // Below 20%
              interview_rate: '5.00',
              offer_rate: '1.00',
              interview_to_offer_rate: '20.00',
            }],
          });
        }
        if (query.includes('information_schema')) {
          return Promise.resolve({ rows: [{ exists: false }] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/optimization')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      const lowResponseRec = response.body.recommendations.find(r => r.title === 'Low Response Rate');
      expect(lowResponseRec).toBeDefined();
      expect(lowResponseRec.priority).toBe('high');
    });

    it('should generate low interview conversion recommendation', async () => {
      pool.query.mockImplementation((query, params) => {
        if (query.includes('total_applications') && query.includes('total_responses')) {
          return Promise.resolve({
            rows: [{
              total_applications: '100',
              total_responses: '25',
              total_interviews: '10',
              total_offers: '2',
              applications_with_response: '25',
              response_rate: '25.00',
              interview_rate: '10.00',  // Below 15%
              offer_rate: '2.00',
              interview_to_offer_rate: '20.00',
            }],
          });
        }
        if (query.includes('information_schema')) {
          return Promise.resolve({ rows: [{ exists: false }] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/optimization')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      const lowInterviewRec = response.body.recommendations.find(r => r.title === 'Low Interview Conversion');
      expect(lowInterviewRec).toBeDefined();
    });

    it('should generate interview performance recommendation', async () => {
      pool.query.mockImplementation((query, params) => {
        if (query.includes('total_applications') && query.includes('total_responses')) {
          return Promise.resolve({
            rows: [{
              total_applications: '50',
              total_responses: '15',
              total_interviews: '10',  // Has interviews
              total_offers: '1',
              applications_with_response: '15',
              response_rate: '30.00',
              interview_rate: '20.00',
              offer_rate: '2.00',
              interview_to_offer_rate: '10.00',  // Below 20%
            }],
          });
        }
        if (query.includes('information_schema')) {
          return Promise.resolve({ rows: [{ exists: false }] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/optimization')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      const interviewPerfRec = response.body.recommendations.find(r => r.title === 'Interview Performance');
      expect(interviewPerfRec).toBeDefined();
    });

    it('should generate best performing resume recommendation', async () => {
      pool.query.mockImplementation((query, params) => {
        if (query.includes('total_applications') && query.includes('total_responses')) {
          return Promise.resolve({
            rows: [{
              total_applications: '50',
              total_responses: '15',
              total_interviews: '10',
              total_offers: '2',
              applications_with_response: '15',
              response_rate: '30.00',
              interview_rate: '20.00',
              offer_rate: '4.00',
              interview_to_offer_rate: '20.00',
            }],
          });
        }
        if (query.includes('information_schema.tables') && query.includes('job_materials')) {
          return Promise.resolve({ rows: [{ exists: false }] });
        }
        if (query.includes('information_schema.columns') && query.includes("'resume_id', 'cover_letter_id'")) {
          return Promise.resolve({ rows: [{ column_name: 'resume_id' }] });
        }
        // Resume with much higher success rate
        if (query.includes('j.resume_id') && query.includes('LEFT JOIN resumes r ON j.resume_id')) {
          return Promise.resolve({
            rows: [
              { resume_id: 1, resume_name: 'Best Resume', total_applications: '10', successful: '5', success_rate: '50.00' },  // Much better than 20%
            ],
          });
        }
        if (query.includes('information_schema.columns') && query.includes("'resume_customization', 'cover_letter_customization'")) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('information_schema.tables') && query.includes('referral_requests')) {
          return Promise.resolve({ rows: [{ exists: false }] });
        }
        if (query.includes('application_approach')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/optimization')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      const bestResumeRec = response.body.recommendations.find(r => r.title === 'Best Performing Resume');
      expect(bestResumeRec).toBeDefined();
    });

    it('should generate best application approach recommendation', async () => {
      pool.query.mockImplementation((query, params) => {
        if (query.includes('total_applications') && query.includes('total_responses')) {
          return Promise.resolve({
            rows: [{
              total_applications: '50',
              total_responses: '15',
              total_interviews: '10',
              total_offers: '2',
              applications_with_response: '15',
              response_rate: '30.00',
              interview_rate: '20.00',
              offer_rate: '4.00',
              interview_to_offer_rate: '20.00',
            }],
          });
        }
        if (query.includes('information_schema.tables') && query.includes('job_materials')) {
          return Promise.resolve({ rows: [{ exists: false }] });
        }
        if (query.includes('information_schema.columns')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('information_schema.tables') && query.includes('referral_requests')) {
          return Promise.resolve({ rows: [{ exists: false }] });
        }
        // Approach with much higher success rate
        if (query.includes('application_approach') && query.includes('contact_email')) {
          return Promise.resolve({
            rows: [
              { application_approach: 'Direct Contact', total_applications: '10', successful: '5', success_rate: '50.00' },  // Much better than 20%
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/optimization')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      const bestApproachRec = response.body.recommendations.find(r => r.title === 'Best Application Approach');
      expect(bestApproachRec).toBeDefined();
    });

    it('should generate optimal timing recommendation', async () => {
      pool.query.mockImplementation((query, params) => {
        if (query.includes('total_applications') && query.includes('total_responses')) {
          return Promise.resolve({
            rows: [{
              total_applications: '50',
              total_responses: '15',
              total_interviews: '10',
              total_offers: '2',
              applications_with_response: '15',
              response_rate: '30.00',
              interview_rate: '20.00',
              offer_rate: '4.00',
              interview_to_offer_rate: '20.00',
            }],
          });
        }
        if (query.includes('information_schema')) {
          return Promise.resolve({ rows: [{ exists: false }] });
        }
        // Timing data
        if (query.includes('EXTRACT(DOW FROM') && query.includes('EXTRACT(HOUR FROM')) {
          return Promise.resolve({
            rows: [
              { day_of_week: '2', hour_of_day: '10', total_applications: '5', successful: '3', success_rate: '60.00' },
            ],
          });
        }
        if (query.includes('application_approach')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/optimization')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      const timingRec = response.body.recommendations.find(r => r.title === 'Optimal Application Timing');
      expect(timingRec).toBeDefined();
    });

    it('should generate best industry recommendation', async () => {
      pool.query.mockImplementation((query, params) => {
        if (query.includes('total_applications') && query.includes('total_responses')) {
          return Promise.resolve({
            rows: [{
              total_applications: '50',
              total_responses: '15',
              total_interviews: '10',
              total_offers: '2',
              applications_with_response: '15',
              response_rate: '30.00',
              interview_rate: '20.00',
              offer_rate: '4.00',
              interview_to_offer_rate: '20.00',
            }],
          });
        }
        if (query.includes('information_schema')) {
          return Promise.resolve({ rows: [{ exists: false }] });
        }
        // Industry with much higher success rate
        if (query.includes('GROUP BY industry')) {
          return Promise.resolve({
            rows: [
              { industry: 'Healthcare', total_applications: '8', successful: '4', success_rate: '50.00' },  // Much better than 20%
            ],
          });
        }
        if (query.includes('application_approach')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/optimization')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      const industryRec = response.body.recommendations.find(r => r.title === 'Best Performing Industry');
      expect(industryRec).toBeDefined();
    });

    it('should handle database error', async () => {
      pool.query.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .get('/api/optimization')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(500);
      expect(response.body.error).toBeDefined();
    });

    it('should return proper A/B test results structure', async () => {
      pool.query.mockImplementation((query, params) => {
        if (query.includes('total_applications') && query.includes('total_responses')) {
          return Promise.resolve({
            rows: [{
              total_applications: '50',
              total_responses: '15',
              total_interviews: '10',
              total_offers: '2',
              applications_with_response: '15',
              response_rate: '30.00',
              interview_rate: '20.00',
              offer_rate: '4.00',
              interview_to_offer_rate: '20.00',
            }],
          });
        }
        if (query.includes('information_schema.tables') && query.includes('job_materials')) {
          return Promise.resolve({ rows: [{ exists: false }] });
        }
        if (query.includes('information_schema.columns') && query.includes("'resume_id', 'cover_letter_id'")) {
          return Promise.resolve({ rows: [{ column_name: 'resume_id' }] });
        }
        if (query.includes('j.resume_id') && query.includes('LEFT JOIN resumes r ON j.resume_id')) {
          return Promise.resolve({
            rows: [
              { resume_id: 1, resume_name: 'Resume A', total_applications: '20', successful: '8', success_rate: '40.00' },
              { resume_id: 2, resume_name: 'Resume B', total_applications: '15', successful: '4', success_rate: '26.67' },
              { resume_id: 3, resume_name: 'Resume C', total_applications: '10', successful: '2', success_rate: '20.00' },
            ],
          });
        }
        if (query.includes('information_schema.columns') && query.includes("'resume_customization', 'cover_letter_customization'") && query.includes("table_name = 'jobs'")) {
          return Promise.resolve({ rows: [{ column_name: 'resume_customization' }, { column_name: 'cover_letter_customization' }] });
        }
        if (query.includes("table_name = 'job_application_materials'")) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('resume_customization') && query.includes('cover_letter_customization') && query.includes('GROUP BY')) {
          return Promise.resolve({
            rows: [
              { resume_customization: 'high', cover_letter_customization: 'high', total_applications: '10', successful: '5', success_rate: '50.00' },
              { resume_customization: 'low', cover_letter_customization: 'none', total_applications: '20', successful: '4', success_rate: '20.00' },
            ],
          });
        }
        if (query.includes('information_schema.tables') && query.includes('referral_requests')) {
          return Promise.resolve({ rows: [{ exists: false }] });
        }
        if (query.includes('application_approach') && query.includes('contact_email')) {
          return Promise.resolve({
            rows: [
              { application_approach: 'Direct Contact', total_applications: '10', successful: '5', success_rate: '50.00' },
              { application_approach: 'Standard Application', total_applications: '40', successful: '10', success_rate: '25.00' },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/optimization')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.abTestResults).toBeDefined();
      expect(response.body.abTestResults.resumeVersions).toBeDefined();
      expect(response.body.abTestResults.customizationLevels).toBeDefined();
      expect(response.body.abTestResults.applicationApproaches).toBeDefined();
      
      // Check winner flags
      if (response.body.abTestResults.resumeVersions.length > 0) {
        expect(response.body.abTestResults.resumeVersions[0].winner).toBe(true);
      }
    });

    it('should handle null/zero metrics gracefully', async () => {
      pool.query.mockImplementation((query, params) => {
        if (query.includes('total_applications') && query.includes('total_responses')) {
          return Promise.resolve({
            rows: [{
              total_applications: '0',
              total_responses: '0',
              total_interviews: '0',
              total_offers: '0',
              applications_with_response: '0',
              response_rate: null,
              interview_rate: null,
              offer_rate: null,
              interview_to_offer_rate: null,
            }],
          });
        }
        if (query.includes('information_schema')) {
          return Promise.resolve({ rows: [{ exists: false }] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/optimization')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.successMetrics.totalApplications).toBe(0);
      expect(response.body.successMetrics.responseRate).toBe(0);
    });

    it('should handle no resume_id column in jobs table', async () => {
      pool.query.mockImplementation((query, params) => {
        if (query.includes('total_applications') && query.includes('total_responses')) {
          return Promise.resolve({
            rows: [{
              total_applications: '30',
              total_responses: '10',
              total_interviews: '5',
              total_offers: '1',
              applications_with_response: '10',
              response_rate: '33.33',
              interview_rate: '16.67',
              offer_rate: '3.33',
              interview_to_offer_rate: '20.00',
            }],
          });
        }
        if (query.includes('information_schema.tables') && query.includes('job_materials')) {
          return Promise.resolve({ rows: [{ exists: false }] });
        }
        // No resume_id column
        if (query.includes('information_schema.columns') && query.includes("'resume_id', 'cover_letter_id'")) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('information_schema.columns')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('information_schema.tables') && query.includes('referral_requests')) {
          return Promise.resolve({ rows: [{ exists: false }] });
        }
        if (query.includes('application_approach')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/optimization')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.resumePerformance).toEqual([]);
    });

    it('should handle cover_letters table not existing', async () => {
      pool.query.mockImplementation((query, params) => {
        if (query.includes('total_applications') && query.includes('total_responses')) {
          return Promise.resolve({
            rows: [{
              total_applications: '30',
              total_responses: '10',
              total_interviews: '5',
              total_offers: '1',
              applications_with_response: '10',
              response_rate: '33.33',
              interview_rate: '16.67',
              offer_rate: '3.33',
              interview_to_offer_rate: '20.00',
            }],
          });
        }
        if (query.includes('information_schema.tables') && query.includes('job_materials')) {
          return Promise.resolve({ rows: [{ exists: true }] });
        }
        if (query.includes('jm.resume_id') && query.includes('INNER JOIN job_materials')) {
          return Promise.resolve({ rows: [] });
        }
        // Cover letter table doesn't exist
        if (query.includes('information_schema.tables') && query.includes("IN ('cover_letters', 'uploaded_cover_letters')")) {
          return Promise.resolve({ rows: [{ exists: false }] });
        }
        if (query.includes('information_schema.columns')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('information_schema.tables') && query.includes('referral_requests')) {
          return Promise.resolve({ rows: [{ exists: false }] });
        }
        if (query.includes('application_approach')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/optimization')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.coverLetterPerformance).toEqual([]);
    });
  });
});

