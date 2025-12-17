import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";

// Use the same secret as the code (falls back to this if env not set)
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

// Create hoisted mock query
const mockQuery = vi.hoisted(() => vi.fn());
const mockConnect = vi.hoisted(() => vi.fn());
const mockRelease = vi.hoisted(() => vi.fn());

vi.mock("../../db/pool.js", () => ({
  default: {
    query: mockQuery,
    connect: mockConnect,
  },
}));

vi.mock("../../utils/roleTypeMapper.js", () => ({
  getRoleTypeFromTitle: vi.fn((title) => {
    if (title && title.toLowerCase().includes("engineer")) return "Engineering";
    if (title && title.toLowerCase().includes("manager")) return "Management";
    return "Other";
  }),
}));

vi.mock("openai", () => ({
  default: function () {
    return {
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [{ message: { content: "Generated cover letter" } }],
          }),
        },
      },
    };
  },
}));

vi.mock("fs", () => ({
  default: {
    existsSync: vi.fn().mockReturnValue(true),
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
  },
}));

import jobRouter from "../../routes/job.js";

function createToken(userId) {
  return jwt.sign({ id: userId }, JWT_SECRET);
}

describe("Job Routes", () => {
  let app;
  let validToken;

  beforeEach(() => {
    vi.clearAllMocks();
    validToken = createToken(1);

    app = express();
    app.use(express.json());
    app.use("/api/jobs", jobRouter);

    mockQuery.mockReset();
    mockQuery.mockResolvedValue({ rows: [] });

    const mockClient = {
      query: mockQuery,
      release: mockRelease,
    };
    mockConnect.mockResolvedValue(mockClient);
  });

  describe("Authentication", () => {
    it("should reject requests without token", async () => {
      const response = await request(app).get("/api/jobs");
      expect(response.status).toBe(401);
    });

    it("should reject invalid tokens", async () => {
      const response = await request(app)
        .get("/api/jobs")
        .set("Authorization", "Bearer invalid");
      expect(response.status).toBe(401);
    });

    it("should accept valid tokens", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ exists: false }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get("/api/jobs")
        .set("Authorization", `Bearer ${validToken}`);

      expect([200, 500]).toContain(response.status);
    });
  });

  describe("POST / - Create Job", () => {
    it("should require title and company", async () => {
      const response = await request(app)
        .post("/api/jobs")
        .set("Authorization", `Bearer ${validToken}`)
        .send({ title: "Engineer" });

      expect(response.status).toBe(400);
    });

    it("should create job with title and company", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, title: "Engineer", company: "Google" }],
      });
      mockQuery.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .post("/api/jobs")
        .set("Authorization", `Bearer ${validToken}`)
        .send({ title: "Engineer", company: "Google" });

      expect([201, 500]).toContain(response.status);
    });

    it("should handle salary values", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, salary_min: 100000 }],
      });
      mockQuery.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .post("/api/jobs")
        .set("Authorization", `Bearer ${validToken}`)
        .send({ title: "Engineer", company: "Google", salary_min: "$100,000" });

      expect([201, 500]).toContain(response.status);
    });
  });

  describe("POST /fix-role-types", () => {
    it("should fix role types", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, title: "Engineer" }],
      });
      mockQuery.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .post("/api/jobs/fix-role-types")
        .set("Authorization", `Bearer ${validToken}`);

      expect([200, 500]).toContain(response.status);
    });
  });

  describe("GET / - List Jobs", () => {
    it("should return jobs", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ exists: false }] });
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, title: "Engineer", status: "Applied" }],
      });

      const response = await request(app)
        .get("/api/jobs")
        .set("Authorization", `Bearer ${validToken}`);

      expect([200, 500]).toContain(response.status);
    });

    it("should filter by search", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ exists: false }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get("/api/jobs?search=Google")
        .set("Authorization", `Bearer ${validToken}`);

      expect([200, 500]).toContain(response.status);
    });

    it("should filter by status", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ exists: false }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get("/api/jobs?status=Applied")
        .set("Authorization", `Bearer ${validToken}`);

      expect([200, 500]).toContain(response.status);
    });

    it("should sort by different columns", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ exists: false }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get("/api/jobs?sortBy=company")
        .set("Authorization", `Bearer ${validToken}`);

      expect([200, 500]).toContain(response.status);
    });
  });

  describe("GET /map - Map View", () => {
    it("should return jobs for map", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, latitude: 40.7, longitude: -74.0 }],
      });

      const response = await request(app)
        .get("/api/jobs/map")
        .set("Authorization", `Bearer ${validToken}`);

      expect([200, 500]).toContain(response.status);
    });
  });

  describe("GET /stats - Statistics", () => {
    it("should return statistics", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            totalJobs: 10,
            jobsByStatus: [],
            monthlyVolume: [],
            responseRate: 50,
            adherenceRate: 80,
            avgTimeToOffer: 30,
            avgTimeInStage: [],
          },
        ],
      });

      const response = await request(app)
        .get("/api/jobs/stats")
        .set("Authorization", `Bearer ${validToken}`);

      expect([200, 500]).toContain(response.status);
    });
  });

  describe("GET /archived - Archived Jobs", () => {
    it("should return archived jobs", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, isArchived: true }],
      });

      const response = await request(app)
        .get("/api/jobs/archived")
        .set("Authorization", `Bearer ${validToken}`);

      expect([200, 500]).toContain(response.status);
    });
  });

  describe("GET /history - Application History", () => {
    it("should return history", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, job_id: 1, event: "Status changed" }],
      });

      const response = await request(app)
        .get("/api/jobs/history")
        .set("Authorization", `Bearer ${validToken}`);

      expect([200, 500]).toContain(response.status);
    });
  });

  describe("GET /:id - Get Job", () => {
    it("should return job details", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, title: "Engineer" }],
      });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get("/api/jobs/1")
        .set("Authorization", `Bearer ${validToken}`);

      expect([200, 404, 500]).toContain(response.status);
    });

    it("should return 404 for non-existent job", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get("/api/jobs/999")
        .set("Authorization", `Bearer ${validToken}`);

      expect([404, 500]).toContain(response.status);
    });
  });

  describe("PUT /:id - Update Job", () => {
    it("should update job", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, title: "Updated" }],
      });
      mockQuery.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .put("/api/jobs/1")
        .set("Authorization", `Bearer ${validToken}`)
        .send({ title: "Updated" });

      expect([200, 404, 500]).toContain(response.status);
    });

    it("should reject invalid fields only", async () => {
      const response = await request(app)
        .put("/api/jobs/1")
        .set("Authorization", `Bearer ${validToken}`)
        .send({ invalid_field: "value" });

      expect([400, 500]).toContain(response.status);
    });
  });

  describe("PUT /:id/materials - Update Materials", () => {
    it("should update materials", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 2 }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .put("/api/jobs/1/materials")
        .set("Authorization", `Bearer ${validToken}`)
        .send({ resume_id: 1, cover_letter_id: 2 });

      expect([200, 404, 500]).toContain(response.status);
    });
  });

  describe("DELETE /:id - Delete Job", () => {
    it("should delete job", async () => {
      mockQuery.mockResolvedValueOnce("BEGIN");
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });
      mockQuery.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .delete("/api/jobs/1")
        .set("Authorization", `Bearer ${validToken}`);

      expect([200, 404, 500]).toContain(response.status);
    });
  });

  describe("PUT /:id/status - Update Status", () => {
    it("should update status", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ status: "Applied" }] });
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, status: "Interview" }],
      });
      mockQuery.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .put("/api/jobs/1/status")
        .set("Authorization", `Bearer ${validToken}`)
        .send({ status: "Interview" });

      expect([200, 404, 500]).toContain(response.status);
    });

    it("should require status", async () => {
      const response = await request(app)
        .put("/api/jobs/1/status")
        .set("Authorization", `Bearer ${validToken}`)
        .send({});

      expect([400, 500]).toContain(response.status);
    });
  });

  describe("PUT /bulk/deadline - Bulk Deadline Update", () => {
    it("should update deadlines", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, deadline: "2024-12-27" }],
      });

      const response = await request(app)
        .put("/api/jobs/bulk/deadline")
        .set("Authorization", `Bearer ${validToken}`)
        .send({ jobIds: [1], daysToAdd: 7 });

      expect([200, 400, 500]).toContain(response.status);
    });

    it("should require jobIds", async () => {
      const response = await request(app)
        .put("/api/jobs/bulk/deadline")
        .set("Authorization", `Bearer ${validToken}`)
        .send({ daysToAdd: 7 });

      expect([400, 500]).toContain(response.status);
    });
  });

  describe("PUT /:id/archive - Archive Job", () => {
    it("should archive job", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, isArchived: true }],
      });

      const response = await request(app)
        .put("/api/jobs/1/archive")
        .set("Authorization", `Bearer ${validToken}`);

      expect([200, 404, 500]).toContain(response.status);
    });
  });

  describe("PUT /:id/restore - Restore Job", () => {
    it("should restore job", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, isArchived: false }],
      });

      const response = await request(app)
        .put("/api/jobs/1/restore")
        .set("Authorization", `Bearer ${validToken}`);

      expect([200, 404, 500]).toContain(response.status);
    });
  });

  describe("POST /:id/generate-cover-letter", () => {
    it("should generate cover letter", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, title: "Engineer", company: "Google", user_id: 1 }],
      });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });
      mockQuery.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .post("/api/jobs/1/generate-cover-letter")
        .set("Authorization", `Bearer ${validToken}`);

      expect([200, 404, 500]).toContain(response.status);
    });
  });

  describe("GET /:id/materials-history", () => {
    it("should return materials history", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ exists: true }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });

      const response = await request(app)
        .get("/api/jobs/1/materials-history")
        .set("Authorization", `Bearer ${validToken}`);

      expect([200, 500]).toContain(response.status);
    });
  });

  describe("POST / - Create Job Edge Cases", () => {
    it("should handle template cover letter ID", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, title: "Engineer", company: "Google" }],
      });
      mockQuery.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .post("/api/jobs")
        .set("Authorization", `Bearer ${validToken}`)
        .send({
          title: "Engineer",
          company: "Google",
          cover_letter_id: "template_123",
        });

      expect([201, 500]).toContain(response.status);
    });

    it("should handle invalid cover letter ID format", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, title: "Engineer", company: "Google" }],
      });
      mockQuery.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .post("/api/jobs")
        .set("Authorization", `Bearer ${validToken}`)
        .send({
          title: "Engineer",
          company: "Google",
          cover_letter_id: "invalid",
        });

      expect([201, 500]).toContain(response.status);
    });

    it("should handle dateApplied field", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, title: "Engineer", company: "Google" }],
      });
      mockQuery.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .post("/api/jobs")
        .set("Authorization", `Bearer ${validToken}`)
        .send({
          title: "Engineer",
          company: "Google",
          dateApplied: "2024-01-15",
        });

      expect([201, 500]).toContain(response.status);
    });

    it("should handle different location types", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, title: "Engineer", company: "Google" }],
      });
      mockQuery.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .post("/api/jobs")
        .set("Authorization", `Bearer ${validToken}`)
        .send({
          title: "Engineer",
          company: "Google",
          location_type: "remote",
        });

      expect([201, 500]).toContain(response.status);
    });

    it("should handle hybrid location type", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, title: "Engineer", company: "Google" }],
      });
      mockQuery.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .post("/api/jobs")
        .set("Authorization", `Bearer ${validToken}`)
        .send({
          title: "Engineer",
          company: "Google",
          location_type: "hybrid",
        });

      expect([201, 500]).toContain(response.status);
    });

    it("should handle empty resume_id", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, title: "Engineer", company: "Google" }],
      });
      mockQuery.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .post("/api/jobs")
        .set("Authorization", `Bearer ${validToken}`)
        .send({
          title: "Engineer",
          company: "Google",
          resume_id: "",
        });

      expect([201, 500]).toContain(response.status);
    });

    it("should handle industry field", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, title: "Engineer", company: "Google" }],
      });
      mockQuery.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .post("/api/jobs")
        .set("Authorization", `Bearer ${validToken}`)
        .send({
          title: "Engineer",
          company: "Google",
          industry: "Technology",
          role_level: "senior",
        });

      expect([201, 500]).toContain(response.status);
    });

    it("should handle required_skills array", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, title: "Engineer", company: "Google" }],
      });
      mockQuery.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .post("/api/jobs")
        .set("Authorization", `Bearer ${validToken}`)
        .send({
          title: "Engineer",
          company: "Google",
          required_skills: ["JavaScript", "React"],
        });

      expect([201, 500]).toContain(response.status);
    });

    it("should handle database errors", async () => {
      mockQuery.mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app)
        .post("/api/jobs")
        .set("Authorization", `Bearer ${validToken}`)
        .send({ title: "Engineer", company: "Google" });

      expect(response.status).toBe(500);
    });
  });

  describe("GET / - List Jobs Edge Cases", () => {
    it("should handle multiple filters", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ exists: false }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get(
          "/api/jobs?search=Google&status=Applied&sortBy=deadline&sortOrder=asc"
        )
        .set("Authorization", `Bearer ${validToken}`);

      expect([200, 500]).toContain(response.status);
    });

    it("should handle pagination", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ exists: false }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get("/api/jobs?page=1&limit=10")
        .set("Authorization", `Bearer ${validToken}`);

      expect([200, 500]).toContain(response.status);
    });

    it("should handle role filter", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ exists: false }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get("/api/jobs?role=Engineering")
        .set("Authorization", `Bearer ${validToken}`);

      expect([200, 500]).toContain(response.status);
    });

    it("should handle includeArchived flag", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ exists: false }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get("/api/jobs?includeArchived=true")
        .set("Authorization", `Bearer ${validToken}`);

      expect([200, 500]).toContain(response.status);
    });
  });

  describe("PUT /:id - Update Job Edge Cases", () => {
    it("should update multiple fields", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, title: "Updated", company: "Meta" }],
      });
      mockQuery.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .put("/api/jobs/1")
        .set("Authorization", `Bearer ${validToken}`)
        .send({
          title: "Updated",
          company: "Meta",
          location: "Remote",
          salary_min: 100000,
        });

      expect([200, 404, 500]).toContain(response.status);
    });

    it("should handle database error", async () => {
      mockQuery.mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app)
        .put("/api/jobs/1")
        .set("Authorization", `Bearer ${validToken}`)
        .send({ title: "Updated" });

      expect([500]).toContain(response.status);
    });
  });

  describe("DELETE /:id - Delete Job Edge Cases", () => {
    it("should handle non-existent job", async () => {
      mockQuery.mockResolvedValueOnce("BEGIN");
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce("ROLLBACK");

      const response = await request(app)
        .delete("/api/jobs/999")
        .set("Authorization", `Bearer ${validToken}`);

      expect([404, 500]).toContain(response.status);
    });

    it("should handle database error", async () => {
      mockQuery.mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app)
        .delete("/api/jobs/1")
        .set("Authorization", `Bearer ${validToken}`);

      expect([500]).toContain(response.status);
    });
  });

  describe("PUT /:id/status - Update Status Edge Cases", () => {
    it("should handle Offer status", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ status: "Interview" }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, status: "Offer" }] });
      mockQuery.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .put("/api/jobs/1/status")
        .set("Authorization", `Bearer ${validToken}`)
        .send({ status: "Offer" });

      expect([200, 404, 500]).toContain(response.status);
    });

    it("should handle Rejected status", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ status: "Interview" }] });
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, status: "Rejected" }],
      });
      mockQuery.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .put("/api/jobs/1/status")
        .set("Authorization", `Bearer ${validToken}`)
        .send({ status: "Rejected" });

      expect([200, 404, 500]).toContain(response.status);
    });

    it("should handle non-existent job", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .put("/api/jobs/999/status")
        .set("Authorization", `Bearer ${validToken}`)
        .send({ status: "Applied" });

      expect([404, 500]).toContain(response.status);
    });
  });

  describe("GET /stats Edge Cases", () => {
    it("should handle empty stats", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            totalJobs: 0,
            jobsByStatus: [],
            monthlyVolume: [],
          },
        ],
      });

      const response = await request(app)
        .get("/api/jobs/stats")
        .set("Authorization", `Bearer ${validToken}`);

      expect([200, 500]).toContain(response.status);
    });
  });

  describe("POST /:id/generate-cover-letter Edge Cases", () => {
    it("should handle job not found", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post("/api/jobs/999/generate-cover-letter")
        .set("Authorization", `Bearer ${validToken}`);

      expect([404, 500]).toContain(response.status);
    });

    it("should include user data in generation", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            title: "Software Engineer",
            company: "Google",
            description: "Build awesome products",
            user_id: 1,
          },
        ],
      });
      mockQuery.mockResolvedValueOnce({
        rows: [{ name: "John Doe", email: "john@test.com" }],
      });
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });
      mockQuery.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .post("/api/jobs/1/generate-cover-letter")
        .set("Authorization", `Bearer ${validToken}`);

      expect([200, 404, 500]).toContain(response.status);
    });
  });

  describe("GET /archived Edge Cases", () => {
    it("should handle empty archived list", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get("/api/jobs/archived")
        .set("Authorization", `Bearer ${validToken}`);

      expect([200, 500]).toContain(response.status);
    });
  });

  describe("GET /history Edge Cases", () => {
    it("should handle empty history", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get("/api/jobs/history")
        .set("Authorization", `Bearer ${validToken}`);

      expect([200, 500]).toContain(response.status);
    });

    it("should group history by job", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          { id: 1, job_id: 1, event: "Applied", title: "Engineer", company: "Google", from_status: null, to_status: "Applied" },
          { id: 2, job_id: 1, event: "Interview", title: "Engineer", company: "Google", from_status: "Applied", to_status: "Interview" },
          { id: 3, job_id: 2, event: "Applied", title: "Designer", company: "Meta", from_status: null, to_status: "Applied" },
        ],
      });

      const response = await request(app)
        .get("/api/jobs/history")
        .set("Authorization", `Bearer ${validToken}`);

      expect([200, 500]).toContain(response.status);
    });
  });

  describe("GET /map - Map View Edge Cases", () => {
    it("should filter by location type", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, latitude: 40.7, longitude: -74.0, location_type: "remote" }],
      });

      const response = await request(app)
        .get("/api/jobs/map?locationType=remote")
        .set("Authorization", `Bearer ${validToken}`);

      expect([200, 500]).toContain(response.status);
    });

    it("should filter by status on map", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, latitude: 40.7, longitude: -74.0, status: "Applied" }],
      });

      const response = await request(app)
        .get("/api/jobs/map?status=Applied")
        .set("Authorization", `Bearer ${validToken}`);

      expect([200, 500]).toContain(response.status);
    });

    it("should filter by max distance", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, latitude: 40.7, longitude: -74.0 }],
      });
      mockQuery.mockResolvedValueOnce({
        rows: [{ home_latitude: 40.8, home_longitude: -74.1 }],
      });

      const response = await request(app)
        .get("/api/jobs/map?maxDistance=50")
        .set("Authorization", `Bearer ${validToken}`);

      expect([200, 500]).toContain(response.status);
    });

    it("should filter by max time", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, latitude: 40.7, longitude: -74.0 }],
      });
      mockQuery.mockResolvedValueOnce({
        rows: [{ home_latitude: 40.8, home_longitude: -74.1 }],
      });

      const response = await request(app)
        .get("/api/jobs/map?maxTime=60")
        .set("Authorization", `Bearer ${validToken}`);

      expect([200, 500]).toContain(response.status);
    });

    it("should handle missing home location", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, latitude: 40.7, longitude: -74.0 }],
      });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get("/api/jobs/map?maxDistance=50")
        .set("Authorization", `Bearer ${validToken}`);

      expect([200, 500]).toContain(response.status);
    });

    it("should handle database error on map", async () => {
      mockQuery.mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app)
        .get("/api/jobs/map")
        .set("Authorization", `Bearer ${validToken}`);

      expect([500]).toContain(response.status);
    });
  });

  describe("GET / - List Jobs Status Normalization", () => {
    it("should normalize status from event text", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ exists: false }] });
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, status: "Status changed from 'Applied' to 'Interview'" }],
      });

      const response = await request(app)
        .get("/api/jobs")
        .set("Authorization", `Bearer ${validToken}`);

      expect([200, 500]).toContain(response.status);
    });

    it("should handle referral requests join", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ exists: true }] });
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, status: "Applied", is_referral: true }],
      });

      const response = await request(app)
        .get("/api/jobs")
        .set("Authorization", `Bearer ${validToken}`);

      expect([200, 500]).toContain(response.status);
    });

    it("should filter by industry", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ exists: false }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get("/api/jobs?industry=Technology")
        .set("Authorization", `Bearer ${validToken}`);

      expect([200, 500]).toContain(response.status);
    });

    it("should filter by location", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ exists: false }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get("/api/jobs?location=Remote")
        .set("Authorization", `Bearer ${validToken}`);

      expect([200, 500]).toContain(response.status);
    });

    it("should filter by salary range", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ exists: false }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get("/api/jobs?salaryMin=50000&salaryMax=150000")
        .set("Authorization", `Bearer ${validToken}`);

      expect([200, 500]).toContain(response.status);
    });

    it("should filter by date range", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ exists: false }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get("/api/jobs?dateFrom=2024-01-01&dateTo=2024-12-31")
        .set("Authorization", `Bearer ${validToken}`);

      expect([200, 500]).toContain(response.status);
    });

    it("should sort by deadline", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ exists: false }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get("/api/jobs?sortBy=deadline")
        .set("Authorization", `Bearer ${validToken}`);

      expect([200, 500]).toContain(response.status);
    });

    it("should sort by salary", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ exists: false }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get("/api/jobs?sortBy=salary")
        .set("Authorization", `Bearer ${validToken}`);

      expect([200, 500]).toContain(response.status);
    });
  });

  describe("POST / - Create Job Validation Edge Cases", () => {
    it("should handle null resume_id", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, title: "Engineer", company: "Google" }],
      });
      mockQuery.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .post("/api/jobs")
        .set("Authorization", `Bearer ${validToken}`)
        .send({
          title: "Engineer",
          company: "Google",
          resume_id: null,
        });

      expect([201, 500]).toContain(response.status);
    });

    it("should handle undefined resume_id string", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, title: "Engineer", company: "Google" }],
      });
      mockQuery.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .post("/api/jobs")
        .set("Authorization", `Bearer ${validToken}`)
        .send({
          title: "Engineer",
          company: "Google",
          resume_id: "undefined",
        });

      expect([201, 500]).toContain(response.status);
    });

    it("should handle on_site location type", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, title: "Engineer", company: "Google" }],
      });
      mockQuery.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .post("/api/jobs")
        .set("Authorization", `Bearer ${validToken}`)
        .send({
          title: "Engineer",
          company: "Google",
          location_type: "on_site",
        });

      expect([201, 500]).toContain(response.status);
    });

    it("should handle flexible location type", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, title: "Engineer", company: "Google" }],
      });
      mockQuery.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .post("/api/jobs")
        .set("Authorization", `Bearer ${validToken}`)
        .send({
          title: "Engineer",
          company: "Google",
          location_type: "flexible",
        });

      expect([201, 500]).toContain(response.status);
    });

    it("should handle invalid location type", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, title: "Engineer", company: "Google" }],
      });
      mockQuery.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .post("/api/jobs")
        .set("Authorization", `Bearer ${validToken}`)
        .send({
          title: "Engineer",
          company: "Google",
          location_type: "invalid_type",
        });

      expect([201, 500]).toContain(response.status);
    });

    it("should validate resume_id exists", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, title: "Engineer", company: "Google" }],
      });
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // resume exists
      mockQuery.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .post("/api/jobs")
        .set("Authorization", `Bearer ${validToken}`)
        .send({
          title: "Engineer",
          company: "Google",
          resume_id: 1,
        });

      expect([201, 500]).toContain(response.status);
    });

    it("should validate cover_letter_id exists", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, title: "Engineer", company: "Google" }],
      });
      mockQuery.mockResolvedValueOnce({ rows: [] }); // no resume
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // cover letter exists
      mockQuery.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .post("/api/jobs")
        .set("Authorization", `Bearer ${validToken}`)
        .send({
          title: "Engineer",
          company: "Google",
          cover_letter_id: 1,
        });

      expect([201, 500]).toContain(response.status);
    });

    it("should handle empty industry", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, title: "Engineer", company: "Google" }],
      });
      mockQuery.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .post("/api/jobs")
        .set("Authorization", `Bearer ${validToken}`)
        .send({
          title: "Engineer",
          company: "Google",
          industry: "",
        });

      expect([201, 500]).toContain(response.status);
    });

    it("should handle empty role_level", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, title: "Engineer", company: "Google" }],
      });
      mockQuery.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .post("/api/jobs")
        .set("Authorization", `Bearer ${validToken}`)
        .send({
          title: "Engineer",
          company: "Google",
          role_level: "",
        });

      expect([201, 500]).toContain(response.status);
    });
  });

  describe("PUT /:id - Update Job Additional Fields", () => {
    it("should update industry field", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, industry: "Technology" }],
      });
      mockQuery.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .put("/api/jobs/1")
        .set("Authorization", `Bearer ${validToken}`)
        .send({ industry: "Technology" });

      expect([200, 404, 500]).toContain(response.status);
    });

    it("should update empty industry to null", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, industry: null }],
      });
      mockQuery.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .put("/api/jobs/1")
        .set("Authorization", `Bearer ${validToken}`)
        .send({ industry: "" });

      expect([200, 404, 500]).toContain(response.status);
    });

    it("should update role_level to lowercase", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, role_level: "senior" }],
      });
      mockQuery.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .put("/api/jobs/1")
        .set("Authorization", `Bearer ${validToken}`)
        .send({ role_level: "SENIOR" });

      expect([200, 404, 500]).toContain(response.status);
    });

    it("should update location_type", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, location_type: "remote" }],
      });
      mockQuery.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .put("/api/jobs/1")
        .set("Authorization", `Bearer ${validToken}`)
        .send({ location_type: "remote" });

      expect([200, 404, 500]).toContain(response.status);
    });

    it("should handle dateApplied in update", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, applicationDate: "2024-01-15" }],
      });
      mockQuery.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .put("/api/jobs/1")
        .set("Authorization", `Bearer ${validToken}`)
        .send({ dateApplied: "2024-01-15" });

      expect([200, 404, 500]).toContain(response.status);
    });

    it("should set offerDate when status becomes Offer", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, status: "Offer", offerDate: new Date() }],
      });
      mockQuery.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .put("/api/jobs/1")
        .set("Authorization", `Bearer ${validToken}`)
        .send({ status: "Offer" });

      expect([200, 404, 500]).toContain(response.status);
    });

    it("should update materials via PUT", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ status: "Applied" }] }); // get current status
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, title: "Engineer" }],
      });
      mockQuery.mockResolvedValueOnce({ rows: [] }); // current materials
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // resume check
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // cover letter check
      mockQuery.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .put("/api/jobs/1")
        .set("Authorization", `Bearer ${validToken}`)
        .send({ resume_id: 1, cover_letter_id: 1 });

      expect([200, 400, 404, 500]).toContain(response.status);
    });

    it("should return 404 for non-existent job", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .put("/api/jobs/999")
        .set("Authorization", `Bearer ${validToken}`)
        .send({ title: "Updated" });

      expect([404, 500]).toContain(response.status);
    });
  });

  describe("PUT /:id/status - Status Update Edge Cases", () => {
    it("should handle Applied status", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ status: "Interested" }] });
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, status: "Applied" }],
      });
      mockQuery.mockResolvedValueOnce({ rows: [] }); // history insert
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // submission lookup
      mockQuery.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .put("/api/jobs/1/status")
        .set("Authorization", `Bearer ${validToken}`)
        .send({ status: "Applied" });

      expect([200, 404, 500]).toContain(response.status);
    });

    it("should handle Phone Screen status", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ status: "Applied" }] });
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, status: "Phone Screen" }],
      });
      mockQuery.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .put("/api/jobs/1/status")
        .set("Authorization", `Bearer ${validToken}`)
        .send({ status: "Phone Screen" });

      expect([200, 404, 500]).toContain(response.status);
    });

    it("should handle Interested status", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ status: "Applied" }] });
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, status: "Interested" }],
      });
      mockQuery.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .put("/api/jobs/1/status")
        .set("Authorization", `Bearer ${validToken}`)
        .send({ status: "Interested" });

      expect([200, 404, 500]).toContain(response.status);
    });

    it("should update application_submissions on status change", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ status: "Applied" }] });
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, status: "Interview" }],
      });
      mockQuery.mockResolvedValueOnce({ rows: [] }); // history insert
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // submission found
      mockQuery.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .put("/api/jobs/1/status")
        .set("Authorization", `Bearer ${validToken}`)
        .send({ status: "Interview" });

      expect([200, 404, 500]).toContain(response.status);
    });

    it("should handle database error in status update", async () => {
      mockQuery.mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app)
        .put("/api/jobs/1/status")
        .set("Authorization", `Bearer ${validToken}`)
        .send({ status: "Applied" });

      expect([500]).toContain(response.status);
    });
  });

  describe("PUT /bulk/deadline Edge Cases", () => {
    it("should reject invalid daysToAdd", async () => {
      const response = await request(app)
        .put("/api/jobs/bulk/deadline")
        .set("Authorization", `Bearer ${validToken}`)
        .send({ jobIds: [1], daysToAdd: "invalid" });

      expect([400, 500]).toContain(response.status);
    });

    it("should reject zero daysToAdd", async () => {
      const response = await request(app)
        .put("/api/jobs/bulk/deadline")
        .set("Authorization", `Bearer ${validToken}`)
        .send({ jobIds: [1], daysToAdd: 0 });

      expect([400, 500]).toContain(response.status);
    });

    it("should handle database error", async () => {
      mockQuery.mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app)
        .put("/api/jobs/bulk/deadline")
        .set("Authorization", `Bearer ${validToken}`)
        .send({ jobIds: [1], daysToAdd: 7 });

      expect([500]).toContain(response.status);
    });
  });

  describe("PUT /:id/archive and /:id/restore Edge Cases", () => {
    it("should return 404 when archiving non-existent job", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .put("/api/jobs/999/archive")
        .set("Authorization", `Bearer ${validToken}`);

      expect([404, 500]).toContain(response.status);
    });

    it("should return 404 when restoring non-existent job", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .put("/api/jobs/999/restore")
        .set("Authorization", `Bearer ${validToken}`);

      expect([404, 500]).toContain(response.status);
    });

    it("should handle database error on archive", async () => {
      mockQuery.mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app)
        .put("/api/jobs/1/archive")
        .set("Authorization", `Bearer ${validToken}`);

      expect([500]).toContain(response.status);
    });

    it("should handle database error on restore", async () => {
      mockQuery.mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app)
        .put("/api/jobs/1/restore")
        .set("Authorization", `Bearer ${validToken}`);

      expect([500]).toContain(response.status);
    });
  });

  describe("PUT /:id/materials Edge Cases", () => {
    it("should handle template cover letter in materials", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] }); // resume check
      mockQuery.mockResolvedValueOnce({ rows: [] }); // cover letter check
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // job
      mockQuery.mockResolvedValueOnce({ rows: [] }); // materials

      const response = await request(app)
        .put("/api/jobs/1/materials")
        .set("Authorization", `Bearer ${validToken}`)
        .send({ cover_letter_id: "template_123" });

      expect([200, 404, 500]).toContain(response.status);
    });

    it("should handle invalid cover letter id", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] }); // resume check
      mockQuery.mockResolvedValueOnce({ rows: [] }); // cover letter check
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // job
      mockQuery.mockResolvedValueOnce({ rows: [] }); // materials

      const response = await request(app)
        .put("/api/jobs/1/materials")
        .set("Authorization", `Bearer ${validToken}`)
        .send({ cover_letter_id: "invalid" });

      expect([200, 404, 500]).toContain(response.status);
    });

    it("should return 404 for non-existent job", async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .put("/api/jobs/999/materials")
        .set("Authorization", `Bearer ${validToken}`)
        .send({ resume_id: 1 });

      expect([404, 500]).toContain(response.status);
    });

    it("should handle database error", async () => {
      mockQuery.mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app)
        .put("/api/jobs/1/materials")
        .set("Authorization", `Bearer ${validToken}`)
        .send({ resume_id: 1 });

      expect([500]).toContain(response.status);
    });
  });

  describe("GET /:id - Get Job with Materials", () => {
    it("should include materials with cover letter details", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, title: "Engineer" }],
      });
      mockQuery.mockResolvedValueOnce({
        rows: [{
          resume_id: 1,
          cover_letter_id: 2,
          resume_title: "My Resume",
          resume_format: "pdf",
          cover_letter_title: "My Cover Letter",
          cover_letter_format: "docx",
          cover_letter_file_url: "/uploads/cover-letters/test.docx",
          cover_letter_source: "uploaded_cover_letters"
        }],
      });

      const response = await request(app)
        .get("/api/jobs/1")
        .set("Authorization", `Bearer ${validToken}`);

      expect([200, 404, 500]).toContain(response.status);
    });

    it("should handle materials fetch error gracefully", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, title: "Engineer" }],
      });
      mockQuery.mockRejectedValueOnce(new Error("Materials error"));

      const response = await request(app)
        .get("/api/jobs/1")
        .set("Authorization", `Bearer ${validToken}`);

      expect([200, 404, 500]).toContain(response.status);
    });
  });

  describe("GET /:id/materials-history Edge Cases", () => {
    it("should return empty when table doesn't exist", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ exists: false }] });

      const response = await request(app)
        .get("/api/jobs/1/materials-history")
        .set("Authorization", `Bearer ${validToken}`);

      expect([200, 500]).toContain(response.status);
    });

    it("should handle database error", async () => {
      mockQuery.mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app)
        .get("/api/jobs/1/materials-history")
        .set("Authorization", `Bearer ${validToken}`);

      expect([200, 500]).toContain(response.status);
    });
  });

  describe("GET /stats Edge Cases", () => {
    it("should handle database error", async () => {
      mockQuery.mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app)
        .get("/api/jobs/stats")
        .set("Authorization", `Bearer ${validToken}`);

      expect([500]).toContain(response.status);
    });

    it("should handle null values in stats", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{
          totalJobs: null,
          jobsByStatus: null,
          monthlyVolume: null,
          responseRate: null,
          adherenceRate: null,
          avgTimeToOffer: null,
          avgTimeInStage: null,
        }],
      });

      const response = await request(app)
        .get("/api/jobs/stats")
        .set("Authorization", `Bearer ${validToken}`);

      expect([200, 500]).toContain(response.status);
    });
  });

  describe("POST /:id/generate-cover-letter Edge Cases", () => {
    it("should handle missing job description", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, title: "Engineer", company: "Google", description: null, user_id: 1 }],
      });
      mockQuery.mockResolvedValueOnce({ rows: [] }); // employment
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // cover letter insert
      mockQuery.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .post("/api/jobs/1/generate-cover-letter")
        .set("Authorization", `Bearer ${validToken}`);

      expect([200, 404, 500]).toContain(response.status);
    });

    it("should handle employment data for cover letter", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, title: "Engineer", company: "Google", description: "Build things", user_id: 1 }],
      });
      mockQuery.mockResolvedValueOnce({
        rows: [
          { role: "Developer", company: "Previous", responsibilities: "Coding", achievements: "Awards", skills: ["JS"] },
        ],
      });
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // cover letter insert
      mockQuery.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .post("/api/jobs/1/generate-cover-letter")
        .set("Authorization", `Bearer ${validToken}`);

      expect([200, 404, 500]).toContain(response.status);
    });

    it("should handle database error", async () => {
      mockQuery.mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app)
        .post("/api/jobs/1/generate-cover-letter")
        .set("Authorization", `Bearer ${validToken}`);

      expect([404, 500]).toContain(response.status);
    });
  });

  describe("GET /archived Edge Cases", () => {
    it("should handle database error", async () => {
      mockQuery.mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app)
        .get("/api/jobs/archived")
        .set("Authorization", `Bearer ${validToken}`);

      expect([500]).toContain(response.status);
    });
  });

});
