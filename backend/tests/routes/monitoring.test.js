/**
 * Monitoring Routes Tests
 * Tests routes/monitoring.js
 * Target: 92%+ coverage
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import request from "supertest";
import express from "express";

// Mock auth middleware BEFORE importing routes
vi.mock("../../auth.js", () => ({
  auth: (req, res, next) => {
    req.user = { id: 1 };
    next();
  },
  authMiddleware: (req, res, next) => {
    req.user = { id: 1 };
    next();
  },
}));

// Mock metricsCollector before importing routes
vi.mock("../../utils/monitoring.js", () => ({
  metricsCollector: {
    getMetrics: vi.fn(),
    reset: vi.fn(),
  },
}));

// Mock logger
vi.mock("../../utils/logger.js", () => ({
  logInfo: vi.fn(),
  logError: vi.fn(),
}));

// Mock database pool
vi.mock("../../db/pool.js", () => ({
  default: {
    query: vi.fn(),
    totalCount: 10,
    idleCount: 5,
    waitingCount: 0,
  },
}));

// Import after mocking
import pool from "../../db/pool.js";
import { metricsCollector } from "../../utils/monitoring.js";
import monitoringRoutes from "../../routes/monitoring.js";

describe("Monitoring Routes", () => {
  let app;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup express app
    app = express();
    app.use(express.json());
    app.use("/api/monitoring", monitoringRoutes);
  });

  describe("GET /api/monitoring/health", () => {
    it("should return healthy status when database is healthy", async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ health: 1 }],
      });

      const response = await request(app).get("/api/monitoring/health");

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("healthy");
      expect(response.body.checks.database.status).toBe("healthy");
      expect(response.body.checks.memory).toBeDefined();
      expect(response.body.uptime).toBeDefined();
    });

    it("should return degraded status when database check returns unexpected value", async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ health: 0 }],
      });

      const response = await request(app).get("/api/monitoring/health");

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("degraded");
      expect(response.body.checks.database.status).toBe("unhealthy");
    });

    it("should return unhealthy status when database query fails", async () => {
      pool.query.mockRejectedValueOnce(new Error("Database connection failed"));

      const response = await request(app).get("/api/monitoring/health");

      expect(response.status).toBe(503);
      expect(response.body.status).toBe("unhealthy");
      expect(response.body.checks.database.status).toBe("unhealthy");
      expect(response.body.checks.database.error).toBe("Database connection failed");
    });

    it("should include memory usage information", async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ health: 1 }],
      });

      const response = await request(app).get("/api/monitoring/health");

      expect(response.body.checks.memory.status).toBe("healthy");
      expect(response.body.checks.memory.heapUsed).toBeDefined();
      expect(response.body.checks.memory.heapTotal).toBeDefined();
      expect(response.body.checks.memory.rss).toBeDefined();
    });

    it("should return degraded status when database returns empty rows", async () => {
      pool.query.mockResolvedValueOnce({
        rows: [],
      });

      const response = await request(app).get("/api/monitoring/health");

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("degraded");
    });
  });

  describe("HEAD /api/monitoring/health", () => {
    it("should return status code without body for HEAD request", async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ health: 1 }],
      });

      const response = await request(app).head("/api/monitoring/health");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({});
    });

    it("should return 503 for unhealthy HEAD request", async () => {
      pool.query.mockRejectedValueOnce(new Error("Database down"));

      const response = await request(app).head("/api/monitoring/health");

      expect(response.status).toBe(503);
      expect(response.body).toEqual({});
    });
  });

  describe("GET /api/monitoring/metrics", () => {
    it("should return metrics with database pool stats", async () => {
      metricsCollector.getMetrics.mockReturnValueOnce({
        uptime: { seconds: 3600, formatted: "1h 0m 0s" },
        requests: { total: 1000, perMinute: 10 },
        performance: { averageResponseTime: 100, p95: 200 },
        errors: { total: 5, rate: 0.5 },
      });

      const response = await request(app).get("/api/monitoring/metrics");

      expect(response.status).toBe(200);
      expect(response.body.uptime).toBeDefined();
      expect(response.body.requests).toBeDefined();
      expect(response.body.performance).toBeDefined();
      expect(response.body.errors).toBeDefined();
      expect(response.body.database.pool).toBeDefined();
    });

    it("should handle errors when fetching metrics", async () => {
      metricsCollector.getMetrics.mockImplementationOnce(() => {
        throw new Error("Metrics fetch failed");
      });

      const response = await request(app).get("/api/monitoring/metrics");

      expect(response.status).toBe(500);
      expect(response.body.error).toBe("Failed to fetch metrics");
    });
  });

  describe("POST /api/monitoring/metrics/reset", () => {
    it("should reset metrics successfully", async () => {
      metricsCollector.reset.mockReturnValueOnce(undefined);

      const response = await request(app).post("/api/monitoring/metrics/reset");

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Metrics reset successfully");
      expect(metricsCollector.reset).toHaveBeenCalled();
    });

    it("should handle errors when resetting metrics", async () => {
      metricsCollector.reset.mockImplementationOnce(() => {
        throw new Error("Reset failed");
      });

      const response = await request(app).post("/api/monitoring/metrics/reset");

      expect(response.status).toBe(500);
      expect(response.body.error).toBe("Failed to reset metrics");
    });
  });

  describe("GET /api/monitoring/alerts", () => {
    it("should return empty alerts when all metrics are normal", async () => {
      metricsCollector.getMetrics.mockReturnValueOnce({
        errors: { rate: 0 },
        performance: { p95: 500 },
      });

      const response = await request(app).get("/api/monitoring/alerts");

      expect(response.status).toBe(200);
      expect(response.body.alerts).toEqual([]);
      expect(response.body.count).toBe(0);
      expect(response.body.critical).toBe(0);
      expect(response.body.warnings).toBe(0);
    });

    it("should return warning alert for elevated error rate (2-5%)", async () => {
      metricsCollector.getMetrics.mockReturnValueOnce({
        errors: { rate: 3 },
        performance: { p95: 500 },
      });

      const response = await request(app).get("/api/monitoring/alerts");

      expect(response.status).toBe(200);
      expect(response.body.alerts).toHaveLength(1);
      expect(response.body.alerts[0].level).toBe("warning");
      expect(response.body.alerts[0].type).toBe("elevated_error_rate");
      expect(response.body.warnings).toBe(1);
    });

    it("should return critical alert for high error rate (>5%)", async () => {
      metricsCollector.getMetrics.mockReturnValueOnce({
        errors: { rate: 10 },
        performance: { p95: 500 },
      });

      const response = await request(app).get("/api/monitoring/alerts");

      expect(response.status).toBe(200);
      expect(response.body.alerts.some(a => a.type === "high_error_rate")).toBe(true);
      expect(response.body.critical).toBeGreaterThan(0);
    });

    it("should return warning alert for elevated response time (1000-2000ms)", async () => {
      metricsCollector.getMetrics.mockReturnValueOnce({
        errors: { rate: 0 },
        performance: { p95: 1500 },
      });

      const response = await request(app).get("/api/monitoring/alerts");

      expect(response.status).toBe(200);
      expect(response.body.alerts.some(a => a.type === "elevated_response_time")).toBe(true);
      expect(response.body.warnings).toBe(1);
    });

    it("should return critical alert for slow response time (>2000ms)", async () => {
      metricsCollector.getMetrics.mockReturnValueOnce({
        errors: { rate: 0 },
        performance: { p95: 3000 },
      });

      const response = await request(app).get("/api/monitoring/alerts");

      expect(response.status).toBe(200);
      expect(response.body.alerts.some(a => a.type === "slow_response_time")).toBe(true);
      expect(response.body.critical).toBeGreaterThan(0);
    });

    it("should return multiple alerts when multiple thresholds are exceeded", async () => {
      metricsCollector.getMetrics.mockReturnValueOnce({
        errors: { rate: 10 },
        performance: { p95: 3000 },
      });

      const response = await request(app).get("/api/monitoring/alerts");

      expect(response.status).toBe(200);
      expect(response.body.alerts.length).toBeGreaterThan(1);
      expect(response.body.count).toBeGreaterThan(1);
    });

    it("should handle errors when fetching alerts", async () => {
      metricsCollector.getMetrics.mockImplementationOnce(() => {
        throw new Error("Metrics unavailable");
      });

      const response = await request(app).get("/api/monitoring/alerts");

      expect(response.status).toBe(500);
      expect(response.body.error).toBe("Failed to fetch alerts");
    });

    it("should include timestamp in alerts response", async () => {
      metricsCollector.getMetrics.mockReturnValueOnce({
        errors: { rate: 0 },
        performance: { p95: 500 },
      });

      const response = await request(app).get("/api/monitoring/alerts");

      expect(response.body.timestamp).toBeDefined();
      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
    });
  });
});
