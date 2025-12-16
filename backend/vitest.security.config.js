import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    testTimeout: 60000,
    hookTimeout: 60000,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
        isolate: false,
      },
    },
    threads: false,
    maxConcurrency: 1,
    // No setup files - security tests manage their own setup
    setupFiles: [],
    include: ['tests/security/**/*.test.js'],
    globals: true,
    coverage: { enabled: false },
  },
});

