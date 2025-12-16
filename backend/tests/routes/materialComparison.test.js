/**
 * Material Comparison Routes Tests
 * Tests routes/materialComparison.js - material comparison
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import materialComparisonRoutes from '../../routes/materialComparison.js';
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

describe('Material Comparison Routes', () => {
  let app;
  let user;
  let userId;

  beforeEach(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';
    
    app = express();
    app.use(express.json());
    app.use('/api/material-comparison', materialComparisonRoutes);
    
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

  describe('PUT /api/material-comparison/resume-versions/:versionId/label', () => {
    it('should label a resume version', async () => {
      pool.query.mockImplementation((query, params) => {
        // First query: Check if version exists in resume_versions
        if (query.includes('SELECT id, resume_id FROM resume_versions') && 
            query.includes('WHERE id = $1 AND user_id = $2') &&
            params && (params[0] === 1 || params[0] === '1') && params[1] === userId) {
          return Promise.resolve({
            rows: [{ id: 1, resume_id: 1 }],
          });
        }
        // Second query: Check if label is already used (for existing version)
        if (query.includes('SELECT id FROM resume_versions') && 
            query.includes('WHERE version_label = $1') &&
            query.includes('AND user_id = $2') &&
            query.includes('AND id != $3') &&
            params && params[0] === 'A' && params[1] === userId) {
          return Promise.resolve({ rows: [] });
        }
        // Third query: Update the label
        if (query.includes('UPDATE resume_versions SET version_label = $1') &&
            query.includes('WHERE id = $2 AND user_id = $3') &&
            params && params[0] === 'A' && (params[1] === 1 || params[1] === '1') && params[2] === userId) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .put('/api/material-comparison/resume-versions/1/label')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ label: 'A' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 400 if label is invalid', async () => {
      const response = await request(app)
        .put('/api/material-comparison/resume-versions/1/label')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ label: 'AB' });

      expect(response.status).toBe(400);
    });

    it('should return 404 if resume version not found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .put('/api/material-comparison/resume-versions/999/label')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ label: 'A' });

      expect(response.status).toBe(404);
    });

    it('should return 400 if label is already in use', async () => {
      pool.query.mockImplementation((query, params) => {
        if (query.includes('SELECT id, resume_id FROM resume_versions')) {
          return Promise.resolve({
            rows: [{ id: 1, resume_id: 1 }],
          });
        }
        if (query.includes('SELECT id FROM resume_versions') && query.includes('version_label = $1')) {
          return Promise.resolve({ rows: [{ id: 2 }] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .put('/api/material-comparison/resume-versions/1/label')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ label: 'A' });

      expect(response.status).toBe(400);
    });
  });

  describe('PUT /api/material-comparison/cover-letter-versions/:versionId/label', () => {
    it('should label a cover letter version', async () => {
      pool.query.mockImplementation((query, params) => {
        // First query: Check if version exists in cover_letter_versions
        if (query.includes('SELECT id, cover_letter_id FROM cover_letter_versions') && 
            query.includes('WHERE id = $1 AND user_id = $2') &&
            params && (params[0] === 1 || params[0] === '1') && params[1] === userId) {
          return Promise.resolve({
            rows: [{ id: 1, cover_letter_id: 1 }],
          });
        }
        // Second query: Check if label is already used (for existing version)
        if (query.includes('SELECT id FROM cover_letter_versions') && 
            query.includes('WHERE version_label = $1') &&
            query.includes('AND user_id = $2') &&
            query.includes('AND id != $3') &&
            params && params[0] === 'A' && params[1] === userId) {
          return Promise.resolve({ rows: [] });
        }
        // Third query: Update the label
        if (query.includes('UPDATE cover_letter_versions SET version_label = $1') &&
            query.includes('WHERE id = $2 AND user_id = $3') &&
            params && params[0] === 'A' && (params[1] === 1 || params[1] === '1') && params[2] === userId) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .put('/api/material-comparison/cover-letter-versions/1/label')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ label: 'A' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 400 if label is invalid', async () => {
      const response = await request(app)
        .put('/api/material-comparison/cover-letter-versions/1/label')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ label: 'abc' });

      expect(response.status).toBe(400);
    });
  });

  describe('PUT /api/material-comparison/jobs/:jobId/materials/versions', () => {
    it('should track version usage for application', async () => {
      pool.query.mockImplementation((query, params) => {
        // jobId comes as string from req.params
        if (query.includes('SELECT id FROM jobs WHERE id = $1 AND user_id = $2') && 
            params && (params[0] === 1 || params[0] === '1') && params[1] === userId) {
          return Promise.resolve({ rows: [{ id: 1 }] });
        }
        if (query.includes('SELECT resume_id, cover_letter_id FROM job_materials WHERE job_id = $1') &&
            params && (params[0] === 1 || params[0] === '1')) {
          return Promise.resolve({
            rows: [{ resume_id: 1, cover_letter_id: 1 }],
          });
        }
        if (query.includes('UPDATE application_materials_history') &&
            query.includes('SET resume_version_label = $1, cover_letter_version_label = $2') &&
            query.includes('WHERE job_id = $3 AND user_id = $4')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .put('/api/material-comparison/jobs/1/materials/versions')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          resume_version_label: 'A',
          cover_letter_version_label: 'B',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 404 if job not found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .put('/api/material-comparison/jobs/999/materials/versions')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          resume_version_label: 'A',
        });

      expect(response.status).toBe(404);
    });

    it('should return 400 if no materials linked to job', async () => {
      pool.query.mockImplementation((query, params) => {
        if (query.includes('SELECT id FROM jobs')) {
          return Promise.resolve({ rows: [{ id: 1 }] });
        }
        if (query.includes('SELECT resume_id, cover_letter_id FROM job_materials')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .put('/api/material-comparison/jobs/1/materials/versions')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          resume_version_label: 'A',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('PUT /api/material-comparison/jobs/:jobId/outcome', () => {
    it('should update application outcome', async () => {
      pool.query.mockImplementation((query, params) => {
        // jobId comes as string from req.params
        if (query.includes('SELECT id FROM jobs WHERE id = $1 AND user_id = $2') && 
            params && (params[0] === 1 || params[0] === '1') && params[1] === userId) {
          return Promise.resolve({ rows: [{ id: 1 }] });
        }
        if (query.includes('UPDATE jobs SET') &&
            query.includes('application_outcome = $') &&
            query.includes('WHERE id = $') &&
            query.includes('AND user_id = $')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .put('/api/material-comparison/jobs/1/outcome')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          outcome: 'interview',
          response_received_at: new Date().toISOString(),
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 400 if outcome is invalid', async () => {
      pool.query.mockImplementation((query, params) => {
        if (query.includes('SELECT id FROM jobs')) {
          return Promise.resolve({ rows: [{ id: 1 }] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .put('/api/material-comparison/jobs/1/outcome')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ outcome: 'invalid_outcome' });

      expect(response.status).toBe(400);
    });

    it('should return 404 if job not found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .put('/api/material-comparison/jobs/999/outcome')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ outcome: 'interview' });

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/material-comparison/comparison/metrics', () => {
    it('should get comparison metrics for all versions', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [
          {
            resume_label: 'A',
            cover_letter_label: 'B',
            total_applications: 10,
            responses_received: 5,
            interviews: 2,
            offers: 1,
            response_rate_percent: 50.0,
            interview_rate_percent: 40.0,
            offer_rate_percent: 50.0,
            avg_days_to_response: 5.5,
          },
        ],
      });

      const response = await request(app)
        .get('/api/material-comparison/comparison/metrics')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.metrics).toBeDefined();
      expect(Array.isArray(response.body.metrics)).toBe(true);
    });
  });

  describe('GET /api/material-comparison/comparison/applications', () => {
    it('should get applications by version label', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            title: 'Software Engineer',
            company: 'Tech Corp',
            resume_version_label: 'A',
            cover_letter_version_label: 'B',
          },
        ],
      });

      const response = await request(app)
        .get('/api/material-comparison/comparison/applications?resume_label=A')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.applications).toBeDefined();
      expect(Array.isArray(response.body.applications)).toBe(true);
    });

    it('should filter by both resume and cover letter labels', async () => {
      pool.query.mockImplementation((query, params) => {
        if (query.includes('AND amh.resume_version_label = $') && query.includes('AND amh.cover_letter_version_label = $')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/material-comparison/comparison/applications?resume_label=A&cover_letter_label=B')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/material-comparison/versions/labeled', () => {
    it('should get all labeled versions', async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes('FROM resume_versions')) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                version_label: 'A',
                title: 'Resume A',
                resume_id: 1,
              },
            ],
          });
        }
        if (query.includes('FROM cover_letter_versions')) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                version_label: 'B',
                title: 'Cover Letter B',
                cover_letter_id: 1,
              },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/material-comparison/versions/labeled')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.resume_versions).toBeDefined();
      expect(response.body.cover_letter_versions).toBeDefined();
    });
  });

  describe('PUT /api/material-comparison/resume-versions/:versionId/archive', () => {
    it('should archive a resume version', async () => {
      pool.query.mockImplementation((query, params) => {
        // versionId comes as string from req.params, route uses it directly
        if (query.includes('SELECT rv.id, rv.published_resume_id, rv.resume_id') &&
            query.includes('FROM resume_versions rv') &&
            query.includes('WHERE rv.id = $1 AND rv.user_id = $2')) {
          if (params && String(params[0]) === '1' && params[1] == userId) {
            return Promise.resolve({
              rows: [{ id: 1, published_resume_id: 1, resume_id: 1 }],
            });
          }
        }
        // publishedResumeId = published_resume_id || resume_id = 1
        if (query.includes('SELECT COUNT(*) as count') &&
            query.includes('array_agg(DISTINCT j.title) as job_titles') &&
            query.includes('FROM job_materials jm') &&
            query.includes('WHERE jm.resume_id = $1 AND jm.user_id = $2')) {
          if (params && String(params[0]) === '1' && params[1] == userId) {
            return Promise.resolve({ rows: [{ count: '0', job_titles: null }] });
          }
        }
        if (query.includes('SELECT COUNT(*) as count') &&
            query.includes('array_agg(DISTINCT j.title) as job_titles') &&
            query.includes('FROM application_materials_history amh') &&
            query.includes('WHERE amh.resume_id = $1 AND amh.user_id = $2')) {
          if (params && String(params[0]) === '1' && params[1] == userId) {
            return Promise.resolve({ rows: [{ count: '0', job_titles: null }] });
          }
        }
        if (query.includes('UPDATE resume_versions') &&
            query.includes('SET version_label = NULL, is_archived = TRUE') &&
            query.includes('WHERE id = $1 AND user_id = $2')) {
          if (params && String(params[0]) === '1' && params[1] == userId) {
            return Promise.resolve({ rows: [] });
          }
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .put('/api/material-comparison/resume-versions/1/archive')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 400 if version is attached to jobs', async () => {
      pool.query.mockImplementation((query, params) => {
        if (query.includes('SELECT rv.id, rv.published_resume_id, rv.resume_id') &&
            query.includes('FROM resume_versions rv') &&
            query.includes('WHERE rv.id = $1 AND rv.user_id = $2')) {
          if (params && String(params[0]) === '1' && params[1] == userId) {
            return Promise.resolve({
              rows: [{ id: 1, published_resume_id: 1, resume_id: 1 }],
            });
          }
        }
        if (query.includes('SELECT COUNT(*) as count') &&
            query.includes('array_agg(DISTINCT j.title) as job_titles') &&
            query.includes('FROM job_materials jm') &&
            query.includes('WHERE jm.resume_id = $1 AND jm.user_id = $2')) {
          if (params && String(params[0]) === '1' && params[1] == userId) {
            return Promise.resolve({ rows: [{ count: '2', job_titles: ['Job 1', 'Job 2'] }] });
          }
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .put('/api/material-comparison/resume-versions/1/archive')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(400);
    });
  });

  describe('PUT /api/material-comparison/resume-versions/:versionId/unarchive', () => {
    it('should unarchive a resume version', async () => {
      pool.query.mockImplementation((query, params) => {
        if (query.includes('SELECT rv.id, rv.is_archived') &&
            query.includes('FROM resume_versions rv') &&
            query.includes('WHERE rv.id = $1 AND rv.user_id = $2')) {
          if (params && String(params[0]) === '1' && params[1] == userId) {
            return Promise.resolve({
              rows: [{ id: 1, is_archived: true }],
            });
          }
        }
        if (query.includes('UPDATE resume_versions') &&
            query.includes('SET is_archived = FALSE') &&
            query.includes('WHERE id = $1 AND user_id = $2')) {
          if (params && String(params[0]) === '1' && params[1] == userId) {
            return Promise.resolve({ rows: [] });
          }
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .put('/api/material-comparison/resume-versions/1/unarchive')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 404 if version not found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .put('/api/material-comparison/resume-versions/999/unarchive')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/material-comparison/cover-letter-versions/:versionId/archive', () => {
    it('should archive a cover letter version', async () => {
      pool.query.mockImplementation((query, params) => {
        if (query.includes('SELECT clv.id, clv.published_cover_letter_id, clv.cover_letter_id') &&
            query.includes('FROM cover_letter_versions clv') &&
            query.includes('WHERE clv.id = $1 AND clv.user_id = $2')) {
          if (params && String(params[0]) === '1' && params[1] == userId) {
            return Promise.resolve({
              rows: [{ id: 1, published_cover_letter_id: 1, cover_letter_id: 1 }],
            });
          }
        }
        if (query.includes('SELECT COUNT(*) as count') &&
            query.includes('array_agg(DISTINCT j.title) as job_titles') &&
            query.includes('FROM job_materials jm') &&
            query.includes('WHERE jm.cover_letter_id = $1 AND jm.user_id = $2')) {
          if (params && String(params[0]) === '1' && params[1] == userId) {
            return Promise.resolve({ rows: [{ count: '0', job_titles: null }] });
          }
        }
        if (query.includes('SELECT COUNT(*) as count') &&
            query.includes('array_agg(DISTINCT j.title) as job_titles') &&
            query.includes('FROM application_materials_history amh') &&
            query.includes('WHERE amh.cover_letter_id = $1 AND amh.user_id = $2')) {
          if (params && String(params[0]) === '1' && params[1] == userId) {
            return Promise.resolve({ rows: [{ count: '0', job_titles: null }] });
          }
        }
        if (query.includes('UPDATE cover_letter_versions') &&
            query.includes('SET version_label = NULL, is_archived = TRUE') &&
            query.includes('WHERE id = $1 AND user_id = $2')) {
          if (params && String(params[0]) === '1' && params[1] == userId) {
            return Promise.resolve({ rows: [] });
          }
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .put('/api/material-comparison/cover-letter-versions/1/archive')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('PUT /api/material-comparison/cover-letter-versions/:versionId/unarchive', () => {
    it('should unarchive a cover letter version', async () => {
      pool.query.mockImplementation((query, params) => {
        if (query.includes('SELECT clv.id, clv.is_archived') &&
            query.includes('FROM cover_letter_versions clv') &&
            query.includes('WHERE clv.id = $1 AND clv.user_id = $2')) {
          if (params && String(params[0]) === '1' && params[1] == userId) {
            return Promise.resolve({
              rows: [{ id: 1, is_archived: true }],
            });
          }
        }
        if (query.includes('UPDATE cover_letter_versions') &&
            query.includes('SET is_archived = FALSE') &&
            query.includes('WHERE id = $1 AND user_id = $2')) {
          if (params && String(params[0]) === '1' && params[1] == userId) {
            return Promise.resolve({ rows: [] });
          }
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .put('/api/material-comparison/cover-letter-versions/1/unarchive')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});

