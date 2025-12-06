/**
 * Cover Letter Routes - 90%+ Coverage Tests
 * Tests for backend/routes/cover_letter.js
 */

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// ============================================
// MOCKS
// ============================================

const mockQuery = vi.fn();

vi.mock('pg', () => {
  return {
    Pool: class {
      query = mockQuery;
      connect = () => Promise.resolve({ query: mockQuery, release: vi.fn() });
      on = vi.fn();
    },
  };
});

vi.mock('../auth.js', () => ({
  auth: (req, res, next) => {
    const header = req.headers.authorization;
    if (!header) return res.status(401).json({ error: 'Unauthorized' });
    if (header === 'Bearer valid-token') {
      req.user = { id: 1, email: 'test@example.com' };
      next();
    } else {
      res.status(401).json({ error: 'Invalid token' });
    }
  },
}));

// Mock data
const mockCoverLetter = {
  id: 1,
  title: 'My Cover Letter',
  format: 'pdf',
  content: 'Dear Hiring Manager...',
  file_url: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  source: 'user',
};

const mockTemplate = {
  id: 1,
  title: 'Professional Template',
  format: 'pdf',
  file_url: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  source: 'template',
  is_custom: false,
};

// ============================================
// TESTS
// ============================================

describe('Cover Letter Routes - 90%+ Coverage', () => {
  let app;
  let coverLetterRouter;

  beforeAll(async () => {
    const module = await import('../../routes/cover_letter.js');
    coverLetterRouter = module.default;
    
    app = express();
    app.use(express.json());
    app.use('/api/cover-letter', coverLetterRouter);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ========================================
  // GET / - Get all cover letters
  // ========================================
  describe('GET /api/cover-letter', () => {
    it('should return cover letters and templates', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [mockCoverLetter], rowCount: 1 }) // User letters
        .mockResolvedValueOnce({ rows: [mockTemplate], rowCount: 1 }); // Templates

      const res = await request(app)
        .get('/api/cover-letter')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.cover_letters).toBeDefined();
      expect(res.body.user_letters).toBeDefined();
      expect(res.body.templates).toBeDefined();
    });

    it('should handle column does not exist error (42703) and fallback to name', async () => {
      const columnError = new Error('column does not exist');
      columnError.code = '42703';
      
      mockQuery
        .mockRejectedValueOnce(columnError) // First query fails with column error
        .mockResolvedValueOnce({ rows: [mockCoverLetter], rowCount: 1 }) // Fallback with 'name'
        .mockResolvedValueOnce({ rows: [mockTemplate], rowCount: 1 }); // Templates

      const res = await request(app)
        .get('/api/cover-letter')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.cover_letters).toBeDefined();
    });

    it('should handle fallback query also failing', async () => {
      const columnError = new Error('column does not exist');
      columnError.code = '42703';
      const fallbackError = new Error('fallback also failed');
      
      mockQuery
        .mockRejectedValueOnce(columnError) // First query fails
        .mockRejectedValueOnce(fallbackError) // Fallback also fails
        .mockResolvedValueOnce({ rows: [mockTemplate], rowCount: 1 }); // Templates still work

      const res = await request(app)
        .get('/api/cover-letter')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.user_letters).toEqual([]);
    });

    it('should handle templates query error gracefully', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [mockCoverLetter], rowCount: 1 }) // User letters
        .mockRejectedValueOnce(new Error('Template query failed')); // Templates fail

      const res = await request(app)
        .get('/api/cover-letter')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.templates).toEqual([]);
    });

    it('should handle table does not exist error (42P01)', async () => {
      const tableError = new Error('relation does not exist');
      tableError.code = '42P01';
      
      // Mock both queries - first fails (caught internally), second succeeds
      mockQuery
        .mockRejectedValueOnce(tableError) // First query (uploaded_cover_letters) - caught internally
        .mockResolvedValueOnce({ rows: [] }); // Second query (cover_letter_templates)

      const res = await request(app)
        .get('/api/cover-letter')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.cover_letters).toEqual([]);
    });

    it('should handle "does not exist" in error message', async () => {
      const tableError = new Error('table does not exist');
      
      // Mock both queries - first fails (caught internally), second succeeds
      mockQuery
        .mockRejectedValueOnce(tableError) // First query (uploaded_cover_letters) - caught internally
        .mockResolvedValueOnce({ rows: [] }); // Second query (cover_letter_templates)

      const res = await request(app)
        .get('/api/cover-letter')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.cover_letters).toEqual([]);
    });

    it('should re-throw non-column errors', async () => {
      const dbError = new Error('Connection failed');
      dbError.code = 'CONNECTION_ERROR';
      
      mockQuery.mockRejectedValueOnce(dbError);

      const res = await request(app)
        .get('/api/cover-letter')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to load cover letters');
    });

    it('should return 401 without token', async () => {
      const res = await request(app)
        .get('/api/cover-letter');

      expect(res.status).toBe(401);
    });

    it('should return 401 with invalid token', async () => {
      const res = await request(app)
        .get('/api/cover-letter')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(401);
    });
  });

  // ========================================
  // POST / - Create cover letter
  // ========================================
  describe('POST /api/cover-letter', () => {
    it('should create cover letter successfully', async () => {
      mockQuery.mockResolvedValueOnce({ 
        rows: [{ id: 1, title: 'New Letter', format: 'pdf', created_at: new Date().toISOString() }], 
        rowCount: 1 
      });

      const res = await request(app)
        .post('/api/cover-letter')
        .set('Authorization', 'Bearer valid-token')
        .send({
          title: 'New Letter',
          format: 'pdf',
          content: 'Dear Hiring Manager...',
          file_url: 'https://example.com/file.pdf',
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('✅ Cover letter saved');
      expect(res.body.cover_letter).toBeDefined();
    });

    it('should create cover letter with default format', async () => {
      mockQuery.mockResolvedValueOnce({ 
        rows: [{ id: 2, title: 'Letter', format: 'pdf', created_at: new Date().toISOString() }], 
        rowCount: 1 
      });

      const res = await request(app)
        .post('/api/cover-letter')
        .set('Authorization', 'Bearer valid-token')
        .send({
          title: 'Letter',
          content: 'Content here',
        });

      expect(res.status).toBe(200);
    });

    it('should return 400 if title is missing', async () => {
      const res = await request(app)
        .post('/api/cover-letter')
        .set('Authorization', 'Bearer valid-token')
        .send({
          content: 'Some content',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Name/Title is required');
    });

    it('should return 503 if table does not exist (42P01)', async () => {
      const tableError = new Error('relation does not exist');
      tableError.code = '42P01';
      
      mockQuery.mockRejectedValueOnce(tableError);

      const res = await request(app)
        .post('/api/cover-letter')
        .set('Authorization', 'Bearer valid-token')
        .send({
          title: 'New Letter',
        });

      expect(res.status).toBe(503);
      expect(res.body.error).toContain('database migration required');
    });

    it('should return 503 if "does not exist" in error message', async () => {
      const tableError = new Error('table does not exist');
      
      mockQuery.mockRejectedValueOnce(tableError);

      const res = await request(app)
        .post('/api/cover-letter')
        .set('Authorization', 'Bearer valid-token')
        .send({
          title: 'New Letter',
        });

      expect(res.status).toBe(503);
    });

    it('should return 500 on general database error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .post('/api/cover-letter')
        .set('Authorization', 'Bearer valid-token')
        .send({
          title: 'New Letter',
        });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to save cover letter');
    });

    it('should return 401 without token', async () => {
      const res = await request(app)
        .post('/api/cover-letter')
        .send({ title: 'Letter' });

      expect(res.status).toBe(401);
    });
  });

  // ========================================
  // DELETE /:id - Delete cover letter
  // ========================================
  describe('DELETE /api/cover-letter/:id', () => {
    it('should delete cover letter successfully', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      const res = await request(app)
        .delete('/api/cover-letter/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('🗑️ Cover letter deleted');
    });

    it('should return 503 if table does not exist (42P01)', async () => {
      const tableError = new Error('relation does not exist');
      tableError.code = '42P01';
      
      mockQuery.mockRejectedValueOnce(tableError);

      const res = await request(app)
        .delete('/api/cover-letter/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(503);
      expect(res.body.error).toContain('database migration required');
    });

    it('should return 503 if "does not exist" in error message', async () => {
      const tableError = new Error('table does not exist');
      
      mockQuery.mockRejectedValueOnce(tableError);

      const res = await request(app)
        .delete('/api/cover-letter/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(503);
    });

    it('should return 500 on general database error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .delete('/api/cover-letter/1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to delete cover letter');
    });

    it('should return 401 without token', async () => {
      const res = await request(app)
        .delete('/api/cover-letter/1');

      expect(res.status).toBe(401);
    });
  });
});

