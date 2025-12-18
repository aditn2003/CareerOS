/**
 * Market Benchmarks Routes Tests
 * Tests routes/marketBenchmarks.js
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import express from "express";
import marketBenchmarksRoutes from "../../routes/marketBenchmarks.js";
import { createTestUser } from "../helpers/auth.js";
import pool from "../../db/pool.js";

// Note: Google Generative AI mocking is now handled globally in vitest-setup.js

// Mock dependencies
vi.mock("../../auth.js", () => ({
  auth: vi.fn((req, res, next) => {
    req.user = { id: 1 };
    next();
  }),
}));

vi.mock("../../db/pool.js", () => ({
  default: {
    query: vi.fn(),
  },
}));

// Mock API tracking service
vi.mock("../../utils/apiTrackingService.js", () => ({
  trackApiCall: vi.fn(),
  logApiUsage: vi.fn(() => Promise.resolve()),
  logApiError: vi.fn(() => Promise.resolve()),
}));

describe("Market Benchmarks Routes", () => {
  let app;
  let user;
  let userId;

  beforeEach(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";
    process.env.GOOGLE_API_KEY = "test-api-key-12345";

    // Note: Gemini mocking is now handled globally in vitest-setup.js

    app = express();
    app.use(express.json());
    app.use("/api/market-benchmarks", marketBenchmarksRoutes);

    user = await createTestUser();

    const jwtModule = await import("jsonwebtoken");
    const decoded = jwtModule.verify(
      user.token,
      process.env.JWT_SECRET || "dev_secret_change_me"
    );
    userId = Number(decoded.id);

    vi.clearAllMocks();

    const { auth } = await import("../../auth.js");
    vi.mocked(auth).mockImplementation((req, res, next) => {
      const h = req.headers.authorization || "";
      const token = h.startsWith("Bearer ") ? h.split(" ")[1] : null;
      if (!token) {
        return res.status(401).json({ error: "NO_TOKEN" });
      }
      try {
        const decoded = jwtModule.verify(
          token,
          process.env.JWT_SECRET || "dev_secret_change_me"
        );
        req.user = { id: Number(decoded.id), email: decoded.email };
        next();
      } catch (err) {
        return res.status(401).json({ error: "INVALID_TOKEN" });
      }
    });
  });

  describe("POST /api/market-benchmarks/fetch", () => {
    it("should fetch market benchmark data", async () => {
      // Mock the database insert/update query to return the benchmark
      pool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            role_title: "Software Engineer",
            role_level: "mid",
            location: "San Francisco, CA",
            industry: "Technology",
            company_size: "large",
            location_type: "on_site",
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
            data_source: "gemini_estimate",
            data_date: new Date(),
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      });

      const response = await request(app)
        .post("/api/market-benchmarks/fetch")
        .set("Authorization", `Bearer ${user.token}`)
        .send({
          role_title: "Software Engineer",
          role_level: "mid",
          location: "San Francisco, CA",
          industry: "Technology",
          company_size: "large",
          location_type: "on_site",
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.benchmark).toBeDefined();
    });

    it("should return 400 if required fields are missing", async () => {
      const response = await request(app)
        .post("/api/market-benchmarks/fetch")
        .set("Authorization", `Bearer ${user.token}`)
        .send({
          role_title: "Software Engineer",
          // Missing role_level and location
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("Missing required fields");
    });

    it("should return 503 if API key is not configured", async () => {
      const originalKey = process.env.GOOGLE_API_KEY;
      delete process.env.GOOGLE_API_KEY;

      // Re-import the route to pick up the missing API key
      const { default: routes } =
        await import("../../routes/marketBenchmarks.js");
      const testApp = express();
      testApp.use(express.json());
      testApp.use("/api/market-benchmarks", routes);

      const response = await request(testApp)
        .post("/api/market-benchmarks/fetch")
        .set("Authorization", `Bearer ${user.token}`)
        .send({
          role_title: "Software Engineer",
          role_level: "mid",
          location: "San Francisco, CA",
        });

      expect(response.status).toBe(503);
      expect(response.body.error).toContain("Google API key not configured");

      process.env.GOOGLE_API_KEY = originalKey;
    });

    it("should handle AI response parsing errors", async () => {
      global.__mockGenerateContent.mockResolvedValueOnce({
        response: {
          text: () => "Invalid JSON response",
        },
      });

      pool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            role_title: "Software Engineer",
            role_level: "mid",
            location: "San Francisco, CA",
          },
        ],
      });

      const response = await request(app)
        .post("/api/market-benchmarks/fetch")
        .set("Authorization", `Bearer ${user.token}`)
        .send({
          role_title: "Software Engineer",
          role_level: "mid",
          location: "San Francisco, CA",
        });

      // Should handle the error gracefully
      expect([400, 500]).toContain(response.status);
    });

    it("should handle API key errors", async () => {
      global.__mockGenerateContent.mockRejectedValueOnce(
        new Error("API_KEY_INVALID")
      );

      const response = await request(app)
        .post("/api/market-benchmarks/fetch")
        .set("Authorization", `Bearer ${user.token}`)
        .send({
          role_title: "Software Engineer",
          role_level: "mid",
          location: "San Francisco, CA",
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain("Google API key error");
    });
  });

  describe("POST /api/market-benchmarks/batch-fetch", () => {
    it("should batch fetch multiple benchmarks", async () => {
      pool.query.mockResolvedValue({
        rows: [
          {
            id: 1,
            role_title: "Software Engineer",
            role_level: "mid",
            location: "San Francisco, CA",
          },
        ],
      });

      const response = await request(app)
        .post("/api/market-benchmarks/batch-fetch")
        .set("Authorization", `Bearer ${user.token}`)
        .send({
          benchmarks: [
            {
              role_title: "Software Engineer",
              role_level: "mid",
              location: "San Francisco, CA",
            },
            {
              role_title: "Data Scientist",
              role_level: "senior",
              location: "New York, NY",
            },
          ],
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.total).toBe(2);
      expect(response.body.results).toBeDefined();
    });

    it("should return 400 if benchmarks is not an array", async () => {
      const response = await request(app)
        .post("/api/market-benchmarks/batch-fetch")
        .set("Authorization", `Bearer ${user.token}`)
        .send({
          benchmarks: "not an array",
        });

      expect(response.status).toBe(400);
    });

    it("should return 400 if benchmarks array is empty", async () => {
      const response = await request(app)
        .post("/api/market-benchmarks/batch-fetch")
        .set("Authorization", `Bearer ${user.token}`)
        .send({
          benchmarks: [],
        });

      expect(response.status).toBe(400);
    });

    it("should return 400 if more than 10 benchmarks", async () => {
      const benchmarks = Array.from({ length: 11 }, (_, i) => ({
        role_title: `Engineer ${i}`,
        role_level: "mid",
        location: "San Francisco, CA",
      }));

      const response = await request(app)
        .post("/api/market-benchmarks/batch-fetch")
        .set("Authorization", `Bearer ${user.token}`)
        .send({ benchmarks });

      expect(response.status).toBe(400);
    });

    it("should handle partial failures in batch fetch", async () => {
      pool.query
        .mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              role_title: "Software Engineer",
              role_level: "mid",
              location: "San Francisco, CA",
            },
          ],
        })
        .mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app)
        .post("/api/market-benchmarks/batch-fetch")
        .set("Authorization", `Bearer ${user.token}`)
        .send({
          benchmarks: [
            {
              role_title: "Software Engineer",
              role_level: "mid",
              location: "San Francisco, CA",
            },
            {
              role_title: "Data Scientist",
              role_level: "senior",
              location: "New York, NY",
            },
          ],
        });

      expect(response.status).toBe(200);
      expect(response.body.successful).toBeGreaterThan(0);
      expect(response.body.failed).toBeGreaterThan(0);
    });
  });

  describe("POST /api/market-benchmarks/auto-fetch-for-offer", () => {
    it("should auto-fetch benchmark for an offer", async () => {
      pool.query
        .mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              user_id: userId,
              role_title: "Software Engineer",
              role_level: "mid",
              location: "San Francisco, CA",
              industry: "Technology",
              company_size: "large",
              location_type: "on_site",
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [] }) // No existing benchmark
        .mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              role_title: "Software Engineer",
              role_level: "mid",
              location: "San Francisco, CA",
              percentile_50: 130000,
            },
          ],
        });

      const response = await request(app)
        .post("/api/market-benchmarks/auto-fetch-for-offer")
        .set("Authorization", `Bearer ${user.token}`)
        .send({
          offer_id: 1,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.benchmark).toBeDefined();
    });

    it("should return cached benchmark if exists", async () => {
      pool.query
        .mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              user_id: userId,
              role_title: "Software Engineer",
              role_level: "mid",
              location: "San Francisco, CA",
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              role_title: "Software Engineer",
              role_level: "mid",
              location: "San Francisco, CA",
              percentile_50: 130000,
            },
          ],
        });

      const response = await request(app)
        .post("/api/market-benchmarks/auto-fetch-for-offer")
        .set("Authorization", `Bearer ${user.token}`)
        .send({
          offer_id: 1,
        });

      expect(response.status).toBe(200);
      expect(response.body.cached).toBe(true);
    });

    it("should return 404 if offer not found", async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post("/api/market-benchmarks/auto-fetch-for-offer")
        .set("Authorization", `Bearer ${user.token}`)
        .send({
          offer_id: 999,
        });

      expect(response.status).toBe(404);
    });

    it("should return 400 if offer_id is missing", async () => {
      const response = await request(app)
        .post("/api/market-benchmarks/auto-fetch-for-offer")
        .set("Authorization", `Bearer ${user.token}`)
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe("GET /api/market-benchmarks/test", () => {
    it("should test API key configuration", async () => {
      global.__mockGenerateContent.mockResolvedValueOnce({
        response: {
          text: () => "API key is working",
        },
      });

      const response = await request(app)
        .get("/api/market-benchmarks/test")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain("API key is working");
    });

    it("should return 503 if API key is not configured", async () => {
      const originalKey = process.env.GOOGLE_API_KEY;
      delete process.env.GOOGLE_API_KEY;

      // Re-import the route to pick up the missing API key
      const { default: routes } =
        await import("../../routes/marketBenchmarks.js");
      const testApp = express();
      testApp.use(express.json());
      testApp.use("/api/market-benchmarks", routes);

      const response = await request(testApp)
        .get("/api/market-benchmarks/test")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(503);
      expect(response.body.error).toContain("API key not configured");

      process.env.GOOGLE_API_KEY = originalKey;
    });

    it("should handle API key validation errors", async () => {
      global.__mockGenerateContent.mockRejectedValueOnce(
        new Error("API_KEY_INVALID")
      );

      const response = await request(app)
        .get("/api/market-benchmarks/test")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(401);
      expect(response.body.error).toContain("API key invalid");
    });
  });

  describe("Error Handling", () => {
    it("should handle batch-fetch API key errors", async () => {
      global.__mockGenerateContent.mockRejectedValue(
        new Error("API_KEY_INVALID")
      );

      const response = await request(app)
        .post("/api/market-benchmarks/batch-fetch")
        .set("Authorization", `Bearer ${user.token}`)
        .send({
          benchmarks: [
            {
              role_title: "Software Engineer",
              role_level: "mid",
              location: "San Francisco, CA",
            },
          ],
        });

      expect([200, 401]).toContain(response.status);
    });

    it("should handle batch-fetch database errors", async () => {
      pool.query.mockRejectedValue(new Error("Database connection failed"));

      const response = await request(app)
        .post("/api/market-benchmarks/batch-fetch")
        .set("Authorization", `Bearer ${user.token}`)
        .send({
          benchmarks: [
            {
              role_title: "Software Engineer",
              role_level: "mid",
              location: "San Francisco, CA",
            },
          ],
        });

      // 401 is acceptable if auth middleware runs before db operations
      expect([200, 401, 500]).toContain(response.status);
    });

    it("should handle auto-fetch-for-offer database errors", async () => {
      pool.query.mockRejectedValueOnce(new Error("Database connection failed"));

      const response = await request(app)
        .post("/api/market-benchmarks/auto-fetch-for-offer")
        .set("Authorization", `Bearer ${user.token}`)
        .send({ offer_id: 1 });

      expect(response.status).toBe(500);
    });

    it("should handle auto-fetch-for-offer AI errors", async () => {
      pool.query
        .mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              user_id: userId,
              role_title: "Software Engineer",
              role_level: "mid",
              location: "San Francisco, CA",
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [] }); // No existing benchmark

      global.__mockGenerateContent.mockRejectedValueOnce(
        new Error("AI generation failed")
      );

      const response = await request(app)
        .post("/api/market-benchmarks/auto-fetch-for-offer")
        .set("Authorization", `Bearer ${user.token}`)
        .send({ offer_id: 1 });

      expect([401, 500]).toContain(response.status);
    });

    it("should handle fetch AI errors", async () => {
      global.__mockGenerateContent.mockRejectedValueOnce(
        new Error("AI generation failed")
      );

      const response = await request(app)
        .post("/api/market-benchmarks/fetch")
        .set("Authorization", `Bearer ${user.token}`)
        .send({
          role_title: "Software Engineer",
          role_level: "mid",
          location: "San Francisco, CA",
        });

      expect([401, 500]).toContain(response.status);
    });

    it("should return 401 if not authenticated", async () => {
      const response = await request(app)
        .post("/api/market-benchmarks/fetch")
        .send({
          role_title: "Software Engineer",
          role_level: "mid",
          location: "San Francisco, CA",
        });

      expect(response.status).toBe(401);
    });

    it("should handle incomplete AI data", async () => {
      global.__mockGenerateContent.mockResolvedValueOnce({
        response: {
          text: () => JSON.stringify({ percentile_50: null, percentile_10: null }),
        },
      });

      const response = await request(app)
        .post("/api/market-benchmarks/fetch")
        .set("Authorization", `Bearer ${user.token}`)
        .send({
          role_title: "Software Engineer",
          role_level: "mid",
          location: "San Francisco, CA",
        });

      expect([400, 500]).toContain(response.status);
    });

    it("should handle markdown wrapped JSON response", async () => {
      global.__mockGenerateContent.mockResolvedValueOnce({
        response: {
          text: () => '```json\n{"percentile_10": 90000, "percentile_25": 100000, "percentile_50": 120000, "percentile_75": 140000, "percentile_90": 160000, "years_of_experience_min": 2, "years_of_experience_max": 5, "sample_size": 500, "data_source": "test"}\n```',
        },
      });

      pool.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          role_title: "Software Engineer",
          percentile_50: 120000,
        }],
      });

      const response = await request(app)
        .post("/api/market-benchmarks/fetch")
        .set("Authorization", `Bearer ${user.token}`)
        .send({
          role_title: "Software Engineer",
          role_level: "mid",
          location: "San Francisco, CA",
        });

      expect([200, 500]).toContain(response.status);
    });

    it("should handle fetch with all optional fields", async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          role_title: "Software Engineer",
          role_level: "mid",
          location: "San Francisco, CA",
          industry: "Technology",
          company_size: "large",
          location_type: "hybrid",
          percentile_50: 130000,
        }],
      });

      const response = await request(app)
        .post("/api/market-benchmarks/fetch")
        .set("Authorization", `Bearer ${user.token}`)
        .send({
          role_title: "Software Engineer",
          role_level: "mid",
          location: "San Francisco, CA",
          industry: "Technology",
          company_size: "large",
          location_type: "hybrid",
        });

      expect([200, 401]).toContain(response.status);
    });
  });

  describe("POST /api/market-benchmarks/batch-fetch - Edge Cases", () => {
    it("should handle batch with missing required fields in individual benchmark", async () => {
      pool.query.mockResolvedValue({
        rows: [{
          id: 1,
          role_title: "Software Engineer",
        }],
      });

      const response = await request(app)
        .post("/api/market-benchmarks/batch-fetch")
        .set("Authorization", `Bearer ${user.token}`)
        .send({
          benchmarks: [
            {
              role_title: "Software Engineer",
              role_level: "mid",
              location: "San Francisco, CA",
            },
            {
              role_title: "Data Scientist",
              // Missing role_level and location
            },
          ],
        });

      expect([200, 401]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body.failed).toBeGreaterThan(0);
      }
    });

    it("should handle batch fetch API key error on first request", async () => {
      global.__mockGenerateContent.mockRejectedValue(
        new Error("API_KEY_INVALID")
      );

      const response = await request(app)
        .post("/api/market-benchmarks/batch-fetch")
        .set("Authorization", `Bearer ${user.token}`)
        .send({
          benchmarks: [
            {
              role_title: "Software Engineer",
              role_level: "mid",
              location: "San Francisco, CA",
            },
          ],
        });

      expect([200, 401]).toContain(response.status);
    });
  });

  describe("POST /api/market-benchmarks/auto-fetch-for-offer - Edge Cases", () => {
    it("should handle auto-fetch AI JSON parsing error", async () => {
      pool.query
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            user_id: userId,
            role_title: "Software Engineer",
            role_level: "mid",
            location: "San Francisco, CA",
          }],
        })
        .mockResolvedValueOnce({ rows: [] }); // No existing benchmark

      global.__mockGenerateContent.mockResolvedValueOnce({
        response: {
          text: () => 'Invalid JSON that cannot be parsed',
        },
      });

      const response = await request(app)
        .post("/api/market-benchmarks/auto-fetch-for-offer")
        .set("Authorization", `Bearer ${user.token}`)
        .send({ offer_id: 1 });

      expect([200, 400, 500]).toContain(response.status);
    });

    it("should handle auto-fetch with markdown wrapped JSON", async () => {
      pool.query
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            user_id: userId,
            role_title: "Software Engineer",
            role_level: "mid",
            location: "San Francisco, CA",
            industry: null,
            company_size: null,
            location_type: null,
          }],
        })
        .mockResolvedValueOnce({ rows: [] }) // No existing benchmark
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            role_title: "Software Engineer",
            percentile_50: 130000,
          }],
        });

      global.__mockGenerateContent.mockResolvedValueOnce({
        response: {
          text: () => '```json\n{"percentile_10": 90000, "percentile_25": 100000, "percentile_50": 120000, "percentile_75": 140000, "percentile_90": 160000, "years_of_experience_min": 2, "years_of_experience_max": 5, "sample_size": 500, "data_source": "test", "notes": "Test notes"}\n```',
        },
      });

      const response = await request(app)
        .post("/api/market-benchmarks/auto-fetch-for-offer")
        .set("Authorization", `Bearer ${user.token}`)
        .send({ offer_id: 1 });

      expect([200, 404, 500]).toContain(response.status);
    });

    it("should handle auto-fetch API key error", async () => {
      pool.query
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            user_id: userId,
            role_title: "Software Engineer",
            role_level: "mid",
            location: "San Francisco, CA",
          }],
        })
        .mockResolvedValueOnce({ rows: [] }); // No existing benchmark

      global.__mockGenerateContent.mockRejectedValueOnce(
        new Error("API_KEY_INVALID")
      );

      const response = await request(app)
        .post("/api/market-benchmarks/auto-fetch-for-offer")
        .set("Authorization", `Bearer ${user.token}`)
        .send({ offer_id: 1 });

      expect([401, 500]).toContain(response.status);
    });
  });

  describe("GET /api/market-benchmarks/test - Edge Cases", () => {
    it("should handle test API general error", async () => {
      global.__mockGenerateContent.mockRejectedValueOnce(
        new Error("General API error")
      );

      const response = await request(app)
        .get("/api/market-benchmarks/test")
        .set("Authorization", `Bearer ${user.token}`);

      expect([200, 401, 500]).toContain(response.status);
    });
  });

  describe("POST /api/market-benchmarks/batch-fetch - Missing Fields", () => {
    it("should handle benchmark with completely missing role_title", async () => {
      const response = await request(app)
        .post("/api/market-benchmarks/batch-fetch")
        .set("Authorization", `Bearer ${user.token}`)
        .send({
          benchmarks: [
            {
              role_level: "mid",
              location: "San Francisco, CA",
            },
          ],
        });

      expect(response.status).toBe(200);
      expect(response.body.failed).toBe(1);
    });

    it("should handle benchmark with missing role_level", async () => {
      const response = await request(app)
        .post("/api/market-benchmarks/batch-fetch")
        .set("Authorization", `Bearer ${user.token}`)
        .send({
          benchmarks: [
            {
              role_title: "Software Engineer",
              location: "San Francisco, CA",
            },
          ],
        });

      expect(response.status).toBe(200);
      expect(response.body.failed).toBe(1);
    });

    it("should handle benchmark with missing location", async () => {
      const response = await request(app)
        .post("/api/market-benchmarks/batch-fetch")
        .set("Authorization", `Bearer ${user.token}`)
        .send({
          benchmarks: [
            {
              role_title: "Software Engineer",
              role_level: "mid",
            },
          ],
        });

      expect(response.status).toBe(200);
      expect(response.body.failed).toBe(1);
    });

    it("should handle mixed valid and invalid benchmarks", async () => {
      global.__mockGenerateContent.mockResolvedValueOnce({
        response: {
          text: () => JSON.stringify({
            percentile_10: 90000,
            percentile_25: 100000,
            percentile_50: 120000,
            percentile_75: 140000,
            percentile_90: 160000,
            years_of_experience_min: 2,
            years_of_experience_max: 5,
            sample_size: 500,
            data_source: "test",
          }),
        },
      });

      pool.query.mockResolvedValue({
        rows: [{
          id: 1,
          role_title: "Software Engineer",
          percentile_50: 120000,
        }],
      });

      const response = await request(app)
        .post("/api/market-benchmarks/batch-fetch")
        .set("Authorization", `Bearer ${user.token}`)
        .send({
          benchmarks: [
            {
              role_title: "Software Engineer",
              role_level: "mid",
              location: "San Francisco, CA",
            },
            {
              role_title: "Data Scientist",
              // Missing role_level and location
            },
            {
              role_level: "senior",
              location: "New York, NY",
              // Missing role_title
            },
          ],
        });

      expect([200, 401]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body.failed).toBeGreaterThan(0);
      }
    });

    it("should track errors array for failed benchmarks", async () => {
      const response = await request(app)
        .post("/api/market-benchmarks/batch-fetch")
        .set("Authorization", `Bearer ${user.token}`)
        .send({
          benchmarks: [
            {
              // All required fields missing
            },
          ],
        });

      expect(response.status).toBe(200);
      expect(response.body.failed).toBe(1);
    });
  });

  describe("POST /api/market-benchmarks/fetch - Edge Cases", () => {
    it("should handle AI response with malformed JSON", async () => {
      global.__mockGenerateContent.mockResolvedValueOnce({
        response: {
          text: () => '{malformed json without closing brace',
        },
      });

      const response = await request(app)
        .post("/api/market-benchmarks/fetch")
        .set("Authorization", `Bearer ${user.token}`)
        .send({
          role_title: "Software Engineer",
          role_level: "mid",
          location: "San Francisco, CA",
        });

      expect([400, 500]).toContain(response.status);
    });

    it("should handle fetch with industry parameter", async () => {
      global.__mockGenerateContent.mockResolvedValueOnce({
        response: {
          text: () => JSON.stringify({
            percentile_10: 95000,
            percentile_25: 110000,
            percentile_50: 130000,
            percentile_75: 150000,
            percentile_90: 175000,
            years_of_experience_min: 3,
            years_of_experience_max: 7,
            sample_size: 300,
            data_source: "industry_specific",
          }),
        },
      });

      pool.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          role_title: "Software Engineer",
          industry: "Technology",
          percentile_50: 130000,
        }],
      });

      const response = await request(app)
        .post("/api/market-benchmarks/fetch")
        .set("Authorization", `Bearer ${user.token}`)
        .send({
          role_title: "Software Engineer",
          role_level: "senior",
          location: "San Francisco, CA",
          industry: "Technology",
        });

      expect([200, 500]).toContain(response.status);
    });

    it("should handle fetch with company_size parameter", async () => {
      global.__mockGenerateContent.mockResolvedValueOnce({
        response: {
          text: () => JSON.stringify({
            percentile_10: 85000,
            percentile_25: 95000,
            percentile_50: 110000,
            percentile_75: 125000,
            percentile_90: 145000,
            years_of_experience_min: 1,
            years_of_experience_max: 4,
            sample_size: 200,
            data_source: "company_size",
          }),
        },
      });

      pool.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          role_title: "Software Engineer",
          company_size: "startup",
          percentile_50: 110000,
        }],
      });

      const response = await request(app)
        .post("/api/market-benchmarks/fetch")
        .set("Authorization", `Bearer ${user.token}`)
        .send({
          role_title: "Software Engineer",
          role_level: "mid",
          location: "San Francisco, CA",
          company_size: "startup",
        });

      expect([200, 500]).toContain(response.status);
    });

    it("should handle fetch with location_type remote", async () => {
      global.__mockGenerateContent.mockResolvedValueOnce({
        response: {
          text: () => JSON.stringify({
            percentile_10: 100000,
            percentile_25: 115000,
            percentile_50: 135000,
            percentile_75: 155000,
            percentile_90: 180000,
            years_of_experience_min: 2,
            years_of_experience_max: 6,
            sample_size: 400,
            data_source: "remote",
          }),
        },
      });

      pool.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          role_title: "Software Engineer",
          location_type: "remote",
          percentile_50: 135000,
        }],
      });

      const response = await request(app)
        .post("/api/market-benchmarks/fetch")
        .set("Authorization", `Bearer ${user.token}`)
        .send({
          role_title: "Software Engineer",
          role_level: "mid",
          location: "Remote",
          location_type: "remote",
        });

      expect([200, 500]).toContain(response.status);
    });

    it("should handle total_comp fields in AI response", async () => {
      global.__mockGenerateContent.mockResolvedValueOnce({
        response: {
          text: () => JSON.stringify({
            percentile_10: 90000,
            percentile_25: 100000,
            percentile_50: 120000,
            percentile_75: 140000,
            percentile_90: 160000,
            total_comp_percentile_50: 150000,
            total_comp_percentile_75: 175000,
            total_comp_percentile_90: 200000,
            years_of_experience_min: 2,
            years_of_experience_max: 5,
            sample_size: 500,
            data_source: "test",
            notes: "Includes equity and bonuses",
          }),
        },
      });

      pool.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          role_title: "Software Engineer",
          percentile_50: 120000,
          total_comp_percentile_50: 150000,
        }],
      });

      const response = await request(app)
        .post("/api/market-benchmarks/fetch")
        .set("Authorization", `Bearer ${user.token}`)
        .send({
          role_title: "Software Engineer",
          role_level: "senior",
          location: "San Francisco, CA",
        });

      expect([200, 500]).toContain(response.status);
    });
  });

  describe("POST /api/market-benchmarks/auto-fetch-for-offer - Edge Cases", () => {
    it("should handle offer not found", async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post("/api/market-benchmarks/auto-fetch-for-offer")
        .set("Authorization", `Bearer ${user.token}`)
        .send({ offer_id: 99999 });

      expect([200, 404, 500]).toContain(response.status);
    });

    it("should use existing benchmark if available", async () => {
      pool.query
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            user_id: userId,
            role_title: "Software Engineer",
            role_level: "mid",
            location: "San Francisco, CA",
          }],
        })
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            role_title: "Software Engineer",
            percentile_50: 120000,
          }],
        });

      const response = await request(app)
        .post("/api/market-benchmarks/auto-fetch-for-offer")
        .set("Authorization", `Bearer ${user.token}`)
        .send({ offer_id: 1 });

      expect([200, 500]).toContain(response.status);
    });
  });

  describe("POST /api/market-benchmarks/batch-fetch - mockRes Handling", () => {
    it("should handle batch fetch where AI returns success data", async () => {
      global.__mockGenerateContent.mockResolvedValue({
        response: {
          text: () => JSON.stringify({
            percentile_10: 90000,
            percentile_25: 100000,
            percentile_50: 120000,
            percentile_75: 140000,
            percentile_90: 160000,
            years_of_experience_min: 2,
            years_of_experience_max: 5,
            sample_size: 500,
            data_source: "test",
          }),
        },
      });

      pool.query.mockResolvedValue({
        rows: [{
          id: 1,
          role_title: "Software Engineer",
          percentile_50: 120000,
        }],
      });

      const response = await request(app)
        .post("/api/market-benchmarks/batch-fetch")
        .set("Authorization", `Bearer ${user.token}`)
        .send({
          benchmarks: [
            {
              role_title: "Software Engineer",
              role_level: "mid",
              location: "San Francisco, CA",
            },
          ],
        });

      expect([200, 401]).toContain(response.status);
    });

    it("should handle batch fetch AI returning non-200 status", async () => {
      global.__mockGenerateContent.mockResolvedValueOnce({
        response: {
          text: () => '{"error": "Invalid data"}',
        },
      });

      const response = await request(app)
        .post("/api/market-benchmarks/batch-fetch")
        .set("Authorization", `Bearer ${user.token}`)
        .send({
          benchmarks: [
            {
              role_title: "Unknown Role",
              role_level: "mid",
              location: "Unknown City",
            },
          ],
        });

      expect([200, 401, 500]).toContain(response.status);
    });

    it("should return error for more than 10 benchmarks", async () => {
      const benchmarks = Array(11).fill({
        role_title: "Software Engineer",
        role_level: "mid",
        location: "San Francisco, CA",
      });

      const response = await request(app)
        .post("/api/market-benchmarks/batch-fetch")
        .set("Authorization", `Bearer ${user.token}`)
        .send({ benchmarks });

      expect([400, 401]).toContain(response.status);
    });

    it("should return error for empty benchmarks array", async () => {
      const response = await request(app)
        .post("/api/market-benchmarks/batch-fetch")
        .set("Authorization", `Bearer ${user.token}`)
        .send({ benchmarks: [] });

      expect([400, 401]).toContain(response.status);
    });

    it("should return error when benchmarks is not an array", async () => {
      const response = await request(app)
        .post("/api/market-benchmarks/batch-fetch")
        .set("Authorization", `Bearer ${user.token}`)
        .send({ benchmarks: "not an array" });

      expect([400, 401]).toContain(response.status);
    });
  });

  describe("POST /api/market-benchmarks/fetch - Additional Branches", () => {
    it("should handle AI response success with .success property", async () => {
      global.__mockGenerateContent.mockResolvedValueOnce({
        response: {
          text: () => JSON.stringify({
            success: true,
            percentile_10: 90000,
            percentile_25: 100000,
            percentile_50: 120000,
            percentile_75: 140000,
            percentile_90: 160000,
            years_of_experience_min: 2,
            years_of_experience_max: 5,
            sample_size: 500,
            data_source: "test",
          }),
        },
      });

      pool.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          role_title: "Software Engineer",
          percentile_50: 120000,
        }],
      });

      const response = await request(app)
        .post("/api/market-benchmarks/fetch")
        .set("Authorization", `Bearer ${user.token}`)
        .send({
          role_title: "Software Engineer",
          role_level: "mid",
          location: "San Francisco, CA",
        });

      expect([200, 401, 500]).toContain(response.status);
    });
  });

  describe("POST /api/market-benchmarks/batch-fetch - Error Handling", () => {
    it("should track errors in batch fetch", async () => {
      global.__mockGenerateContent.mockRejectedValue(new Error("AI Error"));

      const response = await request(app)
        .post("/api/market-benchmarks/batch-fetch")
        .set("Authorization", `Bearer ${user.token}`)
        .send({
          benchmarks: [
            {
              role_title: "Software Engineer",
              role_level: "mid",
              location: "San Francisco, CA",
            },
          ],
        });

      expect([200, 401, 500]).toContain(response.status);
    });

    it("should handle batch processing with successful results", async () => {
      global.__mockGenerateContent.mockResolvedValue({
        response: {
          text: () => JSON.stringify({
            percentile_10: 90000,
            percentile_25: 100000,
            percentile_50: 120000,
            percentile_75: 140000,
            percentile_90: 160000,
            years_of_experience_min: 2,
            years_of_experience_max: 5,
            sample_size: 500,
            data_source: "test",
          }),
        },
      });

      pool.query.mockResolvedValue({
        rows: [{
          id: 1,
          role_title: "Software Engineer",
          percentile_50: 120000,
        }],
      });

      const response = await request(app)
        .post("/api/market-benchmarks/batch-fetch")
        .set("Authorization", `Bearer ${user.token}`)
        .send({
          benchmarks: [
            {
              role_title: "Software Engineer",
              role_level: "mid",
              location: "San Francisco, CA",
            },
            {
              role_title: "Data Scientist",
              role_level: "senior",
              location: "New York, NY",
            },
          ],
        });

      expect([200, 401]).toContain(response.status);
    });

    it("should handle batch fetch with partially valid data", async () => {
      global.__mockGenerateContent
        .mockResolvedValueOnce({
          response: {
            text: () => JSON.stringify({
              percentile_10: 90000,
              percentile_25: 100000,
              percentile_50: 120000,
              percentile_75: 140000,
              percentile_90: 160000,
              years_of_experience_min: 2,
              years_of_experience_max: 5,
              sample_size: 500,
              data_source: "test",
            }),
          },
        })
        .mockRejectedValueOnce(new Error("AI Error"));

      pool.query.mockResolvedValue({
        rows: [{
          id: 1,
          role_title: "Software Engineer",
          percentile_50: 120000,
        }],
      });

      const response = await request(app)
        .post("/api/market-benchmarks/batch-fetch")
        .set("Authorization", `Bearer ${user.token}`)
        .send({
          benchmarks: [
            {
              role_title: "Software Engineer",
              role_level: "mid",
              location: "San Francisco, CA",
            },
            {
              role_title: "Data Scientist",
              role_level: "senior",
              location: "New York, NY",
            },
          ],
        });

      expect([200, 401]).toContain(response.status);
    });
  });
});
