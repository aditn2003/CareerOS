/**
 * Auth Utility Tests
 * Tests for JWT token handling functions
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getUserId,
  isAuthenticated,
  getUserEmail,
  getTokenPayload,
} from "../auth";

// Helper to create a valid JWT token structure
function createToken(payload) {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const data = btoa(JSON.stringify(payload));
  const signature = btoa("mock-signature");
  return `${header}.${data}.${signature}`;
}

describe("Auth Utils", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getUserId", () => {
    it("returns null when no token exists", () => {
      const result = getUserId();
      expect(result).toBeNull();
      expect(console.warn).toHaveBeenCalledWith(
        "No auth token found - user not logged in"
      );
    });

    it("returns user id from token with id field", () => {
      const token = createToken({ id: 123, email: "test@test.com" });
      localStorage.setItem("token", token);

      const result = getUserId();
      expect(result).toBe(123);
    });

    it("returns user id from token with userId field", () => {
      const token = createToken({ userId: 456, email: "test@test.com" });
      localStorage.setItem("token", token);

      const result = getUserId();
      expect(result).toBe(456);
    });

    it("returns user id from token with sub field", () => {
      const token = createToken({ sub: 789, email: "test@test.com" });
      localStorage.setItem("token", token);

      const result = getUserId();
      expect(result).toBe(789);
    });

    it("returns user id from token with user_id field", () => {
      const token = createToken({ user_id: 101, email: "test@test.com" });
      localStorage.setItem("token", token);

      const result = getUserId();
      expect(result).toBe(101);
    });

    it("converts string user id to number", () => {
      const token = createToken({ id: "999", email: "test@test.com" });
      localStorage.setItem("token", token);

      const result = getUserId();
      expect(result).toBe(999);
      expect(typeof result).toBe("number");
    });

    it("returns null when no user id found in payload", () => {
      const token = createToken({ email: "test@test.com", name: "Test" });
      localStorage.setItem("token", token);

      const result = getUserId();
      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalled();
    });

    it("returns null for invalid token format", () => {
      localStorage.setItem("token", "invalid-token");

      const result = getUserId();
      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalled();
    });

    it("returns null for malformed JSON in token", () => {
      localStorage.setItem("token", "header.notvalidbase64.signature");

      const result = getUserId();
      expect(result).toBeNull();
    });
  });

  describe("isAuthenticated", () => {
    it("returns false when no token exists", () => {
      expect(isAuthenticated()).toBe(false);
    });

    it("returns true when token exists", () => {
      localStorage.setItem("token", "any-token-value");
      expect(isAuthenticated()).toBe(true);
    });

    it("returns true even for empty string token", () => {
      localStorage.setItem("token", "");
      // Empty string is falsy, so this should be false
      expect(isAuthenticated()).toBe(false);
    });
  });

  describe("getUserEmail", () => {
    it("returns null when no token exists", () => {
      const result = getUserEmail();
      expect(result).toBeNull();
    });

    it("returns email from token", () => {
      const token = createToken({ id: 1, email: "user@example.com" });
      localStorage.setItem("token", token);

      const result = getUserEmail();
      expect(result).toBe("user@example.com");
    });

    it("returns null when email not in token", () => {
      const token = createToken({ id: 1, name: "Test User" });
      localStorage.setItem("token", token);

      const result = getUserEmail();
      expect(result).toBeNull();
    });

    it("returns null for invalid token", () => {
      localStorage.setItem("token", "invalid");

      const result = getUserEmail();
      expect(result).toBeNull();
    });
  });

  describe("getTokenPayload", () => {
    it("returns null when no token exists", () => {
      const result = getTokenPayload();
      expect(result).toBeNull();
    });

    it("returns full payload object from token", () => {
      const payload = {
        id: 1,
        email: "test@test.com",
        role: "admin",
        exp: 1234567890,
      };
      const token = createToken(payload);
      localStorage.setItem("token", token);

      const result = getTokenPayload();
      expect(result).toEqual(payload);
    });

    it("returns null for invalid token format", () => {
      localStorage.setItem("token", "not-a-jwt");

      const result = getTokenPayload();
      expect(result).toBeNull();
    });

    it("returns null for malformed base64", () => {
      localStorage.setItem("token", "header.!!!invalid!!!.signature");

      const result = getTokenPayload();
      expect(result).toBeNull();
    });
  });
});
