/**
 * Example Test File
 * Demonstrates how to use the test infrastructure
 * 
 * This file serves as a reference for writing tests.
 * You can delete it once you understand the patterns.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createTestUser,
  createTestApp,
  authenticatedGet,
  authenticatedPost,
  expectSuccess,
  expectAuthError,
  seedCompleteUser,
  queryTestDb,
} from './helpers/index.js';

// Example: Testing a route that requires authentication
describe('Example Route Tests', () => {
  let app;
  let user;

  beforeEach(async () => {
    // Create a test Express app with your routes
    // Replace 'yourRoutes' with your actual route module
    // app = createTestApp(yourRoutes);
    
    // Create a test user with authentication token
    user = await createTestUser({
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
    });
  });

  it('should require authentication', async () => {
    // This test would fail without proper route setup
    // Uncomment and modify when you have actual routes to test
    
    // const response = await authenticatedGet(app, '/api/protected-route', null);
    // expectAuthError(response);
  });

  it('should handle authenticated requests', async () => {
    // Example of testing an authenticated endpoint
    // Uncomment and modify when you have actual routes to test
    
    // const response = await authenticatedGet(app, '/api/protected-route', user.token);
    // expectSuccess(response, 200);
    // expect(response.body).toHaveProperty('data');
  });

  it('should create and query test data', async () => {
    // Example of using the database directly
    const result = await queryTestDb('SELECT * FROM users WHERE id = $1', [user.id]);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].email).toBe(user.email);
  });

  it('should seed complete user data', async () => {
    // Example of seeding complete user profile
    const completeUser = await seedCompleteUser({
      email: 'complete@example.com',
    });

    expect(completeUser).toHaveProperty('id');
    expect(completeUser).toHaveProperty('educations');
    expect(completeUser).toHaveProperty('jobs');
    expect(completeUser).toHaveProperty('skills');
    expect(completeUser.educations.length).toBeGreaterThan(0);
    expect(completeUser.jobs.length).toBeGreaterThan(0);
  });
});

