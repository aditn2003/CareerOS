/**
 * Time Investment Routes Tests
 * Tests routes/timeInvestment.js
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import express from "express";
import timeInvestmentRoutes from "../../routes/timeInvestment.js";
import { createTestUser } from "../helpers/auth.js";
import pool from "../../db/pool.js";

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

describe("Time Investment Routes", () => {
  let app;
  let user;
  let userId;

  beforeEach(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";
    
    app = express();
    app.use(express.json());
    app.use("/api/time-investment", timeInvestmentRoutes);
    
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

  describe("GET /api/time-investment", () => {
    it("should get time investment analytics", async () => {
      pool.query.mockImplementation((query) => {
        if (
          query.includes("SELECT id, title, company, status, notes, applied_on")
        ) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                title: "Software Engineer",
                company: "Tech Corp",
                status: "Applied",
                applied_on: "2024-01-15",
                created_at: "2024-01-15",
              },
            ],
          });
        }
        if (query.includes("SELECT id, job_id, event, timestamp")) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes("SELECT id, activity_type, time_spent_minutes")) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes("SELECT id, event_name, event_date")) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes("SELECT id, company, role, interview_date")) {
          return Promise.resolve({ rows: [] });
        }
        if (
          query.includes("SELECT id, activity_type, title, duration_minutes")
        ) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes("SELECT id, company, role, status")) {
          return Promise.resolve({ rows: [] });
        }
        if (
          query.includes("SELECT id, prep_type, status, time_spent_seconds")
        ) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get("/api/time-investment")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.summary).toBeDefined();
      expect(response.body.activityDistribution).toBeDefined();
      expect(response.body.productivityPatterns).toBeDefined();
      expect(response.body.taskCompletion).toBeDefined();
      expect(response.body.burnoutAnalysis).toBeDefined();
      expect(response.body.energyLevels).toBeDefined();
      expect(response.body.recommendations).toBeDefined();
    });

    it("should handle missing tables gracefully", async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes("SELECT id, title, company")) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                title: "Software Engineer",
                company: "Tech Corp",
                status: "Applied",
                applied_on: "2024-01-15",
                created_at: "2024-01-15",
              },
            ],
          });
        }
        if (query.includes("SELECT id, job_id, event")) {
          return Promise.reject(
            new Error("Table application_history does not exist")
          );
        }
        if (query.includes("SELECT id, activity_type")) {
          return Promise.reject(
            new Error("Table networking_activities does not exist")
          );
        }
        if (query.includes("SELECT id, event_name")) {
          return Promise.reject(
            new Error("Table networking_events does not exist")
          );
        }
        if (query.includes("SELECT id, company, role")) {
          return Promise.reject(
            new Error("Table interview_outcomes does not exist")
          );
        }
        if (query.includes("SELECT id, activity_type, title")) {
          return Promise.reject(
            new Error("Table job_search_activities does not exist")
          );
        }
        if (query.includes("SELECT id, company, role, status")) {
          return Promise.reject(
            new Error("Table mock_interview_sessions does not exist")
          );
        }
        if (query.includes("SELECT id, prep_type")) {
          return Promise.reject(
            new Error("Table technical_prep_sessions does not exist")
          );
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get("/api/time-investment")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.summary).toBeDefined();
    });

    it("should calculate activity distribution correctly", async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes("SELECT id, title, company, status")) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                title: "Software Engineer",
                company: "Tech Corp",
                status: "Applied",
                applied_on: "2024-01-15",
                created_at: "2024-01-15",
              },
              {
                id: 2,
                title: "Data Scientist",
                company: "Data Corp",
                status: "Interested",
                created_at: "2024-01-16",
              },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get("/api/time-investment")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(
        response.body.activityDistribution.applications.count
      ).toBeGreaterThan(0);
    });
  });

  describe("POST /api/time-investment/activities", () => {
    it("should log a manual activity", async () => {
      pool.query.mockResolvedValueOnce({
        rows: [
          {
          id: 1,
          user_id: userId,
            activity_type: "application",
            title: "Applied to Tech Corp",
          duration_minutes: 30,
            activity_date: "2024-01-15",
          },
        ],
      });

      const response = await request(app)
        .post("/api/time-investment/activities")
        .set("Authorization", `Bearer ${user.token}`)
        .send({
          activity_type: "application",
          title: "Applied to Tech Corp",
          duration_minutes: 30,
          activity_date: "2024-01-15",
        });

      expect(response.status).toBe(201);
      expect(response.body.activity).toBeDefined();
    });

    it("should return 400 if activity_type is missing", async () => {
      const response = await request(app)
        .post("/api/time-investment/activities")
        .set("Authorization", `Bearer ${user.token}`)
        .send({
          title: "Applied to Tech Corp",
          duration_minutes: 30,
        });

      expect(response.status).toBe(400);
    });

    it("should return 400 if duration_minutes is invalid", async () => {
      const response = await request(app)
        .post("/api/time-investment/activities")
        .set("Authorization", `Bearer ${user.token}`)
        .send({
          activity_type: "application",
          duration_minutes: 0,
        });

      expect(response.status).toBe(400);
    });
  });

  describe("GET /api/time-investment/activities", () => {
    it("should get user activities", async () => {
      pool.query
        .mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              user_id: userId,
              activity_type: "application",
              title: "Applied to Tech Corp",
              duration_minutes: 30,
              activity_date: "2024-01-15",
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [{ count: "1" }],
        });

      const response = await request(app)
        .get("/api/time-investment/activities")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.activities).toBeDefined();
      expect(response.body.total).toBe(1);
    });

    it("should filter by activity_type", async () => {
      pool.query
        .mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              activity_type: "application",
              title: "Applied to Tech Corp",
              duration_minutes: 30,
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [{ count: "1" }],
        });

      const response = await request(app)
        .get("/api/time-investment/activities?activity_type=application")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.activities.length).toBe(1);
    });

    it("should filter by date range", async () => {
      pool.query
        .mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              activity_type: "application",
              activity_date: "2024-01-15",
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [{ count: "1" }],
        });

      const response = await request(app)
        .get(
          "/api/time-investment/activities?start_date=2024-01-01&end_date=2024-01-31"
        )
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
    });
  });

  describe("PUT /api/time-investment/activities/:id", () => {
    it("should update an activity", async () => {
      pool.query
        .mockResolvedValueOnce({
          rows: [{ id: 1 }],
        })
        .mockResolvedValueOnce({
          rows: [
            {
            id: 1,
            user_id: userId,
              activity_type: "application",
              title: "Updated Title",
            duration_minutes: 45,
            },
          ],
        });

      const response = await request(app)
        .put("/api/time-investment/activities/1")
        .set("Authorization", `Bearer ${user.token}`)
        .send({
          title: "Updated Title",
          duration_minutes: 45,
        });

      expect(response.status).toBe(200);
      expect(response.body.activity.title).toBe("Updated Title");
    });

    it("should return 404 if activity not found", async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .put("/api/time-investment/activities/999")
        .set("Authorization", `Bearer ${user.token}`)
        .send({
          title: "Updated Title",
        });

      expect(response.status).toBe(404);
    });

    it("should return 400 if no valid fields to update", async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ id: 1 }],
      });

      const response = await request(app)
        .put("/api/time-investment/activities/1")
        .set("Authorization", `Bearer ${user.token}`)
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe("DELETE /api/time-investment/activities/:id", () => {
    it("should delete an activity", async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ id: 1 }],
      });

      const response = await request(app)
        .delete("/api/time-investment/activities/1")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain("deleted successfully");
    });

    it("should return 404 if activity not found", async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .delete("/api/time-investment/activities/999")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(404);
    });
  });

  describe("GET /api/time-investment/activity-types", () => {
    it("should return activity type options", async () => {
      const response = await request(app)
        .get("/api/time-investment/activity-types")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.activityTypes).toBeDefined();
      expect(Array.isArray(response.body.activityTypes)).toBe(true);
      expect(response.body.activityTypes.length).toBeGreaterThan(0);
    });
  });

  describe("Database error handling", () => {
    it("should handle database error on main GET endpoint", async () => {
      pool.query.mockRejectedValueOnce(new Error("Database connection failed"));

      const response = await request(app)
        .get("/api/time-investment")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(500);
      expect(response.body.error).toBeDefined();
    });

    it("should handle database error on POST activities", async () => {
      pool.query.mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app)
        .post("/api/time-investment/activities")
        .set("Authorization", `Bearer ${user.token}`)
        .send({
          activity_type: "application",
          duration_minutes: 30,
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBeDefined();
    });

    it("should handle database error on GET activities", async () => {
      pool.query.mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app)
        .get("/api/time-investment/activities")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(500);
      expect(response.body.error).toBeDefined();
    });

    it("should handle database error on PUT activities", async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app)
        .put("/api/time-investment/activities/1")
        .set("Authorization", `Bearer ${user.token}`)
        .send({ title: "Updated" });

      expect(response.status).toBe(500);
      expect(response.body.error).toBeDefined();
    });

    it("should handle database error on DELETE activities", async () => {
      pool.query.mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app)
        .delete("/api/time-investment/activities/1")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(500);
      expect(response.body.error).toBeDefined();
    });
  });

  describe("Activity Distribution Edge Cases", () => {
    it("should handle interview job status", async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes("SELECT id, title, company, status")) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                title: "Software Engineer",
                company: "Tech Corp",
                status: "Interview",
                applied_on: "2024-01-15",
                created_at: "2024-01-15",
              },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get("/api/time-investment")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(
        response.body.activityDistribution.applications.count
      ).toBeGreaterThan(0);
    });

    it("should handle offer job status", async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes("SELECT id, title, company, status")) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                title: "Software Engineer",
                company: "Tech Corp",
                status: "Offer",
                applied_on: "2024-01-15",
                created_at: "2024-01-15",
              },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get("/api/time-investment")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
    });

    it("should handle rejected job status", async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes("SELECT id, title, company, status")) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                title: "Software Engineer",
                company: "Tech Corp",
                status: "Rejected",
                applied_on: "2024-01-15",
                created_at: "2024-01-15",
              },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get("/api/time-investment")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
    });

    it("should handle unknown job status", async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes("SELECT id, title, company, status")) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                title: "Software Engineer",
                company: "Tech Corp",
                status: "Unknown Status",
                applied_on: "2024-01-15",
                created_at: "2024-01-15",
              },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get("/api/time-investment")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
    });

    it("should handle networking activities with follow_up type", async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes("SELECT id, title, company, status")) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes("SELECT id, activity_type, time_spent_minutes")) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                activity_type: "follow_up",
                time_spent_minutes: 15,
                created_at: "2024-01-15T10:00:00Z",
              },
              {
                id: 2,
                activity_type: "networking",
                time_spent_minutes: 30,
                created_at: "2024-01-15T14:00:00Z",
              },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get("/api/time-investment")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(
        response.body.activityDistribution.followups.count
      ).toBeGreaterThan(0);
      expect(
        response.body.activityDistribution.networking.count
      ).toBeGreaterThan(0);
    });

    it("should handle networking events with time calculation", async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes("SELECT id, title, company, status")) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes("SELECT id, event_name, event_date")) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                event_name: "Tech Meetup",
                event_date: "2024-01-15",
                event_start_time: "14:00",
                event_end_time: "16:00",
                created_at: "2024-01-15",
              },
              {
                id: 2,
                event_name: "Career Fair",
                event_date: "2024-01-16",
                event_start_time: null,
                event_end_time: null,
                created_at: "2024-01-16",
              },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get("/api/time-investment")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.activityDistribution.events.count).toBe(2);
    });

    it("should handle interview outcomes with prep time", async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes("SELECT id, title, company, status")) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes("SELECT id, company, role, interview_date")) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                company: "Tech Corp",
                role: "Engineer",
                interview_date: "2024-01-15",
                duration_minutes: 60,
                hours_prepared: 2,
                created_at: "2024-01-15",
              },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get("/api/time-investment")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.activityDistribution.interviews.count).toBe(1);
    });

    it("should handle technical prep sessions", async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes("SELECT id, title, company, status")) {
          return Promise.resolve({ rows: [] });
        }
        if (
          query.includes("SELECT id, prep_type, status, time_spent_seconds")
        ) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                prep_type: "coding",
                status: "completed",
                time_spent_seconds: 3600,
                created_at: "2024-01-15",
              },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get("/api/time-investment")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.activityDistribution.skillDevelopment.count).toBe(1);
    });

    it("should handle mock interview sessions", async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes("SELECT id, title, company, status")) {
          return Promise.resolve({ rows: [] });
        }
        if (
          query.includes("SELECT id, company, role, status") &&
          query.includes("mock_interview_sessions")
        ) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                company: "Tech Corp",
                role: "Engineer",
                status: "completed",
                created_at: "2024-01-15",
              },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get("/api/time-investment")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.activityDistribution.interviewPrep.count).toBe(1);
    });
  });

  describe("Manual Activity Types", () => {
    it("should handle research activity type", async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes("SELECT id, title, company, status")) {
          return Promise.resolve({ rows: [] });
        }
        if (
          query.includes("SELECT id, activity_type, title, duration_minutes")
        ) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                activity_type: "research",
                title: "Company Research",
                duration_minutes: 30,
                activity_date: "2024-01-15",
                start_time: "10:00",
              },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get("/api/time-investment")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.activityDistribution.research.count).toBe(1);
    });

    it("should handle resume_update activity type", async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes("SELECT id, title, company, status")) {
          return Promise.resolve({ rows: [] });
        }
        if (
          query.includes("SELECT id, activity_type, title, duration_minutes")
        ) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                activity_type: "resume_update",
                title: "Resume Update",
                duration_minutes: 45,
                activity_date: "2024-01-15",
              },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get("/api/time-investment")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
    });

    it("should handle cover_letter activity type", async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes("SELECT id, title, company, status")) {
          return Promise.resolve({ rows: [] });
        }
        if (
          query.includes("SELECT id, activity_type, title, duration_minutes")
        ) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                activity_type: "cover_letter",
                title: "Cover Letter",
                duration_minutes: 60,
                activity_date: "2024-01-15",
              },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get("/api/time-investment")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
    });

    it("should handle linkedin_optimization activity type", async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes("SELECT id, title, company, status")) {
          return Promise.resolve({ rows: [] });
        }
        if (
          query.includes("SELECT id, activity_type, title, duration_minutes")
        ) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                activity_type: "linkedin_optimization",
                title: "LinkedIn Update",
                duration_minutes: 30,
                activity_date: "2024-01-15",
              },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get("/api/time-investment")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
    });

    it("should handle interview_prep activity type", async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes("SELECT id, title, company, status")) {
          return Promise.resolve({ rows: [] });
        }
        if (
          query.includes("SELECT id, activity_type, title, duration_minutes")
        ) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                activity_type: "interview_prep",
                title: "Interview Prep",
                duration_minutes: 60,
                activity_date: "2024-01-15",
              },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get("/api/time-investment")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
    });

    it("should handle mock_interview activity type", async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes("SELECT id, title, company, status")) {
          return Promise.resolve({ rows: [] });
        }
        if (
          query.includes("SELECT id, activity_type, title, duration_minutes")
        ) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                activity_type: "mock_interview",
                title: "Mock Interview",
                duration_minutes: 45,
                activity_date: "2024-01-15",
              },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get("/api/time-investment")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
    });

    it("should handle phone_screen activity type", async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes("SELECT id, title, company, status")) {
          return Promise.resolve({ rows: [] });
        }
        if (
          query.includes("SELECT id, activity_type, title, duration_minutes")
        ) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                activity_type: "phone_screen",
                title: "Phone Screen",
                duration_minutes: 30,
                activity_date: "2024-01-15",
              },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get("/api/time-investment")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
    });

    it("should handle interview activity type", async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes("SELECT id, title, company, status")) {
          return Promise.resolve({ rows: [] });
        }
        if (
          query.includes("SELECT id, activity_type, title, duration_minutes")
        ) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                activity_type: "interview",
                title: "Interview",
                duration_minutes: 60,
                activity_date: "2024-01-15",
              },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get("/api/time-investment")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
    });

    it("should handle coding_practice activity type", async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes("SELECT id, title, company, status")) {
          return Promise.resolve({ rows: [] });
        }
        if (
          query.includes("SELECT id, activity_type, title, duration_minutes")
        ) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                activity_type: "coding_practice",
                title: "LeetCode Practice",
                duration_minutes: 60,
                activity_date: "2024-01-15",
              },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get("/api/time-investment")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
    });

    it("should handle skill_learning activity type", async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes("SELECT id, title, company, status")) {
          return Promise.resolve({ rows: [] });
        }
        if (
          query.includes("SELECT id, activity_type, title, duration_minutes")
        ) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                activity_type: "skill_learning",
                title: "Online Course",
                duration_minutes: 90,
                activity_date: "2024-01-15",
              },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get("/api/time-investment")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
    });

    it("should handle portfolio_update activity type", async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes("SELECT id, title, company, status")) {
          return Promise.resolve({ rows: [] });
        }
        if (
          query.includes("SELECT id, activity_type, title, duration_minutes")
        ) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                activity_type: "portfolio_update",
                title: "Portfolio Update",
                duration_minutes: 120,
                activity_date: "2024-01-15",
              },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get("/api/time-investment")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
    });

    it("should handle default/other activity type", async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes("SELECT id, title, company, status")) {
          return Promise.resolve({ rows: [] });
        }
        if (
          query.includes("SELECT id, activity_type, title, duration_minutes")
        ) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                activity_type: "other",
                title: "Other Activity",
                duration_minutes: 30,
                activity_date: "2024-01-15",
              },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get("/api/time-investment")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
    });
  });

  describe("Productivity Patterns Edge Cases", () => {
    it("should handle jobs with midnight timestamps", async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes("SELECT id, title, company, status")) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                title: "Software Engineer",
                company: "Tech Corp",
                status: "Applied",
                applied_on: "2024-01-15T00:00:00Z",
                created_at: "2024-01-15T00:00:00Z",
              },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get("/api/time-investment")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.productivityPatterns).toBeDefined();
    });

    it("should handle application history timestamps", async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes("SELECT id, title, company, status")) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes("SELECT id, job_id, event, timestamp")) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                job_id: 1,
                event: "status_change",
                timestamp: "2024-01-15T14:30:00Z",
                from_status: "Interested",
                to_status: "Applied",
              },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get("/api/time-investment")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
    });

    it("should handle manual activities with start_time", async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes("SELECT id, title, company, status")) {
          return Promise.resolve({ rows: [] });
        }
        if (
          query.includes("SELECT id, activity_type, title, duration_minutes")
        ) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                activity_type: "application",
                title: "Application",
                duration_minutes: 30,
                activity_date: "2024-01-15",
                start_time: "14:30",
                energy_level: 4,
                productivity_rating: 5,
              },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get("/api/time-investment")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.energyLevels).toBeDefined();
    });
  });

  describe("Task Completion Edge Cases", () => {
    it("should handle wishlist status", async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes("SELECT id, title, company, status")) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                title: "Software Engineer",
                company: "Tech Corp",
                status: "Wishlist",
                created_at: "2024-01-15",
              },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get("/api/time-investment")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
    });

    it("should handle application submitted status", async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes("SELECT id, title, company, status")) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                title: "Software Engineer",
                company: "Tech Corp",
                status: "Application Submitted",
                created_at: "2024-01-15",
              },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get("/api/time-investment")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
    });

    it("should handle interviewing status", async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes("SELECT id, title, company, status")) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                title: "Software Engineer",
                company: "Tech Corp",
                status: "Interviewing",
                created_at: "2024-01-15",
              },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get("/api/time-investment")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
    });

    it("should handle phone screen status", async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes("SELECT id, title, company, status")) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                title: "Software Engineer",
                company: "Tech Corp",
                status: "Phone Screen",
                created_at: "2024-01-15",
              },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get("/api/time-investment")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
    });

    it("should handle offer received status", async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes("SELECT id, title, company, status")) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                title: "Software Engineer",
                company: "Tech Corp",
                status: "Offer Received",
                created_at: "2024-01-15",
              },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get("/api/time-investment")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
    });

    it("should handle accepted status", async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes("SELECT id, title, company, status")) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                title: "Software Engineer",
                company: "Tech Corp",
                status: "Accepted",
                created_at: "2024-01-15",
              },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get("/api/time-investment")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
    });

    it("should handle rejection status", async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes("SELECT id, title, company, status")) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                title: "Software Engineer",
                company: "Tech Corp",
                status: "Rejection",
                created_at: "2024-01-15",
              },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get("/api/time-investment")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
    });

    it("should handle declined status", async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes("SELECT id, title, company, status")) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                title: "Software Engineer",
                company: "Tech Corp",
                status: "Declined",
                created_at: "2024-01-15",
              },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get("/api/time-investment")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
    });
  });

  describe("Burnout Analysis Edge Cases", () => {
    it("should detect high activity days", async () => {
      const highActivityJobs = [];
      for (let i = 0; i < 15; i++) {
        highActivityJobs.push({
          id: i + 1,
          title: `Job ${i + 1}`,
          company: `Company ${i + 1}`,
          status: "Applied",
          applied_on: "2024-01-15",
          created_at: "2024-01-15",
        });
      }

      pool.query.mockImplementation((query) => {
        if (query.includes("SELECT id, title, company, status")) {
          return Promise.resolve({ rows: highActivityJobs });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get("/api/time-investment")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.burnoutAnalysis).toBeDefined();
    });

    it("should detect long activity gaps", async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes("SELECT id, title, company, status")) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                title: "Job 1",
                company: "Company 1",
                status: "Applied",
                applied_on: "2024-01-01",
                created_at: "2024-01-01",
              },
              {
                id: 2,
                title: "Job 2",
                company: "Company 2",
                status: "Applied",
                applied_on: "2024-01-20",
                created_at: "2024-01-20",
              },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get("/api/time-investment")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.burnoutAnalysis.gapAnalysis).toBeDefined();
    });

    it("should calculate weekend activity ratio", async () => {
      pool.query.mockImplementation((query) => {
        if (query.includes("SELECT id, title, company, status")) {
          return Promise.resolve({
            rows: [
              {
                id: 1,
                title: "Job 1",
                company: "Company 1",
                status: "Applied",
                applied_on: "2024-01-06", // Saturday
                created_at: "2024-01-06",
              },
              {
                id: 2,
                title: "Job 2",
                company: "Company 2",
                status: "Applied",
                applied_on: "2024-01-07", // Sunday
                created_at: "2024-01-07",
              },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .get("/api/time-investment")
        .set("Authorization", `Bearer ${user.token}`);

      expect(response.status).toBe(200);
      expect(response.body.burnoutAnalysis.weekendRatio).toBeDefined();
    });
  });

  describe("PUT /api/time-investment/activities/:id - Additional Fields", () => {
    it("should update is_completed field", async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              is_completed: true,
            },
          ],
        });

      const response = await request(app)
        .put("/api/time-investment/activities/1")
        .set("Authorization", `Bearer ${user.token}`)
        .send({ is_completed: true });

      expect(response.status).toBe(200);
    });

    it("should update energy_level field", async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              energy_level: 4,
            },
          ],
        });

      const response = await request(app)
        .put("/api/time-investment/activities/1")
        .set("Authorization", `Bearer ${user.token}`)
        .send({ energy_level: 4 });

      expect(response.status).toBe(200);
    });

    it("should update productivity_rating field", async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              productivity_rating: 5,
            },
          ],
        });

      const response = await request(app)
        .put("/api/time-investment/activities/1")
        .set("Authorization", `Bearer ${user.token}`)
        .send({ productivity_rating: 5 });

      expect(response.status).toBe(200);
    });

    it("should update tags field", async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              tags: ["important", "follow-up"],
            },
          ],
        });

      const response = await request(app)
        .put("/api/time-investment/activities/1")
        .set("Authorization", `Bearer ${user.token}`)
        .send({ tags: ["important", "follow-up"] });

      expect(response.status).toBe(200);
    });
  });
});
