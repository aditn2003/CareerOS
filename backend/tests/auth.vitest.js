/**
 * Auth Middleware - Full Coverage Tests
 * File: backend/auth.js
 */

import { describe, it, expect, vi, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { auth } from '../auth.js';

// ============================================
// MOCKS
// ============================================

vi.mock('jsonwebtoken', () => {
  const mockVerify = vi.fn();
  return {
    default: {
      verify: mockVerify,
    },
    __mockVerify: mockVerify, // Export for use in tests
  };
});

// ============================================
// SETUP
// ============================================

let app;

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret';
  
  app = express();
  app.use(express.json());
  app.use(auth);
  app.get('/test', (req, res) => {
    res.json({ user: req.user });
  });
});

// ============================================
// TESTS
// ============================================

describe('Auth Middleware - Full Coverage', () => {
  let mockVerify;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Get the mock function from the mocked module
    const jwtModule = await import('jsonwebtoken');
    mockVerify = jwtModule.default.verify;
  });

  describe('auth middleware', () => {
    it('should allow request with valid token', async () => {
      mockVerify.mockReturnValue({ id: 1, email: 'test@example.com' });

      const res = await request(app)
        .get('/test')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.user).toEqual({ id: 1, email: 'test@example.com' });
      expect(mockVerify).toHaveBeenCalledWith('valid-token', 'test-secret');
    });

    it('should return 401 if no token provided', async () => {
      const res = await request(app)
        .get('/test');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('NO_TOKEN');
    });

    it('should return 401 if authorization header missing', async () => {
      const res = await request(app)
        .get('/test')
        .set('Authorization', '');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('NO_TOKEN');
    });

    it('should return 401 if token does not start with Bearer', async () => {
      const res = await request(app)
        .get('/test')
        .set('Authorization', 'Invalid token');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('NO_TOKEN');
    });

    it('should return 401 on TokenExpiredError', async () => {
      const expiredError = new Error('Token expired');
      expiredError.name = 'TokenExpiredError';
      mockVerify.mockImplementationOnce(() => {
        throw expiredError;
      });

      const res = await request(app)
        .get('/test')
        .set('Authorization', 'Bearer expired-token');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('TOKEN_EXPIRED');
    });

    it('should return 401 on invalid token', async () => {
      mockVerify.mockImplementationOnce(() => {
        throw new Error('Invalid token');
      });

      const res = await request(app)
        .get('/test')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('INVALID_TOKEN');
    });

    it('should handle token with extra spaces', async () => {
      const jwtModule = await import('jsonwebtoken');
      const mockVerify = jwtModule.default.verify;
      mockVerify.mockReturnValue({ id: 1, email: 'test@example.com' });

      const res = await request(app)
        .get('/test')
        .set('Authorization', 'Bearer  valid-token-with-spaces');

      expect(res.status).toBe(200);
      expect(res.body.user).toBeDefined();
    });
  });
});

