/**
 * Profile Routes - 90%+ Coverage Tests
 * File: backend/routes/profile.js
 */

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

// ============================================
// MOCKS
// ============================================

const mockQueryFn = vi.fn();

vi.mock('pg', () => {
  return {
    default: {
      Pool: class {
        constructor() {}
        query = mockQueryFn;
        connect = vi.fn();
        end = vi.fn();
        on = vi.fn();
      },
    },
  };
});

vi.mock('jsonwebtoken', () => ({
  default: {
    verify: vi.fn((token, secret) => {
      if (token === 'valid-token') return { id: 1, email: 'test@example.com' };
      throw new Error('Invalid token');
    }),
    sign: vi.fn(() => 'mock-token'),
  },
}));

// ============================================
// MOCK DATA
// ============================================

const mockProfile = {
  full_name: 'John Doe',
  email: 'john@example.com',
  phone: '+1-555-123-4567',
  location: 'San Francisco, CA',
  title: 'Software Engineer',
  bio: 'Experienced developer with a passion for building great products',
  industry: 'Technology',
  experience: '5+ years',
  picture_url: 'http://localhost:4000/uploads/profile.jpg',
};

// ============================================
// TEST SUITE
// ============================================

describe('Profile Routes - 90%+ Coverage', () => {
  let app;

  beforeAll(async () => {
    const profileModule = await import('../../routes/profile.js');
    
    app = express();
    app.use(express.json());
    app.use('/api', profileModule.default);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ========================================
  // POST /api/profile - Save or Update Profile
  // ========================================
  describe('POST /api/profile', () => {
    it('should create new profile when none exists', async () => {
      // First query: check existing
      mockQueryFn.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });
      // Second query: insert
      mockQueryFn.mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
      });

      const res = await request(app)
        .post('/api/profile')
        .set('Authorization', 'Bearer valid-token')
        .send({
          full_name: 'John Doe',
          email: 'john@example.com',
          phone: '+1-555-123-4567',
          location: 'San Francisco, CA',
          title: 'Software Engineer',
          bio: 'Experienced developer',
          industry: 'Technology',
          experience: '5+ years',
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Profile saved successfully');
    });

    it('should update existing profile', async () => {
      // First query: check existing (found)
      mockQueryFn.mockResolvedValueOnce({
        rows: [{ id: 1 }],
        rowCount: 1,
      });
      // Second query: update
      mockQueryFn.mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
      });

      const res = await request(app)
        .post('/api/profile')
        .set('Authorization', 'Bearer valid-token')
        .send({
          full_name: 'John Updated',
          email: 'john.updated@example.com',
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Profile saved successfully');
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .post('/api/profile')
        .set('Authorization', 'Bearer valid-token')
        .send({
          full_name: 'John Doe',
        });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Database error');
    });

    it('should return 401 without authorization', async () => {
      const res = await request(app)
        .post('/api/profile')
        .send({
          full_name: 'John Doe',
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Unauthorized');
    });

    it('should return 401 with invalid token', async () => {
      const res = await request(app)
        .post('/api/profile')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          full_name: 'John Doe',
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid token');
    });
  });

  // ========================================
  // GET /api/profile - Fetch Profile
  // ========================================
  describe('GET /api/profile', () => {
    it('should return user profile', async () => {
      mockQueryFn.mockResolvedValueOnce({
        rows: [mockProfile],
        rowCount: 1,
      });

      const res = await request(app)
        .get('/api/profile')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.profile).toEqual(mockProfile);
    });

    it('should return empty object when no profile exists', async () => {
      mockQueryFn.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      const res = await request(app)
        .get('/api/profile')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.profile).toEqual({});
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .get('/api/profile')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Database error');
    });

    it('should return 401 without authorization', async () => {
      const res = await request(app).get('/api/profile');

      expect(res.status).toBe(401);
    });
  });

  // ========================================
  // POST /api/profile/picture - Update Picture
  // ========================================
  describe('POST /api/profile/picture', () => {
    it('should update profile picture when profile exists', async () => {
      // First query: check existing (found)
      mockQueryFn.mockResolvedValueOnce({
        rows: [{ id: 1 }],
        rowCount: 1,
      });
      // Second query: update
      mockQueryFn.mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
      });

      const res = await request(app)
        .post('/api/profile/picture')
        .set('Authorization', 'Bearer valid-token')
        .send({
          url: '/uploads/new-profile.jpg',
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('✅ Profile picture saved successfully');
      expect(res.body.picture_url).toBe('http://localhost:4000/uploads/new-profile.jpg');
    });

    it('should create profile with picture when none exists', async () => {
      // First query: check existing (not found)
      mockQueryFn.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });
      // Second query: insert
      mockQueryFn.mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
      });

      const res = await request(app)
        .post('/api/profile/picture')
        .set('Authorization', 'Bearer valid-token')
        .send({
          url: '/uploads/profile.jpg',
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('✅ Profile picture saved successfully');
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .post('/api/profile/picture')
        .set('Authorization', 'Bearer valid-token')
        .send({
          url: '/uploads/profile.jpg',
        });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Database error while saving picture');
    });

    it('should return 401 without authorization', async () => {
      const res = await request(app)
        .post('/api/profile/picture')
        .send({
          url: '/uploads/profile.jpg',
        });

      expect(res.status).toBe(401);
    });
  });

  // ========================================
  // GET /api/profile/summary - Profile Summary
  // ========================================
  describe('GET /api/profile/summary', () => {
    it('should return complete profile summary with high score', async () => {
      // Employment count
      mockQueryFn.mockResolvedValueOnce({ rows: [{ c: 3 }] });
      // Skills count
      mockQueryFn.mockResolvedValueOnce({ rows: [{ c: 8 }] });
      // Education count
      mockQueryFn.mockResolvedValueOnce({ rows: [{ c: 2 }] });
      // Certifications count
      mockQueryFn.mockResolvedValueOnce({ rows: [{ c: 1 }] });
      // Projects count
      mockQueryFn.mockResolvedValueOnce({ rows: [{ c: 4 }] });
      // Profile info
      mockQueryFn.mockResolvedValueOnce({
        rows: [{
          has_name: true,
          has_email: true,
          has_phone: true,
          has_location: true,
          has_title: true,
          has_bio: true,
          has_picture: true,
        }],
      });

      const res = await request(app)
        .get('/api/profile/summary')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.info_complete).toBe(true);
      expect(res.body.completeness.score).toBe(100);
      expect(res.body.completeness.suggestions).toEqual([]);
    });

    it('should return incomplete profile summary with suggestions', async () => {
      // Employment count (0)
      mockQueryFn.mockResolvedValueOnce({ rows: [{ c: 0 }] });
      // Skills count (2 - less than 5)
      mockQueryFn.mockResolvedValueOnce({ rows: [{ c: 2 }] });
      // Education count (0)
      mockQueryFn.mockResolvedValueOnce({ rows: [{ c: 0 }] });
      // Certifications count (0)
      mockQueryFn.mockResolvedValueOnce({ rows: [{ c: 0 }] });
      // Projects count (0)
      mockQueryFn.mockResolvedValueOnce({ rows: [{ c: 0 }] });
      // Profile info (incomplete)
      mockQueryFn.mockResolvedValueOnce({
        rows: [{
          has_name: true,
          has_email: false, // Missing email
          has_phone: false, // Missing phone
          has_location: false, // Missing location
          has_title: false,
          has_bio: false,
          has_picture: false,
        }],
      });

      const res = await request(app)
        .get('/api/profile/summary')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.info_complete).toBe(false);
      expect(res.body.completeness.suggestions.length).toBeGreaterThan(0);
      expect(res.body.completeness.suggestions).toContain(
        'Complete your basic profile info (name, email, phone, location).'
      );
      expect(res.body.completeness.suggestions).toContain(
        'Add at least one employment entry.'
      );
    });

    it('should handle skills count between 0 and 5 (partial points)', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [{ c: 1 }] }); // Employment
      mockQueryFn.mockResolvedValueOnce({ rows: [{ c: 3 }] }); // Skills (between 0-5)
      mockQueryFn.mockResolvedValueOnce({ rows: [{ c: 1 }] }); // Education
      mockQueryFn.mockResolvedValueOnce({ rows: [{ c: 0 }] }); // Certs
      mockQueryFn.mockResolvedValueOnce({ rows: [{ c: 0 }] }); // Projects
      mockQueryFn.mockResolvedValueOnce({
        rows: [{
          has_name: true,
          has_email: true,
          has_phone: true,
          has_location: true,
          has_title: true,
          has_bio: true,
          has_picture: true,
        }],
      });

      const res = await request(app)
        .get('/api/profile/summary')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      // Should have partial points for skills (between 0-5)
      expect(res.body.completeness.score).toBeGreaterThan(0);
    });

    it('should handle empty profile info row', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [{ c: 0 }] });
      mockQueryFn.mockResolvedValueOnce({ rows: [{ c: 0 }] });
      mockQueryFn.mockResolvedValueOnce({ rows: [{ c: 0 }] });
      mockQueryFn.mockResolvedValueOnce({ rows: [{ c: 0 }] });
      mockQueryFn.mockResolvedValueOnce({ rows: [{ c: 0 }] });
      mockQueryFn.mockResolvedValueOnce({ rows: [] }); // No profile row

      const res = await request(app)
        .get('/api/profile/summary')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.info_complete).toBe(false);
    });

    it('should handle null count rows', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [{}] }); // No 'c' property
      mockQueryFn.mockResolvedValueOnce({ rows: [{}] });
      mockQueryFn.mockResolvedValueOnce({ rows: [{}] });
      mockQueryFn.mockResolvedValueOnce({ rows: [{}] });
      mockQueryFn.mockResolvedValueOnce({ rows: [{}] });
      mockQueryFn.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/api/profile/summary')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.employment_count).toBe(0);
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .get('/api/profile/summary')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Database error');
    });

    it('should return 401 without authorization', async () => {
      const res = await request(app).get('/api/profile/summary');

      expect(res.status).toBe(401);
    });
  });
});

