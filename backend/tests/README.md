# Test Suite Documentation

## Overview

This test suite provides comprehensive unit test coverage for all Sprint 2 components of the ATS (Applicant Tracking System) application. The tests ensure code quality, prevent regressions, and maintain a minimum of 90% code coverage.

## Test Files

### 1. `jobManagement.test.js`
Tests all job management functions including:
- Job creation (POST /api/jobs)
- Job listing with filters (GET /api/jobs)
- Job retrieval by ID (GET /api/jobs/:id)
- Job updates (PUT /api/jobs/:id)
- Job status updates (PUT /api/jobs/:id/status)
- Job archiving and restoration
- Bulk operations (deadline updates)
- Job statistics
- Job deletion

### 2. `aiContentGeneration.test.js`
Tests AI content generation services with mocked APIs:
- Cover letter generation (POST /api/cover-letter/generate)
- Cover letter refinement (POST /api/cover-letter/refine)
- Resume optimization (POST /api/resumes/optimize)
- Resume reconciliation (POST /api/resumes/reconcile)
- Mocked OpenAI and Google Generative AI APIs

### 3. `companyResearch.test.js`
Tests company research integration:
- Company research fetching (GET /api/company-research)
- Wikipedia API integration
- News API integration
- OpenAI insights generation
- Interview preparation data generation
- Research export (JSON and text formats)
- Mocked external APIs

### 4. `applicationPipeline.test.js`
Tests application pipeline workflow:
- Job status transitions through pipeline stages
- Days in stage tracking
- Status update timestamps
- Bulk status updates
- Application materials tracking
- Pipeline statistics
- Archive and restore workflow

### 5. `resumeCoverLetter.test.js`
Tests resume and cover letter generation:
- Resume creation (POST /api/resumes)
- Resume listing (GET /api/resumes)
- Resume retrieval (GET /api/resumes/:id)
- Resume deletion (DELETE /api/resumes/:id)
- Cover letter creation (POST /api/cover-letter)
- Cover letter listing (GET /api/cover-letter)
- Cover letter deletion (DELETE /api/cover-letter/:id)

### 6. `jobMatching.test.js`
Tests job matching algorithm:
- Match analysis (POST /api/match/analyze)
- Custom weight configuration
- Default weight handling
- Match history saving
- Match history retrieval (GET /api/match/history/:userId)
- Score calculation with different ranges
- Mocked OpenAI API for match analysis

### 7. `databaseOperations.test.js`
Tests database operations for new entities:
- Jobs table operations (insert, query, update, JSONB handling)
- Resumes table operations (JSONB sections)
- Cover letters table operations
- Skills table operations
- Employment table operations
- Education table operations
- Application materials history
- Match history with JSONB fields
- Transaction handling and rollback
- Foreign key constraints
- Cascade delete operations

### 8. `apiEndpoints.test.js`
Tests all Sprint 2 API endpoints:
- Authentication endpoints (register, login)
- Job endpoints (CRUD operations)
- Resume endpoints
- Cover letter endpoints
- Company research endpoints
- Match endpoints
- Skills gap endpoint
- Authorization tests (preventing cross-user access)
- Error handling (401, 400, 404)

### 9. `jobImport.test.js`
Tests job import functionality:
- Job import from URL (POST /api/import-job)
- URL validation
- HTML parsing and text extraction
- AI-powered job data extraction
- Error handling for invalid URLs and API failures

## Running Tests

### Run all tests:
```bash
cd backend
npm test
```

### Run tests with coverage:
```bash
cd backend
npm test -- --coverage
```

### Run specific test file:
```bash
cd backend
npm test -- jobManagement.test.js
```

### Run tests in watch mode:
```bash
cd backend
npm test -- --watch
```

## Coverage Requirements

The test suite is configured to maintain a minimum of 90% code coverage across:
- **Branches**: 90%
- **Functions**: 90%
- **Lines**: 90%
- **Statements**: 90%

Coverage reports are generated in the `backend/coverage/` directory:
- HTML report: `coverage/lcov-report/index.html`
- LCOV report: `coverage/lcov.info`
- JSON summary: `coverage/coverage-summary.json`

## CI/CD Integration

Tests are automatically run in CI/CD pipeline (`.github/workflows/test.yml`) on:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches

The CI/CD pipeline:
1. Sets up PostgreSQL test database
2. Installs dependencies
3. Runs test suite with coverage
4. Uploads coverage reports to Codecov
5. Validates coverage threshold (90%)

## Test Setup

Tests use:
- **Jest** as the test framework
- **Supertest** for HTTP endpoint testing
- **Mocked APIs** for external services (OpenAI, Google Generative AI, Wikipedia, News API)
- **Test database** (PostgreSQL) for integration tests
- **Isolated test data** with cleanup after each test suite

## Mocking Strategy

External APIs are mocked to:
- Avoid API costs during testing
- Ensure consistent test results
- Test error handling scenarios
- Speed up test execution

Mocked services:
- OpenAI API (for cover letters, resume optimization, match analysis)
- Google Generative AI (for resume optimization, job import)
- Wikipedia API (for company research)
- News API (for company research)

## Best Practices

1. **Isolation**: Each test suite creates its own test data and cleans up afterward
2. **Independence**: Tests can run in any order without dependencies
3. **Comprehensive**: Tests cover happy paths, error cases, and edge cases
4. **Maintainable**: Tests are well-organized and documented
5. **Fast**: Tests use mocks to avoid slow external API calls

## Troubleshooting

### Tests failing with database connection errors:
- Ensure PostgreSQL is running
- Check `DATABASE_URL` environment variable
- Verify test database exists

### Tests failing with authentication errors:
- Check JWT_SECRET is set in test environment
- Verify token generation in test setup

### Coverage below threshold:
- Review uncovered code in coverage report
- Add tests for missing branches/statements
- Check that all routes are tested

## Future Enhancements

Potential improvements:
- Add frontend component tests
- Add E2E tests with Playwright/Cypress
- Add performance tests
- Add load tests
- Expand integration test coverage

