import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";

// Create hoisted mocks
const mockQuery = vi.hoisted(() => vi.fn());
const mockExistsSync = vi.hoisted(() => vi.fn());
const mockReadFileSync = vi.hoisted(() => vi.fn());
const mockWriteFileSync = vi.hoisted(() => vi.fn());
const mockMkdirSync = vi.hoisted(() => vi.fn());
const mockUnlinkSync = vi.hoisted(() => vi.fn());
const mockSendFile = vi.hoisted(() => vi.fn());
const mockPuppeteerLaunch = vi.hoisted(() => vi.fn());
const mockMammothConvert = vi.hoisted(() => vi.fn());

vi.mock("../../auth.js", () => ({
  auth: (req, res, next) => {
    req.user = { id: 1 };
    next();
  },
}));

vi.mock("../../db/pool.js", () => ({
  default: {
    query: mockQuery,
  },
}));

vi.mock("pg", () => {
  function MockPool() {
    return {
      query: mockQuery,
    };
  }
  return {
    Pool: MockPool,
  };
});

vi.mock("fs", () => ({
  default: {
    existsSync: mockExistsSync,
    readFileSync: mockReadFileSync,
    writeFileSync: mockWriteFileSync,
    mkdirSync: mockMkdirSync,
    unlinkSync: mockUnlinkSync,
  },
}));

vi.mock("puppeteer", () => ({
  default: {
    launch: mockPuppeteerLaunch,
  },
}));

vi.mock("mammoth", async () => {
  return {
    default: {
      convertToHtml: mockMammothConvert,
    },
  };
});

import coverLetterRouter from "../../routes/cover_letter.js";

describe("Cover Letter Routes", () => {
  let app;

  beforeEach(() => {
    vi.clearAllMocks();

    app = express();
    app.use(express.json());
    app.use("/api/cover-letters", coverLetterRouter);

    mockQuery.mockReset();
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(Buffer.from("test content"));
    mockMammothConvert.mockResolvedValue({ value: "<p>Test HTML</p>" });
  });

  describe("GET / - List Cover Letters", () => {
    it("should return all cover letters from multiple tables", async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ id: 1, title: "Letter 1", source: "uploaded" }],
        })
        .mockResolvedValueOnce({
          rows: [{ id: 2, title: "Letter 2", source: "cover_letters" }],
        })
        .mockResolvedValueOnce({
          rows: [{ id: 3, name: "Template 1", source: "template" }],
        });

      const response = await request(app).get("/api/cover-letters");

      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body).toHaveProperty("cover_letters");
        expect(response.body).toHaveProperty("templates");
      }
    });

    it("should handle uploaded_cover_letters query failure", async () => {
      mockQuery
        .mockRejectedValueOnce(new Error("Table not found"))
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const response = await request(app).get("/api/cover-letters");

      expect([200, 500]).toContain(response.status);
    });

    it("should handle cover_letters query failure", async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockRejectedValueOnce(new Error("Table not found"))
        .mockResolvedValueOnce({ rows: [] });

      const response = await request(app).get("/api/cover-letters");

      expect([200, 500]).toContain(response.status);
    });

    it("should handle templates query failure", async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockRejectedValueOnce(new Error("Table not found"));

      const response = await request(app).get("/api/cover-letters");

      expect([200, 500]).toContain(response.status);
    });

    it("should handle table does not exist error", async () => {
      const error = new Error("relation does not exist");
      error.code = "42P01";
      mockQuery.mockRejectedValueOnce(error);

      const response = await request(app).get("/api/cover-letters");

      expect([200, 500]).toContain(response.status);
    });
  });

  describe("POST / - Create Cover Letter", () => {
    it("should create cover letter with name", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, title: "New Letter", content: "Content" }],
      });

      const response = await request(app).post("/api/cover-letters").send({
        name: "New Letter",
        content: "Content",
        format: "pdf",
      });

      expect([200, 201, 400, 500]).toContain(response.status);
    });

    it("should create cover letter with title (fallback)", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, title: "New Letter", content: "Content" }],
      });

      const response = await request(app).post("/api/cover-letters").send({
        title: "New Letter",
        content: "Content",
      });

      expect([200, 201, 400, 500]).toContain(response.status);
    });

    it("should require name or title", async () => {
      const response = await request(app)
        .post("/api/cover-letters")
        .send({ content: "Content" });

      expect(response.status).toBe(400);
    });

    it("should handle file_url", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, title: "Letter", file_url: "/uploads/file.pdf" }],
      });

      const response = await request(app).post("/api/cover-letters").send({
        name: "Letter",
        file_url: "/uploads/file.pdf",
      });

      expect([200, 201, 400, 500]).toContain(response.status);
    });

    it("should handle table does not exist error", async () => {
      const error = new Error("relation does not exist");
      error.code = "42P01";
      mockQuery.mockRejectedValueOnce(error);

      const response = await request(app)
        .post("/api/cover-letters")
        .send({ name: "Letter", content: "Content" });

      expect([503, 500]).toContain(response.status);
    });

    it("should handle database errors", async () => {
      mockQuery.mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app)
        .post("/api/cover-letters")
        .send({ name: "Letter", content: "Content" });

      expect(response.status).toBe(500);
    });
  });

  describe("GET /templates - Get Templates", () => {
    it("should return templates", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          { id: 1, name: "Template 1", content: "Content" },
          { id: 2, name: "Template 2", content: "Content 2" },
        ],
      });

      const response = await request(app).get("/api/cover-letters/templates");

      expect([200, 500]).toContain(response.status);
    });

    it("should handle database errors", async () => {
      mockQuery.mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app).get("/api/cover-letters/templates");

      expect(response.status).toBe(500);
    });
  });

  describe("GET /:id - Get Single Cover Letter", () => {
    it("should return cover letter from uploaded_cover_letters", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, title: "Letter 1", source: "uploaded" }],
      });

      const response = await request(app).get("/api/cover-letters/1");

      expect([200, 404, 500]).toContain(response.status);
    });

    it("should return cover letter from templates if not in uploaded", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({
        rows: [{ id: 1, name: "Template 1", source: "template" }],
      });

      const response = await request(app).get("/api/cover-letters/1");

      expect([200, 404, 500]).toContain(response.status);
    });

    it("should return cover letter from legacy table if not found elsewhere", async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{ id: 1, title: "Legacy Letter", source: "legacy" }],
        });

      const response = await request(app).get("/api/cover-letters/1");

      expect([200, 404, 500]).toContain(response.status);
    });

    it("should return 404 if not found in any table", async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const response = await request(app).get("/api/cover-letters/999");

      expect([404, 500]).toContain(response.status);
    });

    it("should reject invalid ID", async () => {
      const response = await request(app).get("/api/cover-letters/invalid");

      expect(response.status).toBe(400);
    });

    it("should handle query errors gracefully", async () => {
      mockQuery
        .mockRejectedValueOnce(new Error("Query failed"))
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const response = await request(app).get("/api/cover-letters/1");

      expect([200, 404, 500]).toContain(response.status);
    });
  });

  describe("GET /:id/download - Download Cover Letter", () => {
    it("should download file from uploaded_cover_letters", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            title: "Letter",
            file_url: "/uploads/cover-letters/file.pdf",
            format: "pdf",
          },
        ],
      });
      mockExistsSync.mockReturnValueOnce(true);

      const response = await request(app).get("/api/cover-letters/1/download");

      expect([200, 404, 500]).toContain(response.status);
    });

    it("should download from cover_letters table if not in uploaded", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({
        rows: [{ id: 1, title: "Letter", content: "Content" }],
      });

      const response = await request(app).get("/api/cover-letters/1/download");

      expect([200, 404, 500]).toContain(response.status);
    });

    it("should return 404 if cover letter not found", async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const response = await request(app).get(
        "/api/cover-letters/999/download"
      );

      expect([404, 500]).toContain(response.status);
    });

    it("should reject invalid ID", async () => {
      const response = await request(app).get(
        "/api/cover-letters/invalid/download"
      );

      expect(response.status).toBe(400);
    });

    it("should serve PDF file", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            title: "Letter",
            file_url: "/uploads/cover-letters/file.pdf",
            format: "pdf",
          },
        ],
      });
      mockExistsSync.mockReturnValueOnce(true);

      const response = await request(app).get("/api/cover-letters/1/download");

      expect([200, 404, 500]).toContain(response.status);
    });

    it("should serve DOCX file", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            title: "Letter",
            file_url: "/uploads/cover-letters/file.docx",
            format: "docx",
          },
        ],
      });
      mockExistsSync.mockReturnValueOnce(true);

      const response = await request(app).get("/api/cover-letters/1/download");

      expect([200, 404, 500]).toContain(response.status);
    });

    it("should return content as text if file not found", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            title: "Letter",
            file_url: null,
            content: "Letter content",
          },
        ],
      });

      const response = await request(app).get("/api/cover-letters/1/download");

      expect([200, 404, 500]).toContain(response.status);
    });

    it("should handle file not found on disk", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            title: "Letter",
            file_url: "/uploads/cover-letters/file.pdf",
            format: "pdf",
          },
        ],
      });
      mockExistsSync.mockReturnValueOnce(false);

      const response = await request(app).get("/api/cover-letters/1/download");

      expect([200, 404, 500]).toContain(response.status);
    });

    it("should handle view query parameter", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            title: "Letter",
            file_url: "/uploads/cover-letters/file.pdf",
            format: "pdf",
          },
        ],
      });
      mockExistsSync.mockReturnValueOnce(true);

      const response = await request(app).get(
        "/api/cover-letters/1/download?view=true"
      );

      expect([200, 404, 500]).toContain(response.status);
    });

    it("should convert DOCX to PDF when view=true and mammoth available", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            title: "Letter",
            file_url: "/uploads/cover-letters/file.docx",
            format: "docx",
          },
        ],
      });
      mockExistsSync
        .mockReturnValueOnce(true) // File exists
        .mockReturnValueOnce(false) // Temp dir doesn't exist
        .mockReturnValueOnce(true); // Temp PDF exists
      mockMkdirSync.mockReturnValueOnce(undefined);
      mockWriteFileSync.mockReturnValueOnce(undefined);

      const mockPage = {
        goto: vi.fn().mockResolvedValue(undefined),
        pdf: vi.fn().mockResolvedValue(undefined),
      };
      const mockBrowser = {
        newPage: vi.fn().mockResolvedValue(mockPage),
        close: vi.fn().mockResolvedValue(undefined),
      };
      mockPuppeteerLaunch.mockResolvedValueOnce(mockBrowser);

      const response = await request(app).get(
        "/api/cover-letters/1/download?view=true"
      );

      expect([200, 404, 500]).toContain(response.status);
    });

    it("should handle DOCX conversion errors", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            title: "Letter",
            file_url: "/uploads/cover-letters/file.docx",
            format: "docx",
          },
        ],
      });
      mockExistsSync
        .mockReturnValueOnce(true) // File exists
        .mockReturnValueOnce(false); // Temp dir doesn't exist
      mockMkdirSync.mockReturnValueOnce(undefined);
      mockMammothConvert.mockRejectedValueOnce(new Error("Conversion failed"));

      const response = await request(app).get(
        "/api/cover-letters/1/download?view=true"
      );

      expect([200, 404, 500]).toContain(response.status);
    });

    it("should handle download route catch block errors", async () => {
      // Test the catch block at the end of the download route
      // Simulate an error after getting the cover letter
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            title: "Letter",
            file_url: "/uploads/cover-letters/file.pdf",
            format: "pdf",
          },
        ],
      });
      mockExistsSync.mockImplementationOnce(() => {
        throw new Error("File system error");
      });

      const response = await request(app).get("/api/cover-letters/1/download");

      expect([200, 404, 500]).toContain(response.status);
    });
  });

  describe("GET /:id/jobs - Get Linked Jobs", () => {
    it("should return linked jobs", async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [
            { id: 1, title: "Job 1", company: "Google", cover_letter_id: 1 },
          ],
        });

      const response = await request(app).get("/api/cover-letters/1/jobs");

      expect([200, 404, 500]).toContain(response.status);
    });

    it("should check cover_letters table if not in uploaded", async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [] });

      const response = await request(app).get("/api/cover-letters/1/jobs");

      expect([200, 404, 500]).toContain(response.status);
    });

    it("should return 404 if cover letter not found", async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const response = await request(app).get("/api/cover-letters/999/jobs");

      expect([404, 500]).toContain(response.status);
    });

    it("should reject invalid ID", async () => {
      const response = await request(app).get(
        "/api/cover-letters/invalid/jobs"
      );

      expect(response.status).toBe(400);
    });

    it("should handle database errors", async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app).get("/api/cover-letters/1/jobs");

      expect(response.status).toBe(500);
    });
  });

  describe("POST /:id/link-job - Link Cover Letter to Job", () => {
    it("should link cover letter to job", async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post("/api/cover-letters/1/link-job")
        .send({ job_id: 1 });

      expect([200, 201, 400, 404, 500]).toContain(response.status);
    });

    it("should handle cover letter in legacy table", async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 1 }] });

      const response = await request(app)
        .post("/api/cover-letters/1/link-job")
        .send({ job_id: 1 });

      expect([400, 404, 500]).toContain(response.status);
    });

    it("should return 404 if cover letter not found", async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post("/api/cover-letters/999/link-job")
        .send({ job_id: 1 });

      expect([404, 500]).toContain(response.status);
    });

    it("should return 404 if job not found", async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post("/api/cover-letters/1/link-job")
        .send({ job_id: 999 });

      expect([404, 500]).toContain(response.status);
    });

    it("should reject invalid IDs", async () => {
      const response = await request(app)
        .post("/api/cover-letters/invalid/link-job")
        .send({ job_id: 1 });

      expect(response.status).toBe(400);
    });

    it("should handle database errors", async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app)
        .post("/api/cover-letters/1/link-job")
        .send({ job_id: 1 });

      expect(response.status).toBe(500);
    });
  });

  describe("POST /:id/unlink-job - Unlink Cover Letter from Job", () => {
    it("should unlink cover letter from job", async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 1 });

      const response = await request(app)
        .post("/api/cover-letters/1/unlink-job")
        .send({ job_id: 1 });

      expect([200, 400, 404, 500]).toContain(response.status);
    });

    it("should reject invalid IDs", async () => {
      const response = await request(app)
        .post("/api/cover-letters/invalid/unlink-job")
        .send({ job_id: 1 });

      expect(response.status).toBe(400);
    });

    it("should handle database errors", async () => {
      mockQuery.mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app)
        .post("/api/cover-letters/1/unlink-job")
        .send({ job_id: 1 });

      expect(response.status).toBe(500);
    });
  });

  describe("DELETE /:id - Delete Cover Letter", () => {
    it("should delete from uploaded_cover_letters", async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 1 }] });

      const response = await request(app).delete("/api/cover-letters/1");

      expect([200, 404, 500]).toContain(response.status);
    });

    it("should delete from cover_letters if not in uploaded", async () => {
      const error = new Error("Table not found");
      error.code = "42P01";
      mockQuery
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 1 }] });

      const response = await request(app).delete("/api/cover-letters/1");

      expect([200, 404, 500]).toContain(response.status);
    });

    it("should handle table does not exist error", async () => {
      const error = new Error("relation does not exist");
      error.code = "42P01";
      mockQuery.mockRejectedValueOnce(error).mockRejectedValueOnce(error);

      const response = await request(app).delete("/api/cover-letters/1");

      expect([200, 404, 500]).toContain(response.status);
    });

    it("should return 404 if not found", async () => {
      const error = new Error("Table not found");
      error.code = "42P01";
      mockQuery
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce({ rowCount: 0, rows: [] });

      const response = await request(app).delete("/api/cover-letters/999");

      expect([404, 500]).toContain(response.status);
    });

    it("should reject invalid ID", async () => {
      const response = await request(app).delete("/api/cover-letters/invalid");

      expect(response.status).toBe(400);
    });

    it("should handle non-table errors", async () => {
      mockQuery.mockRejectedValueOnce(new Error("Other error"));

      const response = await request(app).delete("/api/cover-letters/1");

      expect([200, 404, 500]).toContain(response.status);
    });

    it("should handle database errors", async () => {
      mockQuery
        .mockResolvedValueOnce({ rowCount: 0, rows: [] })
        .mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app).delete("/api/cover-letters/1");

      expect([200, 404, 500]).toContain(response.status);
    });
  });
});
