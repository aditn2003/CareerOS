/**
 * API Error Messages Utility Tests
 * Tests for user-friendly error message functions
 */
import { describe, it, expect } from "vitest";
import {
  getUserFriendlyErrorMessage,
  isRateLimitError,
  isServiceUnavailableError,
  getErrorAdvice,
} from "../apiErrorMessages";

describe("API Error Messages Utils", () => {
  describe("getUserFriendlyErrorMessage", () => {
    describe("rate limit errors (429)", () => {
      it("returns rate limit message for 429 status", () => {
        const error = { response: { status: 429, data: {} } };
        const message = getUserFriendlyErrorMessage(error);
        expect(message).toContain("rate limit reached");
        expect(message).toContain("⚠️");
      });

      it("includes service name when provided", () => {
        const error = { response: { status: 429, data: {} } };
        const message = getUserFriendlyErrorMessage(error, "OpenAI");
        expect(message).toContain("OpenAI");
        expect(message).toContain("rate limit");
      });

      it("detects service from error message", () => {
        const error = {
          response: {
            status: 429,
            data: { error: "OpenAI rate limit exceeded" },
          },
        };
        const message = getUserFriendlyErrorMessage(error);
        expect(message).toContain("OpenAI");
      });
    });

    describe("quota exceeded errors (403)", () => {
      it("returns quota message for 403 with quota in message", () => {
        const error = {
          response: {
            status: 403,
            data: { message: "API quota exceeded" },
          },
        };
        const message = getUserFriendlyErrorMessage(error);
        expect(message).toContain("quota exceeded");
        expect(message).toContain("⚠️");
      });

      it("returns quota message for 403 with limit in message", () => {
        const error = {
          response: {
            status: 403,
            data: { error: "Rate limit exceeded" },
          },
        };
        const message = getUserFriendlyErrorMessage(error);
        expect(message).toContain("quota exceeded");
      });
    });

    describe("authentication errors (401)", () => {
      it("returns auth message for 401 status", () => {
        const error = { response: { status: 401, data: {} } };
        const message = getUserFriendlyErrorMessage(error);
        expect(message).toContain("Authentication failed");
        expect(message).toContain("🔐");
      });
    });

    describe("service unavailable errors (503)", () => {
      it("returns unavailable message for 503 status", () => {
        const error = { response: { status: 503, data: {} } };
        const message = getUserFriendlyErrorMessage(error);
        expect(message).toContain("temporarily unavailable");
        expect(message).toContain("🔧");
      });

      it("includes service name for 503 errors", () => {
        const error = {
          response: {
            status: 503,
            data: { message: "GitHub API unavailable" },
          },
        };
        const message = getUserFriendlyErrorMessage(error);
        expect(message).toContain("GitHub");
      });
    });

    describe("timeout errors", () => {
      it("returns timeout message for ETIMEDOUT code", () => {
        const error = { code: "ETIMEDOUT" };
        const message = getUserFriendlyErrorMessage(error);
        expect(message).toContain("timed out");
        expect(message).toContain("⏱️");
      });

      it("returns timeout message for ECONNABORTED code", () => {
        const error = { code: "ECONNABORTED" };
        const message = getUserFriendlyErrorMessage(error);
        expect(message).toContain("timed out");
      });

      it("returns timeout message when timeout in error message", () => {
        const error = { message: "Request timeout after 30s" };
        const message = getUserFriendlyErrorMessage(error);
        expect(message).toContain("timed out");
      });
    });

    describe("network errors", () => {
      it("returns network error for ECONNREFUSED", () => {
        const error = { code: "ECONNREFUSED" };
        const message = getUserFriendlyErrorMessage(error);
        expect(message).toContain("Network error");
        expect(message).toContain("🌐");
      });

      it("returns network error for ENOTFOUND", () => {
        const error = { code: "ENOTFOUND" };
        const message = getUserFriendlyErrorMessage(error);
        expect(message).toContain("Network error");
      });

      it("returns network error for ERR_NETWORK", () => {
        const error = { code: "ERR_NETWORK" };
        const message = getUserFriendlyErrorMessage(error);
        expect(message).toContain("Network error");
      });
    });

    describe("fallback messages", () => {
      it("returns fallback message when fallback in error text", () => {
        const error = { message: "Using fallback data" };
        const message = getUserFriendlyErrorMessage(error);
        expect(message).toContain("fallback data");
        expect(message).toContain("ℹ️");
      });

      it("returns fallback message when fallback_used is true", () => {
        const error = {
          response: {
            status: 200,
            data: { fallback_used: true },
          },
        };
        const message = getUserFriendlyErrorMessage(error);
        expect(message).toContain("fallback data");
      });
    });

    describe("rate limit in message text", () => {
      it("detects rate limit from message text", () => {
        const error = { message: "Too many requests, please slow down" };
        const message = getUserFriendlyErrorMessage(error);
        expect(message).toContain("rate limit");
      });
    });

    describe("generic errors", () => {
      it("returns service-specific error with service name", () => {
        const error = { message: "Something went wrong" };
        const message = getUserFriendlyErrorMessage(error, "Custom API");
        expect(message).toContain("Custom API");
        expect(message).toContain("❌");
      });

      it("returns default error for unknown errors", () => {
        const error = {};
        const message = getUserFriendlyErrorMessage(error);
        expect(message).toBe("An error occurred. Please try again.");
      });

      it("returns error message when available", () => {
        const error = { message: "Specific error details" };
        const message = getUserFriendlyErrorMessage(error);
        expect(message).toBe("Specific error details");
      });
    });

    describe("service detection", () => {
      it("detects Google Gemini from message", () => {
        const error = {
          response: {
            status: 429,
            data: { message: "Gemini API limit" },
          },
        };
        const message = getUserFriendlyErrorMessage(error);
        expect(message).toContain("Google Gemini");
      });

      it("detects SERP API from message", () => {
        const error = {
          response: {
            status: 429,
            data: { message: "SerpAPI rate limited" },
          },
        };
        const message = getUserFriendlyErrorMessage(error);
        expect(message).toContain("SERP");
      });

      it("detects LinkedIn from message", () => {
        const error = {
          response: {
            status: 429,
            data: { message: "LinkedIn API error" },
          },
        };
        const message = getUserFriendlyErrorMessage(error);
        expect(message).toContain("LinkedIn");
      });

      it("detects Resend from message", () => {
        const error = {
          response: {
            status: 429,
            data: { message: "Resend email limit" },
          },
        };
        const message = getUserFriendlyErrorMessage(error);
        expect(message).toContain("Resend");
      });
    });
  });

  describe("isRateLimitError", () => {
    it("returns true for 429 status", () => {
      const error = { response: { status: 429 } };
      expect(isRateLimitError(error)).toBe(true);
    });

    it("returns true for 403 with quota message", () => {
      const error = {
        response: {
          status: 403,
          data: { message: "quota exceeded" },
        },
      };
      expect(isRateLimitError(error)).toBe(true);
    });

    it("returns true for 403 with limit message", () => {
      const error = {
        response: {
          status: 403,
          data: { error: "limit reached" },
        },
      };
      expect(isRateLimitError(error)).toBe(true);
    });

    it("returns true when rate limit in message", () => {
      const error = { message: "rate limit exceeded" };
      expect(isRateLimitError(error)).toBe(true);
    });

    it("returns true for too many requests message", () => {
      const error = { message: "too many requests" };
      expect(isRateLimitError(error)).toBe(true);
    });

    it("returns false for regular errors", () => {
      const error = { response: { status: 500 } };
      expect(isRateLimitError(error)).toBe(false);
    });

    it("returns false for empty error", () => {
      expect(isRateLimitError({})).toBe(false);
    });

    it("handles statusCode property", () => {
      const error = { statusCode: 429 };
      expect(isRateLimitError(error)).toBe(true);
    });
  });

  describe("isServiceUnavailableError", () => {
    it("returns true for 503 status", () => {
      const error = { response: { status: 503 } };
      expect(isServiceUnavailableError(error)).toBe(true);
    });

    it("returns true for 502 status", () => {
      const error = { response: { status: 502 } };
      expect(isServiceUnavailableError(error)).toBe(true);
    });

    it("returns true for 504 status", () => {
      const error = { response: { status: 504 } };
      expect(isServiceUnavailableError(error)).toBe(true);
    });

    it("returns false for 500 status", () => {
      const error = { response: { status: 500 } };
      expect(isServiceUnavailableError(error)).toBe(false);
    });

    it("handles statusCode property", () => {
      const error = { statusCode: 503 };
      expect(isServiceUnavailableError(error)).toBe(true);
    });

    it("handles direct status property", () => {
      const error = { status: 502 };
      expect(isServiceUnavailableError(error)).toBe(true);
    });
  });

  describe("getErrorAdvice", () => {
    describe("with error objects", () => {
      it("returns advice for rate limit errors", () => {
        const error = { response: { status: 429 } };
        const advice = getErrorAdvice(error);
        expect(advice).toContain("Rate limits reset");
        expect(advice).toContain("💡");
      });

      it("returns advice for service unavailable errors", () => {
        const error = { response: { status: 503 } };
        const advice = getErrorAdvice(error);
        expect(advice).toContain("back online shortly");
        expect(advice).toContain("💡");
      });

      it("returns null for regular errors", () => {
        const error = { response: { status: 500 } };
        const advice = getErrorAdvice(error);
        expect(advice).toBeNull();
      });
    });

    describe("with string messages", () => {
      it("returns advice for rate limit message", () => {
        const message = "⚠️ API rate limit reached";
        const advice = getErrorAdvice(message);
        expect(advice).toContain("Rate limits reset");
      });

      it("returns advice for quota exceeded message", () => {
        const message = "⚠️ quota exceeded for this month";
        const advice = getErrorAdvice(message);
        expect(advice).toContain("Rate limits reset");
      });

      it("returns advice for unavailable message", () => {
        const message = "🔧 API is temporarily unavailable";
        const advice = getErrorAdvice(message);
        expect(advice).toContain("back online shortly");
      });

      it("returns advice for fallback message", () => {
        const message = "ℹ️ Using fallback data";
        const advice = getErrorAdvice(message);
        expect(advice).toContain("back online shortly");
      });

      it("returns null for regular message", () => {
        const message = "Some other error occurred";
        const advice = getErrorAdvice(message);
        expect(advice).toBeNull();
      });
    });
  });
});
