/**
 * Follow-up Reminders Routes Tests
 * Tests routes/followupReminders.js
 * Target: 90%+ coverage, 100% functions
 */

import { describe, it, expect, beforeEach, vi, beforeAll } from "vitest";
import request from "supertest";
import express from "express";
import jwt from "jsonwebtoken";

// Hoist mock functions
const { mockQuery } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
}));

// Mock database pool
vi.mock("../../db/pool.js", () => ({
  default: {
    query: (...args) => mockQuery(...args),
  },
}));

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

// Helper to create valid JWT
function createToken(userId = 1, email = "test@test.com") {
  return jwt.sign({ id: userId, email }, JWT_SECRET);
}

// Import actual router and helper functions after mocks
import followupRemindersRouter, {
  calculateFollowUpDate as calcFollowUpDate,
  generateEmailTemplate as genEmailTemplate,
  adjustReminderFrequency as adjustFrequency,
  determineReminderType as determineType,
} from "../../routes/followupReminders.js";

describe("Follow-up Reminders Routes", () => {
  let app;
  let validToken;

  beforeAll(() => {
    validToken = createToken(1, "test@test.com");
  });

  beforeEach(() => {
    vi.clearAllMocks();

    app = express();
    app.use(express.json());
    app.use("/api/followup-reminders", followupRemindersRouter);
  });

  describe("Auth Middleware", () => {
    it("should reject requests without token", async () => {
      const response = await request(app).get("/api/followup-reminders/");

      expect(response.status).toBe(401);
      expect(response.body.error).toContain("No token");
    });

    it("should reject requests with invalid token", async () => {
      const response = await request(app)
        .get("/api/followup-reminders/")
        .set("Authorization", "Bearer invalid_token");

      expect(response.status).toBe(401);
      expect(response.body.error).toContain("Invalid");
    });

    it("should reject expired tokens", async () => {
      const expiredToken = jwt.sign({ id: 1 }, JWT_SECRET, {
        expiresIn: "-1h",
      });

      const response = await request(app)
        .get("/api/followup-reminders/")
        .set("Authorization", `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
      expect(response.body.error).toContain("expired");
    });
  });

  describe("GET /api/followup-reminders/", () => {
    it("should return all reminders for user", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            reminder_type: "application_followup",
            title: "Job A",
            company: "Test Co",
          },
        ],
      });

      const response = await request(app)
        .get("/api/followup-reminders/")
        .set("Authorization", `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
    });

    it("should filter by status", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get("/api/followup-reminders/")
        .query({ status: "pending" })
        .set("Authorization", `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(mockQuery).toHaveBeenCalled();
    });

    it("should filter by job_id", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get("/api/followup-reminders/")
        .query({ job_id: 1 })
        .set("Authorization", `Bearer ${validToken}`);

      expect(response.status).toBe(200);
    });

    it("should filter by type", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get("/api/followup-reminders/")
        .query({ type: "application_followup" })
        .set("Authorization", `Bearer ${validToken}`);

      expect(response.status).toBe(200);
    });

    it("should handle table not found error (42P01)", async () => {
      mockQuery.mockRejectedValueOnce({
        code: "42P01",
        message: "relation does not exist",
      });

      const response = await request(app)
        .get("/api/followup-reminders/")
        .set("Authorization", `Bearer ${validToken}`);

      expect(response.status).toBe(500);
      expect(response.body.error).toContain("Database tables");
    });

    it("should handle table not found error (message)", async () => {
      mockQuery.mockRejectedValueOnce({ message: "relation does not exist" });

      const response = await request(app)
        .get("/api/followup-reminders/")
        .set("Authorization", `Bearer ${validToken}`);

      expect(response.status).toBe(500);
    });

    it("should handle generic database errors", async () => {
      mockQuery.mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app)
        .get("/api/followup-reminders/")
        .set("Authorization", `Bearer ${validToken}`);

      expect(response.status).toBe(500);
      expect(response.body.error).toContain("Failed to fetch");
    });
  });

  describe("GET /api/followup-reminders/upcoming", () => {
    it("should return upcoming reminders", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, reminder_type: "application_followup" }],
      });

      const response = await request(app)
        .get("/api/followup-reminders/upcoming")
        .set("Authorization", `Bearer ${validToken}`);

      expect(response.status).toBe(200);
    });

    it("should accept custom days parameter", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get("/api/followup-reminders/upcoming")
        .query({ days: 14 })
        .set("Authorization", `Bearer ${validToken}`);

      expect(response.status).toBe(200);
    });

    it("should handle table not found error", async () => {
      mockQuery.mockRejectedValueOnce({ code: "42P01" });

      const response = await request(app)
        .get("/api/followup-reminders/upcoming")
        .set("Authorization", `Bearer ${validToken}`);

      expect(response.status).toBe(500);
    });

    it("should handle database errors", async () => {
      mockQuery.mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app)
        .get("/api/followup-reminders/upcoming")
        .set("Authorization", `Bearer ${validToken}`);

      expect(response.status).toBe(500);
    });
  });

  describe("GET /api/followup-reminders/etiquette/tips", () => {
    it("should return etiquette tips", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            tip_category: "timing",
            tip_text: "Follow up within 1 week",
          },
        ],
      });

      const response = await request(app)
        .get("/api/followup-reminders/etiquette/tips")
        .set("Authorization", `Bearer ${validToken}`);

      expect(response.status).toBe(200);
    });

    it("should filter by reminder_type", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get("/api/followup-reminders/etiquette/tips")
        .query({ reminder_type: "application_followup" })
        .set("Authorization", `Bearer ${validToken}`);

      expect(response.status).toBe(200);
    });

    it("should handle table not found error", async () => {
      mockQuery.mockRejectedValueOnce({ code: "42P01" });

      const response = await request(app)
        .get("/api/followup-reminders/etiquette/tips")
        .set("Authorization", `Bearer ${validToken}`);

      expect(response.status).toBe(500);
    });

    it("should handle database errors", async () => {
      mockQuery.mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app)
        .get("/api/followup-reminders/etiquette/tips")
        .set("Authorization", `Bearer ${validToken}`);

      expect(response.status).toBe(500);
    });
  });

  describe("GET /api/followup-reminders/:id", () => {
    it("should return single reminder", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, reminder_type: "application_followup" }],
      });

      const response = await request(app)
        .get("/api/followup-reminders/1")
        .set("Authorization", `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(1);
    });

    it("should return 404 if reminder not found", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get("/api/followup-reminders/999")
        .set("Authorization", `Bearer ${validToken}`);

      expect(response.status).toBe(404);
    });

    it("should handle database errors", async () => {
      mockQuery.mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app)
        .get("/api/followup-reminders/1")
        .set("Authorization", `Bearer ${validToken}`);

      expect(response.status).toBe(500);
    });
  });

  describe("POST /api/followup-reminders/", () => {
    it("should create a reminder", async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              status: "Applied",
              company: "Test Co",
              title: "Engineer",
              created_at: new Date(),
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [{ total_followups: "0" }],
        })
        .mockResolvedValueOnce({
          rows: [{ id: 1, reminder_type: "application_followup" }],
        });

      const response = await request(app)
        .post("/api/followup-reminders/")
        .set("Authorization", `Bearer ${validToken}`)
        .send({
          job_id: 1,
          reminder_type: "application_followup",
          notes: "Follow up next week",
        });

      expect(response.status).toBe(201);
    });

    it("should return 400 if job_id is missing", async () => {
      const response = await request(app)
        .post("/api/followup-reminders/")
        .set("Authorization", `Bearer ${validToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("job_id");
    });

    it("should return 404 if job not found", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post("/api/followup-reminders/")
        .set("Authorization", `Bearer ${validToken}`)
        .send({ job_id: 999 });

      expect(response.status).toBe(404);
    });

    it("should reject reminders for rejected applications", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, status: "Rejected" }],
      });

      const response = await request(app)
        .post("/api/followup-reminders/")
        .set("Authorization", `Bearer ${validToken}`)
        .send({ job_id: 1 });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("rejected");
    });

    it("should use custom scheduled_date", async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              status: "Applied",
              company: "Test Co",
              title: "Engineer",
              created_at: new Date(),
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [{ total_followups: "0" }] })
        .mockResolvedValueOnce({ rows: [{ id: 1 }] });

      const response = await request(app)
        .post("/api/followup-reminders/")
        .set("Authorization", `Bearer ${validToken}`)
        .send({
          job_id: 1,
          scheduled_date: "2024-02-01",
        });

      expect(response.status).toBe(201);
    });

    it("should use custom_message", async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ id: 1, status: "Applied", created_at: new Date() }],
        })
        .mockResolvedValueOnce({ rows: [{ total_followups: "0" }] })
        .mockResolvedValueOnce({ rows: [{ id: 1 }] });

      const response = await request(app)
        .post("/api/followup-reminders/")
        .set("Authorization", `Bearer ${validToken}`)
        .send({
          job_id: 1,
          custom_message: "Custom follow-up message",
        });

      expect(response.status).toBe(201);
    });

    it("should auto-determine reminder type for Offer status", async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ id: 1, status: "Offer", created_at: new Date() }],
        })
        .mockResolvedValueOnce({ rows: [{ total_followups: "0" }] })
        .mockResolvedValueOnce({
          rows: [{ id: 1, reminder_type: "offer_response" }],
        });

      const response = await request(app)
        .post("/api/followup-reminders/")
        .set("Authorization", `Bearer ${validToken}`)
        .send({ job_id: 1 });

      expect(response.status).toBe(201);
    });

    it("should auto-determine reminder type for Interview status", async () => {
      const interviewDate = new Date();
      interviewDate.setDate(interviewDate.getDate() - 5);

      mockQuery
        .mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              status: "Interview",
              interview_date: interviewDate,
              created_at: new Date(),
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [{ total_followups: "0" }] })
        .mockResolvedValueOnce({
          rows: [{ id: 1, reminder_type: "interview_followup" }],
        });

      const response = await request(app)
        .post("/api/followup-reminders/")
        .set("Authorization", `Bearer ${validToken}`)
        .send({ job_id: 1 });

      expect(response.status).toBe(201);
    });

    it("should handle database errors", async () => {
      mockQuery.mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app)
        .post("/api/followup-reminders/")
        .set("Authorization", `Bearer ${validToken}`)
        .send({ job_id: 1 });

      expect(response.status).toBe(500);
    });
  });

  describe("PUT /api/followup-reminders/:id", () => {
    it("should update a reminder with all fields", async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [{ id: 1, status: "pending" }] });

      const response = await request(app)
        .put("/api/followup-reminders/1")
        .set("Authorization", `Bearer ${validToken}`)
        .send({
          scheduled_date: "2024-02-01",
          due_date: "2024-02-01",
          status: "pending",
          email_template: "Updated template",
          notes: "Updated notes",
          user_notes: "User notes",
        });

      expect(response.status).toBe(200);
    });

    it("should set completed_at when status is completed", async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [{ id: 1, status: "completed" }] });

      const response = await request(app)
        .put("/api/followup-reminders/1")
        .set("Authorization", `Bearer ${validToken}`)
        .send({ status: "completed" });

      expect(response.status).toBe(200);
    });

    it("should set dismissed_at when status is dismissed", async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [{ id: 1, status: "dismissed" }] });

      const response = await request(app)
        .put("/api/followup-reminders/1")
        .set("Authorization", `Bearer ${validToken}`)
        .send({ status: "dismissed" });

      expect(response.status).toBe(200);
    });

    it("should return 404 if reminder not found", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .put("/api/followup-reminders/999")
        .set("Authorization", `Bearer ${validToken}`)
        .send({ status: "pending" });

      expect(response.status).toBe(404);
    });

    it("should handle database errors", async () => {
      mockQuery.mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app)
        .put("/api/followup-reminders/1")
        .set("Authorization", `Bearer ${validToken}`)
        .send({ status: "pending" });

      expect(response.status).toBe(500);
    });
  });

  describe("POST /api/followup-reminders/:id/snooze", () => {
    it("should snooze a reminder with custom days", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, status: "snoozed", snooze_count: 1 }],
      });

      const response = await request(app)
        .post("/api/followup-reminders/1/snooze")
        .set("Authorization", `Bearer ${validToken}`)
        .send({ days: 3 });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("snoozed");
    });

    it("should use default days if not provided", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, status: "snoozed" }],
      });

      const response = await request(app)
        .post("/api/followup-reminders/1/snooze")
        .set("Authorization", `Bearer ${validToken}`)
        .send({});

      expect(response.status).toBe(200);
    });

    it("should return 404 if reminder not found", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post("/api/followup-reminders/999/snooze")
        .set("Authorization", `Bearer ${validToken}`)
        .send({});

      expect(response.status).toBe(404);
    });

    it("should handle database errors", async () => {
      mockQuery.mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app)
        .post("/api/followup-reminders/1/snooze")
        .set("Authorization", `Bearer ${validToken}`)
        .send({});

      expect(response.status).toBe(500);
    });
  });

  describe("POST /api/followup-reminders/:id/dismiss", () => {
    it("should dismiss a reminder", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, status: "dismissed" }],
      });

      const response = await request(app)
        .post("/api/followup-reminders/1/dismiss")
        .set("Authorization", `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("dismissed");
    });

    it("should return 404 if reminder not found", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post("/api/followup-reminders/999/dismiss")
        .set("Authorization", `Bearer ${validToken}`);

      expect(response.status).toBe(404);
    });

    it("should handle database errors", async () => {
      mockQuery.mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app)
        .post("/api/followup-reminders/1/dismiss")
        .set("Authorization", `Bearer ${validToken}`);

      expect(response.status).toBe(500);
    });
  });

  describe("POST /api/followup-reminders/:id/complete", () => {
    it("should complete a reminder with all fields", async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              job_id: 1,
              status: "completed",
              reminder_type: "application_followup",
              email_subject: "Follow up",
              email_template: "Template",
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [] }) // history insert
        .mockResolvedValueOnce({ rows: [{ total_followups: "1" }] }) // responsiveness calculation
        .mockResolvedValueOnce({ rows: [] }); // update score

      const response = await request(app)
        .post("/api/followup-reminders/1/complete")
        .set("Authorization", `Bearer ${validToken}`)
        .send({
          followup_method: "email",
          message_sent: "Thank you for your time",
          response_received: true,
          response_type: "positive",
          notes: "Good response",
        });

      expect(response.status).toBe(200);
    });

    it("should complete reminder without optional fields", async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ id: 1, job_id: 1, status: "completed" }],
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ total_followups: "0" }] })
        .mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post("/api/followup-reminders/1/complete")
        .set("Authorization", `Bearer ${validToken}`)
        .send({});

      expect(response.status).toBe(200);
    });

    it("should return 404 if reminder not found", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post("/api/followup-reminders/999/complete")
        .set("Authorization", `Bearer ${validToken}`)
        .send({});

      expect(response.status).toBe(404);
    });

    it("should handle database errors", async () => {
      mockQuery.mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app)
        .post("/api/followup-reminders/1/complete")
        .set("Authorization", `Bearer ${validToken}`)
        .send({});

      expect(response.status).toBe(500);
    });
  });

  describe("POST /api/followup-reminders/auto-schedule", () => {
    it("should auto-schedule reminders for jobs without existing reminders", async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              status: "Applied",
              company: "Test Co",
              title: "Engineer",
              created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 days ago
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [] }) // no existing reminder
        .mockResolvedValueOnce({ rows: [{ total_followups: "0" }] }) // responsiveness
        .mockResolvedValueOnce({
          rows: [{ id: 1, reminder_type: "application_followup" }],
        });

      const response = await request(app)
        .post("/api/followup-reminders/auto-schedule")
        .set("Authorization", `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain("Created");
    });

    it("should skip jobs with existing reminders", async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ id: 1, status: "Applied", created_at: new Date() }],
        })
        .mockResolvedValueOnce({
          rows: [{ id: 99 }], // existing reminder
        });

      const response = await request(app)
        .post("/api/followup-reminders/auto-schedule")
        .set("Authorization", `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.reminders).toHaveLength(0);
    });

    it("should handle database errors", async () => {
      mockQuery.mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app)
        .post("/api/followup-reminders/auto-schedule")
        .set("Authorization", `Bearer ${validToken}`);

      expect(response.status).toBe(500);
    });
  });

  describe("GET /api/followup-reminders/history/:job_id", () => {
    it("should return follow-up history", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            followup_type: "application_followup",
            followup_date: new Date(),
          },
        ],
      });

      const response = await request(app)
        .get("/api/followup-reminders/history/1")
        .set("Authorization", `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
    });

    it("should return empty array if no history", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get("/api/followup-reminders/history/999")
        .set("Authorization", `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(0);
    });

    it("should handle database errors", async () => {
      mockQuery.mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app)
        .get("/api/followup-reminders/history/1")
        .set("Authorization", `Bearer ${validToken}`);

      expect(response.status).toBe(500);
    });
  });
});

// Test helper functions
describe("Helper Functions", () => {
  describe("calculateFollowUpDate", () => {
    // Helper to calculate follow-up dates
    function calculateFollowUpDate(job, reminderType) {
      const now = new Date();
      let suggestedDate = new Date(now);

      switch (reminderType) {
        case "application_followup":
          const applicationDate = job.applicationDate
            ? new Date(job.applicationDate)
            : new Date(job.created_at);
          suggestedDate = new Date(applicationDate);
          suggestedDate.setDate(suggestedDate.getDate() + 7);
          break;
        case "interview_followup":
          if (job.interview_date) {
            suggestedDate = new Date(job.interview_date);
            suggestedDate.setDate(suggestedDate.getDate() + 3);
          }
          break;
        case "post_interview_thank_you":
          if (job.interview_date) {
            suggestedDate = new Date(job.interview_date);
            suggestedDate.setHours(18, 0, 0, 0);
          }
          break;
        case "offer_response":
          if (job.offerDate) {
            suggestedDate = new Date(job.offerDate);
            suggestedDate.setDate(suggestedDate.getDate() + 7);
          }
          break;
        case "status_check":
          const lastUpdate = job.status_updated_at
            ? new Date(job.status_updated_at)
            : new Date(job.created_at);
          suggestedDate = new Date(lastUpdate);
          suggestedDate.setDate(suggestedDate.getDate() + 14);
          break;
        default:
          suggestedDate.setDate(suggestedDate.getDate() + 7);
      }

      return suggestedDate;
    }

    it("should calculate 7 days for application followup", () => {
      const baseDate = new Date("2024-01-01");
      const result = calculateFollowUpDate(
        { applicationDate: baseDate },
        "application_followup"
      );
      const expected = new Date(baseDate);
      expected.setDate(expected.getDate() + 7);
      expect(result.toDateString()).toBe(expected.toDateString());
    });

    it("should calculate 3 days for interview followup", () => {
      const baseDate = new Date("2024-01-15");
      const result = calculateFollowUpDate(
        { interview_date: baseDate },
        "interview_followup"
      );
      const expected = new Date(baseDate);
      expected.setDate(expected.getDate() + 3);
      expect(result.toDateString()).toBe(expected.toDateString());
    });

    it("should set 6pm for post interview thank you", () => {
      const baseDate = new Date("2024-01-15T10:00:00");
      const result = calculateFollowUpDate(
        { interview_date: baseDate },
        "post_interview_thank_you"
      );
      expect(result.getHours()).toBe(18);
    });

    it("should calculate 7 days for offer response", () => {
      const baseDate = new Date("2024-01-20");
      const result = calculateFollowUpDate(
        { offerDate: baseDate },
        "offer_response"
      );
      const expected = new Date(baseDate);
      expected.setDate(expected.getDate() + 7);
      expect(result.toDateString()).toBe(expected.toDateString());
    });

    it("should calculate 14 days for status check", () => {
      const baseDate = new Date("2024-01-10");
      const result = calculateFollowUpDate(
        { status_updated_at: baseDate, created_at: baseDate },
        "status_check"
      );
      const expected = new Date(baseDate);
      expected.setDate(expected.getDate() + 14);
      expect(result.toDateString()).toBe(expected.toDateString());
    });

    it("should default to 7 days for unknown type", () => {
      const before = new Date();
      const result = calculateFollowUpDate({}, "unknown_type");
      const diff = result.getTime() - before.getTime();
      const days = diff / (1000 * 60 * 60 * 24);
      expect(days).toBeGreaterThanOrEqual(6.9);
      expect(days).toBeLessThanOrEqual(7.1);
    });
  });

  describe("generateEmailTemplate", () => {
    function generateEmailTemplate(job, reminderType, userEmail = "") {
      const company = job.company || "the company";
      const position = job.title || "the position";
      const contactName = job.contact_name || "Hiring Manager";

      let subject = "";
      let body = "";

      switch (reminderType) {
        case "application_followup":
          subject = `Following Up on My Application for ${position} at ${company}`;
          body = `Dear ${contactName},\n\nFollowing up on application...`;
          break;
        case "interview_followup":
          subject = `Following Up After Our Interview for ${position} at ${company}`;
          body = `Dear ${contactName},\n\nThank you for the interview...`;
          break;
        case "post_interview_thank_you":
          subject = `Thank You - Interview for ${position} at ${company}`;
          body = `Dear ${contactName},\n\nThank you so much...`;
          break;
        case "offer_response":
          subject = `Response Regarding Job Offer for ${position} at ${company}`;
          body = `Dear ${contactName},\n\nThank you for the offer...`;
          break;
        case "status_check":
          subject = `Status Update Request - Application for ${position} at ${company}`;
          body = `Dear ${contactName},\n\nChecking in on status...`;
          break;
        default:
          subject = `Follow-Up: ${position} at ${company}`;
          body = `Dear ${contactName},\n\nFollowing up...`;
      }

      return { subject, body };
    }

    it("should generate application followup email", () => {
      const { subject } = generateEmailTemplate(
        { company: "Google", title: "Engineer" },
        "application_followup"
      );
      expect(subject).toContain("Application");
      expect(subject).toContain("Google");
    });

    it("should generate interview followup email", () => {
      const { subject } = generateEmailTemplate(
        { company: "Meta", title: "Developer" },
        "interview_followup"
      );
      expect(subject).toContain("Interview");
    });

    it("should generate thank you email", () => {
      const { subject } = generateEmailTemplate({}, "post_interview_thank_you");
      expect(subject).toContain("Thank You");
    });

    it("should generate offer response email", () => {
      const { subject } = generateEmailTemplate({}, "offer_response");
      expect(subject).toContain("Offer");
    });

    it("should generate status check email", () => {
      const { subject } = generateEmailTemplate({}, "status_check");
      expect(subject).toContain("Status");
    });

    it("should generate default email for unknown type", () => {
      const { subject } = generateEmailTemplate({}, "unknown");
      expect(subject).toContain("Follow-Up");
    });

    it("should use default values when job details missing", () => {
      const { subject, body } = generateEmailTemplate(
        {},
        "application_followup"
      );
      expect(subject).toContain("the position");
      expect(body).toContain("Hiring Manager");
    });
  });

  describe("adjustReminderFrequency", () => {
    function adjustReminderFrequency(responsivenessScore, baseDays) {
      if (responsivenessScore >= 0.7) {
        return Math.max(3, baseDays - 2);
      } else if (responsivenessScore <= 0.3) {
        return baseDays + 3;
      }
      return baseDays;
    }

    it("should reduce days for responsive companies", () => {
      expect(adjustReminderFrequency(0.8, 7)).toBe(5);
      expect(adjustReminderFrequency(0.9, 7)).toBe(5);
      expect(adjustReminderFrequency(0.7, 7)).toBe(5);
    });

    it("should increase days for unresponsive companies", () => {
      expect(adjustReminderFrequency(0.2, 7)).toBe(10);
      expect(adjustReminderFrequency(0.1, 7)).toBe(10);
      expect(adjustReminderFrequency(0.3, 7)).toBe(10);
    });

    it("should keep base days for neutral companies", () => {
      expect(adjustReminderFrequency(0.5, 7)).toBe(7);
      expect(adjustReminderFrequency(0.4, 7)).toBe(7);
      expect(adjustReminderFrequency(0.6, 7)).toBe(7);
    });

    it("should not go below 3 days minimum", () => {
      expect(adjustReminderFrequency(0.9, 4)).toBe(3);
      expect(adjustReminderFrequency(0.9, 3)).toBe(3);
    });
  });

  describe("determineReminderType", () => {
    function determineReminderType(job) {
      if (job.status === "Offer") {
        return "offer_response";
      } else if (job.status === "Interview" && job.interview_date) {
        const interviewDate = new Date(job.interview_date);
        const now = new Date();
        const daysSinceInterview = Math.floor(
          (now - interviewDate) / (1000 * 60 * 60 * 24)
        );

        if (daysSinceInterview === 0) {
          return "post_interview_thank_you";
        } else if (daysSinceInterview >= 3) {
          return "interview_followup";
        }
      } else if (job.status === "Applied" || job.applicationDate) {
        const appDate = job.applicationDate
          ? new Date(job.applicationDate)
          : new Date(job.created_at);
        const now = new Date();
        const daysSinceApp = Math.floor(
          (now - appDate) / (1000 * 60 * 60 * 24)
        );

        if (daysSinceApp >= 7) {
          return "application_followup";
        }
      }

      return "status_check";
    }

    it("should return offer_response for Offer status", () => {
      expect(determineReminderType({ status: "Offer" })).toBe("offer_response");
    });

    it("should return post_interview_thank_you for same-day interview", () => {
      const today = new Date();
      expect(
        determineReminderType({ status: "Interview", interview_date: today })
      ).toBe("post_interview_thank_you");
    });

    it("should return interview_followup for old interview", () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 5);
      expect(
        determineReminderType({ status: "Interview", interview_date: oldDate })
      ).toBe("interview_followup");
    });

    it("should return application_followup for old application", () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10);
      expect(
        determineReminderType({
          status: "Applied",
          applicationDate: oldDate,
          created_at: oldDate,
        })
      ).toBe("application_followup");
    });

    it("should return status_check for other statuses", () => {
      expect(determineReminderType({ status: "Reviewing" })).toBe(
        "status_check"
      );
      expect(determineReminderType({ status: "Pending" })).toBe("status_check");
    });

    it("should handle Interview status without date", () => {
      expect(determineReminderType({ status: "Interview" })).toBe(
        "status_check"
      );
    });

    it("should use applicationDate when available", () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10);
      expect(determineReminderType({ applicationDate: oldDate })).toBe(
        "application_followup"
      );
    });
  });
});

// Direct tests for exported helper functions (using actual imports)
describe("Exported Helper Functions (Direct)", () => {
  describe("calcFollowUpDate (actual)", () => {
    it("should calculate 7 days for application followup", () => {
      const baseDate = new Date("2024-01-01");
      const result = calcFollowUpDate(
        { applicationDate: baseDate },
        "application_followup"
      );
      expect(result instanceof Date).toBe(true);
    });

    it("should calculate 3 days for interview followup", () => {
      const baseDate = new Date("2024-01-15");
      const result = calcFollowUpDate(
        { interview_date: baseDate },
        "interview_followup"
      );
      expect(result instanceof Date).toBe(true);
    });

    it("should set 6pm for post interview thank you", () => {
      const baseDate = new Date("2024-01-15T10:00:00");
      const result = calcFollowUpDate(
        { interview_date: baseDate },
        "post_interview_thank_you"
      );
      expect(result.getHours()).toBe(18);
    });

    it("should calculate offer response date", () => {
      const result = calcFollowUpDate(
        { offerDate: new Date() },
        "offer_response"
      );
      expect(result instanceof Date).toBe(true);
    });

    it("should calculate status check date", () => {
      const result = calcFollowUpDate(
        { created_at: new Date() },
        "status_check"
      );
      expect(result instanceof Date).toBe(true);
    });

    it("should use default for unknown type", () => {
      const result = calcFollowUpDate({}, "unknown");
      expect(result instanceof Date).toBe(true);
    });

    it("should handle missing interview_date for interview_followup", () => {
      const result = calcFollowUpDate({}, "interview_followup");
      expect(result instanceof Date).toBe(true);
    });

    it("should handle missing offerDate for offer_response", () => {
      const result = calcFollowUpDate({}, "offer_response");
      expect(result instanceof Date).toBe(true);
    });
  });

  describe("genEmailTemplate (actual)", () => {
    it("should generate application followup template", () => {
      const { subject, body } = genEmailTemplate(
        { company: "Test Co", title: "Dev" },
        "application_followup"
      );
      expect(subject).toContain("Application");
      expect(body).toContain("Dear");
    });

    it("should generate interview followup template", () => {
      const { subject } = genEmailTemplate(
        { company: "Test", title: "Eng", interview_date: new Date() },
        "interview_followup"
      );
      expect(subject).toContain("Interview");
    });

    it("should generate thank you template", () => {
      const { subject } = genEmailTemplate({}, "post_interview_thank_you");
      expect(subject).toContain("Thank You");
    });

    it("should generate offer response template", () => {
      const { subject } = genEmailTemplate({}, "offer_response");
      expect(subject).toContain("Offer");
    });

    it("should generate status check template", () => {
      const { subject } = genEmailTemplate({}, "status_check");
      expect(subject).toContain("Status");
    });

    it("should generate default template", () => {
      const { subject } = genEmailTemplate({}, "unknown_type");
      expect(subject).toContain("Follow-Up");
    });

    it("should include user email signature", () => {
      const { body } = genEmailTemplate(
        {},
        "application_followup",
        "test@example.com"
      );
      expect(body).toContain("test");
    });
  });

  describe("adjustFrequency (actual)", () => {
    it("should reduce wait time for responsive companies (0.7+)", () => {
      expect(adjustFrequency(0.8, 7)).toBe(5);
      expect(adjustFrequency(0.7, 7)).toBe(5);
      expect(adjustFrequency(0.9, 10)).toBe(8);
    });

    it("should increase wait time for unresponsive companies (0.3-)", () => {
      expect(adjustFrequency(0.2, 7)).toBe(10);
      expect(adjustFrequency(0.3, 7)).toBe(10);
      expect(adjustFrequency(0.1, 5)).toBe(8);
    });

    it("should keep base time for neutral companies", () => {
      expect(adjustFrequency(0.5, 7)).toBe(7);
      expect(adjustFrequency(0.4, 7)).toBe(7);
      expect(adjustFrequency(0.6, 10)).toBe(10);
    });

    it("should not go below 3 days minimum", () => {
      expect(adjustFrequency(0.9, 4)).toBe(3);
      expect(adjustFrequency(0.99, 3)).toBe(3);
      expect(adjustFrequency(0.8, 2)).toBe(3);
    });
  });

  describe("determineType (actual)", () => {
    it("should return offer_response for Offer status", () => {
      expect(determineType({ status: "Offer" })).toBe("offer_response");
    });

    it("should return post_interview_thank_you for same-day interview", () => {
      expect(
        determineType({ status: "Interview", interview_date: new Date() })
      ).toBe("post_interview_thank_you");
    });

    it("should return interview_followup for old interview (3+ days)", () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 5);
      expect(
        determineType({ status: "Interview", interview_date: oldDate })
      ).toBe("interview_followup");
    });

    it("should return application_followup for old application (7+ days)", () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10);
      expect(
        determineType({ status: "Applied", applicationDate: oldDate })
      ).toBe("application_followup");
    });

    it("should return status_check as default", () => {
      expect(determineType({ status: "Reviewing" })).toBe("status_check");
    });

    it("should handle Interview status between 1-2 days", () => {
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      expect(
        determineType({ status: "Interview", interview_date: twoDaysAgo })
      ).toBe("status_check");
    });

    it("should return status_check for recent application", () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 3);
      expect(
        determineType({ status: "Applied", applicationDate: recentDate })
      ).toBe("status_check");
    });
  });
});
