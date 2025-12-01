// backend/tests/resume.test.js

import request from 'supertest';
import app from '../server.js'; // Import your app
import { pool } from '../server.js'; // Import the pool for cleanup

// Variables to be used across the test suite
let token;
let userId;
let resumeId;
const testEmail = `resume_test_${Date.now()}@example.com`;

// 1. Run this block ONCE before all tests in this file
beforeAll(async () => {
  // Create and login a new, dedicated user for resume testing
  await request(app).post('/register').send({
    email: testEmail,
    password: 'Password123!',
    confirmPassword: 'Password123!',
    firstName: 'Resume',
    lastName: 'Test'
  });
  const resLogin = await request(app).post('/login').send({
    email: testEmail,
    password: 'Password123!'
  });
  token = resLogin.body.token; 
  
  // Get the user's ID
  const user = await pool.query("SELECT id FROM users WHERE email = $1", [testEmail]);
  userId = user.rows[0].id;
});

// 2. Run this block ONCE after all tests are done
afterAll(async () => {
  try {
    // Clean up: delete the test user (which deletes all their resumes)
    if (userId) {
      await pool.query("DELETE FROM users WHERE id = $1", [userId]);
    }
  } catch (err) {
    console.error("Error during cleanup:", err);
  }
  // Close the database connection (as per our setup)
  await pool.end();
});


describe('Resume Endpoints (AC #5 - Resume & Cover Letter)', () => {

  it('should start with an empty list of resumes', async () => {
    const res = await request(app)
      .get('/api/resumes')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('resumes');
    expect(res.body.resumes).toEqual([]);
  });

  it('should create a new resume (POST /api/resumes)', async () => {
    const res = await request(app)
      .post('/api/resumes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Software Dev Resume',
        template_name: 'Chronological',
        sections: { 
            profile: { title: 'John Doe', email: testEmail },
            education: []
        }
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.resume).toHaveProperty('id');
    expect(res.body.resume.title).toBe('Software Dev Resume');
    
    // Save ID for next tests
    resumeId = res.body.resume.id; 
  });

  it('should update the resume title (PUT /api/resumes/:id)', async () => {
    const res = await request(app)
      .put(`/api/resumes/${resumeId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Senior Software Dev Resume',
        template_name: 'Hybrid'
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body.resume.title).toBe('Senior Software Dev Resume');
    expect(res.body.resume.template_name).toBe('Hybrid');
  });

  it('should fail to update a resume with missing title', async () => {
    const res = await request(app)
      .put(`/api/resumes/${resumeId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: '', // Empty required field
      });

    expect(res.statusCode).toEqual(400);
    expect(res.body.error).toBe('Title is required for resume');
  });

  it('should delete the resume (DELETE /api/resumes/:id)', async () => {
    const res = await request(app)
      .delete(`/api/resumes/${resumeId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.message).toBe('Resume deleted successfully');
  });
});