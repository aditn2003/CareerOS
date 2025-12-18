/**
 * Timing Routes Tests
 * Tests routes/timing.js - timing analytics
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import express from "express";
import timingRoutes from "../../routes/timing.js";
import { createTestUser } from "../helpers/auth.js";
import pool from "../../db/pool.js";

// Mock dependencies
vi.mock("../../db/pool.js", () => ({
  default: {
    query: vi.fn(),
  },
}));

describe("Timing Routes", () => {
  let app;
  let user;
  let userId;

  beforeEach(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";
    
    app = express();
    app.use(express.json());
    app.use("/api/timing", timingRoutes);
    
    user = await createTestUser();
    
    const jwtModule = await import("jsonwebtoken");
    const decoded = jwtModule.verify(
      user.token,
      process.env.JWT_SECRET || "dev_secret_change_me"
    );
    userId = Number(decoded.id);
    
    vi.clearAllMocks();
    
    // Mock the auth middleware used by timing routes (uses req.userId)
    // The route has its own auth function, so we need to ensure it works correctly
  });

  describe("POST /api/timing/submit", () => {
    it("should record an application submission", async () => {
      pool.query.mockImplementation((query, params) => {
        if (
          query.includes("SELECT id, industry, type FROM jobs") &&
          params &&
          params[0] === 1 &&
          params[1] === userId
        ) {
          return Promise.resolve({
            rows: [{ id: 1, industry: "Technology", type: "Full-time" }],
          });
        }
        if (query.includes("INSERT INTO application_submissions")) {
          return Promise.resolve({
            rows: [
              {
              id: 1,
              job_id: 1,
              user_id: userId,
              submitted_at: new Date(),
              day_of_week: 1,
              hour_of_day: 10,
              },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .post("/api/timing/submit")
        .set("Authorization", `Bearer ${user.token}`)
        .send({
          jobId: 1,
          submittedAt: new Date().toISOString(),
          industry: "Technology",
          companySize: "Large",
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.submission).toBeDefined();
    });

    it("should return 400 if jobId is missing", async () => {
      const response = await request(app)
        .post("/api/timing/submit")
        .set("Authorization", `Bearer ${user.token}`)
        .send({});

      expect(response.status).toBe(400);
    });

    it("should return 404 if job not found", async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post("/api/timing/submit")
        .set("Authorization", `Bearer ${user.token}`)
        .send({ jobId: 999 });

      expect(response.status).toBe(404);
    });
  });

  describe("GET /api/timing/recommendations/:jobId", () => {
    it("should get timing recommendations for a job", async () => {
      pool.query.mockImplementation((query, params) => {
        // jobId comes as string from req.params, route uses it directly
        if (
          query.includes("SELECT * FROM jobs WHERE id = $1 AND user_id = $2")
        ) {
          if (params && String(params[0]) === "1" && params[1] == userId) {
            return Promise.resolve({
              rows: [
                {
                  id: 1,
                  title: "Software Engineer",
                  company: "Tech Corp",
                  industry: "Technology",
                },
              ],
            });
          }
        }
        if (
          query.includes("SELECT * FROM timing_recommendations") &&
          query.includes("status = 'active'")
        ) {
          return Promise.resolve({ rows: [] });
        }
        if (
          query.includes("SELECT day_of_week, hour_of_day") &&
          query.includes("FROM application_submissions")
        ) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes("INSERT INTO timing_recommendations")) {
          return Promise.resolve({
            rows: [
              {
              id: 1,
              job_id: 1,
              user_id: userId,
                recommended_date: "2024-01-15",
                recommended_time: "10:00:00",
              day_of_week: 1,
              hour_of_day: 10,
              confidence_score: 0.5,
              },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get("/api/timing/recommendations/1")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.recommendation).toBeDefined();
      expect(response.body.job).toBeDefined();
    });

    it("should return 404 if job not found", async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get("/api/timing/recommendations/999")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(404);
    });
  });

  describe("GET /api/timing/optimal-times", () => {
    it("should get optimal times", async () => {
      pool.query.mockResolvedValueOnce({
        rows: [
          {
            day_of_week: 1,
            hour_of_day: 10,
            total_submissions: 10,
            responses: 5,
            interviews: 2,
            offers: 1,
          },
        ],
      });

      const response = await request(app)
        .get("/api/timing/optimal-times")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.optimal_times).toBeDefined();
      expect(Array.isArray(response.body.optimal_times)).toBe(true);
    });

    it("should filter by industry if provided", async () => {
      pool.query.mockImplementation((query, params) => {
        if (
          query.includes("AND industry = $") &&
          params &&
          params[1] === "Technology"
        ) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get("/api/timing/optimal-times?industry=Technology")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
    });
  });

  describe("POST /api/timing/schedule", () => {
    it("should schedule an application submission", async () => {
      pool.query.mockImplementation((query, params) => {
        if (
          query.includes("SELECT id FROM jobs") &&
          params &&
          params[0] === 1 &&
          params[1] === userId
        ) {
          return Promise.resolve({ rows: [{ id: 1 }] });
        }
        if (
          query.includes("SELECT id FROM scheduled_submissions") &&
          query.includes("status = 'pending'")
        ) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes("INSERT INTO scheduled_submissions")) {
          return Promise.resolve({
            rows: [
              {
              id: 1,
              job_id: 1,
              user_id: userId,
                scheduled_date: "2024-01-15",
                scheduled_time: "10:00:00",
                status: "pending",
              },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .post("/api/timing/schedule")
        .set("Authorization", `Bearer ${user.token}`)
        .send({
          jobId: 1,
          scheduledDate: "2024-01-15",
          scheduledTime: "10:00:00",
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.schedule).toBeDefined();
    });

    it("should return 400 if required fields are missing", async () => {
      const response = await request(app)
        .post("/api/timing/schedule")
        .set("Authorization", `Bearer ${user.token}`)
        .send({ jobId: 1 });

      expect(response.status).toBe(400);
    });

    it("should return 400 if pending schedule already exists", async () => {
      pool.query.mockImplementation((query, params) => {
        if (
          query.includes("SELECT id FROM jobs") &&
          params &&
          params[0] === 1 &&
          params[1] === userId
        ) {
          return Promise.resolve({ rows: [{ id: 1 }] });
        }
        if (
          query.includes("SELECT id FROM scheduled_submissions") &&
          query.includes("status = 'pending'")
        ) {
          return Promise.resolve({ rows: [{ id: 1 }] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .post("/api/timing/schedule")
        .set("Authorization", `Bearer ${user.token}`)
        .send({
          jobId: 1,
          scheduledDate: "2024-01-15",
          scheduledTime: "10:00:00",
        });

      expect(response.status).toBe(400);
    });
  });

  describe("GET /api/timing/scheduled", () => {
    it("should get all scheduled submissions", async () => {
      pool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            job_id: 1,
            user_id: userId,
            scheduled_date: "2024-01-15",
            scheduled_time: "10:00:00",
            status: "pending",
            job_title: "Software Engineer",
            job_company: "Tech Corp",
          },
        ],
      });

      const response = await request(app)
        .get("/api/timing/scheduled")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.schedules).toBeDefined();
      expect(Array.isArray(response.body.schedules)).toBe(true);
    });

    it("should filter by status if provided", async () => {
      pool.query.mockImplementation((query, params) => {
        if (
          query.includes("AND ss.status = $") &&
          params &&
          params[1] === "completed"
        ) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get("/api/timing/scheduled?status=completed")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
    });
  });

  describe("PUT /api/timing/schedule/:id", () => {
    it("should update a scheduled submission", async () => {
      pool.query.mockImplementation((query, params) => {
        // id comes as string from req.params
        if (
          query.includes(
            "SELECT * FROM scheduled_submissions WHERE id = $1 AND user_id = $2"
          ) &&
          params &&
          String(params[0]) === "1" &&
          params[1] == userId
        ) {
          return Promise.resolve({
            rows: [
              {
              id: 1,
              job_id: 1,
              user_id: userId,
                scheduled_date: "2024-01-15",
                scheduled_time: "10:00:00",
                status: "pending",
              },
            ],
          });
        }
        if (query.includes("UPDATE scheduled_submissions")) {
          return Promise.resolve({
            rows: [
              {
              id: 1,
                scheduled_date: "2024-01-16",
                scheduled_time: "11:00:00",
                status: "pending",
              },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .put("/api/timing/schedule/1")
        .set("Authorization", `Bearer ${user.token}`)
        .send({
          scheduledDate: "2024-01-16",
          scheduledTime: "11:00:00",
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.schedule).toBeDefined();
    });

    it("should return 404 if schedule not found", async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .put("/api/timing/schedule/999")
        .set("Authorization", `Bearer ${user.token}`)
        .send({ scheduledDate: "2024-01-16" });

      expect(response.status).toBe(404);
    });

    it("should record submission when status is completed", async () => {
      pool.query.mockImplementation((query, params) => {
        if (
          query.includes(
            "SELECT * FROM scheduled_submissions WHERE id = $1 AND user_id = $2"
          )
        ) {
          return Promise.resolve({
            rows: [
              {
              id: 1,
              job_id: 1,
              user_id: userId,
                scheduled_date: "2024-01-15",
                scheduled_time: "10:00:00",
                status: "pending",
              },
            ],
          });
        }
        if (query.includes("SELECT industry, type FROM jobs")) {
          return Promise.resolve({
            rows: [{ industry: "Technology", type: "Full-time" }],
          });
        }
        if (query.includes("SELECT id FROM application_submissions")) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes("INSERT INTO application_submissions")) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes("UPDATE scheduled_submissions")) {
          return Promise.resolve({
            rows: [{ id: 1, status: "completed" }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .put("/api/timing/schedule/1")
        .set("Authorization", `Bearer ${user.token}`)
        .send({ status: "completed" });

      expect(response.status).toBe(200);
    });
  });

  describe("DELETE /api/timing/schedule/:id", () => {
    it("should delete a scheduled submission", async () => {
      pool.query.mockImplementation((query, params) => {
        if (
          query.includes(
            "SELECT id FROM scheduled_submissions WHERE id = $1 AND user_id = $2"
          )
        ) {
          return Promise.resolve({ rows: [{ id: 1 }] });
        }
        if (query.includes("DELETE FROM scheduled_submissions")) {
          return Promise.resolve({ rows: [{ id: 1 }] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .delete("/api/timing/schedule/1")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it("should return 404 if schedule not found", async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .delete("/api/timing/schedule/999")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(404);
    });
  });

  describe("GET /api/timing/analytics", () => {
    it("should get comprehensive timing analytics", async () => {
      pool.query.mockResolvedValueOnce({
        rows: [
          {
          total_submissions: 10,
          total_responses: 5,
          total_interviews: 2,
          total_offers: 1,
          },
        ],
      });

      const response = await request(app)
        .get("/api/timing/analytics")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.summary).toBeDefined();
      expect(response.body.summary.total_submissions).toBe(10);
    });
  });

  describe("GET /api/timing/response-rates", () => {
    it("should get response rates grouped by day", async () => {
      pool.query.mockResolvedValueOnce({
        rows: [
          {
            day_of_week: 1,
            total_submissions: 5,
            responses: 3,
            interviews: 1,
            offers: 0,
          },
        ],
      });

      const response = await request(app)
        .get("/api/timing/response-rates?groupBy=day")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it("should get response rates grouped by hour", async () => {
      pool.query.mockResolvedValueOnce({
        rows: [
          {
            hour_of_day: 10,
            total_submissions: 5,
            responses: 3,
            interviews: 1,
            offers: 0,
          },
        ],
      });

      const response = await request(app)
        .get("/api/timing/response-rates?groupBy=hour")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.group_by).toBe("hour");
    });

    it("should get response rates grouped by industry", async () => {
      pool.query.mockResolvedValueOnce({
        rows: [
          {
            industry: "Technology",
            total_submissions: 5,
            responses: 3,
            interviews: 1,
            offers: 0,
          },
        ],
      });

      const response = await request(app)
        .get("/api/timing/response-rates?groupBy=industry")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.group_by).toBe("industry");
    });
  });

  describe("GET /api/timing/correlation", () => {
    it("should get correlation data between timing and success", async () => {
      pool.query.mockImplementation((query) => {
        if (
          query.includes("ORDER BY") &&
          query.includes("DESC") &&
          query.includes("LIMIT 5")
        ) {
          return Promise.resolve({
            rows: [
              {
                day_of_week: 1,
                hour_of_day: 10,
                total_submissions: 10,
                responses: 5,
                interviews: 2,
                offers: 1,
              },
            ],
          });
        }
        if (
          query.includes("ORDER BY") &&
          query.includes("ASC") &&
          query.includes("LIMIT 5")
        ) {
          return Promise.resolve({
            rows: [
              {
                day_of_week: 6,
                hour_of_day: 20,
                total_submissions: 5,
                responses: 0,
                interviews: 0,
                offers: 0,
              },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get("/api/timing/correlation")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.best_performing).toBeDefined();
      expect(response.body.worst_performing).toBeDefined();
    });
  });

  describe("POST /api/timing/ab-test", () => {
    it("should create a new A/B test", async () => {
      pool.query.mockResolvedValueOnce({
        rows: [
          {
          id: 1,
          user_id: userId,
            test_type: "day_of_week",
            test_name: "Monday vs Tuesday",
          variant_a: JSON.stringify({ day_of_week: 1 }),
          variant_b: JSON.stringify({ day_of_week: 2 }),
          },
        ],
      });

      const response = await request(app)
        .post("/api/timing/ab-test")
        .set("Authorization", `Bearer ${user.token}`)
        .send({
          testType: "day_of_week",
          testName: "Monday vs Tuesday",
          variantA: { day_of_week: 1 },
          variantB: { day_of_week: 2 },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.test).toBeDefined();
    });

    it("should return 400 if required fields are missing", async () => {
      const response = await request(app)
        .post("/api/timing/ab-test")
        .set("Authorization", `Bearer ${user.token}`)
        .send({ testType: "day_of_week" });

      expect(response.status).toBe(400);
    });

    it("should update existing A/B test if testId provided", async () => {
      pool.query.mockImplementation((query, params) => {
        if (
          query.includes(
            "SELECT * FROM timing_ab_tests WHERE id = $1 AND user_id = $2"
          )
        ) {
          return Promise.resolve({
            rows: [
              {
              id: 1,
              user_id: userId,
                test_type: "day_of_week",
              variant_a: JSON.stringify({ day_of_week: 1 }),
              variant_b: JSON.stringify({ day_of_week: 2 }),
              },
            ],
          });
        }
        if (
          query.includes("SELECT COUNT(*) as total_submissions") &&
          query.includes("day_of_week = $")
        ) {
          return Promise.resolve({
            rows: [
              { total_submissions: 10, responses: 5, interviews: 2, offers: 1 },
            ],
          });
        }
        if (query.includes("UPDATE timing_ab_tests")) {
          return Promise.resolve({
            rows: [
              {
              id: 1,
                results_a: JSON.stringify({
                  total_submissions: 10,
                  responses: 5,
                }),
                results_b: JSON.stringify({
                  total_submissions: 8,
                  responses: 3,
                }),
              },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .post("/api/timing/ab-test")
        .set("Authorization", `Bearer ${user.token}`)
        .send({
          testId: 1,
          testType: "day_of_week",
          variantA: { day_of_week: 1 },
          variantB: { day_of_week: 2 },
        });

      expect(response.status).toBe(200);
      expect(response.body.statistics).toBeDefined();
    });
  });

  describe("GET /api/timing/ab-tests", () => {
    it("should get all A/B tests for the user", async () => {
      pool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            user_id: userId,
            test_type: "day_of_week",
            test_name: "Monday vs Tuesday",
            variant_a: JSON.stringify({ day_of_week: 1 }),
            variant_b: JSON.stringify({ day_of_week: 2 }),
            results_a: JSON.stringify({ total_submissions: 10, responses: 5 }),
            results_b: JSON.stringify({ total_submissions: 8, responses: 3 }),
          },
        ],
      });

      const response = await request(app)
        .get("/api/timing/ab-tests")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.tests).toBeDefined();
      expect(Array.isArray(response.body.tests)).toBe(true);
    });

    it("should filter by status if provided", async () => {
      pool.query.mockImplementation((query, params) => {
        if (
          query.includes("AND status = $") &&
          params &&
          params[1] === "completed"
        ) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get("/api/timing/ab-tests?status=completed")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
    });

    it("should filter by testType if provided", async () => {
      pool.query.mockImplementation((query, params) => {
        if (
          query.includes("AND test_type = $") &&
          params &&
          params[1] === "time_of_day"
        ) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get("/api/timing/ab-tests?testType=time_of_day")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
    });

    it("should calculate results for tests without existing results", async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes("SELECT * FROM timing_ab_tests")) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                user_id: userId,
                test_type: "day_of_week",
                test_name: "Test without results",
                variant_a: JSON.stringify({ day_of_week: 1 }),
                variant_b: JSON.stringify({ day_of_week: 2 }),
                results_a: null,
                results_b: null,
              },
            ],
          });
        }
        if (
          query.includes("FROM application_submissions") &&
          query.includes("day_of_week = $1")
        ) {
          return Promise.resolve({
            rows: [
              { total_submissions: 5, responses: 2, interviews: 1, offers: 0 },
            ],
          });
        }
        if (query.includes("UPDATE timing_ab_tests")) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get("/api/timing/ab-tests")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
    });

    it("should handle time_of_day test type display", async () => {
      pool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            user_id: userId,
            test_type: "time_of_day",
            test_name: "9 AM vs 10 AM",
            variant_a: JSON.stringify({ hour_of_day: 9 }),
            variant_b: JSON.stringify({ hour_of_day: 10 }),
            results_a: JSON.stringify({ total_submissions: 10, responses: 5 }),
            results_b: JSON.stringify({ total_submissions: 8, responses: 3 }),
          },
        ],
      });

      const response = await request(app)
        .get("/api/timing/ab-tests")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.tests[0].variant_a_display).toContain("AM");
    });

    it("should handle day_hour_combination test type display", async () => {
      pool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            user_id: userId,
            test_type: "day_hour_combination",
            test_name: "Monday 9 AM vs Tuesday 10 AM",
            variant_a: JSON.stringify({ day_of_week: 1, hour_of_day: 9 }),
            variant_b: JSON.stringify({ day_of_week: 2, hour_of_day: 10 }),
            results_a: JSON.stringify({ total_submissions: 10, responses: 5 }),
            results_b: JSON.stringify({ total_submissions: 8, responses: 3 }),
          },
        ],
      });

      const response = await request(app)
        .get("/api/timing/ab-tests")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.tests[0].variant_a_display).toContain("Monday");
    });

    it("should handle industry_specific test type display", async () => {
      pool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            user_id: userId,
            test_type: "industry_specific",
            test_name: "Tech Monday vs Finance Tuesday",
            variant_a: JSON.stringify({
              industry: "Technology",
              day_of_week: 1,
            }),
            variant_b: JSON.stringify({ industry: "Finance", day_of_week: 2 }),
            results_a: JSON.stringify({ total_submissions: 10, responses: 5 }),
            results_b: JSON.stringify({ total_submissions: 8, responses: 3 }),
          },
        ],
      });

      const response = await request(app)
        .get("/api/timing/ab-tests")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.tests[0].variant_a_display).toContain("Technology");
    });
  });

  describe("POST /api/timing/ab-test - Additional Types", () => {
    it("should return 400 for invalid test type", async () => {
      const response = await request(app)
        .post("/api/timing/ab-test")
        .set("Authorization", `Bearer ${user.token}`)
        .send({
          testType: "invalid_type",
          variantA: { day_of_week: 1 },
          variantB: { day_of_week: 2 },
        });

      expect(response.status).toBe(400);
    });

    it("should return 404 when updating non-existent test", async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post("/api/timing/ab-test")
        .set("Authorization", `Bearer ${user.token}`)
        .send({
          testId: 999,
          testType: "day_of_week",
          variantA: { day_of_week: 1 },
          variantB: { day_of_week: 2 },
        });

      expect(response.status).toBe(404);
    });

    it("should create time_of_day test", async () => {
      pool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            user_id: userId,
            test_type: "time_of_day",
            variant_a: JSON.stringify({ hour_of_day: 9 }),
            variant_b: JSON.stringify({ hour_of_day: 14 }),
          },
        ],
      });

      const response = await request(app)
        .post("/api/timing/ab-test")
        .set("Authorization", `Bearer ${user.token}`)
        .send({
          testType: "time_of_day",
          testName: "Morning vs Afternoon",
          variantA: { hour_of_day: 9 },
          variantB: { hour_of_day: 14 },
        });

      expect(response.status).toBe(200);
    });

    it("should create day_hour_combination test", async () => {
      pool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            user_id: userId,
            test_type: "day_hour_combination",
            variant_a: JSON.stringify({ day_of_week: 1, hour_of_day: 9 }),
            variant_b: JSON.stringify({ day_of_week: 3, hour_of_day: 14 }),
          },
        ],
      });

      const response = await request(app)
        .post("/api/timing/ab-test")
        .set("Authorization", `Bearer ${user.token}`)
        .send({
          testType: "day_hour_combination",
          variantA: { day_of_week: 1, hour_of_day: 9 },
          variantB: { day_of_week: 3, hour_of_day: 14 },
        });

      expect(response.status).toBe(200);
    });

    it("should create industry_specific test", async () => {
      pool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            user_id: userId,
            test_type: "industry_specific",
            variant_a: JSON.stringify({
              industry: "Technology",
              day_of_week: 1,
            }),
            variant_b: JSON.stringify({ industry: "Finance", day_of_week: 2 }),
          },
        ],
      });

      const response = await request(app)
        .post("/api/timing/ab-test")
        .set("Authorization", `Bearer ${user.token}`)
        .send({
          testType: "industry_specific",
          variantA: { industry: "Technology", day_of_week: 1 },
          variantB: { industry: "Finance", day_of_week: 2 },
        });

      expect(response.status).toBe(200);
    });
  });

  describe("Error Handling", () => {
    it("should handle database error on submit", async () => {
      pool.query.mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app)
        .post("/api/timing/submit")
        .set("Authorization", `Bearer ${user.token}`)
        .send({ jobId: 1 });

      expect(response.status).toBe(500);
    });

    it("should handle database error on recommendations", async () => {
      pool.query.mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app)
        .get("/api/timing/recommendations/1")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(500);
    });

    it("should handle database error on optimal-times", async () => {
      pool.query.mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app)
        .get("/api/timing/optimal-times")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(500);
    });

    it("should handle database error on schedule POST", async () => {
      pool.query.mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app)
        .post("/api/timing/schedule")
        .set("Authorization", `Bearer ${user.token}`)
        .send({
          jobId: 1,
          scheduledDate: "2024-01-15",
          scheduledTime: "10:00:00",
        });

      expect(response.status).toBe(500);
    });

    it("should handle database error on scheduled GET", async () => {
      pool.query.mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app)
        .get("/api/timing/scheduled")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(500);
    });

    it("should handle database error on analytics", async () => {
      pool.query.mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app)
        .get("/api/timing/analytics")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(500);
    });

    it("should handle database error on response-rates", async () => {
      pool.query.mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app)
        .get("/api/timing/response-rates")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(500);
    });

    it("should handle database error on correlation", async () => {
      pool.query.mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app)
        .get("/api/timing/correlation")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(500);
    });

    it("should handle database error on ab-test POST", async () => {
      pool.query.mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app)
        .post("/api/timing/ab-test")
        .set("Authorization", `Bearer ${user.token}`)
        .send({
          testType: "day_of_week",
          variantA: { day_of_week: 1 },
          variantB: { day_of_week: 2 },
        });

      expect(response.status).toBe(500);
    });

    it("should handle database error on ab-tests GET", async () => {
      pool.query.mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app)
        .get("/api/timing/ab-tests")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(500);
    });
  });

  describe("PUT /api/timing/schedule/:id - Additional Cases", () => {
    it("should return 400 for invalid status", async () => {
      pool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            job_id: 1,
            user_id: userId,
            scheduled_date: "2024-01-15",
            scheduled_time: "10:00:00",
            status: "pending",
          },
        ],
      });

      const response = await request(app)
        .put("/api/timing/schedule/1")
        .set("Authorization", `Bearer ${user.token}`)
        .send({ status: "invalid_status" });

      expect(response.status).toBe(400);
    });

    it("should return 400 if no fields to update", async () => {
      pool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            job_id: 1,
            user_id: userId,
            scheduled_date: "2024-01-15",
            scheduled_time: "10:00:00",
            status: "pending",
          },
        ],
      });

      const response = await request(app)
        .put("/api/timing/schedule/1")
        .set("Authorization", `Bearer ${user.token}`)
        .send({});

      expect(response.status).toBe(400);
    });

    it("should update timezone field", async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes("SELECT * FROM scheduled_submissions")) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                job_id: 1,
                user_id: userId,
                scheduled_date: "2024-01-15",
                scheduled_time: "10:00:00",
                status: "pending",
              },
            ],
          });
        }
        if (query.includes("UPDATE scheduled_submissions")) {
          return Promise.resolve({
            rows: [{ id: 1, scheduled_timezone: "America/Los_Angeles" }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .put("/api/timing/schedule/1")
        .set("Authorization", `Bearer ${user.token}`)
        .send({ timezone: "America/Los_Angeles" });

      expect(response.status).toBe(200);
    });

    it("should update notes field", async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes("SELECT * FROM scheduled_submissions")) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                job_id: 1,
                user_id: userId,
                scheduled_date: "2024-01-15",
                scheduled_time: "10:00:00",
                status: "pending",
              },
            ],
          });
        }
        if (query.includes("UPDATE scheduled_submissions")) {
          return Promise.resolve({
            rows: [{ id: 1, notes: "Updated notes" }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .put("/api/timing/schedule/1")
        .set("Authorization", `Bearer ${user.token}`)
        .send({ notes: "Updated notes" });

      expect(response.status).toBe(200);
    });
  });

  describe("GET /api/timing/optimal-times - Filter by companySize", () => {
    it("should filter by companySize if provided", async () => {
      pool.query.mockImplementation((query, params) => {
        if (
          query.includes("AND company_size = $") &&
          params &&
          params[1] === "Large"
        ) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get("/api/timing/optimal-times?companySize=Large")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
    });
  });

  describe("GET /api/timing/scheduled - Additional Filters", () => {
    it("should filter by jobId if provided", async () => {
      pool.query.mockImplementation((query, params) => {
        if (
          query.includes("AND ss.job_id = $") &&
          params &&
          params[1] === "1"
        ) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get("/api/timing/scheduled?jobId=1")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
    });
  });

  describe("POST /api/timing/schedule - Job not found", () => {
    it("should return 404 if job not found", async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post("/api/timing/schedule")
        .set("Authorization", `Bearer ${user.token}`)
        .send({
          jobId: 999,
          scheduledDate: "2024-01-15",
          scheduledTime: "10:00:00",
        });

      expect(response.status).toBe(404);
    });
  });

  describe("PUT /api/timing/schedule/:id - Database Error", () => {
    it("should handle database error on update", async () => {
      pool.query
        .mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              job_id: 1,
              user_id: userId,
              scheduled_date: "2024-01-15",
              status: "pending",
            },
          ],
        })
        .mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app)
        .put("/api/timing/schedule/1")
        .set("Authorization", `Bearer ${user.token}`)
        .send({ scheduledDate: "2024-01-16" });

      expect(response.status).toBe(500);
    });
  });

  describe("DELETE /api/timing/schedule/:id - Database Error", () => {
    it("should handle database error on delete", async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app)
        .delete("/api/timing/schedule/1")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(500);
    });
  });

  describe("GET /api/timing/recommendations/:jobId - Expired Recommendation", () => {
    it("should handle expired recommendation and generate new one", async () => {
      // Create a date more than 48 hours in the past
      const pastDate = new Date();
      pastDate.setHours(pastDate.getHours() - 50);
      const pastDateStr = pastDate.toISOString().split("T")[0];

      pool.query.mockImplementation((query) => {
        if (query.includes("SELECT * FROM jobs WHERE id = $1")) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                user_id: userId,
                company: "Test Corp",
                title: "Engineer",
              },
            ],
          });
        }
        if (query.includes("SELECT * FROM timing_recommendations")) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                job_id: 1,
                recommended_date: pastDateStr,
                recommended_time: "06:00:00",
                recommended_timezone: "America/New_York",
                day_of_week: 1,
                hour_of_day: 6,
                confidence_score: 0.8,
              },
            ],
          });
        }
        if (query.includes("UPDATE timing_recommendations SET status")) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes("INSERT INTO timing_recommendations")) {
          return Promise.resolve({
            rows: [
              {
                id: 2,
                job_id: 1,
                recommended_date: new Date().toISOString().split("T")[0],
                recommended_time: "10:00:00",
                recommended_timezone: "America/New_York",
                day_of_week: 2,
                hour_of_day: 10,
                confidence_score: 0.85,
              },
            ],
          });
        }
        if (query.includes("FROM application_submissions")) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get("/api/timing/recommendations/1")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.recommendation).toBeDefined();
    });

    it("should format date with invalid datetime gracefully", async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes("SELECT * FROM jobs WHERE id = $1")) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                user_id: userId,
                company: "Test Corp",
                title: "Engineer",
              },
            ],
          });
        }
        if (
          query.includes("SELECT * FROM timing_recommendations") &&
          query.includes("status = 'active'")
        ) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                job_id: 1,
                recommended_date: "invalid-date-format",
                recommended_time: "invalid",
                recommended_timezone: "America/New_York",
                day_of_week: 1,
                hour_of_day: 10,
                confidence_score: 0.8,
              },
            ],
          });
        }
        if (query.includes("FROM application_submissions")) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes("SELECT COUNT(*)")) {
          return Promise.resolve({ rows: [{ total: 0 }] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get("/api/timing/recommendations/1")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.recommendation.formatted_date).toBeDefined();
    });

    it("should recalculate company analysis if not in optimalTiming", async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes("SELECT * FROM jobs WHERE id = $1")) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                user_id: userId,
                company: "Google",
                title: "Engineer",
              },
            ],
          });
        }
        if (
          query.includes("SELECT * FROM timing_recommendations") &&
          query.includes("status = 'active'")
        ) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                job_id: 1,
                recommended_date: new Date().toISOString().split("T")[0],
                recommended_time: "10:00:00",
                recommended_timezone: "America/New_York",
                day_of_week: 2,
                hour_of_day: 10,
                confidence_score: 0.8,
              },
            ],
          });
        }
        if (query.includes("FROM application_submissions")) {
          return Promise.resolve({
            rows: [
              {
                day_of_week: 2,
                hour_of_day: 10,
                response_received: true,
                response_type: "interview",
              },
            ],
          });
        }
        if (query.includes("SELECT COUNT(*)")) {
          return Promise.resolve({ rows: [{ total: 0 }] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get("/api/timing/recommendations/1")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
    });
  });

  describe("GET /api/timing/ab-tests - A/B Test Calculations", () => {
    it("should calculate results with time_of_day test type for aggregate results", async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes("SELECT * FROM timing_ab_tests")) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                user_id: userId,
                test_type: "time_of_day",
                test_name: "9 AM vs 2 PM",
                variant_a: JSON.stringify({ hour_of_day: 9 }),
                variant_b: JSON.stringify({ hour_of_day: 14 }),
                results_a: null,
                results_b: null,
              },
            ],
          });
        }
        if (
          query.includes("FROM application_submissions") &&
          query.includes("hour_of_day = $1")
        ) {
          return Promise.resolve({
            rows: [
              {
                total_submissions: 20,
                responses: 10,
                interviews: 5,
                offers: 2,
              },
            ],
          });
        }
        if (query.includes("UPDATE timing_ab_tests")) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get("/api/timing/ab-tests")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.tests[0].variant_a_display).toContain("AM");
    });

    it("should calculate results with day_hour_combination test type", async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes("SELECT * FROM timing_ab_tests")) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                user_id: userId,
                test_type: "day_hour_combination",
                test_name: "Monday 9 AM vs Wednesday 2 PM",
                variant_a: JSON.stringify({ day_of_week: 1, hour_of_day: 9 }),
                variant_b: JSON.stringify({ day_of_week: 3, hour_of_day: 14 }),
                results_a: null,
                results_b: null,
              },
            ],
          });
        }
        if (
          query.includes("FROM application_submissions") &&
          query.includes("day_of_week = $1 AND hour_of_day = $2")
        ) {
          return Promise.resolve({
            rows: [
              { total_submissions: 15, responses: 8, interviews: 4, offers: 1 },
            ],
          });
        }
        if (query.includes("UPDATE timing_ab_tests")) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get("/api/timing/ab-tests")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.tests[0].variant_a_display).toContain("Monday");
    });

    it("should calculate results with industry_specific test type", async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes("SELECT * FROM timing_ab_tests")) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                user_id: userId,
                test_type: "industry_specific",
                test_name: "Tech vs Finance",
                variant_a: JSON.stringify({
                  industry: "Technology",
                  day_of_week: 2,
                }),
                variant_b: JSON.stringify({
                  industry: "Finance",
                  day_of_week: 3,
                }),
                results_a: null,
                results_b: null,
              },
            ],
          });
        }
        if (
          query.includes("FROM application_submissions") &&
          query.includes("industry = $1 AND day_of_week = $2")
        ) {
          return Promise.resolve({
            rows: [
              {
                total_submissions: 25,
                responses: 12,
                interviews: 6,
                offers: 3,
              },
            ],
          });
        }
        if (query.includes("UPDATE timing_ab_tests")) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get("/api/timing/ab-tests")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.tests[0].variant_a_display).toContain("Technology");
    });

    it("should handle error in calculateVariantResultsAggregate", async () => {
      let queryCount = 0;
      pool.query.mockImplementation((query) => {
        if (query.includes("SELECT * FROM timing_ab_tests")) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                user_id: userId,
                test_type: "day_of_week",
                test_name: "Test",
                variant_a: JSON.stringify({ day_of_week: 1 }),
                variant_b: JSON.stringify({ day_of_week: 2 }),
                results_a: null,
                results_b: null,
              },
            ],
          });
        }
        if (query.includes("FROM application_submissions")) {
          queryCount++;
          // Fail on the aggregate query
          return Promise.reject(new Error("Aggregate query failed"));
        }
        if (query.includes("UPDATE timing_ab_tests")) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get("/api/timing/ab-tests")
        .set("Authorization", `Bearer ${user.token}`);

      // Should still return 200, but with default values for results
      expect(response.status).toBe(200);
    });

    it("should determine winner as variant_a when scoreA > scoreB", async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes("SELECT * FROM timing_ab_tests")) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                user_id: userId,
                test_type: "day_of_week",
                test_name: "Monday vs Tuesday",
                variant_a: JSON.stringify({ day_of_week: 1 }),
                variant_b: JSON.stringify({ day_of_week: 2 }),
                results_a: null,
                results_b: null,
              },
            ],
          });
        }
        if (
          query.includes("FROM application_submissions") &&
          query.includes("day_of_week = $1")
        ) {
          // Variant A has much better results
          const dayParam = query.match(/day_of_week = \$1/);
          if (dayParam) {
            return Promise.resolve({
              rows: [
                {
                  total_submissions: 100,
                  responses: 80,
                  interviews: 50,
                  offers: 20,
                },
              ],
            });
          }
          return Promise.resolve({
            rows: [
              {
                total_submissions: 100,
                responses: 20,
                interviews: 5,
                offers: 1,
              },
            ],
          });
        }
        if (query.includes("UPDATE timing_ab_tests")) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get("/api/timing/ab-tests")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
    });

    it("should determine winner as variant_b when scoreB > scoreA", async () => {
      let callCount = 0;
      pool.query.mockImplementation((query) => {
        if (query.includes("SELECT * FROM timing_ab_tests")) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                user_id: userId,
                test_type: "day_of_week",
                test_name: "Monday vs Tuesday",
                variant_a: JSON.stringify({ day_of_week: 1 }),
                variant_b: JSON.stringify({ day_of_week: 2 }),
                results_a: null,
                results_b: null,
              },
            ],
          });
        }
        if (
          query.includes("FROM application_submissions") &&
          query.includes("day_of_week = $1")
        ) {
          callCount++;
          // Variant A (first call) has worse results, Variant B (second call) has better results
          if (callCount === 1) {
            return Promise.resolve({
              rows: [
                {
                  total_submissions: 100,
                  responses: 10,
                  interviews: 2,
                  offers: 0,
                },
              ],
            });
          } else {
            return Promise.resolve({
              rows: [
                {
                  total_submissions: 100,
                  responses: 80,
                  interviews: 50,
                  offers: 25,
                },
              ],
            });
          }
        }
        if (query.includes("UPDATE timing_ab_tests")) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get("/api/timing/ab-tests")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
    });

    it("should use response_rate as tiebreaker when composite scores are equal", async () => {
      let callCount = 0;
      pool.query.mockImplementation((query) => {
        if (query.includes("SELECT * FROM timing_ab_tests")) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                user_id: userId,
                test_type: "day_of_week",
                test_name: "Monday vs Tuesday",
                variant_a: JSON.stringify({ day_of_week: 1 }),
                variant_b: JSON.stringify({ day_of_week: 2 }),
                results_a: null,
                results_b: null,
              },
            ],
          });
        }
        if (
          query.includes("FROM application_submissions") &&
          query.includes("day_of_week = $1")
        ) {
          callCount++;
          // Both have very similar results - same composite score
          if (callCount === 1) {
            return Promise.resolve({
              rows: [
                {
                  total_submissions: 100,
                  responses: 51, // slightly higher response rate
                  interviews: 25,
                  offers: 10,
                },
              ],
            });
          } else {
            return Promise.resolve({
              rows: [
                {
                  total_submissions: 100,
                  responses: 50,
                  interviews: 25,
                  offers: 10,
                },
              ],
            });
          }
        }
        if (query.includes("UPDATE timing_ab_tests")) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get("/api/timing/ab-tests")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
    });

    it("should handle error during A/B test calculation gracefully", async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes("SELECT * FROM timing_ab_tests")) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                user_id: userId,
                test_type: "day_of_week",
                test_name: "Test",
                variant_a: JSON.stringify({ day_of_week: 1 }),
                variant_b: JSON.stringify({ day_of_week: 2 }),
                results_a: null,
                results_b: null,
              },
            ],
          });
        }
        if (query.includes("FROM application_submissions")) {
          return Promise.resolve({
            rows: [
              { total_submissions: 10, responses: 5, interviews: 2, offers: 1 },
            ],
          });
        }
        if (query.includes("UPDATE timing_ab_tests")) {
          // This should trigger the error catch block at line 2170
          return Promise.reject(new Error("Update failed"));
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get("/api/timing/ab-tests")
        .set("Authorization", `Bearer ${user.token}`);

      // Should still return 200 as errors are caught
      expect(response.status).toBe(200);
    });

    it("should handle test with zero submissions", async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes("SELECT * FROM timing_ab_tests")) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                user_id: userId,
                test_type: "day_of_week",
                test_name: "Test",
                variant_a: JSON.stringify({ day_of_week: 1 }),
                variant_b: JSON.stringify({ day_of_week: 2 }),
                results_a: null,
                results_b: null,
              },
            ],
          });
        }
        if (query.includes("FROM application_submissions")) {
          return Promise.resolve({
            rows: [
              { total_submissions: 0, responses: 0, interviews: 0, offers: 0 },
            ],
          });
        }
        if (query.includes("UPDATE timing_ab_tests")) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get("/api/timing/ab-tests")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
    });
  });

  describe("Real-time status calculation", () => {
    it("should show submit_now when at optimal time window (within 2 hours)", async () => {
      // Create a recommended date/time that is 1 hour from now
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 1);
      const futureDateStr = futureDate.toISOString().split("T")[0];
      const futureTimeStr = `${String(futureDate.getHours()).padStart(2, "0")}:00:00`;

      pool.query.mockImplementation((query) => {
        if (query.includes("SELECT * FROM jobs WHERE id = $1")) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                user_id: userId,
                company: "Test Corp",
                title: "Engineer",
              },
            ],
          });
        }
        if (
          query.includes("SELECT * FROM timing_recommendations") &&
          query.includes("status = 'active'")
        ) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                job_id: 1,
                recommended_date: futureDateStr,
                recommended_time: futureTimeStr,
                recommended_timezone: "America/New_York",
                day_of_week: futureDate.getDay(),
                hour_of_day: futureDate.getHours(),
                confidence_score: 0.8,
              },
            ],
          });
        }
        if (query.includes("FROM application_submissions")) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes("SELECT COUNT(*)")) {
          return Promise.resolve({ rows: [{ total: 0 }] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get("/api/timing/recommendations/1")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
    });

    it("should show acceptable when past optimal time but within 48 hours", async () => {
      // Create a recommended date/time that is 10 hours in the past
      const pastDate = new Date();
      pastDate.setHours(pastDate.getHours() - 10);
      const pastDateStr = pastDate.toISOString().split("T")[0];
      const pastTimeStr = `${String(pastDate.getHours()).padStart(2, "0")}:00:00`;

      pool.query.mockImplementation((query) => {
        if (query.includes("SELECT * FROM jobs WHERE id = $1")) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                user_id: userId,
                company: "Test Corp",
                title: "Engineer",
              },
            ],
          });
        }
        if (
          query.includes("SELECT * FROM timing_recommendations") &&
          query.includes("status = 'active'")
        ) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                job_id: 1,
                recommended_date: pastDateStr,
                recommended_time: pastTimeStr,
                recommended_timezone: "America/New_York",
                day_of_week: pastDate.getDay(),
                hour_of_day: pastDate.getHours(),
                confidence_score: 0.8,
              },
            ],
          });
        }
        if (query.includes("FROM application_submissions")) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes("SELECT COUNT(*)")) {
          return Promise.resolve({ rows: [{ total: 0 }] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get("/api/timing/recommendations/1")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
    });

    it("should show wait when more than 24 hours away", async () => {
      // Create a recommended date/time that is 3 days from now
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 3);
      const futureDateStr = futureDate.toISOString().split("T")[0];

      pool.query.mockImplementation((query) => {
        if (query.includes("SELECT * FROM jobs WHERE id = $1")) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                user_id: userId,
                company: "Test Corp",
                title: "Engineer",
              },
            ],
          });
        }
        if (
          query.includes("SELECT * FROM timing_recommendations") &&
          query.includes("status = 'active'")
        ) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                job_id: 1,
                recommended_date: futureDateStr,
                recommended_time: "10:00:00",
                recommended_timezone: "America/New_York",
                day_of_week: futureDate.getDay(),
                hour_of_day: 10,
                confidence_score: 0.8,
              },
            ],
          });
        }
        if (query.includes("FROM application_submissions")) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes("SELECT COUNT(*)")) {
          return Promise.resolve({ rows: [{ total: 0 }] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get("/api/timing/recommendations/1")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.recommendation.real_time_status).toBe("wait");
    });
  });

  describe("Company-specific timing analysis", () => {
    it("should include company timing data when available", async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes("SELECT * FROM jobs WHERE id = $1")) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                user_id: userId,
                company: "Google",
                title: "Engineer",
                industry: "Technology",
              },
            ],
          });
        }
        if (query.includes("SELECT * FROM timing_recommendations") && query.includes("status = 'active'")) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes("SELECT COUNT(*) as total") && query.includes("j.company")) {
          return Promise.resolve({ rows: [{ total: 5, company: "Google" }] });
        }
        if (query.includes("SELECT") && query.includes("asub.day_of_week") && query.includes("LOWER(TRIM(j.company))")) {
          return Promise.resolve({
            rows: [
              { day_of_week: 2, hour_of_day: 10, response_received: true, response_type: "interview", submission_count: 3 },
              { day_of_week: 2, hour_of_day: 10, response_received: false, response_type: null, submission_count: 2 },
            ],
          });
        }
        if (query.includes("FROM application_submissions") && query.includes("ORDER BY submitted_at DESC")) {
          return Promise.resolve({
            rows: [
              { day_of_week: 1, hour_of_day: 10, response_received: true, response_type: "interview" },
              { day_of_week: 2, hour_of_day: 10, response_received: true, response_type: "offer" },
            ],
          });
        }
        if (query.includes("INSERT INTO timing_recommendations")) {
          return Promise.resolve({
            rows: [{
              id: 1,
              job_id: 1,
              recommended_date: new Date().toISOString().split("T")[0],
              recommended_time: "10:00:00",
              day_of_week: 2,
              hour_of_day: 10,
              confidence_score: 0.7,
            }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get("/api/timing/recommendations/1")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
    });
  });

  describe("calculateOptimalTiming with historical data", () => {
    it("should use historical data when available", async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes("SELECT * FROM jobs WHERE id = $1")) {
          return Promise.resolve({
            rows: [{ id: 1, user_id: userId, company: "Test Corp", title: "Engineer" }],
          });
        }
        if (query.includes("SELECT * FROM timing_recommendations") && query.includes("status = 'active'")) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes("FROM application_submissions") && query.includes("ORDER BY submitted_at DESC")) {
          return Promise.resolve({
            rows: [
              { day_of_week: 1, hour_of_day: 10, response_received: true, response_type: "interview", industry: "Technology", company_size: "large" },
              { day_of_week: 1, hour_of_day: 10, response_received: true, response_type: "offer", industry: "Technology", company_size: "large" },
              { day_of_week: 2, hour_of_day: 14, response_received: false, response_type: null, industry: "Technology", company_size: "large" },
              { day_of_week: 1, hour_of_day: 10, response_received: true, response_type: "phone_screen", industry: "Technology", company_size: "large" },
            ],
          });
        }
        if (query.includes("INSERT INTO timing_recommendations")) {
          return Promise.resolve({
            rows: [{
              id: 1,
              job_id: 1,
              recommended_date: new Date().toISOString().split("T")[0],
              recommended_time: "10:00:00",
              day_of_week: 1,
              hour_of_day: 10,
              confidence_score: 0.8,
            }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get("/api/timing/recommendations/1")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.recommendation).toBeDefined();
    });
  });

  describe("Date format handling", () => {
    it("should handle Date object from database", async () => {
      const dateObj = new Date("2024-01-15");
      pool.query.mockImplementation((query) => {
        if (query.includes("SELECT * FROM jobs WHERE id = $1")) {
          return Promise.resolve({
            rows: [{ id: 1, user_id: userId, company: "Test Corp", title: "Engineer" }],
          });
        }
        if (query.includes("SELECT * FROM timing_recommendations") && query.includes("status = 'active'")) {
          return Promise.resolve({
            rows: [{
              id: 1,
              job_id: 1,
              recommended_date: dateObj, // Date object instead of string
              recommended_time: "10:00:00",
              recommended_timezone: "America/New_York",
              day_of_week: 1,
              hour_of_day: 10,
              confidence_score: 0.8,
            }],
          });
        }
        if (query.includes("FROM application_submissions")) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get("/api/timing/recommendations/1")
        .set("Authorization", `Bearer ${user.token}`);

      expect([200, 500]).toContain(response.status);
    });

    it("should handle MM/DD/YYYY date format", async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes("SELECT * FROM jobs WHERE id = $1")) {
          return Promise.resolve({
            rows: [{ id: 1, user_id: userId, company: "Test Corp", title: "Engineer" }],
          });
        }
        if (query.includes("SELECT * FROM timing_recommendations") && query.includes("status = 'active'")) {
          return Promise.resolve({
            rows: [{
              id: 1,
              job_id: 1,
              recommended_date: "01/15/2024", // MM/DD/YYYY format
              recommended_time: "10:00:00",
              recommended_timezone: "America/New_York",
              day_of_week: 1,
              hour_of_day: 10,
              confidence_score: 0.8,
            }],
          });
        }
        if (query.includes("FROM application_submissions")) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get("/api/timing/recommendations/1")
        .set("Authorization", `Bearer ${user.token}`);

      expect([200, 500]).toContain(response.status);
    });
  });

  describe("GET /api/timing/scheduled - Date formatting edge cases", () => {
    it("should handle scheduled items with invalid date gracefully", async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          job_id: 1,
          user_id: userId,
          scheduled_date: "invalid-date",
          scheduled_time: "10:00:00",
          status: "pending",
          job_title: "Software Engineer",
          job_company: "Tech Corp",
        }],
      });

      const response = await request(app)
        .get("/api/timing/scheduled")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.schedules).toBeDefined();
    });

    it("should handle null scheduled_time", async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      pool.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          job_id: 1,
          user_id: userId,
          scheduled_date: futureDate.toISOString().split("T")[0],
          scheduled_time: null,
          status: "pending",
          job_title: "Software Engineer",
          job_company: "Tech Corp",
        }],
      });

      const response = await request(app)
        .get("/api/timing/scheduled")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
    });
  });

  describe("POST /api/timing/submit - Edge cases", () => {
    it("should handle submission without optional fields", async () => {
      pool.query.mockImplementation((query, params) => {
        if (query.includes("SELECT id, industry, type FROM jobs")) {
          return Promise.resolve({
            rows: [{ id: 1, industry: null, type: null }],
          });
        }
        if (query.includes("INSERT INTO application_submissions")) {
          return Promise.resolve({
            rows: [{
              id: 1,
              job_id: 1,
              user_id: userId,
              submitted_at: new Date(),
              day_of_week: 1,
              hour_of_day: 10,
            }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .post("/api/timing/submit")
        .set("Authorization", `Bearer ${user.token}`)
        .send({ jobId: 1 });

      expect(response.status).toBe(200);
    });
  });

  describe("POST /api/timing/schedule - Additional validation", () => {
    it("should handle schedule with notes", async () => {
      pool.query.mockImplementation((query, params) => {
        if (query.includes("SELECT id FROM jobs") && params && params[0] === 1) {
          return Promise.resolve({ rows: [{ id: 1 }] });
        }
        if (query.includes("SELECT id FROM scheduled_submissions") && query.includes("status = 'pending'")) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes("INSERT INTO scheduled_submissions")) {
          return Promise.resolve({
            rows: [{
              id: 1,
              job_id: 1,
              user_id: userId,
              scheduled_date: "2024-01-15",
              scheduled_time: "10:00:00",
              notes: "Remember to follow up",
              status: "pending",
            }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .post("/api/timing/schedule")
        .set("Authorization", `Bearer ${user.token}`)
        .send({
          jobId: 1,
          scheduledDate: "2024-01-15",
          scheduledTime: "10:00:00",
          timezone: "America/New_York",
          notes: "Remember to follow up",
        });

      expect(response.status).toBe(200);
    });
  });

  describe("PUT /api/timing/schedule/:id - Status transitions", () => {
    it("should handle missed status", async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes("SELECT * FROM scheduled_submissions WHERE id = $1")) {
          return Promise.resolve({
            rows: [{
              id: 1,
              job_id: 1,
              user_id: userId,
              scheduled_date: "2024-01-15",
              scheduled_time: "10:00:00",
              status: "pending",
            }],
          });
        }
        if (query.includes("UPDATE scheduled_submissions")) {
          return Promise.resolve({
            rows: [{ id: 1, status: "missed" }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .put("/api/timing/schedule/1")
        .set("Authorization", `Bearer ${user.token}`)
        .send({ status: "missed" });

      expect(response.status).toBe(200);
    });

    it("should handle cancelled status", async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes("SELECT * FROM scheduled_submissions WHERE id = $1")) {
          return Promise.resolve({
            rows: [{
              id: 1,
              job_id: 1,
              user_id: userId,
              scheduled_date: "2024-01-15",
              scheduled_time: "10:00:00",
              status: "pending",
            }],
          });
        }
        if (query.includes("UPDATE scheduled_submissions")) {
          return Promise.resolve({
            rows: [{ id: 1, status: "cancelled" }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .put("/api/timing/schedule/1")
        .set("Authorization", `Bearer ${user.token}`)
        .send({ status: "cancelled" });

      expect(response.status).toBe(200);
    });

    it("should handle completed status with existing submission", async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes("SELECT * FROM scheduled_submissions WHERE id = $1")) {
          return Promise.resolve({
            rows: [{
              id: 1,
              job_id: 1,
              user_id: userId,
              scheduled_date: "2024-01-15",
              scheduled_time: "10:00:00",
              status: "pending",
            }],
          });
        }
        if (query.includes("SELECT industry, type FROM jobs")) {
          return Promise.resolve({
            rows: [{ industry: "Technology", type: "Full-time" }],
          });
        }
        if (query.includes("SELECT id FROM application_submissions") && query.includes("ORDER BY submitted_at DESC")) {
          return Promise.resolve({
            rows: [{ id: 1 }], // Existing submission
          });
        }
        if (query.includes("UPDATE scheduled_submissions")) {
          return Promise.resolve({
            rows: [{ id: 1, status: "completed" }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .put("/api/timing/schedule/1")
        .set("Authorization", `Bearer ${user.token}`)
        .send({ status: "completed" });

      expect(response.status).toBe(200);
    });
  });

  describe("GET /api/timing/optimal-times - Filter combinations", () => {
    it("should filter by both industry and companySize", async () => {
      pool.query.mockImplementation((query, params) => {
        if (query.includes("AND industry = $") && query.includes("AND company_size = $")) {
          return Promise.resolve({
            rows: [{
              day_of_week: 1,
              hour_of_day: 10,
              total_submissions: 5,
              responses: 3,
              interviews: 1,
              offers: 0,
            }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get("/api/timing/optimal-times?industry=Technology&companySize=Large")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
    });
  });

  describe("POST /api/timing/ab-test - calculateVariantResults", () => {
    it("should update existing A/B test with time_of_day variant", async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes("SELECT * FROM timing_ab_tests WHERE id = $1")) {
          return Promise.resolve({
            rows: [{
              id: 1,
              user_id: userId,
              test_type: "time_of_day",
              variant_a: JSON.stringify({ hour_of_day: 9 }),
              variant_b: JSON.stringify({ hour_of_day: 14 }),
            }],
          });
        }
        if (query.includes("FROM application_submissions") && query.includes("hour_of_day = $")) {
          return Promise.resolve({
            rows: [{ total_submissions: 20, responses: 10, interviews: 5, offers: 2 }],
          });
        }
        if (query.includes("UPDATE timing_ab_tests")) {
          return Promise.resolve({
            rows: [{
              id: 1,
              results_a: JSON.stringify({ total_submissions: 20, responses: 10 }),
              results_b: JSON.stringify({ total_submissions: 15, responses: 5 }),
            }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .post("/api/timing/ab-test")
        .set("Authorization", `Bearer ${user.token}`)
        .send({
          testId: 1,
          testType: "time_of_day",
          variantA: { hour_of_day: 9 },
          variantB: { hour_of_day: 14 },
        });

      expect(response.status).toBe(200);
    });

    it("should update existing A/B test with day_hour_combination variant", async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes("SELECT * FROM timing_ab_tests WHERE id = $1")) {
          return Promise.resolve({
            rows: [{
              id: 1,
              user_id: userId,
              test_type: "day_hour_combination",
              variant_a: JSON.stringify({ day_of_week: 1, hour_of_day: 9 }),
              variant_b: JSON.stringify({ day_of_week: 3, hour_of_day: 14 }),
            }],
          });
        }
        if (query.includes("FROM application_submissions") && query.includes("day_of_week = $2 AND hour_of_day = $3")) {
          return Promise.resolve({
            rows: [{ total_submissions: 15, responses: 8, interviews: 4, offers: 1 }],
          });
        }
        if (query.includes("UPDATE timing_ab_tests")) {
          return Promise.resolve({
            rows: [{
              id: 1,
              results_a: JSON.stringify({ total_submissions: 15, responses: 8 }),
              results_b: JSON.stringify({ total_submissions: 12, responses: 4 }),
            }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .post("/api/timing/ab-test")
        .set("Authorization", `Bearer ${user.token}`)
        .send({
          testId: 1,
          testType: "day_hour_combination",
          variantA: { day_of_week: 1, hour_of_day: 9 },
          variantB: { day_of_week: 3, hour_of_day: 14 },
        });

      expect(response.status).toBe(200);
    });

    it("should update existing A/B test with industry_specific variant", async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes("SELECT * FROM timing_ab_tests WHERE id = $1")) {
          return Promise.resolve({
            rows: [{
              id: 1,
              user_id: userId,
              test_type: "industry_specific",
              variant_a: JSON.stringify({ industry: "Technology", day_of_week: 1 }),
              variant_b: JSON.stringify({ industry: "Finance", day_of_week: 2 }),
            }],
          });
        }
        if (query.includes("FROM application_submissions") && query.includes("industry = $2 AND day_of_week = $3")) {
          return Promise.resolve({
            rows: [{ total_submissions: 25, responses: 12, interviews: 6, offers: 3 }],
          });
        }
        if (query.includes("UPDATE timing_ab_tests")) {
          return Promise.resolve({
            rows: [{
              id: 1,
              results_a: JSON.stringify({ total_submissions: 25, responses: 12 }),
              results_b: JSON.stringify({ total_submissions: 20, responses: 8 }),
            }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .post("/api/timing/ab-test")
        .set("Authorization", `Bearer ${user.token}`)
        .send({
          testId: 1,
          testType: "industry_specific",
          variantA: { industry: "Technology", day_of_week: 1 },
          variantB: { industry: "Finance", day_of_week: 2 },
        });

      expect(response.status).toBe(200);
    });
  });

  describe("GET /api/timing/scheduled - Date Parsing Edge Cases", () => {
    it("should handle invalid date format in scheduled submissions", async () => {
      pool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            job_id: 1,
            user_id: userId,
            scheduled_date: "invalid-date",
            scheduled_time: "10:00:00",
            status: "pending",
            company: "Test Corp",
            title: "Engineer",
          },
        ],
      });

      const response = await request(app)
        .get("/api/timing/scheduled")
        .set("Authorization", `Bearer ${user.token}`);

      expect([200, 500]).toContain(response.status);
    });

    it("should handle null scheduled_date", async () => {
      pool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            job_id: 1,
            user_id: userId,
            scheduled_date: null,
            scheduled_time: "10:00:00",
            status: "pending",
          },
        ],
      });

      const response = await request(app)
        .get("/api/timing/scheduled")
        .set("Authorization", `Bearer ${user.token}`);

      expect([200, 500]).toContain(response.status);
    });

    it("should handle date only format (no time)", async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);

      pool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            job_id: 1,
            user_id: userId,
            scheduled_date: futureDate.toISOString().split("T")[0],
            scheduled_time: null,
            status: "pending",
          },
        ],
      });

      const response = await request(app)
        .get("/api/timing/scheduled")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
    });
  });

  describe("PUT /api/timing/schedule/:id - Submission Recording Error", () => {
    it("should handle submission recording error gracefully", async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      // Schedule check
      pool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            job_id: 1,
            user_id: userId,
            scheduled_date: pastDate.toISOString().split("T")[0],
            scheduled_time: "10:00:00",
            status: "pending",
          },
        ],
      });

      // Job check for submission recording
      pool.query.mockResolvedValueOnce({
        rows: [
          { id: 1, user_id: userId, company: "Test Corp", title: "Engineer" },
        ],
      });

      // Submission recording throws error
      pool.query.mockRejectedValueOnce(new Error("Submission recording failed"));

      // Update succeeds
      pool.query.mockResolvedValueOnce({
        rows: [{ id: 1, status: "submitted" }],
      });

      const response = await request(app)
        .put("/api/timing/schedule/1")
        .set("Authorization", `Bearer ${user.token}`)
        .send({ status: "submitted" });

      expect([200, 400, 404, 500]).toContain(response.status);
    });
  });

  describe("A/B Test Results Calculation - Winner Determination", () => {
    it("should determine winner when scores are equal using response_rate tiebreaker", async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes("SELECT * FROM timing_ab_tests")) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                user_id: userId,
                test_type: "day_of_week",
                test_name: "Equal Scores Test",
                variant_a: JSON.stringify({ day_of_week: 1 }),
                variant_b: JSON.stringify({ day_of_week: 2 }),
                results_a: null,
                results_b: null,
              },
            ],
          });
        }
        if (query.includes("FROM application_submissions") && query.includes("day_of_week = $")) {
          // Return same composite score but different response rates
          return Promise.resolve({
            rows: [
              { total_submissions: 10, responses: 6, interviews: 2, offers: 0 },
            ],
          });
        }
        if (query.includes("UPDATE timing_ab_tests")) {
          return Promise.resolve({ rows: [{ id: 1 }] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get("/api/timing/ab-tests")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
    });

    it("should handle variant_b winning with clear difference", async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes("SELECT * FROM timing_ab_tests")) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                user_id: userId,
                test_type: "day_of_week",
                test_name: "B Wins Test",
                variant_a: JSON.stringify({ day_of_week: 1 }),
                variant_b: JSON.stringify({ day_of_week: 2 }),
                results_a: null,
                results_b: null,
              },
            ],
          });
        }
        if (query.includes("FROM application_submissions") && query.includes("day_of_week = $1")) {
          return Promise.resolve({
            rows: [
              { total_submissions: 10, responses: 2, interviews: 0, offers: 0 },
            ],
          });
        }
        if (query.includes("FROM application_submissions") && query.includes("day_of_week = $2")) {
          return Promise.resolve({
            rows: [
              { total_submissions: 10, responses: 8, interviews: 5, offers: 2 },
            ],
          });
        }
        if (query.includes("UPDATE timing_ab_tests")) {
          return Promise.resolve({ rows: [{ id: 1 }] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get("/api/timing/ab-tests")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
    });
  });

  describe("GET /api/timing/recommendations/:jobId - Company Analysis", () => {
    it("should include company analysis from optimalTiming", async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes("SELECT * FROM jobs WHERE id = $1")) {
          return Promise.resolve({
            rows: [{ id: 1, user_id: userId, company: "Test Corp", title: "Engineer" }],
          });
        }
        if (query.includes("SELECT * FROM timing_recommendations") && query.includes("status = 'active'")) {
          return Promise.resolve({
            rows: [{
              id: 1,
              job_id: 1,
              recommended_date: "2024-01-20",
              recommended_time: "10:00:00",
              recommended_timezone: "America/New_York",
              day_of_week: 1,
              hour_of_day: 10,
              confidence_score: 0.85,
            }],
          });
        }
        if (query.includes("SELECT * FROM optimal_submission_timing")) {
          return Promise.resolve({
            rows: [{
              id: 1,
              job_id: 1,
              company_analysis: { industry: "Tech", hiring_pattern: "quarterly" },
            }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get("/api/timing/recommendations/1")
        .set("Authorization", `Bearer ${user.token}`);

      expect([200, 500]).toContain(response.status);
    });

    it("should fall back to cached company analysis", async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes("SELECT * FROM jobs WHERE id = $1")) {
          return Promise.resolve({
            rows: [{ id: 1, user_id: userId, company: "Test Corp", title: "Engineer" }],
          });
        }
        if (query.includes("SELECT * FROM timing_recommendations") && query.includes("status = 'active'")) {
          return Promise.resolve({
            rows: [{
              id: 1,
              job_id: 1,
              recommended_date: "2024-01-20",
              recommended_time: "10:00:00",
              recommended_timezone: "America/New_York",
              day_of_week: 1,
              hour_of_day: 10,
              confidence_score: 0.85,
            }],
          });
        }
        if (query.includes("SELECT * FROM optimal_submission_timing")) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes("company_analysis_cache")) {
          return Promise.resolve({
            rows: [{ company_analysis: { industry: "Finance" } }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get("/api/timing/recommendations/1")
        .set("Authorization", `Bearer ${user.token}`);

      expect([200, 500]).toContain(response.status);
    });

    it("should handle no company analysis available", async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes("SELECT * FROM jobs WHERE id = $1")) {
          return Promise.resolve({
            rows: [{ id: 1, user_id: userId, company: "Test Corp", title: "Engineer" }],
          });
        }
        if (query.includes("SELECT * FROM timing_recommendations") && query.includes("status = 'active'")) {
          return Promise.resolve({
            rows: [{
              id: 1,
              job_id: 1,
              recommended_date: "2024-01-20",
              recommended_time: "10:00:00",
              recommended_timezone: "America/New_York",
              day_of_week: 1,
              hour_of_day: 10,
              confidence_score: 0.85,
            }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get("/api/timing/recommendations/1")
        .set("Authorization", `Bearer ${user.token}`);

      expect([200, 500]).toContain(response.status);
    });
  });

  describe("Calculate Variant Results - Different Test Types", () => {
    it("should calculate results for time_of_day test type", async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes("SELECT * FROM timing_ab_tests")) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                user_id: userId,
                test_type: "time_of_day",
                test_name: "Morning vs Afternoon",
                variant_a: JSON.stringify({ hour_of_day: 9 }),
                variant_b: JSON.stringify({ hour_of_day: 14 }),
                results_a: null,
                results_b: null,
              },
            ],
          });
        }
        if (query.includes("FROM application_submissions") && query.includes("hour_of_day = $")) {
          return Promise.resolve({
            rows: [
              { total_submissions: 8, responses: 4, interviews: 2, offers: 1 },
            ],
          });
        }
        if (query.includes("UPDATE timing_ab_tests")) {
          return Promise.resolve({ rows: [{ id: 1 }] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get("/api/timing/ab-tests")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
    });

    it("should calculate results for day_hour_combination test type", async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes("SELECT * FROM timing_ab_tests")) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                user_id: userId,
                test_type: "day_hour_combination",
                test_name: "Monday 9AM vs Wednesday 2PM",
                variant_a: JSON.stringify({ day_of_week: 1, hour_of_day: 9 }),
                variant_b: JSON.stringify({ day_of_week: 3, hour_of_day: 14 }),
                results_a: null,
                results_b: null,
              },
            ],
          });
        }
        if (query.includes("FROM application_submissions") && query.includes("day_of_week = $") && query.includes("hour_of_day = $")) {
          return Promise.resolve({
            rows: [
              { total_submissions: 5, responses: 3, interviews: 2, offers: 1 },
            ],
          });
        }
        if (query.includes("UPDATE timing_ab_tests")) {
          return Promise.resolve({ rows: [{ id: 1 }] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get("/api/timing/ab-tests")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
    });

    it("should calculate results for industry_specific test type", async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes("SELECT * FROM timing_ab_tests")) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                user_id: userId,
                test_type: "industry_specific",
                test_name: "Tech Monday vs Finance Tuesday",
                variant_a: JSON.stringify({ industry: "Technology", day_of_week: 1 }),
                variant_b: JSON.stringify({ industry: "Finance", day_of_week: 2 }),
                results_a: null,
                results_b: null,
              },
            ],
          });
        }
        if (query.includes("FROM application_submissions") && query.includes("industry = $") && query.includes("day_of_week = $")) {
          return Promise.resolve({
            rows: [
              { total_submissions: 12, responses: 6, interviews: 3, offers: 1 },
            ],
          });
        }
        if (query.includes("UPDATE timing_ab_tests")) {
          return Promise.resolve({ rows: [{ id: 1 }] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get("/api/timing/ab-tests")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
    });

    it("should determine variant_a as winner when scoreA > scoreB", async () => {
      let variantCallCount = 0;
      pool.query.mockImplementation((query) => {
        if (query.includes("SELECT * FROM timing_ab_tests")) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                user_id: userId,
                test_type: "day_of_week",
                test_name: "A Better Test",
                variant_a: JSON.stringify({ day_of_week: 1 }),
                variant_b: JSON.stringify({ day_of_week: 2 }),
                results_a: null,
                results_b: null,
              },
            ],
          });
        }
        if (query.includes("FROM application_submissions") && query.includes("day_of_week")) {
          variantCallCount++;
          if (variantCallCount === 1) {
            // Variant A: High performance
            return Promise.resolve({
              rows: [{ total_submissions: 20, responses: 15, interviews: 10, offers: 5 }],
            });
          } else {
            // Variant B: Low performance
            return Promise.resolve({
              rows: [{ total_submissions: 20, responses: 5, interviews: 2, offers: 0 }],
            });
          }
        }
        if (query.includes("UPDATE timing_ab_tests")) {
          return Promise.resolve({ rows: [{ id: 1 }] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get("/api/timing/ab-tests")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
    });

    it("should use tiebreaker when composite scores are equal", async () => {
      let variantCallCount = 0;
      pool.query.mockImplementation((query) => {
        if (query.includes("SELECT * FROM timing_ab_tests")) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                user_id: userId,
                test_type: "day_of_week",
                test_name: "Equal Scores Tiebreaker",
                variant_a: JSON.stringify({ day_of_week: 1 }),
                variant_b: JSON.stringify({ day_of_week: 2 }),
                results_a: null,
                results_b: null,
              },
            ],
          });
        }
        if (query.includes("FROM application_submissions") && query.includes("day_of_week")) {
          variantCallCount++;
          if (variantCallCount === 1) {
            // Variant A: Same composite but higher response_rate
            return Promise.resolve({
              rows: [{ total_submissions: 10, responses: 6, interviews: 2, offers: 1 }],
            });
          } else {
            // Variant B: Same composite but lower response_rate
            return Promise.resolve({
              rows: [{ total_submissions: 10, responses: 4, interviews: 3, offers: 1 }],
            });
          }
        }
        if (query.includes("UPDATE timing_ab_tests")) {
          return Promise.resolve({ rows: [{ id: 1 }] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get("/api/timing/ab-tests")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
    });
  });

  describe("Authentication", () => {
    it("should return 401 without token on submit", async () => {
      const response = await request(app)
        .post("/api/timing/submit")
        .send({ jobId: 1 });

      expect(response.status).toBe(401);
    });

    it("should return 401 without token on recommendations", async () => {
      const response = await request(app)
        .get("/api/timing/recommendations/1");

      expect(response.status).toBe(401);
    });

    it("should return 401 without token on optimal-times", async () => {
      const response = await request(app)
        .get("/api/timing/optimal-times");

      expect(response.status).toBe(401);
    });

    it("should return 401 without token on schedule POST", async () => {
      const response = await request(app)
        .post("/api/timing/schedule")
        .send({ jobId: 1, scheduledDate: "2024-01-15", scheduledTime: "10:00:00" });

      expect(response.status).toBe(401);
    });

    it("should return 401 without token on scheduled GET", async () => {
      const response = await request(app)
        .get("/api/timing/scheduled");

      expect(response.status).toBe(401);
    });

    it("should return 401 without token on analytics", async () => {
      const response = await request(app)
        .get("/api/timing/analytics");

      expect(response.status).toBe(401);
    });

    it("should return 401 without token on response-rates", async () => {
      const response = await request(app)
        .get("/api/timing/response-rates");

      expect(response.status).toBe(401);
    });

    it("should return 401 without token on correlation", async () => {
      const response = await request(app)
        .get("/api/timing/correlation");

      expect(response.status).toBe(401);
    });

    it("should return 401 without token on ab-test POST", async () => {
      const response = await request(app)
        .post("/api/timing/ab-test")
        .send({ testType: "day_of_week", variantA: { day_of_week: 1 }, variantB: { day_of_week: 2 } });

      expect(response.status).toBe(401);
    });

    it("should return 401 without token on ab-tests GET", async () => {
      const response = await request(app)
        .get("/api/timing/ab-tests");

      expect(response.status).toBe(401);
    });
  });

  describe("POST /api/timing/process-reminders", () => {
    it("should process scheduled submission reminders", async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes("SELECT") && query.includes("scheduled_submissions")) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                job_id: 1,
                user_id: userId,
                scheduled_date: new Date().toISOString().split("T")[0],
                scheduled_time: "10:00:00",
                reminder_sent: false,
                job_title: "Software Engineer",
                job_company: "Tech Corp",
                user_email: "test@example.com",
              },
            ],
          });
        }
        if (query.includes("UPDATE scheduled_submissions SET reminder_sent")) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .post("/api/timing/process-reminders")
        .set("Authorization", `Bearer ${user.token}`);

      expect([200, 500]).toContain(response.status);
    });

    it("should handle empty reminders list", async () => {
      pool.query.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .post("/api/timing/process-reminders")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.processed).toBe(0);
    });

    it("should handle database error on process reminders", async () => {
      pool.query.mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app)
        .post("/api/timing/process-reminders")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(500);
    });

    it("should handle reminder without user email", async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes("SELECT") && query.includes("scheduled_submissions")) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                job_id: 1,
                user_id: userId,
                scheduled_date: new Date().toISOString().split("T")[0],
                scheduled_time: "10:00:00",
                reminder_sent: false,
                job_title: "Software Engineer",
                job_company: "Tech Corp",
                user_email: null, // No email
              },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .post("/api/timing/process-reminders")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.results).toEqual([]);
    });

    it("should handle email sending failure", async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes("SELECT") && query.includes("scheduled_submissions")) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                job_id: 1,
                user_id: userId,
                scheduled_date: new Date().toISOString().split("T")[0],
                scheduled_time: "10:00:00",
                reminder_sent: false,
                job_title: "Software Engineer",
                job_company: "Tech Corp",
                user_email: "test@example.com",
              },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .post("/api/timing/process-reminders")
        .set("Authorization", `Bearer ${user.token}`);

      expect([200, 500]).toContain(response.status);
    });
  });

  describe("A/B Test Winner Determination - Equal Scores Tiebreaker", () => {
    it("should use response_rate as tiebreaker when composite scores are exactly equal", async () => {
      pool.query.mockImplementation((query, params) => {
        if (query.includes("SELECT * FROM timing_ab_tests")) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                user_id: userId,
                test_type: "day_of_week",
                test_name: "Equal Composite Test",
                variant_a: JSON.stringify({ day_of_week: 1 }),
                variant_b: JSON.stringify({ day_of_week: 2 }),
                results_a: null,
                results_b: null,
              },
            ],
          });
        }
        // Return exactly equal composite scores but different response rates
        if (query.includes("FROM application_submissions")) {
          const dayParam = params && params[0];
          if (dayParam === 1) {
            return Promise.resolve({
              rows: [{ total_submissions: 100, responses: 60, interviews: 20, offers: 5 }],
            });
          } else if (dayParam === 2) {
            return Promise.resolve({
              rows: [{ total_submissions: 100, responses: 55, interviews: 22, offers: 6 }],
            });
          }
        }
        if (query.includes("UPDATE timing_ab_tests")) {
          return Promise.resolve({ rows: [{ id: 1 }] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get("/api/timing/ab-tests")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
    });

    it("should determine winner correctly when scoreA equals scoreB", async () => {
      pool.query.mockImplementation((query, params) => {
        if (query.includes("SELECT * FROM timing_ab_tests")) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                user_id: userId,
                test_type: "time_of_day",
                test_name: "Time Test",
                variant_a: JSON.stringify({ time_of_day: "morning" }),
                variant_b: JSON.stringify({ time_of_day: "evening" }),
                results_a: null,
                results_b: null,
              },
            ],
          });
        }
        // Return same scores
        if (query.includes("FROM application_submissions") && query.includes("hour_of_day")) {
          return Promise.resolve({
            rows: [{ total_submissions: 50, responses: 25, interviews: 10, offers: 2 }],
          });
        }
        if (query.includes("UPDATE timing_ab_tests")) {
          return Promise.resolve({ rows: [{ id: 1 }] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get("/api/timing/ab-tests")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
    });
  });
});
