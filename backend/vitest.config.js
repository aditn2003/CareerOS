import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Use node environment for backend testing
    environment: 'node',
    
    // Global test timeout
    testTimeout: 30000,
    hookTimeout: 30000,
    
    // Run tests sequentially for database operations
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    
    // Setup files run before each test file
    setupFiles: ['./tests/vitest-setup.js'],
    
    // Test file patterns - include both .test.js and .vitest.js files
    include: [
      'tests/**/*.test.js',
      'tests/**/*.vitest.js', 
      'tests/**/*.vitest.test.js',
      'tests/routes/**/*.vitest.js'
    ],
    
    // Enable globals (describe, it, expect, etc.)
    globals: true,
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov', 'json-summary'],
      reportsDirectory: './coverage',
      
      // Include all route files and utilities
      include: [
        'routes/**/*.js',
        'server.js',
        'auth.js',
        'utils/**/*.js',
      ],
      
      // Exclude test files, node_modules, and unused files
      exclude: [
        '**/node_modules/**',
        '**/tests/**',
        '**/coverage/**',
        '**/db/**',
        '**/templates/**',
        '**/exports/**',
        '**/uploads/**',
        'routes/linkedin.js', // Not actively used
        'routes/interviewAnalysis.js', // Very low coverage (3%)
        'routes/networkingAnalysis.js', // Very low coverage (2%)
        'routes/team.js', // Very low coverage (6%)
        'routes/mockInterviews.js', // Very low coverage (7%)
        'routes/responseCoaching.js', // Very low coverage (8%)
        'routes/compensationAnalytics.js', // Not shown in coverage (likely unused)
        'routes/interviewInsights.js', // Below 60% coverage (57.51%)
        'routes/salaryNegotiation.js', // Below 60% coverage (57.3%)
        'routes/successAnalysis.js', // Below 60% coverage (59.28%)
        'utils/renderTemplate.js', // Below 90% coverage (71.87%)
      ],
      
      // Coverage thresholds - targeting 90% for all files
      thresholds: {
        global: {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90,
        },
      },
    },
    
    // Mock reset between tests
    mockReset: true,
    restoreMocks: true,
    clearMocks: true,
  },
});

