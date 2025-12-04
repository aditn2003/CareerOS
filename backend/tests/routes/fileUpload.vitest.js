/**
 * File Upload Routes - Full Coverage Tests
 * File: backend/routes/fileUpload.js
 */

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import fileUploadRouter from '../../routes/fileUpload.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ============================================
// MOCKS
// ============================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

vi.mock('../../db/pool.js', () => ({
  default: {
    query: vi.fn(),
  },
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
    existsSync: vi.fn(() => true),
    mkdirSync: vi.fn(),
    readFileSync: vi.fn(() => Buffer.from('PDF content')),
    unlinkSync: vi.fn(),
  },
}));

vi.mock('pdfjs-dist/legacy/build/pdf.mjs', () => {
  return {
    default: {
      getDocument: vi.fn(() => ({
        promise: Promise.resolve({
          numPages: 1,
          getPage: vi.fn(() => Promise.resolve({
            getTextContent: vi.fn(() => Promise.resolve({
              items: [{ str: 'Sample PDF text' }],
            })),
          })),
        }),
      })),
    },
  };
});

vi.mock('mammoth', async () => {
  return {
    default: {
      extractRawText: vi.fn(() => Promise.resolve({ value: 'Sample DOCX text' })),
    },
  };
});

const mockDiskStorage = vi.fn();
const mockMulter = vi.fn();
const mockSingle = vi.fn();

vi.mock('multer', () => {
  const mockStorage = {
    diskStorage: mockDiskStorage,
  };
  mockStorage.diskStorage.mockReturnValue({});
  mockMulter.mockReturnValue({
    single: mockSingle,
  });
  return {
    default: mockMulter,
    diskStorage: mockDiskStorage,
  };
});

// ============================================
// SETUP
// ============================================

let app;
let mockQueryFn;

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret';
  
  app = express();
  app.use(express.json());
  app.use('/api/upload', fileUploadRouter);
});

beforeEach(async () => {
  vi.clearAllMocks();
  const pool = (await import('../../db/pool.js')).default;
  mockQueryFn = pool.query;
  
  // Mock multer middleware to add req.file
  mockSingle.mockImplementation((fieldName) => {
    return (req, res, next) => {
      if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
        req.file = {
          filename: 'test-file-123.pdf',
          originalname: 'resume.pdf',
          path: '/uploads/resumes/test-file-123.pdf',
          mimetype: 'application/pdf',
          size: 1024,
        };
      }
      next();
    };
  });
});


// ============================================
// TESTS
// ============================================

describe('File Upload Routes - Full Coverage', () => {
  describe('POST /api/upload/resume', () => {
    it('should upload PDF resume successfully', async () => {
      const mockResume = { id: 1, title: 'My Resume', format: 'pdf', file_url: '/uploads/resumes/test.pdf' };
      mockQueryFn.mockResolvedValueOnce({ rows: [mockResume], rowCount: 1 });

      const res = await request(app)
        .post('/api/upload/resume')
        .set('Authorization', 'Bearer valid-token')
        .attach('file', Buffer.from('PDF content'), 'resume.pdf')
        .field('title', 'My Resume');

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('uploaded successfully');
      expect(res.body.resume).toBeDefined();
    });

    it('should upload DOCX resume successfully', async () => {
      const mockResume = { id: 1, title: 'My Resume', format: 'docx', file_url: '/uploads/resumes/test.docx' };
      mockQueryFn.mockResolvedValueOnce({ rows: [mockResume], rowCount: 1 });

      const res = await request(app)
        .post('/api/upload/resume')
        .set('Authorization', 'Bearer valid-token')
        .attach('file', Buffer.from('DOCX content'), 'resume.docx')
        .field('title', 'My Resume');

      expect(res.status).toBe(200);
      expect(res.body.resume).toBeDefined();
    });

    it('should upload TXT resume successfully', async () => {
      const mockResume = { id: 1, title: 'My Resume', format: 'txt', file_url: '/uploads/resumes/test.txt' };
      mockQueryFn.mockResolvedValueOnce({ rows: [mockResume], rowCount: 1 });

      vi.mocked(fs.readFileSync).mockReturnValueOnce('Sample text content');

      const res = await request(app)
        .post('/api/upload/resume')
        .set('Authorization', 'Bearer valid-token')
        .attach('file', Buffer.from('Text content'), 'resume.txt')
        .field('title', 'My Resume');

      expect(res.status).toBe(200);
      expect(res.body.resume).toBeDefined();
    });

    it('should handle file_url column missing (fallback)', async () => {
      const colError = new Error('Column does not exist');
      colError.code = '42703';
      const mockResume = { id: 1, title: 'My Resume', format: 'pdf' };
      
      mockQueryFn
        .mockRejectedValueOnce(colError) // First attempt with file_url fails
        .mockResolvedValueOnce({ rows: [mockResume], rowCount: 1 }); // Fallback succeeds

      const res = await request(app)
        .post('/api/upload/resume')
        .set('Authorization', 'Bearer valid-token')
        .attach('file', Buffer.from('PDF content'), 'resume.pdf')
        .field('title', 'My Resume');

      expect(res.status).toBe(200);
      expect(res.body.resume.file_url).toBeDefined();
    });

    it('should return 400 if no file uploaded', async () => {
      const res = await request(app)
        .post('/api/upload/resume')
        .set('Authorization', 'Bearer valid-token')
        .field('title', 'My Resume');

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('No file uploaded');
    });

    it('should return 401 if no token provided', async () => {
      const res = await request(app)
        .post('/api/upload/resume')
        .attach('file', Buffer.from('PDF content'), 'resume.pdf');

      expect(res.status).toBe(401);
    });

    it('should clean up file on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .post('/api/upload/resume')
        .set('Authorization', 'Bearer valid-token')
        .attach('file', Buffer.from('PDF content'), 'resume.pdf')
        .field('title', 'My Resume');

      expect(res.status).toBe(500);
      expect(fs.unlinkSync).toHaveBeenCalled();
    });

    it('should reject invalid file type', async () => {
      const res = await request(app)
        .post('/api/upload/resume')
        .set('Authorization', 'Bearer valid-token')
        .attach('file', Buffer.from('content'), 'resume.exe');

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/upload/cover-letter', () => {
    it('should upload PDF cover letter successfully', async () => {
      const mockCoverLetter = { id: 1, title: 'Cover Letter', format: 'pdf', file_url: '/uploads/cover-letters/test.pdf' };
      mockQueryFn.mockResolvedValueOnce({ rows: [mockCoverLetter], rowCount: 1 });

      const res = await request(app)
        .post('/api/upload/cover-letter')
        .set('Authorization', 'Bearer valid-token')
        .attach('file', Buffer.from('PDF content'), 'cover-letter.pdf')
        .field('title', 'Cover Letter');

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('uploaded successfully');
      expect(res.body.cover_letter).toBeDefined();
    });

    it('should upload DOCX cover letter successfully', async () => {
      const mockCoverLetter = { id: 1, title: 'Cover Letter', format: 'docx', file_url: '/uploads/cover-letters/test.docx' };
      mockQueryFn.mockResolvedValueOnce({ rows: [mockCoverLetter], rowCount: 1 });

      const res = await request(app)
        .post('/api/upload/cover-letter')
        .set('Authorization', 'Bearer valid-token')
        .attach('file', Buffer.from('DOCX content'), 'cover-letter.docx')
        .field('title', 'Cover Letter');

      expect(res.status).toBe(200);
      expect(res.body.cover_letter).toBeDefined();
    });

    it('should return 400 if no file uploaded', async () => {
      const res = await request(app)
        .post('/api/upload/cover-letter')
        .set('Authorization', 'Bearer valid-token')
        .field('title', 'Cover Letter');

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('No file uploaded');
    });

    it('should clean up file on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .post('/api/upload/cover-letter')
        .set('Authorization', 'Bearer valid-token')
        .attach('file', Buffer.from('PDF content'), 'cover-letter.pdf')
        .field('title', 'Cover Letter');

      expect(res.status).toBe(500);
      expect(fs.unlinkSync).toHaveBeenCalled();
    });
  });

  describe('GET /api/upload/resume/:filename', () => {
    it('should serve resume file', async () => {
      vi.mocked(fs.existsSync).mockReturnValueOnce(true);

      const res = await request(app)
        .get('/api/upload/resume/test.pdf')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });

    it('should return 404 if file not found', async () => {
      vi.mocked(fs.existsSync).mockReturnValueOnce(false);

      const res = await request(app)
        .get('/api/upload/resume/nonexistent.pdf')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('File not found');
    });

    it('should return 401 if no token provided', async () => {
      const res = await request(app)
        .get('/api/upload/resume/test.pdf');

      expect(res.status).toBe(401);
    });

    it('should handle file serve error', async () => {
      vi.mocked(fs.existsSync).mockReturnValueOnce(true);
      // Mock sendFile to throw error
      const originalSendFile = express.response.sendFile;
      express.response.sendFile = vi.fn(() => {
        throw new Error('File read error');
      });

      const res = await request(app)
        .get('/api/upload/resume/test.pdf')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
      express.response.sendFile = originalSendFile;
    });
  });

  describe('GET /api/upload/cover-letter/:filename', () => {
    it('should serve cover letter file', async () => {
      vi.mocked(fs.existsSync).mockReturnValueOnce(true);

      const res = await request(app)
        .get('/api/upload/cover-letter/test.pdf')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });

    it('should return 404 if file not found', async () => {
      vi.mocked(fs.existsSync).mockReturnValueOnce(false);

      const res = await request(app)
        .get('/api/upload/cover-letter/nonexistent.pdf')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('File not found');
    });

    it('should return 401 if no token provided', async () => {
      const res = await request(app)
        .get('/api/upload/cover-letter/test.pdf');

      expect(res.status).toBe(401);
    });
  });
});

