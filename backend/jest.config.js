export default {
  testEnvironment: "node",
  transform: {}, // ✅ disables Babel transforms
  testMatch: ["**/tests/**/*.test.js"],
  setupFiles: ["<rootDir>/tests/setup.js"],
  verbose: true,
  collectCoverage: true,
  collectCoverageFrom: [
    "routes/**/*.js",
    "server.js",
    "auth.js",
    "utils/**/*.js",
    "!**/node_modules/**",
    "!**/coverage/**",
    "!**/tests/**"
  ],
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
  coverageReporters: [
    "text",
    "text-summary",
    "lcov",
    "html",
    "json",
    "json-summary"
  ],
  coverageDirectory: "coverage",
  // Ensure coverage table is shown
  coverageProvider: "v8",
};
