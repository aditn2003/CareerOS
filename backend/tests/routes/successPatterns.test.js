/**
 * Success Patterns Routes Tests
 * Tests routes/successPatterns.js
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import successPatternsRoutes from '../../routes/successPatterns.js';
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

describe('Success Patterns Routes', () => {
  let app;
  let user;
  let userId;

  beforeEach(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
    
    app = express();
    app.use(express.json());
    app.use('/api/success-patterns', successPatternsRoutes);
    
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

  describe('GET /api/success-patterns', () => {
    it('should get success patterns analysis', async () => {
      pool.query.mockImplementation((query) => {
        // Check for customization columns
        if (query.includes('SELECT column_name FROM information_schema.columns')) {
          return Promise.resolve({
            rows: [
              { column_name: 'resume_customization' },
              { column_name: 'cover_letter_customization' },
            ],
          });
        }
        // User's jobs
        if (query.includes('SELECT id, title, company, location, industry, status') && query.includes('WHERE user_id = $1')) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                title: 'Software Engineer',
                company: 'Tech Corp',
                location: 'San Francisco, CA',
                industry: 'Technology',
                status: 'Interview',
                applied_on: '2024-01-15',
                created_at: '2024-01-15',
                status_updated_at: '2024-01-20',
                resume_customization: 'tailored',
                cover_letter_customization: 'tailored',
              },
            ],
          });
        }
        // Networking activities
        if (query.includes('SELECT id, activity_type, created_at FROM networking_activities WHERE user_id = $1')) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                activity_type: 'linkedin_message',
                created_at: '2024-01-10',
              },
            ],
          });
        }
        // Company research
        if (query.includes('SELECT company, created_at FROM company_research')) {
          return Promise.resolve({
            rows: [
              { company: 'Tech Corp', created_at: '2024-01-12' },
            ],
          });
        }
        // Skills
        if (query.includes('SELECT name, category, proficiency FROM skills WHERE user_id = $1')) {
          return Promise.resolve({
            rows: [
              { name: 'JavaScript', category: 'Technical', proficiency: 'Expert' },
              { name: 'Python', category: 'Technical', proficiency: 'Advanced' },
            ],
          });
        }
        // Employment
        if (query.includes('SELECT title, company, start_date, end_date FROM employment WHERE user_id = $1')) {
          return Promise.resolve({
            rows: [
              {
                title: 'Software Engineer',
                company: 'Tech Corp',
                start_date: '2020-01-01',
                end_date: null,
              },
            ],
          });
        }
        // Application history
        if (query.includes('SELECT job_id, event, timestamp, from_status, to_status FROM application_history WHERE user_id = $1')) {
          return Promise.resolve({
            rows: [
              {
                job_id: 1,
                event: 'Status changed',
                timestamp: '2024-01-20',
                from_status: 'Applied',
                to_status: 'Interview',
              },
            ],
          });
        }
        // Interview outcomes
        if (query.includes('SELECT io.job_id, io.company, io.interview_date') && query.includes('WHERE io.user_id = $1')) {
          return Promise.resolve({
            rows: [
              {
                job_id: 1,
                company: 'Tech Corp',
                interview_date: '2024-01-25',
                outcome: 'passed',
                interview_type: 'technical',
                difficulty_rating: 7,
                self_rating: 8,
                hours_prepared: 5,
                mock_interviews_completed: 2,
              },
            ],
          });
        }
        // Mock interviews
        if (query.includes('SELECT id, company, role, status FROM mock_interview_sessions WHERE user_id = $1')) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                company: 'Tech Corp',
                role: 'Software Engineer',
                status: 'completed',
                created_at: '2024-01-10',
                completed_at: '2024-01-10',
                overall_performance_score: 85,
              },
            ],
          });
        }
        // Technical prep sessions
        if (query.includes('SELECT id, company, role, prep_type FROM technical_prep_sessions WHERE user_id = $1')) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                company: 'Tech Corp',
                role: 'Software Engineer',
                prep_type: 'coding',
                status: 'completed',
                time_spent_seconds: 3600,
                created_at: '2024-01-12',
                completed_at: '2024-01-12',
              },
            ],
          });
        }
        // Interview preparation
        if (query.includes('SELECT interview_id, framework_type FROM interview_preparation WHERE user_id = $1')) {
          return Promise.resolve({
            rows: [
              {
                interview_id: 1,
                framework_type: 'STAR',
                company_research: true,
                role_research: true,
                created_at: '2024-01-18',
              },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/success-patterns')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.summary).toBeDefined();
      expect(response.body.applicationPatterns).toBeDefined();
      expect(response.body.preparationCorrelation).toBeDefined();
      expect(response.body.timingPatterns).toBeDefined();
      expect(response.body.strategyEffectiveness).toBeDefined();
      expect(response.body.successFactors).toBeDefined();
      expect(response.body.predictiveModel).toBeDefined();
      expect(response.body.patternEvolution).toBeDefined();
      expect(response.body.recommendations).toBeDefined();
    });

    it('should handle missing customization columns', async () => {
      pool.query.mockImplementation((query) => {
        // No customization columns
        if (query.includes('SELECT column_name FROM information_schema.columns')) {
          return Promise.resolve({ rows: [] });
        }
        // User's jobs without customization columns
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
                status_updated_at: '2024-01-20',
              },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/success-patterns')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.applicationPatterns).toBeDefined();
    });

    it('should handle missing tables gracefully', async () => {
      pool.query.mockImplementation((query) => {
        // Check for customization columns
        if (query.includes('SELECT column_name FROM information_schema.columns')) {
          return Promise.resolve({ rows: [] });
        }
        // User's jobs
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
                status_updated_at: '2024-01-20',
              },
            ],
          });
        }
        // Missing tables
        if (query.includes('SELECT id, activity_type FROM networking_activities')) {
          return Promise.reject(new Error('Table networking_activities does not exist'));
        }
        if (query.includes('SELECT company FROM company_research')) {
          return Promise.reject(new Error('Table company_research does not exist'));
        }
        if (query.includes('SELECT name FROM skills WHERE user_id = $1')) {
          return Promise.reject(new Error('Table skills does not exist'));
        }
        if (query.includes('SELECT title FROM employment WHERE user_id = $1')) {
          return Promise.reject(new Error('Table employment does not exist'));
        }
        if (query.includes('SELECT job_id FROM application_history WHERE user_id = $1')) {
          return Promise.reject(new Error('Table application_history does not exist'));
        }
        if (query.includes('SELECT io.job_id FROM interview_outcomes')) {
          return Promise.reject(new Error('Table interview_outcomes does not exist'));
        }
        if (query.includes('SELECT id FROM mock_interview_sessions')) {
          return Promise.reject(new Error('Table mock_interview_sessions does not exist'));
        }
        if (query.includes('SELECT id FROM technical_prep_sessions')) {
          return Promise.reject(new Error('Table technical_prep_sessions does not exist'));
        }
        if (query.includes('SELECT interview_id FROM interview_preparation')) {
          return Promise.reject(new Error('Table interview_preparation does not exist'));
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/success-patterns')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.summary).toBeDefined();
    });

    it('should analyze industry success rates', async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT column_name FROM information_schema.columns')) {
          return Promise.resolve({ rows: [] });
        }
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
                status_updated_at: '2024-01-20',
              },
              {
                id: 2,
                title: 'Data Scientist',
                company: 'Data Corp',
                industry: 'Technology',
                status: 'Rejected',
                applied_on: '2024-01-10',
                created_at: '2024-01-10',
                status_updated_at: '2024-01-12',
              },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/success-patterns')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.applicationPatterns.industrySuccessRates).toBeDefined();
      expect(Array.isArray(response.body.applicationPatterns.industrySuccessRates)).toBe(true);
    });

    it('should calculate preparation correlation', async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT column_name FROM information_schema.columns')) {
          return Promise.resolve({ rows: [] });
        }
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
                status_updated_at: '2024-01-20',
              },
            ],
          });
        }
        if (query.includes('SELECT id, activity_type FROM networking_activities')) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                activity_type: 'linkedin_message',
                created_at: '2024-01-10',
              },
            ],
          });
        }
        if (query.includes('SELECT company FROM company_research')) {
          return Promise.resolve({
            rows: [
              { company: 'Tech Corp', created_at: '2024-01-12' },
            ],
          });
        }
        if (query.includes('SELECT id FROM mock_interview_sessions')) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                company: 'Tech Corp',
                role: 'Software Engineer',
                created_at: '2024-01-10',
              },
            ],
          });
        }
        if (query.includes('SELECT id FROM technical_prep_sessions')) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                company: 'Tech Corp',
                role: 'Software Engineer',
                created_at: '2024-01-12',
              },
            ],
          });
        }
        if (query.includes('SELECT interview_id FROM interview_preparation')) {
          return Promise.resolve({
            rows: [
              {
                interview_id: 1,
                created_at: '2024-01-18',
              },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/success-patterns')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.preparationCorrelation.preparationData).toBeDefined();
      expect(response.body.preparationCorrelation.bestStrategy).toBeDefined();
    });

    it('should analyze timing patterns', async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT column_name FROM information_schema.columns')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT id, title, company') && query.includes('WHERE user_id = $1')) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                title: 'Software Engineer',
                company: 'Tech Corp',
                industry: 'Technology',
                status: 'Offer',
                applied_on: '2024-01-15',
                created_at: '2024-01-15',
                status_updated_at: '2024-01-30',
              },
            ],
          });
        }
        if (query.includes('SELECT job_id, event, timestamp FROM application_history')) {
          return Promise.resolve({
            rows: [
              {
                job_id: 1,
                event: 'Status changed',
                timestamp: '2024-01-20',
                from_status: 'Applied',
                to_status: 'Interview',
              },
              {
                job_id: 1,
                event: 'Status changed',
                timestamp: '2024-01-30',
                from_status: 'Interview',
                to_status: 'Offer',
              },
            ],
          });
        }
        if (query.includes('SELECT io.job_id, io.company, io.interview_date')) {
          return Promise.resolve({
            rows: [
              {
                job_id: 1,
                company: 'Tech Corp',
                interview_date: '2024-01-25',
                outcome: 'passed',
              },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/success-patterns')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.timingPatterns.averages).toBeDefined();
      expect(response.body.timingPatterns.optimalWindows).toBeDefined();
    });

    it('should track pattern evolution', async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT column_name FROM information_schema.columns')) {
          return Promise.resolve({ rows: [] });
        }
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
                status_updated_at: '2024-01-20',
              },
              {
                id: 2,
                title: 'Data Scientist',
                company: 'Data Corp',
                industry: 'Technology',
                status: 'Offer',
                applied_on: '2024-02-10',
                created_at: '2024-02-10',
                status_updated_at: '2024-02-25',
              },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/success-patterns')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.patternEvolution.evolution).toBeDefined();
      expect(Array.isArray(response.body.patternEvolution.evolution)).toBe(true);
      expect(response.body.patternEvolution.trend).toBeDefined();
    });

    it('should exclude Interested status from actual applications', async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT column_name FROM information_schema.columns')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT id, title, company') && query.includes('WHERE user_id = $1')) {
          return Promise.resolve({
            rows: [
              { id: 1, status: 'Interested', applied_on: '2024-01-15', created_at: '2024-01-15' },
              { id: 2, status: 'Interview', applied_on: '2024-01-10', created_at: '2024-01-10', status_updated_at: '2024-01-12' },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/success-patterns')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.summary.totalApplications).toBe(1);
    });

    it('should handle multiple jobs per company for success rates', async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT column_name FROM information_schema.columns')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT id, title, company') && query.includes('WHERE user_id = $1')) {
          return Promise.resolve({
            rows: [
              { id: 1, company: 'Tech Corp', industry: 'Technology', status: 'Interview', applied_on: '2024-01-15', created_at: '2024-01-15' },
              { id: 2, company: 'Tech Corp', industry: 'Technology', status: 'Rejected', applied_on: '2024-01-16', created_at: '2024-01-16' },
              { id: 3, company: 'Tech Corp', industry: 'Technology', status: 'Offer', applied_on: '2024-01-17', created_at: '2024-01-17' },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/success-patterns')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.applicationPatterns.companySuccessRates).toBeDefined();
    });

    it('should handle jobs with location data', async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT column_name FROM information_schema.columns')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT id, title, company') && query.includes('WHERE user_id = $1')) {
          return Promise.resolve({
            rows: [
              { id: 1, company: 'Tech Corp', location: 'San Francisco, CA', status: 'Interview', applied_on: '2024-01-15', created_at: '2024-01-15' },
              { id: 2, company: 'Data Corp', location: 'New York, NY', status: 'Offer', applied_on: '2024-01-16', created_at: '2024-01-16' },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/success-patterns')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.applicationPatterns.locationSuccessRates).toBeDefined();
    });

    it('should analyze timing patterns with application history', async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT column_name FROM information_schema.columns')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT id, title, company') && query.includes('WHERE user_id = $1')) {
          return Promise.resolve({
            rows: [
              { id: 1, company: 'Tech Corp', status: 'Offer', applied_on: '2024-01-15', created_at: '2024-01-15', status_updated_at: '2024-01-30' },
            ],
          });
        }
        if (query.includes('SELECT job_id, event, timestamp, from_status, to_status FROM application_history')) {
          return Promise.resolve({
            rows: [
              { job_id: 1, event: 'Interview scheduled', timestamp: '2024-01-20', from_status: 'Applied', to_status: 'Interview' },
              { job_id: 1, event: 'Offer received', timestamp: '2024-01-30', from_status: 'Interview', to_status: 'Offer' },
            ],
          });
        }
        if (query.includes('SELECT io.job_id, io.company, io.interview_date')) {
          return Promise.resolve({
            rows: [{ job_id: 1, company: 'Tech Corp', interview_date: '2024-01-25', outcome: 'passed' }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/success-patterns')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.timingPatterns.averages).toBeDefined();
    });

    it('should generate recommendations based on patterns', async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT column_name FROM information_schema.columns')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT id, title, company') && query.includes('WHERE user_id = $1')) {
          return Promise.resolve({
            rows: [
              { id: 1, industry: 'Technology', status: 'Offer', applied_on: '2024-01-15T10:00:00', created_at: '2024-01-15T10:00:00' },
              { id: 2, industry: 'Technology', status: 'Interview', applied_on: '2024-01-16T10:00:00', created_at: '2024-01-16T10:00:00' },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/success-patterns')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.recommendations).toBeDefined();
    });

    it('should detect improving trend in pattern evolution', async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT column_name FROM information_schema.columns')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT id, title, company') && query.includes('WHERE user_id = $1')) {
          return Promise.resolve({
            rows: [
              { id: 1, status: 'Rejected', applied_on: '2024-01-15', created_at: '2024-01-15' },
              { id: 2, status: 'Rejected', applied_on: '2024-01-16', created_at: '2024-01-16' },
              { id: 3, status: 'Interview', applied_on: '2024-02-15', created_at: '2024-02-15' },
              { id: 4, status: 'Offer', applied_on: '2024-02-16', created_at: '2024-02-16' },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/success-patterns')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.patternEvolution.trend).toBeDefined();
    });

    it('should handle database error on jobs query', async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT column_name FROM information_schema.columns')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT id, title, company') && query.includes('WHERE user_id = $1')) {
          return Promise.reject(new Error('Database connection failed'));
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/success-patterns')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(500);
    });

    it('should handle column check error gracefully', async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT column_name FROM information_schema.columns')) {
          return Promise.reject(new Error('Schema query failed'));
        }
        if (query.includes('SELECT id, title, company') && query.includes('WHERE user_id = $1')) {
          return Promise.resolve({
            rows: [{ id: 1, status: 'Interview', applied_on: '2024-01-15', created_at: '2024-01-15' }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/success-patterns')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
    });

    it('should identify success factors from skills and employment', async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT column_name FROM information_schema.columns')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT id, title, company') && query.includes('WHERE user_id = $1')) {
          return Promise.resolve({
            rows: [{ id: 1, industry: 'Technology', company: 'Tech Corp', status: 'Offer', applied_on: '2024-01-15', created_at: '2024-01-15' }],
          });
        }
        if (query.includes('SELECT name, category, proficiency FROM skills')) {
          return Promise.resolve({
            rows: [
              { name: 'JavaScript', category: 'Technical', proficiency: 'Expert' },
              { name: 'Python', category: 'Technical', proficiency: 'Advanced' },
            ],
          });
        }
        if (query.includes('SELECT title, company, start_date, end_date FROM employment')) {
          return Promise.resolve({
            rows: [{ title: 'Senior Engineer', company: 'Previous Corp', start_date: '2020-01-01', end_date: null }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/success-patterns')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.successFactors).toBeDefined();
    });

    it('should calculate predictive model with preparation data', async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT column_name FROM information_schema.columns')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT id, title, company') && query.includes('WHERE user_id = $1')) {
          return Promise.resolve({
            rows: [
              { id: 1, industry: 'Technology', status: 'Offer', applied_on: '2024-01-15', created_at: '2024-01-15' },
              { id: 2, industry: 'Technology', status: 'Rejected', applied_on: '2024-01-17', created_at: '2024-01-17' },
            ],
          });
        }
        if (query.includes('SELECT id, activity_type, created_at FROM networking_activities')) {
          return Promise.resolve({
            rows: [{ id: 1, activity_type: 'coffee_chat', created_at: '2024-01-10' }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/success-patterns')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.predictiveModel).toBeDefined();
    });

    it('should handle jobs with empty industry', async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT column_name FROM information_schema.columns')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT id, title, company') && query.includes('WHERE user_id = $1')) {
          return Promise.resolve({
            rows: [
              { id: 1, industry: '', status: 'Interview', applied_on: '2024-01-15', created_at: '2024-01-15' },
              { id: 2, industry: null, status: 'Offer', applied_on: '2024-01-16', created_at: '2024-01-16' },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/success-patterns')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
    });

    it('should analyze preparation correlation with interview prep', async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT column_name FROM information_schema.columns')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT id, title, company') && query.includes('WHERE user_id = $1')) {
          return Promise.resolve({
            rows: [{ id: 1, company: 'Tech Corp', status: 'Offer', applied_on: '2024-01-20', created_at: '2024-01-20' }],
          });
        }
        if (query.includes('SELECT company, created_at FROM company_research')) {
          return Promise.resolve({
            rows: [{ company: 'Tech Corp', created_at: '2024-01-15' }],
          });
        }
        if (query.includes('SELECT id, company, role, status, created_at, completed_at, overall_performance_score FROM mock_interview_sessions')) {
          return Promise.resolve({
            rows: [{ id: 1, company: 'Tech Corp', created_at: '2024-01-10' }],
          });
        }
        if (query.includes('SELECT id, company, role, prep_type, status, time_spent_seconds, created_at, completed_at FROM technical_prep_sessions')) {
          return Promise.resolve({
            rows: [{ id: 1, company: 'Tech Corp', created_at: '2024-01-12' }],
          });
        }
        if (query.includes('SELECT interview_id, framework_type, company_research, role_research, created_at FROM interview_preparation')) {
          return Promise.resolve({
            rows: [{ interview_id: 1, framework_type: 'STAR', created_at: '2024-01-18' }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/success-patterns')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.preparationCorrelation).toBeDefined();
    });
  });

  describe('Error Handling for Data Fetch Operations', () => {
    it('should handle skills fetch error gracefully', async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT column_name FROM information_schema.columns')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT id, title, company') && query.includes('WHERE user_id = $1')) {
          return Promise.resolve({
            rows: [{ id: 1, status: 'Interview', applied_on: '2024-01-15', created_at: '2024-01-15' }],
          });
        }
        if (query.includes('SELECT name, category, proficiency FROM skills')) {
          return Promise.reject(new Error('Skills fetch failed'));
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/success-patterns')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
    });

    it('should handle employment fetch error gracefully', async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT column_name FROM information_schema.columns')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT id, title, company') && query.includes('WHERE user_id = $1')) {
          return Promise.resolve({
            rows: [{ id: 1, status: 'Interview', applied_on: '2024-01-15', created_at: '2024-01-15' }],
          });
        }
        if (query.includes('SELECT title, company, start_date, end_date FROM employment')) {
          return Promise.reject(new Error('Employment fetch failed'));
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/success-patterns')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
    });

    it('should handle application history fetch error gracefully', async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT column_name FROM information_schema.columns')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT id, title, company') && query.includes('WHERE user_id = $1')) {
          return Promise.resolve({
            rows: [{ id: 1, status: 'Interview', applied_on: '2024-01-15', created_at: '2024-01-15' }],
          });
        }
        if (query.includes('SELECT job_id, event, timestamp, from_status, to_status FROM application_history')) {
          return Promise.reject(new Error('Application history fetch failed'));
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/success-patterns')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
    });

    it('should handle interview outcomes fetch error gracefully', async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT column_name FROM information_schema.columns')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT id, title, company') && query.includes('WHERE user_id = $1')) {
          return Promise.resolve({
            rows: [{ id: 1, status: 'Interview', applied_on: '2024-01-15', created_at: '2024-01-15' }],
          });
        }
        if (query.includes('SELECT io.job_id, io.company, io.interview_date')) {
          return Promise.reject(new Error('Interview outcomes fetch failed'));
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/success-patterns')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
    });

    it('should handle mock interviews fetch error gracefully', async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT column_name FROM information_schema.columns')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT id, title, company') && query.includes('WHERE user_id = $1')) {
          return Promise.resolve({
            rows: [{ id: 1, status: 'Interview', applied_on: '2024-01-15', created_at: '2024-01-15' }],
          });
        }
        if (query.includes('SELECT id, company, role, status, created_at, completed_at, overall_performance_score FROM mock_interview_sessions')) {
          return Promise.reject(new Error('Mock interviews fetch failed'));
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/success-patterns')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
    });

    it('should handle technical prep sessions fetch error gracefully', async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT column_name FROM information_schema.columns')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT id, title, company') && query.includes('WHERE user_id = $1')) {
          return Promise.resolve({
            rows: [{ id: 1, status: 'Interview', applied_on: '2024-01-15', created_at: '2024-01-15' }],
          });
        }
        if (query.includes('SELECT id, company, role, prep_type, status, time_spent_seconds, created_at, completed_at FROM technical_prep_sessions')) {
          return Promise.reject(new Error('Tech prep sessions fetch failed'));
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/success-patterns')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
    });

    it('should handle interview preparation fetch error gracefully', async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT column_name FROM information_schema.columns')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT id, title, company') && query.includes('WHERE user_id = $1')) {
          return Promise.resolve({
            rows: [{ id: 1, status: 'Interview', applied_on: '2024-01-15', created_at: '2024-01-15' }],
          });
        }
        if (query.includes('SELECT interview_id, framework_type, company_research, role_research, created_at FROM interview_preparation')) {
          return Promise.reject(new Error('Interview preparation fetch failed'));
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/success-patterns')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
    });

    it('should handle networking activities fetch error gracefully', async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT column_name FROM information_schema.columns')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT id, title, company') && query.includes('WHERE user_id = $1')) {
          return Promise.resolve({
            rows: [{ id: 1, status: 'Interview', applied_on: '2024-01-15', created_at: '2024-01-15' }],
          });
        }
        if (query.includes('SELECT id, activity_type, created_at FROM networking_activities')) {
          return Promise.reject(new Error('Networking activities fetch failed'));
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/success-patterns')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
    });

    it('should handle company research fetch error gracefully', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT column_name FROM information_schema.columns')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT id, title, company') && query.includes('WHERE user_id = $1')) {
          return Promise.resolve({
            rows: [{ id: 1, company: 'Tech Corp', status: 'Interview', applied_on: '2024-01-15', created_at: '2024-01-15' }],
          });
        }
        // Match the exact query pattern from source (line 965-970)
        if (query.includes('SELECT company, created_at') && query.includes('FROM company_research') && query.includes('WHERE company = ANY')) {
          return Promise.reject(new Error('Company research fetch failed'));
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/success-patterns')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      // Verify catch block was hit (line 975)
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Could not fetch research history'),
        expect.any(String)
      );

      consoleWarnSpy.mockRestore();
    });

    it('should handle application history fetch error and trigger catch block', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT column_name FROM information_schema.columns')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT id, title, company') && query.includes('WHERE user_id = $1')) {
          return Promise.resolve({
            rows: [{ id: 1, status: 'Interview', applied_on: '2024-01-15', created_at: '2024-01-15' }],
          });
        }
        // Match the exact query pattern from source (line 1005-1010)
        if (query.includes('SELECT job_id, event, timestamp, from_status, to_status') && query.includes('FROM application_history')) {
          return Promise.reject(new Error('Application history fetch failed'));
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/success-patterns')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      // Verify catch block was hit (line 1014)
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Could not fetch application history'),
        expect.any(String)
      );

      consoleWarnSpy.mockRestore();
    });

    it('should handle mock interviews fetch error and trigger catch block', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT column_name FROM information_schema.columns')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT id, title, company') && query.includes('WHERE user_id = $1')) {
          return Promise.resolve({
            rows: [{ id: 1, status: 'Interview', applied_on: '2024-01-15', created_at: '2024-01-15' }],
          });
        }
        // Match the exact query pattern from source (line 1038-1043)
        if (query.includes('SELECT id, company, role, status, created_at, completed_at, overall_performance_score') && query.includes('FROM mock_interview_sessions')) {
          return Promise.reject(new Error('Mock interviews fetch failed'));
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/success-patterns')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      // Verify catch block was hit (line 1047)
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Could not fetch mock interviews'),
        expect.any(String)
      );

      consoleWarnSpy.mockRestore();
    });

    it('should handle technical prep sessions fetch error and trigger catch block', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT column_name FROM information_schema.columns')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT id, title, company') && query.includes('WHERE user_id = $1')) {
          return Promise.resolve({
            rows: [{ id: 1, status: 'Interview', applied_on: '2024-01-15', created_at: '2024-01-15' }],
          });
        }
        // Match the exact query pattern from source (line 1053-1058)
        if (query.includes('SELECT id, company, role, prep_type, status, time_spent_seconds, created_at, completed_at') && query.includes('FROM technical_prep_sessions')) {
          return Promise.reject(new Error('Technical prep sessions fetch failed'));
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/success-patterns')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      // Verify catch block was hit (line 1062)
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Could not fetch technical prep sessions'),
        expect.any(String)
      );

      consoleWarnSpy.mockRestore();
    });

    it('should handle interview preparation fetch error and trigger catch block', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT column_name FROM information_schema.columns')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT id, title, company') && query.includes('WHERE user_id = $1')) {
          return Promise.resolve({
            rows: [{ id: 1, status: 'Interview', applied_on: '2024-01-15', created_at: '2024-01-15' }],
          });
        }
        // Match the exact query pattern from source (line 1068-1073)
        if (query.includes('SELECT interview_id, framework_type, company_research, role_research, created_at') && query.includes('FROM interview_preparation')) {
          return Promise.reject(new Error('Interview preparation fetch failed'));
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/success-patterns')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      // Verify catch block was hit (line 1077)
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Could not fetch interview preparation'),
        expect.any(String)
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe('Predictive Model Calculations', () => {
    it('should calculate optimized success rate with factors', async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT column_name FROM information_schema.columns')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT id, title, company') && query.includes('WHERE user_id = $1')) {
          return Promise.resolve({
            rows: [
              { id: 1, industry: 'Technology', status: 'Offer', applied_on: '2024-01-15', created_at: '2024-01-15' },
              { id: 2, industry: 'Technology', status: 'Offer', applied_on: '2024-01-16', created_at: '2024-01-16' },
              { id: 3, industry: 'Technology', status: 'Interview', applied_on: '2024-01-17', created_at: '2024-01-17' },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/success-patterns')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.predictiveModel).toBeDefined();
    });

    it('should generate recommendations based on industry success rates', async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT column_name FROM information_schema.columns')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT id, title, company') && query.includes('WHERE user_id = $1')) {
          return Promise.resolve({
            rows: [
              { id: 1, industry: 'Technology', status: 'Offer', applied_on: '2024-01-15', created_at: '2024-01-15' },
              { id: 2, industry: 'Technology', status: 'Interview', applied_on: '2024-01-16', created_at: '2024-01-16' },
              { id: 3, industry: 'Finance', status: 'Rejected', applied_on: '2024-01-17', created_at: '2024-01-17' },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/success-patterns')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.recommendations).toBeDefined();
    });

    it('should handle customization strategy effectiveness', async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT column_name FROM information_schema.columns')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT id, title, company') && query.includes('WHERE user_id = $1')) {
          return Promise.resolve({
            rows: [
              { id: 1, status: 'Offer', applied_on: '2024-01-15', created_at: '2024-01-15' },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/success-patterns')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.strategyEffectiveness).toBeDefined();
    });

    it('should detect declining trend in pattern evolution', async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT column_name FROM information_schema.columns')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT id, title, company') && query.includes('WHERE user_id = $1')) {
          return Promise.resolve({
            rows: [
              { id: 1, status: 'Offer', applied_on: '2024-01-15', created_at: '2024-01-15' },
              { id: 2, status: 'Interview', applied_on: '2024-01-16', created_at: '2024-01-16' },
              { id: 3, status: 'Rejected', applied_on: '2024-02-15', created_at: '2024-02-15' },
              { id: 4, status: 'Rejected', applied_on: '2024-02-16', created_at: '2024-02-16' },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/success-patterns')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.patternEvolution.trend).toBeDefined();
    });

    it('should handle preparation correlation with best strategy', async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT column_name FROM information_schema.columns')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT id, title, company') && query.includes('WHERE user_id = $1')) {
          return Promise.resolve({
            rows: [
              { id: 1, status: 'Offer', company: 'Test Corp', applied_on: '2024-01-20', created_at: '2024-01-20' },
            ],
          });
        }
        if (query.includes('SELECT company, created_at FROM company_research')) {
          return Promise.resolve({
            rows: [{ company: 'Test Corp', created_at: '2024-01-15' }],
          });
        }
        if (query.includes('SELECT id, company, role, status, created_at, completed_at, overall_performance_score FROM mock_interview_sessions')) {
          return Promise.resolve({
            rows: [{ id: 1, company: 'Test Corp', status: 'completed', created_at: '2024-01-16' }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/success-patterns')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.preparationCorrelation).toBeDefined();
    });

    it('should handle customization columns in database', async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT column_name FROM information_schema.columns')) {
          return Promise.resolve({
            rows: [
              { column_name: 'resume_customization' },
              { column_name: 'cover_letter_customization' },
            ],
          });
        }
        if (query.includes('SELECT id, title, company') && query.includes('WHERE user_id = $1')) {
          return Promise.resolve({
            rows: [
              { id: 1, status: 'Offer', resume_customization: 'high', cover_letter_customization: 'high', applied_on: '2024-01-15', created_at: '2024-01-15' },
              { id: 2, status: 'Rejected', resume_customization: 'low', cover_letter_customization: 'none', applied_on: '2024-01-16', created_at: '2024-01-16' },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/success-patterns')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
    });

    it('should handle only resume_customization column', async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT column_name FROM information_schema.columns')) {
          return Promise.resolve({
            rows: [{ column_name: 'resume_customization' }],
          });
        }
        if (query.includes('SELECT id, title, company') && query.includes('WHERE user_id = $1')) {
          return Promise.resolve({
            rows: [{ id: 1, status: 'Interview', resume_customization: 'medium', applied_on: '2024-01-15', created_at: '2024-01-15' }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/success-patterns')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
    });

    it('should handle only cover_letter_customization column', async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT column_name FROM information_schema.columns')) {
          return Promise.resolve({
            rows: [{ column_name: 'cover_letter_customization' }],
          });
        }
        if (query.includes('SELECT id, title, company') && query.includes('WHERE user_id = $1')) {
          return Promise.resolve({
            rows: [{ id: 1, status: 'Interview', cover_letter_customization: 'high', applied_on: '2024-01-15', created_at: '2024-01-15' }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/success-patterns')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
    });
  });

  describe('Helper Functions Coverage', () => {
    it('should test findOptimalWindow with empty data', async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT column_name FROM information_schema.columns')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT id, title, company') && query.includes('WHERE user_id = $1')) {
          return Promise.resolve({
            rows: [
              { id: 1, status: 'Offer', applied_on: '2024-01-15', created_at: '2024-01-15', status_updated_at: '2024-01-20' },
            ],
          });
        }
        if (query.includes('SELECT job_id, event, timestamp, from_status, to_status FROM application_history')) {
          return Promise.resolve({ rows: [] }); // No history, so timing data will be empty
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/success-patterns')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      // findOptimalWindow is called with empty arrays, should return null (line 420)
      expect(response.body.timingPatterns.optimalWindows).toBeDefined();
    });

    it('should test findOptimalWindow with data', async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT column_name FROM information_schema.columns')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT id, title, company') && query.includes('WHERE user_id = $1')) {
          return Promise.resolve({
            rows: [
              { id: 1, status: 'Offer', applied_on: '2024-01-15', created_at: '2024-01-15', status_updated_at: '2024-01-30' },
              { id: 2, status: 'Interview', applied_on: '2024-01-20', created_at: '2024-01-20', status_updated_at: '2024-01-25' },
              { id: 3, status: 'Offer', applied_on: '2024-01-25', created_at: '2024-01-25', status_updated_at: '2024-02-10' },
            ],
          });
        }
        if (query.includes('SELECT job_id, event, timestamp, from_status, to_status FROM application_history')) {
          return Promise.resolve({
            rows: [
              { job_id: 1, event: 'Status changed', timestamp: '2024-01-20', from_status: 'Applied', to_status: 'Interview' },
              { job_id: 1, event: 'Status changed', timestamp: '2024-01-30', from_status: 'Interview', to_status: 'Offer' },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/success-patterns')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      // findOptimalWindow should calculate q1, q3, median (lines 422-424)
      expect(response.body.timingPatterns.optimalWindows).toBeDefined();
      if (response.body.timingPatterns.optimalWindows.applicationWindow) {
        expect(response.body.timingPatterns.optimalWindows.applicationWindow).toHaveProperty('min');
        expect(response.body.timingPatterns.optimalWindows.applicationWindow).toHaveProperty('max');
        expect(response.body.timingPatterns.optimalWindows.applicationWindow).toHaveProperty('median');
      }
    });

    it('should test normalizeIndustry function with various inputs', async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT column_name FROM information_schema.columns')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT id, title, company') && query.includes('WHERE user_id = $1')) {
          return Promise.resolve({
            rows: [
              { id: 1, industry: 'Technology', status: 'Offer', applied_on: '2024-01-15', created_at: '2024-01-15' },
              { id: 2, industry: '  TECHNOLOGY  ', status: 'Interview', applied_on: '2024-01-16', created_at: '2024-01-16' }, // Test trimming and case
              { id: 3, industry: null, status: 'Rejected', applied_on: '2024-01-17', created_at: '2024-01-17' }, // Test null
              { id: 4, industry: '', status: 'Rejected', applied_on: '2024-01-18', created_at: '2024-01-18' }, // Test empty
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/success-patterns')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      // normalizeIndustry should normalize 'Technology' and '  TECHNOLOGY  ' to the same key (lines 34-37)
      // null and empty should be filtered out
      expect(response.body.applicationPatterns.industrySuccessRates).toBeDefined();
    });

    it('should test analyzeApplicationPatterns with customization data', async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT column_name FROM information_schema.columns')) {
          return Promise.resolve({
            rows: [
              { column_name: 'resume_customization' },
              { column_name: 'cover_letter_customization' },
            ],
          });
        }
        if (query.includes('SELECT id, title, company') && query.includes('WHERE user_id = $1')) {
          return Promise.resolve({
            rows: [
              { id: 1, status: 'Offer', resume_customization: 'tailored', cover_letter_customization: 'tailored', applied_on: '2024-01-15T10:00:00', created_at: '2024-01-15T10:00:00' },
              { id: 2, status: 'Interview', resume_customization: 'heavy', cover_letter_customization: 'light', applied_on: '2024-01-16T14:00:00', created_at: '2024-01-16T14:00:00' },
              { id: 3, status: 'Rejected', resume_customization: 'none', cover_letter_customization: 'none', applied_on: '2024-01-17T09:00:00', created_at: '2024-01-17T09:00:00' },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/success-patterns')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      // Should analyze customization patterns (lines 99-106)
      expect(response.body.applicationPatterns.customizationImpact).toBeDefined();
      expect(response.body.applicationPatterns.customizationImpact.resume).toBeDefined();
      expect(response.body.applicationPatterns.customizationImpact.coverLetter).toBeDefined();
    });

    it('should test analyzeTimingPatterns with interview outcomes', async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT column_name FROM information_schema.columns')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT id, title, company') && query.includes('WHERE user_id = $1')) {
          return Promise.resolve({
            rows: [
              { id: 1, status: 'Offer', applied_on: '2024-01-15', created_at: '2024-01-15', status_updated_at: '2024-01-30' },
            ],
          });
        }
        if (query.includes('SELECT io.job_id, io.company, io.interview_date')) {
          return Promise.resolve({
            rows: [
              { job_id: 1, company: 'Tech Corp', interview_date: '2024-01-25', outcome: 'passed' },
            ],
          });
        }
        if (query.includes('SELECT job_id, event, timestamp, from_status, to_status FROM application_history')) {
          return Promise.resolve({
            rows: [
              { job_id: 1, event: 'Interview scheduled', timestamp: '2024-01-20', from_status: 'Applied', to_status: 'Interview' },
              { job_id: 1, event: 'Offer received', timestamp: '2024-01-30', from_status: 'Interview', to_status: 'Offer' },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/success-patterns')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      // Should use interview_outcomes interview_date (lines 339-340)
      // Should calculate interviewToOffer timing (lines 370-375)
      expect(response.body.timingPatterns.averages).toBeDefined();
      expect(response.body.timingPatterns.averages.interviewToOffer).toBeDefined();
    });

    it('should test analyzePreparationCorrelation with comprehensive prep', async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT column_name FROM information_schema.columns')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT id, title, company') && query.includes('WHERE user_id = $1')) {
          return Promise.resolve({
            rows: [
              { id: 1, company: 'Tech Corp', status: 'Offer', applied_on: '2024-01-20', created_at: '2024-01-20' },
            ],
          });
        }
        if (query.includes('SELECT company, created_at FROM company_research')) {
          return Promise.resolve({
            rows: [{ company: 'Tech Corp', created_at: '2024-01-15' }],
          });
        }
        if (query.includes('SELECT id, activity_type, created_at FROM networking_activities')) {
          return Promise.resolve({
            rows: [{ id: 1, activity_type: 'linkedin_message', created_at: '2024-01-18' }],
          });
        }
        if (query.includes('SELECT id, company, role, status, created_at, completed_at, overall_performance_score FROM mock_interview_sessions')) {
          return Promise.resolve({
            rows: [{ id: 1, company: 'Tech Corp', created_at: '2024-01-16' }],
          });
        }
        if (query.includes('SELECT id, company, role, prep_type, status, time_spent_seconds, created_at, completed_at FROM technical_prep_sessions')) {
          return Promise.resolve({
            rows: [{ id: 1, company: 'Tech Corp', created_at: '2024-01-17' }],
          });
        }
        if (query.includes('SELECT interview_id, framework_type, company_research, role_research, created_at FROM interview_preparation')) {
          return Promise.resolve({
            rows: [{ interview_id: 1, created_at: '2024-01-19' }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/success-patterns')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      // Should detect comprehensive prep (3+ activities) (lines 235-237)
      expect(response.body.preparationCorrelation.preparationData).toBeDefined();
    });
  });

  describe('Authentication', () => {
    it('should return 401 without token', async () => {
      const response = await request(app).get('/api/success-patterns');
      expect(response.status).toBe(401);
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(app)
        .get('/api/success-patterns')
        .set('Authorization', 'Bearer invalid_token');
      expect(response.status).toBe(401);
    });
  });
});





