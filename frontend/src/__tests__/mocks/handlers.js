/**
 * MSW (Mock Service Worker) Handlers
 * Mock API responses for testing
 */
import { http, HttpResponse } from "msw";

const API_BASE = "http://localhost:4000";

// Mock user data
const mockUser = {
  id: 1,
  email: "test@example.com",
  name: "Test User",
  created_at: new Date().toISOString(),
};

// Mock token
const mockToken = "mock-jwt-token-123";

export const handlers = [
  // ===================== AUTH ENDPOINTS =====================

  // Login
  http.post(`${API_BASE}/login`, async ({ request }) => {
    const body = await request.json();
    
    if (body.email === "test@example.com" && body.password === "password123") {
      return HttpResponse.json({
        token: mockToken,
        user: mockUser,
      });
    }
    
    return HttpResponse.json(
      { error: "Invalid credentials" },
      { status: 401 }
    );
  }),

  // Register
  http.post(`${API_BASE}/register`, async ({ request }) => {
    const body = await request.json();
    
    if (body.email && body.password) {
      return HttpResponse.json({
        token: mockToken,
        user: { ...mockUser, email: body.email, name: body.name },
      });
    }
    
    return HttpResponse.json(
      { error: "Registration failed" },
      { status: 400 }
    );
  }),

  // ===================== PROFILE ENDPOINTS =====================

  // Get profile
  http.get(`${API_BASE}/api/profile`, () => {
    return HttpResponse.json({
      ...mockUser,
      bio: "Test bio",
      location: "Test City",
      phone: "123-456-7890",
    });
  }),

  // Update profile
  http.put(`${API_BASE}/api/profile`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      ...mockUser,
      ...body,
    });
  }),

  // ===================== JOBS ENDPOINTS =====================

  // Get jobs
  http.get(`${API_BASE}/api/jobs`, () => {
    return HttpResponse.json([
      {
        id: 1,
        title: "Software Engineer",
        company: "Test Company",
        status: "applied",
        created_at: new Date().toISOString(),
      },
      {
        id: 2,
        title: "Frontend Developer",
        company: "Another Company",
        status: "interview",
        created_at: new Date().toISOString(),
      },
    ]);
  }),

  // Create job
  http.post(`${API_BASE}/api/jobs`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      id: Date.now(),
      ...body,
      created_at: new Date().toISOString(),
    });
  }),

  // Update job
  http.put(`${API_BASE}/api/jobs/:id`, async ({ request, params }) => {
    const body = await request.json();
    return HttpResponse.json({
      id: parseInt(params.id),
      ...body,
    });
  }),

  // Delete job
  http.delete(`${API_BASE}/api/jobs/:id`, ({ params }) => {
    return HttpResponse.json({ success: true, id: params.id });
  }),

  // ===================== DASHBOARD ENDPOINTS =====================

  // Dashboard stats
  http.get(`${API_BASE}/api/dashboard/stats`, () => {
    return HttpResponse.json({
      totalJobs: 25,
      applied: 15,
      interviews: 5,
      offers: 2,
      rejected: 3,
      responseRate: 0.4,
      interviewRate: 0.33,
    });
  }),

  // ===================== COMPANY RESEARCH =====================

  http.get(`${API_BASE}/api/company-research`, ({ request }) => {
    const url = new URL(request.url);
    const company = url.searchParams.get("company");
    
    return HttpResponse.json({
      data: {
        name: company || "Test Company",
        description: "A test company description",
        industry: "Technology",
        size: "1000-5000 employees",
        headquarters: "San Francisco, CA",
      },
    });
  }),

  // ===================== GOALS ENDPOINTS =====================

  http.get(`${API_BASE}/api/goals`, () => {
    return HttpResponse.json({
      weekly_applications: 10,
      monthly_applications: 40,
      target_salary: 100000,
    });
  }),

  http.put(`${API_BASE}/api/goals`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json(body);
  }),

  // ===================== NETWORKING ENDPOINTS =====================

  // Contacts
  http.get(`${API_BASE}/api/networking/contacts`, () => {
    return HttpResponse.json([
      {
        id: 1,
        name: "John Doe",
        company: "Test Corp",
        email: "john@test.com",
        relationship_strength: "strong",
      },
    ]);
  }),

  http.post(`${API_BASE}/api/networking/contacts`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: Date.now(), ...body });
  }),

  // ===================== COVER LETTER ENDPOINTS =====================

  http.get(`${API_BASE}/api/cover-letter/templates`, () => {
    return HttpResponse.json([
      {
        id: 1,
        name: "Default Template",
        content: "Dear Hiring Manager...",
        is_default: true,
      },
    ]);
  }),

  http.post(`${API_BASE}/api/cover-letter/export/pdf`, () => {
    return new HttpResponse(new Blob(["PDF content"]), {
      headers: { "Content-Type": "application/pdf" },
    });
  }),

  // ===================== TEAM/MENTOR ENDPOINTS =====================

  http.get(`${API_BASE}/api/teams/my-team`, () => {
    return HttpResponse.json({
      team: null,
      role: null,
      isMentor: false,
      isCandidate: false,
    });
  }),

  http.get(`${API_BASE}/api/team/me`, () => {
    return HttpResponse.json({
      team: null,
      role: null,
      isMentor: false,
      isCandidate: false,
      hasTeam: false,
    });
  }),

  // ===================== CAREER GOALS ENDPOINTS =====================

  http.get(`${API_BASE}/api/career-goals`, () => {
    return HttpResponse.json([
      { id: 1, title: "Get promoted", status: "in_progress" },
    ]);
  }),

  http.get(`${API_BASE}/api/career-goals/:id`, ({ params }) => {
    return HttpResponse.json({
      id: parseInt(params.id),
      title: "Get promoted",
      status: "in_progress",
    });
  }),

  http.post(`${API_BASE}/api/career-goals`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: Date.now(), ...body });
  }),

  http.put(`${API_BASE}/api/career-goals/:id`, async ({ request, params }) => {
    const body = await request.json();
    return HttpResponse.json({ id: parseInt(params.id), ...body });
  }),

  http.delete(`${API_BASE}/api/career-goals/:id`, ({ params }) => {
    return HttpResponse.json({ success: true, id: params.id });
  }),

  http.get(`${API_BASE}/api/career-goals/analytics/insights`, () => {
    return HttpResponse.json({ insights: [] });
  }),

  // ===================== MORE API ENDPOINTS =====================

  http.get(`${API_BASE}/api/success-analysis/full`, () => {
    return HttpResponse.json({ analysis: {} });
  }),

  http.get(`${API_BASE}/api/interview-analysis/full`, () => {
    return HttpResponse.json({ analysis: {} });
  }),

  http.get(`${API_BASE}/api/networking-analysis/full`, () => {
    return HttpResponse.json({ analysis: {} });
  }),

  http.get(`${API_BASE}/api/offers`, () => {
    return HttpResponse.json([]);
  }),

  http.get(`${API_BASE}/api/offers/:id`, ({ params }) => {
    return HttpResponse.json({ id: parseInt(params.id), company: "Test" });
  }),

  http.post(`${API_BASE}/api/offers`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: Date.now(), ...body });
  }),

  http.put(`${API_BASE}/api/offers/:id`, async ({ request, params }) => {
    const body = await request.json();
    return HttpResponse.json({ id: parseInt(params.id), ...body });
  }),

  http.delete(`${API_BASE}/api/offers/:id`, ({ params }) => {
    return HttpResponse.json({ success: true });
  }),

  http.post(`${API_BASE}/api/offers/:id/negotiate`, async ({ request, params }) => {
    const body = await request.json();
    return HttpResponse.json({ id: parseInt(params.id), ...body });
  }),

  http.post(`${API_BASE}/api/offers/:id/accept`, ({ params }) => {
    return HttpResponse.json({ id: parseInt(params.id), accepted: true });
  }),

  http.post(`${API_BASE}/api/offers/recalculate-competing`, () => {
    return HttpResponse.json({ success: true });
  }),

  // Cover Letter Templates
  http.put(`${API_BASE}/api/cover-letter/templates/:id`, async ({ request, params }) => {
    const body = await request.json();
    return HttpResponse.json({ id: parseInt(params.id), ...body });
  }),

  http.delete(`${API_BASE}/api/cover-letter/templates/:id`, ({ params }) => {
    return HttpResponse.json({ success: true });
  }),

  http.post(`${API_BASE}/api/cover-letter/templates/:id/duplicate`, ({ params }) => {
    return HttpResponse.json({ id: Date.now(), duplicated_from: params.id });
  }),

  // Export endpoints
  http.post(`${API_BASE}/api/cover-letter/export/docx`, () => {
    return new HttpResponse(new Blob(["DOCX content"]), {
      headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
    });
  }),

  http.post(`${API_BASE}/api/cover-letter/export/text`, () => {
    return new HttpResponse(new Blob(["Text content"]), {
      headers: { "Content-Type": "text/plain" },
    });
  }),

  // Compensation Analytics
  http.get(`${API_BASE}/api/compensation-analytics/full`, () => {
    return HttpResponse.json({ analytics: {} });
  }),

  http.get(`${API_BASE}/api/compensation-analytics/comprehensive`, () => {
    return HttpResponse.json({ analytics: {} });
  }),

  http.get(`${API_BASE}/api/compensation-analytics/negotiation-success`, () => {
    return HttpResponse.json({ success_rate: 0.5 });
  }),

  http.get(`${API_BASE}/api/compensation-analytics/market-comparison/:id`, ({ params }) => {
    return HttpResponse.json({ comparison: {} });
  }),

  http.get(`${API_BASE}/api/compensation-analytics/evolution`, () => {
    return HttpResponse.json({ evolution: [] });
  }),

  // Market Benchmarks
  http.post(`${API_BASE}/api/market-benchmarks/fetch`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ benchmark: {} });
  }),

  http.post(`${API_BASE}/api/market-benchmarks/batch-fetch`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ benchmarks: [] });
  }),

  http.post(`${API_BASE}/api/market-benchmarks/auto-fetch-for-offer`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ benchmark: {} });
  }),

  http.get(`${API_BASE}/api/market-benchmarks/test`, () => {
    return HttpResponse.json({ status: "ok" });
  }),

  // Compensation History
  http.get(`${API_BASE}/api/compensation-history`, () => {
    return HttpResponse.json([]);
  }),

  http.post(`${API_BASE}/api/compensation-history`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: Date.now(), ...body });
  }),

  http.put(`${API_BASE}/api/compensation-history/:id`, async ({ request, params }) => {
    const body = await request.json();
    return HttpResponse.json({ id: parseInt(params.id), ...body });
  }),

  http.delete(`${API_BASE}/api/compensation-history/:id`, ({ params }) => {
    return HttpResponse.json({ success: true });
  }),

  // ===================== SKILLS ENDPOINTS =====================

  http.get(`${API_BASE}/api/skills`, () => {
    return HttpResponse.json([
      { id: 1, name: "JavaScript", level: "expert" },
      { id: 2, name: "React", level: "advanced" },
      { id: 3, name: "Node.js", level: "intermediate" },
    ]);
  }),

  // ===================== EDUCATION ENDPOINTS =====================

  http.get(`${API_BASE}/api/education`, () => {
    return HttpResponse.json([
      {
        id: 1,
        institution: "Test University",
        degree: "Bachelor of Science",
        field: "Computer Science",
        start_date: "2018-09-01",
        end_date: "2022-05-01",
      },
    ]);
  }),

  // ===================== EMPLOYMENT ENDPOINTS =====================

  http.get(`${API_BASE}/api/employment`, () => {
    return HttpResponse.json([
      {
        id: 1,
        company: "Previous Company",
        title: "Junior Developer",
        start_date: "2022-06-01",
        end_date: null,
        current: true,
      },
    ]);
  }),

  // Networking endpoint updates
  http.put(`${API_BASE}/api/networking/contacts/:id`, async ({ request, params }) => {
    const body = await request.json();
    return HttpResponse.json({ id: parseInt(params.id), ...body });
  }),

  http.delete(`${API_BASE}/api/networking/contacts/:id`, ({ params }) => {
    return HttpResponse.json({ success: true });
  }),

  http.put(`${API_BASE}/api/networking/referrals/:id`, async ({ request, params }) => {
    const body = await request.json();
    return HttpResponse.json({ id: parseInt(params.id), ...body });
  }),
];

// Error handlers for testing error states
export const errorHandlers = [
  http.post(`${API_BASE}/login`, () => {
    return HttpResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }),

  http.get(`${API_BASE}/api/jobs`, () => {
    return HttpResponse.json(
      { error: "Failed to fetch jobs" },
      { status: 500 }
    );
  }),
];

