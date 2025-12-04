/**
 * Version Control Routes - Full Coverage Tests
 * File: backend/routes/versionControl.js
 */

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import versionControlRouter from '../../routes/versionControl.js';
import fs from 'fs';
import path from 'path';

// ============================================
// MOCKS
// ============================================

const mockQueryFn = vi.fn();

vi.mock('pg', () => ({
  Pool: vi.fn(() => ({
    query: mockQueryFn,
  })),
}));

vi.mock('jsonwebtoken', () => ({
  default: {
    verify: vi.fn((token, secret) => {
      if (token === 'valid-token') {
        return { id: 1, email: 'test@example.com' };
      }
      throw new Error('Invalid token');
    }),
  },
}));

vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(() => false),
    readFileSync: vi.fn(() => Buffer.from('PDF content')),
  },
}));

vi.mock('path', () => ({
  default: {
    join: vi.fn((...args) => args.join('/')),
    dirname: vi.fn((p) => p.replace(/\/[^/]+$/, '')),
  },
}));

// ============================================
// SETUP
// ============================================

let app;

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret';
  process.env.DATABASE_URL = 'postgresql://test:test@localhost/test';
  
  app = express();
  app.use(express.json());
  app.use('/api/versions', versionControlRouter);
});

beforeEach(() => {
  vi.clearAllMocks();
});

// ============================================
// TESTS
// ============================================

describe('Version Control Routes - Full Coverage', () => {
  describe('GET /api/versions/resumes/:resumeId/versions', () => {
    it('should get resume version history', async () => {
      const mockVersions = [
        { id: 1, version_number: 2, title: 'Resume v2', created_at: '2024-01-01' },
        { id: 2, version_number: 1, title: 'Resume v1', created_at: '2024-01-02' },
      ];
      
      mockQueryFn
        .mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 }) // Resume check
        .mockResolvedValueOnce({ rows: mockVersions, rowCount: 2 }); // Get versions

      const res = await request(app)
        .get('/api/versions/resumes/1/versions')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.versions).toHaveLength(2);
      expect(res.body.versions[0].version_number).toBe(2);
    });

    it('should return 404 if resume not found', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = await request(app)
        .get('/api/versions/resumes/999/versions')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Resume not found');
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .get('/api/versions/resumes/1/versions')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
    });
  });

  describe('GET /api/versions/cover-letters/:coverLetterId/versions', () => {
    it('should get cover letter version history', async () => {
      const mockVersions = [
        { id: 1, version_number: 2, title: 'Cover Letter v2', created_at: '2024-01-01' },
        { id: 2, version_number: 1, title: 'Cover Letter v1', created_at: '2024-01-02' },
      ];
      
      mockQueryFn
        .mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 }) // Cover letter check
        .mockResolvedValueOnce({ rows: mockVersions, rowCount: 2 }); // Get versions

      const res = await request(app)
        .get('/api/versions/cover-letters/1/versions')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.versions).toHaveLength(2);
    });

    it('should return 404 if cover letter not found', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = await request(app)
        .get('/api/versions/cover-letters/999/versions')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Cover letter not found');
    });
  });

  describe('GET /api/versions/resumes/:resumeId/versions/:versionNumber', () => {
    it('should get specific resume version', async () => {
      const mockVersion = { id: 1, version_number: 2, title: 'Resume v2', sections: {}, format: 'pdf' };
      
      mockQueryFn.mockResolvedValueOnce({ rows: [mockVersion], rowCount: 1 });

      const res = await request(app)
        .get('/api/versions/resumes/1/versions/2')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.version.version_number).toBe(2);
    });

    it('should return 404 if version not found', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = await request(app)
        .get('/api/versions/resumes/1/versions/999')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Version not found');
    });
  });

  describe('GET /api/versions/cover-letters/:coverLetterId/versions/:versionNumber', () => {
    it('should get specific cover letter version', async () => {
      const mockVersion = { id: 1, version_number: 2, title: 'Cover Letter v2', content: 'Content' };
      
      mockQueryFn.mockResolvedValueOnce({ rows: [mockVersion], rowCount: 1 });

      const res = await request(app)
        .get('/api/versions/cover-letters/1/versions/2')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.version.version_number).toBe(2);
    });
  });

  describe('GET /api/versions/resumes/:resumeId/versions/:versionNumber/view', () => {
    it('should serve resume version file if exists', async () => {
      const mockVersion = { file_url: '/path/to/file.pdf', format: 'pdf', title: 'Resume' };
      vi.mocked(fs.existsSync).mockReturnValueOnce(true);
      
      mockQueryFn.mockResolvedValueOnce({ rows: [mockVersion], rowCount: 1 });

      const res = await request(app)
        .get('/api/versions/resumes/1/versions/2/view')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });

    it('should return 404 if version not found', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = await request(app)
        .get('/api/versions/resumes/1/versions/2/view')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(404);
    });

    it('should return 404 if file not found', async () => {
      const mockVersion = { file_url: '/path/to/file.pdf', format: 'pdf', title: 'Resume' };
      vi.mocked(fs.existsSync).mockReturnValueOnce(false);
      
      mockQueryFn.mockResolvedValueOnce({ rows: [mockVersion], rowCount: 1 });

      const res = await request(app)
        .get('/api/versions/resumes/1/versions/2/view')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Version file not found');
    });
  });

  describe('GET /api/versions/cover-letters/:coverLetterId/versions/:versionNumber/view', () => {
    it('should serve cover letter version file if exists', async () => {
      const mockVersion = { file_url: '/path/to/file.pdf', format: 'pdf', title: 'Cover Letter' };
      vi.mocked(fs.existsSync).mockReturnValueOnce(true);
      
      mockQueryFn.mockResolvedValueOnce({ rows: [mockVersion], rowCount: 1 });

      const res = await request(app)
        .get('/api/versions/cover-letters/1/versions/2/view')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/versions/resumes/:resumeId/versions/:versionNumber/restore', () => {
    it('should restore resume version', async () => {
      const mockVersion = { sections: {}, format: 'pdf', file_url: '/path/to/file.pdf', title: 'Resume' };
      
      mockQueryFn
        .mockResolvedValueOnce({ rows: [mockVersion], rowCount: 1 }) // Get version
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // Update resume

      const res = await request(app)
        .post('/api/versions/resumes/1/versions/2/restore')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Version restored successfully');
    });

    it('should return 404 if version not found', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = await request(app)
        .post('/api/versions/resumes/1/versions/999/restore')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Version not found');
    });
  });

  describe('POST /api/versions/cover-letters/:coverLetterId/versions/:versionNumber/restore', () => {
    it('should restore cover letter version', async () => {
      const mockVersion = { content: 'Content', format: 'pdf', file_url: '/path/to/file.pdf', title: 'Cover Letter' };
      
      mockQueryFn
        .mockResolvedValueOnce({ rows: [mockVersion], rowCount: 1 }) // Get version
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // Update cover letter

      const res = await request(app)
        .post('/api/versions/cover-letters/1/versions/2/restore')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Version restored successfully');
    });
  });
});

