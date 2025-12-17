/**
 * Cover Letter Templates Routes Tests
 * Tests routes/coverLetterTemplates.js
 * Target: 90%+ coverage, 100% functions
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import express from "express";

// Hoist mock functions
const { mockQuery, mockCreateCompletion } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockCreateCompletion: vi.fn(),
}));

// Mock API tracking service
vi.mock("../../utils/apiTrackingService.js", () => ({
  trackApiCall: vi.fn(async (serviceName, apiCallFn, options) => {
    return await apiCallFn();
  }),
}));

// Mock database pool
vi.mock("../../db/pool.js", () => ({
  default: {
    query: (...args) => mockQuery(...args),
  },
}));

// Mock OpenAI
vi.mock("openai", () => ({
  default: class OpenAI {
    constructor() {
      this.chat = {
        completions: {
          create: (...args) => mockCreateCompletion(...args),
        },
      };
    }
  },
}));

import { createCoverLetterTemplatesRoutes } from "../../routes/coverLetterTemplates.js";
import pool from "../../db/pool.js";

describe("Cover Letter Templates Routes", () => {
  let app;

  beforeEach(() => {
    vi.clearAllMocks();

    const mockOpenAI = {
      chat: {
        completions: {
          create: (...args) => mockCreateCompletion(...args),
        },
      },
    };

    app = express();
    app.use(express.json());
    const router = createCoverLetterTemplatesRoutes(pool, mockOpenAI);
    app.use("/api/cover-letter-templates", router);
  });

  describe("GET /api/cover-letter-templates/templates", () => {
    it("should return all templates", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            name: "Professional Template",
            industry: "Technology",
            category: "Formal",
            content: "Template content",
            is_custom: false,
            view_count: 10,
            use_count: 5,
          },
        ],
      });

      const response = await request(app).get(
        "/api/cover-letter-templates/templates"
      );

      expect(response.status).toBe(200);
      expect(response.body.templates).toHaveLength(1);
      expect(response.body.templates[0].name).toBe("Professional Template");
    });

    it("should handle database errors", async () => {
      mockQuery.mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app).get(
        "/api/cover-letter-templates/templates"
      );

      expect(response.status).toBe(500);
      expect(response.body.message).toContain("Failed to fetch");
    });
  });

  describe("POST /api/cover-letter-templates/templates", () => {
    it("should create a new template", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            name: "My Template",
            industry: "Technology",
            category: "Formal",
            content: "Template content",
            is_custom: true,
            view_count: 0,
            use_count: 0,
          },
        ],
      });

      const response = await request(app)
        .post("/api/cover-letter-templates/templates")
        .send({
          name: "My Template",
          industry: "Technology",
          content: "Template content",
        });

      expect(response.status).toBe(201);
      expect(response.body.template.name).toBe("My Template");
      expect(response.body.template.is_custom).toBe(true);
    });

    it("should use default category if not provided", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            name: "My Template",
            industry: "Technology",
            category: "Formal",
            content: "Content",
          },
        ],
      });

      const response = await request(app)
        .post("/api/cover-letter-templates/templates")
        .send({
          name: "My Template",
          industry: "Technology",
          content: "Content",
        });

      expect(response.status).toBe(201);
    });

    it("should return 400 if name is missing", async () => {
      const response = await request(app)
        .post("/api/cover-letter-templates/templates")
        .send({
          industry: "Technology",
          content: "Content",
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("required");
    });

    it("should return 400 if industry is missing", async () => {
      const response = await request(app)
        .post("/api/cover-letter-templates/templates")
        .send({
          name: "My Template",
          content: "Content",
        });

      expect(response.status).toBe(400);
    });

    it("should return 400 if content is missing", async () => {
      const response = await request(app)
        .post("/api/cover-letter-templates/templates")
        .send({
          name: "My Template",
          industry: "Technology",
        });

      expect(response.status).toBe(400);
    });

    it("should return 400 for whitespace-only values", async () => {
      const response = await request(app)
        .post("/api/cover-letter-templates/templates")
        .send({
          name: "   ",
          industry: "Technology",
          content: "Content",
        });

      expect(response.status).toBe(400);
    });

    it("should handle database errors", async () => {
      mockQuery.mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app)
        .post("/api/cover-letter-templates/templates")
        .send({
          name: "My Template",
          industry: "Technology",
          content: "Content",
        });

      expect(response.status).toBe(500);
    });
  });

  describe("POST /api/cover-letter-templates/templates/:id/track-view", () => {
    it("should track template view", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app).post(
        "/api/cover-letter-templates/templates/1/track-view"
      );

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
    });

    it("should handle database errors", async () => {
      mockQuery.mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app).post(
        "/api/cover-letter-templates/templates/1/track-view"
      );

      expect(response.status).toBe(500);
      expect(response.body.message).toContain("Failed to track");
    });
  });

  describe("POST /api/cover-letter-templates/templates/:id/track-use", () => {
    it("should track template use", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app).post(
        "/api/cover-letter-templates/templates/1/track-use"
      );

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
    });

    it("should handle database errors", async () => {
      mockQuery.mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app).post(
        "/api/cover-letter-templates/templates/1/track-use"
      );

      expect(response.status).toBe(500);
    });
  });

  describe("POST /api/cover-letter-templates/generate", () => {
    it("should generate AI cover letter with company research", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            basics: { industry: "Technology", size: "Large" },
            mission_values_culture: {
              mission: "Organize the world's information",
              values: "Innovation",
              culture: "Collaborative",
            },
            products_services: { list: "Search, Cloud, AI" },
            executives: { ceo: "Sundar Pichai" },
            competitive_landscape: { summary: "Competes with Microsoft" },
            news: [{ title: "New AI announcement" }],
            summary: "Leading tech company",
          },
        ],
      });

      mockCreateCompletion.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: "Dear Hiring Manager, I am excited to apply...",
            },
          },
        ],
      });

      const response = await request(app)
        .post("/api/cover-letter-templates/generate")
        .send({
          userName: "John Doe",
          targetRole: "Software Engineer",
          company: "Google",
          jobDescription: "Build great products",
          achievements: "Led team of 5",
          tone: "Professional",
          variation: "Standard",
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.letter).toBeDefined();
    });

    it("should return 400 if company is missing", async () => {
      const response = await request(app)
        .post("/api/cover-letter-templates/generate")
        .send({
          targetRole: "Software Engineer",
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it("should return 400 if targetRole is missing", async () => {
      const response = await request(app)
        .post("/api/cover-letter-templates/generate")
        .send({
          company: "Google",
        });

      expect(response.status).toBe(400);
    });

    it("should return 400 for whitespace-only company", async () => {
      const response = await request(app)
        .post("/api/cover-letter-templates/generate")
        .send({
          company: "   ",
          targetRole: "Engineer",
        });

      expect(response.status).toBe(400);
    });

    it("should handle missing company research", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      mockCreateCompletion.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: "Cover letter without research",
            },
          },
        ],
      });

      const response = await request(app)
        .post("/api/cover-letter-templates/generate")
        .send({
          targetRole: "Engineer",
          company: "Unknown Company",
        });

      expect(response.status).toBe(200);
    });

    it('should use Impact variation instructions', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      mockCreateCompletion.mockResolvedValueOnce({
        choices: [{ message: { content: "Impact-focused letter" } }],
      });

      const response = await request(app)
        .post("/api/cover-letter-templates/generate")
        .send({
          targetRole: "Engineer",
          company: "Tech Co",
          variation: "Impact",
        });

      expect(response.status).toBe(200);
    });

    it('should use Storytelling variation instructions', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      mockCreateCompletion.mockResolvedValueOnce({
        choices: [{ message: { content: "Story-driven letter" } }],
      });

      const response = await request(app)
        .post("/api/cover-letter-templates/generate")
        .send({
          targetRole: "Engineer",
          company: "Tech Co",
          variation: "Storytelling",
        });

      expect(response.status).toBe(200);
    });

    it("should handle AI returning empty content", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      mockCreateCompletion.mockResolvedValueOnce({
        choices: [{ message: { content: null } }],
      });

      const response = await request(app)
        .post("/api/cover-letter-templates/generate")
        .send({
          targetRole: "Engineer",
          company: "Tech Co",
        });

      expect(response.status).toBe(200);
      expect(response.body.letter).toContain("Error");
    });

    it("should handle AI errors", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockCreateCompletion.mockRejectedValueOnce(new Error("AI error"));

      const response = await request(app)
        .post("/api/cover-letter-templates/generate")
        .send({
          targetRole: "Engineer",
          company: "Tech Co",
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    it("should handle news as array in research", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            basics: {},
            mission_values_culture: {},
            products_services: {},
            executives: {},
            competitive_landscape: {},
            news: [
              { title: "News 1" },
              { title: "News 2" },
            ],
            summary: "",
          },
        ],
      });

      mockCreateCompletion.mockResolvedValueOnce({
        choices: [{ message: { content: "Letter" } }],
      });

      const response = await request(app)
        .post("/api/cover-letter-templates/generate")
        .send({
          targetRole: "Engineer",
          company: "Tech Co",
        });

      expect(response.status).toBe(200);
    });

    it("should include userId if provided", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      mockCreateCompletion.mockResolvedValueOnce({
        choices: [{ message: { content: "Letter" } }],
      });

      const response = await request(app)
        .post("/api/cover-letter-templates/generate")
        .send({
          targetRole: "Engineer",
          company: "Tech Co",
          user_id: 123,
        });

      expect(response.status).toBe(200);
    });
  });

  describe("POST /api/cover-letter-templates/save-ai", () => {
    it("should save AI-generated cover letter", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            user_id: 1,
            name: "My Cover Letter",
            content: "Letter content",
          },
        ],
      });

      const response = await request(app)
        .post("/api/cover-letter-templates/save-ai")
        .send({
          user_id: 1,
          title: "My Cover Letter",
          content: "Letter content",
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.saved).toBeDefined();
    });

    it("should use default title if not provided", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, name: "AI Cover Letter" }],
      });

      const response = await request(app)
        .post("/api/cover-letter-templates/save-ai")
        .send({
          user_id: 1,
          content: "Letter content",
        });

      expect(response.status).toBe(200);
    });

    it("should return 400 if user_id is missing", async () => {
      const response = await request(app)
        .post("/api/cover-letter-templates/save-ai")
        .send({
          content: "Letter content",
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it("should return 400 if content is missing", async () => {
      const response = await request(app)
        .post("/api/cover-letter-templates/save-ai")
        .send({
          user_id: 1,
        });

      expect(response.status).toBe(400);
    });

    it("should handle database errors", async () => {
      mockQuery.mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app)
        .post("/api/cover-letter-templates/save-ai")
        .send({
          user_id: 1,
          content: "Content",
        });

      expect(response.status).toBe(500);
    });
  });

  describe("GET /api/cover-letter-templates/saved/:userId", () => {
    it("should get saved cover letters for user", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          { id: 1, name: "Letter 1", content: "Content 1" },
          { id: 2, name: "Letter 2", content: "Content 2" },
        ],
      });

      const response = await request(app).get(
        "/api/cover-letter-templates/saved/1"
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.letters).toHaveLength(2);
    });

    it("should handle database errors", async () => {
      mockQuery.mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app).get(
        "/api/cover-letter-templates/saved/1"
      );

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe("DELETE /api/cover-letter-templates/saved/:id", () => {
    it("should delete saved cover letter", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app).delete(
        "/api/cover-letter-templates/saved/1"
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it("should handle database errors", async () => {
      mockQuery.mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app).delete(
        "/api/cover-letter-templates/saved/1"
      );

      expect(response.status).toBe(500);
    });
  });

  describe("PUT /api/cover-letter-templates/saved/:id", () => {
    it("should update saved cover letter", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, name: "Updated Name", content: "Updated content" }],
      });

      const response = await request(app)
        .put("/api/cover-letter-templates/saved/1")
        .send({
          name: "Updated Name",
          content: "Updated content",
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.updated.name).toBe("Updated Name");
    });

    it("should use default name if not provided", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, name: "Updated Cover Letter" }],
      });

      const response = await request(app)
        .put("/api/cover-letter-templates/saved/1")
        .send({
          content: "Updated content",
        });

      expect(response.status).toBe(200);
    });

    it("should handle database errors", async () => {
      mockQuery.mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app)
        .put("/api/cover-letter-templates/saved/1")
        .send({
          content: "Updated content",
        });

      expect(response.status).toBe(500);
    });
  });
});

