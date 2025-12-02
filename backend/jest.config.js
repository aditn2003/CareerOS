export default {
  testEnvironment: "node",
  transform: {}, // ✅ disables Babel transforms
  testMatch: ["**/tests/**/*.test.js"],
  setupFiles: ["<rootDir>/tests/setup.js"],
  verbose: true,
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
  coverageReporters: ["text", "lcov", "html", "json", "json-summary"],
  coverageDirectory: "coverage",
};
