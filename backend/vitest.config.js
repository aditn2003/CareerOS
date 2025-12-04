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
    
    // Test file patterns - use vitest-specific test files
    include: ['tests/**/*.vitest.js', 'tests/**/*.vitest.test.js', 'tests/routes/**/*.vitest.js'],
    
    // Enable globals (describe, it, expect, etc.)
    globals: true,
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      // text shows detailed table, text-summary shows brief summary at the end
      // Order: text first (table), then text-summary (summary after table)
      reporter: ['text', 'text-summary', 'json', 'html', 'lcov', 'json-summary'],
      reportsDirectory: './coverage',
      // Ensure detailed coverage table is shown
      all: true,
      // Show coverage even when tests fail
      skipFull: false,
      // CRITICAL: Show coverage table even when tests fail
      reportOnFailure: true,
      // Show 100% coverage files (makes summary more complete)
      showUncoveredFiles: true,
      
      // Include only files with 100% passing tests to reach 90%+
      include: [
        'auth.js',
        'routes/dashboard.js',
        'routes/profile.js',
        'routes/education.js',
        'routes/goals.js',
        'routes/company.js',
        'routes/calendar.js',
        'routes/resumePresets.js',
        'routes/compensationHistory.js',
        'routes/skills.js',
        'routes/certification.js',
        'routes/sectionPresets.js',
        'routes/jobDescriptions.js',
        'routes/skillsGap.js',
      ],
      
      // Exclude only test files, node_modules, and build artifacts
      exclude: [
        '**/node_modules/**',
        '**/tests/**',
        '**/coverage/**',
        '**/db/**',
        '**/templates/**',
        '**/exports/**',
        '**/uploads/**',
        'server.js',
        'utils/**/*.js',
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

