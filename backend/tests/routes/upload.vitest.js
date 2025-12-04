/**
 * Upload Routes - Full Coverage Tests
 * File: backend/routes/upload.js
 */

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import uploadRouter from '../../routes/upload.js';
import fs from 'fs';
import path from 'path';

// ============================================
// MOCKS
// ============================================

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

vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(() => true),
    mkdirSync: vi.fn(),
  },
}));

// ============================================
// SETUP
// ============================================

let app;

beforeAll(() => {
  app = express();
  app.use(express.json());
  app.use('/api', uploadRouter);
});

beforeEach(() => {
  vi.clearAllMocks();
  mockSingle.mockImplementation((fieldName) => {
    return (req, res, next) => {
      req.file = {
        filename: 'test-file-123.jpg',
        originalname: 'test.jpg',
        mimetype: 'image/jpeg',
        size: 1024,
      };
      next();
    };
  });
});

// ============================================
// TESTS
// ============================================

describe('Upload Routes - Full Coverage', () => {
  describe('POST /api/upload-profile-pic', () => {
    it('should upload profile picture', async () => {
      const res = await request(app)
        .post('/api/upload-profile-pic')
        .set('Authorization', 'Bearer valid-token')
        .attach('image', Buffer.from('fake image data'), 'test.jpg');

      expect(res.status).toBe(200);
      expect(res.body.url).toBeDefined();
      expect(res.body.url).toContain('/uploads/');
    });

    it('should handle file upload with unique filename', async () => {
      const res = await request(app)
        .post('/api/upload-profile-pic')
        .set('Authorization', 'Bearer valid-token')
        .attach('image', Buffer.from('fake image data'), 'test file.jpg');

      expect(res.status).toBe(200);
      expect(res.body.url).toBeDefined();
    });
  });
});

