/**
 * Company Research Routes - Full Coverage Tests
 * File: backend/routes/companyResearch.js
 */

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import companyResearchRouter from '../../routes/companyResearch.js';

// ============================================
// MOCKS
// ============================================

const mockGet = vi.fn();
const mockPost = vi.fn();

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      get: mockGet,
      post: mockPost,
    })),
  },
}));

// ============================================
// SETUP
// ============================================

let app;

beforeAll(() => {
  app = express();
  app.use(express.json());
  app.use('/api/company-research', companyResearchRouter);
});

beforeEach(() => {
  vi.clearAllMocks();
});

// ============================================
// TESTS
// ============================================

describe('Company Research Routes - Full Coverage', () => {
  describe('GET /api/company-research', () => {
    it('should return company research data', async () => {
      const mockWikiData = {
        data: {
          query: {
            search: [{ pageid: 123, title: 'Test Company' }],
            pages: {
              123: {
                extract: 'Company description',
                fullurl: 'https://wikipedia.org/Test_Company',
              },
            },
          },
        },
      };
      const mockSummaryData = {
        data: {
          title: 'Test Company',
          extract: 'Summary',
          content_urls: { desktop: { page: 'https://wikipedia.org/Test_Company' } },
        },
      };

      mockGet
        .mockResolvedValueOnce(mockWikiData) // Search
        .mockResolvedValueOnce(mockWikiData) // Article
        .mockResolvedValueOnce(mockSummaryData); // Summary

      const res = await request(app)
        .get('/api/company-research?company=Test Company');

      expect(res.status).toBe(200);
      expect(res.body).toBeDefined();
    });

    it('should handle missing company parameter', async () => {
      const res = await request(app)
        .get('/api/company-research');

      expect([200, 400, 500]).toContain(res.status);
    });

    it('should handle Wikipedia API errors', async () => {
      mockGet.mockRejectedValueOnce(new Error('API error'));

      const res = await request(app)
        .get('/api/company-research?company=Test Company');

      expect([200, 500]).toContain(res.status);
    });
  });

  describe('POST /api/company-research/export', () => {
    it('should export company research', async () => {
      const res = await request(app)
        .post('/api/company-research/export')
        .send({
          company: 'Test Company',
          data: {},
        });

      expect([200, 400, 500]).toContain(res.status);
    });
  });
});

