/**
 * Authentication Middleware Tests
 * Tests auth.js
 * Target: 90%+ coverage
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";
import { auth, authMiddleware } from "../../auth.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

describe("Authentication Middleware", () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  describe("auth middleware", () => {
    it("should allow requests with valid token", async () => {
      const token = jwt.sign(
        { sub: 1, email: "test@example.com" },
        JWT_SECRET,
        { algorithm: "HS256" }
      );

      app.use(auth);
      app.get("/test", (req, res) => {
        res.json({ user: req.user });
      });

      const response = await request(app)
        .get("/test")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.user).toEqual({
        id: 1,
        email: "test@example.com",
      });
    });

    it("should return 401 when no token provided", async () => {
      app.use(auth);
      app.get("/test", (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app).get("/test");

      expect(response.status).toBe(401);
      expect(response.body.error).toBe("NO_TOKEN");
    });

    it("should return 401 when Authorization header is missing", async () => {
      app.use(auth);
      app.get("/test", (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app).get("/test");

      expect(response.status).toBe(401);
      expect(response.body.error).toBe("NO_TOKEN");
    });

    it("should return 401 when token doesn't start with Bearer", async () => {
      app.use(auth);
      app.get("/test", (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .get("/test")
        .set("Authorization", "InvalidFormat token123");

      expect(response.status).toBe(401);
      expect(response.body.error).toBe("NO_TOKEN");
    });

    it("should return 401 when token has invalid format (not 3 parts)", async () => {
      app.use(auth);
      app.get("/test", (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .get("/test")
        .set("Authorization", "Bearer invalid.token");

      expect(response.status).toBe(401);
      expect(response.body.error).toBe("INVALID_TOKEN_FORMAT");
    });

    it("should return 401 when token has invalid format (too many parts)", async () => {
      app.use(auth);
      app.get("/test", (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .get("/test")
        .set("Authorization", "Bearer part1.part2.part3.part4");

      expect(response.status).toBe(401);
      expect(response.body.error).toBe("INVALID_TOKEN_FORMAT");
    });

    it("should handle token with 'id' claim (legacy support)", async () => {
      const token = jwt.sign(
        { id: 2, email: "legacy@example.com" },
        JWT_SECRET,
        { algorithm: "HS256" }
      );

      app.use(auth);
      app.get("/test", (req, res) => {
        res.json({ user: req.user });
      });

      const response = await request(app)
        .get("/test")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.user).toEqual({
        id: 2,
        email: "legacy@example.com",
      });
    });

    it("should prioritize 'sub' claim over 'id' claim", async () => {
      const token = jwt.sign(
        { sub: 3, id: 999, email: "both@example.com" },
        JWT_SECRET,
        { algorithm: "HS256" }
      );

      app.use(auth);
      app.get("/test", (req, res) => {
        res.json({ user: req.user });
      });

      const response = await request(app)
        .get("/test")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.user.id).toBe(3); // Should use 'sub', not 'id'
    });

    it("should return 401 for expired token (TokenExpiredError)", async () => {
      // Create an expired token
      const token = jwt.sign(
        { sub: 1, email: "test@example.com" },
        JWT_SECRET,
        { algorithm: "HS256", expiresIn: "-1h" } // Expired 1 hour ago
      );

      app.use(auth);
      app.get("/test", (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .get("/test")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe("TOKEN_EXPIRED");
    });

    it("should return 401 for invalid token (JsonWebTokenError)", async () => {
      app.use(auth);
      app.get("/test", (req, res) => {
        res.json({ success: true });
      });

      // Invalid token - wrong secret
      const invalidToken = jwt.sign(
        { sub: 1, email: "test@example.com" },
        "wrong_secret",
        { algorithm: "HS256" }
      );

      const response = await request(app)
        .get("/test")
        .set("Authorization", `Bearer ${invalidToken}`);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe("INVALID_TOKEN");
    });

    it("should return 401 for malformed token (JsonWebTokenError)", async () => {
      app.use(auth);
      app.get("/test", (req, res) => {
        res.json({ success: true });
      });

      // Malformed token - valid format but invalid content
      const malformedToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature";

      const response = await request(app)
        .get("/test")
        .set("Authorization", `Bearer ${malformedToken}`);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe("INVALID_TOKEN");
    });

    it("should return 401 for token not yet active (NotBeforeError)", async () => {
      // Create a token that's not active yet (nbf claim)
      const futureDate = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const token = jwt.sign(
        { sub: 1, email: "test@example.com", nbf: futureDate },
        JWT_SECRET,
        { algorithm: "HS256" }
      );

      app.use(auth);
      app.get("/test", (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .get("/test")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe("TOKEN_NOT_ACTIVE");
    });

    it("should return 401 for other token errors (generic catch)", async () => {
      // Mock jwt.verify to throw a generic error
      const originalVerify = jwt.verify;
      jwt.verify = vi.fn(() => {
        throw new Error("Some other error");
      });

      app.use(auth);
      app.get("/test", (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .get("/test")
        .set("Authorization", "Bearer valid.format.token");

      expect(response.status).toBe(401);
      expect(response.body.error).toBe("INVALID_TOKEN");

      // Restore original function
      jwt.verify = originalVerify;
    });

    it("should use relaxed verification options in test mode", async () => {
      // In test mode, issuer and audience checks are skipped
      const token = jwt.sign(
        { sub: 1, email: "test@example.com" },
        JWT_SECRET,
        { algorithm: "HS256" }
      );

      app.use(auth);
      app.get("/test", (req, res) => {
        res.json({ user: req.user });
      });

      const response = await request(app)
        .get("/test")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.user).toBeDefined();
    });

    it("should export authMiddleware as alias", () => {
      expect(authMiddleware).toBe(auth);
    });
  });
});

