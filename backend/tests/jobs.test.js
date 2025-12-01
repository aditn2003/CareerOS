// backend/tests/jobs.test.js

import request from 'supertest';
import app from '../server.js'; // Import your app
import { pool } from '../server.js'; // Import the pool for cleanup

// We'll store the auth token and user ID for our main test user
let token;
let userId;
let jobId; // Variable to store our created job's ID

// We'll also store info for a "second" user
let otherUserId;
let otherJobId;

// 1. Run this block ONCE before all tests in this file
beforeAll(async () => {
  // --- Create User 1 (Our main test user) ---
  const email1 = `testuser_${Date.now()}@example.com`;
  await request(app).post('/register').send({
    email: email1,
    password: 'Password123!',
    confirmPassword: 'Password123!',
    firstName: 'Test',
    lastName: 'User'
  });
  const resLogin1 = await request(app).post('/login').send({
    email: email1,
    password: 'Password123!'
  });
  token = resLogin1.body.token; 
  const user1 = await pool.query("SELECT id FROM users WHERE email = $1", [email1]);
  userId = user1.rows[0].id;

  // --- Create User 2 (The "victim") ---
  const email2 = `victim_${Date.now()}@example.com`;
  await request(app).post('/register').send({
    email: email2,
    password: 'Password123!',
    confirmPassword: 'Password123!',
    firstName: 'Victim',
    lastName: 'User'
  });
  const user2 = await pool.query("SELECT id FROM users WHERE email = $1", [email2]);
  otherUserId = user2.rows[0].id;

  // Create a job that belongs to User 2 (the victim)
  const resJob = await pool.query(
    `INSERT INTO jobs (user_id, title, company) VALUES ($1, $2, $3) RETURNING id`,
    [otherUserId, 'Victim Job', 'Victim Co']
  );
  otherJobId = resJob.rows[0].id;
});



// 3. Our actual test suite
describe('Job Endpoints (AC #1, #8)', () => {

  it('should fetch an empty list of jobs for a new user', async () => {
    const res = await request(app)
      .get('/api/jobs')
      .set('Authorization', `Bearer ${token}`); 

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('jobs');
    expect(res.body.jobs).toEqual([]);
  });

  it('should fail to create a job without a title', async () => {
    const res = await request(app)
      .post('/api/jobs')
      .set('Authorization', `Bearer ${token}`)
      .send({ company: 'A Company' });

    expect(res.statusCode).toEqual(400);
    expect(res.body.error).toBe('Title and Company required');
  });

  it('should create a new job for the user', async () => {
    const res = await request(app)
      .post('/api/jobs')
      .set('Authorization', `Bearer ${token}`) 
      .send({
        title: 'Software Engineer',
        company: 'Test Co'
      });

    expect(res.statusCode).toBe(200); 
    expect(res.body.job).toHaveProperty('id');
    jobId = res.body.job.id; 
  });

  it('should update the job', async () => {
    const res = await request(app)
      .put(`/api/jobs/${jobId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Senior Software Engineer',
        status: 'Interview'
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body.job.title).toBe('Senior Software Engineer');
  });

  // --- THIS IS THE NEW TEST ---
  it('should update only the job status', async () => {
    const res = await request(app)
      .put(`/api/jobs/${jobId}/status`) // Use the special status route
      .set('Authorization', `Bearer ${token}`)
      .send({
        status: 'Applied' // New status
      });
    
    expect(res.statusCode).toEqual(200);
    expect(res.body.job.status).toBe('Applied');
  });
  // --- END OF NEW TEST ---

  it('should fail to delete a job belonging to another user', async () => {
    const res = await request(app)
      .delete(`/api/jobs/${otherJobId}`) // Try to delete the VICTIM'S job
      .set('Authorization', `Bearer ${token}`); // Using OUR token

    expect(res.statusCode).toEqual(404);
    expect(res.body.error).toBe('Job not found');
  });

  it('should delete the job', async () => {
    const res = await request(app)
      .delete(`/api/jobs/${jobId}`) // Delete OUR job
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.message).toBe('Job permanently deleted');
  });
});


describe('Job Statistics and Archiving', () => {
  let jobId_stats; 

  beforeAll(async () => {
    // Create a job to archive (owned by our main test user)
    const res = await request(app)
      .post('/api/jobs')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Job to be Archived',
        company: 'Archive Inc'
      });
    jobId_stats = res.body.job.id;
  });

  it('should archive a job', async () => {
    const res = await request(app)
      .put(`/api/jobs/${jobId_stats}/archive`)
      .set('Authorization', `Bearer ${token}`);
    
    expect(res.statusCode).toEqual(200);
    expect(res.body.job.isArchived).toBe(true);
  });

  it('should fetch the archived job from the /archived endpoint', async () => {
    const res = await request(app)
      .get('/api/jobs/archived')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toEqual(200);
    const archivedJob = res.body.jobs.find(job => job.id === jobId_stats);
    expect(archivedJob).toBeDefined();
  });

  it('should restore the job', async () => {
    const res = await request(app)
      .put(`/api/jobs/${jobId_stats}/restore`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.job.isArchived).toBe(false);
  });

  it('should get job statistics', async () => {
    const res = await request(app)
      .get('/api/jobs/stats')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('totalJobs');
  });
});