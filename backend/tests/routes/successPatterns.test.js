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
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';
    
    app = express();
    app.use(express.json());
    app.use('/api/success-patterns', successPatternsRoutes);
    
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
  });
});



