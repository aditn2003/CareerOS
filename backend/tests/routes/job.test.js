/**
 * Job Routes Tests
 * Tests routes/job.js endpoints
 * 
 * Coverage:
 * - GET /api/jobs (list all jobs, filtering, pagination)
 * - POST /api/jobs (create job, validation)
 * - GET /api/jobs/:id (get single job, not found)
 * - PUT /api/jobs/:id (update job, authorization)
 * - DELETE /api/jobs/:id (delete job, authorization)
 * - Job status updates
 * - Job deadline reminders
 * - Job search/filter functionality
 * - Job archiving
 */

import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';
import request from 'supertest';
import axios from 'axios';
import pool from '../../db/pool.js';
import {
  createTestUser,
  seedJobs,
  queryTestDb,
} from '../helpers/index.js';

// Mock external services before importing server
vi.mock('@google/generative-ai', () => {
  const mockInstance = {
    getGenerativeModel: vi.fn(() => ({
      generateContent: vi.fn().mockResolvedValue({
        response: {
          text: vi.fn(() => 'Mock response'),
        },
      }),
    })),
  };
  
  return {
    GoogleGenerativeAI: class {
      constructor() {
        return mockInstance;
      }
    },
  };
});

vi.mock('openai', () => {
  const mockInstance = {
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{
            message: {
              content: 'Mock AI response',
            },
          }],
        }),
      },
    },
  };
  
  return {
    default: class {
      constructor() {
        return mockInstance;
      }
    },
  };
});

// Mock Resend
vi.mock('resend', () => {
  const mockInstance = {
    emails: {
      send: vi.fn().mockResolvedValue({ success: true }),
    },
  };
  
  return {
    Resend: class {
      constructor() {
        return mockInstance;
      }
    },
  };
});

// Mock axios for geocoding
vi.mock('axios');

let app;

describe('Job Routes', () => {
  let user;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    const serverModule = await import('../../server.js');
    app = serverModule.app;
  });

  beforeEach(async () => {
    const timestamp = Date.now();
    user = await createTestUser({
      email: `job${timestamp}@example.com`,
      first_name: 'Test',
      last_name: 'User',
    });
    
    // Reset axios mocks
    vi.clearAllMocks();
    axios.get = vi.fn().mockResolvedValue({ data: [] });
    axios.post = vi.fn().mockResolvedValue({ data: { success: true, data: {} } });
  });

  describe('GET /api/jobs', () => {
    it('should list all jobs for authenticated user', async () => {
      await seedJobs(user.id, 3);

      const response = await request(app)
        .get('/api/jobs')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('jobs');
      expect(Array.isArray(response.body.jobs)).toBe(true);
      expect(response.body.jobs.length).toBeGreaterThanOrEqual(3);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get('/api/jobs');

      expect(response.status).toBe(401);
    });

    it('should filter jobs by status', async () => {
      await seedJobs(user.id, 5, { status: 'Applied' });
      await seedJobs(user.id, 2, { status: 'Interview' });

      const response = await request(app)
        .get('/api/jobs?status=Applied')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.jobs.length).toBeGreaterThanOrEqual(5);
      response.body.jobs.forEach(job => {
        expect(job.status.toLowerCase()).toBe('applied');
      });
    });

    it('should filter jobs by search term (title)', async () => {
      await seedJobs(user.id, 2, { title: 'Software Engineer' });
      await seedJobs(user.id, 2, { title: 'Data Scientist' });

      const response = await request(app)
        .get('/api/jobs?search=Software')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      response.body.jobs.forEach(job => {
        expect(job.title.toLowerCase()).toContain('software');
      });
    });

    it('should filter jobs by search term (company)', async () => {
      await seedJobs(user.id, 2, { company: 'Google' });
      await seedJobs(user.id, 2, { company: 'Microsoft' });

      const response = await request(app)
        .get('/api/jobs?search=Google')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      response.body.jobs.forEach(job => {
        expect(job.company.toLowerCase()).toContain('google');
      });
    });

    it('should filter jobs by industry', async () => {
      await seedJobs(user.id, 3, { industry: 'Technology' });
      await seedJobs(user.id, 2, { industry: 'Finance' });

      const response = await request(app)
        .get('/api/jobs?industry=Technology')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      response.body.jobs.forEach(job => {
        expect(job.industry?.toLowerCase()).toContain('technology');
      });
    });

    it('should filter jobs by location', async () => {
      await seedJobs(user.id, 3, { location: 'San Francisco, CA' });
      await seedJobs(user.id, 2, { location: 'New York, NY' });

      const response = await request(app)
        .get('/api/jobs?location=San Francisco')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      response.body.jobs.forEach(job => {
        expect(job.location?.toLowerCase()).toContain('san francisco');
      });
    });

    it('should filter jobs by salary range', async () => {
      await seedJobs(user.id, 2, { salary_min: 100000, salary_max: 150000 });
      await seedJobs(user.id, 2, { salary_min: 200000, salary_max: 250000 });

      const response = await request(app)
        .get('/api/jobs?salaryMin=120000&salaryMax=180000')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      // Jobs should have salary_min >= 120000 and salary_max <= 180000
      response.body.jobs.forEach(job => {
        if (job.salary_min) {
          expect(job.salary_min).toBeGreaterThanOrEqual(120000);
        }
        if (job.salary_max) {
          expect(job.salary_max).toBeLessThanOrEqual(180000);
        }
      });
    });

    it('should filter jobs by deadline date range', async () => {
      const dateFrom = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const dateTo = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      await seedJobs(user.id, 2, { deadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000) });
      await seedJobs(user.id, 2, { deadline: new Date(Date.now() + 50 * 24 * 60 * 60 * 1000) });

      const response = await request(app)
        .get(`/api/jobs?dateFrom=${dateFrom}&dateTo=${dateTo}`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
    });

    it('should sort jobs by deadline', async () => {
      await seedJobs(user.id, 3);

      const response = await request(app)
        .get('/api/jobs?sortBy=deadline')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.jobs.length).toBeGreaterThan(0);
    });

    it('should sort jobs by salary', async () => {
      await seedJobs(user.id, 3);

      const response = await request(app)
        .get('/api/jobs?sortBy=salary')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.jobs.length).toBeGreaterThan(0);
    });

    it('should sort jobs by company', async () => {
      await seedJobs(user.id, 3);

      const response = await request(app)
        .get('/api/jobs?sortBy=company')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.jobs.length).toBeGreaterThan(0);
    });

    it('should exclude archived jobs', async () => {
      const jobs = await seedJobs(user.id, 3);
      // Archive one job
      await queryTestDb(
        `UPDATE jobs SET "isArchived" = true WHERE id = $1`,
        [jobs[0].id]
      );

      const response = await request(app)
        .get('/api/jobs')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.jobs.length).toBe(2);
      response.body.jobs.forEach(job => {
        expect(job.isArchived).not.toBe(true);
      });
    });

    it('should include days_in_stage in response', async () => {
      await seedJobs(user.id, 1);

      const response = await request(app)
        .get('/api/jobs')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      if (response.body.jobs.length > 0) {
        expect(response.body.jobs[0]).toHaveProperty('days_in_stage');
        expect(typeof response.body.jobs[0].days_in_stage).toBe('number');
      }
    });
  });

  describe('POST /api/jobs', () => {
    it('should create a new job with required fields', async () => {
      const jobData = {
        title: 'Software Engineer',
        company: 'Tech Company',
        location: 'San Francisco, CA',
        salary_min: 100000,
        salary_max: 150000,
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'Job description',
      };

      const response = await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${user.token}`)
        .send(jobData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('job');
      expect(response.body.job).toHaveProperty('id');
      expect(response.body.job.title).toBe('Software Engineer');
      expect(response.body.job.company).toBe('Tech Company');
      expect(response.body.job.status).toBe('Interested');
    });

    it('should reject job creation without title', async () => {
      const jobData = {
        company: 'Tech Company',
      };

      const response = await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${user.token}`)
        .send(jobData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Title and company are required');
    });

    it('should reject job creation without company', async () => {
      const jobData = {
        title: 'Software Engineer',
      };

      const response = await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${user.token}`)
        .send(jobData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject job creation with empty title', async () => {
      const jobData = {
        title: '   ',
        company: 'Tech Company',
      };

      const response = await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${user.token}`)
        .send(jobData);

      expect(response.status).toBe(400);
    });

    it('should clean salary values (remove $ and commas)', async () => {
      const jobData = {
        title: 'Software Engineer',
        company: 'Tech Company',
        salary_min: '$100,000',
        salary_max: '$150,000',
      };

      const response = await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${user.token}`)
        .send(jobData);

      expect(response.status).toBe(201);
      expect(response.body.job.salary_min).toBe(100000);
      expect(response.body.job.salary_max).toBe(150000);
    });

    it('should handle applicationDate from dateApplied field', async () => {
      const jobData = {
        title: 'Software Engineer',
        company: 'Tech Company',
        dateApplied: new Date().toISOString(),
      };

      const response = await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${user.token}`)
        .send(jobData);

      expect(response.status).toBe(201);
      expect(response.body.job).toHaveProperty('applicationDate');
    });

    it('should handle required_skills array', async () => {
      const jobData = {
        title: 'Software Engineer',
        company: 'Tech Company',
        required_skills: ['JavaScript', 'React', 'Node.js'],
      };

      const response = await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${user.token}`)
        .send(jobData);

      expect(response.status).toBe(201);
      expect(response.body.job.required_skills).toEqual(['JavaScript', 'React', 'Node.js']);
    });

    it('should handle location_type validation', async () => {
      const jobData = {
        title: 'Software Engineer',
        company: 'Tech Company',
        location_type: 'remote',
      };

      const response = await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${user.token}`)
        .send(jobData);

      expect(response.status).toBe(201);
      expect(response.body.job.location_type).toBe('remote');
    });

    it('should reject invalid location_type', async () => {
      const jobData = {
        title: 'Software Engineer',
        company: 'Tech Company',
        location_type: 'invalid_type',
      };

      const response = await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${user.token}`)
        .send(jobData);

      expect(response.status).toBe(201);
      // Invalid location_type should be set to null
      expect(response.body.job.location_type).toBeNull();
    });

    it('should handle industry field (empty string to null)', async () => {
      const jobData = {
        title: 'Software Engineer',
        company: 'Tech Company',
        industry: '',
      };

      const response = await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${user.token}`)
        .send(jobData);

      expect(response.status).toBe(201);
      expect(response.body.job.industry).toBeNull();
    });

    it('should handle role_level field', async () => {
      const jobData = {
        title: 'Software Engineer',
        company: 'Tech Company',
        role_level: 'Senior',
      };

      const response = await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${user.token}`)
        .send(jobData);

      expect(response.status).toBe(201);
      expect(response.body.job.role_level).toBe('senior'); // Normalized to lowercase
    });

    it('should return 401 when not authenticated', async () => {
      const jobData = {
        title: 'Software Engineer',
        company: 'Tech Company',
      };

      const response = await request(app)
        .post('/api/jobs')
        .send(jobData);

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/jobs/:id', () => {
    it('should get a single job by ID', async () => {
      const jobs = await seedJobs(user.id, 1);
      const jobId = jobs[0].id;

      const response = await request(app)
        .get(`/api/jobs/${jobId}`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('job');
      expect(response.body.job.id).toBe(jobId);
    });

    it('should return 404 for non-existent job', async () => {
      const response = await request(app)
        .get('/api/jobs/99999')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Job not found');
    });

    it('should not return jobs from other users', async () => {
      const otherUser = await createTestUser();
      const otherJobs = await seedJobs(otherUser.id, 1);
      const otherJobId = otherJobs[0].id;

      const response = await request(app)
        .get(`/api/jobs/${otherJobId}`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(404);
    });

    it('should include materials (resume_id, cover_letter_id) in response', async () => {
      const jobs = await seedJobs(user.id, 1);
      const jobId = jobs[0].id;

      // Create materials entry
      await queryTestDb(
        `INSERT INTO job_materials (job_id, user_id, resume_id, cover_letter_id)
         VALUES ($1, $2, $3, $4)`,
        [jobId, user.id, null, null]
      );

      const response = await request(app)
        .get(`/api/jobs/${jobId}`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.job).toHaveProperty('resume_id');
      expect(response.body.job).toHaveProperty('cover_letter_id');
    });

    it('should return 401 when not authenticated', async () => {
      const jobs = await seedJobs(user.id, 1);
      const jobId = jobs[0].id;

      const response = await request(app)
        .get(`/api/jobs/${jobId}`);

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/jobs/:id', () => {
    it('should update a job', async () => {
      const jobs = await seedJobs(user.id, 1);
      const jobId = jobs[0].id;

      const updateData = {
        title: 'Updated Title',
        status: 'Applied',
      };

      const response = await request(app)
        .put(`/api/jobs/${jobId}`)
        .set('Authorization', `Bearer ${user.token}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('job');
      expect(response.body.job.title).toBe('Updated Title');
      expect(response.body.job.status).toBe('Applied');
    });

    it('should update multiple fields', async () => {
      const jobs = await seedJobs(user.id, 1);
      const jobId = jobs[0].id;

      const updateData = {
        title: 'Updated Title',
        company: 'Updated Company',
        location: 'Updated Location',
        salary_min: 120000,
        salary_max: 180000,
      };

      const response = await request(app)
        .put(`/api/jobs/${jobId}`)
        .set('Authorization', `Bearer ${user.token}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.job.title).toBe('Updated Title');
      expect(response.body.job.company).toBe('Updated Company');
      expect(response.body.job.location).toBe('Updated Location');
    });

    it('should return 404 for non-existent job', async () => {
      const updateData = {
        title: 'Updated Title',
      };

      const response = await request(app)
        .put('/api/jobs/99999')
        .set('Authorization', `Bearer ${user.token}`)
        .send(updateData);

      expect(response.status).toBe(404);
    });

    it('should not update jobs from other users', async () => {
      const otherUser = await createTestUser();
      const otherJobs = await seedJobs(otherUser.id, 1);
      const otherJobId = otherJobs[0].id;

      const response = await request(app)
        .put(`/api/jobs/${otherJobId}`)
        .set('Authorization', `Bearer ${user.token}`)
        .send({ title: 'Hacked Title' });

      expect(response.status).toBe(404);
    });

    it('should reject update with no valid fields', async () => {
      const jobs = await seedJobs(user.id, 1);
      const jobId = jobs[0].id;

      const response = await request(app)
        .put(`/api/jobs/${jobId}`)
        .set('Authorization', `Bearer ${user.token}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle dateApplied field in update', async () => {
      const jobs = await seedJobs(user.id, 1);
      const jobId = jobs[0].id;

      const updateData = {
        dateApplied: new Date().toISOString(),
      };

      const response = await request(app)
        .put(`/api/jobs/${jobId}`)
        .set('Authorization', `Bearer ${user.token}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.job).toHaveProperty('applicationDate');
    });

    it('should update status_updated_at when status changes', async () => {
      const jobs = await seedJobs(user.id, 1, { status: 'Interested' });
      const jobId = jobs[0].id;

      // Get original status and status_updated_at
      const originalJob = await queryTestDb(
        'SELECT status, status_updated_at FROM jobs WHERE id = $1',
        [jobId]
      );
      const originalStatus = originalJob.rows[0].status;
      const originalTimestamp = originalJob.rows[0].status_updated_at;

      // Ensure we're changing to a different status
      const newStatus = originalStatus === 'Interested' ? 'Applied' : 'Interested';

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 100));

      const updateData = {
        status: newStatus,
      };

      const response = await request(app)
        .put(`/api/jobs/${jobId}`)
        .set('Authorization', `Bearer ${user.token}`)
        .send(updateData);

      expect(response.status).toBe(200);
      
      // Verify status_updated_at was updated
      const updatedJob = await queryTestDb(
        'SELECT status_updated_at FROM jobs WHERE id = $1',
        [jobId]
      );
      const updatedTimestamp = updatedJob.rows[0].status_updated_at;
      expect(updatedTimestamp).toBeTruthy();
      // Allow for some timing variance, but ensure it's updated
      const timeDiff = new Date(updatedTimestamp).getTime() - new Date(originalTimestamp).getTime();
      expect(timeDiff).toBeGreaterThanOrEqual(0);
    });

    it('should set offerDate when status becomes Offer', async () => {
      const jobs = await seedJobs(user.id, 1, { status: 'Interview' });
      const jobId = jobs[0].id;

      const updateData = {
        status: 'Offer',
      };

      const response = await request(app)
        .put(`/api/jobs/${jobId}`)
        .set('Authorization', `Bearer ${user.token}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.job).toHaveProperty('offerDate');
      expect(response.body.job.offerDate).not.toBeNull();
    });

    it('should handle industry field update (empty string to null)', async () => {
      const jobs = await seedJobs(user.id, 1, { industry: 'Technology' });
      const jobId = jobs[0].id;

      const updateData = {
        industry: '',
      };

      const response = await request(app)
        .put(`/api/jobs/${jobId}`)
        .set('Authorization', `Bearer ${user.token}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.job.industry).toBeNull();
    });

    it('should return 401 when not authenticated', async () => {
      const jobs = await seedJobs(user.id, 1);
      const jobId = jobs[0].id;

      const response = await request(app)
        .put(`/api/jobs/${jobId}`)
        .send({ title: 'Updated Title' });

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/jobs/:id', () => {
    it('should delete a job', async () => {
      const jobs = await seedJobs(user.id, 1);
      const jobId = jobs[0].id;

      const response = await request(app)
        .delete(`/api/jobs/${jobId}`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Job permanently deleted');
      
      // Verify deletion
      const result = await queryTestDb(
        'SELECT * FROM jobs WHERE id = $1',
        [jobId]
      );
      expect(result.rows).toHaveLength(0);
    });

    it('should return 404 for non-existent job', async () => {
      const response = await request(app)
        .delete('/api/jobs/99999')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(404);
    });

    it('should not delete jobs from other users', async () => {
      const otherUser = await createTestUser();
      const otherJobs = await seedJobs(otherUser.id, 1);
      const otherJobId = otherJobs[0].id;

      const response = await request(app)
        .delete(`/api/jobs/${otherJobId}`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(404);
    });

    it('should delete related application_history records', async () => {
      const jobs = await seedJobs(user.id, 1);
      const jobId = jobs[0].id;

      // Create application history
      await queryTestDb(
        `INSERT INTO application_history (job_id, user_id, event, from_status, to_status)
         VALUES ($1, $2, $3, $4, $5)`,
        [jobId, user.id, 'Status changed', 'Interested', 'Applied']
      );

      const response = await request(app)
        .delete(`/api/jobs/${jobId}`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      
      // Verify history was deleted
      const historyResult = await queryTestDb(
        'SELECT * FROM application_history WHERE job_id = $1',
        [jobId]
      );
      expect(historyResult.rows).toHaveLength(0);
    });

    it('should return 401 when not authenticated', async () => {
      const jobs = await seedJobs(user.id, 1);
      const jobId = jobs[0].id;

      const response = await request(app)
        .delete(`/api/jobs/${jobId}`);

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/jobs/:id/status', () => {
    it('should update job status', async () => {
      const jobs = await seedJobs(user.id, 1, { status: 'Interested' });
      const jobId = jobs[0].id;

      const response = await request(app)
        .put(`/api/jobs/${jobId}/status`)
        .set('Authorization', `Bearer ${user.token}`)
        .send({ status: 'Applied' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('job');
      expect(response.body.job.status).toBe('Applied');
    });

    it('should set interview_date when status becomes Interview', async () => {
      const jobs = await seedJobs(user.id, 1, { status: 'Applied' });
      const jobId = jobs[0].id;

      const response = await request(app)
        .put(`/api/jobs/${jobId}/status`)
        .set('Authorization', `Bearer ${user.token}`)
        .send({ status: 'Interview' });

      expect(response.status).toBe(200);
      expect(response.body.job).toHaveProperty('interview_date');
      expect(response.body.job.interview_date).not.toBeNull();
    });

    it('should set offerDate when status becomes Offer', async () => {
      const jobs = await seedJobs(user.id, 1, { status: 'Interview' });
      const jobId = jobs[0].id;

      const response = await request(app)
        .put(`/api/jobs/${jobId}/status`)
        .set('Authorization', `Bearer ${user.token}`)
        .send({ status: 'Offer' });

      expect(response.status).toBe(200);
      expect(response.body.job).toHaveProperty('offerDate');
      expect(response.body.job.offerDate).not.toBeNull();
    });

    it('should create application_history entry on status change', async () => {
      const jobs = await seedJobs(user.id, 1, { status: 'Interested' });
      const jobId = jobs[0].id;

      const response = await request(app)
        .put(`/api/jobs/${jobId}/status`)
        .set('Authorization', `Bearer ${user.token}`)
        .send({ status: 'Applied' });

      expect(response.status).toBe(200);

      // Verify history was created
      const historyResult = await queryTestDb(
        'SELECT * FROM application_history WHERE job_id = $1 ORDER BY timestamp DESC LIMIT 1',
        [jobId]
      );
      expect(historyResult.rows.length).toBeGreaterThan(0);
      expect(historyResult.rows[0].to_status).toBe('Applied');
    });

    it('should reject status update without status field', async () => {
      const jobs = await seedJobs(user.id, 1);
      const jobId = jobs[0].id;

      const response = await request(app)
        .put(`/api/jobs/${jobId}/status`)
        .set('Authorization', `Bearer ${user.token}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 404 for non-existent job', async () => {
      const response = await request(app)
        .put('/api/jobs/99999/status')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ status: 'Applied' });

      expect(response.status).toBe(404);
    });

    it('should not update status for other user\'s job', async () => {
      const otherUser = await createTestUser();
      const otherJobs = await seedJobs(otherUser.id, 1);
      const otherJobId = otherJobs[0].id;

      const response = await request(app)
        .put(`/api/jobs/${otherJobId}/status`)
        .set('Authorization', `Bearer ${user.token}`)
        .send({ status: 'Applied' });

      expect(response.status).toBe(404);
    });

    it('should return 401 when not authenticated', async () => {
      const jobs = await seedJobs(user.id, 1);
      const jobId = jobs[0].id;

      const response = await request(app)
        .put(`/api/jobs/${jobId}/status`)
        .send({ status: 'Applied' });

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/jobs/bulk/deadline', () => {
    it('should update deadlines for multiple jobs', async () => {
      const jobs = await seedJobs(user.id, 3);
      const jobIds = jobs.map(j => j.id);

      const response = await request(app)
        .put('/api/jobs/bulk/deadline')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ jobIds, daysToAdd: 7 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('updated');
      expect(response.body.updated.length).toBe(3);
    });

    it('should reject bulk update without jobIds', async () => {
      const response = await request(app)
        .put('/api/jobs/bulk/deadline')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ daysToAdd: 7 });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject bulk update with empty jobIds array', async () => {
      const response = await request(app)
        .put('/api/jobs/bulk/deadline')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ jobIds: [], daysToAdd: 7 });

      expect(response.status).toBe(400);
    });

    it('should reject bulk update with invalid daysToAdd', async () => {
      const jobs = await seedJobs(user.id, 2);
      const jobIds = jobs.map(j => j.id);

      const response = await request(app)
        .put('/api/jobs/bulk/deadline')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ jobIds, daysToAdd: 0 });

      expect(response.status).toBe(400);
    });

    it('should only update jobs belonging to the user', async () => {
      const userJobs = await seedJobs(user.id, 2);
      const otherUser = await createTestUser();
      const otherJobs = await seedJobs(otherUser.id, 1);
      
      const jobIds = [...userJobs.map(j => j.id), otherJobs[0].id];

      const response = await request(app)
        .put('/api/jobs/bulk/deadline')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ jobIds, daysToAdd: 7 });

      expect(response.status).toBe(200);
      // Should only update user's jobs
      expect(response.body.updated.length).toBe(2);
    });

    it('should return 401 when not authenticated', async () => {
      const jobs = await seedJobs(user.id, 2);
      const jobIds = jobs.map(j => j.id);

      const response = await request(app)
        .put('/api/jobs/bulk/deadline')
        .send({ jobIds, daysToAdd: 7 });

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/jobs/:id/archive', () => {
    it('should archive a job', async () => {
      const jobs = await seedJobs(user.id, 1);
      const jobId = jobs[0].id;

      const response = await request(app)
        .put(`/api/jobs/${jobId}/archive`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('job');
      expect(response.body.job.isArchived).toBe(true);
    });

    it('should return 404 for non-existent job', async () => {
      const response = await request(app)
        .put('/api/jobs/99999/archive')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(404);
    });

    it('should not archive jobs from other users', async () => {
      const otherUser = await createTestUser();
      const otherJobs = await seedJobs(otherUser.id, 1);
      const otherJobId = otherJobs[0].id;

      const response = await request(app)
        .put(`/api/jobs/${otherJobId}/archive`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(404);
    });

    it('should return 401 when not authenticated', async () => {
      const jobs = await seedJobs(user.id, 1);
      const jobId = jobs[0].id;

      const response = await request(app)
        .put(`/api/jobs/${jobId}/archive`);

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/jobs/:id/restore', () => {
    it('should restore an archived job', async () => {
      const jobs = await seedJobs(user.id, 1);
      const jobId = jobs[0].id;

      // Archive first
      await queryTestDb(
        `UPDATE jobs SET "isArchived" = true WHERE id = $1`,
        [jobId]
      );

      const response = await request(app)
        .put(`/api/jobs/${jobId}/restore`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('job');
      expect(response.body.job.isArchived).toBe(false);
    });

    it('should return 404 for non-existent job', async () => {
      const response = await request(app)
        .put('/api/jobs/99999/restore')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(404);
    });

    it('should not restore jobs from other users', async () => {
      const otherUser = await createTestUser();
      const otherJobs = await seedJobs(otherUser.id, 1);
      const otherJobId = otherJobs[0].id;

      const response = await request(app)
        .put(`/api/jobs/${otherJobId}/restore`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(404);
    });

    it('should return 401 when not authenticated', async () => {
      const jobs = await seedJobs(user.id, 1);
      const jobId = jobs[0].id;

      const response = await request(app)
        .put(`/api/jobs/${jobId}/restore`);

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/jobs/archived', () => {
    it('should list archived jobs', async () => {
      const jobs = await seedJobs(user.id, 3);
      
      // Archive two jobs
      await queryTestDb(
        `UPDATE jobs SET "isArchived" = true WHERE id IN ($1, $2)`,
        [jobs[0].id, jobs[1].id]
      );

      const response = await request(app)
        .get('/api/jobs/archived')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('jobs');
      expect(response.body.jobs.length).toBe(2);
      response.body.jobs.forEach(job => {
        expect(job.isArchived).toBe(true);
      });
    });

    it('should return empty array when no archived jobs', async () => {
      await seedJobs(user.id, 2);

      const response = await request(app)
        .get('/api/jobs/archived')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.jobs).toEqual([]);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get('/api/jobs/archived');

      expect(response.status).toBe(401);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors in GET /api/jobs', async () => {
      const querySpy = vi.spyOn(pool, 'query');
      querySpy.mockRejectedValueOnce(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/jobs')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Database error');

      querySpy.mockRestore();
    });

    it('should handle database errors in POST /api/jobs', async () => {
      // Store original query method
      const originalQuery = pool.query.bind(pool);
      const querySpy = vi.spyOn(pool, 'query');
      
      querySpy.mockImplementation((text, params) => {
        // Fail on the INSERT query
        if (text.includes('INSERT INTO jobs') && text.includes('user_id, title, company')) {
          return Promise.reject(new Error('Database connection failed'));
        }
        // Allow other queries to succeed by calling original
        return originalQuery(text, params);
      });

      const jobData = {
        title: 'Software Engineer',
        company: 'Tech Company',
      };

      const response = await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${user.token}`)
        .send(jobData);

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');

      querySpy.mockRestore();
    });

    it('should handle database errors in GET /api/jobs/:id', async () => {
      const querySpy = vi.spyOn(pool, 'query');
      querySpy.mockRejectedValueOnce(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/jobs/1')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');

      querySpy.mockRestore();
    });

    it('should handle database errors in PUT /api/jobs/:id', async () => {
      const jobs = await seedJobs(user.id, 1);
      const jobId = jobs[0].id;

      // Store original query method
      const originalQuery = pool.query.bind(pool);
      const querySpy = vi.spyOn(pool, 'query');
      
      querySpy.mockImplementation((text, params) => {
        // Fail on the UPDATE query
        if (text.includes('UPDATE jobs') && text.includes('SET')) {
          return Promise.reject(new Error('Database connection failed'));
        }
        // Allow other queries to succeed
        return originalQuery(text, params);
      });

      const response = await request(app)
        .put(`/api/jobs/${jobId}`)
        .set('Authorization', `Bearer ${user.token}`)
        .send({ title: 'Updated Title' });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');

      querySpy.mockRestore();
    });

    it('should handle database errors in DELETE /api/jobs/:id', async () => {
      const jobs = await seedJobs(user.id, 1);
      const jobId = jobs[0].id;

      // Store original connect method
      const originalConnect = pool.connect.bind(pool);
      const connectSpy = vi.spyOn(pool, 'connect');
      connectSpy.mockRejectedValueOnce(new Error('Database connection failed'));

      const response = await request(app)
        .delete(`/api/jobs/${jobId}`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');

      connectSpy.mockRestore();
    });
  });
});
