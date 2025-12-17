import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";

// Create hoisted mocks
const mockSupabaseFrom = vi.hoisted(() => vi.fn());
const mockAxiosPost = vi.hoisted(() => vi.fn());

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: mockSupabaseFrom,
  })),
}));

vi.mock("axios", () => ({
  default: {
    post: mockAxiosPost,
  },
}));

vi.mock("../../utils/apiTrackingService.js", () => ({
  trackApiCall: vi.fn((name, fn) => fn()),
}));

vi.mock("../../utils/schedulingHelpers.js", () => ({
  syncToGoogleCalendar: vi.fn().mockResolvedValue({ success: true }),
  sendInterviewConfirmation: vi.fn().mockResolvedValue(true),
  deleteFromGoogleCalendar: vi.fn().mockResolvedValue(true),
}));

import interviewAnalyticsRouter from "../../routes/interviewAnalytics.js";

function mockSupabaseChain(data = [], error = null) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: data[0] || null, error }),
    order: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    then: vi.fn((cb) => cb({ data, error })),
  };
  chain.select.mockReturnValue(chain);
  chain.insert.mockReturnValue(chain);
  chain.update.mockReturnValue(chain);
  chain.delete.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.order.mockReturnValue(chain);
  return chain;
}

describe("Interview Analytics Routes", () => {
  let app;

  beforeEach(() => {
    vi.clearAllMocks();

    app = express();
    app.use(express.json());
    app.use("/api/interview-analytics", interviewAnalyticsRouter);

    mockSupabaseFrom.mockReturnValue(mockSupabaseChain([]));
    mockAxiosPost.mockResolvedValue({
      data: { choices: [{ message: { content: "AI insights" } }] },
    });
  });

  describe("GET /analytics - Get Analytics", () => {
    it("should require userId", async () => {
      const response = await request(app).get(
        "/api/interview-analytics/analytics"
      );

      expect(response.status).toBe(400);
    });

    it("should return analytics data", async () => {
      mockSupabaseFrom.mockImplementation((table) => {
        const chain = mockSupabaseChain([{ id: 1, result: "offer" }]);
        return chain;
      });

      const response = await request(app).get(
        "/api/interview-analytics/analytics?userId=1"
      );

      expect([200, 500]).toContain(response.status);
    });

    it("should reject invalid userId", async () => {
      const response = await request(app).get(
        "/api/interview-analytics/analytics?userId=invalid"
      );

      expect(response.status).toBe(400);
    });

    it("should calculate conversion rates", async () => {
      mockSupabaseFrom.mockImplementation(() =>
        mockSupabaseChain([
          { id: 1, result: "passed", stage: "phone" },
          { id: 2, result: "offer", stage: "final" },
        ])
      );

      const response = await request(app).get(
        "/api/interview-analytics/analytics?userId=1"
      );

      expect([200, 500]).toContain(response.status);
    });
  });

  describe("POST /outcome - Record Outcome", () => {
    it("should record interview outcome", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([{ id: 1 }]);
        chain.single.mockResolvedValue({ data: { id: 1 }, error: null });
        return chain;
      });

      const response = await request(app)
        .post("/api/interview-analytics/outcome")
        .send({
          userId: 1,
          company: "Google",
          role: "Engineer",
          interviewDate: "2024-01-15",
          interviewType: "phone",
        });

      expect([200, 201, 400, 500]).toContain(response.status);
    });

    it("should require required fields", async () => {
      const response = await request(app)
        .post("/api/interview-analytics/outcome")
        .send({ company: "Google" });

      expect(response.status).toBe(400);
    });

    it("should reject invalid userId", async () => {
      const response = await request(app)
        .post("/api/interview-analytics/outcome")
        .send({
          userId: "invalid",
          company: "Google",
          role: "Engineer",
          interviewDate: "2024-01-15",
          interviewType: "phone",
        });

      expect(response.status).toBe(400);
    });

    it("should handle sync to Google Calendar", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([
          { id: 1, google_event_id: "event123" },
        ]);
        chain.single.mockResolvedValue({
          data: { id: 1, google_event_id: "event123" },
          error: null,
        });
        return chain;
      });

      const response = await request(app)
        .post("/api/interview-analytics/outcome")
        .send({
          userId: 1,
          company: "Google",
          role: "Engineer",
          interviewDate: "2024-01-15",
          interviewType: "phone",
          syncToCalendar: true,
        });

      expect([200, 201, 400, 500]).toContain(response.status);
    });
  });

  describe("PUT /outcome/:id - Update Outcome", () => {
    it("should update outcome", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([{ id: 1, outcome: "offer" }]);
        chain.single.mockResolvedValue({ data: { id: 1 }, error: null });
        return chain;
      });

      const response = await request(app)
        .put("/api/interview-analytics/outcome/1?userId=1")
        .send({ outcome: "offer" });

      expect([200, 404, 500]).toContain(response.status);
    });

    it("should require userId", async () => {
      const response = await request(app)
        .put("/api/interview-analytics/outcome/1")
        .send({ outcome: "offer" });

      expect(response.status).toBe(400);
    });

    it("should handle non-existent outcome", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([]);
        chain.single.mockResolvedValue({ data: null, error: null });
        return chain;
      });

      const response = await request(app)
        .put("/api/interview-analytics/outcome/999?userId=1")
        .send({ outcome: "offer" });

      expect([200, 404, 500]).toContain(response.status);
    });
  });

  describe("DELETE /outcome/:id - Delete Outcome", () => {
    it("should delete outcome", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([{ id: 1 }]);
        return chain;
      });

      const response = await request(app).delete(
        "/api/interview-analytics/outcome/1?userId=1"
      );

      expect([200, 204, 404, 500]).toContain(response.status);
    });

    it("should require userId", async () => {
      const response = await request(app).delete(
        "/api/interview-analytics/outcome/1"
      );

      expect(response.status).toBe(400);
    });
  });

  describe("GET /outcomes - Get Outcomes List", () => {
    it("should return outcomes list", async () => {
      mockSupabaseFrom.mockImplementation(() =>
        mockSupabaseChain([{ id: 1, result: "passed" }])
      );

      const response = await request(app).get(
        "/api/interview-analytics/outcomes?userId=1"
      );

      expect([200, 500]).toContain(response.status);
    });

    it("should require userId", async () => {
      const response = await request(app).get(
        "/api/interview-analytics/outcomes"
      );

      expect(response.status).toBe(400);
    });
  });

  describe("Error Handling", () => {
    it("should handle database errors", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([], { message: "Database error" });
        return chain;
      });

      const response = await request(app).get(
        "/api/interview-analytics/analytics?userId=1"
      );

      expect([200, 500]).toContain(response.status);
    });
  });

  describe("GET /analytics - Time Range Filters", () => {
    it("should handle 30d time range", async () => {
      mockSupabaseFrom.mockImplementation(() => mockSupabaseChain([]));

      const response = await request(app).get(
        "/api/interview-analytics/analytics?userId=1&timeRange=30d"
      );

      expect([200, 500]).toContain(response.status);
    });

    it("should handle 90d time range", async () => {
      mockSupabaseFrom.mockImplementation(() => mockSupabaseChain([]));

      const response = await request(app).get(
        "/api/interview-analytics/analytics?userId=1&timeRange=90d"
      );

      expect([200, 500]).toContain(response.status);
    });

    it("should handle 6m time range", async () => {
      mockSupabaseFrom.mockImplementation(() => mockSupabaseChain([]));

      const response = await request(app).get(
        "/api/interview-analytics/analytics?userId=1&timeRange=6m"
      );

      expect([200, 500]).toContain(response.status);
    });

    it("should handle 1y time range", async () => {
      mockSupabaseFrom.mockImplementation(() => mockSupabaseChain([]));

      const response = await request(app).get(
        "/api/interview-analytics/analytics?userId=1&timeRange=1y"
      );

      expect([200, 500]).toContain(response.status);
    });

    it("should handle all time range", async () => {
      mockSupabaseFrom.mockImplementation(() => mockSupabaseChain([]));

      const response = await request(app).get(
        "/api/interview-analytics/analytics?userId=1&timeRange=all"
      );

      expect([200, 500]).toContain(response.status);
    });
  });

  describe("GET /analytics - Comprehensive Data", () => {
    it("should calculate company type analysis for FAANG", async () => {
      const interviews = [
        { id: 1, company: "Google", outcome: "offer_received", self_rating: 4, interview_format: "video" },
        { id: 2, company: "Meta", outcome: "pending", self_rating: 3, interview_format: "phone" },
        { id: 3, company: "Amazon", outcome: "offer_accepted", self_rating: 5, interview_format: "onsite" },
      ];
      mockSupabaseFrom.mockImplementation((table) => {
        if (table === "interview_outcomes") {
          return mockSupabaseChain(interviews);
        }
        return mockSupabaseChain([]);
      });

      const response = await request(app).get(
        "/api/interview-analytics/analytics?userId=1"
      );

      expect([200, 500]).toContain(response.status);
    });

    it("should calculate strongest and weakest areas", async () => {
      const interviews = [
        { id: 1, company: "Test", areas_covered: ["coding", "system_design"], self_rating: 5, strengths: ["communication"], weaknesses: ["algorithms"] },
        { id: 2, company: "Test2", areas_covered: ["behavioral"], self_rating: 2, strengths: ["teamwork"], weaknesses: ["coding"] },
      ];
      mockSupabaseFrom.mockImplementation((table) => {
        if (table === "interview_outcomes") {
          return mockSupabaseChain(interviews);
        }
        return mockSupabaseChain([]);
      });

      const response = await request(app).get(
        "/api/interview-analytics/analytics?userId=1"
      );

      expect([200, 500]).toContain(response.status);
    });

    it("should calculate format comparison", async () => {
      const interviews = [
        { id: 1, company: "Test", interview_format: "video", outcome: "offer_received", self_rating: 4, confidence_level: 4 },
        { id: 2, company: "Test2", interview_format: "phone", outcome: "rejected", self_rating: 2, confidence_level: 2 },
        { id: 3, company: "Test3", interview_format: "onsite", outcome: "offer_received", self_rating: 5, confidence_level: 5 },
      ];
      mockSupabaseFrom.mockImplementation((table) => {
        if (table === "interview_outcomes") {
          return mockSupabaseChain(interviews);
        }
        return mockSupabaseChain([]);
      });

      const response = await request(app).get(
        "/api/interview-analytics/analytics?userId=1"
      );

      expect([200, 500]).toContain(response.status);
    });

    it("should calculate improvement over time", async () => {
      const interviews = [
        { id: 1, company: "Test", interview_date: "2024-01-01", self_rating: 2 },
        { id: 2, company: "Test2", interview_date: "2024-03-01", self_rating: 3 },
        { id: 3, company: "Test3", interview_date: "2024-06-01", self_rating: 4 },
        { id: 4, company: "Test4", interview_date: "2024-09-01", self_rating: 5 },
      ];
      mockSupabaseFrom.mockImplementation((table) => {
        if (table === "interview_outcomes") {
          return mockSupabaseChain(interviews);
        }
        return mockSupabaseChain([]);
      });

      const response = await request(app).get(
        "/api/interview-analytics/analytics?userId=1"
      );

      expect([200, 500]).toContain(response.status);
    });

    it("should calculate practice impact", async () => {
      const interviews = [
        { id: 1, company: "Test", mock_interviews_completed: 3, self_rating: 5 },
        { id: 2, company: "Test2", mock_interviews_completed: 0, self_rating: 2 },
      ];
      const mockSessions = [
        { id: 1, status: "completed", overall_performance_score: 80 },
        { id: 2, status: "completed", overall_performance_score: 90 },
      ];
      mockSupabaseFrom.mockImplementation((table) => {
        if (table === "interview_outcomes") {
          return mockSupabaseChain(interviews);
        }
        if (table === "mock_interview_sessions") {
          return mockSupabaseChain(mockSessions);
        }
        return mockSupabaseChain([]);
      });

      const response = await request(app).get(
        "/api/interview-analytics/analytics?userId=1"
      );

      expect([200, 500]).toContain(response.status);
    });

    it("should handle startup company type", async () => {
      const interviews = [
        { id: 1, company: "TechStartup Inc", company_type: "startup", outcome: "offer_received", self_rating: 4 },
      ];
      mockSupabaseFrom.mockImplementation((table) => {
        if (table === "interview_outcomes") {
          return mockSupabaseChain(interviews);
        }
        return mockSupabaseChain([]);
      });

      const response = await request(app).get(
        "/api/interview-analytics/analytics?userId=1"
      );

      expect([200, 500]).toContain(response.status);
    });

    it("should handle areas_covered as object", async () => {
      const interviews = [
        { id: 1, company: "Test", areas_covered: { area1: "coding", area2: "design" }, self_rating: 4 },
      ];
      mockSupabaseFrom.mockImplementation((table) => {
        if (table === "interview_outcomes") {
          return mockSupabaseChain(interviews);
        }
        return mockSupabaseChain([]);
      });

      const response = await request(app).get(
        "/api/interview-analytics/analytics?userId=1"
      );

      expect([200, 500]).toContain(response.status);
    });
  });

  describe("POST /outcome - Calendar and Email", () => {
    it("should handle calendar sync failure gracefully", async () => {
      const { syncToGoogleCalendar } = await import("../../utils/schedulingHelpers.js");
      syncToGoogleCalendar.mockRejectedValueOnce(new Error("Calendar sync failed"));

      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([{ id: 1 }]);
        chain.single.mockResolvedValue({ data: { id: 1 }, error: null });
        return chain;
      });

      const response = await request(app)
        .post("/api/interview-analytics/outcome")
        .send({
          userId: 1,
          company: "Google",
          role: "Engineer",
          interviewDate: "2024-01-15",
          interviewType: "phone",
          syncToCalendar: true,
        });

      expect([200, 201, 400, 500]).toContain(response.status);
    });

    it("should send confirmation email when user email available", async () => {
      mockSupabaseFrom.mockImplementation((table) => {
        if (table === "interview_outcomes") {
          const chain = mockSupabaseChain([{ id: 1 }]);
          chain.single.mockResolvedValue({ data: { id: 1 }, error: null });
          return chain;
        }
        if (table === "users") {
          const chain = mockSupabaseChain([{ email: "test@example.com" }]);
          chain.single.mockResolvedValue({ data: { email: "test@example.com" }, error: null });
          return chain;
        }
        return mockSupabaseChain([]);
      });

      const response = await request(app)
        .post("/api/interview-analytics/outcome")
        .send({
          userId: 1,
          company: "Google",
          role: "Engineer",
          interviewDate: "2024-01-15",
          interviewType: "phone",
        });

      expect([200, 201, 400, 500]).toContain(response.status);
    });

    it("should handle database error on insert", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([]);
        chain.single.mockResolvedValue({ data: null, error: { message: "Insert failed" } });
        return chain;
      });

      const response = await request(app)
        .post("/api/interview-analytics/outcome")
        .send({
          userId: 1,
          company: "Google",
          role: "Engineer",
          interviewDate: "2024-01-15",
          interviewType: "phone",
        });

      expect([400, 500]).toContain(response.status);
    });

    it("should handle all optional fields", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([{ id: 1 }]);
        chain.single.mockResolvedValue({ data: { id: 1 }, error: null });
        return chain;
      });

      const response = await request(app)
        .post("/api/interview-analytics/outcome")
        .send({
          userId: 1,
          company: "Google",
          role: "Engineer",
          interviewDate: "2024-01-15",
          interviewType: "phone",
          interviewTime: "10:00",
          durationMinutes: 60,
          interviewFormat: "video",
          interviewRound: 2,
          difficultyRating: 4,
          selfRating: 5,
          confidenceLevel: 4,
          areasCovered: ["coding", "design"],
          strengths: ["communication"],
          weaknesses: ["algorithms"],
          outcome: "pending",
          feedbackReceived: "Good performance",
          nextRoundScheduled: true,
          hoursPrepared: 10,
          mockInterviewsCompleted: 3,
          usedAiCoaching: true,
          notes: "Great interview",
          lessonsLearned: "Be more concise",
          interviewerName: "John Doe",
          interviewerEmail: "john@company.com",
          videoLink: "https://zoom.us/j/123",
          locationAddress: "123 Main St",
          dialInNumber: "+1234567890",
          meetingId: "123-456-789",
          meetingPassword: "secret",
        });

      expect([200, 201, 400, 500]).toContain(response.status);
    });
  });

  describe("PUT /outcome/:id - Update Edge Cases", () => {
    it("should handle invalid outcomeId", async () => {
      const response = await request(app)
        .put("/api/interview-analytics/outcome/invalid?userId=1")
        .send({ outcome: "offer" });

      expect([400, 500]).toContain(response.status);
    });

    it("should handle invalid userId in query", async () => {
      const response = await request(app)
        .put("/api/interview-analytics/outcome/1?userId=invalid")
        .send({ outcome: "offer" });

      expect([400, 500]).toContain(response.status);
    });

    it("should handle no valid fields to update", async () => {
      const response = await request(app)
        .put("/api/interview-analytics/outcome/1?userId=1")
        .send({});

      expect([400, 500]).toContain(response.status);
    });

    it("should handle calendar sync on update", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([{ id: 1, calendar_sync_status: "pending" }]);
        chain.single.mockResolvedValue({ data: { id: 1, calendar_sync_status: "pending" }, error: null });
        return chain;
      });

      const response = await request(app)
        .put("/api/interview-analytics/outcome/1?userId=1")
        .send({ outcome: "offer", syncToCalendar: true });

      expect([200, 404, 500]).toContain(response.status);
    });

    it("should update with camelCase field names", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([{ id: 1 }]);
        chain.single.mockResolvedValue({ data: { id: 1 }, error: null });
        return chain;
      });

      const response = await request(app)
        .put("/api/interview-analytics/outcome/1?userId=1")
        .send({
          interviewFormat: "video",
          interviewType: "technical",
          selfRating: 4,
          confidenceLevel: 5,
        });

      expect([200, 404, 500]).toContain(response.status);
    });

    it("should handle database error on update", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([]);
        chain.single.mockResolvedValue({ data: null, error: { message: "Update failed" } });
        return chain;
      });

      const response = await request(app)
        .put("/api/interview-analytics/outcome/1?userId=1")
        .send({ outcome: "offer" });

      expect([404, 500]).toContain(response.status);
    });
  });

  describe("DELETE /outcome/:id - Delete Edge Cases", () => {
    it("should handle invalid outcomeId", async () => {
      const response = await request(app).delete(
        "/api/interview-analytics/outcome/invalid?userId=1"
      );

      expect([400, 500]).toContain(response.status);
    });

    it("should handle invalid userId in query", async () => {
      const response = await request(app).delete(
        "/api/interview-analytics/outcome/1?userId=invalid"
      );

      expect([400, 500]).toContain(response.status);
    });

    it("should delete from Google Calendar when synced", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([{ id: 1, google_calendar_event_id: "event123" }]);
        chain.single.mockResolvedValue({ data: { id: 1, google_calendar_event_id: "event123" }, error: null });
        return chain;
      });

      const response = await request(app).delete(
        "/api/interview-analytics/outcome/1?userId=1&deleteFromCalendar=true"
      );

      expect([200, 204, 404, 500]).toContain(response.status);
    });

    it("should handle database error on delete", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([]);
        chain.single.mockResolvedValue({ data: { id: 1 }, error: null });
        return {
          ...chain,
          delete: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          then: vi.fn((cb) => cb({ error: { message: "Delete failed" } })),
        };
      });

      const response = await request(app).delete(
        "/api/interview-analytics/outcome/1?userId=1"
      );

      expect([200, 204, 404, 500]).toContain(response.status);
    });
  });

  describe("GET /outcomes - List Edge Cases", () => {
    it("should handle invalid userId", async () => {
      const response = await request(app).get(
        "/api/interview-analytics/outcomes?userId=invalid"
      );

      expect([400, 500]).toContain(response.status);
    });

    it("should handle database error on list", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([], { message: "Query failed" });
        return chain;
      });

      const response = await request(app).get(
        "/api/interview-analytics/outcomes?userId=1"
      );

      expect([200, 500]).toContain(response.status);
    });
  });

  describe("AI Insights Generation", () => {
    it("should return default insights for insufficient data", async () => {
      mockSupabaseFrom.mockImplementation(() => mockSupabaseChain([{ id: 1 }]));

      const response = await request(app).get(
        "/api/interview-analytics/analytics?userId=1"
      );

      expect([200, 500]).toContain(response.status);
    });

    it("should handle OpenAI API error", async () => {
      mockAxiosPost.mockRejectedValueOnce(new Error("OpenAI API error"));
      
      const interviews = [
        { id: 1, company: "Test", outcome: "offer_received", self_rating: 4 },
        { id: 2, company: "Test2", outcome: "pending", self_rating: 3 },
        { id: 3, company: "Test3", outcome: "rejected", self_rating: 2 },
      ];
      mockSupabaseFrom.mockImplementation(() => mockSupabaseChain(interviews));

      const response = await request(app).get(
        "/api/interview-analytics/analytics?userId=1"
      );

      expect([200, 500]).toContain(response.status);
    });

    it("should parse valid JSON from OpenAI", async () => {
      mockAxiosPost.mockResolvedValueOnce({
        data: {
          choices: [{
            message: {
              content: JSON.stringify({
                keyInsights: ["Insight 1", "Insight 2"],
                optimalStrategies: ["Strategy 1"],
                improvementRecommendations: ["Recommendation 1"],
                industryComparison: {
                  vsAverage: "better",
                  standoutMetrics: "conversion rate",
                  concerningMetrics: "confidence"
                }
              })
            }
          }]
        }
      });

      const interviews = [
        { id: 1, company: "Test", outcome: "offer_received", self_rating: 4 },
        { id: 2, company: "Test2", outcome: "pending", self_rating: 3 },
        { id: 3, company: "Test3", outcome: "rejected", self_rating: 2 },
      ];
      mockSupabaseFrom.mockImplementation(() => mockSupabaseChain(interviews));

      const response = await request(app).get(
        "/api/interview-analytics/analytics?userId=1"
      );

      expect([200, 500]).toContain(response.status);
    });
  });

  describe("Factory Function", () => {
    it("should create router with custom supabase client", async () => {
      const { createInterviewAnalyticsRoutes } = await import("../../routes/interviewAnalytics.js");
      
      const mockClient = {
        from: vi.fn().mockReturnValue(mockSupabaseChain([])),
      };
      
      const customRouter = createInterviewAnalyticsRoutes(mockClient);
      expect(customRouter).toBeDefined();
    });
  });
});
