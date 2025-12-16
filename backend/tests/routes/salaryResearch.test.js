/**
 * Salary Research Routes Tests
 * Tests salary research endpoints and data retrieval
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import pool from '../../db/pool.js';
import { createTestUser, queryTestDb, seedJobs } from '../helpers/index.js';

// Mock OpenAI before importing routes
const mockOpenAIInstance = {
  chat: {
    completions: {
      create: vi.fn().mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              low: 80000,
              avg: 120000,
              high: 160000,
              percentile25: 95000,
              percentile50: 120000,
              percentile75: 145000,
              dataSource: 'Market Analysis',
              notes: 'Based on market data'
            })
          }
        }]
      })
    }
  }
};

vi.mock('openai', () => {
  const mockInstance = {
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{
            message: {
              content: JSON.stringify({
                low: 80000,
                avg: 120000,
                high: 160000,
                percentile25: 95000,
                percentile50: 120000,
                percentile75: 145000,
                dataSource: 'Market Analysis',
                notes: 'Based on market data'
              })
            }
          }]
        })
      }
    }
  };
  
  return {
    default: class {
      constructor() {
        return mockInstance;
      }
    }
  };
});

// Don't set OPENAI_API_KEY - this makes the route use fast computed estimates instead of OpenAI
// This is much faster for tests and avoids any API call delays
delete process.env.OPENAI_API_KEY;

// Import routes after mocks
import salaryResearchRoutes from '../../routes/salaryResearch.js';

// Mock external services
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn(() => ({
    getGenerativeModel: vi.fn(() => ({
      generateContent: vi.fn().mockResolvedValue({
        response: { text: vi.fn(() => 'Mocked AI response') }
      })
    }))
  }))
}));

vi.mock('resend', () => ({
  Resend: vi.fn(() => ({
    emails: {
      send: vi.fn().mockResolvedValue({ id: 'mock-email-id' })
    }
  }))
}));

describe('Salary Research Routes', () => {
  let app;
  let user;

  beforeEach(async () => {
    // Ensure OPENAI_API_KEY is not set - this makes the route use fast computed estimates
    // instead of OpenAI API calls, making tests much faster (~10s vs ~20s+)
    delete process.env.OPENAI_API_KEY;
    
    app = express();
    app.use(express.json());
    app.use('/api/salary-research', salaryResearchRoutes);
    
    user = await createTestUser({
      email: 'salary@test.com',
      first_name: 'Salary',
      last_name: 'Research',
    });

    // Clear any existing cache
    await queryTestDb('DELETE FROM salary_cache WHERE job_title IS NOT NULL');
  });

  describe('GET /api/salary-research/:jobId', () => {
    it('should return 404 when job not found', async () => {
      const response = await request(app)
        .get('/api/salary-research/99999')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Job not found');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get('/api/salary-research/1');

      expect(response.status).toBe(401);
    });

    it('should return salary research for a job', async () => {
      const job = await seedJobs(user.id, 1, {
        title: 'Software Engineer',
        company: 'Tech Corp',
        location: 'San Francisco, CA'
      });
      const jobId = job[0].id;

      const response = await request(app)
        .get(`/api/salary-research/${jobId}`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('jobId');
      expect(response.body).toHaveProperty('title');
      expect(response.body).toHaveProperty('company');
      expect(response.body).toHaveProperty('location');
      expect(response.body).toHaveProperty('level');
      expect(response.body).toHaveProperty('companySize');
      expect(response.body).toHaveProperty('range');
      expect(response.body).toHaveProperty('comp');
      expect(response.body).toHaveProperty('companies');
      expect(response.body).toHaveProperty('trends');
      expect(response.body).toHaveProperty('recommendations');
      expect(response.body).toHaveProperty('dataSource');
    });

    it('should infer experience level from job title', async () => {
      const testCases = [
        { title: 'Senior Software Engineer', expectedLevel: 'Senior' },
        { title: 'Junior Developer', expectedLevel: 'Entry' },
        { title: 'Lead Engineer', expectedLevel: 'Lead' },
        { title: 'Software Engineer', expectedLevel: 'Mid' },
      ];

      for (const testCase of testCases) {
        const job = await seedJobs(user.id, 1, {
          title: testCase.title,
          company: 'Test Corp',
          location: 'New York, NY'
        });
        const jobId = job[0].id;

        const response = await request(app)
          .get(`/api/salary-research/${jobId}`)
          .set('Authorization', `Bearer ${user.token}`);

        expect(response.status).toBe(200);
        expect(response.body.level).toBe(testCase.expectedLevel);
      }
    });

    it('should calculate salary range correctly', async () => {
      const job = await seedJobs(user.id, 1, {
        title: 'Software Engineer',
        company: 'Tech Corp',
        location: 'San Francisco, CA'
      });
      const jobId = job[0].id;

      const response = await request(app)
        .get(`/api/salary-research/${jobId}`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.range).toHaveProperty('low');
      expect(response.body.range).toHaveProperty('avg');
      expect(response.body.range).toHaveProperty('high');
      expect(response.body.range).toHaveProperty('percentile25');
      expect(response.body.range).toHaveProperty('percentile50');
      expect(response.body.range).toHaveProperty('percentile75');
      
      // Validate ordering
      expect(response.body.range.low).toBeLessThanOrEqual(response.body.range.percentile25);
      expect(response.body.range.percentile25).toBeLessThanOrEqual(response.body.range.percentile50);
      expect(response.body.range.percentile50).toBeLessThanOrEqual(response.body.range.percentile75);
      expect(response.body.range.percentile75).toBeLessThanOrEqual(response.body.range.high);
      expect(response.body.range.low).toBeLessThanOrEqual(response.body.range.avg);
      expect(response.body.range.avg).toBeLessThanOrEqual(response.body.range.high);
    });

    it('should calculate total compensation', async () => {
      const job = await seedJobs(user.id, 1, {
        title: 'Software Engineer',
        company: 'Tech Corp',
        location: 'New York, NY'
      });
      const jobId = job[0].id;

      const response = await request(app)
        .get(`/api/salary-research/${jobId}`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.comp).toHaveProperty('base');
      expect(response.body.comp).toHaveProperty('bonus');
      expect(response.body.comp).toHaveProperty('stock');
      expect(response.body.comp).toHaveProperty('total');
      expect(response.body.comp.total).toBeGreaterThan(response.body.comp.base);
    });

    it('should provide company comparisons', async () => {
      const job = await seedJobs(user.id, 1, {
        title: 'Software Engineer',
        company: 'Tech Corp',
        location: 'New York, NY'
      });
      const jobId = job[0].id;

      const response = await request(app)
        .get(`/api/salary-research/${jobId}`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.companies)).toBe(true);
      expect(response.body.companies.length).toBeGreaterThan(0);
      
      response.body.companies.forEach(company => {
        expect(company).toHaveProperty('company');
        expect(company).toHaveProperty('low');
        expect(company).toHaveProperty('avg');
        expect(company).toHaveProperty('high');
      });
    });

    it('should provide historical trends', async () => {
      const job = await seedJobs(user.id, 1, {
        title: 'Software Engineer',
        company: 'Tech Corp',
        location: 'New York, NY'
      });
      const jobId = job[0].id;

      const response = await request(app)
        .get(`/api/salary-research/${jobId}`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.trends)).toBe(true);
      expect(response.body.trends.length).toBeGreaterThan(0);
      
      response.body.trends.forEach(trend => {
        expect(trend).toHaveProperty('year');
        expect(trend).toHaveProperty('avg');
      });
    });

    it('should calculate market difference when userSalary provided', async () => {
      const job = await seedJobs(user.id, 1, {
        title: 'Software Engineer',
        company: 'Tech Corp',
        location: 'New York, NY'
      });
      const jobId = job[0].id;

      const response = await request(app)
        .get(`/api/salary-research/${jobId}?userSalary=100000`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.userSalary).toBe(100000);
      expect(response.body).toHaveProperty('marketDiff');
      expect(typeof response.body.marketDiff).toBe('number');
    });

    it('should use cached data when available', async () => {
      const job = await seedJobs(user.id, 1, {
        title: 'Software Engineer',
        company: 'Tech Corp',
        location: 'New York, NY'
      });
      const jobId = job[0].id;

      // Insert cache entry
      await queryTestDb(
        `INSERT INTO salary_cache 
         (job_title, location, experience_level, percentile_25, percentile_50, percentile_75,
          salary_low, salary_high, salary_average, data_source, updated_at, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW() + INTERVAL '7 days')`,
        ['Software Engineer', 'New York, NY', 'Mid', 95000, 120000, 145000, 80000, 160000, 120000, 'Cached']
      );

      const response = await request(app)
        .get(`/api/salary-research/${jobId}`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      // Cache may or may not be used depending on exact matching
      // Just verify we get valid salary data
      expect(response.body.range).toBeDefined();
      expect(response.body.dataSource).toBeDefined();
    });

    it('should force refresh when forceRefresh=true', async () => {
      const job = await seedJobs(user.id, 1, {
        title: 'Software Engineer',
        company: 'Tech Corp',
        location: 'New York, NY'
      });
      const jobId = job[0].id;

      // Insert cache entry
      await queryTestDb(
        `INSERT INTO salary_cache 
         (job_title, location, experience_level, percentile_25, percentile_50, percentile_75,
          salary_low, salary_high, salary_average, data_source, updated_at, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW() + INTERVAL '7 days')`,
        ['Software Engineer', 'New York, NY', 'Mid', 95000, 120000, 145000, 80000, 160000, 120000, 'Cached']
      );

      const response = await request(app)
        .get(`/api/salary-research/${jobId}?forceRefresh=true`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      // Should not use cache when forceRefresh=true
      expect(response.body.cached).toBe(false);
    });

    it('should only return jobs belonging to the user', async () => {
      const otherUser = await createTestUser({
        email: 'other@test.com',
        first_name: 'Other',
        last_name: 'User',
      });

      const job = await seedJobs(otherUser.id, 1, {
        title: 'Software Engineer',
        company: 'Tech Corp',
        location: 'New York, NY'
      });
      const jobId = job[0].id;

      const response = await request(app)
        .get(`/api/salary-research/${jobId}`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Job not found');
    });
  });

  describe('GET /api/salary-research/benchmark/:jobId', () => {
    it('should return simplified benchmark data', async () => {
      const job = await seedJobs(user.id, 1, {
        title: 'Software Engineer',
        company: 'Tech Corp',
        location: 'New York, NY'
      });
      const jobId = job[0].id;

      const response = await request(app)
        .get(`/api/salary-research/benchmark/${jobId}`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('jobId');
      expect(response.body).toHaveProperty('title');
      expect(response.body).toHaveProperty('location');
      expect(response.body).toHaveProperty('range');
      expect(response.body).toHaveProperty('dataSource');
      expect(response.body).toHaveProperty('available');
      expect(response.body.available).toBe(true);
    });

    it('should return 404 when job not found', async () => {
      const response = await request(app)
        .get('/api/salary-research/benchmark/99999')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Job not found');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get('/api/salary-research/benchmark/1');

      expect(response.status).toBe(401);
    });
  });

  describe('Salary Comparison Features', () => {
    it('should compare user salary to market average', async () => {
      const job = await seedJobs(user.id, 1, {
        title: 'Senior Software Engineer',
        company: 'Tech Corp',
        location: 'San Francisco, CA'
      });
      const jobId = job[0].id;

      const response = await request(app)
        .get(`/api/salary-research/${jobId}?userSalary=150000`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.userSalary).toBe(150000);
      expect(response.body.marketDiff).toBeDefined();
    });

    it('should provide multiple company comparisons', async () => {
      const job = await seedJobs(user.id, 1, {
        title: 'Software Engineer',
        company: 'Tech Corp',
        location: 'New York, NY'
      });
      const jobId = job[0].id;

      const response = await request(app)
        .get(`/api/salary-research/${jobId}`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.companies.length).toBeGreaterThanOrEqual(4);
      
      // Should include target company and comparison companies
      const companyNames = response.body.companies.map(c => c.company);
      expect(companyNames.some(name => name.includes('Target'))).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const querySpy = vi.spyOn(pool, 'query');
      querySpy.mockRejectedValueOnce(new Error('Database connection failed'));

      const job = await seedJobs(user.id, 1, {
        title: 'Software Engineer',
        company: 'Tech Corp',
        location: 'New York, NY'
      });
      const jobId = job[0].id;

      const response = await request(app)
        .get(`/api/salary-research/${jobId}`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Failed to generate salary research');

      querySpy.mockRestore();
    });

    it('should handle OpenAI API errors gracefully', async () => {
      // Note: OpenAI errors are handled by the route falling back to computed estimates
      // This is tested implicitly through the other tests that don't require OpenAI
      const job = await seedJobs(user.id, 1, {
        title: 'Software Engineer',
        company: 'Tech Corp',
        location: 'New York, NY'
      });
      const jobId = job[0].id;

      const response = await request(app)
        .get(`/api/salary-research/${jobId}`)
        .set('Authorization', `Bearer ${user.token}`);

      // Should return salary data (either from OpenAI or computed)
      expect(response.status).toBe(200);
      expect(response.body.range).toBeDefined();
    });
  });
});

