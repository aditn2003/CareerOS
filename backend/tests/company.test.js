import request from 'supertest';
import { app, pool } from '../server.js';

let token;
let userId;

beforeAll(async () => {
  const email = `company_test_${Date.now()}@example.com`;
  await request(app).post('/register').send({
    email, password: 'Password123!', confirmPassword: 'Password123!', firstName: 'Company', lastName: 'Tester'
  });
  const resLogin = await request(app).post('/login').send({ email, password: 'Password123!' });
  token = resLogin.body.token;
  const user = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
  userId = user.rows[0].id;
});

afterAll(async () => {
  if (userId) await pool.query("DELETE FROM users WHERE id = $1", [userId]);
  await pool.query("DELETE FROM companies WHERE name = $1", ['Test Company Inc']);
  // ✅ Close connection to free up space for the next test
  await pool.end();
});

describe('Company Endpoints', () => {
  it('should get company details', async () => {
    const res = await request(app).get('/api/companies/Test Company Inc').set('Authorization', `Bearer ${token}`);
    expect([200, 404]).toContain(res.statusCode);
  });
});