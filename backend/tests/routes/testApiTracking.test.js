import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";

// Create hoisted mocks
const mockLogApiUsage = vi.hoisted(() => vi.fn());

vi.mock("../../utils/apiTrackingService.js", () => ({
  logApiUsage: mockLogApiUsage,
}));

import testApiTrackingRouter from "../../routes/testApiTracking.js";

describe("Test API Tracking Routes", () => {
  let app;

  beforeEach(() => {
    vi.clearAllMocks();

    app = express();
    app.use(express.json());
    app.use("/api", testApiTrackingRouter);

    // Default: successful log
    mockLogApiUsage.mockResolvedValue(undefined);
  });

  describe("GET /test-tracking", () => {
    it("should successfully track API usage", async () => {
      const response = await request(app).get("/api/test-tracking");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: "Test API call tracked successfully. Check the dashboard to verify it appears.",
      });
      expect(mockLogApiUsage).toHaveBeenCalledWith({
        serviceName: "openai",
        endpoint: "/v1/test",
        method: "GET",
        userId: 1, // Default when req.user is not set
        requestPayload: { test: true },
        responseStatus: 200,
        responseTimeMs: 100,
        success: true,
        costEstimate: 0.001,
      });
    });

    it("should use user ID from req.user when available", async () => {
      // Create new app with user middleware
      const appWithUser = express();
      appWithUser.use((req, res, next) => {
        req.user = { id: 42 };
        next();
      });
      appWithUser.use("/api", testApiTrackingRouter);

      const response = await request(appWithUser).get("/api/test-tracking");

      expect(response.status).toBe(200);
      expect(mockLogApiUsage).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 42,
        })
      );
    });

    it("should handle logApiUsage errors", async () => {
      const error = new Error("Database connection failed");
      error.stack = "Error stack trace";
      mockLogApiUsage.mockRejectedValueOnce(error);

      const response = await request(app).get("/api/test-tracking");

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: "Database connection failed",
        stack: "Error stack trace",
      });
    });

    it("should handle errors without stack trace", async () => {
      const error = new Error("Simple error");
      delete error.stack;
      mockLogApiUsage.mockRejectedValueOnce(error);

      const response = await request(app).get("/api/test-tracking");

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: "Simple error",
        stack: undefined,
      });
    });

    it("should handle non-Error objects thrown", async () => {
      mockLogApiUsage.mockRejectedValueOnce("String error");

      const response = await request(app).get("/api/test-tracking");

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    it("should call logApiUsage with correct parameters", async () => {
      await request(app).get("/api/test-tracking");

      expect(mockLogApiUsage).toHaveBeenCalledTimes(1);
      expect(mockLogApiUsage).toHaveBeenCalledWith({
        serviceName: "openai",
        endpoint: "/v1/test",
        method: "GET",
        userId: 1,
        requestPayload: { test: true },
        responseStatus: 200,
        responseTimeMs: 100,
        success: true,
        costEstimate: 0.001,
      });
    });

    it("should handle null user object", async () => {
      const appWithNullUser = express();
      appWithNullUser.use((req, res, next) => {
        req.user = null;
        next();
      });
      appWithNullUser.use("/api", testApiTrackingRouter);

      const response = await request(appWithNullUser).get("/api/test-tracking");

      expect(response.status).toBe(200);
      expect(mockLogApiUsage).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 1, // Falls back to 1 when req.user is null
        })
      );
    });

    it("should handle user object without id", async () => {
      const appWithUserNoId = express();
      appWithUserNoId.use((req, res, next) => {
        req.user = { email: "test@example.com" };
        next();
      });
      appWithUserNoId.use("/api", testApiTrackingRouter);

      const response = await request(appWithUserNoId).get("/api/test-tracking");

      expect(response.status).toBe(200);
      expect(mockLogApiUsage).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 1, // Falls back to 1 when req.user.id is undefined
        })
      );
    });
  });
});

