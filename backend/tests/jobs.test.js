import request from 'supertest';
import { app, pool } from '../server.js';

let token;
let userId;
let otherUserId;
let otherJobId;
let jobId;

beforeAll(async () => {
  // 1. Create Main User
  const email1 = `testuser_${Date.now()}@example.com`;
  await request(app).post('/register').send({
    email: email1, password: 'Password123!', confirmPassword: 'Password123!', firstName: 'Test', lastName: 'User'
  });
  const resLogin1 = await request(app).post('/login').send({ email: email1, password: 'Password123!' });
  token = resLogin1.body.token;
  const user1 = await pool.query("SELECT id FROM users WHERE email = $1", [email1]);
  userId = user1.rows[0].id;

  // 2. Create Second User (Victim)
  const email2 = `victim_${Date.now()}@example.com`;
  await request(app).post('/register').send({
    email: email2, password: 'Password123!', confirmPassword: 'Password123!', firstName: 'Victim', lastName: 'User'
  });
  const user2 = await pool.query("SELECT id FROM users WHERE email = $1", [email2]);
  otherUserId = user2.rows[0].id;

  // 3. Create Job for Victim
  const resJob = await pool.query(
    `INSERT INTO jobs (user_id, title, company, "required_skills") VALUES ($1, $2, $3, $4) RETURNING id`,
    [otherUserId, 'Victim Job', 'Victim Co', ['Legacy']]
  );
  otherJobId = resJob.rows[0].id;
});

afterAll(async () => {
  if (userId) await pool.query("DELETE FROM users WHERE id = $1", [userId]);
  if (otherUserId) await pool.query("DELETE FROM users WHERE id = $1", [otherUserId]);
  // ✅ Close connection to free up space for the next test
  await pool.end();
});

describe('Job Endpoints (AC #1, #8)', () => {
  it('should fetch an empty list of jobs for a new user', async () => {
    const res = await request(app).get('/api/jobs').set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body.jobs).toEqual([]);
  });

  it('should create a new job for the user', async () => {
    const res = await request(app).post('/api/jobs').set('Authorization', `Bearer ${token}`).send({
      title: 'Software Engineer',
      company: 'Test Co',
      required_skills: ['React']
    });
    expect(res.statusCode).toBe(200);
    jobId = res.body.job.id;
  });

  it('should update the job', async () => {
    const res = await request(app).put(`/api/jobs/${jobId}`).set('Authorization', `Bearer ${token}`).send({
      title: 'Senior Software Engineer'
    });
    expect(res.statusCode).toEqual(200);
    expect(res.body.job.title).toBe('Senior Software Engineer');
  });

  it('should delete the job', async () => {
    const res = await request(app).delete(`/api/jobs/${jobId}`).set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toEqual(200);
  });
});