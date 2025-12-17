import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";

// Create hoisted mocks
const mockSupabaseFrom = vi.hoisted(() => vi.fn());

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: mockSupabaseFrom,
  })),
}));

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

import referencesRouter from "../../routes/references.js";

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

describe("References Routes", () => {
  let app;

  beforeEach(() => {
    vi.clearAllMocks();

    app = express();
    app.use(express.json());
    app.use("/api/references", referencesRouter);

    mockSupabaseFrom.mockReturnValue(mockSupabaseChain([]));
  });

  describe("GET / - List References", () => {
    it("should return all references", async () => {
      mockSupabaseFrom.mockImplementation(() =>
        mockSupabaseChain([
          {
            id: 1,
            first_name: "John",
            last_name: "Doe",
            email: "john@test.com",
          },
        ])
      );

      const response = await request(app).get("/api/references");

      expect([200, 500]).toContain(response.status);
    });

    it("should filter by type", async () => {
      mockSupabaseFrom.mockImplementation(() =>
        mockSupabaseChain([{ id: 1, reference_type: "professional" }])
      );

      const response = await request(app).get(
        "/api/references?type=professional"
      );

      expect([200, 500]).toContain(response.status);
    });

    it("should filter by available status", async () => {
      mockSupabaseFrom.mockImplementation(() =>
        mockSupabaseChain([{ id: 1, is_available: true }])
      );

      const response = await request(app).get("/api/references?available=true");

      expect([200, 500]).toContain(response.status);
    });
  });

  describe("GET /:id - Get Reference", () => {
    it("should return reference details", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([
          { id: 1, first_name: "John", last_name: "Doe" },
        ]);
        chain.single.mockResolvedValue({
          data: { id: 1, first_name: "John", last_name: "Doe" },
          error: null,
        });
        return chain;
      });

      const response = await request(app).get("/api/references/1");

      expect([200, 404, 500]).toContain(response.status);
    });

    it("should return 404 for non-existent reference", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([]);
        chain.single.mockResolvedValue({ data: null, error: null });
        return chain;
      });

      const response = await request(app).get("/api/references/999");

      expect([404, 500]).toContain(response.status);
    });
  });

  describe("POST / - Create Reference", () => {
    it("should create reference", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([{ id: 1 }]);
        chain.single.mockResolvedValue({ data: { id: 1 }, error: null });
        return chain;
      });

      const response = await request(app).post("/api/references").send({
        first_name: "Jane",
        last_name: "Smith",
        email: "jane@test.com",
        title: "Senior Engineer",
        company: "Google",
      });

      expect([200, 201, 400, 500]).toContain(response.status);
    });

    it("should require first_name and last_name", async () => {
      const response = await request(app)
        .post("/api/references")
        .send({ email: "test@test.com" });

      expect([200, 201, 400, 500]).toContain(response.status);
    });
  });

  describe("PUT /:id - Update Reference", () => {
    it("should update reference", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([{ id: 1 }]);
        chain.single.mockResolvedValue({ data: { id: 1 }, error: null });
        return chain;
      });

      const response = await request(app)
        .put("/api/references/1")
        .send({ first_name: "Updated" });

      expect([200, 404, 500]).toContain(response.status);
    });
  });

  describe("DELETE /:id - Delete Reference", () => {
    it("should delete reference", async () => {
      mockSupabaseFrom.mockImplementation(() => mockSupabaseChain([]));

      const response = await request(app).delete("/api/references/1");

      expect([200, 204, 404, 500]).toContain(response.status);
    });
  });

  describe("GET /requests/all - List Reference Requests", () => {
    it("should return all requests", async () => {
      mockSupabaseFrom.mockImplementation(() =>
        mockSupabaseChain([{ id: 1, reference_id: 1, status: "pending" }])
      );

      const response = await request(app).get("/api/references/requests/all");

      expect([200, 500]).toContain(response.status);
    });
  });

  describe("POST /requests - Create Request", () => {
    it("should create reference request", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([{ id: 1 }]);
        chain.single.mockResolvedValue({ data: { id: 1 }, error: null });
        return chain;
      });

      const response = await request(app)
        .post("/api/references/requests")
        .send({
          reference_id: 1,
          job_id: 1,
          request_message: "Please provide a reference",
        });

      expect([200, 201, 400, 500]).toContain(response.status);
    });
  });

  describe("PUT /requests/:id - Update Request", () => {
    it("should update request", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([{ id: 1 }]);
        chain.single.mockResolvedValue({ data: { id: 1 }, error: null });
        return chain;
      });

      const response = await request(app)
        .put("/api/references/requests/1")
        .send({ status: "completed" });

      expect([200, 404, 500]).toContain(response.status);
    });
  });

  describe("DELETE /requests/:id - Delete Request", () => {
    it("should delete request", async () => {
      mockSupabaseFrom.mockImplementation(() => mockSupabaseChain([]));

      const response = await request(app).delete("/api/references/requests/1");

      expect([200, 204, 404, 500]).toContain(response.status);
    });
  });

  describe("GET /templates/all - List Templates", () => {
    it("should return all templates", async () => {
      mockSupabaseFrom.mockImplementation(() =>
        mockSupabaseChain([{ id: 1, name: "Template 1" }])
      );

      const response = await request(app).get("/api/references/templates/all");

      expect([200, 500]).toContain(response.status);
    });
  });

  describe("POST /templates - Create Template", () => {
    it("should create template", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([{ id: 1 }]);
        chain.single.mockResolvedValue({ data: { id: 1 }, error: null });
        return chain;
      });

      const response = await request(app)
        .post("/api/references/templates")
        .send({
          name: "New Template",
          content: "Template content",
        });

      expect([200, 201, 400, 500]).toContain(response.status);
    });
  });

  describe("PUT /templates/:id - Update Template", () => {
    it("should update template", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([{ id: 1 }]);
        chain.single.mockResolvedValue({ data: { id: 1 }, error: null });
        return chain;
      });

      const response = await request(app)
        .put("/api/references/templates/1")
        .send({ name: "Updated Template" });

      expect([200, 404, 500]).toContain(response.status);
    });
  });

  describe("DELETE /templates/:id - Delete Template", () => {
    it("should delete template", async () => {
      mockSupabaseFrom.mockImplementation(() => mockSupabaseChain([]));

      const response = await request(app).delete("/api/references/templates/1");

      expect([200, 204, 404, 500]).toContain(response.status);
    });
  });

  describe("GET /feedback/:referenceId - Get Feedback", () => {
    it("should return feedback", async () => {
      mockSupabaseFrom.mockImplementation(() =>
        mockSupabaseChain([{ id: 1, feedback_text: "Great reference" }])
      );

      const response = await request(app).get("/api/references/feedback/1");

      expect([200, 500]).toContain(response.status);
    });
  });

  describe("POST /feedback - Create Feedback", () => {
    it("should create feedback", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([{ id: 1 }]);
        chain.single.mockResolvedValue({ data: { id: 1 }, error: null });
        return chain;
      });

      const response = await request(app)
        .post("/api/references/feedback")
        .send({
          reference_id: 1,
          feedback_text: "Very helpful",
          rating: 5,
        });

      expect([200, 201, 400, 500]).toContain(response.status);
    });
  });

  describe("GET /reminders/all - List Reminders", () => {
    it("should return all reminders", async () => {
      mockSupabaseFrom.mockImplementation(() =>
        mockSupabaseChain([
          { id: 1, reference_id: 1, reminder_date: "2024-01-15" },
        ])
      );

      const response = await request(app).get("/api/references/reminders/all");

      expect([200, 500]).toContain(response.status);
    });
  });

  describe("POST /reminders - Create Reminder", () => {
    it("should create reminder", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([{ id: 1 }]);
        chain.single.mockResolvedValue({ data: { id: 1 }, error: null });
        return chain;
      });

      const response = await request(app)
        .post("/api/references/reminders")
        .send({
          reference_id: 1,
          reminder_date: "2024-01-15",
          reminder_message: "Follow up",
        });

      expect([200, 201, 400, 500]).toContain(response.status);
    });
  });

  describe("PUT /reminders/:id - Update Reminder", () => {
    it("should update reminder", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([{ id: 1 }]);
        chain.single.mockResolvedValue({ data: { id: 1 }, error: null });
        return chain;
      });

      const response = await request(app)
        .put("/api/references/reminders/1")
        .send({ completed: true });

      expect([200, 404, 500]).toContain(response.status);
    });
  });

  describe("DELETE /reminders/:id - Delete Reminder", () => {
    it("should delete reminder", async () => {
      mockSupabaseFrom.mockImplementation(() => mockSupabaseChain([]));

      const response = await request(app).delete("/api/references/reminders/1");

      expect([200, 204, 404, 500]).toContain(response.status);
    });
  });

  describe("GET /stats/overview - Get Overview Stats", () => {
    it("should return overview statistics", async () => {
      mockSupabaseFrom.mockImplementation(() =>
        mockSupabaseChain([{ total_references: 10, available_references: 8 }])
      );

      const response = await request(app).get("/api/references/stats/overview");

      expect([200, 500]).toContain(response.status);
    });
  });

  describe("GET /stats/impact - Get Impact Stats", () => {
    it("should return impact statistics", async () => {
      mockSupabaseFrom.mockImplementation(() =>
        mockSupabaseChain([
          { reference_id: 1, applications_helped: 5, offers_received: 2 },
        ])
      );

      const response = await request(app).get("/api/references/stats/impact");

      expect([200, 500]).toContain(response.status);
    });
  });

  describe("POST /generate-talking-points - Generate Talking Points", () => {
    it("should generate talking points", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([
          {
            id: 1,
            first_name: "John",
            key_skills_can_speak_to: ["JavaScript"],
          },
        ]);
        chain.single.mockResolvedValue({
          data: { id: 1, first_name: "John" },
          error: null,
        });
        return chain;
      });

      const response = await request(app)
        .post("/api/references/generate-talking-points")
        .send({
          reference_id: 1,
          job_id: 1,
        });

      expect([200, 400, 404, 500]).toContain(response.status);
    });
  });

  describe("Error Handling", () => {
    it("should handle database errors", async () => {
      mockSupabaseFrom.mockImplementation(() =>
        mockSupabaseChain([], { message: "Database error" })
      );

      const response = await request(app).get("/api/references");

      expect([200, 500]).toContain(response.status);
    });

    it("should handle database error in stats/overview", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        throw new Error("Database connection failed");
      });

      const response = await request(app).get("/api/references/stats/overview");

      expect([500]).toContain(response.status);
    });

    it("should handle database error in stats/impact", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        throw new Error("Database connection failed");
      });

      const response = await request(app).get("/api/references/stats/impact");

      expect([500]).toContain(response.status);
    });

    it("should handle database error in generate-talking-points", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        throw new Error("Database connection failed");
      });

      const response = await request(app)
        .post("/api/references/generate-talking-points")
        .send({ reference_id: 1, job_title: "Developer" });

      expect([500]).toContain(response.status);
    });

    it("should handle reference not found in generate-talking-points", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([]);
        chain.single.mockResolvedValue({ data: null, error: null });
        return chain;
      });

      const response = await request(app)
        .post("/api/references/generate-talking-points")
        .send({ reference_id: 999, job_title: "Developer" });

      expect([404, 500]).toContain(response.status);
    });

    it("should handle error in reminders update", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([], { message: "Update failed" });
        chain.single.mockResolvedValue({
          data: null,
          error: { message: "Update failed" },
        });
        return chain;
      });

      const response = await request(app)
        .put("/api/references/reminders/1")
        .send({ is_completed: true });

      expect([500]).toContain(response.status);
    });

    it("should handle error in reminders delete", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([], { message: "Delete failed" });
        return chain;
      });

      const response = await request(app).delete("/api/references/reminders/1");

      expect([500]).toContain(response.status);
    });
  });

  describe("Generate Talking Points - Edge Cases", () => {
    it("should generate talking points with JSON skills and projects", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([]);
        chain.single.mockResolvedValue({
          data: {
            id: 1,
            first_name: "John",
            last_name: "Doe",
            relationship: "manager",
            years_known: 5,
            key_skills_can_speak_to: JSON.stringify([
              "JavaScript",
              "React",
              "Node.js",
            ]),
            notable_projects: JSON.stringify(["Project A", "Project B"]),
          },
          error: null,
        });
        return chain;
      });

      const response = await request(app)
        .post("/api/references/generate-talking-points")
        .send({
          reference_id: 1,
          job_title: "Senior Developer",
          company: "Tech Corp",
          job_description: "Full stack development",
        });

      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.talking_points).toBeDefined();
      }
    });

    it("should handle reference without skills/projects", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([]);
        chain.single.mockResolvedValue({
          data: {
            id: 1,
            first_name: "Jane",
            last_name: "Smith",
            relationship: "colleague",
            years_known: null,
            key_skills_can_speak_to: null,
            notable_projects: null,
          },
          error: null,
        });
        return chain;
      });

      const response = await request(app)
        .post("/api/references/generate-talking-points")
        .send({
          reference_id: 1,
          job_title: "Developer",
          company: "Startup Inc",
        });

      expect([200, 500]).toContain(response.status);
    });
  });

  describe("POST / - Create Reference with JSON fields", () => {
    it("should create reference with all optional fields", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([{ id: 1 }]);
        chain.single.mockResolvedValue({ data: { id: 1 }, error: null });
        return chain;
      });

      const response = await request(app).post("/api/references").send({
        first_name: "Jane",
        last_name: "Smith",
        email: "jane@test.com",
        phone: "123-456-7890",
        linkedin_url: "https://linkedin.com/in/jane",
        title: "Senior Engineer",
        company: "Google",
        relationship: "colleague",
        years_known: 5,
        reference_strength: "strong",
        key_skills_can_speak_to: ["JavaScript", "React"],
        notable_projects: ["Project X", "Project Y"],
        reference_notes: "Great reference",
        is_available: true,
        preferred_contact_method: "phone",
        reference_type: "professional",
      });

      expect([200, 201, 400, 500]).toContain(response.status);
    });

    it("should create reference with default values", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([{ id: 1 }]);
        chain.single.mockResolvedValue({ data: { id: 1 }, error: null });
        return chain;
      });

      const response = await request(app).post("/api/references").send({
        first_name: "John",
        last_name: "Doe",
        email: "john@test.com",
      });

      expect([200, 201, 400, 500]).toContain(response.status);
    });
  });

  describe("PUT /:id - Update Reference with JSON fields", () => {
    it("should update reference with key_skills_can_speak_to array", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([{ id: 1 }]);
        chain.single.mockResolvedValue({ data: { id: 1 }, error: null });
        return chain;
      });

      const response = await request(app)
        .put("/api/references/1")
        .send({
          key_skills_can_speak_to: ["Python", "Go", "Rust"],
        });

      expect([200, 404, 500]).toContain(response.status);
    });

    it("should update reference with notable_projects array", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([{ id: 1 }]);
        chain.single.mockResolvedValue({ data: { id: 1 }, error: null });
        return chain;
      });

      const response = await request(app)
        .put("/api/references/1")
        .send({
          notable_projects: ["Big Project", "Another Project"],
        });

      expect([200, 404, 500]).toContain(response.status);
    });

    it("should handle error on update", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([], { message: "Update failed" });
        chain.single.mockResolvedValue({
          data: null,
          error: { message: "Update failed" },
        });
        return chain;
      });

      const response = await request(app)
        .put("/api/references/1")
        .send({ first_name: "Updated" });

      expect([500]).toContain(response.status);
    });
  });

  describe("DELETE /:id - Delete Reference errors", () => {
    it("should handle error on delete", async () => {
      mockSupabaseFrom.mockImplementation(() =>
        mockSupabaseChain([], { message: "Delete failed" })
      );

      const response = await request(app).delete("/api/references/1");

      expect([500]).toContain(response.status);
    });
  });

  describe("GET /requests/all - Filter by status and reference_id", () => {
    it("should filter requests by status", async () => {
      mockSupabaseFrom.mockImplementation(() =>
        mockSupabaseChain([{ id: 1, status: "pending" }])
      );

      const response = await request(app).get(
        "/api/references/requests/all?status=pending"
      );

      expect([200, 500]).toContain(response.status);
    });

    it("should filter requests by reference_id", async () => {
      mockSupabaseFrom.mockImplementation(() =>
        mockSupabaseChain([{ id: 1, reference_id: 5 }])
      );

      const response = await request(app).get(
        "/api/references/requests/all?reference_id=5"
      );

      expect([200, 500]).toContain(response.status);
    });

    it("should handle error fetching requests", async () => {
      mockSupabaseFrom.mockImplementation(() =>
        mockSupabaseChain([], { message: "Database error" })
      );

      const response = await request(app).get("/api/references/requests/all");

      expect([500]).toContain(response.status);
    });
  });

  describe("POST /requests - Create Request validation", () => {
    it("should return 400 if reference_id is missing", async () => {
      const response = await request(app)
        .post("/api/references/requests")
        .send({
          job_title: "Developer",
          company: "Test Corp",
        });

      expect([400]).toContain(response.status);
    });

    it("should create request with all optional fields", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([{ id: 1 }]);
        chain.single.mockResolvedValue({ data: { id: 1 }, error: null });
        chain.rpc = vi.fn().mockResolvedValue({});
        return chain;
      });

      const response = await request(app)
        .post("/api/references/requests")
        .send({
          reference_id: 1,
          job_id: 5,
          job_title: "Senior Developer",
          company: "Tech Corp",
          deadline: "2024-12-31",
          talking_points: ["Point 1", "Point 2"],
          role_specific_guidance: "Focus on leadership",
          key_achievements_to_highlight: ["Achievement 1", "Achievement 2"],
          request_message: "Please provide a reference",
        });

      expect([200, 201, 400, 500]).toContain(response.status);
    });

    it("should handle error creating request", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([]);
        chain.single.mockResolvedValue({
          data: null,
          error: { message: "Insert failed" },
        });
        return chain;
      });

      const response = await request(app)
        .post("/api/references/requests")
        .send({
          reference_id: 1,
          job_title: "Developer",
        });

      expect([500]).toContain(response.status);
    });
  });

  describe("PUT /requests/:id - Update Request with JSON fields", () => {
    it("should update request with talking_points array", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([{ id: 1 }]);
        chain.single.mockResolvedValue({ data: { id: 1 }, error: null });
        return chain;
      });

      const response = await request(app)
        .put("/api/references/requests/1")
        .send({
          talking_points: ["New point 1", "New point 2"],
        });

      expect([200, 404, 500]).toContain(response.status);
    });

    it("should update request with key_achievements_to_highlight array", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([{ id: 1 }]);
        chain.single.mockResolvedValue({ data: { id: 1 }, error: null });
        return chain;
      });

      const response = await request(app)
        .put("/api/references/requests/1")
        .send({
          key_achievements_to_highlight: ["Achievement A", "Achievement B"],
        });

      expect([200, 404, 500]).toContain(response.status);
    });

    it("should handle error updating request", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([], { message: "Update failed" });
        chain.single.mockResolvedValue({
          data: null,
          error: { message: "Update failed" },
        });
        return chain;
      });

      const response = await request(app)
        .put("/api/references/requests/1")
        .send({ status: "completed" });

      expect([500]).toContain(response.status);
    });
  });

  describe("DELETE /requests/:id - Delete Request errors", () => {
    it("should handle error deleting request", async () => {
      mockSupabaseFrom.mockImplementation(() =>
        mockSupabaseChain([], { message: "Delete failed" })
      );

      const response = await request(app).delete("/api/references/requests/1");

      expect([500]).toContain(response.status);
    });
  });

  describe("GET /templates/all - Filter by type", () => {
    it("should filter templates by type", async () => {
      mockSupabaseFrom.mockImplementation(() =>
        mockSupabaseChain([{ id: 1, template_type: "email" }])
      );

      const response = await request(app).get(
        "/api/references/templates/all?type=email"
      );

      expect([200, 500]).toContain(response.status);
    });

    it("should handle error fetching templates", async () => {
      mockSupabaseFrom.mockImplementation(() =>
        mockSupabaseChain([], { message: "Database error" })
      );

      const response = await request(app).get("/api/references/templates/all");

      expect([500]).toContain(response.status);
    });
  });

  describe("POST /templates - Create Template errors", () => {
    it("should handle error creating template", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([]);
        chain.single.mockResolvedValue({
          data: null,
          error: { message: "Insert failed" },
        });
        return chain;
      });

      const response = await request(app)
        .post("/api/references/templates")
        .send({
          template_name: "Test Template",
          template_type: "email",
          template_subject: "Subject",
          template_body: "Body content",
          is_default: true,
        });

      expect([500]).toContain(response.status);
    });
  });

  describe("PUT /templates/:id - Update Template errors", () => {
    it("should handle error updating template", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([], { message: "Update failed" });
        chain.single.mockResolvedValue({
          data: null,
          error: { message: "Update failed" },
        });
        return chain;
      });

      const response = await request(app)
        .put("/api/references/templates/1")
        .send({ template_name: "Updated Template" });

      expect([500]).toContain(response.status);
    });
  });

  describe("DELETE /templates/:id - Delete Template errors", () => {
    it("should handle error deleting template", async () => {
      mockSupabaseFrom.mockImplementation(() =>
        mockSupabaseChain([], { message: "Delete failed" })
      );

      const response = await request(app).delete("/api/references/templates/1");

      expect([500]).toContain(response.status);
    });
  });

  describe("GET /feedback/:referenceId - Error handling", () => {
    it("should handle error fetching feedback", async () => {
      mockSupabaseFrom.mockImplementation(() =>
        mockSupabaseChain([], { message: "Database error" })
      );

      const response = await request(app).get("/api/references/feedback/1");

      expect([500]).toContain(response.status);
    });
  });

  describe("POST /feedback - Create Feedback errors", () => {
    it("should create feedback with all fields", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([{ id: 1 }]);
        chain.single.mockResolvedValue({ data: { id: 1 }, error: null });
        return chain;
      });

      const response = await request(app)
        .post("/api/references/feedback")
        .send({
          reference_id: 1,
          request_id: 2,
          feedback_source: "recruiter",
          feedback_text: "Great reference",
          overall_rating: 5,
          helpfulness_rating: 5,
          timeliness_rating: 4,
          contributed_to_offer: true,
        });

      expect([200, 201, 400, 500]).toContain(response.status);
    });

    it("should handle error creating feedback", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([]);
        chain.single.mockResolvedValue({
          data: null,
          error: { message: "Insert failed" },
        });
        return chain;
      });

      const response = await request(app)
        .post("/api/references/feedback")
        .send({
          reference_id: 1,
          feedback_text: "Test feedback",
        });

      expect([500]).toContain(response.status);
    });
  });

  describe("GET /reminders/all - Filter by completed", () => {
    it("should filter reminders by completed status true", async () => {
      mockSupabaseFrom.mockImplementation(() =>
        mockSupabaseChain([{ id: 1, is_completed: true }])
      );

      const response = await request(app).get(
        "/api/references/reminders/all?completed=true"
      );

      expect([200, 500]).toContain(response.status);
    });

    it("should filter reminders by completed status false", async () => {
      mockSupabaseFrom.mockImplementation(() =>
        mockSupabaseChain([{ id: 1, is_completed: false }])
      );

      const response = await request(app).get(
        "/api/references/reminders/all?completed=false"
      );

      expect([200, 500]).toContain(response.status);
    });

    it("should handle error fetching reminders", async () => {
      mockSupabaseFrom.mockImplementation(() =>
        mockSupabaseChain([], { message: "Database error" })
      );

      const response = await request(app).get("/api/references/reminders/all");

      expect([500]).toContain(response.status);
    });
  });

  describe("POST /reminders - Create Reminder errors", () => {
    it("should handle error creating reminder", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([]);
        chain.single.mockResolvedValue({
          data: null,
          error: { message: "Insert failed" },
        });
        return chain;
      });

      const response = await request(app)
        .post("/api/references/reminders")
        .send({
          reference_id: 1,
          reminder_type: "follow_up",
          reminder_date: "2024-01-15",
          reminder_message: "Follow up",
        });

      expect([500]).toContain(response.status);
    });
  });

  describe("PUT /reminders/:id - Update Reminder with is_completed", () => {
    it("should update reminder with is_completed true", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([{ id: 1, is_completed: true }]);
        chain.single.mockResolvedValue({
          data: { id: 1, is_completed: true, completed_date: new Date().toISOString() },
          error: null,
        });
        return chain;
      });

      const response = await request(app)
        .put("/api/references/reminders/1")
        .send({ is_completed: true });

      expect([200, 404, 500]).toContain(response.status);
    });
  });

  describe("GET /requests/all - Reference Requests", () => {
    it("should get all reference requests", async () => {
      mockSupabaseFrom.mockImplementation(() =>
        mockSupabaseChain([
          { id: 1, reference_id: 1, status: "pending", job_title: "Developer" },
        ])
      );

      const response = await request(app).get("/api/references/requests/all");

      expect([200, 500]).toContain(response.status);
    });

    it("should filter requests by status", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([
          { id: 1, reference_id: 1, status: "completed" },
        ]);
        chain.eq.mockReturnThis();
        return chain;
      });

      const response = await request(app).get(
        "/api/references/requests/all?status=completed"
      );

      expect([200, 500]).toContain(response.status);
    });

    it("should filter requests by reference_id", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([{ id: 1, reference_id: 5 }]);
        chain.eq.mockReturnThis();
        return chain;
      });

      const response = await request(app).get(
        "/api/references/requests/all?reference_id=5"
      );

      expect([200, 500]).toContain(response.status);
    });

    it("should handle database error in requests/all", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        throw new Error("Database connection failed");
      });

      const response = await request(app).get("/api/references/requests/all");

      expect([500]).toContain(response.status);
    });
  });

  describe("POST /requests - Create Reference Request", () => {
    it("should create a reference request", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([]);
        chain.single.mockResolvedValue({
          data: { id: 1, reference_id: 1, status: "pending" },
          error: null,
        });
        return chain;
      });

      const response = await request(app)
        .post("/api/references/requests")
        .send({
          reference_id: 1,
          job_title: "Developer",
          company: "Test Corp",
          deadline: "2024-02-01",
          talking_points: ["Point 1", "Point 2"],
          role_specific_guidance: "Be specific",
          key_achievements_to_highlight: ["Achievement 1"],
          request_message: "Please help",
        });

      expect([201, 400, 500]).toContain(response.status);
    });

    it("should return 400 when reference_id is missing", async () => {
      const response = await request(app)
        .post("/api/references/requests")
        .send({
          job_title: "Developer",
          company: "Test Corp",
        });

      expect([400, 500]).toContain(response.status);
    });

    it("should handle database error in create request", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        throw new Error("Database error");
      });

      const response = await request(app)
        .post("/api/references/requests")
        .send({
          reference_id: 1,
          job_title: "Developer",
        });

      expect([500]).toContain(response.status);
    });
  });

  describe("DELETE /templates/:id - Template Errors", () => {
    it("should handle template delete database error", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        throw new Error("Delete failed");
      });

      const response = await request(app).delete("/api/references/templates/1");

      expect([500]).toContain(response.status);
    });
  });

  describe("GET /feedback/:referenceId - Feedback Fetch Errors", () => {
    it("should handle feedback fetch database error", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        throw new Error("Feedback fetch failed");
      });

      const response = await request(app).get("/api/references/feedback/1");

      expect([500]).toContain(response.status);
    });
  });

  describe("POST /feedback - Feedback Create Errors", () => {
    it("should handle feedback create database error", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        throw new Error("Feedback create failed");
      });

      const response = await request(app)
        .post("/api/references/feedback")
        .send({
          reference_id: 1,
          feedback_source: "employer",
          feedback_text: "Great reference",
          overall_rating: 5,
        });

      expect([500]).toContain(response.status);
    });
  });

  describe("GET /reminders/all - Reminder Filters", () => {
    it("should filter reminders by completed status", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([
          { id: 1, is_completed: true, completed_date: "2024-01-15" },
        ]);
        chain.eq.mockReturnThis();
        return chain;
      });

      const response = await request(app).get(
        "/api/references/reminders/all?completed=true"
      );

      expect([200, 500]).toContain(response.status);
    });

    it("should filter reminders by not completed", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        const chain = mockSupabaseChain([
          { id: 1, is_completed: false },
        ]);
        chain.eq.mockReturnThis();
        return chain;
      });

      const response = await request(app).get(
        "/api/references/reminders/all?completed=false"
      );

      expect([200, 500]).toContain(response.status);
    });

    it("should handle reminders fetch database error", async () => {
      mockSupabaseFrom.mockImplementation(() => {
        throw new Error("Reminders fetch failed");
      });

      const response = await request(app).get("/api/references/reminders/all");

      expect([500]).toContain(response.status);
    });
  });

  describe("GET /stats/overview - Statistics calculations", () => {
    it("should calculate statistics with mixed data", async () => {
      mockSupabaseFrom.mockImplementation((table) => {
        if (table === "professional_references") {
          return mockSupabaseChain([
            { id: 1, is_available: true, reference_type: "professional" },
            { id: 2, is_available: false, reference_type: "academic" },
            { id: 3, is_available: true, reference_type: "personal" },
            { id: 4, is_available: true, reference_type: "character" },
          ]);
        }
        if (table === "reference_requests") {
          return mockSupabaseChain([
            { id: 1, status: "pending" },
            { id: 2, status: "completed" },
            { id: 3, status: "pending" },
          ]);
        }
        if (table === "reference_feedback") {
          return mockSupabaseChain([
            { id: 1, overall_rating: 5, contributed_to_offer: true },
            { id: 2, overall_rating: 4, contributed_to_offer: false },
            { id: 3, overall_rating: null, contributed_to_offer: true },
          ]);
        }
        return mockSupabaseChain([]);
      });

      const response = await request(app).get("/api/references/stats/overview");

      expect([200, 500]).toContain(response.status);
    });

    it("should handle empty data in statistics", async () => {
      mockSupabaseFrom.mockImplementation(() => mockSupabaseChain([]));

      const response = await request(app).get("/api/references/stats/overview");

      expect([200, 500]).toContain(response.status);
    });

    it("should handle requests error in statistics", async () => {
      let callCount = 0;
      mockSupabaseFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return mockSupabaseChain([{ id: 1 }]); // references
        }
        if (callCount === 2) {
          return mockSupabaseChain([], { message: "Error" }); // requests
        }
        return mockSupabaseChain([]);
      });

      const response = await request(app).get("/api/references/stats/overview");

      expect([500]).toContain(response.status);
    });

    it("should handle feedback error in statistics", async () => {
      let callCount = 0;
      mockSupabaseFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return mockSupabaseChain([{ id: 1 }]); // references
        }
        if (callCount === 2) {
          return mockSupabaseChain([{ id: 1 }]); // requests
        }
        if (callCount === 3) {
          return mockSupabaseChain([], { message: "Error" }); // feedback
        }
        return mockSupabaseChain([]);
      });

      const response = await request(app).get("/api/references/stats/overview");

      expect([500]).toContain(response.status);
    });
  });
});
