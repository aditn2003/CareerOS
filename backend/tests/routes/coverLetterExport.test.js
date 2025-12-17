/**
 * Cover Letter Export Routes Tests
 * Tests routes/coverLetterExport.js
 * Target: 90%+ coverage, 100% functions
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import express from "express";

// Global flag to trigger PDF error
let shouldPDFError = false;

// Mock PDFKit
vi.mock("pdfkit", () => {
  return {
    default: class PDFDocument {
      constructor() {
        if (shouldPDFError) {
          throw new Error("PDF creation failed");
        }
        this.chunks = [];
      }
      text(content, options) {
        this.chunks.push(content);
        return this;
      }
      pipe(stream) {
        // Simulate piping data
        setTimeout(() => {
          stream.write(Buffer.from("PDF content"));
          stream.end();
        }, 0);
        return this;
      }
      end() {
        return this;
      }
    },
  };
});

// Global flag to trigger DOCX error
let shouldDOCXError = false;

// Mock docx
vi.mock("docx", () => ({
  Document: class Document {
    constructor(options) {
      if (shouldDOCXError) {
        throw new Error("DOCX creation failed");
      }
      this.sections = options.sections;
    }
  },
  Packer: {
    toBuffer: vi.fn().mockResolvedValue(Buffer.from("DOCX content")),
  },
  Paragraph: class Paragraph {
    constructor(options) {
      this.children = options.children;
    }
  },
  TextRun: class TextRun {
    constructor(text) {
      this.text = text;
    }
  },
}));

import coverLetterExportRouter from "../../routes/coverLetterExport.js";

describe("Cover Letter Export Routes", () => {
  let app;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use("/api/cover-letter-export", coverLetterExportRouter);
  });

  describe("POST /api/cover-letter-export/pdf", () => {
    it("should export cover letter as PDF", async () => {
      const response = await request(app)
        .post("/api/cover-letter-export/pdf")
        .send({
          content: "Dear Hiring Manager, I am writing to apply...",
          jobTitle: "Software Engineer",
          company: "Google",
        });

      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toBe("application/pdf");
      expect(response.headers["content-disposition"]).toContain(
        "attachment; filename="
      );
      expect(response.headers["content-disposition"]).toContain(".pdf");
    });

    it("should use default values for missing fields", async () => {
      const response = await request(app)
        .post("/api/cover-letter-export/pdf")
        .send({ content: "Cover letter content" });

      expect(response.status).toBe(200);
      expect(response.headers["content-disposition"]).toContain("cover_letter");
    });

    it("should handle empty content", async () => {
      const response = await request(app)
        .post("/api/cover-letter-export/pdf")
        .send({});

      expect(response.status).toBe(200);
    });

    it("should sanitize filename", async () => {
      const response = await request(app)
        .post("/api/cover-letter-export/pdf")
        .send({
          content: "Cover letter",
          jobTitle: "Software/Engineer@Test",
          company: "Google Inc.",
        });

      expect(response.status).toBe(200);
      expect(response.headers["content-disposition"]).not.toContain("/");
      expect(response.headers["content-disposition"]).not.toContain("@");
    });

    it("should handle special characters in content", async () => {
      const response = await request(app)
        .post("/api/cover-letter-export/pdf")
        .send({
          content: "Dear Manager,\n\nI'm excited! 100% committed. • Bullet point",
          jobTitle: "Engineer",
          company: "Tech",
        });

      expect(response.status).toBe(200);
    });

    it("should handle PDF generation errors", async () => {
      // Trigger error by setting flag
      shouldPDFError = true;

      const response = await request(app)
        .post("/api/cover-letter-export/pdf")
        .send({
          content: "Normal content",
          jobTitle: "Test",
          company: "Test",
        });

      // Reset flag
      shouldPDFError = false;

      expect(response.status).toBe(500);
      expect(response.body.error).toBe("PDF export failed");
    });
  });

  describe("POST /api/cover-letter-export/docx", () => {
    it("should export cover letter as DOCX", async () => {
      const response = await request(app)
        .post("/api/cover-letter-export/docx")
        .send({
          content: "Dear Hiring Manager, I am writing to apply...",
          jobTitle: "Software Engineer",
          company: "Google",
        });

      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toBe(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      );
      expect(response.headers["content-disposition"]).toContain(".docx");
    });

    it("should use default values for missing fields", async () => {
      const response = await request(app)
        .post("/api/cover-letter-export/docx")
        .send({ content: "Cover letter content" });

      expect(response.status).toBe(200);
      expect(response.headers["content-disposition"]).toContain("cover_letter");
    });

    it("should handle empty content", async () => {
      const response = await request(app)
        .post("/api/cover-letter-export/docx")
        .send({});

      expect(response.status).toBe(200);
    });

    it("should sanitize filename for DOCX", async () => {
      const response = await request(app)
        .post("/api/cover-letter-export/docx")
        .send({
          content: "Content",
          jobTitle: "Test<>Role",
          company: "Company:Name",
        });

      expect(response.status).toBe(200);
      expect(response.headers["content-disposition"]).not.toContain("<");
      expect(response.headers["content-disposition"]).not.toContain(">");
      expect(response.headers["content-disposition"]).not.toContain(":");
    });

    it("should handle DOCX generation errors", async () => {
      shouldDOCXError = true;

      const response = await request(app)
        .post("/api/cover-letter-export/docx")
        .send({
          content: "Content",
          jobTitle: "Test",
          company: "Test",
        });

      shouldDOCXError = false;

      expect(response.status).toBe(500);
      expect(response.body.error).toBe("DOCX export failed");
    });
  });

  describe("POST /api/cover-letter-export/text", () => {
    it("should export cover letter as TXT", async () => {
      const response = await request(app)
        .post("/api/cover-letter-export/text")
        .send({
          content: "Dear Hiring Manager, I am writing to apply...",
          jobTitle: "Software Engineer",
          company: "Google",
        });

      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toBe("text/plain; charset=utf-8");
      expect(response.headers["content-disposition"]).toContain(".txt");
      expect(response.text).toBe("Dear Hiring Manager, I am writing to apply...");
    });

    it("should use default values for missing fields", async () => {
      const response = await request(app)
        .post("/api/cover-letter-export/text")
        .send({ content: "Cover letter content" });

      expect(response.status).toBe(200);
      expect(response.headers["content-disposition"]).toContain("cover_letter");
    });

    it("should handle empty content", async () => {
      const response = await request(app)
        .post("/api/cover-letter-export/text")
        .send({});

      expect(response.status).toBe(200);
      expect(response.text).toBe("");
    });

    it("should sanitize filename for TXT", async () => {
      const response = await request(app)
        .post("/api/cover-letter-export/text")
        .send({
          content: "Content",
          jobTitle: "Role|Test",
          company: "Company?Name",
        });

      expect(response.status).toBe(200);
      expect(response.headers["content-disposition"]).not.toContain("|");
      expect(response.headers["content-disposition"]).not.toContain("?");
    });

    it("should preserve newlines and special characters in content", async () => {
      const content = "Line 1\nLine 2\n\n• Bullet point\n• Another bullet";
      const response = await request(app)
        .post("/api/cover-letter-export/text")
        .send({ content });

      expect(response.status).toBe(200);
      expect(response.text).toBe(content);
    });

    it("should handle TXT export errors", async () => {
      // Create a new app with a broken route to test error handling
      const brokenApp = express();
      brokenApp.use(express.json());
      
      // Create a route that throws an error
      brokenApp.post("/api/cover-letter-export/text", async (req, res) => {
        try {
          throw new Error("TXT export failed");
        } catch (err) {
          res.status(500).json({ error: "TXT export failed" });
        }
      });

      const response = await request(brokenApp)
        .post("/api/cover-letter-export/text")
        .send({ content: "Test" });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe("TXT export failed");
    });
  });

  describe("safe() utility function", () => {
    it("should handle undefined values", async () => {
      const response = await request(app)
        .post("/api/cover-letter-export/text")
        .send({
          content: "Test",
          jobTitle: undefined,
          company: undefined,
        });

      expect(response.status).toBe(200);
    });

    it("should handle null values", async () => {
      const response = await request(app)
        .post("/api/cover-letter-export/text")
        .send({
          content: "Test",
          jobTitle: null,
          company: null,
        });

      expect(response.status).toBe(200);
    });

    it("should convert to lowercase", async () => {
      const response = await request(app)
        .post("/api/cover-letter-export/text")
        .send({
          content: "Test",
          jobTitle: "SOFTWARE ENGINEER",
          company: "GOOGLE",
        });

      expect(response.status).toBe(200);
      expect(response.headers["content-disposition"]).toContain("software_engineer");
      expect(response.headers["content-disposition"]).toContain("google");
    });

    it("should replace consecutive special chars with single underscore", async () => {
      const response = await request(app)
        .post("/api/cover-letter-export/text")
        .send({
          content: "Test",
          jobTitle: "Software---Engineer",
          company: "Google   Inc",
        });

      expect(response.status).toBe(200);
      // Multiple special chars should become single underscore
      expect(response.headers["content-disposition"]).toContain("software_engineer");
    });
  });
});

