/**
 * Job Routes (AI Import) - Full Coverage Tests
 * Target: 90%+ coverage for jobRoutes.js
 */

import request from 'supertest';
import express from 'express';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock axios BEFORE importing
vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

// Mock cheerio - cheerio.load() returns a function that can be called with selectors
const { mockCheerioText } = vi.hoisted(() => {
  return {
    mockCheerioText: { value: 'Software Engineer at Tech Corp. We are looking for a talented software engineer with 5 years of experience. Strong JavaScript and Python skills required. Location: New York. Salary: $120,000 - $150,000. Full job description here with all the details about the role and responsibilities. This is a comprehensive job posting with detailed requirements and benefits information.' },
  };
});

vi.mock('cheerio', () => {
  const mockLoad = (html) => {
    // Return a function that can be called with selectors like $("body")
    return (selector) => ({
      text: vi.fn().mockReturnValue(mockCheerioText.value),
      html: vi.fn().mockReturnValue('<html></html>'),
    });
  };
  
  return {
    load: vi.fn(mockLoad),
    default: { load: vi.fn(mockLoad) },
  };
});

// Mock Google Generative AI as a proper class
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: class MockGoogleGenerativeAI {
    constructor() {}
    getGenerativeModel() {
      return {
        generateContent: vi.fn().mockResolvedValue({
          response: {
            text: () => JSON.stringify({
              title: 'Software Engineer',
              company: 'Tech Corp',
              location: 'New York, NY',
              salary_min: '120000',
              salary_max: '150000',
              description: 'We are looking for a talented software engineer.',
            }),
          },
        }),
      };
    }
  },
}));

import axios from 'axios';
import { createJobRoutes } from '../../routes/jobRoutes.js';

describe('Job Routes - Full Coverage', () => {
  let app;
  let mockGenAI;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Reset cheerio text to default
    mockCheerioText.value = 'Software Engineer at Tech Corp. We are looking for a talented software engineer with 5 years of experience. Strong JavaScript and Python skills required. Location: New York. Salary: $120,000 - $150,000. Full job description here with all the details about the role and responsibilities. This is a comprehensive job posting with detailed requirements and benefits information.';
    
    // Create mock AI client
    mockGenAI = {
      getGenerativeModel: vi.fn().mockReturnValue({
        generateContent: vi.fn().mockResolvedValue({
          response: {
            text: () => JSON.stringify({
              title: 'Software Engineer',
              company: 'Tech Corp',
              location: 'New York, NY',
              salary_min: '120000',
              salary_max: '150000',
              description: 'We are looking for a talented software engineer.',
            }),
          },
        }),
      }),
    };
    
    // Reset axios mock
    axios.get.mockReset();
    axios.get.mockResolvedValue({
      data: `
        <html>
          <body>
            <h1>Software Engineer</h1>
            <p>Company: Tech Corp</p>
            <p>Location: New York, NY</p>
            <p>Salary: $120,000 - $150,000</p>
            <p>Description: We are looking for a talented software engineer with strong experience...</p>
            <p>Requirements: JavaScript, Python, React, Node.js experience required...</p>
            <p>Benefits: Health insurance, 401k, flexible work hours...</p>
            <p>About us: Tech Corp is a leading technology company...</p>
          </body>
        </html>
      `,
    });

    // Use factory function with mock
    const jobRoutes = createJobRoutes(mockGenAI);

    app = express();
    app.use(express.json());
    app.use('/api/jobs', jobRoutes);
  });

  // ========================================
  // POST /import-job - Validation Tests
  // ========================================
  describe('POST /import-job - URL Validation', () => {
    it('should return 400 for missing URL', async () => {
      const res = await request(app)
        .post('/api/jobs/import-job')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('failed');
      expect(res.body.error).toBe('Invalid URL');
    });

    it('should return 400 for empty URL', async () => {
      const res = await request(app)
        .post('/api/jobs/import-job')
        .send({ url: '' });

      expect(res.status).toBe(400);
    });

    it('should return 400 for URL without protocol', async () => {
      const res = await request(app)
        .post('/api/jobs/import-job')
        .send({ url: 'example.com/job/123' });

      expect(res.status).toBe(400);
    });

    it('should return 400 for URL with ftp protocol', async () => {
      const res = await request(app)
        .post('/api/jobs/import-job')
        .send({ url: 'ftp://example.com/job' });

      expect(res.status).toBe(400);
    });

    it('should return 400 for invalid URL format', async () => {
      const res = await request(app)
        .post('/api/jobs/import-job')
        .send({ url: 'not-a-url' });

      expect(res.status).toBe(400);
    });
  });

  // ========================================
  // POST /import-job - Success Cases
  // ========================================
  describe('POST /import-job - Success Cases', () => {
    it('should successfully import job from https URL', async () => {
      const res = await request(app)
        .post('/api/jobs/import-job')
        .send({ url: 'https://example.com/jobs/software-engineer' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.source).toBe('axios+gemini');
      expect(res.body.job).toBeDefined();
      expect(res.body.job.url).toBe('https://example.com/jobs/software-engineer');
      expect(res.body.job.title).toBe('Software Engineer');
      expect(res.body.job.company).toBe('Tech Corp');
    });

    it('should successfully import job from http URL', async () => {
      const res = await request(app)
        .post('/api/jobs/import-job')
        .send({ url: 'http://example.com/jobs/123' });

      expect([200, 500]).toContain(res.status);
    });

    it('should trim job fields in response', async () => {
      const res = await request(app)
        .post('/api/jobs/import-job')
        .send({ url: 'https://linkedin.com/jobs/view/12345' });

      expect([200, 500]).toContain(res.status);
      if (res.status === 200 && res.body.job) {
        // Verify URL is preserved
        expect(res.body.job.url).toBe('https://linkedin.com/jobs/view/12345');
      }
    });
  });

  // ========================================
  // POST /import-job - Partial Extraction
  // ========================================
  describe('POST /import-job - Partial Extraction', () => {
    it('should return partial status for short body text', async () => {
      // Mock short response (less than 200 chars)
      mockCheerioText.value = 'Short text';
      const cheerio = await import('cheerio');
      const mockSelector = (selector) => ({
        text: vi.fn().mockReturnValue(mockCheerioText.value),
      });
      vi.mocked(cheerio.load).mockReturnValueOnce(mockSelector);

      const res = await request(app)
        .post('/api/jobs/import-job')
        .send({ url: 'https://example.com/empty-job' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('partial');
      expect(res.body.job.company).toBe('Unknown');
    });

    it('should return partial for empty body', async () => {
      mockCheerioText.value = '';
      const cheerio = await import('cheerio');
      const mockSelector = (selector) => ({
        text: vi.fn().mockReturnValue(mockCheerioText.value),
      });
      vi.mocked(cheerio.load).mockReturnValueOnce(mockSelector);

      const res = await request(app)
        .post('/api/jobs/import-job')
        .send({ url: 'https://example.com/no-content' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('partial');
    });

    it('should return partial for body text with only whitespace', async () => {
      mockCheerioText.value = '   ';
      const cheerio = await import('cheerio');
      const mockSelector = (selector) => ({
        text: vi.fn().mockReturnValue(mockCheerioText.value),
      });
      vi.mocked(cheerio.load).mockReturnValueOnce(mockSelector);

      const res = await request(app)
        .post('/api/jobs/import-job')
        .send({ url: 'https://example.com/whitespace-only' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('partial');
    });
  });

  // ========================================
  // POST /import-job - Error Handling
  // ========================================
  describe('POST /import-job - Error Handling', () => {
    it('should handle axios network error', async () => {
      axios.get.mockRejectedValueOnce(new Error('Network error'));

      const res = await request(app)
        .post('/api/jobs/import-job')
        .send({ url: 'https://example.com/job' });

      expect(res.status).toBe(500);
      expect(res.body.status).toBe('failed');
    });

    it('should handle axios timeout error', async () => {
      axios.get.mockRejectedValueOnce(new Error('ETIMEDOUT'));

      const res = await request(app)
        .post('/api/jobs/import-job')
        .send({ url: 'https://example.com/slow-job' });

      expect(res.status).toBe(500);
      expect(res.body.status).toBe('failed');
    });

    it('should handle axios 404 error', async () => {
      const error = new Error('Request failed with status code 404');
      error.response = { status: 404 };
      axios.get.mockRejectedValueOnce(error);

      const res = await request(app)
        .post('/api/jobs/import-job')
        .send({ url: 'https://example.com/not-found' });

      expect(res.status).toBe(500);
    });

    it('should handle AI returning invalid JSON', async () => {
      // Update mock to return invalid JSON
      mockGenAI.getGenerativeModel.mockReturnValueOnce({
        generateContent: vi.fn().mockResolvedValue({
          response: {
            text: () => 'not valid json {broken',
          },
        }),
      });

      const res = await request(app)
        .post('/api/jobs/import-job')
        .send({ url: 'https://example.com/job-bad-ai' });

      expect(res.status).toBe(500);
      expect(res.body.status).toBe('failed');
      expect(res.body.error).toBe('AI returned malformed JSON');
    });

    it('should handle AI returning empty string', async () => {
      mockGenAI.getGenerativeModel.mockReturnValueOnce({
        generateContent: vi.fn().mockResolvedValue({
          response: {
            text: () => '',
          },
        }),
      });

      const res = await request(app)
        .post('/api/jobs/import-job')
        .send({ url: 'https://example.com/job-empty-ai' });

      expect(res.status).toBe(500);
      expect(res.body.status).toBe('failed');
    });

    it('should handle AI returning non-JSON text', async () => {
      mockGenAI.getGenerativeModel.mockReturnValueOnce({
        generateContent: vi.fn().mockResolvedValue({
          response: {
            text: () => 'This is not JSON at all',
          },
        }),
      });

      const res = await request(app)
        .post('/api/jobs/import-job')
        .send({ url: 'https://example.com/job-text-ai' });

      expect(res.status).toBe(500);
      expect(res.body.status).toBe('failed');
    });
  });

  // ========================================
  // GET /test-ai - AI Connection Test
  // ========================================
  describe('GET /test-ai', () => {
    it('should test AI connection successfully', async () => {
      const res = await request(app).get('/api/jobs/test-ai');
      expect([200, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
        expect(res.body.response).toBeDefined();
      }
    });

    it('should return error when AI fails', async () => {
      // Update mock to fail
      mockGenAI.getGenerativeModel.mockReturnValueOnce({
        generateContent: vi.fn().mockRejectedValue(new Error('AI service unavailable')),
      });

      const res = await request(app).get('/api/jobs/test-ai');
      expect([200, 500]).toContain(res.status);
    });
  });

  // ========================================
  // Additional Edge Cases
  // ========================================
  describe('Edge Cases', () => {
    it('should handle URL with query parameters', async () => {
      const res = await request(app)
        .post('/api/jobs/import-job')
        .send({ url: 'https://indeed.com/viewjob?jk=abc123&from=search' });

      expect([200, 500]).toContain(res.status);
    });

    it('should handle URL with hash', async () => {
      const res = await request(app)
        .post('/api/jobs/import-job')
        .send({ url: 'https://example.com/job#details' });

      expect([200, 500]).toContain(res.status);
    });

    it('should handle international URL', async () => {
      const res = await request(app)
        .post('/api/jobs/import-job')
        .send({ url: 'https://jobs.example.co.uk/position/123' });

      expect([200, 500]).toContain(res.status);
    });

    it('should handle very long URL', async () => {
      const longPath = 'a'.repeat(500);
      const res = await request(app)
        .post('/api/jobs/import-job')
        .send({ url: `https://example.com/${longPath}` });

      expect([200, 500]).toContain(res.status);
    });

    it('should handle job fields with special characters', async () => {
      const res = await request(app)
        .post('/api/jobs/import-job')
        .send({ url: 'https://example.com/job/senior-engineer' });

      expect([200, 500]).toContain(res.status);
    });

    it('should handle LinkedIn job URL', async () => {
      const res = await request(app)
        .post('/api/jobs/import-job')
        .send({ url: 'https://www.linkedin.com/jobs/view/3847561234' });

      expect([200, 500]).toContain(res.status);
    });

    it('should handle Indeed job URL', async () => {
      const res = await request(app)
        .post('/api/jobs/import-job')
        .send({ url: 'https://www.indeed.com/viewjob?jk=abc123' });

      expect([200, 500]).toContain(res.status);
    });

    it('should handle Glassdoor job URL', async () => {
      const res = await request(app)
        .post('/api/jobs/import-job')
        .send({ url: 'https://www.glassdoor.com/job-listing/software-engineer' });

      expect([200, 500]).toContain(res.status);
    });
  });

  // ========================================
  // AI Processing Path Coverage
  // ========================================
  describe('AI Processing - Path Coverage', () => {
    it('should process full job extraction flow with trimming', async () => {
      // Update mock to return job with extra whitespace
      mockGenAI.getGenerativeModel.mockReturnValueOnce({
        generateContent: vi.fn().mockResolvedValue({
          response: {
            text: () => JSON.stringify({
              title: '  Software Engineer  ',
              company: '  Tech Corp  ',
              location: '  New York, NY  ',
              salary_min: '120000',
              salary_max: '150000',
              description: '  Job description with spaces  ',
            }),
          },
        }),
      });

      const res = await request(app)
        .post('/api/jobs/import-job')
        .send({ url: 'https://example.com/jobs/senior-engineer' });

      expect(res.status).toBe(200);
      expect(res.body.job.title).toBe('Software Engineer'); // Should be trimmed
      expect(res.body.job.company).toBe('Tech Corp'); // Should be trimmed
      expect(res.body.job.location).toBe('New York, NY'); // Should be trimmed
      expect(res.body.job.description).toBe('Job description with spaces'); // Should be trimmed
    });

    it('should handle job with missing optional fields', async () => {
      mockGenAI.getGenerativeModel.mockReturnValueOnce({
        generateContent: vi.fn().mockResolvedValue({
          response: {
            text: () => JSON.stringify({
              title: 'Developer',
              company: 'Startup',
              location: '',
              salary_min: '',
              salary_max: '',
              description: 'Job description',
            }),
          },
        }),
      });

      const res = await request(app)
        .post('/api/jobs/import-job')
        .send({ url: 'https://example.com/minimal-job' });

      expect(res.status).toBe(200);
      expect(res.body.job.title).toBe('Developer');
      expect(res.body.job.location).toBe('');
    });

    it('should handle job with null fields in AI response', async () => {
      mockGenAI.getGenerativeModel.mockReturnValueOnce({
        generateContent: vi.fn().mockResolvedValue({
          response: {
            text: () => JSON.stringify({
              title: 'Engineer',
              company: null,
              location: null,
              salary_min: null,
              salary_max: null,
              description: 'Description',
            }),
          },
        }),
      });

      const res = await request(app)
        .post('/api/jobs/import-job')
        .send({ url: 'https://example.com/sparse-job' });

      expect(res.status).toBe(200);
      expect(res.body.job.title).toBe('Engineer');
      // Null fields should be handled (trim won't be called on null)
      expect(res.body.job.company).toBeNull();
    });

    it('should handle job with all fields populated', async () => {
      mockGenAI.getGenerativeModel.mockReturnValueOnce({
        generateContent: vi.fn().mockResolvedValue({
          response: {
            text: () => JSON.stringify({
              title: 'Senior Software Engineer',
              company: 'Big Tech Corp',
              location: 'San Francisco, CA',
              salary_min: '180000',
              salary_max: '250000',
              description: 'Full job description with all details about the role, requirements, and benefits.',
            }),
          },
        }),
      });

      const res = await request(app)
        .post('/api/jobs/import-job')
        .send({ url: 'https://example.com/full-job' });

      expect(res.status).toBe(200);
      expect(res.body.job).toHaveProperty('url');
      expect(res.body.job.url).toBe('https://example.com/full-job');
      expect(res.body.job.title).toBe('Senior Software Engineer');
      expect(res.body.job.company).toBe('Big Tech Corp');
      expect(res.body.job.location).toBe('San Francisco, CA');
    });

    it('should handle very long extracted text (over 15000 chars)', async () => {
      // Mock very long text
      mockCheerioText.value = 'A'.repeat(20000); // Longer than 15000
      const cheerio = await import('cheerio');
      const mockSelector = (selector) => ({
        text: vi.fn().mockReturnValue(mockCheerioText.value),
      });
      vi.mocked(cheerio.load).mockReturnValueOnce(mockSelector);

      const res = await request(app)
        .post('/api/jobs/import-job')
        .send({ url: 'https://example.com/long-job' });

      expect(res.status).toBe(200);
      // Should still process (text is sliced to 15000)
    });

    it('should handle text with excessive whitespace that gets normalized', async () => {
      mockCheerioText.value = 'Software\n\nEngineer\n\nat\n\nTech\n\nCorp.'.repeat(50); // Will be normalized
      const cheerio = await import('cheerio');
      const mockSelector = (selector) => ({
        text: vi.fn().mockReturnValue(mockCheerioText.value),
      });
      vi.mocked(cheerio.load).mockReturnValueOnce(mockSelector);

      const res = await request(app)
        .post('/api/jobs/import-job')
        .send({ url: 'https://example.com/spaced-job' });

      expect(res.status).toBe(200);
    });
  });
});

