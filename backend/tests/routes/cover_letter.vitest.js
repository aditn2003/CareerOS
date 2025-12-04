/**
 * Cover Letter Routes - Full Coverage Tests
 * File: backend/routes/cover_letter.js
 */

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import coverLetterRouter from '../../routes/cover_letter.js';

// ============================================
// MOCKS
// ============================================

// Create mock query function using a getter to avoid hoisting issues
let mockQueryFn;

vi.mock('pg', () => {
  // Create the mock function inside the factory
  const queryFn = vi.fn();
  // Store reference in global to access from tests
  if (typeof globalThis !== 'undefined') {
    globalThis.__coverLetterMockQueryFn = queryFn;
  }
  
  const mockPool = {
    query: queryFn,
  };
  // Create a proper constructor function
  function MockPool() {
    return mockPool;
  }
  return {
    default: {
      Pool: MockPool,
    },
    Pool: MockPool,
  };
});

vi.mock('../../auth.js', () => ({
  auth: vi.fn((req, res, next) => {
    req.user = { id: 1 };
    next();
  }),
}));

// ============================================
// SETUP
// ============================================

let app;

beforeAll(() => {
  // Initialize mockQueryFn after mocks are set up
  mockQueryFn = globalThis.__coverLetterMockQueryFn || vi.fn();
  
  app = express();
  app.use(express.json());
  app.use('/api/cover-letters', coverLetterRouter);
});

beforeEach(() => {
  // Ensure mockQueryFn is available
  if (!mockQueryFn) {
    mockQueryFn = globalThis.__coverLetterMockQueryFn || vi.fn();
  }
  vi.clearAllMocks();
  // Re-assign after clearing to ensure it's still available
  mockQueryFn = globalThis.__coverLetterMockQueryFn || vi.fn();
});

// ============================================
// TESTS
// ============================================

describe('Cover Letter Routes - Full Coverage', () => {
  describe('GET /api/cover-letters', () => {
    it('should return user cover letters and templates', async () => {
      const mockUserLetters = [
        { id: 1, title: 'Cover Letter 1', source: 'user' },
      ];
      const mockTemplates = [
        { id: 1, title: 'Template 1', source: 'template' },
      ];

      mockQueryFn
        .mockResolvedValueOnce({ rows: mockUserLetters }) // User letters
        .mockResolvedValueOnce({ rows: mockTemplates }); // Templates

      const res = await request(app)
        .get('/api/cover-letters')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body).toBeDefined();
    });

    it('should handle missing title column', async () => {
      const error = new Error('Column does not exist');
      error.code = '42703';
      
      mockQueryFn
        .mockRejectedValueOnce(error) // First query fails
        .mockResolvedValueOnce({ rows: [{ id: 1, name: 'Cover Letter 1' }] }) // Fallback query
        .mockResolvedValueOnce({ rows: [] }); // Templates

      const res = await request(app)
        .get('/api/cover-letters')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });

    it('should handle table not existing (42P01)', async () => {
      const error = new Error('Table does not exist');
      error.code = '42P01';
      
      mockQueryFn.mockRejectedValueOnce(error);

      const res = await request(app)
        .get('/api/cover-letters')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.cover_letters).toEqual([]);
    });

    it('should handle table not existing (message includes does not exist)', async () => {
      const error = new Error('relation "cover_letters" does not exist');
      
      mockQueryFn.mockRejectedValueOnce(error);

      const res = await request(app)
        .get('/api/cover-letters')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.cover_letters).toEqual([]);
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .get('/api/cover-letters')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
    });
  });

  describe('POST /api/cover-letters', () => {
    it('should create cover letter with all fields', async () => {
      const mockCoverLetter = { id: 1, title: 'New Cover Letter', format: 'pdf', created_at: '2024-01-01' };
      mockQueryFn.mockResolvedValueOnce({ rows: [mockCoverLetter] });

      const res = await request(app)
        .post('/api/cover-letters')
        .set('Authorization', 'Bearer valid-token')
        .send({
          title: 'New Cover Letter',
          content: 'Dear Hiring Manager...',
          format: 'pdf',
          file_url: 'https://example.com/file.pdf',
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('saved');
      expect(res.body.cover_letter).toEqual(mockCoverLetter);
    });

    it('should create cover letter with default format', async () => {
      const mockCoverLetter = { id: 1, title: 'New Cover Letter', format: 'pdf' };
      mockQueryFn.mockResolvedValueOnce({ rows: [mockCoverLetter] });

      const res = await request(app)
        .post('/api/cover-letters')
        .set('Authorization', 'Bearer valid-token')
        .send({
          title: 'New Cover Letter',
          content: 'Dear Hiring Manager...',
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('saved');
    });

    it('should return 400 if title missing', async () => {
      const res = await request(app)
        .post('/api/cover-letters')
        .set('Authorization', 'Bearer valid-token')
        .send({
          content: 'Some content',
        });

      expect(res.status).toBe(400);
    });

    it('should handle table not existing', async () => {
      const error = new Error('Table does not exist');
      error.code = '42P01';
      mockQueryFn.mockRejectedValueOnce(error);

      const res = await request(app)
        .post('/api/cover-letters')
        .set('Authorization', 'Bearer valid-token')
        .send({
          title: 'Test',
          content: 'Content',
        });

      expect(res.status).toBe(503);
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .post('/api/cover-letters')
        .set('Authorization', 'Bearer valid-token')
        .send({
          title: 'Test',
          content: 'Content',
        });

      expect(res.status).toBe(500);
    });
  });

  describe('GET /api/cover-letters/:id', () => {
    it('should return single cover letter', async () => {
      const mockCoverLetter = { id: 1, title: 'Cover Letter 1', content: 'Content' };
      mockQueryFn.mockResolvedValueOnce({ rows: [mockCoverLetter] });

      const res = await request(app)
        .get('/api/cover-letters/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.cover_letter).toEqual(mockCoverLetter);
    });

    it('should return 404 if cover letter not found', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/api/cover-letters/999')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(404);
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .get('/api/cover-letters/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
    });
  });

  describe('DELETE /api/cover-letters/:id', () => {
    it('should delete cover letter', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      const res = await request(app)
        .delete('/api/cover-letters/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('deleted');
    });

    it('should handle table not existing', async () => {
      const error = new Error('Table does not exist');
      error.code = '42P01';
      mockQueryFn.mockRejectedValueOnce(error);

      const res = await request(app)
        .delete('/api/cover-letters/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(503);
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .delete('/api/cover-letters/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
    });
  });
});

