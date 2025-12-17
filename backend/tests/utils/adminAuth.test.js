/**
 * Admin Auth Utility Tests
 * Tests utils/adminAuth.js
 * Target: 90%+ coverage
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { requireAdmin, isAdmin } from '../../utils/adminAuth.js';

// Mock the database pool
vi.mock('../../db/pool.js', () => ({
  default: {
    query: vi.fn(),
  },
}));

import pool from '../../db/pool.js';

describe('Admin Auth Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('requireAdmin middleware', () => {
    it('should return 401 if req.user is not set', async () => {
      const req = {};
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };
      const next = vi.fn();

      requireAdmin(req, res, next);

      // Wait for async execution
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if req.user.id is not set', async () => {
      const req = { user: {} };
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };
      const next = vi.fn();

      requireAdmin(req, res, next);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    });

    it('should return 403 if user is not a mentor', async () => {
      const req = { user: { id: 1 } };
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };
      const next = vi.fn();

      pool.query.mockResolvedValueOnce({
        rows: [{ account_type: 'user' }],
      });

      requireAdmin(req, res, next);

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(pool.query).toHaveBeenCalledWith(
        'SELECT account_type FROM users WHERE id = $1',
        [1]
      );
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'FORBIDDEN',
        message: 'Admin access required',
      });
    });

    it('should call next() if user is a mentor', async () => {
      const req = { user: { id: 1 } };
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };
      const next = vi.fn();

      pool.query.mockResolvedValueOnce({
        rows: [{ account_type: 'mentor' }],
      });

      requireAdmin(req, res, next);

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 500 on database error', async () => {
      const req = { user: { id: 1 } };
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };
      const next = vi.fn();

      pool.query.mockRejectedValueOnce(new Error('Database error'));

      requireAdmin(req, res, next);

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'AUTH_CHECK_FAILED' });
    });

    it('should return 403 if user not found in database', async () => {
      const req = { user: { id: 999 } };
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };
      const next = vi.fn();

      pool.query.mockResolvedValueOnce({
        rows: [],
      });

      requireAdmin(req, res, next);

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('isAdmin helper', () => {
    it('should return true if user is a mentor', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ account_type: 'mentor' }],
      });

      const result = await isAdmin(1);

      expect(result).toBe(true);
      expect(pool.query).toHaveBeenCalledWith(
        'SELECT account_type FROM users WHERE id = $1',
        [1]
      );
    });

    it('should return false if user is not a mentor', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ account_type: 'user' }],
      });

      const result = await isAdmin(1);

      expect(result).toBe(false);
    });

    it('should return false if user not found', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [],
      });

      const result = await isAdmin(999);

      expect(result).toBe(false);
    });

    it('should return false on database error', async () => {
      pool.query.mockRejectedValueOnce(new Error('Database error'));

      const result = await isAdmin(1);

      expect(result).toBe(false);
    });
  });
});

