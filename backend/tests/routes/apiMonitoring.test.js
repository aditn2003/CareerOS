/**
 * API Monitoring Routes Tests
 * Tests routes/apiMonitoring.js
 * Target: 90%+ coverage
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import express from "express";

// Mock auth middleware
vi.mock("../../auth.js", () => ({
  auth: (req, res, next) => {
    req.user = { id: 1 };
    next();
  },
}));

// Mock adminAuth middleware
vi.mock("../../utils/adminAuth.js", () => ({
  requireAdmin: (req, res, next) => {
    next();
  },
}));

// Mock database pool
vi.mock("../../db/pool.js", () => ({
  default: {
    query: vi.fn(),
  },
}));

import pool from "../../db/pool.js";
import apiMonitoringRoutes from "../../routes/apiMonitoring.js";

describe("API Monitoring Routes", () => {
  let app;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use("/api/admin", apiMonitoringRoutes);
  });

  describe("GET /api/admin/api-usage", () => {
    it("should return API usage statistics with default dates", async () => {
      pool.query.mockResolvedValueOnce({
        rows: [
          {
            service_name: "openai",
            total_requests: "100",
            successful_requests: "95",
            failed_requests: "5",
            avg_response_time_ms: "250",
            p95_response_time_ms: "500",
            total_tokens_used: "50000",
            total_cost_estimate: "0.50",
            last_used_at: new Date().toISOString(),
          },
        ],
      });

      const response = await request(app).get("/api/admin/api-usage");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].total_requests).toBe(100);
      expect(response.body.data[0].successful_requests).toBe(95);
      expect(response.body.period).toBeDefined();
    });

    it("should filter by date range", async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get("/api/admin/api-usage")
        .query({ startDate: "2024-01-01", endDate: "2024-01-31" });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.period.startDate).toBe("2024-01-01");
      expect(response.body.period.endDate).toBe("2024-01-31");
    });

    it("should filter by service name", async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ service_name: "openai", total_requests: "50" }],
      });

      const response = await request(app)
        .get("/api/admin/api-usage")
        .query({ serviceName: "openai" });

      expect(response.status).toBe(200);
      expect(pool.query).toHaveBeenCalled();
    });

    it("should handle database errors", async () => {
      pool.query.mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app).get("/api/admin/api-usage");

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    it("should return 503 when table does not exist", async () => {
      pool.query.mockRejectedValueOnce(
        new Error('relation "api_usage_logs" does not exist')
      );

      const response = await request(app).get("/api/admin/api-usage");

      expect(response.status).toBe(503);
      expect(response.body.error).toContain("Database schema not initialized");
    });

    it("should handle null values in response", async () => {
      pool.query.mockResolvedValueOnce({
        rows: [
          {
            service_name: "test",
            total_requests: null,
            successful_requests: null,
            failed_requests: null,
            avg_response_time_ms: null,
            p95_response_time_ms: null,
            total_tokens_used: null,
            total_cost_estimate: null,
          },
        ],
      });

      const response = await request(app).get("/api/admin/api-usage");

      expect(response.status).toBe(200);
      expect(response.body.data[0].total_requests).toBe(0);
    });

    it("should filter with only startDate provided", async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get("/api/admin/api-usage")
        .query({ startDate: "2024-01-01" });

      expect(response.status).toBe(200);
    });

    it("should filter with only endDate provided", async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get("/api/admin/api-usage")
        .query({ endDate: "2024-01-31" });

      expect(response.status).toBe(200);
    });
  });

  describe("GET /api/admin/api-quotas", () => {
    it("should return quota status for all services", async () => {
      pool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            service_name: "openai",
            display_name: "OpenAI",
            quota_limit: 1000,
            quota_period: "monthly",
            rate_limit_per_minute: 60,
            enabled: true,
            usage_count: 500,
            tokens_used: 25000,
            cost_total: 0.25,
            usage_percentage: 50,
            approaching_limit: false,
          },
        ],
      });

      const response = await request(app).get("/api/admin/api-quotas");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.period).toBeDefined();
    });

    it("should filter quotas by date range", async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get("/api/admin/api-quotas")
        .query({ startDate: "2024-01-01", endDate: "2024-01-31" });

      expect(response.status).toBe(200);
      expect(response.body.period.start).toBe("2024-01-01");
      expect(response.body.period.end).toBe("2024-01-31");
    });

    it("should handle database errors", async () => {
      pool.query.mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app).get("/api/admin/api-quotas");

      expect(response.status).toBe(500);
    });

    it("should return 503 when api_services table does not exist", async () => {
      pool.query.mockRejectedValueOnce(
        new Error('relation "api_services" does not exist')
      );

      const response = await request(app).get("/api/admin/api-quotas");

      expect(response.status).toBe(503);
    });

    it("should return 503 when api_quotas table does not exist", async () => {
      pool.query.mockRejectedValueOnce(
        new Error('relation "api_quotas" does not exist')
      );

      const response = await request(app).get("/api/admin/api-quotas");

      expect(response.status).toBe(503);
    });
  });

  describe("GET /api/admin/api-errors", () => {
    it("should return API error logs with pagination", async () => {
      pool.query
        .mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              service_name: "openai",
              endpoint: "/v1/chat",
              error_type: "rate_limit",
              error_message: "Rate limit exceeded",
              error_code: "429",
              status_code: 429,
              retry_attempt: 0,
              fallback_used: false,
              created_at: new Date().toISOString(),
              user_id: 1,
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [{ count: "10" }],
        });

      const response = await request(app).get("/api/admin/api-errors");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.total).toBe(10);
    });

    it("should filter errors by date range", async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: "0" }] });

      const response = await request(app)
        .get("/api/admin/api-errors")
        .query({ startDate: "2024-01-01", endDate: "2024-01-31" });

      expect(response.status).toBe(200);
    });

    it("should filter errors by service name", async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: "0" }] });

      const response = await request(app)
        .get("/api/admin/api-errors")
        .query({ serviceName: "openai" });

      expect(response.status).toBe(200);
    });

    it("should filter errors by error type", async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: "0" }] });

      const response = await request(app)
        .get("/api/admin/api-errors")
        .query({ errorType: "rate_limit" });

      expect(response.status).toBe(200);
    });

    it("should support pagination", async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: "100" }] });

      const response = await request(app)
        .get("/api/admin/api-errors")
        .query({ limit: 10, offset: 20 });

      expect(response.status).toBe(200);
      expect(response.body.pagination.limit).toBe(10);
      expect(response.body.pagination.offset).toBe(20);
    });

    it("should handle database errors", async () => {
      pool.query.mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app).get("/api/admin/api-errors");

      expect(response.status).toBe(500);
    });

    it("should return 503 when table does not exist", async () => {
      pool.query.mockRejectedValueOnce(
        new Error('relation "api_error_logs" does not exist')
      );

      const response = await request(app).get("/api/admin/api-errors");

      expect(response.status).toBe(503);
    });

    it("should handle empty count result", async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const response = await request(app).get("/api/admin/api-errors");

      expect(response.status).toBe(200);
      expect(response.body.pagination.total).toBe(0);
    });

    it("should filter with all parameters combined", async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: "0" }] });

      const response = await request(app).get("/api/admin/api-errors").query({
        startDate: "2024-01-01",
        endDate: "2024-01-31",
        serviceName: "openai",
        errorType: "rate_limit",
        limit: 50,
        offset: 10,
      });

      expect(response.status).toBe(200);
    });
  });

  describe("GET /api/admin/api-response-times", () => {
    it("should return response time statistics grouped by hour", async () => {
      pool.query.mockResolvedValueOnce({
        rows: [
          {
            time_period: new Date().toISOString(),
            service_name: "openai",
            avg_response_time_ms: 250,
            median_response_time_ms: 200,
            p95_response_time_ms: 500,
            p99_response_time_ms: 800,
            min_response_time_ms: 100,
            max_response_time_ms: 1000,
            request_count: "50",
          },
        ],
      });

      const response = await request(app).get("/api/admin/api-response-times");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.groupBy).toBe("hour");
    });

    it("should group by day when specified", async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get("/api/admin/api-response-times")
        .query({ groupBy: "day" });

      expect(response.status).toBe(200);
      expect(response.body.groupBy).toBe("day");
    });

    it("should use day grouping for unknown groupBy values", async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get("/api/admin/api-response-times")
        .query({ groupBy: "unknown" });

      expect(response.status).toBe(200);
    });

    it("should filter by date range", async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get("/api/admin/api-response-times")
        .query({ startDate: "2024-01-01", endDate: "2024-01-31" });

      expect(response.status).toBe(200);
    });

    it("should filter by service name", async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get("/api/admin/api-response-times")
        .query({ serviceName: "openai" });

      expect(response.status).toBe(200);
    });

    it("should handle database errors", async () => {
      pool.query.mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app).get("/api/admin/api-response-times");

      expect(response.status).toBe(500);
    });
  });

  describe("GET /api/admin/api-services", () => {
    it("should return all API services", async () => {
      pool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            service_name: "openai",
            display_name: "OpenAI",
            base_url: "https://api.openai.com",
            quota_limit: 1000,
            quota_period: "monthly",
            rate_limit_per_minute: 60,
            enabled: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
      });

      const response = await request(app).get("/api/admin/api-services");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
    });

    it("should handle database errors", async () => {
      pool.query.mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app).get("/api/admin/api-services");

      expect(response.status).toBe(500);
    });
  });

  describe("POST /api/admin/api-usage-report", () => {
    it("should generate weekly usage report", async () => {
      pool.query
        .mockResolvedValueOnce({
          rows: [
            {
              total_requests: "100",
              total_errors: "5",
              total_tokens_used: "50000",
              total_cost: "0.50",
              avg_response_time_ms: "250",
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              service_name: "openai",
              requests: "80",
              errors: "3",
              tokens_used: "40000",
              cost: "0.40",
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [{ error_type: "rate_limit", count: "3" }],
        })
        .mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post("/api/admin/api-usage-report")
        .send({ weekStart: "2024-01-01" });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.report).toBeDefined();
      expect(response.body.report.totalRequests).toBe(100);
    });

    it("should return 400 if weekStart is missing", async () => {
      const response = await request(app)
        .post("/api/admin/api-usage-report")
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("weekStart is required");
    });

    it("should handle null statistics", async () => {
      pool.query
        .mockResolvedValueOnce({
          rows: [
            {
              total_requests: null,
              total_errors: null,
              total_tokens_used: null,
              total_cost: null,
              avg_response_time_ms: null,
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post("/api/admin/api-usage-report")
        .send({ weekStart: "2024-01-01" });

      expect(response.status).toBe(200);
      expect(response.body.report.totalRequests).toBe(0);
    });

    it("should handle database errors", async () => {
      pool.query.mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app)
        .post("/api/admin/api-usage-report")
        .send({ weekStart: "2024-01-01" });

      expect(response.status).toBe(500);
    });
  });

  describe("GET /api/admin/api-usage-reports", () => {
    it("should return weekly reports with default limit", async () => {
      pool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            report_week_start: "2024-01-01",
            total_requests: 100,
            total_errors: 5,
            total_tokens_used: 50000,
            total_cost: 0.5,
            avg_response_time_ms: 250,
            service_breakdown: [],
            error_breakdown: [],
            generated_at: new Date().toISOString(),
          },
        ],
      });

      const response = await request(app).get("/api/admin/api-usage-reports");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
    });

    it("should support custom limit", async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get("/api/admin/api-usage-reports")
        .query({ limit: 5 });

      expect(response.status).toBe(200);
      expect(pool.query).toHaveBeenCalledWith(expect.any(String), [5]);
    });

    it("should handle database errors", async () => {
      pool.query.mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app).get("/api/admin/api-usage-reports");

      expect(response.status).toBe(500);
    });
  });
});
