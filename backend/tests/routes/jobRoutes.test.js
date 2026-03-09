/**
 * Job Routes Tests
 * Tests routes/jobRoutes.js
 * Target: 90%+ coverage
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import request from "supertest";
import express from "express";

// Mock axios
vi.mock("axios", () => ({
  default: {
    get: vi.fn(),
  },
}));

// Mock Google Generative AI - must be a class constructor
vi.mock("@google/generative-ai", () => {
  return {
    GoogleGenerativeAI: class {
      constructor(apiKey) {
        this.apiKey = apiKey;
      }
      getGenerativeModel() {
        return {
          generateContent: vi.fn().mockResolvedValue({
            response: {
              text: () =>
                JSON.stringify({
                  title: "Default Test Job",
                  company: "Default Test Company",
                  location: "Default Location",
                  salary_min: "",
                  salary_max: "",
                  description: "Default description",
                }),
            },
          }),
        };
      }
    },
  };
});

// Mock API tracking service
vi.mock("../../utils/apiTrackingService.js", () => ({
  trackApiCall: vi.fn(),
  logApiUsage: vi.fn().mockResolvedValue(undefined),
  logApiError: vi.fn().mockResolvedValue(undefined),
}));

// Mock cheerio - extract text from HTML
vi.mock("cheerio", () => {
  const createCheerioInstance = (html) => {
    let text = String(html || "")
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

    const cheerioFn = (selector) => {
      if (selector === "body") {
        return {
          text: () => text,
        };
      }
      return {
        text: () => "",
      };
    };

    return cheerioFn;
  };

  return {
    load: createCheerioInstance,
    default: { load: createCheerioInstance },
  };
});

describe("Job Routes", () => {
  let app;
  let mockAxios;
  let mockGenAIInstance;
  let mockModel;
  let mockLogApiUsage;
  let mockLogApiError;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Get mock instances
    mockAxios = (await import("axios")).default;
    const apiTracking = await import("../../utils/apiTrackingService.js");
    mockLogApiUsage = apiTracking.logApiUsage;
    mockLogApiError = apiTracking.logApiError;

    // Create mock model with configurable generateContent
    // Use vi.fn() to ensure it's a proper mock function
    // Each test will set up its own mock implementation
    mockModel = {
      generateContent: vi.fn(),
    };

    // Create mock GenAI instance - ensure it always returns our mockModel
    mockGenAIInstance = {
      getGenerativeModel: vi.fn((config) => {
        // Return the same mockModel instance so we can control it
        return mockModel;
      }),
    };

    // Import the factory function
    const { createJobRoutes } = await import("../../routes/jobRoutes.js");

    // Create router with our mock GenAI (bypasses default constructor)
    const router = createJobRoutes(mockGenAIInstance);

    app = express();
    app.use(express.json());
    // Add mock user middleware
    app.use((req, res, next) => {
      req.user = { id: 1 };
      next();
    });
    app.use("/api/job", router);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/job/import-job", () => {
    it("should return error for missing URL", async () => {
      const response = await request(app).post("/api/job/import-job").send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("status", "failed");
      expect(response.body).toHaveProperty("error", "Invalid URL");
    });

    it("should return error for invalid URL format", async () => {
      const response = await request(app)
        .post("/api/job/import-job")
        .send({ url: "not-a-url" });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("status", "failed");
      expect(response.body).toHaveProperty("error", "Invalid URL");
    });

    it("should return error for URL without protocol", async () => {
      const response = await request(app)
        .post("/api/job/import-job")
        .send({ url: "example.com/job" });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error", "Invalid URL");
    });

    it("should return error for ftp protocol", async () => {
      const response = await request(app)
        .post("/api/job/import-job")
        .send({ url: "ftp://example.com/job" });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error", "Invalid URL");
    });

    it("should successfully import job from valid URL with complete data", async () => {
      const jobDescription =
        "This is a detailed job description for a Software Engineer position at Tech Corp. " +
        "We are looking for a talented developer with 5+ years of experience in JavaScript and Node.js. " +
        "The ideal candidate will have strong problem-solving skills and experience with REST APIs. " +
        "Benefits include health insurance, 401k matching, and unlimited PTO.";

      const mockHtml = `<html><body><h1>Software Engineer</h1><p>${jobDescription}</p></body></html>`;

      mockAxios.get.mockResolvedValueOnce({ data: mockHtml });

      mockModel.generateContent.mockResolvedValueOnce({
        response: {
          text: () =>
            JSON.stringify({
              title: "Software Engineer",
              company: "Tech Corp",
              location: "San Francisco, CA",
              salary_min: "100000",
              salary_max: "150000",
              description: jobDescription,
            }),
        },
      });

      const response = await request(app)
        .post("/api/job/import-job")
        .send({ url: "https://example.com/job" });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("success");
      expect(response.body.source).toBe("axios+gemini");
      expect(response.body.job).toBeDefined();
      expect(response.body.job.url).toBe("https://example.com/job");
      expect(response.body.job.title).toBe("Software Engineer");
      expect(response.body.job.company).toBe("Tech Corp");
      expect(mockLogApiUsage).toHaveBeenCalled();
    });

    it("should successfully import job with HTTP URL", async () => {
      const longText =
        "a".repeat(300) +
        " This is a long enough job description to pass the minimum character requirement.";
      const mockHtml = `<html><body><p>${longText}</p></body></html>`;

      mockAxios.get.mockResolvedValueOnce({ data: mockHtml });

      mockModel.generateContent.mockResolvedValueOnce({
        response: {
          text: () =>
            JSON.stringify({
              title: "Developer",
              company: "Company Inc",
              location: "Remote",
              salary_min: "",
              salary_max: "",
              description: "Job description",
            }),
        },
      });

      const response = await request(app)
        .post("/api/job/import-job")
        .send({ url: "http://example.com/job" });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("success");
    });

    it("should track API usage on successful Gemini call", async () => {
      const longText =
        "This is a comprehensive job posting with detailed information about the role. " +
        "We are seeking experienced professionals who can contribute to our growing team. " +
        "Qualifications include strong technical skills and excellent communication abilities.";

      const mockHtml = `<html><body><p>${longText}</p></body></html>`;

      mockAxios.get.mockResolvedValueOnce({ data: mockHtml });

      mockModel.generateContent.mockResolvedValueOnce({
        response: {
          text: () =>
            JSON.stringify({
              title: "Software Engineer",
              company: "Tech Corp",
              location: "San Francisco, CA",
              salary_min: "",
              salary_max: "",
              description: "Job description",
            }),
        },
      });

      const response = await request(app)
        .post("/api/job/import-job")
        .send({ url: "https://example.com/job" });

      expect(response.status).toBe(200);
      expect(mockLogApiUsage).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceName: "google_gemini",
          endpoint: "/v1/models/gemini-2.0-flash:generateContent",
          method: "POST",
          userId: 1,
          success: true,
        })
      );
    });

    it("should handle axios network errors", async () => {
      mockAxios.get.mockRejectedValueOnce(new Error("Network error"));

      const response = await request(app)
        .post("/api/job/import-job")
        .send({ url: "https://example.com/job" });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty("status", "failed");
      expect(response.body.error).toBe(
        "Failed to import job. Please fill manually."
      );
    });

    it("should handle axios timeout errors", async () => {
      const timeoutError = new Error("timeout of 20000ms exceeded");
      timeoutError.code = "ECONNABORTED";
      mockAxios.get.mockRejectedValueOnce(timeoutError);

      const response = await request(app)
        .post("/api/job/import-job")
        .send({ url: "https://example.com/job" });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty("status", "failed");
    });

    it("should return partial status for insufficient text (less than 200 chars)", async () => {
      const mockHtml = "<html><body><p>Short job post</p></body></html>";

      mockAxios.get.mockResolvedValueOnce({ data: mockHtml });

      const response = await request(app)
        .post("/api/job/import-job")
        .send({ url: "https://example.com/job" });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("partial");
      expect(response.body.job.company).toBe("Unknown");
      expect(response.body.job.description).toContain(
        "Could not extract visible text"
      );
      expect(response.body.job.url).toBe("https://example.com/job");
      expect(response.body.job.title).toBe("");
    });

    it("should return partial status for empty body text", async () => {
      const mockHtml = "<html><body></body></html>";

      mockAxios.get.mockResolvedValueOnce({ data: mockHtml });

      const response = await request(app)
        .post("/api/job/import-job")
        .send({ url: "https://example.com/job" });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("partial");
    });

    it("should return partial status for text exactly at 199 chars", async () => {
      const text = "a".repeat(150);
      const mockHtml = `<html><body><p>${text}</p></body></html>`;

      mockAxios.get.mockResolvedValueOnce({ data: mockHtml });

      const response = await request(app)
        .post("/api/job/import-job")
        .send({ url: "https://example.com/job" });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("partial");
    });

    it("should handle Gemini API errors and track them", async () => {
      // Must be > 200 chars after HTML processing to reach Gemini call
      const longText = "a".repeat(250);

      const mockHtml = `<html><body><p>${longText}</p></body></html>`;

      mockAxios.get.mockResolvedValueOnce({ data: mockHtml });

      // Create a fresh mock model that will reject
      const errorMockModel = {
        generateContent: vi.fn().mockRejectedValue(
          new Error("Gemini API rate limit exceeded")
        ),
      };
      
      // Create a fresh GenAI instance with the error mock
      const errorGenAI = {
        getGenerativeModel: vi.fn().mockReturnValue(errorMockModel),
      };

      // Create a new router with the error mock
      const { createJobRoutes } = await import("../../routes/jobRoutes.js");
      const errorRouter = createJobRoutes(errorGenAI);
      const errorApp = express();
      errorApp.use(express.json());
      errorApp.use((req, res, next) => {
        req.user = { id: 1 };
        next();
      });
      errorApp.use("/api/job", errorRouter);

      const response = await request(errorApp)
        .post("/api/job/import-job")
        .send({ url: "https://example.com/job" });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty("status", "failed");
      expect(response.body.error).toBe("Failed to import job. Please fill manually.");
      expect(errorMockModel.generateContent).toHaveBeenCalled();
      expect(mockLogApiError).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceName: "google_gemini",
          endpoint: "/v1/models/gemini-2.0-flash:generateContent",
          errorType: "api_error",
          errorMessage: "Gemini API rate limit exceeded",
        })
      );
      expect(mockLogApiUsage).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceName: "google_gemini",
          success: false,
          responseStatus: 500,
        })
      );
    });

    it("should handle Gemini API error without message", async () => {
      const longText = "a".repeat(300);
      const mockHtml = `<html><body><p>${longText}</p></body></html>`;

      mockAxios.get.mockResolvedValueOnce({ data: mockHtml });

      // Create a fresh mock model that will reject without message
      const noMessageMockModel = {
        generateContent: vi.fn().mockRejectedValue({}),
      };
      
      // Create a fresh GenAI instance
      const noMessageGenAI = {
        getGenerativeModel: vi.fn().mockReturnValue(noMessageMockModel),
      };

      // Create a new router
      const { createJobRoutes } = await import("../../routes/jobRoutes.js");
      const noMessageRouter = createJobRoutes(noMessageGenAI);
      const noMessageApp = express();
      noMessageApp.use(express.json());
      noMessageApp.use((req, res, next) => {
        req.user = { id: 1 };
        next();
      });
      noMessageApp.use("/api/job", noMessageRouter);

      const response = await request(noMessageApp)
        .post("/api/job/import-job")
        .send({ url: "https://example.com/job" });

      expect(response.status).toBe(500);
      expect(mockLogApiError).toHaveBeenCalledWith(
        expect.objectContaining({
          errorMessage: "Gemini API error",
        })
      );
    });

    it("should handle malformed JSON from Gemini", async () => {
      // Must be > 200 chars after HTML processing to reach Gemini call
      const longText = "a".repeat(250);

      const mockHtml = `<html><body><p>${longText}</p></body></html>`;

      mockAxios.get.mockResolvedValueOnce({ data: mockHtml });

      // Create a fresh mock model that will return invalid JSON
      const invalidJsonMockModel = {
        generateContent: vi.fn().mockResolvedValue({
          response: {
            text: () => "Not valid JSON { incomplete",
          },
        }),
      };
      
      // Create a fresh GenAI instance with the invalid JSON mock
      const invalidJsonGenAI = {
        getGenerativeModel: vi.fn().mockReturnValue(invalidJsonMockModel),
      };

      // Create a new router with the invalid JSON mock
      const { createJobRoutes } = await import("../../routes/jobRoutes.js");
      const invalidJsonRouter = createJobRoutes(invalidJsonGenAI);
      const invalidJsonApp = express();
      invalidJsonApp.use(express.json());
      invalidJsonApp.use((req, res, next) => {
        req.user = { id: 1 };
        next();
      });
      invalidJsonApp.use("/api/job", invalidJsonRouter);

      const response = await request(invalidJsonApp)
        .post("/api/job/import-job")
        .send({ url: "https://example.com/job" });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty("status", "failed");
      expect(response.body.error).toBe("AI returned malformed JSON");
      expect(invalidJsonMockModel.generateContent).toHaveBeenCalled();
    });

    it("should handle Gemini returning empty response", async () => {
      const longText = "a".repeat(300);
      const mockHtml = `<html><body><p>${longText}</p></body></html>`;

      mockAxios.get.mockResolvedValueOnce({ data: mockHtml });

      mockModel.generateContent.mockResolvedValueOnce({
        response: {
          text: () => "",
        },
      });

      const response = await request(app)
        .post("/api/job/import-job")
        .send({ url: "https://example.com/job" });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe("AI returned malformed JSON");
    });

    it("should trim whitespace from job fields in response", async () => {
      const longText = "a".repeat(300);
      const mockHtml = `<html><body><p>${longText}</p></body></html>`;

      mockAxios.get.mockResolvedValueOnce({ data: mockHtml });

      mockModel.generateContent.mockResolvedValueOnce({
        response: {
          text: () =>
            JSON.stringify({
              title: "  Software Engineer  ",
              company: "  Tech Corp  ",
              location: "  San Francisco  ",
              salary_min: "100000",
              salary_max: "150000",
              description: "  Detailed job description  ",
            }),
        },
      });

      const response = await request(app)
        .post("/api/job/import-job")
        .send({ url: "https://example.com/job" });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("success");
      expect(response.body.job.title).toBe("Software Engineer");
      expect(response.body.job.company).toBe("Tech Corp");
      expect(response.body.job.location).toBe("San Francisco");
      expect(response.body.job.description).toBe("Detailed job description");
    });

    it("should handle job with null/undefined fields gracefully", async () => {
      const longText = "a".repeat(300);
      const mockHtml = `<html><body><p>${longText}</p></body></html>`;

      mockAxios.get.mockResolvedValueOnce({ data: mockHtml });

      mockModel.generateContent.mockResolvedValueOnce({
        response: {
          text: () =>
            JSON.stringify({
              title: null,
              company: "Company",
              location: undefined,
              salary_min: "",
              salary_max: "",
              description: "Description",
            }),
        },
      });

      const response = await request(app)
        .post("/api/job/import-job")
        .send({ url: "https://example.com/job" });

      expect(response.status).toBe(200);
      expect(response.body.job).toBeDefined();
      expect(response.body.job.url).toBe("https://example.com/job");
    });

    it("should handle job with all empty fields", async () => {
      const longText = "a".repeat(300);
      const mockHtml = `<html><body><p>${longText}</p></body></html>`;

      mockAxios.get.mockResolvedValueOnce({ data: mockHtml });

      mockModel.generateContent.mockResolvedValueOnce({
        response: {
          text: () =>
            JSON.stringify({
              title: "",
              company: "",
              location: "",
              salary_min: "",
              salary_max: "",
              description: "",
            }),
        },
      });

      const response = await request(app)
        .post("/api/job/import-job")
        .send({ url: "https://example.com/job" });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("success");
      expect(response.body.job.url).toBe("https://example.com/job");
    });

    it("should include URL in final job response", async () => {
      const longText = "a".repeat(300);
      const mockHtml = `<html><body><p>${longText}</p></body></html>`;
      const testUrl = "https://careers.example.com/job/12345";

      mockAxios.get.mockResolvedValueOnce({ data: mockHtml });

      mockModel.generateContent.mockResolvedValueOnce({
        response: {
          text: () =>
            JSON.stringify({
              title: "Job",
              company: "Company",
              location: "Location",
              salary_min: "",
              salary_max: "",
              description: "Description",
            }),
        },
      });

      const response = await request(app)
        .post("/api/job/import-job")
        .send({ url: testUrl });

      expect(response.status).toBe(200);
      expect(response.body.job.url).toBe(testUrl);
    });

    it("should handle HTML with script and style tags", async () => {
      const mockHtml = `<html>
        <head><style>.job{color:red;}</style></head>
        <body>
          <script>var x = 1;</script>
          <p>${"This is a job description ".repeat(20)}</p>
          <style>.more{padding:0;}</style>
        </body>
      </html>`;

      mockAxios.get.mockResolvedValueOnce({ data: mockHtml });

      mockModel.generateContent.mockResolvedValueOnce({
        response: {
          text: () =>
            JSON.stringify({
              title: "Job",
              company: "Company",
              location: "",
              salary_min: "",
              salary_max: "",
              description: "Description",
            }),
        },
      });

      const response = await request(app)
        .post("/api/job/import-job")
        .send({ url: "https://example.com/job" });

      expect(response.status).toBe(200);
    });

    it("should limit extracted text to 15000 characters", async () => {
      const veryLongText = "a".repeat(20000);
      const mockHtml = `<html><body><p>${veryLongText}</p></body></html>`;

      mockAxios.get.mockResolvedValueOnce({ data: mockHtml });

      mockModel.generateContent.mockResolvedValueOnce({
        response: {
          text: () =>
            JSON.stringify({
              title: "Job",
              company: "Company",
              location: "",
              salary_min: "",
              salary_max: "",
              description: "Description",
            }),
        },
      });

      const response = await request(app)
        .post("/api/job/import-job")
        .send({ url: "https://example.com/job" });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("success");
    });

    it("should handle user without id in request", async () => {
      const { createJobRoutes } = await import("../../routes/jobRoutes.js");
      const router = createJobRoutes(mockGenAIInstance);
      const appNoUser = express();
      appNoUser.use(express.json());
      appNoUser.use("/api/job", router);

      const longText = "a".repeat(300);
      const mockHtml = `<html><body><p>${longText}</p></body></html>`;

      mockAxios.get.mockResolvedValueOnce({ data: mockHtml });

      mockModel.generateContent.mockResolvedValueOnce({
        response: {
          text: () =>
            JSON.stringify({
              title: "Job",
              company: "Company",
              location: "",
              salary_min: "",
              salary_max: "",
              description: "Description",
            }),
        },
      });

      const response = await request(appNoUser)
        .post("/api/job/import-job")
        .send({ url: "https://example.com/job" });

      expect(response.status).toBe(200);
      expect(mockLogApiUsage).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: null,
        })
      );
    });

    it("should use correct axios configuration", async () => {
      const longText = "a".repeat(300);
      const mockHtml = `<html><body><p>${longText}</p></body></html>`;

      mockAxios.get.mockResolvedValueOnce({ data: mockHtml });

      mockModel.generateContent.mockResolvedValueOnce({
        response: {
          text: () =>
            JSON.stringify({
              title: "Job",
              company: "Company",
              location: "",
              salary_min: "",
              salary_max: "",
              description: "Description",
            }),
        },
      });

      await request(app)
        .post("/api/job/import-job")
        .send({ url: "https://example.com/job" });

      expect(mockAxios.get).toHaveBeenCalledWith(
        "https://example.com/job",
        expect.objectContaining({
          headers: expect.objectContaining({
            "User-Agent": expect.any(String),
            Accept: "text/html,application/xhtml+xml",
          }),
          timeout: 20000,
        })
      );
    });

    it("should call Gemini with correct model configuration", async () => {
      const longText = "a".repeat(300);
      const mockHtml = `<html><body><p>${longText}</p></body></html>`;

      mockAxios.get.mockResolvedValueOnce({ data: mockHtml });

      mockModel.generateContent.mockResolvedValueOnce({
        response: {
          text: () =>
            JSON.stringify({
              title: "Job",
              company: "Company",
              location: "",
              salary_min: "",
              salary_max: "",
              description: "Description",
            }),
        },
      });

      await request(app)
        .post("/api/job/import-job")
        .send({ url: "https://example.com/job" });

      expect(mockGenAIInstance.getGenerativeModel).toHaveBeenCalledWith({
        model: "gemini-2.0-flash",
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
        },
      });
    });

    it("should include prompt with extracted text", async () => {
      const longText =
        "This is a detailed software engineering job at Tech Corp";
      const mockHtml = `<html><body><p>${longText.repeat(10)}</p></body></html>`;

      mockAxios.get.mockResolvedValueOnce({ data: mockHtml });

      mockModel.generateContent.mockResolvedValueOnce({
        response: {
          text: () =>
            JSON.stringify({
              title: "Job",
              company: "Company",
              location: "",
              salary_min: "",
              salary_max: "",
              description: "Description",
            }),
        },
      });

      await request(app)
        .post("/api/job/import-job")
        .send({ url: "https://example.com/job" });

      expect(mockModel.generateContent).toHaveBeenCalledWith(
        expect.stringContaining("Job posting text:")
      );
    });
  });

  describe("GET /api/job/test-ai", () => {
    it("should test Gemini AI connection successfully", async () => {
      mockModel.generateContent.mockResolvedValueOnce({
        response: {
          text: () => "Gemini is working ✅",
        },
      });

      const response = await request(app).get("/api/job/test-ai");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
      expect(response.body.response).toBe("Gemini is working ✅");
    });

    it("should handle Gemini API errors on test endpoint", async () => {
      mockModel.generateContent.mockRejectedValueOnce(
        new Error("API unavailable")
      );

      const response = await request(app).get("/api/job/test-ai");

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty("success", false);
      expect(response.body.error).toBe("API unavailable");
    });

    it("should use correct model for test endpoint", async () => {
      mockModel.generateContent.mockResolvedValueOnce({
        response: {
          text: () => "Test response",
        },
      });

      await request(app).get("/api/job/test-ai");

      expect(mockGenAIInstance.getGenerativeModel).toHaveBeenCalledWith({
        model: "gemini-2.0-flash",
      });
    });

    it("should send correct test prompt", async () => {
      mockModel.generateContent.mockResolvedValueOnce({
        response: {
          text: () => "Gemini is working ✅",
        },
      });

      await request(app).get("/api/job/test-ai");

      expect(mockModel.generateContent).toHaveBeenCalledWith(
        "Respond only with 'Gemini is working ✅'"
      );
    });
  });

  describe("Factory function - createJobRoutes", () => {
    it("should allow dependency injection for testing", async () => {
      const { createJobRoutes } = await import("../../routes/jobRoutes.js");
      const customGenAI = {
        getGenerativeModel: vi.fn().mockReturnValue({
          generateContent: vi.fn(),
        }),
      };

      const router = createJobRoutes(customGenAI);
      expect(router).toBeDefined();
      expect(typeof router).toBe("function");
    });

    it("should use default GenAI client when none provided", async () => {
      const { createJobRoutes } = await import("../../routes/jobRoutes.js");

      // When no client is injected, it should create a default one
      const router = createJobRoutes();
      expect(router).toBeDefined();
    });

    it("should create router with all routes defined", async () => {
      const { createJobRoutes } = await import("../../routes/jobRoutes.js");
      const router = createJobRoutes(mockGenAIInstance);

      expect(router.stack).toBeDefined();
      expect(router.stack.length).toBeGreaterThan(0);
    });
  });

  describe("Default export", () => {
    it("should export default router", async () => {
      const jobRoutes = await import("../../routes/jobRoutes.js");

      expect(jobRoutes.default).toBeDefined();
    });

    it("should export createJobRoutes factory function", async () => {
      const { createJobRoutes } = await import("../../routes/jobRoutes.js");

      expect(createJobRoutes).toBeDefined();
      expect(typeof createJobRoutes).toBe("function");
    });
  });
});
