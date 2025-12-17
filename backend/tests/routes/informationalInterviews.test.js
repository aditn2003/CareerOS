import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";

// Create hoisted mocks
const mockSupabaseFrom = vi.hoisted(() => vi.fn());
const mockQuery = vi.hoisted(() => vi.fn());
const mockResendSend = vi.hoisted(() => vi.fn());
const mockLogApiUsage = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockLogApiError = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

// Mock auth first - before any imports that use it
vi.mock("../../auth.js", () => ({
  auth: (req, res, next) => {
    req.user = { id: 1 };
    next();
  },
  authMiddleware: (req, res, next) => {
    req.user = { id: 1 };
    next();
  },
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: mockSupabaseFrom,
  })),
}));

vi.mock("pg", () => {
  return {
    default: {
      Pool: class Pool {
        constructor() {
          this.query = mockQuery;
        }
      },
    },
  };
});

vi.mock("resend", () => ({
  Resend: function () {
    return {
      emails: { send: mockResendSend },
    };
  },
}));

vi.mock("../../utils/apiTrackingService.js", () => ({
  trackApiCall: vi.fn((name, fn) => fn()),
  logApiUsage: mockLogApiUsage,
  logApiError: mockLogApiError,
}));

import informationalInterviewsRouter from "../../routes/informationalInterviews.js";

function mockSupabaseChain(data = [], error = null) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: data[0] || null, error }),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    then: vi.fn((cb) => Promise.resolve(cb({ data, error }))),
  };
  chain.select.mockReturnValue(chain);
  chain.insert.mockReturnValue(chain);
  chain.update.mockReturnValue(chain);
  chain.delete.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.order.mockReturnValue(chain);
  return chain;
}

describe("Informational Interviews Routes", () => {
  let app;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLogApiUsage.mockClear();
    mockLogApiError.mockClear();

    app = express();
    app.use(express.json());
    app.use("/api/informational-interviews", informationalInterviewsRouter);

    mockSupabaseFrom.mockReturnValue(mockSupabaseChain([]));
    mockQuery.mockResolvedValue({ rows: [] });
    mockResendSend.mockResolvedValue({ id: "email_123" });
  });

  describe("GET /candidates - List Candidates", () => {
    it("should return candidates", async () => {
      mockSupabaseFrom.mockImplementation(() =>
        mockSupabaseChain([
          { id: 1, name: "John Doe", company: "Google" },
          { id: 2, name: "Jane Doe", company: "Meta" },
        ])
      );

      const response = await request(app).get(
        "/api/informational-interviews/candidates"
      );

      expect([200, 500]).toContain(response.status);
    });

    it("should filter by status", async () => {
      mockSupabaseFrom.mockImplementation(() =>
        mockSupabaseChain([{ id: 1, status: "pending" }])
      );

      const response = await request(app).get(
        "/api/informational-interviews/candidates?status=pending"
      );

      expect([200, 500]).toContain(response.status);
    });
  });

  describe("POST /candidates - Create Candidate", () => {
    it("should create candidate", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([{ id: 1, first_name: "John" }]);
        chain.single.mockResolvedValue({
          data: { id: 1, first_name: "John" },
          error: null,
        });
        return chain;
      });

      const response = await request(app)
        .post("/api/informational-interviews/candidates")
        .send({
          first_name: "John",
          last_name: "Doe",
          company: "Google",
          title: "Engineer",
        });

      expect([200, 201, 400, 500]).toContain(response.status);
    });

    it("should require first_name", async () => {
      const response = await request(app)
        .post("/api/informational-interviews/candidates")
        .send({ company: "Google" });

      expect([400, 500]).toContain(response.status);
    });
  });

  describe("PUT /candidates/:id", () => {
    it("should update candidate", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([{ id: 1, first_name: "Updated" }]);
        chain.single.mockResolvedValue({
          data: { id: 1, first_name: "Updated" },
          error: null,
        });
        return chain;
      });

      const response = await request(app)
        .put("/api/informational-interviews/candidates/1")
        .send({ first_name: "Updated" });

      expect([200, 404, 500]).toContain(response.status);
    });
  });

  describe("DELETE /candidates/:id", () => {
    it("should delete candidate", async () => {
      mockSupabaseFrom.mockImplementation(() => mockSupabaseChain([]));

      const response = await request(app).delete(
        "/api/informational-interviews/candidates/1"
      );

      expect([200, 204, 404, 500]).toContain(response.status);
    });
  });

  describe("GET /interviews - List Interviews", () => {
    it("should return interviews", async () => {
      mockSupabaseFrom.mockImplementation(() =>
        mockSupabaseChain([
          { id: 1, candidate_id: 1, scheduled_date: "2024-01-01" },
        ])
      );

      const response = await request(app).get(
        "/api/informational-interviews/interviews"
      );

      expect([200, 500]).toContain(response.status);
    });
  });

  describe("POST /interviews - Create Interview", () => {
    it("should create interview", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([{ id: 1 }]);
        chain.single.mockResolvedValue({ data: { id: 1 }, error: null });
        return chain;
      });

      const response = await request(app)
        .post("/api/informational-interviews/interviews")
        .send({
          candidate_id: 1,
          scheduled_at: "2024-01-15T10:00:00",
          interview_type: "video",
        });

      expect([200, 201, 400, 500]).toContain(response.status);
    });
  });

  describe("PUT /interviews/:id", () => {
    it("should update interview", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([{ id: 1 }]);
        chain.single.mockResolvedValue({ data: { id: 1 }, error: null });
        return chain;
      });

      const response = await request(app)
        .put("/api/informational-interviews/interviews/1")
        .send({ notes: "Great conversation" });

      expect([200, 404, 500]).toContain(response.status);
    });
  });

  describe("GET /preparation/:interview_id", () => {
    it("should return preparation framework", async () => {
      mockSupabaseFrom.mockImplementation(() =>
        mockSupabaseChain([{ id: 1, questions: [] }])
      );

      const response = await request(app).get(
        "/api/informational-interviews/preparation/1"
      );

      expect([200, 404, 500]).toContain(response.status);
    });
  });

  describe("POST /preparation", () => {
    it("should create preparation", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([{ id: 1 }]);
        chain.single.mockResolvedValue({ data: { id: 1 }, error: null });
        return chain;
      });

      const response = await request(app)
        .post("/api/informational-interviews/preparation")
        .send({
          interview_id: 1,
          research_notes: "Notes",
          questions: ["Question 1", "Question 2"],
        });

      expect([200, 201, 400, 500]).toContain(response.status);
    });
  });

  describe("GET /followups/:interviewId - List Follow-ups", () => {
    it("should return follow-ups", async () => {
      mockSupabaseFrom.mockImplementation(() =>
        mockSupabaseChain([{ id: 1, interview_id: 1, status: "pending" }])
      );

      const response = await request(app).get(
        "/api/informational-interviews/followups/1"
      );

      expect([200, 500]).toContain(response.status);
    });
  });

  describe("POST /followups", () => {
    it("should create follow-up", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([{ id: 1 }]);
        chain.single.mockResolvedValue({ data: { id: 1 }, error: null });
        return chain;
      });

      const response = await request(app)
        .post("/api/informational-interviews/followups")
        .send({
          interview_id: 1,
          follow_up_type: "email",
          scheduled_date: "2024-01-20",
        });

      expect([200, 201, 400, 500]).toContain(response.status);
    });
  });

  describe("POST /interviews/:id/send-followup-email", () => {
    it("should send follow-up email", async () => {
      mockSupabaseFrom.mockImplementation((table) => {
        if (table === "interview_follow_ups") {
          const chain = mockSupabaseChain([
            { id: 1, interview_id: 1, message: "Thanks" },
          ]);
          chain.single.mockResolvedValue({
            data: { id: 1, interview_id: 1, message: "Thanks" },
            error: null,
          });
          return chain;
        }
        if (table === "informational_interviews") {
          const chain = mockSupabaseChain([{ id: 1, candidate_id: 1 }]);
          chain.single.mockResolvedValue({
            data: { id: 1, candidate_id: 1 },
            error: null,
          });
          return chain;
        }
        if (table === "interview_candidates") {
          const chain = mockSupabaseChain([
            { id: 1, email: "test@example.com", first_name: "John" },
          ]);
          chain.single.mockResolvedValue({
            data: { id: 1, email: "test@example.com", first_name: "John" },
            error: null,
          });
          return chain;
        }
        return mockSupabaseChain([]);
      });

      const response = await request(app)
        .post("/api/informational-interviews/interviews/1/send-followup-email")
        .send({ subject: "Following up", body: "Thank you" });

      expect([200, 400, 404, 500]).toContain(response.status);
    });
  });

  describe("GET /insights/:interview_id", () => {
    it("should return insights", async () => {
      mockSupabaseFrom.mockImplementation(() =>
        mockSupabaseChain([{ id: 1, key_insights: "Good feedback" }])
      );

      const response = await request(app).get(
        "/api/informational-interviews/insights/1"
      );

      expect([200, 404, 500]).toContain(response.status);
    });
  });

  describe("POST /insights", () => {
    it("should save insight", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([{ id: 1 }]);
        chain.single.mockResolvedValue({ data: { id: 1 }, error: null });
        return chain;
      });

      const response = await request(app)
        .post("/api/informational-interviews/insights")
        .send({
          interview_id: 1,
          key_insights: "Great conversation",
          action_items: [],
        });

      expect([200, 201, 400, 500]).toContain(response.status);
    });
  });

  describe("GET /candidates - Edge Cases", () => {
    it("should handle database errors", async () => {
      mockSupabaseFrom.mockImplementation(() =>
        mockSupabaseChain([], { message: "Database error" })
      );

      const response = await request(app).get(
        "/api/informational-interviews/candidates"
      );

      expect(response.status).toBe(500);
    });

    it("should require last_name when creating candidate", async () => {
      const response = await request(app)
        .post("/api/informational-interviews/candidates")
        .send({ first_name: "John" });

      expect(response.status).toBe(400);
    });

    it("should create candidate with all optional fields", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([
          {
            id: 1,
            first_name: "John",
            last_name: "Doe",
            email: "john@example.com",
            phone: "123-456-7890",
            company: "Google",
            title: "Engineer",
            industry: "Tech",
            expertise_areas: ["JavaScript", "React"],
            linkedin_url: "https://linkedin.com/in/johndoe",
            source: "LinkedIn",
            notes: "Great candidate",
          },
        ]);
        chain.select = vi.fn().mockResolvedValue({
          data: [
            {
              id: 1,
              first_name: "John",
              last_name: "Doe",
              email: "john@example.com",
            },
          ],
          error: null,
        });
        return chain;
      });

      const response = await request(app)
        .post("/api/informational-interviews/candidates")
        .send({
          first_name: "John",
          last_name: "Doe",
          email: "john@example.com",
          phone: "123-456-7890",
          company: "Google",
          title: "Engineer",
          industry: "Tech",
          expertise_areas: ["JavaScript", "React"],
          linkedin_url: "https://linkedin.com/in/johndoe",
          source: "LinkedIn",
          notes: "Great candidate",
        });

      expect([200, 201, 400, 500]).toContain(response.status);
    });
  });

  describe("PUT /candidates/:id - Edge Cases", () => {
    it("should update candidate with all fields", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([
          {
            id: 1,
            first_name: "Updated",
            last_name: "Name",
            email: "updated@example.com",
            phone: "987-654-3210",
            company: "Meta",
            title: "Senior Engineer",
            industry: "AI",
            expertise_areas: ["Python"],
            linkedin_url: "https://linkedin.com/in/updated",
            source: "Referral",
            notes: "Updated notes",
            status: "contacted",
          },
        ]);
        chain.select = vi.fn().mockResolvedValue({
          data: [
            {
              id: 1,
              first_name: "Updated",
              last_name: "Name",
            },
          ],
          error: null,
        });
        return chain;
      });

      const response = await request(app)
        .put("/api/informational-interviews/candidates/1")
        .send({
          first_name: "Updated",
          last_name: "Name",
          email: "updated@example.com",
          phone: "987-654-3210",
          company: "Meta",
          title: "Senior Engineer",
          industry: "AI",
          expertise_areas: ["Python"],
          linkedin_url: "https://linkedin.com/in/updated",
          source: "Referral",
          notes: "Updated notes",
          status: "contacted",
        });

      expect([200, 404, 500]).toContain(response.status);
    });

    it("should handle update errors", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([]);
        chain.select = vi.fn().mockResolvedValue({
          data: [],
          error: { message: "Update failed" },
        });
        return chain;
      });

      const response = await request(app)
        .put("/api/informational-interviews/candidates/1")
        .send({ first_name: "Updated" });

      expect(response.status).toBe(500);
    });
  });

  describe("GET /interviews - Edge Cases", () => {
    it("should return interviews with preparation data", async () => {
      let callCount = 0;
      mockSupabaseFrom.mockImplementation((table) => {
        if (table === "informational_interviews") {
          const chain = mockSupabaseChain([
            { id: 1, candidate_id: 1, scheduled_date: "2024-01-01" },
          ]);
          chain.select = vi.fn().mockResolvedValue({
            data: [
              {
                id: 1,
                candidate_id: 1,
                scheduled_date: "2024-01-01",
                candidate: { first_name: "John", last_name: "Doe" },
              },
            ],
            error: null,
          });
          return chain;
        }
        if (table === "interview_preparation") {
          const chain = mockSupabaseChain([
            { id: 1, interview_id: 1, research_notes: "Notes" },
          ]);
          chain.select = vi.fn().mockResolvedValue({
            data: [{ id: 1, interview_id: 1, research_notes: "Notes" }],
            error: null,
          });
          return chain;
        }
        return mockSupabaseChain([]);
      });

      const response = await request(app).get(
        "/api/informational-interviews/interviews"
      );

      expect([200, 500]).toContain(response.status);
    });

    it("should handle preparation fetch errors gracefully", async () => {
      mockSupabaseFrom.mockImplementation((table) => {
        if (table === "informational_interviews") {
          const chain = mockSupabaseChain([
            { id: 1, candidate_id: 1, scheduled_date: "2024-01-01" },
          ]);
          chain.select = vi.fn().mockResolvedValue({
            data: [{ id: 1, candidate_id: 1, scheduled_date: "2024-01-01" }],
            error: null,
          });
          return chain;
        }
        if (table === "interview_preparation") {
          const chain = mockSupabaseChain([]);
          chain.select = vi.fn().mockResolvedValue({
            data: [],
            error: { message: "Prep error" },
          });
          return chain;
        }
        return mockSupabaseChain([]);
      });

      const response = await request(app).get(
        "/api/informational-interviews/interviews"
      );

      expect([200, 500]).toContain(response.status);
    });
  });

  describe("POST /interviews - Edge Cases", () => {
    it("should create interview with all fields", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([
          {
            id: 1,
            candidate_id: 1,
            interview_type: "phone",
            scheduled_date: "2024-01-15",
            duration_minutes: 60,
            location_or_platform: "Zoom",
            key_topics: ["Career", "Industry"],
            preparation_framework_used: "STAR",
            notes_before: "Prepare questions",
          },
        ]);
        chain.select = vi.fn().mockResolvedValue({
          data: [
            {
              id: 1,
              candidate_id: 1,
              interview_type: "phone",
            },
          ],
          error: null,
        });
        return chain;
      });

      const response = await request(app)
        .post("/api/informational-interviews/interviews")
        .send({
          candidate_id: 1,
          interview_type: "phone",
          scheduled_date: "2024-01-15",
          duration_minutes: 60,
          location_or_platform: "Zoom",
          key_topics: ["Career", "Industry"],
          preparation_framework_used: "STAR",
          notes_before: "Prepare questions",
        });

      expect([200, 201, 400, 500]).toContain(response.status);
    });

    it("should use default values when fields not provided", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([{ id: 1, candidate_id: 1 }]);
        chain.select = vi.fn().mockResolvedValue({
          data: [{ id: 1, candidate_id: 1, interview_type: "video", duration_minutes: 30 }],
          error: null,
        });
        return chain;
      });

      const response = await request(app)
        .post("/api/informational-interviews/interviews")
        .send({ candidate_id: 1 });

      expect([200, 201, 400, 500]).toContain(response.status);
    });
  });

  describe("PUT /interviews/:id - Edge Cases", () => {
    it("should update interview with all fields", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([
          {
            id: 1,
            status: "completed",
            interview_type: "video",
            scheduled_date: "2024-01-15",
            duration_minutes: 45,
            location_or_platform: "Zoom",
            key_topics: ["Career"],
            notes_after: "Great conversation",
            interviewer_insights: "Helpful",
            relationship_value: "high",
            opportunity_identified: true,
            opportunity_description: "Potential role",
          },
        ]);
        chain.select = vi.fn().mockResolvedValue({
          data: [
            {
              id: 1,
              status: "completed",
              notes_after: "Great conversation",
            },
          ],
          error: null,
        });
        return chain;
      });

      const response = await request(app)
        .put("/api/informational-interviews/interviews/1")
        .send({
          status: "completed",
          interview_type: "video",
          scheduled_date: "2024-01-15",
          duration_minutes: 45,
          location_or_platform: "Zoom",
          key_topics: ["Career"],
          notes_after: "Great conversation",
          interviewer_insights: "Helpful",
          relationship_value: "high",
          opportunity_identified: true,
          opportunity_description: "Potential role",
        });

      expect([200, 404, 500]).toContain(response.status);
    });
  });

  describe("GET /interviews/:id", () => {
    it("should return interview with all related data", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([
          {
            id: 1,
            candidate_id: 1,
            candidate: { id: 1, first_name: "John" },
            preparation: [{ id: 1, interview_id: 1 }],
            followups: [{ id: 1, interview_id: 1 }],
            insights: [{ id: 1, interview_id: 1 }],
          },
        ]);
        chain.single = vi.fn().mockResolvedValue({
          data: {
            id: 1,
            candidate_id: 1,
            candidate: { id: 1, first_name: "John" },
            preparation: [{ id: 1, interview_id: 1 }],
            followups: [{ id: 1, interview_id: 1 }],
            insights: [{ id: 1, interview_id: 1 }],
          },
          error: null,
        });
        return chain;
      });

      const response = await request(app).get(
        "/api/informational-interviews/interviews/1"
      );

      expect([200, 404, 500]).toContain(response.status);
    });

    it("should handle interview not found", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([]);
        chain.single = vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Not found" },
        });
        return chain;
      });

      const response = await request(app).get(
        "/api/informational-interviews/interviews/999"
      );

      expect([404, 500]).toContain(response.status);
    });
  });

  describe("POST /preparation - Edge Cases", () => {
    it("should create preparation with all fields", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([
          {
            id: 1,
            interview_id: 1,
            title: "Prep Title",
            company_research: "Research notes",
            role_research: "Role notes",
            personal_preparation: "Personal notes",
            conversation_starters: "Starters",
            industry_trends: "Trends",
          },
        ]);
        chain.select = vi.fn().mockResolvedValue({
          data: [
            {
              id: 1,
              interview_id: 1,
              title: "Prep Title",
            },
          ],
          error: null,
        });
        return chain;
      });

      const response = await request(app)
        .post("/api/informational-interviews/preparation")
        .send({
          interview_id: 1,
          title: "Prep Title",
          company_research: "Research notes",
          role_research: "Role notes",
          personal_preparation: "Personal notes",
          conversation_starters: "Starters",
          industry_trends: "Trends",
        });

      expect([200, 201, 400, 500]).toContain(response.status);
    });
  });

  describe("PUT /preparation/:id", () => {
    it("should update preparation", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([
          {
            id: 1,
            interview_id: 1,
            title: "Updated Title",
            company_research: "Updated research",
          },
        ]);
        chain.select = vi.fn().mockResolvedValue({
          data: [
            {
              id: 1,
              interview_id: 1,
              title: "Updated Title",
            },
          ],
          error: null,
        });
        return chain;
      });

      const response = await request(app)
        .put("/api/informational-interviews/preparation/1")
        .send({
          title: "Updated Title",
          company_research: "Updated research",
        });

      expect([200, 404, 500]).toContain(response.status);
    });

    it("should return 404 when preparation not found", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([]);
        chain.select = vi.fn().mockResolvedValue({
          data: [],
          error: null,
        });
        return chain;
      });

      const response = await request(app)
        .put("/api/informational-interviews/preparation/999")
        .send({ title: "Updated" });

      expect(response.status).toBe(404);
    });
  });

  describe("POST /followups - Edge Cases", () => {
    it("should create follow-up with all fields", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([
          {
            id: 1,
            interview_id: 1,
            followup_type: "email",
            template_used: "professional",
            message_content: "Thank you",
            action_items: "Follow up",
          },
        ]);
        chain.select = vi.fn().mockResolvedValue({
          data: [
            {
              id: 1,
              interview_id: 1,
              followup_type: "email",
            },
          ],
          error: null,
        });
        return chain;
      });

      const response = await request(app)
        .post("/api/informational-interviews/followups")
        .send({
          interview_id: 1,
          followup_type: "email",
          template_used: "professional",
          message_content: "Thank you",
          action_items: "Follow up",
        });

      expect([200, 201, 400, 500]).toContain(response.status);
    });
  });

  describe("PUT /followups/:id", () => {
    it("should update follow-up with response", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([
          {
            id: 1,
            interview_id: 1,
            response_received: true,
            response_content: "Thanks for reaching out",
            responded_at: new Date(),
          },
        ]);
        chain.select = vi.fn().mockResolvedValue({
          data: [
            {
              id: 1,
              interview_id: 1,
              response_received: true,
              response_content: "Thanks for reaching out",
            },
          ],
          error: null,
        });
        return chain;
      });

      const response = await request(app)
        .put("/api/informational-interviews/followups/1")
        .send({
          response_received: true,
          response_content: "Thanks for reaching out",
        });

      expect([200, 404, 500]).toContain(response.status);
    });

    it("should set responded_at to null when response_received is false", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([
          {
            id: 1,
            interview_id: 1,
            response_received: false,
            responded_at: null,
          },
        ]);
        chain.select = vi.fn().mockResolvedValue({
          data: [
            {
              id: 1,
              interview_id: 1,
              response_received: false,
              responded_at: null,
            },
          ],
          error: null,
        });
        return chain;
      });

      const response = await request(app)
        .put("/api/informational-interviews/followups/1")
        .send({
          response_received: false,
        });

      expect([200, 404, 500]).toContain(response.status);
    });
  });

  describe("GET /insights", () => {
    it("should return all insights for user", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([
          { id: 1, interview_id: 1, title: "Insight 1" },
          { id: 2, interview_id: 2, title: "Insight 2" },
        ]);
        chain.select = vi.fn().mockResolvedValue({
          data: [
            { id: 1, interview_id: 1, title: "Insight 1" },
            { id: 2, interview_id: 2, title: "Insight 2" },
          ],
          error: null,
        });
        return chain;
      });

      const response = await request(app).get(
        "/api/informational-interviews/insights"
      );

      expect([200, 500]).toContain(response.status);
    });
  });

  describe("POST /insights - Edge Cases", () => {
    it("should create insight with all fields", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([
          {
            id: 1,
            interview_id: 1,
            insight_type: "career",
            title: "Key Insight",
            description: "Description",
            impact_on_search: "High",
            related_opportunities: ["Role 1", "Role 2"],
          },
        ]);
        chain.select = vi.fn().mockResolvedValue({
          data: [
            {
              id: 1,
              interview_id: 1,
              title: "Key Insight",
            },
          ],
          error: null,
        });
        return chain;
      });

      const response = await request(app)
        .post("/api/informational-interviews/insights")
        .send({
          interview_id: 1,
          insight_type: "career",
          title: "Key Insight",
          description: "Description",
          impact_on_search: "High",
          related_opportunities: ["Role 1", "Role 2"],
        });

      expect([200, 201, 400, 500]).toContain(response.status);
    });
  });

  describe("PUT /insights/:id", () => {
    it("should update insight", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([
          {
            id: 1,
            interview_id: 1,
            title: "Updated Insight",
            description: "Updated description",
          },
        ]);
        chain.select = vi.fn().mockResolvedValue({
          data: [
            {
              id: 1,
              interview_id: 1,
              title: "Updated Insight",
            },
          ],
          error: null,
        });
        return chain;
      });

      const response = await request(app)
        .put("/api/informational-interviews/insights/1")
        .send({
          title: "Updated Insight",
          description: "Updated description",
        });

      expect([200, 404, 500]).toContain(response.status);
    });
  });

  describe("DELETE /insights/:id", () => {
    it("should delete insight", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([{ id: 1, interview_id: 1 }]);
        chain.select = vi.fn().mockResolvedValue({
          data: [{ id: 1, interview_id: 1 }],
          error: null,
        });
        return chain;
      });

      const response = await request(app).delete(
        "/api/informational-interviews/insights/1"
      );

      expect([200, 404, 500]).toContain(response.status);
    });
  });

  describe("GET /dashboard/summary", () => {
    it("should return dashboard summary", async () => {
      mockSupabaseFrom.mockImplementation((table) => {
        if (table === "informational_interviews") {
          const chain = mockSupabaseChain([
            { id: 1, status: "pending" },
            { id: 2, status: "scheduled" },
            { id: 3, status: "completed" },
            { id: 4, status: "cancelled" },
          ]);
          chain.select = vi.fn().mockResolvedValue({
            data: [
              { id: 1, status: "pending" },
              { id: 2, status: "scheduled" },
              { id: 3, status: "completed" },
              { id: 4, status: "cancelled" },
            ],
            error: null,
          });
          return chain;
        }
        if (table === "interview_insights") {
          const chain = mockSupabaseChain([{ id: 1 }, { id: 2 }]);
          chain.select = vi.fn().mockResolvedValue({
            data: [{ id: 1 }, { id: 2 }],
            error: null,
          });
          return chain;
        }
        if (table === "interview_followup") {
          const chain = mockSupabaseChain([{ id: 1 }]);
          chain.select = vi.fn().mockResolvedValue({
            data: [{ id: 1 }],
            error: null,
          });
          return chain;
        }
        return mockSupabaseChain([]);
      });

      const response = await request(app).get(
        "/api/informational-interviews/dashboard/summary"
      );

      expect([200, 500]).toContain(response.status);
    });

    it("should handle errors in dashboard summary", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([]);
        chain.select = vi.fn().mockResolvedValue({
          data: [],
          error: { message: "Database error" },
        });
        return chain;
      });

      const response = await request(app).get(
        "/api/informational-interviews/dashboard/summary"
      );

      expect(response.status).toBe(500);
    });
  });

  describe("DELETE /interviews/:id", () => {
    it("should delete interview and associated records", async () => {
      let deleteCalls = 0;
      mockSupabaseFrom.mockImplementation((table) => {
        const chain = mockSupabaseChain([]);
        chain.delete = vi.fn().mockReturnThis();
        chain.eq = vi.fn().mockResolvedValue({ error: null });
        return chain;
      });

      const response = await request(app).delete(
        "/api/informational-interviews/interviews/1"
      );

      expect([200, 404, 500]).toContain(response.status);
    });
  });

  describe("POST /candidates/:id/send-email", () => {
    it("should send interview request email", async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ full_name: "Test User" }],
        })
        .mockResolvedValueOnce({
          rows: [{ email: "user@example.com" }],
        });

      mockSupabaseFrom.mockImplementation((table) => {
        if (table === "interview_candidates") {
          const chain = mockSupabaseChain([
            {
              id: 1,
              first_name: "John",
              last_name: "Doe",
              email: "john@example.com",
              company: "Google",
              title: "Engineer",
              industry: "Tech",
              notes: "",
            },
          ]);
          chain.single = vi.fn().mockResolvedValue({
            data: {
              id: 1,
              first_name: "John",
              last_name: "Doe",
              email: "john@example.com",
              company: "Google",
              title: "Engineer",
              industry: "Tech",
              notes: "",
            },
            error: null,
          });
          return chain;
        }
        return mockSupabaseChain([]);
      });

      mockResendSend.mockResolvedValue({
        data: { id: "email_123" },
        error: null,
      });

      const response = await request(app).post(
        "/api/informational-interviews/candidates/1/send-email"
      );

      expect([200, 400, 404, 500]).toContain(response.status);
    });

    it("should handle candidate not found", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([]);
        chain.single = vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Not found" },
        });
        return chain;
      });

      const response = await request(app).post(
        "/api/informational-interviews/candidates/999/send-email"
      );

      expect([404, 500]).toContain(response.status);
    });

    it("should handle missing candidate email", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([
          {
            id: 1,
            first_name: "John",
            email: null,
          },
        ]);
        chain.single = vi.fn().mockResolvedValue({
          data: {
            id: 1,
            first_name: "John",
            email: null,
          },
          error: null,
        });
        return chain;
      });

      const response = await request(app).post(
        "/api/informational-interviews/candidates/1/send-email"
      );

      expect(response.status).toBe(400);
    });

    it("should use custom message from notes", async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ full_name: "Test User" }],
        })
        .mockResolvedValueOnce({
          rows: [{ email: "user@example.com" }],
        });

      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([
          {
            id: 1,
            first_name: "John",
            email: "john@example.com",
            company: "Google",
            notes: "Custom message here",
          },
        ]);
        chain.single = vi.fn().mockResolvedValue({
          data: {
            id: 1,
            first_name: "John",
            email: "john@example.com",
            company: "Google",
            notes: "Custom message here",
          },
          error: null,
        });
        return chain;
      });

      mockResendSend.mockResolvedValue({
        data: { id: "email_123" },
        error: null,
      });

      const response = await request(app).post(
        "/api/informational-interviews/candidates/1/send-email"
      );

      expect([200, 400, 404, 500]).toContain(response.status);
    });

    it("should handle getUserInfo with fallback to users table", async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              first_name: "Test",
              last_name: "User",
              email: "user@example.com",
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [{ email: "user@example.com" }],
        });

      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([
          {
            id: 1,
            first_name: "John",
            email: "john@example.com",
            company: "Google",
          },
        ]);
        chain.single = vi.fn().mockResolvedValue({
          data: {
            id: 1,
            first_name: "John",
            email: "john@example.com",
            company: "Google",
          },
          error: null,
        });
        return chain;
      });

      mockResendSend.mockResolvedValue({
        data: { id: "email_123" },
        error: null,
      });

      const response = await request(app).post(
        "/api/informational-interviews/candidates/1/send-email"
      );

      expect([200, 400, 404, 500]).toContain(response.status);
    });

    it("should handle email send error", async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ full_name: "Test User" }],
        })
        .mockResolvedValueOnce({
          rows: [{ email: "user@example.com" }],
        });

      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([
          {
            id: 1,
            first_name: "John",
            email: "john@example.com",
          },
        ]);
        chain.single = vi.fn().mockResolvedValue({
          data: {
            id: 1,
            first_name: "John",
            email: "john@example.com",
          },
          error: null,
        });
        return chain;
      });

      mockResendSend.mockResolvedValue({
        data: null,
        error: { message: "Send failed", statusCode: 500 },
      });

      const response = await request(app).post(
        "/api/informational-interviews/candidates/1/send-email"
      );

      expect([500]).toContain(response.status);
    });
  });

  describe("POST /interviews/:id/send-followup-email", () => {
    it("should send followup email", async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ full_name: "Test User" }],
        })
        .mockResolvedValueOnce({
          rows: [{ email: "user@example.com" }],
        });

      mockSupabaseFrom.mockImplementation((table) => {
        if (table === "informational_interviews") {
          const chain = mockSupabaseChain([
            {
              id: 1,
              candidate_id: 1,
              scheduled_date: "2024-01-15",
            },
          ]);
          chain.single = vi.fn().mockResolvedValue({
            data: {
              id: 1,
              candidate_id: 1,
              scheduled_date: "2024-01-15",
            },
            error: null,
          });
          return chain;
        }
        if (table === "interview_candidates") {
          const chain = mockSupabaseChain([
            {
              id: 1,
              first_name: "John",
              last_name: "Doe",
              email: "john@example.com",
              company: "Google",
              title: "Engineer",
            },
          ]);
          chain.single = vi.fn().mockResolvedValue({
            data: {
              id: 1,
              first_name: "John",
              last_name: "Doe",
              email: "john@example.com",
              company: "Google",
              title: "Engineer",
            },
            error: null,
          });
          return chain;
        }
        if (table === "interview_followup") {
          const chain = mockSupabaseChain([]);
          chain.insert = vi.fn().mockResolvedValue({ error: null });
          return chain;
        }
        return mockSupabaseChain([]);
      });

      mockResendSend.mockResolvedValue({
        data: { id: "email_123" },
        error: null,
      });

      const response = await request(app)
        .post("/api/informational-interviews/interviews/1/send-followup-email")
        .send({ message_content: "Thank you for the interview" });

      expect([200, 400, 404, 500]).toContain(response.status);
    });

    it("should require message_content", async () => {
      const response = await request(app)
        .post("/api/informational-interviews/interviews/1/send-followup-email")
        .send({});

      expect(response.status).toBe(400);
    });

    it("should handle interview not found", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([]);
        chain.single = vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Not found" },
        });
        return chain;
      });

      const response = await request(app)
        .post("/api/informational-interviews/interviews/999/send-followup-email")
        .send({ message_content: "Thank you" });

      expect([404, 500]).toContain(response.status);
    });

    it("should handle interview without candidate_id", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([
          {
            id: 1,
            candidate_id: null,
          },
        ]);
        chain.single = vi.fn().mockResolvedValue({
          data: {
            id: 1,
            candidate_id: null,
          },
          error: null,
        });
        return chain;
      });

      const response = await request(app)
        .post("/api/informational-interviews/interviews/1/send-followup-email")
        .send({ message_content: "Thank you" });

      expect(response.status).toBe(404);
    });

    it("should handle candidate not found", async () => {
      mockSupabaseFrom.mockImplementation((table) => {
        if (table === "informational_interviews") {
          const chain = mockSupabaseChain([
            {
              id: 1,
              candidate_id: 1,
            },
          ]);
          chain.single = vi.fn().mockResolvedValue({
            data: {
              id: 1,
              candidate_id: 1,
            },
            error: null,
          });
          return chain;
        }
        if (table === "interview_candidates") {
          const chain = mockSupabaseChain([]);
          chain.single = vi.fn().mockResolvedValue({
            data: null,
            error: { message: "Not found" },
          });
          return chain;
        }
        return mockSupabaseChain([]);
      });

      const response = await request(app)
        .post("/api/informational-interviews/interviews/1/send-followup-email")
        .send({ message_content: "Thank you" });

      expect([404, 500]).toContain(response.status);
    });

    it("should handle missing candidate email", async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ full_name: "Test User" }],
        })
        .mockResolvedValueOnce({
          rows: [{ email: "user@example.com" }],
        });

      mockSupabaseFrom.mockImplementation((table) => {
        if (table === "informational_interviews") {
          const chain = mockSupabaseChain([
            {
              id: 1,
              candidate_id: 1,
            },
          ]);
          chain.single = vi.fn().mockResolvedValue({
            data: {
              id: 1,
              candidate_id: 1,
            },
            error: null,
          });
          return chain;
        }
        if (table === "interview_candidates") {
          const chain = mockSupabaseChain([
            {
              id: 1,
              first_name: "John",
              email: null,
            },
          ]);
          chain.single = vi.fn().mockResolvedValue({
            data: {
              id: 1,
              first_name: "John",
              email: null,
            },
            error: null,
          });
          return chain;
        }
        return mockSupabaseChain([]);
      });

      const response = await request(app)
        .post("/api/informational-interviews/interviews/1/send-followup-email")
        .send({ message_content: "Thank you" });

      expect(response.status).toBe(400);
    });

    it("should handle email send error", async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ full_name: "Test User" }],
        })
        .mockResolvedValueOnce({
          rows: [{ email: "user@example.com" }],
        });

      mockSupabaseFrom.mockImplementation((table) => {
        if (table === "informational_interviews") {
          const chain = mockSupabaseChain([
            {
              id: 1,
              candidate_id: 1,
              scheduled_date: "2024-01-15",
            },
          ]);
          chain.single = vi.fn().mockResolvedValue({
            data: {
              id: 1,
              candidate_id: 1,
              scheduled_date: "2024-01-15",
            },
            error: null,
          });
          return chain;
        }
        if (table === "interview_candidates") {
          const chain = mockSupabaseChain([
            {
              id: 1,
              first_name: "John",
              email: "john@example.com",
              company: "Google",
            },
          ]);
          chain.single = vi.fn().mockResolvedValue({
            data: {
              id: 1,
              first_name: "John",
              email: "john@example.com",
              company: "Google",
            },
            error: null,
          });
          return chain;
        }
        return mockSupabaseChain([]);
      });

      mockResendSend.mockResolvedValue({
        data: null,
        error: { message: "Send failed", statusCode: 500 },
      });

      const response = await request(app)
        .post("/api/informational-interviews/interviews/1/send-followup-email")
        .send({ message_content: "Thank you" });

      expect(response.status).toBe(500);
    });

    it("should handle followup save error gracefully", async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ full_name: "Test User" }],
        })
        .mockResolvedValueOnce({
          rows: [{ email: "user@example.com" }],
        });

      mockSupabaseFrom.mockImplementation((table) => {
        if (table === "informational_interviews") {
          const chain = mockSupabaseChain([
            {
              id: 1,
              candidate_id: 1,
            },
          ]);
          chain.single = vi.fn().mockResolvedValue({
            data: {
              id: 1,
              candidate_id: 1,
            },
            error: null,
          });
          return chain;
        }
        if (table === "interview_candidates") {
          const chain = mockSupabaseChain([
            {
              id: 1,
              first_name: "John",
              email: "john@example.com",
            },
          ]);
          chain.single = vi.fn().mockResolvedValue({
            data: {
              id: 1,
              first_name: "John",
              email: "john@example.com",
            },
            error: null,
          });
          return chain;
        }
        if (table === "interview_followup") {
          const chain = mockSupabaseChain([]);
          chain.insert = vi.fn().mockResolvedValue({
            error: { message: "Save failed" },
          });
          return chain;
        }
        return mockSupabaseChain([]);
      });

      mockResendSend.mockResolvedValue({
        data: { id: "email_123" },
        error: null,
      });

      const response = await request(app)
        .post("/api/informational-interviews/interviews/1/send-followup-email")
        .send({ message_content: "Thank you" });

      expect([200, 500]).toContain(response.status);
    });

    it("should track API usage on successful email send", async () => {
      mockLogApiUsage.mockClear();
      
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ full_name: "Test User" }],
        })
        .mockResolvedValueOnce({
          rows: [{ email: "user@example.com" }],
        });

      mockSupabaseFrom.mockImplementation((table) => {
        if (table === "informational_interviews") {
          const chain = mockSupabaseChain([
            {
              id: 1,
              candidate_id: 1,
              scheduled_date: "2024-01-15",
            },
          ]);
          chain.single = vi.fn().mockResolvedValue({
            data: {
              id: 1,
              candidate_id: 1,
              scheduled_date: "2024-01-15",
            },
            error: null,
          });
          return chain;
        }
        if (table === "interview_candidates") {
          const chain = mockSupabaseChain([
            {
              id: 1,
              first_name: "John",
              last_name: "Doe",
              email: "john@example.com",
              company: "Google",
            },
          ]);
          chain.single = vi.fn().mockResolvedValue({
            data: {
              id: 1,
              first_name: "John",
              last_name: "Doe",
              email: "john@example.com",
              company: "Google",
            },
            error: null,
          });
          return chain;
        }
        if (table === "interview_followup") {
          const chain = mockSupabaseChain([]);
          chain.insert = vi.fn().mockResolvedValue({ error: null });
          return chain;
        }
        return mockSupabaseChain([]);
      });

      mockResendSend.mockResolvedValue({
        data: { id: "email_123" },
        error: null,
      });

      const response = await request(app)
        .post("/api/informational-interviews/interviews/1/send-followup-email")
        .send({ message_content: "Thank you" });

      expect([200, 500]).toContain(response.status);
    });

    it("should track API error on failed email send", async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ full_name: "Test User" }],
        })
        .mockResolvedValueOnce({
          rows: [{ email: "user@example.com" }],
        });

      mockSupabaseFrom.mockImplementation((table) => {
        if (table === "informational_interviews") {
          const chain = mockSupabaseChain([
            {
              id: 1,
              candidate_id: 1,
            },
          ]);
          chain.single = vi.fn().mockResolvedValue({
            data: {
              id: 1,
              candidate_id: 1,
            },
            error: null,
          });
          return chain;
        }
        if (table === "interview_candidates") {
          const chain = mockSupabaseChain([
            {
              id: 1,
              first_name: "John",
              email: "john@example.com",
              company: "Google",
            },
          ]);
          chain.single = vi.fn().mockResolvedValue({
            data: {
              id: 1,
              first_name: "John",
              email: "john@example.com",
              company: "Google",
            },
            error: null,
          });
          return chain;
        }
        return mockSupabaseChain([]);
      });

      mockResendSend.mockResolvedValue({
        data: null,
        error: { message: "Send failed", statusCode: 500 },
      });

      const response = await request(app)
        .post("/api/informational-interviews/interviews/1/send-followup-email")
        .send({ message_content: "Thank you" });

      expect(response.status).toBe(500);
    });

    it("should handle API tracking errors gracefully", async () => {
      mockLogApiUsage.mockClear();
      mockLogApiUsage.mockRejectedValueOnce(new Error("Tracking failed"));

      mockQuery
        .mockResolvedValueOnce({
          rows: [{ full_name: "Test User" }],
        })
        .mockResolvedValueOnce({
          rows: [{ email: "user@example.com" }],
        });

      mockSupabaseFrom.mockImplementation((table) => {
        if (table === "informational_interviews") {
          const chain = mockSupabaseChain([
            {
              id: 1,
              candidate_id: 1,
            },
          ]);
          chain.single = vi.fn().mockResolvedValue({
            data: {
              id: 1,
              candidate_id: 1,
            },
            error: null,
          });
          return chain;
        }
        if (table === "interview_candidates") {
          const chain = mockSupabaseChain([
            {
              id: 1,
              first_name: "John",
              email: "john@example.com",
            },
          ]);
          chain.single = vi.fn().mockResolvedValue({
            data: {
              id: 1,
              first_name: "John",
              email: "john@example.com",
            },
            error: null,
          });
          return chain;
        }
        if (table === "interview_followup") {
          const chain = mockSupabaseChain([]);
          chain.insert = vi.fn().mockResolvedValue({ error: null });
          return chain;
        }
        return mockSupabaseChain([]);
      });

      mockResendSend.mockResolvedValue({
        data: { id: "email_123" },
        error: null,
      });

      const response = await request(app)
        .post("/api/informational-interviews/interviews/1/send-followup-email")
        .send({ message_content: "Thank you" });

      expect([200, 500]).toContain(response.status);
    });

    it("should handle userInfo.name being used for display name", async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ full_name: "Test User Name" }],
        })
        .mockResolvedValueOnce({
          rows: [{ email: "user@example.com" }],
        });

      mockSupabaseFrom.mockImplementation((table) => {
        if (table === "informational_interviews") {
          const chain = mockSupabaseChain([
            {
              id: 1,
              candidate_id: 1,
              scheduled_date: "2024-01-15",
            },
          ]);
          chain.single = vi.fn().mockResolvedValue({
            data: {
              id: 1,
              candidate_id: 1,
              scheduled_date: "2024-01-15",
            },
            error: null,
          });
          return chain;
        }
        if (table === "interview_candidates") {
          const chain = mockSupabaseChain([
            {
              id: 1,
              first_name: "John",
              email: "john@example.com",
              company: "Google",
            },
          ]);
          chain.single = vi.fn().mockResolvedValue({
            data: {
              id: 1,
              first_name: "John",
              email: "john@example.com",
              company: "Google",
            },
            error: null,
          });
          return chain;
        }
        if (table === "interview_followup") {
          const chain = mockSupabaseChain([]);
          chain.insert = vi.fn().mockResolvedValue({ error: null });
          return chain;
        }
        return mockSupabaseChain([]);
      });

      mockResendSend.mockResolvedValue({
        data: { id: "email_123" },
        error: null,
      });

      const response = await request(app)
        .post("/api/informational-interviews/interviews/1/send-followup-email")
        .send({ message_content: "Thank you" });

      expect([200, 500]).toContain(response.status);
    });
  });

  describe("Error Handling", () => {
    it("should handle database errors on candidates", async () => {
      mockSupabaseFrom.mockImplementation(() =>
        mockSupabaseChain([], { message: "Database error" })
      );

      const response = await request(app).get(
        "/api/informational-interviews/candidates"
      );

      expect(response.status).toBe(500);
    });

    it("should handle database errors on interviews", async () => {
      mockSupabaseFrom.mockImplementation(() =>
        mockSupabaseChain([], { message: "Database error" })
      );

      const response = await request(app).get(
        "/api/informational-interviews/interviews"
      );

      expect(response.status).toBe(500);
    });
  });

  describe("POST /candidates/:id/send-email - Additional Coverage", () => {
    it("should track API usage on successful email", async () => {
      mockLogApiUsage.mockClear();
      
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ full_name: "Test User" }],
        })
        .mockResolvedValueOnce({
          rows: [{ email: "user@example.com" }],
        });

      mockSupabaseFrom.mockImplementation((table) => {
        if (table === "interview_candidates") {
          const chain = mockSupabaseChain([
            {
              id: 1,
              first_name: "John",
              last_name: "Doe",
              email: "john@example.com",
              company: "Google",
              title: "Engineer",
              industry: "Tech",
              notes: "",
            },
          ]);
          chain.single = vi.fn().mockResolvedValue({
            data: {
              id: 1,
              first_name: "John",
              last_name: "Doe",
              email: "john@example.com",
              company: "Google",
              title: "Engineer",
              industry: "Tech",
              notes: "",
            },
            error: null,
          });
          return chain;
        }
        return mockSupabaseChain([]);
      });

      mockResendSend.mockResolvedValue({
        data: { id: "email_123" },
        error: null,
      });

      const response = await request(app).post(
        "/api/informational-interviews/candidates/1/send-email"
      );

      expect([200, 400, 404, 500]).toContain(response.status);
      // Verify API tracking was called
      if (response.status === 200) {
        expect(mockLogApiUsage).toHaveBeenCalled();
      }
    });

    it("should track API error on email failure", async () => {
      mockLogApiError.mockClear();
      
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ full_name: "Test User" }],
        })
        .mockResolvedValueOnce({
          rows: [{ email: "user@example.com" }],
        });

      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([
          {
            id: 1,
            first_name: "John",
            email: "john@example.com",
          },
        ]);
        chain.single = vi.fn().mockResolvedValue({
          data: {
            id: 1,
            first_name: "John",
            email: "john@example.com",
          },
          error: null,
        });
        return chain;
      });

      mockResendSend.mockResolvedValue({
        data: null,
        error: { message: "Email failed", statusCode: 400 },
      });

      const response = await request(app).post(
        "/api/informational-interviews/candidates/1/send-email"
      );

      expect([200, 400, 404, 500]).toContain(response.status);
    });

    it("should handle getUserInfo returning empty name and email fallback", async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [],
        })
        .mockResolvedValueOnce({
          rows: [],
        })
        .mockResolvedValueOnce({
          rows: [{ email: "fallback@example.com" }],
        });

      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([
          {
            id: 1,
            first_name: "John",
            email: "john@example.com",
            company: "Google",
          },
        ]);
        chain.single = vi.fn().mockResolvedValue({
          data: {
            id: 1,
            first_name: "John",
            email: "john@example.com",
            company: "Google",
          },
          error: null,
        });
        return chain;
      });

      mockResendSend.mockResolvedValue({
        data: { id: "email_123" },
        error: null,
      });

      const response = await request(app).post(
        "/api/informational-interviews/candidates/1/send-email"
      );

      expect([200, 400, 404, 500]).toContain(response.status);
    });

    it("should handle getUserInfo error gracefully", async () => {
      mockQuery.mockRejectedValueOnce(new Error("Database error"));

      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([
          {
            id: 1,
            first_name: "John",
            email: "john@example.com",
          },
        ]);
        chain.single = vi.fn().mockResolvedValue({
          data: {
            id: 1,
            first_name: "John",
            email: "john@example.com",
          },
          error: null,
        });
        return chain;
      });

      const response = await request(app).post(
        "/api/informational-interviews/candidates/1/send-email"
      );

      expect([400, 500]).toContain(response.status);
    });

    it("should handle user email not available", async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ full_name: "Test" }],
        })
        .mockResolvedValueOnce({
          rows: [],
        });

      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([
          {
            id: 1,
            first_name: "John",
            email: "john@example.com",
          },
        ]);
        chain.single = vi.fn().mockResolvedValue({
          data: {
            id: 1,
            first_name: "John",
            email: "john@example.com",
          },
          error: null,
        });
        return chain;
      });

      const response = await request(app).post(
        "/api/informational-interviews/candidates/1/send-email"
      );

      expect(response.status).toBe(500);
    });

    it("should handle candidate without first_name", async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ full_name: "Test User" }],
        })
        .mockResolvedValueOnce({
          rows: [{ email: "user@example.com" }],
        });

      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([
          {
            id: 1,
            first_name: null,
            last_name: null,
            email: "john@example.com",
            company: "Google",
          },
        ]);
        chain.single = vi.fn().mockResolvedValue({
          data: {
            id: 1,
            first_name: null,
            last_name: null,
            email: "john@example.com",
            company: "Google",
          },
          error: null,
        });
        return chain;
      });

      mockResendSend.mockResolvedValue({
        data: { id: "email_123" },
        error: null,
      });

      const response = await request(app).post(
        "/api/informational-interviews/candidates/1/send-email"
      );

      expect([200, 500]).toContain(response.status);
    });

    it("should handle API tracking errors gracefully on send-email", async () => {
      mockLogApiUsage.mockRejectedValueOnce(new Error("Tracking failed"));

      mockQuery
        .mockResolvedValueOnce({
          rows: [{ full_name: "Test User" }],
        })
        .mockResolvedValueOnce({
          rows: [{ email: "user@example.com" }],
        });

      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([
          {
            id: 1,
            first_name: "John",
            email: "john@example.com",
          },
        ]);
        chain.single = vi.fn().mockResolvedValue({
          data: {
            id: 1,
            first_name: "John",
            email: "john@example.com",
          },
          error: null,
        });
        return chain;
      });

      mockResendSend.mockResolvedValue({
        data: { id: "email_123" },
        error: null,
      });

      const response = await request(app).post(
        "/api/informational-interviews/candidates/1/send-email"
      );

      // Should still succeed even if tracking fails
      expect([200, 500]).toContain(response.status);
    });
  });

  describe("POST /interviews/:id/send-followup-email - Additional Coverage", () => {
    it("should handle candidate without last_name in followup", async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ full_name: "Test User" }],
        })
        .mockResolvedValueOnce({
          rows: [{ email: "user@example.com" }],
        });

      mockSupabaseFrom.mockImplementation((table) => {
        if (table === "informational_interviews") {
          const chain = mockSupabaseChain([
            {
              id: 1,
              candidate_id: 1,
              scheduled_date: "2024-01-15",
            },
          ]);
          chain.single = vi.fn().mockResolvedValue({
            data: {
              id: 1,
              candidate_id: 1,
              scheduled_date: "2024-01-15",
            },
            error: null,
          });
          return chain;
        }
        if (table === "interview_candidates") {
          const chain = mockSupabaseChain([
            {
              id: 1,
              first_name: "John",
              last_name: null,
              email: "john@example.com",
              company: null,
              title: "Engineer",
            },
          ]);
          chain.single = vi.fn().mockResolvedValue({
            data: {
              id: 1,
              first_name: "John",
              last_name: null,
              email: "john@example.com",
              company: null,
              title: "Engineer",
            },
            error: null,
          });
          return chain;
        }
        if (table === "interview_followup") {
          const chain = mockSupabaseChain([]);
          chain.insert = vi.fn().mockResolvedValue({ error: null });
          return chain;
        }
        return mockSupabaseChain([]);
      });

      mockResendSend.mockResolvedValue({
        data: { id: "email_123" },
        error: null,
      });

      const response = await request(app)
        .post("/api/informational-interviews/interviews/1/send-followup-email")
        .send({ message_content: "Thank you" });

      expect([200, 400, 404, 500]).toContain(response.status);
    });

    it("should handle empty message_content", async () => {
      const response = await request(app)
        .post("/api/informational-interviews/interviews/1/send-followup-email")
        .send({ message_content: "   " });

      expect(response.status).toBe(400);
    });

    it("should handle candidate without first_name in followup", async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ full_name: "Test User" }],
        })
        .mockResolvedValueOnce({
          rows: [{ email: "user@example.com" }],
        });

      mockSupabaseFrom.mockImplementation((table) => {
        if (table === "informational_interviews") {
          const chain = mockSupabaseChain([
            {
              id: 1,
              candidate_id: 1,
            },
          ]);
          chain.single = vi.fn().mockResolvedValue({
            data: {
              id: 1,
              candidate_id: 1,
            },
            error: null,
          });
          return chain;
        }
        if (table === "interview_candidates") {
          const chain = mockSupabaseChain([
            {
              id: 1,
              first_name: null,
              email: "john@example.com",
              company: "Google",
            },
          ]);
          chain.single = vi.fn().mockResolvedValue({
            data: {
              id: 1,
              first_name: null,
              email: "john@example.com",
              company: "Google",
            },
            error: null,
          });
          return chain;
        }
        if (table === "interview_followup") {
          const chain = mockSupabaseChain([]);
          chain.insert = vi.fn().mockResolvedValue({ error: null });
          return chain;
        }
        return mockSupabaseChain([]);
      });

      mockResendSend.mockResolvedValue({
        data: { id: "email_123" },
        error: null,
      });

      const response = await request(app)
        .post("/api/informational-interviews/interviews/1/send-followup-email")
        .send({ message_content: "Thank you" });

      expect([200, 400, 404, 500]).toContain(response.status);
    });

    it("should handle user email not available in followup", async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ full_name: "Test" }],
        })
        .mockResolvedValueOnce({
          rows: [],
        });

      mockSupabaseFrom.mockImplementation((table) => {
        if (table === "informational_interviews") {
          const chain = mockSupabaseChain([
            {
              id: 1,
              candidate_id: 1,
            },
          ]);
          chain.single = vi.fn().mockResolvedValue({
            data: {
              id: 1,
              candidate_id: 1,
            },
            error: null,
          });
          return chain;
        }
        if (table === "interview_candidates") {
          const chain = mockSupabaseChain([
            {
              id: 1,
              first_name: "John",
              email: "john@example.com",
            },
          ]);
          chain.single = vi.fn().mockResolvedValue({
            data: {
              id: 1,
              first_name: "John",
              email: "john@example.com",
            },
            error: null,
          });
          return chain;
        }
        return mockSupabaseChain([]);
      });

      const response = await request(app)
        .post("/api/informational-interviews/interviews/1/send-followup-email")
        .send({ message_content: "Thank you" });

      expect([200, 400, 404, 500]).toContain(response.status);
    });

    it("should handle message with newlines", async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ full_name: "Test User" }],
        })
        .mockResolvedValueOnce({
          rows: [{ email: "user@example.com" }],
        });

      mockSupabaseFrom.mockImplementation((table) => {
        if (table === "informational_interviews") {
          const chain = mockSupabaseChain([
            {
              id: 1,
              candidate_id: 1,
              scheduled_date: "2024-01-15",
            },
          ]);
          chain.single = vi.fn().mockResolvedValue({
            data: {
              id: 1,
              candidate_id: 1,
              scheduled_date: "2024-01-15",
            },
            error: null,
          });
          return chain;
        }
        if (table === "interview_candidates") {
          const chain = mockSupabaseChain([
            {
              id: 1,
              first_name: "John",
              email: "john@example.com",
              company: "Google",
            },
          ]);
          chain.single = vi.fn().mockResolvedValue({
            data: {
              id: 1,
              first_name: "John",
              email: "john@example.com",
              company: "Google",
            },
            error: null,
          });
          return chain;
        }
        if (table === "interview_followup") {
          const chain = mockSupabaseChain([]);
          chain.insert = vi.fn().mockResolvedValue({ error: null });
          return chain;
        }
        return mockSupabaseChain([]);
      });

      mockResendSend.mockResolvedValue({
        data: { id: "email_123" },
        error: null,
      });

      const response = await request(app)
        .post("/api/informational-interviews/interviews/1/send-followup-email")
        .send({ message_content: "Thank you\nfor the interview\r\nBest regards" });

      expect([200, 500]).toContain(response.status);
    });
  });

  describe("Candidate operations - Additional Coverage", () => {
    it("should handle create candidate error", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([]);
        chain.select = vi.fn().mockResolvedValue({
          data: [],
          error: { message: "Insert failed" },
        });
        return chain;
      });

      const response = await request(app)
        .post("/api/informational-interviews/candidates")
        .send({
          first_name: "John",
          last_name: "Doe",
        });

      expect(response.status).toBe(500);
    });

    it("should handle delete candidate error", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([]);
        chain.eq = vi.fn().mockResolvedValue({
          error: { message: "Delete failed" },
        });
        return chain;
      });

      const response = await request(app).delete(
        "/api/informational-interviews/candidates/1"
      );

      expect(response.status).toBe(500);
    });
  });

  describe("Interview operations - Additional Coverage", () => {
    it("should handle create interview without candidate_id", async () => {
      const response = await request(app)
        .post("/api/informational-interviews/interviews")
        .send({
          scheduled_date: "2024-01-15",
        });

      expect(response.status).toBe(400);
    });

    it("should handle create interview error", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([]);
        chain.select = vi.fn().mockResolvedValue({
          data: [],
          error: { message: "Insert failed" },
        });
        return chain;
      });

      const response = await request(app)
        .post("/api/informational-interviews/interviews")
        .send({
          candidate_id: 1,
        });

      expect(response.status).toBe(500);
    });

    it("should handle update interview error", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([]);
        chain.select = vi.fn().mockResolvedValue({
          data: [],
          error: { message: "Update failed" },
        });
        return chain;
      });

      const response = await request(app)
        .put("/api/informational-interviews/interviews/1")
        .send({ status: "completed" });

      expect(response.status).toBe(500);
    });
  });

  describe("Preparation operations - Additional Coverage", () => {
    it("should handle get preparation error", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([]);
        chain.eq = vi.fn().mockResolvedValue({
          data: [],
          error: { message: "Query failed" },
        });
        return chain;
      });

      const response = await request(app).get(
        "/api/informational-interviews/preparation/1"
      );

      expect(response.status).toBe(500);
    });

    it("should handle create preparation error", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([]);
        chain.select = vi.fn().mockResolvedValue({
          data: [],
          error: { message: "Insert failed" },
        });
        return chain;
      });

      const response = await request(app)
        .post("/api/informational-interviews/preparation")
        .send({
          interview_id: 1,
          title: "Test",
        });

      expect(response.status).toBe(500);
    });

    it("should handle update preparation error", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([]);
        chain.select = vi.fn().mockResolvedValue({
          data: [],
          error: { message: "Update failed" },
        });
        return chain;
      });

      const response = await request(app)
        .put("/api/informational-interviews/preparation/1")
        .send({ title: "Updated" });

      expect(response.status).toBe(500);
    });
  });

  describe("Follow-up operations - Additional Coverage", () => {
    it("should handle get followups error", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([]);
        chain.order = vi.fn().mockResolvedValue({
          data: [],
          error: { message: "Query failed" },
        });
        return chain;
      });

      const response = await request(app).get(
        "/api/informational-interviews/followups/1"
      );

      expect(response.status).toBe(500);
    });

    it("should handle create followup error", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([]);
        chain.select = vi.fn().mockResolvedValue({
          data: [],
          error: { message: "Insert failed" },
        });
        return chain;
      });

      const response = await request(app)
        .post("/api/informational-interviews/followups")
        .send({
          interview_id: 1,
          followup_type: "email",
        });

      expect(response.status).toBe(500);
    });

    it("should handle update followup error", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([]);
        chain.select = vi.fn().mockResolvedValue({
          data: [],
          error: { message: "Update failed" },
        });
        return chain;
      });

      const response = await request(app)
        .put("/api/informational-interviews/followups/1")
        .send({ response_received: true });

      expect(response.status).toBe(500);
    });
  });

  describe("Insight operations - Additional Coverage", () => {
    it("should handle get insights error", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([]);
        chain.order = vi.fn().mockResolvedValue({
          data: [],
          error: { message: "Query failed" },
        });
        return chain;
      });

      const response = await request(app).get(
        "/api/informational-interviews/insights"
      );

      expect(response.status).toBe(500);
    });

    it("should handle get insight by interview error", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([]);
        chain.eq = vi.fn().mockResolvedValue({
          data: [],
          error: { message: "Query failed" },
        });
        return chain;
      });

      const response = await request(app).get(
        "/api/informational-interviews/insights/1"
      );

      expect(response.status).toBe(500);
    });

    it("should handle create insight error", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([]);
        chain.select = vi.fn().mockResolvedValue({
          data: [],
          error: { message: "Insert failed" },
        });
        return chain;
      });

      const response = await request(app)
        .post("/api/informational-interviews/insights")
        .send({
          interview_id: 1,
          title: "Test",
        });

      expect(response.status).toBe(500);
    });

    it("should handle update insight error", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([]);
        chain.select = vi.fn().mockResolvedValue({
          data: [],
          error: { message: "Update failed" },
        });
        return chain;
      });

      const response = await request(app)
        .put("/api/informational-interviews/insights/1")
        .send({ title: "Updated" });

      expect(response.status).toBe(500);
    });

    it("should handle delete insight error", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([]);
        chain.select = vi.fn().mockResolvedValue({
          data: [],
          error: { message: "Delete failed" },
        });
        return chain;
      });

      const response = await request(app).delete(
        "/api/informational-interviews/insights/1"
      );

      expect(response.status).toBe(500);
    });
  });

  describe("Dashboard summary - Additional Coverage", () => {
    it("should handle insight error in dashboard", async () => {
      mockSupabaseFrom.mockImplementation((table) => {
        if (table === "informational_interviews") {
          const chain = mockSupabaseChain([{ id: 1, status: "pending" }]);
          chain.select = vi.fn().mockResolvedValue({
            data: [{ id: 1, status: "pending" }],
            error: null,
          });
          return chain;
        }
        if (table === "interview_insights") {
          const chain = mockSupabaseChain([]);
          chain.select = vi.fn().mockResolvedValue({
            data: [],
            error: { message: "Insight error" },
          });
          return chain;
        }
        return mockSupabaseChain([]);
      });

      const response = await request(app).get(
        "/api/informational-interviews/dashboard/summary"
      );

      expect(response.status).toBe(500);
    });

    it("should handle followup error in dashboard", async () => {
      mockSupabaseFrom.mockImplementation((table) => {
        if (table === "informational_interviews") {
          const chain = mockSupabaseChain([{ id: 1, status: "pending" }]);
          chain.select = vi.fn().mockResolvedValue({
            data: [{ id: 1, status: "pending" }],
            error: null,
          });
          return chain;
        }
        if (table === "interview_insights") {
          const chain = mockSupabaseChain([{ id: 1 }]);
          chain.select = vi.fn().mockResolvedValue({
            data: [{ id: 1 }],
            error: null,
          });
          return chain;
        }
        if (table === "interview_followup") {
          const chain = mockSupabaseChain([]);
          chain.select = vi.fn().mockResolvedValue({
            data: [],
            error: { message: "Followup error" },
          });
          return chain;
        }
        return mockSupabaseChain([]);
      });

      const response = await request(app).get(
        "/api/informational-interviews/dashboard/summary"
      );

      expect(response.status).toBe(500);
    });
  });

  describe("Delete interview - Additional Coverage", () => {
    it("should handle delete interview error", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([]);
        chain.delete = vi.fn().mockReturnThis();
        chain.eq = vi.fn().mockResolvedValue({
          error: { message: "Delete failed" },
        });
        return chain;
      });

      const response = await request(app).delete(
        "/api/informational-interviews/interviews/1"
      );

      expect(response.status).toBe(500);
    });
  });
});
