/**
 * Sentry Utils Tests
 * Tests utils/sentry.js
 * Target: 90%+ coverage
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

// Mock Sentry before importing
vi.mock("@sentry/node", () => ({
  init: vi.fn(),
  withScope: vi.fn((callback) => {
    const scope = {
      setContext: vi.fn(),
    };
    callback(scope);
  }),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  setUser: vi.fn(),
}));

import * as Sentry from "@sentry/node";
import {
  initSentry,
  captureException,
  captureMessage,
  setUserContext,
  clearUserContext,
} from "../../utils/sentry.js";

describe("Sentry Utils", () => {
  const originalEnv = process.env.NODE_ENV;
  const originalDsn = process.env.SENTRY_DSN;
  const originalVersion = process.env.APP_VERSION;

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock console methods
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    process.env.SENTRY_DSN = originalDsn;
    process.env.APP_VERSION = originalVersion;
    vi.restoreAllMocks();
  });

  describe("initSentry", () => {
    it("should initialize Sentry when DSN is provided", () => {
      process.env.SENTRY_DSN = "https://test@sentry.io/123";
      process.env.NODE_ENV = "production";
      process.env.APP_VERSION = "1.2.3";

      initSentry();

      expect(Sentry.init).toHaveBeenCalledWith({
        dsn: "https://test@sentry.io/123",
        environment: "production",
        integrations: [],
        tracesSampleRate: 0.1,
        release: "1.2.3",
        beforeSend: expect.any(Function),
      });
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("Sentry initialized")
      );
    });

    it("should use development tracesSampleRate in non-production", () => {
      process.env.SENTRY_DSN = "https://test@sentry.io/123";
      process.env.NODE_ENV = "development";

      initSentry();

      expect(Sentry.init).toHaveBeenCalledWith(
        expect.objectContaining({
          tracesSampleRate: 1.0,
        })
      );
    });

    it("should use default release when APP_VERSION not set", () => {
      process.env.SENTRY_DSN = "https://test@sentry.io/123";
      delete process.env.APP_VERSION;

      initSentry();

      expect(Sentry.init).toHaveBeenCalledWith(
        expect.objectContaining({
          release: "1.0.0",
        })
      );
    });

    it("should use default environment when NODE_ENV not set", () => {
      process.env.SENTRY_DSN = "https://test@sentry.io/123";
      delete process.env.NODE_ENV;

      initSentry();

      expect(Sentry.init).toHaveBeenCalledWith(
        expect.objectContaining({
          environment: "development",
        })
      );
    });

    it("should warn and not initialize when DSN is missing", () => {
      delete process.env.SENTRY_DSN;

      initSentry();

      expect(Sentry.init).not.toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining("SENTRY_DSN not configured")
      );
    });

    it("should filter out health check endpoints", () => {
      process.env.SENTRY_DSN = "https://test@sentry.io/123";
      
      initSentry();

      const initCall = Sentry.init.mock.calls[0][0];
      const beforeSend = initCall.beforeSend;

      const healthEvent = {
        request: { url: "http://localhost/api/monitoring/health" },
      };
      const result = beforeSend(healthEvent, {});
      expect(result).toBe(null);
    });

    it("should filter out metrics endpoints", () => {
      process.env.SENTRY_DSN = "https://test@sentry.io/123";
      
      initSentry();

      const initCall = Sentry.init.mock.calls[0][0];
      const beforeSend = initCall.beforeSend;

      const metricsEvent = {
        request: { url: "http://localhost/api/monitoring/metrics" },
      };
      const result = beforeSend(metricsEvent, {});
      expect(result).toBe(null);
    });

    it("should allow other events through", () => {
      process.env.SENTRY_DSN = "https://test@sentry.io/123";
      
      initSentry();

      const initCall = Sentry.init.mock.calls[0][0];
      const beforeSend = initCall.beforeSend;

      const normalEvent = {
        request: { url: "http://localhost/api/users" },
      };
      const result = beforeSend(normalEvent, {});
      expect(result).toBe(normalEvent);
    });

    it("should handle events without request URL", () => {
      process.env.SENTRY_DSN = "https://test@sentry.io/123";
      
      initSentry();

      const initCall = Sentry.init.mock.calls[0][0];
      const beforeSend = initCall.beforeSend;

      const eventWithoutUrl = {
        message: "Test error",
      };
      const result = beforeSend(eventWithoutUrl, {});
      expect(result).toBe(eventWithoutUrl);
    });
  });

  describe("captureException", () => {
    it("should capture exception with context", () => {
      const error = new Error("Test error");
      const context = {
        userId: 123,
        action: "test",
      };

      captureException(error, context);

      expect(Sentry.withScope).toHaveBeenCalled();
      expect(Sentry.captureException).toHaveBeenCalledWith(error);
    });

    it("should capture exception without context", () => {
      const error = new Error("Test error");

      captureException(error);

      expect(Sentry.withScope).toHaveBeenCalled();
      expect(Sentry.captureException).toHaveBeenCalledWith(error);
    });

    it("should set context when provided", () => {
      const error = new Error("Test error");
      const context = {
        userId: 123,
        action: "test",
      };

      captureException(error, context);

      // Verify withScope was called and scope.setContext was called for each context entry
      expect(Sentry.withScope).toHaveBeenCalled();
      const scopeCallback = Sentry.withScope.mock.calls[0][0];
      const mockScope = {
        setContext: vi.fn(),
      };
      scopeCallback(mockScope);
      expect(mockScope.setContext).toHaveBeenCalledWith("userId", 123);
      expect(mockScope.setContext).toHaveBeenCalledWith("action", "test");
    });
  });

  describe("captureMessage", () => {
    it("should capture message with default level", () => {
      captureMessage("Test message");

      expect(Sentry.withScope).toHaveBeenCalled();
      expect(Sentry.captureMessage).toHaveBeenCalledWith("Test message", "info");
    });

    it("should capture message with custom level", () => {
      captureMessage("Test message", "error");

      expect(Sentry.captureMessage).toHaveBeenCalledWith("Test message", "error");
    });

    it("should capture message with context", () => {
      const context = {
        userId: 123,
        action: "test",
      };

      captureMessage("Test message", "warning", context);

      expect(Sentry.withScope).toHaveBeenCalled();
      const scopeCallback = Sentry.withScope.mock.calls[0][0];
      const mockScope = {
        setContext: vi.fn(),
      };
      scopeCallback(mockScope);
      expect(mockScope.setContext).toHaveBeenCalledWith("userId", 123);
      expect(mockScope.setContext).toHaveBeenCalledWith("action", "test");
      expect(Sentry.captureMessage).toHaveBeenCalledWith("Test message", "warning");
    });

    it("should capture message without context", () => {
      captureMessage("Test message", "info");

      expect(Sentry.withScope).toHaveBeenCalled();
      expect(Sentry.captureMessage).toHaveBeenCalledWith("Test message", "info");
    });
  });

  describe("setUserContext", () => {
    it("should set user context with id and email", () => {
      const user = {
        id: 123,
        email: "test@example.com",
      };

      setUserContext(user);

      expect(Sentry.setUser).toHaveBeenCalledWith({
        id: 123,
        email: "test@example.com",
      });
    });

    it("should set user context with only id", () => {
      const user = {
        id: 123,
      };

      setUserContext(user);

      expect(Sentry.setUser).toHaveBeenCalledWith({
        id: 123,
        email: undefined,
      });
    });
  });

  describe("clearUserContext", () => {
    it("should clear user context", () => {
      clearUserContext();

      expect(Sentry.setUser).toHaveBeenCalledWith(null);
    });
  });
});

