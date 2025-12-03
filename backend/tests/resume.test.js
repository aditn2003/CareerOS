import request from 'supertest';
import { app, pool } from '../server.js';

let token;
let userId;
let resumeId;
const testEmail = `resume_test_${Date.now()}@example.com`;

beforeAll(async () => {
  await request(app).post('/register').send({
    email: testEmail, password: 'Password123!', confirmPassword: 'Password123!', firstName: 'Resume', lastName: 'Test'
  });
  const resLogin = await request(app).post('/login').send({ email: testEmail, password: 'Password123!' });
  token = resLogin.body.token;
  const user = await pool.query("SELECT id FROM users WHERE email = $1", [testEmail]);
  userId = user.rows[0].id;
});

afterAll(async () => {
  if (userId) await pool.query("DELETE FROM users WHERE id = $1", [userId]);
  // ✅ Close connection to free up space for the next test
  await pool.end();
});

describe('Resume Endpoints', () => {
  it('should create a new resume', async () => {
    const res = await request(app).post('/api/resumes').set('Authorization', `Bearer ${token}`).send({
      title: 'Software Dev Resume',
      template_name: 'Chronological',
      sections: { profile: { title: 'John Doe', email: testEmail }, education: [] }
    });
    expect(res.statusCode).toBe(200);
    resumeId = res.body.resume.id;
  });

  it('should delete the resume', async () => {
    const res = await request(app).delete(`/api/resumes/${resumeId}`).set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toEqual(200);
  });
});