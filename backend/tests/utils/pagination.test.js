/**
 * Pagination Utilities Tests
 * Tests utils/pagination.js
 * Target: 90%+ coverage
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import express from "express";
import request from "supertest";
import {
  PAGINATION_DEFAULTS,
  parsePaginationParams,
  generatePaginationMeta,
  applyPaginationToQuery,
  paginationMiddleware,
  formatPaginatedResponse,
  limitOffsetSQL,
  orderBySQL,
} from "../../utils/pagination.js";

describe("Pagination Utilities", () => {
  describe("PAGINATION_DEFAULTS", () => {
    it("should export default pagination configuration", () => {
      expect(PAGINATION_DEFAULTS).toEqual({
        page: 1,
        limit: 20,
        maxLimit: 100,
        defaultSortField: "created_at",
        defaultSortOrder: "DESC",
      });
    });
  });

  describe("parsePaginationParams", () => {
    it("should use defaults when query is empty", () => {
      const result = parsePaginationParams({});
      expect(result).toEqual({
        page: 1,
        limit: 20,
        offset: 0,
        sortField: "created_at",
        sortOrder: "DESC",
        cursor: null,
      });
    });

    it("should parse page from query.page", () => {
      const result = parsePaginationParams({ page: "3" });
      expect(result.page).toBe(3);
      expect(result.offset).toBe(40); // (3-1) * 20
    });

    it("should parse page from query.p as fallback", () => {
      const result = parsePaginationParams({ p: "5" });
      expect(result.page).toBe(5);
      expect(result.offset).toBe(80); // (5-1) * 20
    });

    it("should default to page 1 for invalid page values", () => {
      expect(parsePaginationParams({ page: "0" }).page).toBe(1);
      expect(parsePaginationParams({ page: "-1" }).page).toBe(1);
      expect(parsePaginationParams({ page: "invalid" }).page).toBe(1);
      expect(parsePaginationParams({ page: null }).page).toBe(1);
    });

    it("should parse limit from query.limit", () => {
      const result = parsePaginationParams({ limit: "10" });
      expect(result.limit).toBe(10);
    });

    it("should parse limit from query.per_page as fallback", () => {
      const result = parsePaginationParams({ per_page: "15" });
      expect(result.limit).toBe(15);
    });

    it("should parse limit from query.size as fallback", () => {
      const result = parsePaginationParams({ size: "25" });
      expect(result.limit).toBe(25);
    });

    it("should default to default limit for invalid limit values", () => {
      expect(parsePaginationParams({ limit: "0" }).limit).toBe(20);
      expect(parsePaginationParams({ limit: "-1" }).limit).toBe(20);
      expect(parsePaginationParams({ limit: "invalid" }).limit).toBe(20);
      expect(parsePaginationParams({ limit: null }).limit).toBe(20);
    });

    it("should cap limit at maxLimit", () => {
      const result = parsePaginationParams({ limit: "200" });
      expect(result.limit).toBe(100); // maxLimit
    });

    it("should calculate offset correctly", () => {
      expect(parsePaginationParams({ page: "1", limit: "10" }).offset).toBe(0);
      expect(parsePaginationParams({ page: "2", limit: "10" }).offset).toBe(10);
      expect(parsePaginationParams({ page: "3", limit: "25" }).offset).toBe(50);
    });

    it("should parse sortField from query.sort", () => {
      const result = parsePaginationParams({ sort: "name" });
      expect(result.sortField).toBe("name");
    });

    it("should parse sortField from query.sortBy as fallback", () => {
      const result = parsePaginationParams({ sortBy: "title" });
      expect(result.sortField).toBe("title");
    });

    it("should parse sortField from query.order_by as fallback", () => {
      const result = parsePaginationParams({ order_by: "updated_at" });
      expect(result.sortField).toBe("updated_at");
    });

    it("should use default sortField when not provided", () => {
      const result = parsePaginationParams({});
      expect(result.sortField).toBe("created_at");
    });

    it("should parse sortOrder from query.order", () => {
      const result = parsePaginationParams({ order: "asc" });
      expect(result.sortOrder).toBe("ASC");
    });

    it("should parse sortOrder from query.sortOrder as fallback", () => {
      const result = parsePaginationParams({ sortOrder: "desc" });
      expect(result.sortOrder).toBe("DESC");
    });

    it("should parse sortOrder from query.direction as fallback", () => {
      const result = parsePaginationParams({ direction: "asc" });
      expect(result.sortOrder).toBe("ASC");
    });

    it("should uppercase sortOrder", () => {
      expect(parsePaginationParams({ order: "asc" }).sortOrder).toBe("ASC");
      expect(parsePaginationParams({ order: "desc" }).sortOrder).toBe("DESC");
      expect(parsePaginationParams({ order: "ASC" }).sortOrder).toBe("ASC");
      expect(parsePaginationParams({ order: "DESC" }).sortOrder).toBe("DESC");
    });

    it("should default to DESC for invalid sortOrder", () => {
      expect(parsePaginationParams({ order: "invalid" }).sortOrder).toBe("DESC");
      expect(parsePaginationParams({ order: "random" }).sortOrder).toBe("DESC");
      expect(parsePaginationParams({ order: "" }).sortOrder).toBe("DESC");
    });

    it("should parse cursor from query.cursor", () => {
      const result = parsePaginationParams({ cursor: "abc123" });
      expect(result.cursor).toBe("abc123");
    });

    it("should parse cursor from query.after as fallback", () => {
      const result = parsePaginationParams({ after: "xyz789" });
      expect(result.cursor).toBe("xyz789");
    });

    it("should return null cursor when not provided", () => {
      const result = parsePaginationParams({});
      expect(result.cursor).toBe(null);
    });

    it("should accept custom options to override defaults", () => {
      const result = parsePaginationParams(
        {},
        { page: 2, limit: 50, maxLimit: 200, defaultSortField: "name", defaultSortOrder: "ASC" }
      );
      expect(result.page).toBe(2);
      expect(result.limit).toBe(50);
      expect(result.sortField).toBe("name");
      expect(result.sortOrder).toBe("ASC");
    });

    it("should respect custom maxLimit in options", () => {
      const result = parsePaginationParams({ limit: "150" }, { maxLimit: 200 });
      expect(result.limit).toBe(150);
      
      const result2 = parsePaginationParams({ limit: "250" }, { maxLimit: 200 });
      expect(result2.limit).toBe(200);
    });

    it("should handle all parameters together", () => {
      const result = parsePaginationParams({
        page: "2",
        limit: "15",
        sort: "name",
        order: "asc",
        cursor: "test123",
      });
      expect(result).toEqual({
        page: 2,
        limit: 15,
        offset: 15,
        sortField: "name",
        sortOrder: "ASC",
        cursor: "test123",
      });
    });
  });

  describe("generatePaginationMeta", () => {
    it("should generate basic pagination metadata", () => {
      const result = generatePaginationMeta(100, 1, 20);
      expect(result.pagination).toEqual({
        total: 100,
        page: 1,
        limit: 20,
        totalPages: 5,
        hasNextPage: true,
        hasPrevPage: false,
      });
    });

    it("should calculate totalPages correctly", () => {
      expect(generatePaginationMeta(100, 1, 20).pagination.totalPages).toBe(5);
      expect(generatePaginationMeta(100, 1, 25).pagination.totalPages).toBe(4);
      expect(generatePaginationMeta(99, 1, 20).pagination.totalPages).toBe(5); // Math.ceil
      expect(generatePaginationMeta(0, 1, 20).pagination.totalPages).toBe(0);
    });

    it("should set hasNextPage correctly", () => {
      expect(generatePaginationMeta(100, 1, 20).pagination.hasNextPage).toBe(true);
      expect(generatePaginationMeta(100, 5, 20).pagination.hasNextPage).toBe(false);
      expect(generatePaginationMeta(100, 3, 20).pagination.hasNextPage).toBe(true);
    });

    it("should set hasPrevPage correctly", () => {
      expect(generatePaginationMeta(100, 1, 20).pagination.hasPrevPage).toBe(false);
      expect(generatePaginationMeta(100, 2, 20).pagination.hasPrevPage).toBe(true);
      expect(generatePaginationMeta(100, 5, 20).pagination.hasPrevPage).toBe(true);
    });

    it("should not include links when baseUrl is not provided", () => {
      const result = generatePaginationMeta(100, 1, 20);
      expect(result.links).toBeUndefined();
    });

    it("should include prev and first links when hasPrevPage is true", () => {
      const result = generatePaginationMeta(100, 2, 20, "https://api.example.com/items");
      expect(result.links.prev).toBe("https://api.example.com/items?page=1&limit=20");
      expect(result.links.first).toBe("https://api.example.com/items?page=1&limit=20");
    });

    it("should include next and last links when hasNextPage is true", () => {
      const result = generatePaginationMeta(100, 1, 20, "https://api.example.com/items");
      expect(result.links.next).toBe("https://api.example.com/items?page=2&limit=20");
      expect(result.links.last).toBe("https://api.example.com/items?page=5&limit=20");
    });

    it("should include all links when on middle page", () => {
      const result = generatePaginationMeta(100, 3, 20, "https://api.example.com/items");
      expect(result.links.prev).toBe("https://api.example.com/items?page=2&limit=20");
      expect(result.links.first).toBe("https://api.example.com/items?page=1&limit=20");
      expect(result.links.next).toBe("https://api.example.com/items?page=4&limit=20");
      expect(result.links.last).toBe("https://api.example.com/items?page=5&limit=20");
    });

    it("should not include prev/first links on first page", () => {
      const result = generatePaginationMeta(100, 1, 20, "https://api.example.com/items");
      expect(result.links.prev).toBeUndefined();
      expect(result.links.first).toBeUndefined();
      expect(result.links.next).toBeDefined();
      expect(result.links.last).toBeDefined();
    });

    it("should not include next/last links on last page", () => {
      const result = generatePaginationMeta(100, 5, 20, "https://api.example.com/items");
      expect(result.links.next).toBeUndefined();
      expect(result.links.last).toBeUndefined();
      expect(result.links.prev).toBeDefined();
      expect(result.links.first).toBeDefined();
    });

    it("should handle empty results", () => {
      const result = generatePaginationMeta(0, 1, 20);
      expect(result.pagination).toEqual({
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false,
      });
    });
  });

  describe("applyPaginationToQuery", () => {
    it("should apply pagination to a simple query", () => {
      const baseQuery = "SELECT * FROM jobs";
      const paginationParams = {
        limit: 10,
        offset: 20,
        sortField: "created_at",
        sortOrder: "DESC",
      };
      const result = applyPaginationToQuery(baseQuery, paginationParams, ["created_at", "name"]);

      expect(result.query).toContain("ORDER BY created_at DESC");
      expect(result.query).toContain("LIMIT");
      expect(result.query).toContain("OFFSET");
      expect(result.countQuery).toBe(`SELECT COUNT(*) as total FROM (${baseQuery}) as count_query`);
      expect(result.paginationValues).toEqual([10, 20]);
    });

    it("should use safe sortField when provided in allowedSortFields", () => {
      const baseQuery = "SELECT * FROM jobs";
      const paginationParams = {
        limit: 10,
        offset: 0,
        sortField: "name",
        sortOrder: "ASC",
      };
      const result = applyPaginationToQuery(baseQuery, paginationParams, ["created_at", "name", "title"]);

      expect(result.query).toContain("ORDER BY name ASC");
    });

    it("should default to created_at when sortField not in allowedSortFields", () => {
      const baseQuery = "SELECT * FROM jobs";
      const paginationParams = {
        limit: 10,
        offset: 0,
        sortField: "injected_sql",
        sortOrder: "DESC",
      };
      const result = applyPaginationToQuery(baseQuery, paginationParams, ["created_at", "name"]);

      expect(result.query).toContain("ORDER BY created_at DESC");
    });

    it("should default to created_at when allowedSortFields is empty", () => {
      const baseQuery = "SELECT * FROM jobs";
      const paginationParams = {
        limit: 10,
        offset: 0,
        sortField: "any_field",
        sortOrder: "DESC",
      };
      const result = applyPaginationToQuery(baseQuery, paginationParams, []);

      expect(result.query).toContain("ORDER BY created_at DESC");
    });

    it("should handle queries with existing parameters", () => {
      const baseQuery = "SELECT * FROM jobs WHERE user_id = $1 AND status = $2";
      const paginationParams = {
        limit: 5,
        offset: 10,
        sortField: "created_at",
        sortOrder: "ASC",
      };
      const result = applyPaginationToQuery(baseQuery, paginationParams, ["created_at"]);

      // Should handle parameter numbering correctly
      expect(result.query).toContain("LIMIT");
      expect(result.query).toContain("OFFSET");
      expect(result.paginationValues).toEqual([5, 10]);
    });

    it("should generate count query correctly", () => {
      const baseQuery = "SELECT id, name FROM users WHERE active = true";
      const paginationParams = {
        limit: 10,
        offset: 0,
        sortField: "name",
        sortOrder: "ASC",
      };
      const result = applyPaginationToQuery(baseQuery, paginationParams, ["name"]);

      expect(result.countQuery).toBe(`SELECT COUNT(*) as total FROM (${baseQuery}) as count_query`);
    });
  });

  describe("paginationMiddleware", () => {
    it("should parse pagination params and attach to request", async () => {
      const app = express();
      app.use(express.json());
      app.use(paginationMiddleware());
      app.get("/test", (req, res) => {
        res.json(req.pagination);
      });

      const response = await request(app).get("/test?page=2&limit=15");
      expect(response.status).toBe(200);
      expect(response.body.page).toBe(2);
      expect(response.body.limit).toBe(15);
    });

    it("should use defaults when no query params provided", async () => {
      const app = express();
      app.use(express.json());
      app.use(paginationMiddleware());
      app.get("/test", (req, res) => {
        res.json(req.pagination);
      });

      const response = await request(app).get("/test");
      expect(response.status).toBe(200);
      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(20);
    });

    it("should accept custom options", async () => {
      const app = express();
      app.use(express.json());
      app.use(
        paginationMiddleware({
          page: 1,
          limit: 50,
          maxLimit: 200,
          defaultSortField: "name",
          defaultSortOrder: "ASC",
        })
      );
      app.get("/test", (req, res) => {
        res.json(req.pagination);
      });

      const response = await request(app).get("/test");
      expect(response.status).toBe(200);
      expect(response.body.limit).toBe(50);
      expect(response.body.sortField).toBe("name");
      expect(response.body.sortOrder).toBe("ASC");
    });

    it("should call next() to continue middleware chain", async () => {
      const app = express();
      app.use(express.json());
      const middleware = paginationMiddleware();
      let nextCalled = false;

      const mockNext = () => {
        nextCalled = true;
      };

      const mockReq = {
        query: { page: "1" },
      };
      const mockRes = {};

      middleware(mockReq, mockRes, mockNext);
      expect(nextCalled).toBe(true);
      expect(mockReq.pagination).toBeDefined();
    });
  });

  describe("formatPaginatedResponse", () => {
    it("should format paginated response correctly", () => {
      const data = [{ id: 1 }, { id: 2 }];
      const total = 100;
      const pagination = { page: 1, limit: 20 };

      const result = formatPaginatedResponse(data, total, pagination);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(data);
      expect(result.pagination.total).toBe(100);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);
      expect(result.pagination.totalPages).toBe(5);
    });

    it("should handle empty data", () => {
      const data = [];
      const total = 0;
      const pagination = { page: 1, limit: 20 };

      const result = formatPaginatedResponse(data, total, pagination);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
      expect(result.pagination.totalPages).toBe(0);
    });

    it("should include pagination metadata", () => {
      const data = [{ id: 1 }];
      const total = 50;
      const pagination = { page: 2, limit: 10 };

      const result = formatPaginatedResponse(data, total, pagination);

      expect(result.pagination).toHaveProperty("total");
      expect(result.pagination).toHaveProperty("page");
      expect(result.pagination).toHaveProperty("limit");
      expect(result.pagination).toHaveProperty("totalPages");
      expect(result.pagination).toHaveProperty("hasNextPage");
      expect(result.pagination).toHaveProperty("hasPrevPage");
    });
  });

  describe("limitOffsetSQL", () => {
    it("should generate LIMIT OFFSET SQL clause", () => {
      const result = limitOffsetSQL(10, 20);
      expect(result).toBe("LIMIT 10 OFFSET 20");
    });

    it("should parse string numbers", () => {
      const result = limitOffsetSQL("10", "20");
      expect(result).toBe("LIMIT 10 OFFSET 20");
    });

    it("should handle zero values", () => {
      const result = limitOffsetSQL(0, 0);
      expect(result).toBe("LIMIT 0 OFFSET 0");
    });

    it("should handle large numbers", () => {
      const result = limitOffsetSQL(1000, 5000);
      expect(result).toBe("LIMIT 1000 OFFSET 5000");
    });
  });

  describe("orderBySQL", () => {
    it("should generate ORDER BY SQL clause with default DESC", () => {
      const result = orderBySQL("created_at");
      expect(result).toBe("ORDER BY created_at DESC");
    });

    it("should generate ORDER BY SQL clause with ASC", () => {
      const result = orderBySQL("name", "ASC");
      expect(result).toBe("ORDER BY name ASC");
    });

    it("should generate ORDER BY SQL clause with DESC", () => {
      const result = orderBySQL("name", "DESC");
      expect(result).toBe("ORDER BY name DESC");
    });

    it("should use field from allowedFields when provided and field is in list", () => {
      const result = orderBySQL("name", "ASC", ["name", "created_at", "title"]);
      expect(result).toBe("ORDER BY name ASC");
    });

    it("should use first allowedField when field not in allowedFields", () => {
      const result = orderBySQL("injected_sql", "ASC", ["name", "created_at"]);
      expect(result).toBe("ORDER BY name ASC");
    });

    it("should use field directly when allowedFields is empty", () => {
      const result = orderBySQL("any_field", "ASC", []);
      expect(result).toBe("ORDER BY any_field ASC");
    });

    it("should use field directly when allowedFields is empty (no validation)", () => {
      const result = orderBySQL("injected", "DESC", []);
      expect(result).toBe("ORDER BY injected DESC");
    });

    it("should use first allowedField when field not in list", () => {
      const result = orderBySQL("unsafe_field", "ASC", ["safe_field", "another_safe"]);
      expect(result).toBe("ORDER BY safe_field ASC");
    });

    it("should default to DESC for invalid order", () => {
      const result = orderBySQL("name", "invalid");
      expect(result).toBe("ORDER BY name DESC");
    });

    it("should handle case-insensitive order", () => {
      expect(orderBySQL("name", "asc")).toBe("ORDER BY name ASC");
      expect(orderBySQL("name", "desc")).toBe("ORDER BY name DESC");
      expect(orderBySQL("name", "ASC")).toBe("ORDER BY name ASC");
      expect(orderBySQL("name", "DESC")).toBe("ORDER BY name DESC");
    });

    it("should handle empty allowedFields array (uses field directly)", () => {
      const result = orderBySQL("name", "ASC", []);
      expect(result).toBe("ORDER BY name ASC");
    });

    it("should use field when allowedFields is not provided", () => {
      const result = orderBySQL("name", "ASC");
      expect(result).toBe("ORDER BY name ASC");
    });
  });
});

