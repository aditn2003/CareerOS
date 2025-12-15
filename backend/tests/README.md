# Test Infrastructure Documentation

This directory contains the comprehensive test infrastructure for the ATS application backend.

## Overview

The test infrastructure is designed to support 92%+ code coverage with:
- Isolated test database using a `test` schema
- Comprehensive test utilities and helpers
- Mock factories for common entities
- Automated setup and teardown

## Structure

```
tests/
├── helpers/
│   ├── index.js          # Central export point
│   ├── db.js             # Database setup/teardown utilities
│   ├── auth.js           # Authentication helpers
│   ├── seed.js           # Database seeding utilities
│   ├── api.js            # API request helpers (supertest wrappers)
│   ├── factories.js      # Mock data factories
│   ├── cleanup.js        # Test data cleanup utilities
│   └── mocks.js           # External service mocks
├── vitest-setup.js        # Global test configuration
└── README.md             # This file
```

## Setup

### 1. Environment Configuration

Create a `.env.test` file in the `backend` directory with your test database configuration:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/database
JWT_SECRET=test-secret-key
NODE_ENV=test
```

**Important**: The test infrastructure expects a `test` schema in your database with all the same tables as your main schema.

### 2. Test Database Schema

Ensure your test database has a `test` schema with all tables. You can create it by running:

```sql
CREATE SCHEMA IF NOT EXISTS test;
-- Then copy all table structures from public schema to test schema
```

## Usage

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests with UI
npm run test:ui
```

### Writing Tests

#### Basic Test Structure

```javascript
import { describe, it, expect } from 'vitest';
import { createTestUser, createAuthHeader } from '../helpers/index.js';
import { createTestApp, authenticatedGet } from '../helpers/index.js';
import myRoutes from '../../routes/myRoute.js';

describe('My Route Tests', () => {
  let app;
  let user;

  beforeEach(async () => {
    app = createTestApp(myRoutes);
    user = await createTestUser();
  });

  it('should handle GET request', async () => {
    const response = await authenticatedGet(app, '/api/my-route', user.token);
    expect(response.status).toBe(200);
  });
});
```

### Database Helpers

#### Setup and Teardown

```javascript
import { setupTestDatabase, teardownTestDatabase, queryTestDb } from '../helpers/db.js';

// Setup (usually done in vitest-setup.js)
const pool = await setupTestDatabase();

// Query test database
const result = await queryTestDb('SELECT * FROM users WHERE id = $1', [userId]);

// Teardown (usually done in vitest-setup.js)
await teardownTestDatabase(pool);
```

#### Transactions

```javascript
import { beginTransaction, rollbackTransaction } from '../helpers/db.js';

const client = await beginTransaction();
try {
  // Perform test operations
  await client.query('INSERT INTO users ...');
} finally {
  await rollbackTransaction(client);
}
```

### Authentication Helpers

```javascript
import { 
  createTestUser, 
  createTestUsers,
  createMockToken,
  createAuthHeader,
  createExpiredToken,
  createInvalidToken
} from '../helpers/auth.js';

// Create a test user with token
const user = await createTestUser({
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User'
});

// Create multiple users
const users = await createTestUsers(5);

// Create custom token
const token = createMockToken({ id: 1, email: 'user@example.com' });

// Create auth header
const headers = createAuthHeader(token);
```

### Seeding Test Data

```javascript
import {
  seedUserWithProfile,
  seedEducation,
  seedEmployment,
  seedSkills,
  seedJobs,
  seedResume,
  seedCompleteUser
} from '../helpers/seed.js';

// Seed a complete user with all data
const user = await seedCompleteUser({
  email: 'test@example.com',
  first_name: 'Test'
});

// Seed specific data
const educations = await seedEducation(userId, 2);
const jobs = await seedJobs(userId, 5);
```

### API Request Helpers

```javascript
import {
  createTestApp,
  authenticatedGet,
  authenticatedPost,
  authenticatedPut,
  authenticatedDelete,
  expectSuccess,
  expectError,
  expectAuthError
} from '../helpers/api.js';

const app = createTestApp(myRoutes);

// Authenticated requests
const response = await authenticatedGet(app, '/api/endpoint', user.token);
await authenticatedPost(app, '/api/endpoint', { data: 'value' }, user.token);

// Response assertions
expectSuccess(response, 200);
expectError(response, 400);
expectAuthError(response);
```

### Mock Factories

```javascript
import {
  createMockUser,
  createMockJob,
  createMockResume,
  createMultiple
} from '../helpers/factories.js';

// Create mock objects (not persisted to DB)
const mockUser = createMockUser({ email: 'test@example.com' });
const mockJob = createMockJob({ title: 'Software Engineer' });

// Create multiple mocks
const mockJobs = createMultiple(createMockJob, 5, { user_id: 1 });
```

### Cleanup Utilities

```javascript
import {
  deleteUser,
  deleteUserJobs,
  deleteUserResumes,
  deleteById,
  truncateTable
} from '../helpers/cleanup.js';

// Delete user and all related data
await deleteUser(userId);

// Delete specific data
await deleteUserJobs(userId);
await deleteById('jobs', jobId);

// Truncate table
await truncateTable('users');
```

### Mocks

```javascript
import { resetMocks, emailMocks, openaiMock } from '../helpers/mocks.js';

beforeEach(() => {
  resetMocks();
});

// Use mocks in tests
emailMocks.sendEmail.mockResolvedValue({ success: true });
openaiMock.chat.completions.create.mockResolvedValue({
  choices: [{ message: { content: 'AI response' } }]
});
```

## Best Practices

1. **Test Isolation**: Each test should be independent. Use `beforeEach` and `afterEach` hooks to set up and clean up test data.

2. **Use Transactions**: For tests that modify data, consider using transactions and rolling back after each test.

3. **Mock External Services**: Always mock external services (email, AI APIs, etc.) to avoid side effects and speed up tests.

4. **Use Factories**: Use factory functions to create test data consistently.

5. **Clean Up**: Always clean up test data after each test to prevent test pollution.

6. **Test Schema**: Always use the `test` schema. The setup file automatically sets the search path.

## Coverage Goals

- **Target**: 92%+ coverage for all metrics (branches, functions, lines, statements)
- **Current Threshold**: Configured in `vitest.config.js`

## Troubleshooting

### Database Connection Issues

- Ensure `.env.test` is properly configured
- Verify the `test` schema exists in your database
- Check that the database URL is correct

### Test Isolation Issues

- Ensure `cleanupTestData` is called in `afterEach`
- Check that transactions are properly rolled back
- Verify that mocks are reset between tests

### Schema Issues

- Ensure all tables exist in the `test` schema
- Check that foreign key constraints are properly set up
- Verify sequence reset is working correctly

## Next Steps

After Phase 1 is complete, proceed with:
- Phase 2: Route-level tests
- Phase 3: Service-level tests
- Phase 4: Integration tests
- Phase 5: Frontend tests

