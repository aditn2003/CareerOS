// backend/tests/jobManagement.test.js
import request from 'supertest';
import { app, pool } from '../server.js';

let token;
let userId;
let jobId;

beforeAll(async () => {
  // Create test user
  const email = `test_job_${Date.now()}@example.com`;
  await request(app).post('/register').send({
    email,
    password: 'Password123!',
    confirmPassword: 'Password123!',
    firstName: 'Test',
    lastName: 'User'
  });
  const resLogin = await request(app).post('/login').send({ email, password: 'Password123!' });
  token = resLogin.body.token;
  const user = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
  userId = user.rows[0].id;
});

afterAll(async () => {
  if (jobId) await pool.query("DELETE FROM jobs WHERE id = $1", [jobId]);
  if (userId) await pool.query("DELETE FROM users WHERE id = $1", [userId]);
  await pool.end();
});

describe('Job Management Functions', () => {
  describe('POST /api/jobs - Create Job', () => {
    it('should create a job with all required fields', async () => {
      const res = await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Software Engineer',
          company: 'Tech Corp',
          location: 'San Francisco, CA',
          salary_min: 100000,
          salary_max: 150000,
          description: 'Full-stack developer position',
          industry: 'Technology',
          type: 'Full-time',
          required_skills: ['JavaScript', 'React', 'Node.js']
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.job).toBeDefined();
      expect(res.body.job.title).toBe('Software Engineer');
      expect(res.body.job.company).toBe('Tech Corp');
      expect(res.body.job.status).toBe('Interested');
      jobId = res.body.job.id;
    });

    it('should reject job creation without title', async () => {
      const res = await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${token}`)
        .send({
          company: 'Tech Corp'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('Title and company are required');
    });

    it('should reject job creation without company', async () => {
      const res = await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Software Engineer'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('Title and company are required');
    });

    it('should handle applicationDate field', async () => {
      const applicationDate = new Date().toISOString().split('T')[0];
      const res = await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Senior Engineer',
          company: 'Tech Corp',
          applicationDate
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.job).toBeDefined();
    });

    it('should handle dateApplied alias for applicationDate', async () => {
      const dateApplied = new Date().toISOString().split('T')[0];
      const res = await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Lead Engineer',
          company: 'Tech Corp',
          dateApplied
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.job).toBeDefined();
    });

    it('should clean salary numbers correctly', async () => {
      const res = await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Engineer',
          company: 'Tech Corp',
          salary_min: '$100,000',
          salary_max: '150000'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.job.salary_min).toBe(100000);
      // Handle potential parsing issues - should be 150000, but allow for edge cases
      const salaryMax = res.body.job.salary_max;
      expect([150000, 15000000]).toContain(salaryMax);
      if (salaryMax === 15000000) {
        console.warn('⚠️ Salary parsing issue: received 15000000 instead of 150000');
      }
      expect(salaryMax).toBe(150000); // This will fail if there's a parsing issue, helping us debug
    });
  });

  describe('GET /api/jobs - List Jobs', () => {
    it('should fetch all jobs for user', async () => {
      const res = await request(app)
        .get('/api/jobs')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.jobs).toBeInstanceOf(Array);
    });

    it('should filter jobs by status', async () => {
      const res = await request(app)
        .get('/api/jobs?status=Interested')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.jobs.every(job => job.status === 'Interested')).toBe(true);
    });

    it('should filter jobs by search term', async () => {
      const res = await request(app)
        .get('/api/jobs?search=Engineer')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.jobs).toBeInstanceOf(Array);
    });

    it('should filter jobs by industry', async () => {
      const res = await request(app)
        .get('/api/jobs?industry=Technology')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.jobs).toBeInstanceOf(Array);
    });

    it('should filter jobs by location', async () => {
      const res = await request(app)
        .get('/api/jobs?location=San Francisco')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.jobs).toBeInstanceOf(Array);
    });

    it('should filter jobs by salary range', async () => {
      const res = await request(app)
        .get('/api/jobs?salaryMin=90000&salaryMax=160000')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.jobs).toBeInstanceOf(Array);
    });

    it('should sort jobs by deadline', async () => {
      const res = await request(app)
        .get('/api/jobs?sortBy=deadline')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.jobs).toBeInstanceOf(Array);
    });

    it('should sort jobs by salary', async () => {
      const res = await request(app)
        .get('/api/jobs?sortBy=salary')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.jobs).toBeInstanceOf(Array);
    });

    it('should sort jobs by company', async () => {
      const res = await request(app)
        .get('/api/jobs?sortBy=company')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.jobs).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/jobs/:id - Get Job by ID', () => {
    it('should fetch a specific job', async () => {
      if (!jobId) {
        // Create a job first
        const createRes = await request(app)
          .post('/api/jobs')
          .set('Authorization', `Bearer ${token}`)
          .send({
            title: 'Test Job',
            company: 'Test Corp'
          });
        jobId = createRes.body.job.id;
      }

      const res = await request(app)
        .get(`/api/jobs/${jobId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.job).toBeDefined();
      expect(res.body.job.id).toBe(jobId);
    });

    it('should return 404 for non-existent job', async () => {
      const res = await request(app)
        .get('/api/jobs/99999')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.error).toBe('Job not found');
    });
  });

  describe('PUT /api/jobs/:id - Update Job', () => {
    it('should update job title', async () => {
      if (!jobId) {
        const createRes = await request(app)
          .post('/api/jobs')
          .set('Authorization', `Bearer ${token}`)
          .send({
            title: 'Test Job',
            company: 'Test Corp'
          });
        jobId = createRes.body.job.id;
      }

      const res = await request(app)
        .put(`/api/jobs/${jobId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Updated Title'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.job.title).toBe('Updated Title');
    });

    it('should update job status', async () => {
      const res = await request(app)
        .put(`/api/jobs/${jobId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          status: 'Applied'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.job.status).toBe('Applied');
    });

    it('should set offerDate when status changes to Offer', async () => {
      const res = await request(app)
        .put(`/api/jobs/${jobId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          status: 'Offer'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.job.status).toBe('Offer');
      expect(res.body.job.offerDate).toBeDefined();
    });

    it('should reject update with no valid fields', async () => {
      const res = await request(app)
        .put(`/api/jobs/${jobId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('No valid fields to update');
    });
  });

  describe('PUT /api/jobs/:id/status - Update Status Only', () => {
    it('should update job status', async () => {
      const res = await request(app)
        .put(`/api/jobs/${jobId}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          status: 'Interview'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.job.status).toBe('Interview');
    });

    it('should reject update without status', async () => {
      const res = await request(app)
        .put(`/api/jobs/${jobId}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('Missing status');
    });
  });

  describe('PUT /api/jobs/:id/archive - Archive Job', () => {
    it('should archive a job', async () => {
      const res = await request(app)
        .put(`/api/jobs/${jobId}/archive`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.job.isArchived).toBe(true);
    });
  });

  describe('PUT /api/jobs/:id/restore - Restore Job', () => {
    it('should restore an archived job', async () => {
      const res = await request(app)
        .put(`/api/jobs/${jobId}/restore`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.job.isArchived).toBe(false);
    });
  });

  describe('GET /api/jobs/archived - Get Archived Jobs', () => {
    it('should fetch archived jobs', async () => {
      // Archive a job first
      await request(app)
        .put(`/api/jobs/${jobId}/archive`)
        .set('Authorization', `Bearer ${token}`);

      const res = await request(app)
        .get('/api/jobs/archived')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.jobs).toBeInstanceOf(Array);
      expect(res.body.jobs.every(job => job.isArchived === true)).toBe(true);
    });
  });

  describe('PUT /api/jobs/bulk/deadline - Bulk Deadline Update', () => {
    it('should update deadlines for multiple jobs', async () => {
      // Create another job
      const createRes = await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Bulk Test Job',
          company: 'Test Corp',
          deadline: new Date().toISOString().split('T')[0]
        });
      const secondJobId = createRes.body.job.id;

      const res = await request(app)
        .put('/api/jobs/bulk/deadline')
        .set('Authorization', `Bearer ${token}`)
        .send({
          jobIds: [jobId, secondJobId],
          daysToAdd: 7
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.updated).toBeInstanceOf(Array);
      expect(res.body.updated.length).toBeGreaterThan(0);

      // Cleanup
      await pool.query("DELETE FROM jobs WHERE id = $1", [secondJobId]);
    });

    it('should reject bulk update without job IDs', async () => {
      const res = await request(app)
        .put('/api/jobs/bulk/deadline')
        .set('Authorization', `Bearer ${token}`)
        .send({
          daysToAdd: 7
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('No job IDs provided');
    });

    it('should reject bulk update with invalid days', async () => {
      const res = await request(app)
        .put('/api/jobs/bulk/deadline')
        .set('Authorization', `Bearer ${token}`)
        .send({
          jobIds: [jobId],
          daysToAdd: 0
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('Invalid daysToAdd value');
    });
  });

  describe('DELETE /api/jobs/:id - Delete Job', () => {
    it('should delete a job', async () => {
      // Create a job to delete
      const createRes = await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Job to Delete',
          company: 'Test Corp'
        });
      const deleteJobId = createRes.body.job.id;

      const res = await request(app)
        .delete(`/api/jobs/${deleteJobId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toContain('permanently deleted');
    });

    it('should return 404 for non-existent job', async () => {
      const res = await request(app)
        .delete('/api/jobs/99999')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.error).toBe('Job not found');
    });
  });

  describe('GET /api/jobs/stats - Job Statistics', () => {
    it('should fetch job statistics', async () => {
      const res = await request(app)
        .get('/api/jobs/stats')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.totalJobs).toBeDefined();
      expect(res.body.jobsByStatus).toBeDefined();
      expect(res.body.monthlyVolume).toBeDefined();
    });
  });
});

