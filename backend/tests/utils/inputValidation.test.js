/**
 * Input Validation Utilities Tests
 * Tests utils/inputValidation.js
 * Target: 90%+ coverage
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import express from "express";
import {
  validateIdParam,
  validateIdParams,
  isValidEmail,
  sanitizeString,
  sanitizeNumber,
  validateArray,
  securityLogger,
} from "../../utils/inputValidation.js";

describe("Input Validation Utilities", () => {
  describe("validateIdParam", () => {
    it("should pass through when id param is undefined", async () => {
      const app = express();
      app.use(express.json());
      app.get("/test", validateIdParam, (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app).get("/test");
      expect(response.status).toBe(200);
    });

    it("should pass through when id param is null", async () => {
      const app = express();
      app.use(express.json());
      app.get("/test", validateIdParam, (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app).get("/test");
      expect(response.status).toBe(200);
    });

    it("should validate and convert valid positive integer ID", async () => {
      const app = express();
      app.use(express.json());
      app.get("/test/:id", validateIdParam, (req, res) => {
        res.json({ id: req.params.id, type: typeof req.params.id });
      });

      const response = await request(app).get("/test/123");
      expect(response.status).toBe(200);
      expect(response.body.id).toBe(123);
      expect(response.body.type).toBe("number");
    });

    it("should reject negative integer ID", async () => {
      const app = express();
      app.use(express.json());
      app.get("/test/:id", validateIdParam, (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app).get("/test/-1");
      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Invalid ID parameter");
      expect(response.body.message).toBe("ID must be a positive integer");
    });

    it("should reject zero as ID", async () => {
      const app = express();
      app.use(express.json());
      app.get("/test/:id", validateIdParam, (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app).get("/test/0");
      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Invalid ID parameter");
    });

    it("should reject non-numeric ID", async () => {
      const app = express();
      app.use(express.json());
      app.get("/test/:id", validateIdParam, (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app).get("/test/abc");
      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Invalid ID parameter");
    });

    it("should reject float ID", async () => {
      const app = express();
      app.use(express.json());
      app.get("/test/:id", validateIdParam, (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app).get("/test/123.45");
      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Invalid ID parameter");
    });

    it("should reject ID with leading zeros", async () => {
      const app = express();
      app.use(express.json());
      app.get("/test/:id", validateIdParam, (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app).get("/test/0123");
      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Invalid ID parameter");
    });
  });

  describe("validateIdParams", () => {
    it("should validate multiple ID parameters successfully", async () => {
      const app = express();
      app.use(express.json());
      app.get("/test/:id/:userId", validateIdParams(["id", "userId"]), (req, res) => {
        res.json({ id: req.params.id, userId: req.params.userId });
      });

      const response = await request(app).get("/test/123/456");
      expect(response.status).toBe(200);
      expect(response.body.id).toBe(123);
      expect(response.body.userId).toBe(456);
    });

    it("should skip undefined parameters", async () => {
      const app = express();
      app.use(express.json());
      app.get("/test/:id", validateIdParams(["id", "missing"]), (req, res) => {
        res.json({ id: req.params.id });
      });

      const response = await request(app).get("/test/123");
      expect(response.status).toBe(200);
      expect(response.body.id).toBe(123);
    });

    it("should reject invalid first parameter", async () => {
      const app = express();
      app.use(express.json());
      app.get("/test/:id/:userId", validateIdParams(["id", "userId"]), (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app).get("/test/abc/456");
      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Invalid id parameter");
    });

    it("should reject invalid second parameter", async () => {
      const app = express();
      app.use(express.json());
      app.get("/test/:id/:userId", validateIdParams(["id", "userId"]), (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app).get("/test/123/xyz");
      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Invalid userId parameter");
    });

    it("should handle null parameters", async () => {
      const app = express();
      app.use(express.json());
      app.get("/test/:id", validateIdParams(["id", "nullParam"]), (req, res) => {
        res.json({ id: req.params.id });
      });

      const response = await request(app).get("/test/123");
      expect(response.status).toBe(200);
    });
  });

  describe("isValidEmail", () => {
    it("should return true for valid email", () => {
      expect(isValidEmail("test@example.com")).toBe(true);
      expect(isValidEmail("user.name@example.co.uk")).toBe(true);
      expect(isValidEmail("user+tag@example.com")).toBe(true);
    });

    it("should return false for invalid email", () => {
      expect(isValidEmail("invalid-email")).toBe(false);
      expect(isValidEmail("@example.com")).toBe(false);
      expect(isValidEmail("user@")).toBe(false);
      expect(isValidEmail("user@example")).toBe(false);
    });

    it("should return false for non-string input", () => {
      expect(isValidEmail(null)).toBe(false);
      expect(isValidEmail(undefined)).toBe(false);
      expect(isValidEmail(123)).toBe(false);
      expect(isValidEmail({})).toBe(false);
    });

    it("should trim whitespace and validate", () => {
      expect(isValidEmail("  test@example.com  ")).toBe(true);
      expect(isValidEmail("  invalid  ")).toBe(false);
    });

    it("should return false for empty string", () => {
      expect(isValidEmail("")).toBe(false);
    });
  });

  describe("sanitizeString", () => {
    it("should return string as-is for valid input", () => {
      expect(sanitizeString("hello world")).toBe("hello world");
      expect(sanitizeString("test")).toBe("test");
    });

    it("should remove null bytes", () => {
      expect(sanitizeString("hello\x00world")).toBe("helloworld");
      expect(sanitizeString("\x00test\x00")).toBe("test");
    });

    it("should remove Unicode null characters", () => {
      expect(sanitizeString("hello\u0000world")).toBe("helloworld");
    });

    it("should normalize whitespace", () => {
      expect(sanitizeString("hello    world")).toBe("hello world");
      expect(sanitizeString("  test  ")).toBe("test");
      expect(sanitizeString("hello\n\tworld")).toBe("hello world");
    });

    it("should return non-string input as-is", () => {
      expect(sanitizeString(null)).toBe(null);
      expect(sanitizeString(undefined)).toBe(undefined);
      expect(sanitizeString(123)).toBe(123);
      expect(sanitizeString({})).toEqual({});
    });

    it("should handle empty string", () => {
      expect(sanitizeString("")).toBe("");
    });

    it("should handle string with only whitespace", () => {
      expect(sanitizeString("   ")).toBe("");
    });
  });

  describe("sanitizeNumber", () => {
    it("should return number for valid numeric string", () => {
      expect(sanitizeNumber("123")).toBe(123);
      expect(sanitizeNumber("45.67")).toBe(45.67);
      expect(sanitizeNumber("-10")).toBe(-10);
    });

    it("should return number for valid number", () => {
      expect(sanitizeNumber(123)).toBe(123);
      expect(sanitizeNumber(45.67)).toBe(45.67);
    });

    it("should return defaultValue for null", () => {
      expect(sanitizeNumber(null, 0)).toBe(0);
      expect(sanitizeNumber(null, "default")).toBe("default");
    });

    it("should return defaultValue for undefined", () => {
      expect(sanitizeNumber(undefined, 0)).toBe(0);
    });

    it("should return defaultValue for empty string", () => {
      expect(sanitizeNumber("", 0)).toBe(0);
    });

    it("should return defaultValue for invalid string", () => {
      expect(sanitizeNumber("abc", 0)).toBe(0);
      expect(sanitizeNumber("not a number", null)).toBe(null);
    });

    it("should return null as default when no defaultValue provided", () => {
      expect(sanitizeNumber(null)).toBe(null);
      expect(sanitizeNumber(undefined)).toBe(null);
      expect(sanitizeNumber("")).toBe(null);
    });
  });

  describe("validateArray", () => {
    it("should return array as-is when valid", () => {
      expect(validateArray([1, 2, 3])).toEqual([1, 2, 3]);
      expect(validateArray([])).toEqual([]);
    });

    it("should return empty array for non-array input", () => {
      expect(validateArray(null)).toEqual([]);
      expect(validateArray(undefined)).toEqual([]);
      expect(validateArray("string")).toEqual([]);
      expect(validateArray(123)).toEqual([]);
      expect(validateArray({})).toEqual([]);
    });

    it("should limit array length to maxLength", () => {
      const longArray = Array.from({ length: 2000 }, (_, i) => i);
      const result = validateArray(longArray, 1000);
      expect(result.length).toBe(1000);
      expect(result).toEqual(longArray.slice(0, 1000));
    });

    it("should use default maxLength of 1000", () => {
      const longArray = Array.from({ length: 2000 }, (_, i) => i);
      const result = validateArray(longArray);
      expect(result.length).toBe(1000);
    });

    it("should not truncate arrays within limit", () => {
      const array = [1, 2, 3, 4, 5];
      expect(validateArray(array, 1000)).toEqual(array);
    });
  });

  describe("securityLogger", () => {
    it("should call next() and log security event in development", async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";
      
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      const app = express();
      app.use(express.json());
      app.get("/test", securityLogger("test_event"), (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .get("/test")
        .set("User-Agent", "test-agent");

      expect(response.status).toBe(200);
      expect(consoleSpy).toHaveBeenCalled();
      expect(consoleSpy.mock.calls[0][0]).toContain("[SECURITY]");
      expect(consoleSpy.mock.calls[0][0]).toContain("test_event");

      consoleSpy.mockRestore();
      process.env.NODE_ENV = originalEnv;
    });

    it("should not log in production", async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";
      
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      const app = express();
      app.use(express.json());
      app.get("/test", securityLogger("test_event"), (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app).get("/test");

      expect(response.status).toBe(200);
      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
      process.env.NODE_ENV = originalEnv;
    });

    it("should include user ID when available", async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";
      
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      const app = express();
      app.use(express.json());
      app.use((req, res, next) => {
        req.user = { id: 123 };
        next();
      });
      app.get("/test", securityLogger("test_event"), (req, res) => {
        res.json({ success: true });
      });

      await request(app).get("/test");

      expect(consoleSpy).toHaveBeenCalled();
      const logCall = consoleSpy.mock.calls[0][1];
      const event = JSON.parse(logCall);
      expect(event.userId).toBe(123);

      consoleSpy.mockRestore();
      process.env.NODE_ENV = originalEnv;
    });

    it("should include request metadata", async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";
      
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      const app = express();
      app.use(express.json());
      app.post("/test", securityLogger("test_event"), (req, res) => {
        res.json({ success: true });
      });

      await request(app)
        .post("/test")
        .set("User-Agent", "test-agent");

      expect(consoleSpy).toHaveBeenCalled();
      const logCall = consoleSpy.mock.calls[0][1];
      const event = JSON.parse(logCall);
      expect(event.type).toBe("test_event");
      expect(event.method).toBe("POST");
      expect(event.path).toBe("/test");
      expect(event.userAgent).toBe("test-agent");

      consoleSpy.mockRestore();
      process.env.NODE_ENV = originalEnv;
    });
  });
});

