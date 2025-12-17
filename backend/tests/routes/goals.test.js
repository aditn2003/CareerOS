/**
 * Goals Routes Tests
 * Tests routes/goals.js - goal management
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import express from "express";
import goalsRoutes from "../../routes/goals.js";
import { createTestUser } from "../helpers/auth.js";
import pool from "../../db/pool.js";

// Mock auth middleware
vi.mock("../../auth.js", () => ({
  auth: vi.fn((req, res, next) => {
    req.user = { id: 1 };
    next();
  }),
}));

// Mock pool
vi.mock("../../db/pool.js", () => ({
  default: {
    query: vi.fn(),
  },
}));

describe("Goals Routes", () => {
  let app;
  let user;
  let userId;

  beforeEach(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret-key";

    app = express();
    app.use(express.json());
    app.use("/api/goals", goalsRoutes);

    user = await createTestUser();

    // Decode JWT token to get the user ID
    const jwtModule = await import("jsonwebtoken");
    const decoded = jwtModule.verify(
      user.token,
      process.env.JWT_SECRET || "test-secret-key"
    );
    userId = Number(decoded.id);

    vi.clearAllMocks();

    // Update auth mock to verify JWT tokens
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
          process.env.JWT_SECRET || "test-secret-key"
        );
        req.user = { id: Number(decoded.id), email: decoded.email };
        next();
      } catch (err) {
        return res.status(401).json({ error: "INVALID_TOKEN" });
      }
    });
  });

  describe("GET /api/goals", () => {
    it("should return default goals if user has no custom goals", async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get("/api/goals")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.goals).toBeDefined();
      expect(response.body.goals.monthly_applications).toBe(30);
      expect(response.body.goals.interview_rate_target).toBe(0.3);
      expect(response.body.goals.offer_rate_target).toBe(0.05);
      expect(response.body.isCustom).toBe(false);
    });

    it("should return custom goals if user has set them", async () => {
      pool.query.mockResolvedValueOnce({
        rows: [
          {
            monthly_applications: 50,
            interview_rate_target: 0.4,
            offer_rate_target: 0.1,
          },
        ],
      });

      const response = await request(app)
        .get("/api/goals")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.goals).toBeDefined();
      expect(response.body.goals.monthly_applications).toBe(50);
      expect(response.body.goals.interview_rate_target).toBe(0.4);
      expect(response.body.goals.offer_rate_target).toBe(0.1);
      expect(response.body.isCustom).toBe(true);
    });

    it("should return 401 if not authenticated", async () => {
      const response = await request(app).get("/api/goals");

      expect(response.status).toBe(401);
    });

    it("should handle database error", async () => {
      pool.query.mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app)
        .get("/api/goals")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe("Failed to fetch goals");
    });
  });

  describe("PUT /api/goals", () => {
    it("should create new goals", async () => {
      const goalsData = {
        monthly_applications: 50,
        interview_rate_target: 0.4,
        offer_rate_target: 0.1,
      };

      pool.query.mockResolvedValueOnce({
        rows: [
          {
            monthly_applications: 50,
            interview_rate_target: 0.4,
            offer_rate_target: 0.1,
          },
        ],
      });

      const response = await request(app)
        .put("/api/goals")
        .set("Authorization", `Bearer ${user.token}`)
        .send(goalsData);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain("updated");
      expect(response.body.goals).toBeDefined();
      expect(response.body.goals.monthly_applications).toBe(50);
    });

    it("should update existing goals", async () => {
      const goalsData = {
        monthly_applications: 60,
        interview_rate_target: 0.35,
        offer_rate_target: 0.08,
      };

      pool.query.mockResolvedValueOnce({
        rows: [
          {
            monthly_applications: 60,
            interview_rate_target: 0.35,
            offer_rate_target: 0.08,
          },
        ],
      });

      const response = await request(app)
        .put("/api/goals")
        .set("Authorization", `Bearer ${user.token}`)
        .send(goalsData);

      expect(response.status).toBe(200);
      expect(response.body.goals.monthly_applications).toBe(60);
    });

    it("should validate and clamp monthly_applications", async () => {
      const goalsData = {
        monthly_applications: 300, // Should be clamped to 200
        interview_rate_target: 0.4,
        offer_rate_target: 0.1,
      };

      pool.query.mockResolvedValueOnce({
        rows: [
          {
            monthly_applications: 200, // Clamped value
            interview_rate_target: 0.4,
            offer_rate_target: 0.1,
          },
        ],
      });

      const response = await request(app)
        .put("/api/goals")
        .set("Authorization", `Bearer ${user.token}`)
        .send(goalsData);

      expect(response.status).toBe(200);
      expect(response.body.goals.monthly_applications).toBe(200);
    });

    it("should validate and clamp interview_rate_target", async () => {
      const goalsData = {
        monthly_applications: 50,
        interview_rate_target: 1.5, // Should be clamped to 1.0
        offer_rate_target: 0.1,
      };

      pool.query.mockResolvedValueOnce({
        rows: [
          {
            monthly_applications: 50,
            interview_rate_target: 1.0, // Clamped value
            offer_rate_target: 0.1,
          },
        ],
      });

      const response = await request(app)
        .put("/api/goals")
        .set("Authorization", `Bearer ${user.token}`)
        .send(goalsData);

      expect(response.status).toBe(200);
      expect(response.body.goals.interview_rate_target).toBe(1.0);
    });

    it("should use default values for missing fields", async () => {
      const goalsData = {
        monthly_applications: 50,
        // Missing interview_rate_target and offer_rate_target
      };

      pool.query.mockResolvedValueOnce({
        rows: [
          {
            monthly_applications: 50,
            interview_rate_target: 0.3, // Default
            offer_rate_target: 0.05, // Default
          },
        ],
      });

      const response = await request(app)
        .put("/api/goals")
        .set("Authorization", `Bearer ${user.token}`)
        .send(goalsData);

      expect(response.status).toBe(200);
      expect(response.body.goals.monthly_applications).toBe(50);
    });

    it("should return 401 if not authenticated", async () => {
      const response = await request(app).put("/api/goals").send({
        monthly_applications: 50,
        interview_rate_target: 0.4,
        offer_rate_target: 0.1,
      });

      expect(response.status).toBe(401);
    });

    it("should handle database error", async () => {
      pool.query.mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app)
        .put("/api/goals")
        .set("Authorization", `Bearer ${user.token}`)
        .send({
          monthly_applications: 50,
          interview_rate_target: 0.4,
          offer_rate_target: 0.1,
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe("Failed to update goals");
    });
  });

  describe("DELETE /api/goals", () => {
    it("should reset goals to defaults", async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .delete("/api/goals")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain("reset");
      expect(response.body.goals).toBeDefined();
      expect(response.body.goals.monthly_applications).toBe(30);
      expect(response.body.goals.interview_rate_target).toBe(0.3);
      expect(response.body.goals.offer_rate_target).toBe(0.05);
    });

    it("should return 401 if not authenticated", async () => {
      const response = await request(app).delete("/api/goals");

      expect(response.status).toBe(401);
    });

    it("should handle database error", async () => {
      pool.query.mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app)
        .delete("/api/goals")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe("Failed to reset goals");
    });
  });
});
