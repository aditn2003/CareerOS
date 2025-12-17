/**
 * Cover Letter AI Routes Tests
 * Tests routes/coverLetterAI.js
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

// Mock auth middleware
vi.mock("../../auth.js", () => ({
  auth: (req, res, next) => {
    req.user = { id: 1 };
    next();
  },
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

import { createCoverLetterAIRoutes } from "../../routes/coverLetterAI.js";
import pool from "../../db/pool.js";

describe("Cover Letter AI Routes", () => {
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
    const router = createCoverLetterAIRoutes(pool, mockOpenAI);
    app.use("/api/cover-letter-ai", router);
  });

  describe("POST /api/cover-letter-ai/generate", () => {
    it("should generate cover letter with experience analysis", async () => {
      // Mock employment query
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            role: "Software Engineer",
            company: "Tech Corp",
            responsibilities: "Development",
            achievements: "Led team",
          },
        ],
      });

      // Mock experience analysis
      mockCreateCompletion.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                summaryNarrative: "Relevant experience",
                topExperiences: ["Experience 1"],
                quantifiedHighlights: ["Increased revenue by 20%"],
                relevanceScores: [{ exp: "Software Engineer", score: 90 }],
                additionalRelevantExperiences: ["Additional exp"],
                alternativePresentations: ["Alternative phrasing"],
              }),
            },
          },
        ],
      });

      // Mock cover letter generation
      mockCreateCompletion.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: "---\nCOVER LETTER VARIATION #1\n---\nDear Hiring Manager...",
            },
          },
        ],
      });

      const response = await request(app)
        .post("/api/cover-letter-ai/generate")
        .send({
          jobTitle: "Software Engineer",
          companyName: "Google",
          companyResearch: "Leading tech company",
          tone: "formal",
          style: "direct",
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.content).toBeDefined();
      expect(response.body.expAnalysis).toBeDefined();
    });

    it("should handle missing userProfile gracefully", async () => {
      mockCreateCompletion
        .mockResolvedValueOnce({
          choices: [{ message: { content: "{}" } }],
        })
        .mockResolvedValueOnce({
          choices: [{ message: { content: "Cover letter content" } }],
        });

      const response = await request(app)
        .post("/api/cover-letter-ai/generate")
        .send({
          targetRole: "Engineer",
          company: "Tech Co",
          jobDescription: "Build stuff",
        });

      expect(response.status).toBe(200);
    });

    it("should use achievements when no employment records", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      mockCreateCompletion
        .mockResolvedValueOnce({
          choices: [{ message: { content: "{}" } }],
        })
        .mockResolvedValueOnce({
          choices: [{ message: { content: "Cover letter content" } }],
        });

      const response = await request(app)
        .post("/api/cover-letter-ai/generate")
        .send({
          jobTitle: "Engineer",
          companyName: "Tech Co",
          userProfile: { id: 1 },
          achievements: "Led team of 5, increased revenue by 20%",
        });

      expect(response.status).toBe(200);
    });

    it("should handle employment fetch failure", async () => {
      mockQuery.mockRejectedValueOnce(new Error("Database error"));

      mockCreateCompletion
        .mockResolvedValueOnce({
          choices: [{ message: { content: "{}" } }],
        })
        .mockResolvedValueOnce({
          choices: [{ message: { content: "Cover letter content" } }],
        });

      const response = await request(app)
        .post("/api/cover-letter-ai/generate")
        .send({
          jobTitle: "Engineer",
          companyName: "Tech Co",
          userProfile: { id: 1 },
        });

      expect(response.status).toBe(200);
    });

    it("should handle experience analysis failure", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      mockCreateCompletion
        .mockRejectedValueOnce(new Error("AI error"))
        .mockResolvedValueOnce({
          choices: [{ message: { content: "Cover letter content" } }],
        });

      const response = await request(app)
        .post("/api/cover-letter-ai/generate")
        .send({
          jobTitle: "Engineer",
          companyName: "Tech Co",
        });

      expect(response.status).toBe(200);
    });

    it("should handle JSON parse error in experience analysis", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      mockCreateCompletion
        .mockResolvedValueOnce({
          choices: [{ message: { content: "Not valid JSON" } }],
        })
        .mockResolvedValueOnce({
          choices: [{ message: { content: "Cover letter content" } }],
        });

      const response = await request(app)
        .post("/api/cover-letter-ai/generate")
        .send({
          jobTitle: "Engineer",
          companyName: "Tech Co",
        });

      expect(response.status).toBe(200);
    });

    it("should strip markdown code blocks from JSON response", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      mockCreateCompletion
        .mockResolvedValueOnce({
          choices: [
            {
              message: {
                content: '```json\n{"summaryNarrative": "Test"}\n```',
              },
            },
          ],
        })
        .mockResolvedValueOnce({
          choices: [{ message: { content: "Cover letter content" } }],
        });

      const response = await request(app)
        .post("/api/cover-letter-ai/generate")
        .send({
          jobTitle: "Engineer",
          companyName: "Tech Co",
        });

      expect(response.status).toBe(200);
    });

    it("should handle all style settings", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      mockCreateCompletion
        .mockResolvedValueOnce({
          choices: [{ message: { content: "{}" } }],
        })
        .mockResolvedValueOnce({
          choices: [{ message: { content: "Cover letter content" } }],
        });

      const response = await request(app)
        .post("/api/cover-letter-ai/generate")
        .send({
          jobTitle: "Engineer",
          companyName: "Tech Co",
          tone: "casual",
          style: "storytelling",
          length: "short",
          culture: "startup",
          industry: "Technology",
          personality: "enthusiastic",
          customToneInstructions: "Be more personal",
        });

      expect(response.status).toBe(200);
    });

    it("should handle empty response from AI", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      mockCreateCompletion
        .mockResolvedValueOnce({ choices: [{ message: { content: "" } }] })
        .mockResolvedValueOnce({ choices: [{ message: { content: "" } }] });

      const response = await request(app)
        .post("/api/cover-letter-ai/generate")
        .send({
          jobTitle: "Engineer",
          companyName: "Tech Co",
        });

      expect(response.status).toBe(200);
    });

    it("should handle AI generation error", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      mockCreateCompletion
        .mockResolvedValueOnce({ choices: [{ message: { content: "{}" } }] })
        .mockRejectedValueOnce(new Error("AI generation failed"));

      const response = await request(app)
        .post("/api/cover-letter-ai/generate")
        .send({
          jobTitle: "Engineer",
          companyName: "Tech Co",
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toContain("AI generation failed");
    });

    it("should use companyNews when provided", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      mockCreateCompletion
        .mockResolvedValueOnce({ choices: [{ message: { content: "{}" } }] })
        .mockResolvedValueOnce({
          choices: [{ message: { content: "Cover letter content" } }],
        });

      const response = await request(app)
        .post("/api/cover-letter-ai/generate")
        .send({
          jobTitle: "Engineer",
          companyName: "Tech Co",
          companyNews: "Company just raised $100M",
        });

      expect(response.status).toBe(200);
    });
  });

  describe("POST /api/cover-letter-ai/refine", () => {
    it("should refine cover letter text", async () => {
      mockCreateCompletion.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                improved_text: "Improved cover letter text",
                restructuring_suggestions: ["Add more details"],
                synonym_suggestions: [
                  { original: "good", alternatives: ["excellent", "great"] },
                ],
                style_tips: ["Use more active voice"],
              }),
            },
          },
        ],
      });

      const response = await request(app)
        .post("/api/cover-letter-ai/refine")
        .send({
          text: "This is my cover letter. I am a good candidate for the job.",
        });

      expect(response.status).toBe(200);
      expect(response.body.improved_text).toBeDefined();
      expect(response.body.restructuring_suggestions).toBeDefined();
      expect(response.body.synonym_suggestions).toBeDefined();
      expect(response.body.style_tips).toBeDefined();
      expect(response.body.readability).toBeDefined();
    });

    it("should return 400 if text is empty", async () => {
      const response = await request(app)
        .post("/api/cover-letter-ai/refine")
        .send({ text: "" });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("Text is required");
    });

    it("should return 400 if text is whitespace only", async () => {
      const response = await request(app)
        .post("/api/cover-letter-ai/refine")
        .send({ text: "   " });

      expect(response.status).toBe(400);
    });

    it("should handle missing text field", async () => {
      const response = await request(app)
        .post("/api/cover-letter-ai/refine")
        .send({});

      expect(response.status).toBe(400);
    });

    it("should use original text if improved_text is missing", async () => {
      mockCreateCompletion.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                restructuring_suggestions: [],
              }),
            },
          },
        ],
      });

      const response = await request(app)
        .post("/api/cover-letter-ai/refine")
        .send({ text: "Original text" });

      expect(response.status).toBe(200);
      expect(response.body.improved_text).toBe("Original text");
    });

    it("should handle AI error", async () => {
      mockCreateCompletion.mockRejectedValueOnce(new Error("AI error"));

      const response = await request(app)
        .post("/api/cover-letter-ai/refine")
        .send({ text: "Some cover letter text" });

      expect(response.status).toBe(500);
      expect(response.body.error).toContain("Failed to refine");
    });

    it("should calculate readability for different text lengths", async () => {
      mockCreateCompletion.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                improved_text:
                  "Short sentence. Another short one. Third sentence here. Fourth. Fifth sentence is longer than the others. Sixth sentence continues the pattern. Seventh. Eighth. Ninth. Tenth.",
              }),
            },
          },
        ],
      });

      const response = await request(app)
        .post("/api/cover-letter-ai/refine")
        .send({ text: "Short text" });

      expect(response.status).toBe(200);
      expect(response.body.readability).toBeDefined();
      expect(response.body.readability.words).toBeGreaterThan(0);
      expect(response.body.readability.sentences).toBeGreaterThan(0);
    });

    it("should handle empty arrays in response", async () => {
      mockCreateCompletion.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({}),
            },
          },
        ],
      });

      const response = await request(app)
        .post("/api/cover-letter-ai/refine")
        .send({ text: "Some text" });

      expect(response.status).toBe(200);
      expect(response.body.restructuring_suggestions).toEqual([]);
      expect(response.body.synonym_suggestions).toEqual([]);
      expect(response.body.style_tips).toEqual([]);
    });
  });
});

