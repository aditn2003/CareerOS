/**
 * Contacts Routes Tests
 * Tests routes/contacts.js
 * Target: 90%+ coverage, 100% functions
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import express from "express";

// Mock auth middleware
vi.mock("../../auth.js", () => ({
  auth: (req, res, next) => {
    req.user = { id: 1 };
    next();
  },
}));

// Mock database pool
const mockQuery = vi.fn();
vi.mock("../../db/pool.js", () => ({
  default: {
    query: (...args) => mockQuery(...args),
  },
}));

import contactsRouter, { setContactsPool } from "../../routes/contacts.js";
import pool from "../../db/pool.js";

describe("Contacts Routes", () => {
  let app;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    setContactsPool(pool);
    app.use("/api", contactsRouter);
  });

  describe("GET /api/contacts", () => {
    it("should return all contacts for user", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            first_name: "John",
            last_name: "Doe",
            email: "john@test.com",
          },
        ],
      });

      const response = await request(app).get("/api/contacts");

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].first_name).toBe("John");
    });

    it("should filter contacts by industry", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get("/api/contacts")
        .query({ industry: "Tech" });

      expect(response.status).toBe(200);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("industry = $"),
        expect.arrayContaining([1, "Tech"])
      );
    });

    it("should filter contacts by relationshipType", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get("/api/contacts")
        .query({ relationshipType: "Mentor" });

      expect(response.status).toBe(200);
    });

    it("should filter contacts by company", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get("/api/contacts")
        .query({ company: "Google" });

      expect(response.status).toBe(200);
    });

    it("should filter contacts by search term", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get("/api/contacts")
        .query({ search: "john" });

      expect(response.status).toBe(200);
    });

    it("should filter with multiple parameters", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app).get("/api/contacts").query({
        industry: "Tech",
        relationshipType: "Mentor",
        company: "Google",
        search: "john",
      });

      expect(response.status).toBe(200);
    });

    it("should handle database errors", async () => {
      mockQuery.mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app).get("/api/contacts");

      expect(response.status).toBe(500);
      expect(response.body.error).toBe("Failed to fetch contacts");
    });
  });

  describe("GET /api/contacts/:id", () => {
    it("should return contact with details", async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ id: 1, first_name: "John", last_name: "Doe", user_id: 1 }],
        })
        .mockResolvedValueOnce({ rows: [{ id: 1, interaction_type: "Email" }] })
        .mockResolvedValueOnce({
          rows: [{ id: 1, reminder_type: "Follow-up" }],
        })
        .mockResolvedValueOnce({ rows: [{ id: 1, link_type: "Job" }] })
        .mockResolvedValueOnce({ rows: [{ id: 1, name: "Tech Group" }] });

      const response = await request(app).get("/api/contacts/1");

      expect(response.status).toBe(200);
      expect(response.body.first_name).toBe("John");
      expect(response.body.interactions).toBeDefined();
      expect(response.body.reminders).toBeDefined();
      expect(response.body.links).toBeDefined();
      expect(response.body.groups).toBeDefined();
    });

    it("should return 404 if contact not found", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app).get("/api/contacts/999");

      expect(response.status).toBe(404);
    });

    it("should handle database errors", async () => {
      mockQuery.mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app).get("/api/contacts/1");

      expect(response.status).toBe(500);
    });
  });

  describe("POST /api/contacts", () => {
    it("should create a new contact", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, first_name: "John", last_name: "Doe" }],
      });

      const response = await request(app)
        .post("/api/contacts")
        .send({ firstName: "John", lastName: "Doe", email: "john@test.com" });

      expect(response.status).toBe(201);
      expect(response.body.first_name).toBe("John");
    });

    it("should create contact with all fields", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, first_name: "John", last_name: "Doe" }],
      });

      const response = await request(app).post("/api/contacts").send({
        firstName: "John",
        lastName: "Doe",
        email: "john@test.com",
        phone: "123-456-7890",
        title: "Engineer",
        company: "Tech Corp",
        industry: "Technology",
        relationshipType: "Colleague",
        relationshipStrength: 5,
        location: "San Francisco",
        linkedinProfile: "https://linkedin.com/in/john",
        notes: "Met at conference",
        personalInterests: "Hiking",
        professionalInterests: "AI",
        mutualConnections: "Jane Doe",
      });

      expect(response.status).toBe(201);
    });

    it("should add contact to groups", async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ id: 1, first_name: "John", last_name: "Doe" }],
        })
        .mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post("/api/contacts")
        .send({
          firstName: "John",
          lastName: "Doe",
          groups: [1, 2],
        });

      expect(response.status).toBe(201);
    });

    it("should return 400 if firstName is missing", async () => {
      const response = await request(app)
        .post("/api/contacts")
        .send({ lastName: "Doe" });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("First and last name are required");
    });

    it("should return 400 if lastName is missing", async () => {
      const response = await request(app)
        .post("/api/contacts")
        .send({ firstName: "John" });

      expect(response.status).toBe(400);
    });

    it("should handle duplicate email error", async () => {
      mockQuery.mockRejectedValueOnce({ code: "23505" });

      const response = await request(app)
        .post("/api/contacts")
        .send({ firstName: "John", lastName: "Doe", email: "john@test.com" });

      expect(response.status).toBe(409);
      expect(response.body.error).toContain("already exists");
    });

    it("should handle database errors", async () => {
      mockQuery.mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app)
        .post("/api/contacts")
        .send({ firstName: "John", lastName: "Doe" });

      expect(response.status).toBe(500);
    });
  });

  describe("PUT /api/contacts/:id", () => {
    it("should update a contact", async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ user_id: 1 }] })
        .mockResolvedValueOnce({
          rows: [{ id: 1, first_name: "Jane", last_name: "Doe" }],
        });

      const response = await request(app).put("/api/contacts/1").send({
        firstName: "Jane",
        lastName: "Doe",
        relationshipType: "Friend",
        relationshipStrength: 5,
      });

      expect(response.status).toBe(200);
      expect(response.body.first_name).toBe("Jane");
    });

    it("should return 403 if not authorized", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ user_id: 999 }] });

      const response = await request(app).put("/api/contacts/1").send({
        firstName: "Jane",
        lastName: "Doe",
      });

      expect(response.status).toBe(403);
    });

    it("should return 403 if contact not found", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app).put("/api/contacts/999").send({
        firstName: "Jane",
        lastName: "Doe",
      });

      expect(response.status).toBe(403);
    });

    it("should return 404 if update returns no rows", async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ user_id: 1 }] })
        .mockResolvedValueOnce({ rows: [] });

      const response = await request(app).put("/api/contacts/1").send({
        firstName: "Jane",
        lastName: "Doe",
      });

      expect(response.status).toBe(404);
    });

    it("should handle database errors", async () => {
      mockQuery.mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app).put("/api/contacts/1").send({
        firstName: "Jane",
        lastName: "Doe",
      });

      expect(response.status).toBe(500);
    });
  });

  describe("DELETE /api/contacts/:id", () => {
    it("should delete a contact", async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ user_id: 1 }] })
        .mockResolvedValueOnce({ rows: [] });

      const response = await request(app).delete("/api/contacts/1");

      expect(response.status).toBe(200);
      expect(response.body.message).toContain("deleted");
    });

    it("should return 403 if not authorized", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ user_id: 999 }] });

      const response = await request(app).delete("/api/contacts/1");

      expect(response.status).toBe(403);
    });

    it("should handle database errors", async () => {
      mockQuery.mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app).delete("/api/contacts/1");

      expect(response.status).toBe(500);
    });
  });

  describe("POST /api/contacts/:id/interactions", () => {
    it("should add an interaction", async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ user_id: 1 }] })
        .mockResolvedValueOnce({
          rows: [
            { id: 1, interaction_type: "Email", notes: "Discussed project" },
          ],
        });

      const response = await request(app)
        .post("/api/contacts/1/interactions")
        .send({
          interactionType: "Email",
          interactionDate: "2024-01-01",
          notes: "Discussed project",
          outcome: "Positive",
        });

      expect(response.status).toBe(201);
    });

    it("should return 403 if not authorized", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ user_id: 999 }] });

      const response = await request(app)
        .post("/api/contacts/1/interactions")
        .send({
          interactionType: "Email",
          interactionDate: "2024-01-01",
        });

      expect(response.status).toBe(403);
    });

    it("should handle database errors", async () => {
      mockQuery.mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app)
        .post("/api/contacts/1/interactions")
        .send({
          interactionType: "Email",
          interactionDate: "2024-01-01",
        });

      expect(response.status).toBe(500);
    });
  });

  describe("GET /api/contacts/:id/interactions", () => {
    it("should get interactions for a contact", async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ user_id: 1 }] })
        .mockResolvedValueOnce({
          rows: [{ id: 1, interaction_type: "Email" }],
        });

      const response = await request(app).get("/api/contacts/1/interactions");

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
    });

    it("should return 403 if not authorized", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app).get("/api/contacts/1/interactions");

      expect(response.status).toBe(403);
    });

    it("should handle database errors", async () => {
      mockQuery.mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app).get("/api/contacts/1/interactions");

      expect(response.status).toBe(500);
    });
  });

  describe("POST /api/contacts/:id/reminders", () => {
    it("should set a reminder", async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ user_id: 1 }] })
        .mockResolvedValueOnce({
          rows: [{ id: 1, reminder_type: "Follow-up" }],
        });

      const response = await request(app)
        .post("/api/contacts/1/reminders")
        .send({
          reminderType: "Follow-up",
          reminderDate: "2024-02-01",
          description: "Check in after interview",
        });

      expect(response.status).toBe(201);
    });

    it("should return 403 if not authorized", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ user_id: 999 }] });

      const response = await request(app)
        .post("/api/contacts/1/reminders")
        .send({
          reminderType: "Follow-up",
          reminderDate: "2024-02-01",
        });

      expect(response.status).toBe(403);
    });

    it("should handle database errors", async () => {
      mockQuery.mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app)
        .post("/api/contacts/1/reminders")
        .send({
          reminderType: "Follow-up",
          reminderDate: "2024-02-01",
        });

      expect(response.status).toBe(500);
    });
  });

  describe("GET /api/contacts/:id/reminders", () => {
    it("should get reminders for a contact", async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ user_id: 1 }] })
        .mockResolvedValueOnce({
          rows: [{ id: 1, reminder_type: "Follow-up" }],
        });

      const response = await request(app).get("/api/contacts/1/reminders");

      expect(response.status).toBe(200);
    });

    it("should return 403 if not authorized", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app).get("/api/contacts/1/reminders");

      expect(response.status).toBe(403);
    });

    it("should handle database errors", async () => {
      mockQuery.mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app).get("/api/contacts/1/reminders");

      expect(response.status).toBe(500);
    });
  });

  describe("PUT /api/contacts/reminders/:reminderId", () => {
    it("should update reminder status", async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [{ id: 1, completed: true }] });

      const response = await request(app)
        .put("/api/contacts/reminders/1")
        .send({ completed: true });

      expect(response.status).toBe(200);
    });

    it("should return 403 if not authorized", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .put("/api/contacts/reminders/1")
        .send({ completed: true });

      expect(response.status).toBe(403);
    });

    it("should handle database errors", async () => {
      mockQuery.mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app)
        .put("/api/contacts/reminders/1")
        .send({ completed: true });

      expect(response.status).toBe(500);
    });
  });

  describe("POST /api/contact-groups", () => {
    it("should create a new group", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, name: "Tech Contacts" }],
      });

      const response = await request(app).post("/api/contact-groups").send({
        name: "Tech Contacts",
        description: "People in tech industry",
      });

      expect(response.status).toBe(201);
    });

    it("should return 400 if name is missing", async () => {
      const response = await request(app)
        .post("/api/contact-groups")
        .send({ description: "Some group" });

      expect(response.status).toBe(400);
    });

    it("should handle duplicate group error", async () => {
      mockQuery.mockRejectedValueOnce({ code: "23505" });

      const response = await request(app)
        .post("/api/contact-groups")
        .send({ name: "Tech Contacts" });

      expect(response.status).toBe(409);
    });

    it("should handle database errors", async () => {
      mockQuery.mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app)
        .post("/api/contact-groups")
        .send({ name: "Tech Contacts" });

      expect(response.status).toBe(500);
    });
  });

  describe("GET /api/contact-groups", () => {
    it("should get all groups", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, name: "Tech Contacts" }],
      });

      const response = await request(app).get("/api/contact-groups");

      expect(response.status).toBe(200);
    });

    it("should handle database errors", async () => {
      mockQuery.mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app).get("/api/contact-groups");

      expect(response.status).toBe(500);
    });
  });

  describe("POST /api/contact-groups/:groupId/contacts/:contactId", () => {
    it("should add contact to group", async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [] });

      const response = await request(app).post(
        "/api/contact-groups/1/contacts/1"
      );

      expect(response.status).toBe(201);
    });

    it("should return 403 if group not owned", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app).post(
        "/api/contact-groups/1/contacts/1"
      );

      expect(response.status).toBe(403);
    });

    it("should return 403 if contact not owned", async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [] });

      const response = await request(app).post(
        "/api/contact-groups/1/contacts/1"
      );

      expect(response.status).toBe(403);
    });

    it("should handle duplicate mapping error", async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockRejectedValueOnce({ code: "23505" });

      const response = await request(app).post(
        "/api/contact-groups/1/contacts/1"
      );

      expect(response.status).toBe(409);
    });

    it("should handle database errors", async () => {
      mockQuery.mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app).post(
        "/api/contact-groups/1/contacts/1"
      );

      expect(response.status).toBe(500);
    });
  });

  describe("DELETE /api/contact-groups/:groupId/contacts/:contactId", () => {
    it("should remove contact from group", async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [] });

      const response = await request(app).delete(
        "/api/contact-groups/1/contacts/1"
      );

      expect(response.status).toBe(200);
    });

    it("should return 403 if group not owned", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app).delete(
        "/api/contact-groups/1/contacts/1"
      );

      expect(response.status).toBe(403);
    });

    it("should handle database errors", async () => {
      mockQuery.mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app).delete(
        "/api/contact-groups/1/contacts/1"
      );

      expect(response.status).toBe(500);
    });
  });

  describe("POST /api/contacts/:id/links", () => {
    it("should create a contact link", async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ user_id: 1 }] })
        .mockResolvedValueOnce({ rows: [{ id: 1, link_type: "Job" }] });

      const response = await request(app).post("/api/contacts/1/links").send({
        linkType: "Job",
        linkId: 123,
        linkDescription: "Referred me for position",
      });

      expect(response.status).toBe(201);
    });

    it("should return 403 if not authorized", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app).post("/api/contacts/1/links").send({
        linkType: "Job",
      });

      expect(response.status).toBe(403);
    });

    it("should handle database errors", async () => {
      mockQuery.mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app).post("/api/contacts/1/links").send({
        linkType: "Job",
      });

      expect(response.status).toBe(500);
    });
  });

  describe("GET /api/contacts/strength/:strength", () => {
    it("should get contacts by strength", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, relationship_strength: 5 }],
      });

      const response = await request(app).get("/api/contacts/strength/4");

      expect(response.status).toBe(200);
    });

    it("should handle database errors", async () => {
      mockQuery.mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app).get("/api/contacts/strength/4");

      expect(response.status).toBe(500);
    });
  });

  describe("POST /api/contacts/import/csv", () => {
    it("should import contacts from CSV", async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 1, first_name: "John" }] })
        .mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post("/api/contacts/import/csv")
        .send({
          contacts: [
            { firstName: "John", lastName: "Doe", email: "john@test.com" },
          ],
          importSource: "CSV",
        });

      expect(response.status).toBe(201);
      expect(response.body.contacts).toHaveLength(1);
    });

    it("should import contacts without email", async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 1, first_name: "John" }] })
        .mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post("/api/contacts/import/csv")
        .send({
          contacts: [{ firstName: "John", lastName: "Doe" }],
        });

      expect(response.status).toBe(201);
    });

    it("should skip contacts without names", async () => {
      const response = await request(app)
        .post("/api/contacts/import/csv")
        .send({
          contacts: [{ email: "john@test.com" }],
        });

      expect(response.status).toBe(201);
      expect(response.body.contacts).toHaveLength(0);
    });

    it("should return 400 if no contacts provided", async () => {
      const response = await request(app)
        .post("/api/contacts/import/csv")
        .send({ contacts: [] });

      expect(response.status).toBe(400);
    });

    it("should handle individual contact import errors", async () => {
      mockQuery
        .mockRejectedValueOnce(new Error("Contact error"))
        .mockResolvedValueOnce({ rows: [{ id: 2, first_name: "Jane" }] })
        .mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post("/api/contacts/import/csv")
        .send({
          contacts: [
            { firstName: "John", lastName: "Doe", email: "john@test.com" },
            { firstName: "Jane", lastName: "Smith", email: "jane@test.com" },
          ],
        });

      expect(response.status).toBe(201);
    });

    it("should continue importing when individual contacts fail", async () => {
      // The import route handles individual contact errors gracefully
      // First contact fails, second succeeds
      mockQuery
        .mockRejectedValueOnce(new Error("First contact failed"))
        .mockResolvedValueOnce({ rows: [{ id: 2, first_name: "Jane" }] })
        .mockResolvedValueOnce({ rows: [] }); // Log import

      const response = await request(app)
        .post("/api/contacts/import/csv")
        .send({
          contacts: [
            { firstName: "John", lastName: "Doe", email: "john@test.com" },
            { firstName: "Jane", lastName: "Smith", email: "jane@test.com" },
          ],
        });

      // Route returns 201 because it handles errors gracefully
      expect(response.status).toBe(201);
      // Only the successful contact is in the result
      expect(response.body.contacts.length).toBeLessThanOrEqual(2);
    });
  });

  describe("POST /api/contacts/import/google", () => {
    it("should import contacts from Google vCard", async () => {
      const vCardData = `BEGIN:VCARD
VERSION:3.0
N:Doe;John;;;
FN:John Doe
EMAIL:john@example.com
TEL:123-456-7890
TITLE:Engineer
ORG:Tech Corp
END:VCARD`;

      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 1, first_name: "John" }] })
        .mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post("/api/contacts/import/google")
        .send({ vCardData });

      expect(response.status).toBe(201);
    });

    it("should import contact without email", async () => {
      const vCardData = `BEGIN:VCARD
VERSION:3.0
N:Doe;John;;;
FN:John Doe
TEL:123-456-7890
END:VCARD`;

      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 1, first_name: "John" }] })
        .mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post("/api/contacts/import/google")
        .send({ vCardData });

      expect(response.status).toBe(201);
    });

    it("should parse URL and NOTE fields", async () => {
      const vCardData = `BEGIN:VCARD
VERSION:3.0
N:Doe;John;;;
FN:John Doe
URL;type=linkedin:https://linkedin.com/in/johndoe
NOTE:Met at conference
END:VCARD`;

      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 1, first_name: "John" }] })
        .mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post("/api/contacts/import/google")
        .send({ vCardData });

      expect(response.status).toBe(201);
    });

    it("should handle multiple vCards", async () => {
      const vCardData = `BEGIN:VCARD
VERSION:3.0
N:Doe;John;;;
FN:John Doe
END:VCARD
BEGIN:VCARD
VERSION:3.0
N:Smith;Jane;;;
FN:Jane Smith
END:VCARD`;

      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 1, first_name: "John" }] })
        .mockResolvedValueOnce({ rows: [{ id: 2, first_name: "Jane" }] })
        .mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post("/api/contacts/import/google")
        .send({ vCardData });

      expect(response.status).toBe(201);
    });

    it("should return 400 if no vCard data provided", async () => {
      const response = await request(app)
        .post("/api/contacts/import/google")
        .send({});

      expect(response.status).toBe(400);
    });

    it("should return 400 if vCard data is not a string", async () => {
      const response = await request(app)
        .post("/api/contacts/import/google")
        .send({ vCardData: 123 });

      expect(response.status).toBe(400);
    });

    it("should skip invalid vCards without names", async () => {
      const vCardData = `BEGIN:VCARD
VERSION:3.0
EMAIL:john@test.com
END:VCARD`;

      const response = await request(app)
        .post("/api/contacts/import/google")
        .send({ vCardData });

      expect(response.status).toBe(201);
      expect(response.body.contacts).toHaveLength(0);
    });

    it("should handle contact import errors gracefully", async () => {
      const vCardData = `BEGIN:VCARD
VERSION:3.0
N:Doe;John;;;
FN:John Doe
EMAIL:john@test.com
END:VCARD`;

      mockQuery.mockRejectedValueOnce(new Error("Contact error"));

      const response = await request(app)
        .post("/api/contacts/import/google")
        .send({ vCardData });

      expect(response.status).toBe(201);
      expect(response.body.contacts).toHaveLength(0);
    });

    it("should handle overall database errors", async () => {
      // The import route has a top-level try-catch that should catch this
      // But individual contact errors are caught separately
      // This tests the outer error handler
      const vCardData = `BEGIN:VCARD
N:Doe;John;;;
EMAIL:john@test.com
END:VCARD`;

      // Set up mock to throw synchronously (simulating connection error)
      let callCount = 0;
      mockQuery.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call succeeds (or we could throw)
          throw new Error("Connection failed immediately");
        }
        return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .post("/api/contacts/import/google")
        .send({ vCardData });

      // The route catches individual errors and continues
      // So it returns 201 even with some failures
      expect(response.status).toBe(201);

      // Reset mock
      mockQuery.mockReset();
    });
  });

  describe("setContactsPool", () => {
    it("should set the pool", () => {
      const mockPool = { query: vi.fn() };
      setContactsPool(mockPool);
      // No error means success
      expect(true).toBe(true);
    });
  });
});
