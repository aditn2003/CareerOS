/**
 * Accessibility Testing Script
 * Run automated accessibility checks using axe-core
 * 
 * Usage:
 *   npm install --save-dev @axe-core/cli
 *   npx axe http://localhost:4000 --tags wcag2a,wcag2aa --save results.json
 */

// This file can be used with axe-core CLI or integrated into CI/CD

// Example: Run accessibility tests in CI/CD
// Add to package.json scripts:
// "test:a11y": "axe http://localhost:4000 --tags wcag2a,wcag2aa --save accessibility-results.json"

module.exports = {
  // Configuration for axe-core
  rules: {
    // Enable all WCAG 2.1 Level A and AA rules
    tags: ['wcag2a', 'wcag2aa'],
  },
  // Pages to test
  urls: [
    'http://localhost:4000',
    'http://localhost:4000/login',
    'http://localhost:4000/register',
    'http://localhost:4000/jobs',
    'http://localhost:4000/statistics',
    'http://localhost:4000/profile',
    'http://localhost:4000/interviews',
    'http://localhost:4000/network',
  ],
};

