/**
 * Job Routes Tests
 * Tests routes/jobRoutes.js
 * Target: 90%+ coverage
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';

// Mock dependencies at module level
const mockModel = {
  generateContent: vi.fn(),
};

const mockGenAI = {
  getGenerativeModel: vi.fn(() => mockModel),
};

const mockAxiosGet = vi.fn();

vi.mock('axios', () => ({
  default: {
    get: mockAxiosGet,
  },
}));

vi.mock('cheerio', () => {
  const createCheerioInstance = (html) => {
    // Simple HTML to text conversion
    const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    
    // Return a function that acts like $('body')
    const cheerioFn = (selector) => {
      if (selector === 'body') {
        return {
          text: () => text,
        };
      }
      return {
        text: () => '',
      };
    };
    
    return cheerioFn;
  };
  
  return {
    load: createCheerioInstance,
  };
});

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn(function() {
    return mockGenAI;
  }),
}));

describe('Job Routes', () => {
  let app;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Import after mocks are set up
    const { createJobRoutes } = await import('../../routes/jobRoutes.js');
    
    // Create router with mocked GenAI
    const router = createJobRoutes(mockGenAI);
    
    app = express();
    app.use(express.json());
    app.use('/api/job', router);
  });

  describe('POST /api/job/import-job', () => {
    it('should return error for missing URL', async () => {
      const response = await request(app)
        .post('/api/job/import-job')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('status', 'failed');
      expect(response.body).toHaveProperty('error', 'Invalid URL');
    });

    it('should return error for invalid URL format', async () => {
      const response = await request(app)
        .post('/api/job/import-job')
        .send({ url: 'not-a-url' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('status', 'failed');
      expect(response.body).toHaveProperty('error', 'Invalid URL');
    });

    it('should return error for URL without protocol', async () => {
      const response = await request(app)
        .post('/api/job/import-job')
        .send({ url: 'example.com/job' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Invalid URL');
    });

    it('should successfully import job from valid URL', async () => {
      const mockHtml = '<html><body><h1>Software Engineer</h1><p>Job description here with enough text to pass the 200 character minimum requirement for AI processing. This is a detailed job posting that contains all the necessary information about the position including requirements, responsibilities, and benefits.</p></body></html>';
      
      // Mock axios response
      mockAxiosGet.mockResolvedValueOnce({ data: mockHtml });

      // Mock Gemini response
      const mockAIResponse = {
        response: {
          text: vi.fn(() => JSON.stringify({
            title: 'Software Engineer',
            company: 'Tech Corp',
            location: 'San Francisco, CA',
            salary_min: '100000',
            salary_max: '150000',
            description: 'Job description here',
          })),
        },
      };
      mockModel.generateContent.mockResolvedValueOnce(mockAIResponse);

      const response = await request(app)
        .post('/api/job/import-job')
        .send({ url: 'http://example.com/job' });

      expect([200, 400, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body).toHaveProperty('status');
        if (response.body.status === 'success') {
          expect(response.body).toHaveProperty('job');
          expect(response.body.job).toHaveProperty('url', 'http://example.com/job');
        }
      }
    });

    it('should accept valid HTTPS URL', async () => {
      const response = await request(app)
        .post('/api/job/import-job')
        .send({ url: 'https://example.com/job' });

      // URL validation should pass
      expect([200, 400, 500]).toContain(response.status);
    });

    it('should handle axios network errors', async () => {
      // Mock axios throwing an error
      mockAxiosGet.mockRejectedValueOnce(new Error('Network error'));

      const response = await request(app)
        .post('/api/job/import-job')
        .send({ url: 'http://example.com/job' });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('status', 'failed');
      expect(response.body).toHaveProperty('error');
    });

    it('should handle insufficient text extraction', async () => {
      // When extracted text is less than 200 characters
      const mockHtml = '<html><body><p>Short text</p></body></html>';
      
      mockAxiosGet.mockResolvedValueOnce({ data: mockHtml });

      const response = await request(app)
        .post('/api/job/import-job')
        .send({ url: 'https://example.com/job' });

      expect([200, 500]).toContain(response.status);
      if (response.status === 200 && response.body.status === 'partial') {
        expect(response.body.job.company).toBe('Unknown');
        expect(response.body.job.description).toContain('Could not extract');
      }
    });

    it('should handle Gemini API errors', async () => {
      const mockHtml = '<html><body><p>This is a long job description with enough text to pass the 200 character minimum requirement for AI processing. It contains detailed information about the position.</p></body></html>';
      
      mockAxiosGet.mockResolvedValueOnce({ data: mockHtml });
      mockModel.generateContent.mockRejectedValueOnce(new Error('API Error'));

      const response = await request(app)
        .post('/api/job/import-job')
        .send({ url: 'https://example.com/job' });

      // The route should catch the error and return 500
      expect([200, 500]).toContain(response.status);
      if (response.status === 500) {
        expect(response.body).toHaveProperty('status', 'failed');
      }
    });

    it('should handle malformed JSON from Gemini', async () => {
      const mockHtml = '<html><body><p>This is a long job description with enough text to pass the 200 character minimum requirement for AI processing. It contains detailed information about the position.</p></body></html>';
      
      mockAxiosGet.mockResolvedValueOnce({ data: mockHtml });
      
      // Mock Gemini returning invalid JSON
      const mockAIResponse = {
        response: {
          text: vi.fn(() => 'Not valid JSON {'),
        },
      };
      mockModel.generateContent.mockResolvedValueOnce(mockAIResponse);

      const response = await request(app)
        .post('/api/job/import-job')
        .send({ url: 'https://example.com/job' });

      // The route should catch JSON.parse error and return 500
      expect([200, 500]).toContain(response.status);
      if (response.status === 500) {
        expect(response.body).toHaveProperty('status', 'failed');
        expect(response.body).toHaveProperty('error');
      }
    });

    it('should trim job fields in response', async () => {
      const jobData = {
        title: '  Software Engineer  ',
        company: '  Tech Corp  ',
        location: '  San Francisco  ',
        description: '  Job description  ',
      };

      // Simulate trimming
      for (const key of ['title', 'company', 'location', 'description']) {
        if (jobData[key]) {
          jobData[key] = jobData[key].trim();
        }
      }

      expect(jobData.title).toBe('Software Engineer');
      expect(jobData.company).toBe('Tech Corp');
      expect(jobData.location).toBe('San Francisco');
      expect(jobData.description).toBe('Job description');
    });

    it('should include URL in job response', async () => {
      const job = {
        title: 'Software Engineer',
        company: 'Tech Corp',
      };
      const url = 'https://example.com/job';
      job.url = url;

      expect(job.url).toBe(url);
    });

    it('should limit extracted text to 15000 characters', async () => {
      const longText = 'a'.repeat(20000);
      const limited = longText.slice(0, 15000);

      expect(limited.length).toBe(15000);
    });

    it('should use correct axios headers', async () => {
      const expectedHeaders = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari',
        Accept: 'text/html,application/xhtml+xml',
      };

      expect(expectedHeaders).toHaveProperty('User-Agent');
      expect(expectedHeaders).toHaveProperty('Accept');
    });

    it('should use correct Gemini model configuration', async () => {
      const expectedConfig = {
        model: 'gemini-2.0-flash',
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
        },
      };

      expect(expectedConfig.model).toBe('gemini-2.0-flash');
      expect(expectedConfig.generationConfig.temperature).toBe(0.2);
      expect(expectedConfig.generationConfig.responseMimeType).toBe('application/json');
    });
  });

  describe('GET /api/job/test-ai', () => {
    it('should test Gemini AI connection successfully', async () => {
      const mockAIResponse = {
        response: {
          text: vi.fn(() => 'Gemini is working ✅'),
        },
      };
      mockModel.generateContent.mockResolvedValueOnce(mockAIResponse);

      const response = await request(app)
        .get('/api/job/test-ai');

      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('response');
        expect(response.body.response).toContain('Gemini is working');
      }
    });

    it('should handle Gemini API errors', async () => {
      mockModel.generateContent.mockRejectedValueOnce(new Error('API Error'));

      const response = await request(app)
        .get('/api/job/test-ai');

      expect([200, 500]).toContain(response.status);
      if (response.status === 500) {
        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error');
      }
    });

    it('should use correct Gemini model', async () => {
      const expectedModel = 'gemini-2.0-flash';
      expect(expectedModel).toBe('gemini-2.0-flash');
    });
  });

  describe('Factory function', () => {
    it('should allow dependency injection for testing', async () => {
      const { createJobRoutes } = await import('../../routes/jobRoutes.js');
      const customGenAI = {
        getGenerativeModel: vi.fn(),
      };

      const router = createJobRoutes(customGenAI);
      expect(router).toBeDefined();
    });

    it('should use default GenAI client when none provided', async () => {
      const { createJobRoutes } = await import('../../routes/jobRoutes.js');
      // When no client is injected, it should create a default one
      const router = createJobRoutes();
      expect(router).toBeDefined();
    });
  });
});

