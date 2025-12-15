/**
 * Market Benchmarks Routes Tests
 * Tests routes/marketBenchmarks.js
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import marketBenchmarksRoutes from '../../routes/marketBenchmarks.js';
import { createTestUser } from '../helpers/auth.js';
import pool from '../../db/pool.js';

// Mock Google Generative AI - store in global to avoid hoisting issues
global.__mockGenerateContent = vi.fn();
global.__mockGetGenerativeModel = vi.fn(() => ({
  generateContent: global.__mockGenerateContent,
}));

vi.mock('@google/generative-ai', () => {
  // Create the mock instance that will be returned
  const mockInstance = {
    getGenerativeModel: function() {
      return global.__mockGetGenerativeModel();
    },
  };
  
  // Return constructor that returns the mock instance
  return {
    GoogleGenerativeAI: function() {
      return mockInstance;
    },
  };
});

// Mock dependencies
vi.mock('../../auth.js', () => ({
  auth: vi.fn((req, res, next) => {
    req.user = { id: 1 };
    next();
  }),
}));

vi.mock('../../db/pool.js', () => ({
  default: {
    query: vi.fn(),
  },
}));

describe('Market Benchmarks Routes', () => {
  let app;
  let user;
  let userId;

  beforeEach(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';
    process.env.GOOGLE_API_KEY = 'test-api-key-12345';
    
    // Reset mocks
    global.__mockGenerateContent = vi.fn();
    global.__mockGetGenerativeModel = vi.fn(() => ({
      generateContent: global.__mockGenerateContent,
    }));
    
    app = express();
    app.use(express.json());
    app.use('/api/market-benchmarks', marketBenchmarksRoutes);
    
    user = await createTestUser();
    
    const jwtModule = await import('jsonwebtoken');
    const decoded = jwtModule.verify(user.token, process.env.JWT_SECRET || 'test-secret-key');
    userId = Number(decoded.id);
    
    vi.clearAllMocks();
    
    const { auth } = await import('../../auth.js');
    vi.mocked(auth).mockImplementation((req, res, next) => {
      const h = req.headers.authorization || "";
      const token = h.startsWith("Bearer ") ? h.split(" ")[1] : null;
      if (!token) {
        return res.status(401).json({ error: "NO_TOKEN" });
      }
      try {
        const decoded = jwtModule.verify(token, process.env.JWT_SECRET || 'test-secret-key');
        req.user = { id: Number(decoded.id), email: decoded.email };
        next();
      } catch (err) {
        return res.status(401).json({ error: "INVALID_TOKEN" });
      }
    });

    // Setup default mock for Gemini
    global.__mockGenerateContent.mockResolvedValue({
      response: {
        text: () => JSON.stringify({
          percentile_10: 100000,
          percentile_25: 110000,
          percentile_50: 130000,
          percentile_75: 150000,
          percentile_90: 170000,
          total_comp_percentile_50: 150000,
          total_comp_percentile_75: 180000,
          total_comp_percentile_90: 200000,
          years_of_experience_min: 2,
          years_of_experience_max: 5,
          sample_size: 500,
          data_source: 'gemini_estimate',
          notes: 'Estimated based on market data',
        }),
      },
    });
  });

  describe('POST /api/market-benchmarks/fetch', () => {
    it('should fetch market benchmark data', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          role_title: 'Software Engineer',
          role_level: 'mid',
          location: 'San Francisco, CA',
          percentile_10: 100000,
          percentile_50: 130000,
          percentile_90: 170000,
        }],
      });

      const response = await request(app)
        .post('/api/market-benchmarks/fetch')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          role_title: 'Software Engineer',
          role_level: 'mid',
          location: 'San Francisco, CA',
          industry: 'Technology',
          company_size: 'large',
          location_type: 'on_site',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.benchmark).toBeDefined();
    });

    it('should return 400 if required fields are missing', async () => {
      const response = await request(app)
        .post('/api/market-benchmarks/fetch')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          role_title: 'Software Engineer',
          // Missing role_level and location
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Missing required fields');
    });

    it('should return 503 if API key is not configured', async () => {
      const originalKey = process.env.GOOGLE_API_KEY;
      delete process.env.GOOGLE_API_KEY;

      // Re-import the route to pick up the missing API key
      const { default: routes } = await import('../../routes/marketBenchmarks.js');
      const testApp = express();
      testApp.use(express.json());
      testApp.use('/api/market-benchmarks', routes);

      const response = await request(testApp)
        .post('/api/market-benchmarks/fetch')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          role_title: 'Software Engineer',
          role_level: 'mid',
          location: 'San Francisco, CA',
        });

      expect(response.status).toBe(503);
      expect(response.body.error).toContain('Google API key not configured');

      process.env.GOOGLE_API_KEY = originalKey;
    });

    it('should handle AI response parsing errors', async () => {
      global.__mockGenerateContent.mockResolvedValueOnce({
        response: {
          text: () => 'Invalid JSON response',
        },
      });

      pool.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          role_title: 'Software Engineer',
          role_level: 'mid',
          location: 'San Francisco, CA',
        }],
      });

      const response = await request(app)
        .post('/api/market-benchmarks/fetch')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          role_title: 'Software Engineer',
          role_level: 'mid',
          location: 'San Francisco, CA',
        });

      // Should handle the error gracefully
      expect([400, 500]).toContain(response.status);
    });

    it('should handle API key errors', async () => {
      global.__mockGenerateContent.mockRejectedValueOnce(new Error('API_KEY_INVALID'));

      const response = await request(app)
        .post('/api/market-benchmarks/fetch')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          role_title: 'Software Engineer',
          role_level: 'mid',
          location: 'San Francisco, CA',
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Google API key error');
    });
  });

  describe('POST /api/market-benchmarks/batch-fetch', () => {
    it('should batch fetch multiple benchmarks', async () => {
      pool.query.mockResolvedValue({
        rows: [{
          id: 1,
          role_title: 'Software Engineer',
          role_level: 'mid',
          location: 'San Francisco, CA',
        }],
      });

      const response = await request(app)
        .post('/api/market-benchmarks/batch-fetch')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          benchmarks: [
            {
              role_title: 'Software Engineer',
              role_level: 'mid',
              location: 'San Francisco, CA',
            },
            {
              role_title: 'Data Scientist',
              role_level: 'senior',
              location: 'New York, NY',
            },
          ],
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.total).toBe(2);
      expect(response.body.results).toBeDefined();
    });

    it('should return 400 if benchmarks is not an array', async () => {
      const response = await request(app)
        .post('/api/market-benchmarks/batch-fetch')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          benchmarks: 'not an array',
        });

      expect(response.status).toBe(400);
    });

    it('should return 400 if benchmarks array is empty', async () => {
      const response = await request(app)
        .post('/api/market-benchmarks/batch-fetch')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          benchmarks: [],
        });

      expect(response.status).toBe(400);
    });

    it('should return 400 if more than 10 benchmarks', async () => {
      const benchmarks = Array.from({ length: 11 }, (_, i) => ({
        role_title: `Engineer ${i}`,
        role_level: 'mid',
        location: 'San Francisco, CA',
      }));

      const response = await request(app)
        .post('/api/market-benchmarks/batch-fetch')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ benchmarks });

      expect(response.status).toBe(400);
    });

    it('should handle partial failures in batch fetch', async () => {
      pool.query
        .mockResolvedValueOnce({
          rows: [{ id: 1, role_title: 'Software Engineer', role_level: 'mid', location: 'San Francisco, CA' }],
        })
        .mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .post('/api/market-benchmarks/batch-fetch')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          benchmarks: [
            {
              role_title: 'Software Engineer',
              role_level: 'mid',
              location: 'San Francisco, CA',
            },
            {
              role_title: 'Data Scientist',
              role_level: 'senior',
              location: 'New York, NY',
            },
          ],
        });

      expect(response.status).toBe(200);
      expect(response.body.successful).toBeGreaterThan(0);
      expect(response.body.failed).toBeGreaterThan(0);
    });
  });

  describe('POST /api/market-benchmarks/auto-fetch-for-offer', () => {
    it('should auto-fetch benchmark for an offer', async () => {
      pool.query
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            user_id: userId,
            role_title: 'Software Engineer',
            role_level: 'mid',
            location: 'San Francisco, CA',
            industry: 'Technology',
            company_size: 'large',
            location_type: 'on_site',
          }],
        })
        .mockResolvedValueOnce({ rows: [] }) // No existing benchmark
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            role_title: 'Software Engineer',
            role_level: 'mid',
            location: 'San Francisco, CA',
            percentile_50: 130000,
          }],
        });

      const response = await request(app)
        .post('/api/market-benchmarks/auto-fetch-for-offer')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          offer_id: 1,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.benchmark).toBeDefined();
    });

    it('should return cached benchmark if exists', async () => {
      pool.query
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            user_id: userId,
            role_title: 'Software Engineer',
            role_level: 'mid',
            location: 'San Francisco, CA',
          }],
        })
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            role_title: 'Software Engineer',
            role_level: 'mid',
            location: 'San Francisco, CA',
            percentile_50: 130000,
          }],
        });

      const response = await request(app)
        .post('/api/market-benchmarks/auto-fetch-for-offer')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          offer_id: 1,
        });

      expect(response.status).toBe(200);
      expect(response.body.cached).toBe(true);
    });

    it('should return 404 if offer not found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/market-benchmarks/auto-fetch-for-offer')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          offer_id: 999,
        });

      expect(response.status).toBe(404);
    });

    it('should return 400 if offer_id is missing', async () => {
      const response = await request(app)
        .post('/api/market-benchmarks/auto-fetch-for-offer')
        .set('Authorization', `Bearer ${user.token}`)
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/market-benchmarks/test', () => {
    it('should test API key configuration', async () => {
      global.__mockGenerateContent.mockResolvedValueOnce({
        response: {
          text: () => 'API key is working',
        },
      });

      const response = await request(app)
        .get('/api/market-benchmarks/test')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('API key is working');
    });

    it('should return 503 if API key is not configured', async () => {
      const originalKey = process.env.GOOGLE_API_KEY;
      delete process.env.GOOGLE_API_KEY;

      // Re-import the route to pick up the missing API key
      const { default: routes } = await import('../../routes/marketBenchmarks.js');
      const testApp = express();
      testApp.use(express.json());
      testApp.use('/api/market-benchmarks', routes);

      const response = await request(testApp)
        .get('/api/market-benchmarks/test')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(503);
      expect(response.body.error).toContain('API key not configured');

      process.env.GOOGLE_API_KEY = originalKey;
    });

    it('should handle API key validation errors', async () => {
      global.__mockGenerateContent.mockRejectedValueOnce(new Error('API_KEY_INVALID'));

      const response = await request(app)
        .get('/api/market-benchmarks/test')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('API key invalid');
    });
  });
});

