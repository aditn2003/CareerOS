/**
 * Version Control Routes Tests
 * Tests routes/versionControl.js - resume and cover letter versioning
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import versionControlRoutes from '../../routes/versionControl.js';
import { createTestUser } from '../helpers/auth.js';

// Mock auth middleware
vi.mock('../../auth.js', () => ({
  auth: vi.fn((req, res, next) => {
    req.user = { id: 1 };
    next();
  }),
}));

// Mock pg module (the route creates its own Pool instance)
const mockQuery = vi.fn();
const mockPool = {
  query: mockQuery,
  connect: vi.fn(),
  end: vi.fn(),
};

// Create a constructor function for Pool - must be defined before vi.mock
function MockPool() {
  return mockPool;
}

// Store mockPool in global to avoid hoisting issues
global.__versionControlMockPool = mockPool;
global.__versionControlMockQuery = mockQuery;

vi.mock('pg', () => {
  const mockQuery = vi.fn();
  const mockPool = {
    query: mockQuery,
    connect: vi.fn(),
    end: vi.fn(),
  };
  
  // Store in global for access in tests
  global.__versionControlMockPool = mockPool;
  global.__versionControlMockQuery = mockQuery;
  
  function MockPool() {
    return mockPool;
  }
  
  return {
    Pool: MockPool,
  };
});

describe('Version Control Routes', () => {
  let app;
  let user;
  let userId;
  let mockQuery;

  beforeEach(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';
    
    app = express();
    app.use(express.json());
    app.use('/api/version-control', versionControlRoutes);
    
    user = await createTestUser();
    
    // Decode JWT token to get the user ID
    const jwtModule = await import('jsonwebtoken');
    const decoded = jwtModule.verify(user.token, process.env.JWT_SECRET || 'test-secret-key');
    userId = Number(decoded.id);
    
    // Get mockQuery from global
    mockQuery = global.__versionControlMockQuery;
    
    // Clear other mocks but preserve mockQuery
    // Don't use vi.clearAllMocks() as it might clear mockQuery
    // Instead, clear specific mocks if needed
    
    // Reset mockQuery for this test - clear call history and ensure default implementation
    // Tests will override this with their own mockImplementation
    if (mockQuery) {
      mockQuery.mockReset();
      // Always set a default implementation that returns empty rows
      mockQuery.mockImplementation(() => Promise.resolve({ rows: [] }));
    }
    
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

  describe('GET /api/version-control/resumes/:resumeId/versions', () => {
    it('should get version history for a resume', async () => {
      const resumeId = 1;
      
      // Mock resume ownership check - must match user_id from JWT token
      // Note: resumeId from params is a string, but userId is a number
      mockQuery.mockImplementation((query, params) => {
        // First query: ownership check
        if (query.includes('SELECT id FROM resumes WHERE id = $1 AND user_id = $2')) {
          return Promise.resolve({ rows: [{ id: resumeId }] });
        }
        // Second query: resume_versions
        if (query.includes('FROM resume_versions rv')) {
          return Promise.resolve({ rows: [] });
        }
        // Third query: resumes with original_resume_id
        if (query.includes('WHERE r.original_resume_id = $1')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get(`/api/version-control/resumes/${resumeId}/versions`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.versions).toBeDefined();
      expect(Array.isArray(response.body.versions)).toBe(true);
    });

    it('should return 404 if resume not found', async () => {
      mockQuery.mockImplementation((query, params) => {
        if (query.includes('SELECT id FROM resumes WHERE id = $1 AND user_id = $2')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/version-control/resumes/999/versions')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/version-control/resumes/:resumeId/versions/:versionNumber', () => {
    it('should get a specific version of a resume', async () => {
      mockQuery.mockImplementation(() => Promise.resolve({
        rows: [{
          id: 1,
          version_number: 1,
          title: 'Resume v1',
          description: null,
          sections: { summary: 'Test summary' },
          format: 'pdf',
          file_url: null,
          change_summary: null,
          job_id: null,
          is_default: false,
          is_archived: false,
          parent_version_number: null,
          tags: null,
          created_at: new Date(),
        }],
      }));

      const response = await request(app)
        .get('/api/version-control/resumes/1/versions/1')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.version).toBeDefined();
      expect(response.body.version.version_number).toBe(1);
    });

    it('should return 404 if version not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/version-control/resumes/1/versions/999')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/version-control/resumes/:resumeId/create', () => {
    it('should create a new version from an existing resume', async () => {
      const resumeId = 1;
      
      let callNum = 0;
      mockQuery.mockImplementation((query, params) => {
        callNum++;
        if (callNum === 1) return Promise.resolve({
          rows: [{
            id: resumeId,
            sections: { summary: 'Original' },
            format: 'pdf',
            file_url: '/uploads/resume.pdf',
            title: 'Original Resume',
            template_id: null,
            template_name: null,
          }],
        });
        if (callNum === 2) return Promise.resolve({ rows: [] });
        if (callNum === 3) return Promise.resolve({ rows: [{ next_version: 1 }] });
        if (callNum === 4) return Promise.resolve({
          rows: [{
            id: 2,
            version_number: 1,
            title: 'Resume - Version 1',
            sections: JSON.stringify({ summary: 'Original' }),
            format: 'pdf',
          }],
        });
        if (callNum === 5) return Promise.resolve({
          rows: [{
            id: 1,
            version_number: 1,
            title: 'Version 1',
            resume_id: resumeId,
          }],
        });
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .post(`/api/version-control/resumes/${resumeId}/create`)
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          title: 'New Version',
          change_summary: 'Updated summary',
        });

      expect([200, 201]).toContain(response.status);
      expect(response.body.version).toBeDefined();
    });

    it('should return 404 if resume not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/version-control/resumes/999/create')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          title: 'New Version',
        });

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/version-control/resumes/:resumeId/versions/:versionNumber/restore', () => {
    it('should restore a version', async () => {
      let callNum = 0;
      mockQuery.mockImplementation((query, params) => {
        callNum++;
        if (callNum === 1) return Promise.resolve({
          rows: [{
            sections: { summary: 'Restored' },
            format: 'pdf',
            file_url: '/uploads/restored.pdf',
            title: 'Restored Version',
          }],
        });
        if (callNum === 2) return Promise.resolve({ rows: [{ id: 1 }] });
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .post('/api/version-control/resumes/1/versions/1/restore')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('restored');
    });

    it('should return 404 if version not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/version-control/resumes/1/versions/999/restore')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/version-control/resumes/:resumeId/versions/:versionNumber1/compare/:versionNumber2', () => {
    it('should compare two versions', async () => {
      let callNum = 0;
      mockQuery.mockImplementation((query, params) => {
        callNum++;
        if (callNum === 1) return Promise.resolve({
          rows: [{
            id: 1,
            version_number: 1,
            sections: { summary: 'Version 1', experience: [] },
          }],
        });
        if (callNum === 2) return Promise.resolve({
          rows: [{
            id: 2,
            version_number: 2,
            sections: { summary: 'Version 2', experience: [] },
          }],
        });
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/version-control/resumes/1/versions/1/compare/2')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.version1).toBeDefined();
      expect(response.body.version2).toBeDefined();
      expect(response.body.differences).toBeDefined();
    });

    it('should return 404 if one or both versions not found', async () => {
      mockQuery.mockImplementation((query, params) => {
        if (query.includes('version_number = $3')) {
          if (params[2] === '1') {
            return Promise.resolve({ rows: [{ id: 1 }] });
          }
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/version-control/resumes/1/versions/1/compare/999')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/version-control/cover-letters/:coverLetterId/versions', () => {
    it('should get version history for a cover letter', async () => {
      let callNum = 0;
      mockQuery.mockImplementation((query, params) => {
        callNum++;
        if (callNum === 1) return Promise.resolve({ rows: [{ id: 1 }] });
        if (callNum === 2) return Promise.resolve({
          rows: [{
            id: 1,
            version_number: 1,
            title: 'Cover Letter v1',
            content: 'Test content',
            format: 'pdf',
            file_url: null,
            change_summary: null,
            created_at: new Date(),
          }],
        });
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get('/api/version-control/cover-letters/1/versions')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.versions).toBeDefined();
      expect(Array.isArray(response.body.versions)).toBe(true);
    });

    it('should return 404 if cover letter not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/version-control/cover-letters/999/versions')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/version-control/cover-letters/:coverLetterId/create', () => {
    it('should create a new cover letter version', async () => {
      let callNum = 0;
      mockQuery.mockImplementation((query, params) => {
        callNum++;
        if (callNum === 1) return Promise.resolve({
          rows: [{
            id: 1,
            content: 'Original content',
            format: 'pdf',
            file_url: '/uploads/cover.pdf',
            title: 'Original Cover Letter',
          }],
        });
        if (callNum === 2) return Promise.resolve({ rows: [{ next_version: 1 }] });
        if (callNum === 3) return Promise.resolve({
          rows: [{
            id: 1,
            version_number: 1,
            title: 'Original Cover Letter - Version 1',
            content: 'Original content',
            format: 'pdf',
            file_url: '/uploads/cover.pdf',
            change_summary: null,
            created_at: new Date(),
          }],
        });
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .post('/api/version-control/cover-letters/1/create')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          title: 'New Version',
          content: 'Updated content',
        });

      expect([200, 201]).toContain(response.status);
      expect(response.body.version).toBeDefined();
    });
  });

  describe('POST /api/version-control/cover-letters/:coverLetterId/versions/:versionNumber/restore', () => {
    it('should restore a cover letter version', async () => {
      let callNum = 0;
      mockQuery.mockImplementation((query, params) => {
        callNum++;
        if (callNum === 1) return Promise.resolve({
          rows: [{
            content: 'Restored content',
            format: 'pdf',
            file_url: '/uploads/restored.pdf',
            title: 'Restored Version',
          }],
        });
        if (callNum === 2) return Promise.resolve({ rows: [{ id: 1 }] });
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .post('/api/version-control/cover-letters/1/versions/1/restore')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('restored');
    });
  });

  describe('PUT /api/version-control/resumes/:resumeId/versions/:versionNumber/set-default', () => {
    it('should set a version as default', async () => {
      let callNum = 0;
      mockQuery.mockImplementation((query, params) => {
        callNum++;
        if (callNum === 1) return Promise.resolve({ rows: [] });
        if (callNum === 2) return Promise.resolve({ rows: [{ id: 1 }] });
        if (callNum === 3) return Promise.resolve({ rows: [] });
        if (callNum === 4) return Promise.resolve({ rows: [] });
        if (callNum === 5) return Promise.resolve({
          rows: [{
            id: 1,
            sections: { summary: 'Default' },
            format: 'pdf',
            file_url: '/uploads/default.pdf',
            title: 'Default Version',
            template_id: 1,
            template_name: 'ats-optimized',
            created_at: new Date(),
          }],
        });
        if (callNum === 6) return Promise.resolve({ rows: [] });
        if (callNum === 7) return Promise.resolve({ rows: [{ max_version: 1 }] });
        if (callNum === 8) return Promise.resolve({ rows: [{ id: 1, version_number: 0 }] });
        if (callNum === 9) return Promise.resolve({ rows: [] });
        if (callNum === 10) return Promise.resolve({ rows: [{ id: 3 }] });
        if (callNum === 11) return Promise.resolve({ rows: [] });
        if (callNum === 12) return Promise.resolve({
          rows: [{
            id: 2,
            sections: { summary: 'Default' },
            format: 'pdf',
            file_url: '/uploads/default.pdf',
            title: 'Default Version',
            template_id: 1,
            template_name: 'ats-optimized',
          }],
        });
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .put('/api/version-control/resumes/1/versions/1/set-default')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('default');
    });
  });

  describe('PUT /api/version-control/resumes/:resumeId/versions/:versionNumber/archive', () => {
    it('should archive a version', async () => {
      mockQuery.mockImplementation((query, params) => {
        const queryStr = typeof query === 'string' ? query : String(query);
        const normalizedQuery = queryStr.replace(/\s+/g, ' ').toLowerCase();
        
        // params: [archive !== false (boolean), resumeId (string), userId (number), versionNumber (string)]
        // Always return success for archive update
        if (normalizedQuery.includes('update resume_versions') && normalizedQuery.includes('is_archived') && normalizedQuery.includes('returning')) {
          return Promise.resolve({
            rows: [{
              id: 1,
              version_number: 1,
              is_archived: true,
              resume_id: 1,
              user_id: userId,
            }],
          });
        }
        // Fallback: return success for any UPDATE on resume_versions with is_archived
        if (normalizedQuery.includes('update') && normalizedQuery.includes('resume_versions') && normalizedQuery.includes('is_archived')) {
          return Promise.resolve({
            rows: [{
              id: 1,
              version_number: 1,
              is_archived: true,
              resume_id: 1,
              user_id: userId,
            }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .put('/api/version-control/resumes/1/versions/1/archive')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ archive: true });

      expect(response.status).toBe(200);
      expect(response.body.version.is_archived).toBe(true);
    });
  });

  describe('DELETE /api/version-control/resumes/:resumeId/versions/:versionNumber', () => {
    it('should delete a version', async () => {
      let callNum = 0;
      mockQuery.mockImplementation((query, params) => {
        callNum++;
        if (callNum === 1) return Promise.resolve({ rows: [] });
        if (callNum === 2) return Promise.resolve({ rows: [{ id: 1 }] });
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .delete('/api/version-control/resumes/1/versions/1')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('deleted');
    });

    it('should return 404 if version not found', async () => {
      mockQuery.mockImplementation((query, params) => {
        if (query.includes('UPDATE resume_versions SET version_label')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('DELETE FROM resume_versions')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .delete('/api/version-control/resumes/1/versions/999')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(404);
    });
  });
});

