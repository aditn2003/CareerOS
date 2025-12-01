// backend/tests/company.test.js

import request from 'supertest';
import app from '../server.js';
import { pool } from '../server.js';

// We need an auth token to run these tests.
// We'll create a user just for this test suite.
let token;
let userId;

beforeAll(async () => {
  // Create a new, random user for testing
  const email = `company_test_${Date.now()}@example.com`;
  
  await request(app).post('/register').send({
    email: email,
    password: 'Password123!',
    confirmPassword: 'Password123!',
    firstName: 'Company',
    lastName: 'Tester'
  });

  const resLogin = await request(app).post('/login').send({
    email: email,
    password: 'Password123!'
  });

  token = resLogin.body.token; 
  
  const user = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
  userId = user.rows[0].id;
});

afterAll(async () => {
  // Clean up the user
  if (userId) {
    await pool.query("DELETE FROM users WHERE id = $1", [userId]);
  }
  // Clean up the company we create
  await pool.query("DELETE FROM companies WHERE name = $1", ['Test Company Inc']);
  
  await pool.end();
});


describe('Company Endpoints (AC #3)', () => {

  // This test will take longer because it's calling the real OpenAI API
  it('should research a company', async () => {
    const res = await request(app)
      .post('/api/companies/research')
      .set('Authorization', `Bearer ${token}`)
      .send({ companyName: 'Test Company Inc' }); // Using a test company

    // Check for success
    expect(res.statusCode).toEqual(200);
    
    // Check that it returned the data
    expect(res.body.company).toHaveProperty('id');
    expect(res.body.company.name).toBe('Test Company Inc');
    expect(res.body.company.basics).toBeDefined();

  }, 15000); // <-- Increase timeout to 15 seconds for the API call

  it('should get company details', async () => {
    const res = await request(app)
      .get('/api/companies/Test Company Inc')
      .set('Authorization', `Bearer ${token}`);
      
    expect(res.statusCode).toEqual(200);
    expect(res.body.name).toBe('Test Company Inc');
  });

});