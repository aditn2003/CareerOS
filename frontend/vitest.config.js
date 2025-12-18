import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    // Use jsdom for DOM simulation (React components need this)
    environment: "jsdom",

    // Global test timeout
    testTimeout: 30000,
    hookTimeout: 30000,

    // Setup files run before each test file
    setupFiles: ["./src/__tests__/setup.js"],

    // Test file patterns
    include: [
      "src/**/*.test.{js,jsx,ts,tsx}",
      "src/**/*.spec.{js,jsx,ts,tsx}",
      "src/__tests__/**/*.{js,jsx,ts,tsx}",
    ],

    // Exclude patterns
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "src/__tests__/setup.js",
      "src/__tests__/helpers/**",
      "src/__tests__/mocks/**",
    ],

    // Enable globals (describe, it, expect, etc.)
    globals: true,

    // Coverage configuration
    coverage: {
      enabled: false, // Enable with --coverage flag
      provider: "v8",
      reporter: ["text", "json", "html", "lcov", "json-summary"],
      reportsDirectory: "./coverage",

      // Include source files
      include: [
        "src/components/**/*.{js,jsx}",
        "src/pages/**/*.{js,jsx}",
        "src/contexts/**/*.{js,jsx}",
        "src/utils/**/*.{js,jsx}",
        "src/api.js",
        "src/App.jsx",
      ],

      // Exclude test files and non-testable code
      exclude: [
        "**/node_modules/**",
        "**/__tests__/**",
        "**/*.test.{js,jsx}",
        "**/*.spec.{js,jsx}",
        "**/coverage/**",
        "src/main.jsx", // Entry point
        "**/*.css",
        "**/*.d.ts",
      ],

      // Coverage thresholds - will increase as more tests are added
      // Start with realistic thresholds based on current coverage
      thresholds: {
        // Uncomment and adjust as coverage improves:
        // global: {
        //   branches: 90,
        //   functions: 90,
        //   lines: 90,
        //   statements: 90,
        // },
      },
    },

    // Mock configuration
    mockReset: true,
    restoreMocks: true,
    clearMocks: true,

    // Reporter configuration
    reporter: ["verbose"],

    // CSS handling
    css: {
      modules: {
        classNameStrategy: "non-scoped",
      },
    },
  },

  // Resolve aliases (match Vite config if any)
  resolve: {
    alias: {
      "@": "/src",
    },
  },
});

