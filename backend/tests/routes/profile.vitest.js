/**
 * Profile Routes - Full Coverage Tests
 * File: backend/routes/profile.js
 */

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import profileRouter from '../../routes/profile.js';

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
    globalThis.__profileMockQueryFn = queryFn;
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

vi.mock('jsonwebtoken', () => ({
  default: {
    verify: vi.fn((token) => {
      if (token === 'valid-token') return { id: 1 };
      throw new Error('Invalid token');
    }),
  },
}));

// ============================================
// SETUP
// ============================================

let app;

beforeAll(() => {
  // Initialize mockQueryFn after mocks are set up
  mockQueryFn = globalThis.__profileMockQueryFn || vi.fn();
  
  process.env.JWT_SECRET = 'test-secret';
  
  app = express();
  app.use(express.json());
  app.use('/api', profileRouter);
});

beforeEach(() => {
  // Ensure mockQueryFn is available
  if (!mockQueryFn) {
    mockQueryFn = globalThis.__profileMockQueryFn || vi.fn();
  }
  vi.clearAllMocks();
  // Re-assign after clearing to ensure it's still available
  mockQueryFn = globalThis.__profileMockQueryFn || vi.fn();
});

// ============================================
// TESTS
// ============================================

describe('Profile Routes - Full Coverage', () => {
  describe('POST /api/profile', () => {
    it('should create new profile', async () => {
      mockQueryFn
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // Check existing
        .mockResolvedValueOnce({ rows: [{ id: 1, user_id: 1, full_name: 'John Doe' }], rowCount: 1 }); // Insert

      const res = await request(app)
        .post('/api/profile')
        .set('Authorization', 'Bearer valid-token')
        .send({
          full_name: 'John Doe',
          email: 'john@example.com',
          phone: '123-456-7890',
          location: 'New York, NY',
          title: 'Software Engineer',
          bio: 'Experienced developer',
          industry: 'Technology',
          experience: '5 years',
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Profile saved successfully');
    });

    it('should update existing profile', async () => {
      mockQueryFn
        .mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 }) // Check existing
        .mockResolvedValueOnce({ rows: [{ id: 1, full_name: 'Jane Doe' }], rowCount: 1 }); // Update

      const res = await request(app)
        .post('/api/profile')
        .set('Authorization', 'Bearer valid-token')
        .send({
          full_name: 'Jane Doe',
          email: 'jane@example.com',
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
  });

  describe('GET /api/profile', () => {
    it('should return profile data', async () => {
      const mockProfile = {
        full_name: 'John Doe',
        email: 'john@example.com',
        phone: '123-456-7890',
        location: 'New York, NY',
        title: 'Software Engineer',
        bio: 'Experienced developer',
        industry: 'Technology',
        experience: '5 years',
        picture_url: null,
      };

      mockQueryFn.mockResolvedValueOnce({ rows: [mockProfile], rowCount: 1 });

      const res = await request(app)
        .get('/api/profile')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.profile).toEqual(mockProfile);
    });

    it('should return empty object when no profile exists', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [], rowCount: 0 });

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
  });

  describe('POST /api/profile/picture', () => {
    it('should update profile picture for existing profile', async () => {
      mockQueryFn
        .mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 }) // Check existing
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // Update

      const res = await request(app)
        .post('/api/profile/picture')
        .set('Authorization', 'Bearer valid-token')
        .send({
          url: '/uploads/test.jpg',
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('✅ Profile picture saved successfully');
      expect(res.body.picture_url).toContain('/uploads/test.jpg');
    });

    it('should create profile with picture if not exists', async () => {
      mockQueryFn
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // Check existing
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // Insert

      const res = await request(app)
        .post('/api/profile/picture')
        .set('Authorization', 'Bearer valid-token')
        .send({
          url: '/uploads/test.jpg',
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
          url: '/uploads/test.jpg',
        });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Database error while saving picture');
    });
  });

  describe('GET /api/profile/summary', () => {
    it('should return profile summary', async () => {
      mockQueryFn
        .mockResolvedValueOnce({ rows: [{ c: 2 }], rowCount: 1 }) // Employment count
        .mockResolvedValueOnce({ rows: [{ c: 5 }], rowCount: 1 }) // Skills count
        .mockResolvedValueOnce({ rows: [{ c: 1 }], rowCount: 1 }) // Education count
        .mockResolvedValueOnce({ rows: [{ c: 2 }], rowCount: 1 }) // Certifications count
        .mockResolvedValueOnce({ rows: [{ c: 1 }], rowCount: 1 }) // Projects count
        .mockResolvedValueOnce({ // Profile info
          rows: [{
            has_name: true,
            has_email: true,
            has_phone: true,
            has_location: true,
            has_title: true,
            has_bio: true,
            has_picture: true,
          }],
          rowCount: 1,
        });

      const res = await request(app)
        .get('/api/profile/summary')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.employment_count).toBe(2);
      expect(res.body.skills_count).toBe(5);
      expect(res.body.completeness).toBeDefined();
      expect(res.body.completeness.score).toBeGreaterThan(0);
    });

    it('should return suggestions for incomplete profile', async () => {
      mockQueryFn
        .mockResolvedValueOnce({ rows: [{ c: 0 }], rowCount: 1 }) // Employment count
        .mockResolvedValueOnce({ rows: [{ c: 2 }], rowCount: 1 }) // Skills count
        .mockResolvedValueOnce({ rows: [{ c: 0 }], rowCount: 1 }) // Education count
        .mockResolvedValueOnce({ rows: [{ c: 0 }], rowCount: 1 }) // Certifications count
        .mockResolvedValueOnce({ rows: [{ c: 0 }], rowCount: 1 }) // Projects count
        .mockResolvedValueOnce({ // Profile info
          rows: [{
            has_name: false,
            has_email: false,
            has_phone: false,
            has_location: false,
            has_title: false,
            has_bio: false,
            has_picture: false,
          }],
          rowCount: 1,
        });

      const res = await request(app)
        .get('/api/profile/summary')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.completeness.suggestions.length).toBeGreaterThan(0);
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValueOnce(new Error('Database error'));

      const res = await request(app)
        .get('/api/profile/summary')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Database error');
    });
  });
});

