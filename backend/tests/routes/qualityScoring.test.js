/**
 * Quality Scoring Routes Tests
 * Tests routes/qualityScoring.js - quality scoring
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import qualityScoringRoutes from '../../routes/qualityScoring.js';
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

// Use global to avoid hoisting issues
vi.mock('../../services/qualityScoringService.js', () => {
  // Create the mock service instance
  const mockService = {
    analyzeApplicationQuality: vi.fn(),
  };
  // Store it in global for test access
  if (typeof global !== 'undefined') {
    global.__qualityScoringMockService = mockService;
  }
  return {
    createQualityScoringService: vi.fn(() => mockService),
  };
});

describe('Quality Scoring Routes', () => {
  let app;
  let user;
  let userId;

  beforeEach(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';
    
    app = express();
    app.use(express.json());
    app.use('/api/quality-scoring', qualityScoringRoutes);
    
    user = await createTestUser();
    
    const jwtModule = await import('jsonwebtoken');
    const decoded = jwtModule.verify(user.token, process.env.JWT_SECRET || 'test-secret-key');
    userId = Number(decoded.id);
    
    vi.clearAllMocks();
    
    // Reset mock service
    if (global.__qualityScoringMockService) {
      global.__qualityScoringMockService.analyzeApplicationQuality.mockClear();
    }
    
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

  describe('POST /api/quality-scoring/:jobId/analyze', () => {
    it('should analyze application quality', async () => {
      const mockQualityScore = {
        overall_score: 85,
        resume_score: 90,
        cover_letter_score: 80,
        linkedin_score: 85,
        score_breakdown: {},
        missing_keywords: [],
        missing_skills: [],
        formatting_issues: [],
        inconsistencies: [],
        improvement_suggestions: [],
        meets_threshold: true,
      };

      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT id, title, company FROM jobs')) {
          return Promise.resolve({
            rows: [{ id: 1, title: 'Software Engineer', company: 'Tech Corp' }],
          });
        }
        if (query.includes('SELECT updated_at FROM job_materials')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT id, overall_score FROM application_quality_scores')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT AVG(overall_score)')) {
          return Promise.resolve({
            rows: [{ average_score: '80', top_score: '90' }],
          });
        }
        if (query.includes('INSERT INTO application_quality_scores')) {
          return Promise.resolve({
            rows: [{
              id: 1,
              job_id: 1,
              user_id: userId,
              overall_score: 85,
              resume_score: 90,
              cover_letter_score: 80,
              linkedin_score: 85,
            }],
          });
        }
        if (query.includes('INSERT INTO application_quality_score_history')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      if (global.__qualityScoringMockService) {
        global.__qualityScoringMockService.analyzeApplicationQuality.mockResolvedValue(mockQualityScore);
      }

      const response = await request(app)
        .post('/api/quality-scoring/1/analyze')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ forceRefresh: false, minimumThreshold: 70 });

      expect(response.status).toBe(200);
      expect(response.body.score).toBeDefined();
      expect(response.body.score.overall_score).toBe(85);
    });

    it('should return cached score if recent', async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT id, title, company FROM jobs')) {
          return Promise.resolve({
            rows: [{ id: 1, title: 'Software Engineer', company: 'Tech Corp' }],
          });
        }
        if (query.includes('SELECT updated_at FROM job_materials')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('SELECT id, overall_score, created_at, updated_at') && 
            query.includes('FROM application_quality_scores') &&
            query.includes('WHERE job_id = $1 AND user_id = $2')) {
          return Promise.resolve({
            rows: [{
              id: 1,
              overall_score: 85,
              created_at: new Date(Date.now() - 1000 * 60 * 60),
              updated_at: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
            }],
          });
        }
        if (query.includes('SELECT * FROM application_quality_scores WHERE id = $1')) {
          return Promise.resolve({
            rows: [{
              id: 1,
              job_id: 1,
              user_id: userId,
              overall_score: 85,
              resume_score: 90,
              cover_letter_score: 80,
              linkedin_score: 85,
              score_breakdown: {},
              missing_keywords: [],
              missing_skills: [],
              formatting_issues: [],
              inconsistencies: [],
              improvement_suggestions: [],
              meets_threshold: true,
              created_at: new Date(Date.now() - 1000 * 60 * 60),
              updated_at: new Date(Date.now() - 1000 * 60 * 60),
            }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .post('/api/quality-scoring/1/analyze')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ forceRefresh: false });

      expect(response.status).toBe(200);
      expect(response.body.cached).toBe(true);
    });

    it('should return 404 if job not found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/quality-scoring/999/analyze')
        .set('Authorization', `Bearer ${user.token}`)
        .send({});

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/quality-scoring/:jobId', () => {
    it('should get quality score for a job', async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT id FROM jobs')) {
          return Promise.resolve({ rows: [{ id: 1 }] });
        }
        if (query.includes('SELECT * FROM application_quality_scores')) {
          return Promise.resolve({
            rows: [{
              id: 1,
              job_id: 1,
              overall_score: 85,
              resume_score: 90,
            }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/quality-scoring/1')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.score).toBeDefined();
    });

    it('should return 404 if score not found', async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT id FROM jobs')) {
          return Promise.resolve({ rows: [{ id: 1 }] });
        }
        if (query.includes('SELECT * FROM application_quality_scores')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/quality-scoring/1')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/quality-scoring/user/stats', () => {
    it('should get user quality scoring statistics', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{
          total_applications: 10,
          average_score: '82.5',
          top_score: 95,
          lowest_score: 70,
          passing_count: 8,
          failing_count: 2,
        }],
      });

      const response = await request(app)
        .get('/api/quality-scoring/user/stats')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.stats).toBeDefined();
      expect(response.body.stats.total_applications).toBe(10);
    });

    it('should return zero stats if no scores exist', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{
          total_applications: 0,
          average_score: null,
          top_score: null,
          lowest_score: null,
          passing_count: 0,
          failing_count: 0,
        }],
      });

      const response = await request(app)
        .get('/api/quality-scoring/user/stats')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.stats.total_applications).toBe(0);
    });
  });

  describe('GET /api/quality-scoring/:jobId/history', () => {
    it('should get score history for a job', async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes('SELECT id FROM jobs')) {
          return Promise.resolve({ rows: [{ id: 1 }] });
        }
        if (query.includes('SELECT id, overall_score FROM application_quality_score_history')) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                overall_score: 85,
                resume_score: 90,
                cover_letter_score: 80,
                created_at: new Date(),
              },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/quality-scoring/1/history')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.history).toBeDefined();
      expect(Array.isArray(response.body.history)).toBe(true);
    });

    it('should return 404 if job not found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/quality-scoring/999/history')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/quality-scoring/user/threshold', () => {
    it('should update user threshold', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .put('/api/quality-scoring/user/threshold')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ threshold: 75 });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('updated');
      expect(response.body.threshold).toBe(75);
    });

    it('should return 400 if threshold is invalid', async () => {
      const response = await request(app)
        .put('/api/quality-scoring/user/threshold')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ threshold: 150 });

      expect(response.status).toBe(400);
    });

    it('should return 400 if threshold is not a number', async () => {
      const response = await request(app)
        .put('/api/quality-scoring/user/threshold')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ threshold: 'not-a-number' });

      expect(response.status).toBe(400);
    });
  });
});

