// backend/tests/auth.test.js

import request from 'supertest';
import app from '../server.js';
import { pool } from '../server.js'; // <-- 1. IMPORT THE POOL


describe('Auth Endpoints', () => {

  it('should fail to login with a bad password', async () => {
    const res = await request(app)
      .post('/login')
      .send({
        email: 'test@example.com',
        password: 'a-completely-wrong-password'
      });

    expect(res.statusCode).toEqual(401);
    expect(res.body.error).toBe('Invalid email or password');
  });

});