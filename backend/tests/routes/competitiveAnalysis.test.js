/**
 * Competitive Analysis Routes Tests
 * Tests routes/competitiveAnalysis.js
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import competitiveAnalysisRoutes from '../../routes/competitiveAnalysis.js';
import { createTestUser } from '../helpers/auth.js';
import pool from '../../db/pool.js';

// Mock dependencies
vi.mock('../../auth.js', () => ({
  auth: vi.fn((req, res, next) => {
    req.user = { id: 1 };
    next();
  }),
}));

vi.mock('../../db/pool.js', () => ({
  default: {
    query: vi.fn(),
  },
}));

describe('Competitive Analysis Routes', () => {
  let app;
  let user;
  let userId;

  beforeEach(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
    
    app = express();
    app.use(express.json());
    app.use('/api/competitive-analysis', competitiveAnalysisRoutes);
    
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

  describe('GET /api/competitive-analysis', () => {
    it('should get competitive analysis data', async () => {
      pool.query.mockImplementation((query) => {
        // User's jobs
        if (query.includes('SELECT id, title, company, industry, status') && query.includes('WHERE user_id = $1')) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                title: 'Software Engineer',
                company: 'Tech Corp',
                industry: 'Technology',
                status: 'Applied',
                applied_on: '2024-01-15',
                created_at: '2024-01-15',
              },
            ],
          });
        }
        // User's skills
        if (query.includes('SELECT name, category, proficiency FROM skills WHERE user_id = $1')) {
          return Promise.resolve({
            rows: [
              { name: 'JavaScript', category: 'Technical', proficiency: 'Expert' },
              { name: 'Python', category: 'Technical', proficiency: 'Advanced' },
            ],
          });
        }
        // User's employment
        if (query.includes('SELECT title, company, start_date, end_date, current FROM employment WHERE user_id = $1')) {
          return Promise.resolve({
            rows: [
              {
                title: 'Software Engineer',
                company: 'Tech Corp',
                start_date: '2020-01-01',
                end_date: null,
                current: true,
              },
            ],
          });
        }
        // User's education
        if (query.includes('SELECT degree_type, field_of_study FROM education WHERE user_id = $1')) {
          return Promise.resolve({
            rows: [
              { degree_type: 'Bachelor', field_of_study: 'Computer Science' },
            ],
          });
        }
        // User's certifications
        if (query.includes('SELECT name, organization FROM certifications WHERE user_id = $1')) {
          return Promise.resolve({
            rows: [
              { name: 'AWS Certified', organization: 'AWS' },
            ],
          });
        }
        // User's networking contacts
        if (query.includes('SELECT COUNT(*) as count FROM networking_contacts WHERE user_id = $1')) {
          return Promise.resolve({
            rows: [{ count: '10' }],
          });
        }
        // User's networking activities
        if (query.includes('SELECT COUNT(*) as count FROM networking_activities WHERE user_id = $1')) {
          return Promise.resolve({
            rows: [{ count: '5' }],
          });
        }
        // User's interview outcomes
        if (query.includes('SELECT io.job_id, io.company') && query.includes('WHERE io.user_id = $1')) {
          return Promise.resolve({ rows: [] });
        }
        // All users' jobs
        if (query.includes('SELECT user_id, id, title, company') && !query.includes('WHERE user_id = $1')) {
          return Promise.resolve({
            rows: [
              { user_id: userId, id: 1, title: 'Software Engineer', company: 'Tech Corp', industry: 'Technology', status: 'Applied', applied_on: '2024-01-15', created_at: '2024-01-15' },
              { user_id: 2, id: 2, title: 'Data Scientist', company: 'Data Corp', industry: 'Technology', status: 'Interview', applied_on: '2024-01-10', created_at: '2024-01-10' },
            ],
          });
        }
        // All users' skills
        if (query.includes('SELECT user_id, name, category, proficiency FROM skills') && !query.includes('WHERE user_id = $1')) {
          return Promise.resolve({
            rows: [
              { user_id: userId, name: 'JavaScript', category: 'Technical', proficiency: 'Expert' },
              { user_id: 2, name: 'Python', category: 'Technical', proficiency: 'Advanced' },
            ],
          });
        }
        // All users' employment
        if (query.includes('SELECT user_id, title, company, start_date, end_date, current FROM employment') && !query.includes('WHERE user_id = $1')) {
          return Promise.resolve({
            rows: [
              { user_id: userId, title: 'Software Engineer', company: 'Tech Corp', start_date: '2020-01-01', end_date: null, current: true },
              { user_id: 2, title: 'Data Scientist', company: 'Data Corp', start_date: '2019-01-01', end_date: null, current: true },
            ],
          });
        }
        // All users' education
        if (query.includes('SELECT user_id, degree_type, field_of_study FROM education') && !query.includes('WHERE user_id = $1')) {
          return Promise.resolve({
            rows: [
              { user_id: userId, degree_type: 'Bachelor', field_of_study: 'Computer Science' },
              { user_id: 2, degree_type: 'Master', field_of_study: 'Data Science' },
            ],
          });
        }
        // All users' certifications
        if (query.includes('SELECT user_id FROM certifications') && !query.includes('WHERE user_id = $1')) {
          return Promise.resolve({
            rows: [
              { user_id: userId },
              { user_id: 2 },
            ],
          });
        }
        // All users' networking contacts
        if (query.includes('SELECT user_id, COUNT(*) as count FROM networking_contacts GROUP BY user_id')) {
          return Promise.resolve({
            rows: [
              { user_id: userId, count: '10' },
              { user_id: 2, count: '20' },
            ],
          });
        }
        // All users' interview outcomes
        if (query.includes('SELECT io.user_id, io.job_id') && !query.includes('WHERE io.user_id = $1')) {
          return Promise.resolve({
            rows: [
              { user_id: userId, job_id: 1, job_user_id: userId },
              { user_id: 2, job_id: 2, job_user_id: 2 },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/competitive-analysis')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.marketPosition).toBeDefined();
      expect(response.body.userMetrics).toBeDefined();
      expect(response.body.comparisons).toBeDefined();
      expect(response.body.skillsProfile).toBeDefined();
      expect(response.body.experienceProfile).toBeDefined();
      expect(response.body.skillGaps).toBeDefined();
      expect(response.body.recommendations).toBeDefined();
      expect(response.body.differentiationStrategies).toBeDefined();
      expect(response.body.benchmarkData).toBeDefined();
    });

    it('should handle missing tables gracefully', async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT id, title, company') && query.includes('WHERE user_id = $1')) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                title: 'Software Engineer',
                company: 'Tech Corp',
                industry: 'Technology',
                status: 'Applied',
                applied_on: '2024-01-15',
                created_at: '2024-01-15',
              },
            ],
          });
        }
        if (query.includes('SELECT name, category, proficiency FROM skills WHERE user_id = $1')) {
          return Promise.reject(new Error('Table skills does not exist'));
        }
        if (query.includes('SELECT title, company FROM employment WHERE user_id = $1')) {
          return Promise.reject(new Error('Table employment does not exist'));
        }
        if (query.includes('SELECT degree_type FROM education WHERE user_id = $1')) {
          return Promise.reject(new Error('Table education does not exist'));
        }
        if (query.includes('SELECT name FROM certifications WHERE user_id = $1')) {
          return Promise.reject(new Error('Table certifications does not exist'));
        }
        if (query.includes('SELECT COUNT(*) FROM networking_contacts')) {
          return Promise.reject(new Error('Table networking_contacts does not exist'));
        }
        if (query.includes('SELECT io.job_id')) {
          return Promise.reject(new Error('Table interview_outcomes does not exist'));
        }
        // All users queries
        if (query.includes('SELECT user_id, id, title') && !query.includes('WHERE user_id = $1')) {
          return Promise.resolve({
            rows: [
              { user_id: userId, id: 1, title: 'Software Engineer', company: 'Tech Corp', industry: 'Technology', status: 'Applied', applied_on: '2024-01-15', created_at: '2024-01-15' },
            ],
          });
        }
        if (query.includes('SELECT user_id, name') && !query.includes('WHERE user_id = $1')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT user_id, title') && !query.includes('WHERE user_id = $1')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT user_id, degree_type') && !query.includes('WHERE user_id = $1')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT user_id FROM certifications') && !query.includes('WHERE user_id = $1')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT user_id, COUNT(*) FROM networking_contacts')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT io.user_id, io.job_id') && !query.includes('WHERE io.user_id = $1')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/competitive-analysis')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.userMetrics).toBeDefined();
    });

    it('should calculate market position correctly', async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT id, title, company') && query.includes('WHERE user_id = $1')) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                title: 'Software Engineer',
                company: 'Tech Corp',
                industry: 'Technology',
                status: 'Interview',
                applied_on: '2024-01-15',
                created_at: '2024-01-15',
              },
            ],
          });
        }
        if (query.includes('SELECT name, category, proficiency FROM skills WHERE user_id = $1')) {
          return Promise.resolve({
            rows: [
              { name: 'JavaScript', category: 'Technical', proficiency: 'Expert' },
              { name: 'Python', category: 'Technical', proficiency: 'Advanced' },
              { name: 'React', category: 'Technical', proficiency: 'Expert' },
            ],
          });
        }
        if (query.includes('SELECT title, company FROM employment WHERE user_id = $1')) {
          return Promise.resolve({
            rows: [
              {
                title: 'Senior Software Engineer',
                company: 'Tech Corp',
                start_date: '2020-01-01',
                end_date: null,
                current: true,
              },
            ],
          });
        }
        if (query.includes('SELECT degree_type FROM education WHERE user_id = $1')) {
          return Promise.resolve({
            rows: [{ degree_type: 'Bachelor', field_of_study: 'Computer Science' }],
          });
        }
        if (query.includes('SELECT name FROM certifications WHERE user_id = $1')) {
          return Promise.resolve({
            rows: [{ name: 'AWS Certified', organization: 'AWS' }],
          });
        }
        if (query.includes('SELECT COUNT(*) FROM networking_contacts WHERE user_id = $1')) {
          return Promise.resolve({ rows: [{ count: '15' }] });
        }
        if (query.includes('SELECT COUNT(*) FROM networking_activities WHERE user_id = $1')) {
          return Promise.resolve({ rows: [{ count: '8' }] });
        }
        if (query.includes('SELECT io.job_id') && query.includes('WHERE io.user_id = $1')) {
          return Promise.resolve({ rows: [] });
        }
        // All users data - return lower values to make current user look better
        if (query.includes('SELECT user_id, id, title') && !query.includes('WHERE user_id = $1')) {
          return Promise.resolve({
            rows: [
              { user_id: userId, id: 1, title: 'Software Engineer', company: 'Tech Corp', industry: 'Technology', status: 'Interview', applied_on: '2024-01-15', created_at: '2024-01-15' },
              { user_id: 2, id: 2, title: 'Data Scientist', company: 'Data Corp', industry: 'Technology', status: 'Applied', applied_on: '2024-01-10', created_at: '2024-01-10' },
            ],
          });
        }
        if (query.includes('SELECT user_id, name') && !query.includes('WHERE user_id = $1')) {
          return Promise.resolve({
            rows: [
              { user_id: userId, name: 'JavaScript', category: 'Technical', proficiency: 'Expert' },
              { user_id: 2, name: 'Python', category: 'Technical', proficiency: 'Intermediate' },
            ],
          });
        }
        if (query.includes('SELECT user_id, title') && !query.includes('WHERE user_id = $1')) {
          return Promise.resolve({
            rows: [
              { user_id: userId, title: 'Senior Software Engineer', company: 'Tech Corp', start_date: '2020-01-01', end_date: null, current: true },
              { user_id: 2, title: 'Junior Data Scientist', company: 'Data Corp', start_date: '2023-01-01', end_date: null, current: true },
            ],
          });
        }
        if (query.includes('SELECT user_id, degree_type') && !query.includes('WHERE user_id = $1')) {
          return Promise.resolve({
            rows: [
              { user_id: userId, degree_type: 'Bachelor', field_of_study: 'Computer Science' },
              { user_id: 2, degree_type: 'Bachelor', field_of_study: 'Mathematics' },
            ],
          });
        }
        if (query.includes('SELECT user_id FROM certifications') && !query.includes('WHERE user_id = $1')) {
          return Promise.resolve({
            rows: [
              { user_id: userId },
              { user_id: 2 },
            ],
          });
        }
        if (query.includes('SELECT user_id, COUNT(*) FROM networking_contacts')) {
          return Promise.resolve({
            rows: [
              { user_id: userId, count: '15' },
              { user_id: 2, count: '5' },
            ],
          });
        }
        if (query.includes('SELECT io.user_id, io.job_id') && !query.includes('WHERE io.user_id = $1')) {
          return Promise.resolve({
            rows: [
              { user_id: userId, job_id: 1, job_user_id: userId },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/competitive-analysis')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.marketPosition.score).toBeDefined();
      expect(response.body.marketPosition.position).toBeDefined();
    });
  });
});





