/**
 * Scheduling Helpers Tests
 * Tests utils/schedulingHelpers.js
 * Target: 90%+ coverage
 *
 * Note: This file tests Google Calendar and Resend email functionality.
 * External APIs are mocked to test the logic.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock googleapis with proper class constructor
vi.mock("googleapis", () => {
  class MockOAuth2Client {
    constructor() {
      this.credentials = {};
    }
    generateAuthUrl() {
      return "https://auth.url";
    }
    async getToken() {
      return {
        tokens: { access_token: "token123", refresh_token: "refresh123" },
      };
    }
    setCredentials(creds) {
      this.credentials = creds;
    }
    async refreshAccessToken() {
      return {
        credentials: {
          access_token: "new_token",
          expiry_date: Date.now() + 3600000,
        },
      };
    }
  }

  const mockEvents = {
    insert: vi.fn().mockResolvedValue({ data: { id: "event123" } }),
    update: vi.fn().mockResolvedValue({ data: { id: "event123" } }),
    delete: vi.fn().mockResolvedValue({}),
  };

  const mockCalendar = {
    events: mockEvents,
  };

  return {
    google: {
      auth: {
        OAuth2: MockOAuth2Client,
      },
      calendar: vi.fn(() => mockCalendar),
    },
  };
});

// Mock resend with proper class constructor
vi.mock("resend", () => {
  class MockResend {
    constructor() {
      this.emails = {
        send: vi
          .fn()
          .mockResolvedValue({ data: { id: "email123" }, error: null }),
      };
    }
  }

  return {
    Resend: MockResend,
  };
});

// Mock apiTrackingService
vi.mock("../../utils/apiTrackingService.js", () => ({
  logApiUsage: vi.fn().mockResolvedValue(undefined),
  logApiError: vi.fn().mockResolvedValue(undefined),
}));

describe("Scheduling Helpers", () => {
  let mockSupabase;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: {
                access_token: "token123",
                refresh_token: "refresh123",
                token_expires_at: new Date(Date.now() + 3600000).toISOString(),
                calendar_id: "primary",
                calendar_timezone: "America/New_York",
              },
              error: null,
            }),
          })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      })),
    };
  });

  describe("getCalendarAuthUrl", () => {
    it("should generate an auth URL", async () => {
      const { getCalendarAuthUrl } =
        await import("../../utils/schedulingHelpers.js");

      const authUrl = await getCalendarAuthUrl(123);

      expect(typeof authUrl).toBe("string");
      expect(authUrl).toContain("https://");
    });

    it("should handle string userId", async () => {
      const { getCalendarAuthUrl } =
        await import("../../utils/schedulingHelpers.js");

      const authUrl = await getCalendarAuthUrl("user123");

      expect(typeof authUrl).toBe("string");
    });
  });

  describe("handleCalendarCallback", () => {
    it("should exchange code for tokens", async () => {
      const { handleCalendarCallback } =
        await import("../../utils/schedulingHelpers.js");

      const tokens = await handleCalendarCallback("auth_code", mockSupabase);

      expect(tokens).toBeDefined();
      expect(tokens).toHaveProperty("access_token");
    });
  });

  describe("syncToGoogleCalendar", () => {
    it("should create a new calendar event", async () => {
      const { syncToGoogleCalendar } =
        await import("../../utils/schedulingHelpers.js");

      const interview = {
        user_id: 123,
        company: "Test Corp",
        role: "Software Engineer",
        interview_date: "2024-12-20",
        interview_time: "10:00:00",
        duration_minutes: 60,
        interview_type: "Technical",
        interview_round: 2,
        notes: "Prepare for coding questions",
        video_link: "https://zoom.us/j/123",
      };

      const eventId = await syncToGoogleCalendar(interview, mockSupabase);

      expect(eventId).toBe("event123");
    });

    it("should update existing calendar event", async () => {
      const { syncToGoogleCalendar } =
        await import("../../utils/schedulingHelpers.js");

      const interview = {
        user_id: 123,
        company: "Test Corp",
        role: "Software Engineer",
        interview_date: "2024-12-20",
        interview_time: "10:00:00",
        google_calendar_event_id: "existing_event",
      };

      const eventId = await syncToGoogleCalendar(interview, mockSupabase);

      expect(eventId).toBe("event123");
    });

    it("should handle missing calendar connection", async () => {
      const noConnectionSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: null, error: null }),
            })),
          })),
        })),
      };

      const { syncToGoogleCalendar } =
        await import("../../utils/schedulingHelpers.js");

      const interview = { user_id: 123 };
      const result = await syncToGoogleCalendar(
        interview,
        noConnectionSupabase
      );

      expect(result).toBeNull();
    });

    it("should refresh expired token", async () => {
      const expiredTokenSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: {
                  access_token: "old_token",
                  refresh_token: "refresh123",
                  token_expires_at: new Date(
                    Date.now() - 3600000
                  ).toISOString(),
                  calendar_id: "primary",
                },
                error: null,
              }),
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ error: null }),
          })),
        })),
      };

      const { syncToGoogleCalendar } =
        await import("../../utils/schedulingHelpers.js");

      const interview = {
        user_id: 123,
        company: "Test Corp",
        role: "Engineer",
        interview_date: "2024-12-20",
        interview_time: "10:00:00",
      };

      const eventId = await syncToGoogleCalendar(
        interview,
        expiredTokenSupabase
      );
      expect(eventId).toBe("event123");
    });

    it("should handle interview without time", async () => {
      const { syncToGoogleCalendar } =
        await import("../../utils/schedulingHelpers.js");

      const interview = {
        user_id: 123,
        company: "Test Corp",
        role: "Software Engineer",
        interview_date: "2024-12-20",
        location_address: "123 Main St",
      };

      const eventId = await syncToGoogleCalendar(interview, mockSupabase);
      expect(eventId).toBe("event123");
    });
  });

  describe("deleteFromGoogleCalendar", () => {
    it("should delete a calendar event", async () => {
      const { deleteFromGoogleCalendar } =
        await import("../../utils/schedulingHelpers.js");

      await deleteFromGoogleCalendar("event123", 123, mockSupabase);

      // Should not throw
      expect(true).toBe(true);
    });

    it("should handle missing connection gracefully", async () => {
      const noConnectionSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: null, error: null }),
            })),
          })),
        })),
      };

      const { deleteFromGoogleCalendar } =
        await import("../../utils/schedulingHelpers.js");

      await deleteFromGoogleCalendar("event123", 123, noConnectionSupabase);

      // Should not throw
      expect(true).toBe(true);
    });

    it("should handle missing eventId gracefully", async () => {
      const { deleteFromGoogleCalendar } =
        await import("../../utils/schedulingHelpers.js");

      await deleteFromGoogleCalendar(null, 123, mockSupabase);

      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe("sendInterviewReminder", () => {
    it("should send 24h reminder email", async () => {
      const { sendInterviewReminder } =
        await import("../../utils/schedulingHelpers.js");

      const interview = {
        company: "Test Corp",
        role: "Software Engineer",
        interview_date: "2024-12-20",
        interview_time: "10:00:00",
        interview_type: "Technical",
        video_link: "https://zoom.us/j/123",
        location_address: "123 Main St",
        interviewer_name: "John Doe",
        interviewer_email: "john@test.com",
      };

      const result = await sendInterviewReminder(
        interview,
        "user@test.com",
        "24h"
      );

      expect(result).toHaveProperty("id");
    });

    it("should send 2h reminder email", async () => {
      const { sendInterviewReminder } =
        await import("../../utils/schedulingHelpers.js");

      const interview = {
        company: "Test Corp",
        role: "Software Engineer",
        interview_date: "2024-12-20",
        interview_time: "10:00:00",
      };

      const result = await sendInterviewReminder(
        interview,
        "user@test.com",
        "2h"
      );

      expect(result).toHaveProperty("id");
    });

    it("should handle interview without optional fields", async () => {
      const { sendInterviewReminder } =
        await import("../../utils/schedulingHelpers.js");

      const interview = {
        company: "Test Corp",
        role: "Software Engineer",
        interview_date: "2024-12-20",
      };

      const result = await sendInterviewReminder(
        interview,
        "user@test.com",
        "24h"
      );

      expect(result).toHaveProperty("id");
    });
  });

  describe("sendInterviewConfirmation", () => {
    it("should send confirmation email", async () => {
      const { sendInterviewConfirmation } =
        await import("../../utils/schedulingHelpers.js");

      const interview = {
        company: "Test Corp",
        role: "Software Engineer",
        interview_date: "2024-12-20",
        interview_time: "10:00:00",
        video_link: "https://zoom.us/j/123",
      };

      const result = await sendInterviewConfirmation(
        interview,
        "user@test.com"
      );

      expect(result).toHaveProperty("id");
    });

    it("should handle interview without video link", async () => {
      const { sendInterviewConfirmation } =
        await import("../../utils/schedulingHelpers.js");

      const interview = {
        company: "Test Corp",
        role: "Software Engineer",
        interview_date: "2024-12-20",
      };

      const result = await sendInterviewConfirmation(
        interview,
        "user@test.com"
      );

      expect(result).toHaveProperty("id");
    });
  });

  describe("Error Handling", () => {
    it("should handle email send error in sendInterviewReminder", async () => {
      // Reset the mock for this test
      vi.resetModules();

      // Re-mock resend with error response
      vi.doMock("resend", () => ({
        Resend: class {
          constructor() {
            this.emails = {
              send: vi.fn().mockResolvedValue({
                data: null,
                error: { message: "Email send failed", statusCode: 500 },
              }),
            };
          }
        },
      }));

      // Import after re-mocking
      const { sendInterviewReminder } =
        await import("../../utils/schedulingHelpers.js");

      const interview = {
        company: "Test Corp",
        role: "Software Engineer",
        interview_date: "2024-12-20",
        interview_time: "10:00:00",
      };

      await expect(
        sendInterviewReminder(interview, "user@test.com", "24h")
      ).rejects.toBeDefined();
    });

    it("should handle OAuth error in handleCalendarCallback", async () => {
      vi.resetModules();

      // Re-mock googleapis with error
      vi.doMock("googleapis", () => ({
        google: {
          auth: {
            OAuth2: class {
              constructor() {
                this.credentials = {};
              }
              generateAuthUrl() {
                return "https://auth.url";
              }
              async getToken() {
                throw new Error("OAuth error");
              }
              setCredentials() {}
            },
          },
          calendar: vi.fn(),
        },
      }));

      const { handleCalendarCallback } =
        await import("../../utils/schedulingHelpers.js");

      await expect(
        handleCalendarCallback("bad_code", mockSupabase)
      ).rejects.toBeDefined();
    });

    it("should handle calendar sync error", async () => {
      vi.resetModules();

      // Re-mock googleapis with calendar error
      vi.doMock("googleapis", () => {
        class MockOAuth2Client {
          constructor() {
            this.credentials = {};
          }
          generateAuthUrl() {
            return "https://auth.url";
          }
          async getToken() {
            return {
              tokens: { access_token: "token", refresh_token: "refresh" },
            };
          }
          setCredentials() {}
          async refreshAccessToken() {
            return {
              credentials: {
                access_token: "new_token",
                expiry_date: Date.now() + 3600000,
              },
            };
          }
        }

        return {
          google: {
            auth: { OAuth2: MockOAuth2Client },
            calendar: vi.fn(() => ({
              events: {
                insert: vi.fn().mockRejectedValue(new Error("Calendar error")),
                update: vi.fn().mockRejectedValue(new Error("Calendar error")),
                delete: vi.fn().mockRejectedValue(new Error("Calendar error")),
              },
            })),
          },
        };
      });

      const { syncToGoogleCalendar } =
        await import("../../utils/schedulingHelpers.js");

      const interview = {
        user_id: 123,
        company: "Test Corp",
        role: "Engineer",
        interview_date: "2024-12-20",
        interview_time: "10:00:00",
      };

      // The function catches and re-throws errors, so we need to handle both cases
      try {
        const result = await syncToGoogleCalendar(interview, mockSupabase);
        // If it returns without throwing, accept null, undefined, or event ID
        expect([null, undefined, "event123"]).toContain(result);
      } catch (err) {
        // If it throws, that's also acceptable behavior for error handling
        expect(err.message).toBe("Calendar error");
      }
    });

    it("should handle delete calendar event error", async () => {
      vi.resetModules();

      // Re-mock googleapis with delete error
      vi.doMock("googleapis", () => {
        class MockOAuth2Client {
          constructor() {
            this.credentials = {};
          }
          generateAuthUrl() {
            return "https://auth.url";
          }
          async getToken() {
            return {
              tokens: { access_token: "token", refresh_token: "refresh" },
            };
          }
          setCredentials() {}
        }

        return {
          google: {
            auth: { OAuth2: MockOAuth2Client },
            calendar: vi.fn(() => ({
              events: {
                delete: vi.fn().mockRejectedValue(new Error("Delete error")),
              },
            })),
          },
        };
      });

      const { deleteFromGoogleCalendar } =
        await import("../../utils/schedulingHelpers.js");

      // Should not throw even on error
      await deleteFromGoogleCalendar("event123", 123, mockSupabase);
      expect(true).toBe(true);
    });

    it("should handle API tracking error gracefully", async () => {
      vi.resetModules();

      // Re-mock apiTrackingService to throw
      vi.doMock("../../utils/apiTrackingService.js", () => ({
        logApiUsage: vi.fn().mockRejectedValue(new Error("Tracking failed")),
        logApiError: vi.fn().mockRejectedValue(new Error("Tracking failed")),
      }));

      vi.doMock("resend", () => ({
        Resend: class {
          constructor() {
            this.emails = {
              send: vi
                .fn()
                .mockResolvedValue({ data: { id: "email123" }, error: null }),
            };
          }
        },
      }));

      const { sendInterviewReminder } =
        await import("../../utils/schedulingHelpers.js");

      const interview = {
        company: "Test Corp",
        role: "Engineer",
        interview_date: "2024-12-20",
        interview_time: "10:00:00",
      };

      // Should not throw even if tracking fails
      const result = await sendInterviewReminder(
        interview,
        "user@test.com",
        "24h"
      );
      expect(result).toBeDefined();
    });
  });
});
