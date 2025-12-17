/**
 * Global Vitest Setup File
 * Runs before each test file to configure the test environment
 * OPTIMIZED: Uses transaction-based isolation for much faster tests
 * ENHANCED: Global mocking for all AI/external API calls to prevent slow real API calls
 */

import dotenv from "dotenv";
import { beforeAll, afterAll, beforeEach, afterEach, vi } from "vitest";
import {
  setupTestDatabase,
  teardownTestDatabase,
  beginTransaction,
  rollbackTransaction,
  releaseQueryClient,
} from "./helpers/db.js";
import { resetMocks } from "./helpers/mocks.js";
import pool from "../db/pool.js";

// ============================================================
// GLOBAL AI/API MOCKING - Prevents ANY test from making real API calls
// This dramatically speeds up test execution and prevents flakiness
// ============================================================

// Create a vi.fn() mock for generateContent that tests can override
const mockGenerateContent = vi.fn(() =>
  Promise.resolve({
    response: {
      text: () =>
        JSON.stringify({
          summary_recommendation: "Mock AI response",
          optimized_experience: [],
          optimized_skills: [],
          ats_keywords: ["keyword1", "keyword2"],
          variation_options: [],
          percentile_10: 100000,
          percentile_25: 110000,
          percentile_50: 130000,
          percentile_75: 150000,
          percentile_90: 170000,
          total_comp_percentile_50: 150000,
          total_comp_percentile_75: 180000,
          total_comp_percentile_90: 200000,
          years_of_experience_min: 2,
          years_of_experience_max: 5,
          sample_size: 500,
          data_source: "mock_gemini",
          notes: "Mocked market data",
        }),
    },
  })
);

// Expose the mock globally so tests can override it
global.__mockGenerateContent = mockGenerateContent;

// Mock Google Generative AI globally
vi.mock("@google/generative-ai", () => {
  // Constructor function for GoogleGenerativeAI
  function GoogleGenerativeAI(apiKey) {
    this.apiKey = apiKey;
  }

  // Add prototype method that uses the mockable function
  GoogleGenerativeAI.prototype.getGenerativeModel = function (config) {
    return {
      generateContent: global.__mockGenerateContent,
    };
  };

  return {
    GoogleGenerativeAI: GoogleGenerativeAI,
    default: GoogleGenerativeAI,
  };
});

// Mock OpenAI globally
vi.mock("openai", () => {
  const mockCreate = vi.fn().mockResolvedValue({
    choices: [
      {
        message: {
          content: JSON.stringify({
            summary_recommendation: "Mock AI response",
            optimized_experience: [],
            optimized_skills: [],
            ats_keywords: ["keyword1", "keyword2"],
            variation_options: [],
          }),
        },
      },
    ],
  });

  // Create a proper constructor class
  class MockOpenAI {
    constructor(config) {
      this.config = config;
      this.chat = {
        completions: {
          create: mockCreate,
        },
      };
    }
  }

  return {
    default: MockOpenAI,
    OpenAI: MockOpenAI,
  };
});

// Mock Puppeteer globally (for PDF generation)
vi.mock("puppeteer", () => ({
  default: {
    launch: vi.fn().mockResolvedValue({
      newPage: vi.fn().mockResolvedValue({
        goto: vi.fn().mockResolvedValue(null),
        setContent: vi.fn().mockResolvedValue(null),
        content: vi
          .fn()
          .mockResolvedValue("<html><body>Mock PDF</body></html>"),
        pdf: vi.fn().mockResolvedValue(Buffer.from("mock pdf")),
        screenshot: vi.fn().mockResolvedValue(Buffer.from("mock image")),
        close: vi.fn().mockResolvedValue(null),
      }),
      close: vi.fn().mockResolvedValue(null),
    }),
  },
}));

// Mock Axios globally (for external API calls)
vi.mock("axios", () => {
  // Helper to generate mock OpenAI response for interview insights
  const mockInterviewInsightsResponse = () => ({
    data: {
      choices: [
        {
          message: {
            content: JSON.stringify({
              company: "Test Company",
              role: "Software Engineer",
              company_overview: "Mock company overview",
              culture_values: ["Innovation", "Teamwork"],
              interview_process: [
                "Phone screen",
                "Technical interview",
                "Onsite",
              ],
              common_questions: ["Tell me about yourself", "Why this company?"],
              role_specific_tips: ["Research the company", "Prepare examples"],
              salary_range: { min: 100000, max: 150000 },
              checklist: {
                research: ["Research company history", "Review recent news"],
                technical: ["Practice coding problems", "Review system design"],
                logistics: ["Confirm interview time", "Test video setup"],
                attire: "Business casual",
                portfolio: ["Update portfolio", "Prepare code samples"],
                confidence: ["Practice mock interviews", "Review achievements"],
                questions: [
                  "Ask about team culture",
                  "Ask about growth opportunities",
                ],
                followUp: ["Send thank you email", "Connect on LinkedIn"],
              },
              questions: [
                {
                  id: "q1",
                  question: "Mock question",
                  category: "behavioral",
                  difficulty: "medium",
                },
              ],
            }),
          },
        },
      ],
    },
  });

  // Helper to generate mock OpenAI response for follow-up templates
  const mockFollowUpTemplateResponse = () => ({
    data: {
      choices: [
        {
          message: {
            content: JSON.stringify({
              subjectLine: "Thank you for the interview opportunity",
              emailBody:
                "Dear [INTERVIEWER_NAME],\n\nThank you for taking the time to meet with me...",
              suggestedTiming: {
                sendDate: "2024-01-17",
                timeOfDay: "Morning (9-11 AM)",
                reasoning: "Best to send within 24-48 hours",
              },
              personalizationTips: [
                "Add specific discussion points",
                "Mention shared interests",
              ],
              dosList: ["Keep it concise", "Be professional"],
              dontsList: ["Don't be too casual", "Don't send immediately"],
            }),
          },
        },
      ],
    },
  });

  // Helper to generate mock SERP API response
  const mockSerpResponse = () => ({
    data: {
      organic_results: [
        {
          title: "Mock Result",
          link: "https://example.com",
          snippet: "Mock snippet",
        },
      ],
    },
  });

  // Smart mock that returns different responses based on URL
  const mockGet = vi.fn((url) => {
    if (url && url.includes("serpapi.com")) {
      return Promise.resolve(mockSerpResponse());
    }
    return Promise.resolve({ data: { mock: true } });
  });

  const mockPost = vi.fn((url, body) => {
    if (url && url.includes("api.openai.com")) {
      // Detect request type from the prompt content
      const messages = body?.messages || [];
      const userContent =
        messages.find((m) => m.role === "user")?.content || "";

      // Check if it's a follow-up template request
      if (
        userContent.includes("follow-up email") ||
        userContent.includes("Template Type:")
      ) {
        return Promise.resolve(mockFollowUpTemplateResponse());
      }

      // Default to interview insights response (includes all fields)
      return Promise.resolve(mockInterviewInsightsResponse());
    }
    return Promise.resolve({ data: { mock: true } });
  });

  return {
    default: {
      get: mockGet,
      post: mockPost,
      put: vi.fn().mockResolvedValue({ data: { mock: true } }),
      delete: vi.fn().mockResolvedValue({ data: { mock: true } }),
      create: vi.fn(() => ({
        get: mockGet,
        post: mockPost,
        put: vi.fn().mockResolvedValue({ data: { mock: true } }),
        delete: vi.fn().mockResolvedValue({ data: { mock: true } }),
      })),
    },
  };
});

// Mock Resend (email service) globally - pure JS, no vi.fn() to avoid Vite transformation
vi.mock("resend", () => {
  // Constructor function for Resend
  function Resend(apiKey) {
    this.apiKey = apiKey;
    this.emails = {
      send: function () {
        return Promise.resolve({ success: true, id: "mock-email-id" });
      },
      sendBatch: function () {
        return Promise.resolve({ success: true, sent: 0 });
      },
    };
  }

  return {
    Resend: Resend,
    default: Resend,
  };
});

// Mock Nodemailer globally
vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: vi
        .fn()
        .mockResolvedValue({ success: true, messageId: "mock-message-id" }),
    })),
  },
}));

console.log(
  "✅ Global AI/API mocks initialized - All external API calls will be mocked"
);

// Mock API Tracking Service to prevent foreign key violations
vi.mock("../utils/apiTrackingService.js", () => ({
  // trackApiCall wraps API calls and returns their result - pass through to the actual API call
  trackApiCall: vi.fn(async (serviceName, apiCallFn, options) => {
    // Execute the actual API call function and return its result
    return await apiCallFn();
  }),
  logApiUsage: vi.fn().mockResolvedValue(undefined),
  logApiError: vi.fn().mockResolvedValue(undefined),
}));

console.log("✅ API tracking service mocked - No database logging in tests");

// ============================================================
// End of Global Mocking Section
// ============================================================

// Load test environment variables
dotenv.config({ path: ".env.test" });

// Global test database connection pool
let testPool = null;
// Transaction client for current test
let transactionClient = null;
// Original pool.query method (for restoration)
let originalPoolQuery = null;
// Flag to track if database setup failed
let dbSetupFailed = false;

/**
 * Setup before all tests run
 */
beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = "test";

  // Ensure JWT_SECRET is set for all tests
  if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = "test-secret-key";
  }

  // Setup test database connection with retry logic
  try {
    // Optimized: Warm up the connection pool once
    testPool = await setupTestDatabase();

    // Set test schema search path
    if (testPool) {
      // Optimized: Prepare the connection pool by establishing an initial connection
      const warmUpClient = await testPool.connect();
      await warmUpClient.query("SET search_path TO test, public");
      warmUpClient.release();
    }

    // Store original pool.query method
    originalPoolQuery = pool.query.bind(pool);

    dbSetupFailed = false;
    console.log(
      "✅ Test environment initialized (optimized connection pooling)"
    );
  } catch (error) {
    console.error(
      "❌ Failed to setup test database after retries:",
      error.message
    );
    console.error(
      "💡 Make sure .env.test exists with DATABASE_URL pointing to your test database"
    );
    console.error(
      '💡 The test database should have a "test" schema with all tables'
    );
    // Don't throw - allow tests to continue (they'll fail individually if DB is needed)
    // This prevents all tests from being skipped
    testPool = null;
    dbSetupFailed = true;
  }
}, 180000); // Increased to 180s to prevent hook timeouts

/**
 * Cleanup after all tests complete
 */
afterAll(async () => {
  // Restore original pool.query if it was patched
  if (originalPoolQuery && pool.query !== originalPoolQuery) {
    pool.query = originalPoolQuery;
  }

  // Ensure any pending transaction is rolled back
  if (transactionClient) {
    await rollbackTransaction(transactionClient);
    transactionClient = null;
  }

  // Cleanup test database
  if (testPool) {
    await teardownTestDatabase(testPool);
  }

  console.log("✅ Test environment cleaned up");
});

/**
 * Setup before each test - Start transaction for isolation
 */
beforeEach(async () => {
  // Reset all mocks
  resetMocks();

  // Release any previous query client
  releaseQueryClient();

  // Start a new transaction for this test
  // All database operations will be rolled back automatically
  if (testPool) {
    try {
      transactionClient = await beginTransaction(testPool);
    } catch (error) {
      console.warn(
        "⚠️ Failed to begin transaction, test may fail:",
        error.message
      );
      // Don't throw - let the test run and fail naturally if DB is needed
      transactionClient = null;
    }

    // Patch pool.query to use transaction client during tests
    // This ensures routes that use pool.query() also use the transaction
    pool.query = async function (text, params, callback) {
      if (transactionClient) {
        try {
          // Use transaction client for all queries
          if (callback) {
            return transactionClient.query(text, params, callback);
          }
          return await transactionClient.query(text, params);
        } catch (error) {
          // Check if transaction is aborted - PostgreSQL aborts transactions on error
          if (
            error.message &&
            error.message.includes("current transaction is aborted")
          ) {
            // Rollback the aborted transaction immediately
            try {
              await transactionClient.query("ROLLBACK");
            } catch (rollbackError) {
              // Ignore rollback errors
            }
            // Clear the aborted transaction client
            transactionClient = null;
            global.transactionClient = null;
          }
          // Re-throw the error
          throw error;
        }
      }
      // Fallback to original if no transaction
      return originalPoolQuery(text, params, callback);
    };

    // Also patch pool.connect to return transaction client
    const originalPoolConnect = pool.connect.bind(pool);
    pool.connect = async function () {
      if (transactionClient) {
        // Return a proxy that uses transaction client with error handling
        return {
          query: async (text, params) => {
            try {
              return await transactionClient.query(text, params);
            } catch (error) {
              // Check if transaction is aborted
              if (
                error.message &&
                error.message.includes("current transaction is aborted")
              ) {
                // Rollback the aborted transaction immediately
                try {
                  await transactionClient.query("ROLLBACK");
                } catch (rollbackError) {
                  // Ignore rollback errors
                }
                // Clear the aborted transaction client
                transactionClient = null;
                global.transactionClient = null;
              }
              // Re-throw the error
              throw error;
            }
          },
          release: () => {}, // No-op for transaction client
        };
      }
      return originalPoolConnect();
    };

    // Make transaction client available globally for queryTestDb
    global.transactionClient = transactionClient;
  }
});

/**
 * Cleanup after each test - Rollback transaction (much faster than DELETE/TRUNCATE)
 */
afterEach(async () => {
  // Release query client
  releaseQueryClient();

  // Rollback transaction - this is MUCH faster than cleaning up data
  // All changes made during the test are automatically undone
  if (transactionClient) {
    await rollbackTransaction(transactionClient);
    transactionClient = null;
    global.transactionClient = null;
  }

  // Restore original pool methods
  if (originalPoolQuery) {
    pool.query = originalPoolQuery;
  }
});

// Export test pool and transaction client for use in tests
export { testPool, transactionClient, dbSetupFailed };
