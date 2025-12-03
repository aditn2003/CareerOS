import request from 'supertest';
import { app, pool } from '../server.js';

const email = `auth_test_${Date.now()}@example.com`;
const password = 'Password123!';

afterAll(async () => {
  await pool.query("DELETE FROM users WHERE email = $1", [email]);
  // ✅ Close connection to free up space for the next test
  await pool.end();
});

describe('Auth Endpoints', () => {
  it('should register a new user', async () => {
    const res = await request(app).post('/register').send({
      email,
      password,
      confirmPassword: password,
      firstName: 'Auth',
      lastName: 'Test'
    });
    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('token');
  });

  it('should login the user', async () => {
    const res = await request(app).post('/login').send({
      email,
      password
    });
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('token');
  });

  it('should fail to login with a bad password', async () => {
    const res = await request(app).post('/login').send({
      email,
      password: 'WrongPassword'
    });
    expect(res.statusCode).toEqual(401);
  });
});