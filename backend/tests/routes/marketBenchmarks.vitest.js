/**
 * Market Benchmarks Routes - Full Coverage Tests
 * File: backend/routes/marketBenchmarks.js
 */

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

// ============================================
// MOCKS
// ============================================

const mockQueryFn = vi.fn();
const mockGenerateContent = vi.fn();
const mockGetGenerativeModel = vi.fn(() => ({
  generateContent: mockGenerateContent,
}));
const mockGoogleGenerativeAI = vi.fn(() => ({
  getGenerativeModel: mockGetGenerativeModel,
}));

vi.mock('../../db/pool.js', () => ({
  default: {
    query: mockQueryFn,
    connect: vi.fn(),
    end: vi.fn(),
    on: vi.fn(),
  },
}));

vi.mock('../../auth.js', () => ({
  auth: vi.fn((req, res, next) => {
    req.user = { id: 1, email: 'test@example.com' };
    next();
  }),
}));

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: mockGoogleGenerativeAI,
}));

// ============================================
// MOCK DATA
// ============================================

const mockBenchmarkData = {
  percentile_10: 80000,
  percentile_25: 100000,
  percentile_50: 120000,
  percentile_75: 150000,
  percentile_90: 180000,
  total_comp_percentile_50: 140000,
  total_comp_percentile_75: 170000,
  total_comp_percentile_90: 200000,
  years_of_experience_min: 2,
  years_of_experience_max: 5,
  sample_size: 500,
  data_source: 'levels.fyi',
  notes: 'Based on 2024 market data',
};

const mockBenchmarkRecord = {
  id: 1,
  role_title: 'Software Engineer',
  role_level: 'mid',
  location: 'San Francisco, CA',
  percentile_50: 120000,
  created_at: new Date().toISOString(),
};

// ============================================
// SETUP
// ============================================

let app;
let marketBenchmarksRouter;

beforeAll(async () => {
  process.env.GOOGLE_API_KEY = 'test-google-api-key';
  
  marketBenchmarksRouter = (await import('../../routes/marketBenchmarks.js')).default;
  app = express();
  app.use(express.json());
  app.use('/api/market-benchmarks', marketBenchmarksRouter);
});

beforeEach(() => {
  vi.clearAllMocks();
  mockGetGenerativeModel.mockReturnValue({
    generateContent: mockGenerateContent,
  });
  mockGenerateContent.mockResolvedValue({
    response: {
      text: () => JSON.stringify(mockBenchmarkData),
    },
  });
  mockQueryFn.mockResolvedValue({
    rows: [mockBenchmarkRecord],
    rowCount: 1,
  });
});

// ============================================
// TESTS
// ============================================

describe('Market Benchmarks Routes - Full Coverage', () => {
  describe('POST /api/market-benchmarks/fetch', () => {
    it('should fetch and save benchmark successfully', async () => {
      const res = await request(app)
        .post('/api/market-benchmarks/fetch')
        .set('Authorization', 'Bearer valid-token')
        .send({
          role_title: 'Software Engineer',
          role_level: 'mid',
          location: 'San Francisco, CA',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.benchmark).toBeDefined();
      expect(mockGenerateContent).toHaveBeenCalled();
      expect(mockQueryFn).toHaveBeenCalled();
    });

    it('should handle optional fields', async () => {
      const res = await request(app)
        .post('/api/market-benchmarks/fetch')
        .set('Authorization', 'Bearer valid-token')
        .send({
          role_title: 'Software Engineer',
          role_level: 'senior',
          location: 'New York, NY',
          industry: 'Technology',
          company_size: 'large',
          location_type: 'remote',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 503 if Google API key not configured', async () => {
      delete process.env.GOOGLE_API_KEY;
      
      // Re-import to get fresh module without API key
      const freshModule = await import('../../routes/marketBenchmarks.js?t=' + Date.now());
      const freshRouter = freshModule.default;
      const freshApp = express();
      freshApp.use(express.json());
      freshApp.use('/api/market-benchmarks', freshRouter);

      const res = await request(freshApp)
        .post('/api/market-benchmarks/fetch')
        .set('Authorization', 'Bearer valid-token')
        .send({
          role_title: 'Software Engineer',
          role_level: 'mid',
          location: 'San Francisco, CA',
        });

      expect(res.status).toBe(503);
      expect(res.body.error).toBe('Google API key not configured');
      
      // Restore for other tests
      process.env.GOOGLE_API_KEY = 'test-google-api-key';
    });

    it('should return 400 if required fields missing', async () => {
      const res = await request(app)
        .post('/api/market-benchmarks/fetch')
        .set('Authorization', 'Bearer valid-token')
        .send({
          role_title: 'Software Engineer',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Missing required fields');
    });

    it('should handle JSON parsing errors', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => '```json\n' + JSON.stringify(mockBenchmarkData) + '\n```',
        },
      });

      const res = await request(app)
        .post('/api/market-benchmarks/fetch')
        .set('Authorization', 'Bearer valid-token')
        .send({
          role_title: 'Software Engineer',
          role_level: 'mid',
          location: 'San Francisco, CA',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 500 if AI returns incomplete data', async () => {
      const incompleteData = { percentile_10: 80000 };
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => JSON.stringify(incompleteData),
        },
      });

      const res = await request(app)
        .post('/api/market-benchmarks/fetch')
        .set('Authorization', 'Bearer valid-token')
        .send({
          role_title: 'Software Engineer',
          role_level: 'mid',
          location: 'San Francisco, CA',
        });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('AI returned incomplete data');
    });

    it('should handle API key errors', async () => {
      const apiError = new Error('API_KEY_INVALID');
      mockGenerateContent.mockRejectedValue(apiError);

      const res = await request(app)
        .post('/api/market-benchmarks/fetch')
        .set('Authorization', 'Bearer valid-token')
        .send({
          role_title: 'Software Engineer',
          role_level: 'mid',
          location: 'San Francisco, CA',
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Google API key error');
    });

    it('should return 500 on general errors', async () => {
      mockGenerateContent.mockRejectedValue(new Error('Network error'));

      const res = await request(app)
        .post('/api/market-benchmarks/fetch')
        .set('Authorization', 'Bearer valid-token')
        .send({
          role_title: 'Software Engineer',
          role_level: 'mid',
          location: 'San Francisco, CA',
        });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to fetch market benchmark data');
    });
  });

  describe('POST /api/market-benchmarks/batch-fetch', () => {
    it('should fetch multiple benchmarks successfully', async () => {
      const res = await request(app)
        .post('/api/market-benchmarks/batch-fetch')
        .set('Authorization', 'Bearer valid-token')
        .send({
          benchmarks: [
            {
              role_title: 'Software Engineer',
              role_level: 'mid',
              location: 'San Francisco, CA',
            },
            {
              role_title: 'Product Manager',
              role_level: 'senior',
              location: 'New York, NY',
            },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.results).toBeDefined();
    });

    it('should return 503 if Google API key not configured', async () => {
      delete process.env.GOOGLE_API_KEY;
      
      const freshModule = await import('../../routes/marketBenchmarks.js?t=' + Date.now());
      const freshRouter = freshModule.default;
      const freshApp = express();
      freshApp.use(express.json());
      freshApp.use('/api/market-benchmarks', freshRouter);

      const res = await request(freshApp)
        .post('/api/market-benchmarks/batch-fetch')
        .set('Authorization', 'Bearer valid-token')
        .send({
          benchmarks: [
            {
              role_title: 'Software Engineer',
              role_level: 'mid',
              location: 'San Francisco, CA',
            },
          ],
        });

      expect(res.status).toBe(503);
      
      process.env.GOOGLE_API_KEY = 'test-google-api-key';
    });

    it('should return 400 if benchmarks is not an array', async () => {
      const res = await request(app)
        .post('/api/market-benchmarks/batch-fetch')
        .set('Authorization', 'Bearer valid-token')
        .send({
          benchmarks: 'not-an-array',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('must be a non-empty array');
    });

    it('should return 400 if benchmarks array is empty', async () => {
      const res = await request(app)
        .post('/api/market-benchmarks/batch-fetch')
        .set('Authorization', 'Bearer valid-token')
        .send({
          benchmarks: [],
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('must be a non-empty array');
    });

    it('should return 400 if more than 10 benchmarks', async () => {
      const benchmarks = Array(11).fill({
        role_title: 'Software Engineer',
        role_level: 'mid',
        location: 'San Francisco, CA',
      });

      const res = await request(app)
        .post('/api/market-benchmarks/batch-fetch')
        .set('Authorization', 'Bearer valid-token')
        .send({ benchmarks });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Maximum 10 benchmarks');
    });

    it('should handle partial failures', async () => {
      mockGenerateContent
        .mockResolvedValueOnce({
          response: {
            text: () => JSON.stringify(mockBenchmarkData),
          },
        })
        .mockRejectedValueOnce(new Error('API error'));

      const res = await request(app)
        .post('/api/market-benchmarks/batch-fetch')
        .set('Authorization', 'Bearer valid-token')
        .send({
          benchmarks: [
            {
              role_title: 'Software Engineer',
              role_level: 'mid',
              location: 'San Francisco, CA',
            },
            {
              role_title: 'Product Manager',
              role_level: 'senior',
              location: 'New York, NY',
            },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.results.length).toBeGreaterThan(0);
      expect(res.body.errors.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/market-benchmarks', () => {
    it('should return benchmarks with filters', async () => {
      mockQueryFn.mockResolvedValue({
        rows: [mockBenchmarkRecord],
        rowCount: 1,
      });

      const res = await request(app)
        .get('/api/market-benchmarks')
        .set('Authorization', 'Bearer valid-token')
        .query({
          role_title: 'Software Engineer',
          role_level: 'mid',
          location: 'San Francisco, CA',
        });

      expect(res.status).toBe(200);
      expect(res.body.benchmarks).toBeDefined();
    });

    it('should return empty array when no benchmarks found', async () => {
      mockQueryFn.mockResolvedValue({
        rows: [],
        rowCount: 0,
      });

      const res = await request(app)
        .get('/api/market-benchmarks')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.benchmarks).toEqual([]);
    });

    it('should return 500 on database error', async () => {
      mockQueryFn.mockRejectedValue(new Error('Database error'));

      const res = await request(app)
        .get('/api/market-benchmarks')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to fetch market benchmarks');
    });
  });

  describe('POST /api/market-benchmarks/auto-fetch-for-offer', () => {
    it('should auto-fetch benchmark for offer', async () => {
      const mockOffer = {
        role_title: 'Software Engineer',
        role_level: 'mid',
        location: 'San Francisco, CA',
        industry: 'Technology',
        company_size: 'large',
        location_type: 'remote',
      };

      mockQueryFn
        .mockResolvedValueOnce({ rows: [mockOffer], rowCount: 1 }) // Get offer
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // Check existing benchmark
        .mockResolvedValueOnce({ rows: [mockBenchmarkRecord], rowCount: 1 }); // Insert benchmark

      const res = await request(app)
        .post('/api/market-benchmarks/auto-fetch-for-offer')
        .set('Authorization', 'Bearer valid-token')
        .send({ offer_id: 1 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.benchmark).toBeDefined();
    });

    it('should return cached benchmark if exists', async () => {
      const mockOffer = {
        role_title: 'Software Engineer',
        role_level: 'mid',
        location: 'San Francisco, CA',
      };

      mockQueryFn
        .mockResolvedValueOnce({ rows: [mockOffer], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [mockBenchmarkRecord], rowCount: 1 });

      const res = await request(app)
        .post('/api/market-benchmarks/auto-fetch-for-offer')
        .set('Authorization', 'Bearer valid-token')
        .send({ offer_id: 1 });

      expect(res.status).toBe(200);
      expect(res.body.cached).toBe(true);
    });

    it('should return 400 if offer_id missing', async () => {
      const res = await request(app)
        .post('/api/market-benchmarks/auto-fetch-for-offer')
        .set('Authorization', 'Bearer valid-token')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('offer_id is required');
    });

    it('should return 404 if offer not found', async () => {
      mockQueryFn.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = await request(app)
        .post('/api/market-benchmarks/auto-fetch-for-offer')
        .set('Authorization', 'Bearer valid-token')
        .send({ offer_id: 999 });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Offer not found');
    });

    it('should return 503 if Google API key not configured', async () => {
      delete process.env.GOOGLE_API_KEY;
      
      const freshModule = await import('../../routes/marketBenchmarks.js?t=' + Date.now());
      const freshRouter = freshModule.default;
      const freshApp = express();
      freshApp.use(express.json());
      freshApp.use('/api/market-benchmarks', freshRouter);

      mockQueryFn.mockResolvedValueOnce({ rows: [{ role_title: 'Engineer' }], rowCount: 1 });

      const res = await request(freshApp)
        .post('/api/market-benchmarks/auto-fetch-for-offer')
        .set('Authorization', 'Bearer valid-token')
        .send({ offer_id: 1 });

      expect(res.status).toBe(503);
      
      process.env.GOOGLE_API_KEY = 'test-google-api-key';
    });
  });

  describe('GET /api/market-benchmarks/test', () => {
    it('should test API key successfully', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => 'API key is working',
        },
      });

      const res = await request(app)
        .get('/api/market-benchmarks/test')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('API key is working');
    });

    it('should return 503 if API key not configured', async () => {
      delete process.env.GOOGLE_API_KEY;
      
      const freshModule = await import('../../routes/marketBenchmarks.js?t=' + Date.now());
      const freshRouter = freshModule.default;
      const freshApp = express();
      freshApp.use(express.json());
      freshApp.use('/api/market-benchmarks', freshRouter);

      const res = await request(freshApp)
        .get('/api/market-benchmarks/test')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(503);
      expect(res.body.error).toBe('API key not configured');
      
      process.env.GOOGLE_API_KEY = 'test-google-api-key';
    });

    it('should return 401 if API key invalid', async () => {
      const apiError = new Error('API_KEY_INVALID');
      mockGenerateContent.mockRejectedValue(apiError);

      const res = await request(app)
        .get('/api/market-benchmarks/test')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('API key invalid or expired');
    });

    it('should return 500 on general errors', async () => {
      mockGenerateContent.mockRejectedValue(new Error('Network error'));

      const res = await request(app)
        .get('/api/market-benchmarks/test')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('API test failed');
    });
  });
});

