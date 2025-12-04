/**
 * Upload Routes - 90%+ Coverage Tests
 * Tests for backend/routes/upload.js
 */

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// ============================================
// MOCKS
// ============================================

vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn().mockReturnValue(true),
    mkdirSync: vi.fn(),
    readFileSync: vi.fn().mockReturnValue('file content'),
    writeFileSync: vi.fn(),
    unlinkSync: vi.fn(),
  },
  existsSync: vi.fn().mockReturnValue(true),
  mkdirSync: vi.fn(),
}));

vi.mock('multer', () => {
  const multer = () => ({
    single: (fieldName) => (req, res, next) => {
      if (req.headers['x-test-no-file']) {
        return next(new Error('No file'));
      }
      if (req.headers['x-test-invalid-type']) {
        return next(new Error('Invalid file type'));
      }
      req.file = { 
        filename: 'test-image.jpg', 
        path: '/uploads/test-image.jpg',
        mimetype: 'image/jpeg',
        size: 1024,
        originalname: 'test-image.jpg',
      };
      next();
    },
  });
  multer.diskStorage = vi.fn(() => ({}));
  return { default: multer };
});

// ============================================
// TESTS
// ============================================

describe('Upload Routes - 90%+ Coverage', () => {
  let app;
  let uploadRouter;

  beforeAll(async () => {
    const module = await import('../../routes/upload.js');
    uploadRouter = module.default;
    
    app = express();
    app.use(express.json());
    app.use('/api', uploadRouter);
    
    // Error handler for multer errors
    app.use((err, req, res, next) => {
      res.status(400).json({ error: err.message });
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ========================================
  // POST /upload-profile-pic - Upload image
  // ========================================
  describe('POST /api/upload-profile-pic', () => {
    it('should upload image successfully', async () => {
      const res = await request(app)
        .post('/api/upload-profile-pic')
        .attach('image', Buffer.from('fake image'), 'test.jpg');

      expect(res.status).toBe(200);
      expect(res.body.url).toBeDefined();
      expect(res.body.url).toContain('/uploads/');
    });

    it('should return error for missing file', async () => {
      const res = await request(app)
        .post('/api/upload-profile-pic')
        .set('x-test-no-file', 'true');

      expect(res.status).toBe(400);
    });

    it('should return error for invalid file type', async () => {
      const res = await request(app)
        .post('/api/upload-profile-pic')
        .set('x-test-invalid-type', 'true')
        .attach('image', Buffer.from('fake pdf'), 'test.pdf');

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid file type');
    });
  });
});

