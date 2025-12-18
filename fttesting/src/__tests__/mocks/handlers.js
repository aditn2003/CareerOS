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
    
    return HttpResponse.json({ error: "Invalid credentials" }, { status: 401 });
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
    
    return HttpResponse.json({ error: "Registration failed" }, { status: 400 });
  }),

  // ===================== PROFILE ENDPOINTS =====================

  // Get profile
  http.get(`${API_BASE}/api/profile`, () => {
    return HttpResponse.json({
      profile: {
      ...mockUser,
      bio: "Test bio",
      location: "Test City",
      phone: "123-456-7890",
        home_latitude: 40.7128,
        home_longitude: -74.006,
        home_timezone: "America/New_York",
        home_utc_offset: -300,
      },
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
    // Component expects res.data.jobs structure
    return HttpResponse.json({
      jobs: [
      {
        id: 1,
        title: "Software Engineer",
          company: "Tech Corp",
          status: "Applied",
        created_at: new Date().toISOString(),
      },
      {
        id: 2,
        title: "Frontend Developer",
          company: "Web Inc",
          status: "Interview",
        created_at: new Date().toISOString(),
      },
        {
          id: 3,
          title: "Backend Developer",
          company: "Data Co",
          status: "Offer",
          created_at: new Date().toISOString(),
        },
      ],
    });
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

  http.post(
    `${API_BASE}/api/offers/:id/negotiate`,
    async ({ request, params }) => {
    const body = await request.json();
    return HttpResponse.json({ id: parseInt(params.id), ...body });
    }
  ),

  http.post(`${API_BASE}/api/offers/:id/accept`, ({ params }) => {
    return HttpResponse.json({ id: parseInt(params.id), accepted: true });
  }),

  http.post(`${API_BASE}/api/offers/recalculate-competing`, () => {
    return HttpResponse.json({ success: true });
  }),

  // Cover Letter Templates
  http.put(
    `${API_BASE}/api/cover-letter/templates/:id`,
    async ({ request, params }) => {
    const body = await request.json();
    return HttpResponse.json({ id: parseInt(params.id), ...body });
    }
  ),

  http.delete(`${API_BASE}/api/cover-letter/templates/:id`, ({ params }) => {
    return HttpResponse.json({ success: true });
  }),

  http.post(
    `${API_BASE}/api/cover-letter/templates/:id/duplicate`,
    ({ params }) => {
    return HttpResponse.json({ id: Date.now(), duplicated_from: params.id });
    }
  ),

  // Export endpoints
  http.post(`${API_BASE}/api/cover-letter/export/docx`, () => {
    return new HttpResponse(new Blob(["DOCX content"]), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      },
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

  http.get(
    `${API_BASE}/api/compensation-analytics/market-comparison/:id`,
    ({ params }) => {
    return HttpResponse.json({ comparison: {} });
    }
  ),

  http.get(`${API_BASE}/api/compensation-analytics/evolution`, () => {
    return HttpResponse.json({ evolution: [] });
  }),

  // Market Benchmarks
  http.post(`${API_BASE}/api/market-benchmarks/fetch`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ benchmark: {} });
  }),

  http.post(
    `${API_BASE}/api/market-benchmarks/batch-fetch`,
    async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ benchmarks: [] });
    }
  ),

  http.post(
    `${API_BASE}/api/market-benchmarks/auto-fetch-for-offer`,
    async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ benchmark: {} });
    }
  ),

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

  http.put(
    `${API_BASE}/api/compensation-history/:id`,
    async ({ request, params }) => {
    const body = await request.json();
    return HttpResponse.json({ id: parseInt(params.id), ...body });
    }
  ),

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
  http.put(
    `${API_BASE}/api/networking/contacts/:id`,
    async ({ request, params }) => {
    const body = await request.json();
    return HttpResponse.json({ id: parseInt(params.id), ...body });
    }
  ),

  http.delete(`${API_BASE}/api/networking/contacts/:id`, ({ params }) => {
    return HttpResponse.json({ success: true });
  }),

  http.put(
    `${API_BASE}/api/networking/referrals/:id`,
    async ({ request, params }) => {
    const body = await request.json();
    return HttpResponse.json({ id: parseInt(params.id), ...body });
    }
  ),

  // ===================== MATCH ENDPOINTS =====================

  http.get(`${API_BASE}/api/match/history`, () => {
    return HttpResponse.json({
      history: [
        {
          id: 1,
          jobId: 1,
          overallScore: 85,
          job: {
            id: 1,
            title: "Software Engineer",
            company: "Test Company",
            salary_min: 120000,
            salary_max: 140000,
            experience_required: "3-5 years",
            skills_required: ["JavaScript", "React", "Node.js"],
            skills_preferred: ["TypeScript", "AWS"],
          },
          created_at: new Date().toISOString(),
        },
      ],
    });
  }),

  http.get(`${API_BASE}/api/match/metrics`, () => {
    return HttpResponse.json({
      totalMatches: 10,
      averageScore: 78,
      highestScore: 95,
      lowestScore: 45,
    });
  }),

  http.get(`${API_BASE}/api/jobs/:id/match`, ({ params }) => {
    return HttpResponse.json({
      overallScore: 85,
      skillsMatch: 90,
      experienceMatch: 80,
      salaryMatch: 85,
    });
  }),

  // ===================== MATERIAL COMPARISON ENDPOINTS =====================

  http.get(`${API_BASE}/api/material-comparison/metrics`, () => {
    return HttpResponse.json({
      resumeVersions: 2,
      coverLetterVersions: 1,
      totalApplications: 15,
    });
  }),

  http.get(`${API_BASE}/api/material-comparison/labeled-versions`, () => {
    return HttpResponse.json({
      resume: [
        { label: "v1", count: 10 },
        { label: "v2", count: 5 },
      ],
      coverLetter: [{ label: "Standard", count: 15 }],
    });
  }),

  // ===================== TEAM MANAGEMENT ENDPOINTS =====================

  http.get(`${API_BASE}/api/team/mentor/all`, () => {
    return HttpResponse.json({
      teams: [
        { id: 1, name: "Test Team", created_at: new Date().toISOString() },
      ],
    });
  }),

  http.get(`${API_BASE}/api/team/admin/all`, () => {
    return HttpResponse.json({
      teams: [
        { id: 1, name: "Test Team", created_at: new Date().toISOString() },
      ],
    });
  }),

  http.get(`${API_BASE}/api/team/:teamId/members`, ({ params }) => {
    return HttpResponse.json({
      members: [
        {
          id: 1,
          email: "mentor@test.com",
          name: "Mentor User",
          role: "mentor",
        },
        {
          id: 2,
          email: "candidate@test.com",
          name: "Candidate User",
          role: "candidate",
        },
      ],
    });
  }),

  http.get(`${API_BASE}/api/team/:teamId/pending-requests`, ({ params }) => {
    return HttpResponse.json({
      requests: [],
    });
  }),

  http.get(`${API_BASE}/api/team/:teamId/analytics`, ({ params }) => {
    return HttpResponse.json({
      memberStats: [
        {
          userId: 1,
          name: "John Doe",
          applications: 15,
          interviews: 5,
          offers: 1,
        },
        {
          userId: 2,
          name: "Jane Smith",
          applications: 12,
          interviews: 3,
          offers: 0,
        },
      ],
      teamTotal: { applications: 27, interviews: 8, offers: 1 },
    });
  }),

  http.post(`${API_BASE}/api/team/create`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: Date.now(), ...body });
  }),

  http.post(
    `${API_BASE}/api/team/:teamId/invite`,
    async ({ request, params }) => {
    const body = await request.json();
    return HttpResponse.json({ success: true, email: body.email });
    }
  ),

  http.delete(`${API_BASE}/api/team/:teamId/member/:userId`, ({ params }) => {
    return HttpResponse.json({ success: true });
  }),

  // ===================== INTERVIEW ENDPOINTS =====================

  http.get(`${API_BASE}/api/interviews/insights`, () => {
    return HttpResponse.json({
      insights: [],
      commonQuestions: [],
    });
  }),

  http.get(`${API_BASE}/api/interviews/questions`, () => {
    return HttpResponse.json({
      questions: [
        { id: 1, question: "Tell me about yourself", category: "behavioral" },
        {
          id: 2,
          question: "What is your greatest strength?",
          category: "behavioral",
        },
      ],
    });
  }),

  http.post(`${API_BASE}/api/interviews/mock/start`, () => {
    return HttpResponse.json({
      sessionId: "mock-session-123",
      questions: [{ id: 1, question: "Tell me about yourself" }],
    });
  }),

  http.post(
    `${API_BASE}/api/interviews/coaching/evaluate`,
    async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      score: 85,
      feedback: "Good answer!",
      suggestions: ["Be more specific"],
    });
    }
  ),

  http.get(`${API_BASE}/api/technical-prep/topics`, () => {
    return HttpResponse.json({
      topics: [
        { id: 1, name: "Data Structures", progress: 50 },
        { id: 2, name: "Algorithms", progress: 30 },
      ],
    });
  }),

  http.get(`${API_BASE}/api/technical-prep/problems`, () => {
    return HttpResponse.json({
      problems: [
        { id: 1, title: "Two Sum", difficulty: "Easy", solved: true },
        { id: 2, title: "Merge Sort", difficulty: "Medium", solved: false },
      ],
    });
  }),

  // ===================== MENTOR TAB ENDPOINTS =====================

  http.get(`${API_BASE}/api/mentor/activity-feed`, () => {
    return HttpResponse.json({
      activities: [
        {
          id: 1,
          type: "application",
          user: "John",
          description: "Applied to Google",
          timestamp: new Date().toISOString(),
        },
      ],
    });
  }),

  http.get(`${API_BASE}/api/mentor/shared-jobs`, () => {
    return HttpResponse.json({
      jobs: [
        {
          id: 1,
          title: "Software Engineer",
          company: "Test Corp",
          sharedBy: "Mentor",
        },
      ],
    });
  }),

  http.get(`${API_BASE}/api/mentor/tasks`, () => {
    return HttpResponse.json({
      tasks: [
        {
          id: 1,
          title: "Complete resume",
          assignee: "John",
          status: "pending",
          dueDate: new Date().toISOString(),
        },
      ],
    });
  }),

  // ===================== DOCUMENTS MANAGEMENT ENDPOINTS =====================

  http.get(`${API_BASE}/api/certifications`, () => {
    return HttpResponse.json([
      {
        id: 1,
        name: "AWS Certified",
        issuer: "Amazon",
        date_obtained: "2023-01-15",
        expiry_date: "2026-01-15",
      },
    ]);
  }),

  http.post(`${API_BASE}/api/certifications`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: Date.now(), ...body });
  }),

  http.put(
    `${API_BASE}/api/certifications/:id`,
    async ({ request, params }) => {
    const body = await request.json();
    return HttpResponse.json({ id: parseInt(params.id), ...body });
    }
  ),

  http.delete(`${API_BASE}/api/certifications/:id`, ({ params }) => {
    return HttpResponse.json({ success: true });
  }),

  // ===================== RESUMES ENDPOINTS =====================

  http.get(`${API_BASE}/api/resumes`, () => {
    return HttpResponse.json([
      {
        id: 1,
        title: "Software Engineer Resume",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);
  }),

  http.get(`${API_BASE}/api/resumes/:id`, ({ params }) => {
    return HttpResponse.json({
      id: parseInt(params.id),
      title: "Software Engineer Resume",
      content: {},
      created_at: new Date().toISOString(),
    });
  }),

  http.post(`${API_BASE}/api/resumes`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: Date.now(), ...body });
  }),

  http.put(`${API_BASE}/api/resumes/:id`, async ({ request, params }) => {
    const body = await request.json();
    return HttpResponse.json({ id: parseInt(params.id), ...body });
  }),

  http.delete(`${API_BASE}/api/resumes/:id`, ({ params }) => {
    return HttpResponse.json({ success: true });
  }),

  // Resume Download
  http.get(`${API_BASE}/api/resumes/:id/download/:format`, ({ params }) => {
    return new HttpResponse(new Blob([`Resume in ${params.format} format`]), {
      headers: {
        "Content-Type":
          params.format === "pdf"
            ? "application/pdf"
            : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      },
    });
  }),

  // ===================== PROFILE PICTURE ENDPOINTS =====================

  http.get(`${API_BASE}/api/profile/picture`, () => {
    return HttpResponse.json({ url: "https://example.com/profile.jpg" });
  }),

  http.post(`${API_BASE}/api/profile/picture`, async ({ request }) => {
    return HttpResponse.json({ url: "https://example.com/new-profile.jpg" });
  }),

  // ===================== API MONITORING ENDPOINTS =====================

  http.get(`${API_BASE}/api/admin/api-monitoring`, () => {
    return HttpResponse.json({
      requests: [
        {
          id: 1,
          endpoint: "/api/jobs",
          method: "GET",
          status: 200,
          duration: 50,
          timestamp: new Date().toISOString(),
        },
      ],
      stats: {
        totalRequests: 1000,
        averageResponseTime: 120,
        errorRate: 0.02,
      },
    });
  }),

  // ===================== FEEDBACK ENDPOINTS =====================

  http.get(`${API_BASE}/api/feedback`, () => {
    return HttpResponse.json([
      {
        id: 1,
        message: "Great progress!",
        fromUser: { id: 2, name: "Mentor" },
        created_at: new Date().toISOString(),
      },
    ]);
  }),

  http.get(`${API_BASE}/api/team/:teamId/feedback`, ({ params }) => {
    return HttpResponse.json({
      feedback: [],
    });
  }),

  http.post(`${API_BASE}/api/feedback`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: Date.now(), ...body });
  }),

  // ===================== REMINDERS ENDPOINTS =====================

  http.get(`${API_BASE}/api/reminders`, () => {
    return HttpResponse.json([
      {
        id: 1,
        title: "Follow up with recruiter",
        dueDate: new Date().toISOString(),
        completed: false,
      },
    ]);
  }),

  http.post(`${API_BASE}/api/reminders`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: Date.now(), ...body });
  }),

  // ===================== SETTINGS ENDPOINTS =====================

  http.get(`${API_BASE}/api/settings/goals`, () => {
    return HttpResponse.json({
      weeklyApplications: 10,
      monthlyApplications: 40,
      targetSalary: 100000,
      isCustom: false,
    });
  }),

  http.put(`${API_BASE}/api/settings/goals`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json(body);
  }),

  // ===================== STATISTICS ENDPOINTS =====================

  http.get(`${API_BASE}/api/statistics`, () => {
    return HttpResponse.json({
      totalApplications: 50,
      totalInterviews: 10,
      totalOffers: 3,
      conversionRate: 0.2,
      averageResponseTime: 5,
    });
  }),

  http.get(`${API_BASE}/api/statistics/detailed`, () => {
    return HttpResponse.json({
      byMonth: [
        { month: "Jan", applications: 10, interviews: 2, offers: 0 },
        { month: "Feb", applications: 15, interviews: 3, offers: 1 },
      ],
      byStatus: {
        applied: 30,
        interviewing: 10,
        offered: 3,
        rejected: 7,
      },
    });
  }),

  // ===================== QUALITY SCORING ENDPOINTS =====================

  http.get(`${API_BASE}/api/quality-score/:jobId`, ({ params }) => {
    return HttpResponse.json({
      overall: 85,
      resume: 90,
      coverLetter: 80,
      breakdown: {
        keywords: 85,
        formatting: 90,
        relevance: 80,
      },
    });
  }),

  // ===================== REFERENCES ENDPOINTS =====================

  http.get(`${API_BASE}/api/references`, () => {
    return HttpResponse.json([
      {
        id: 1,
        name: "Bob Manager",
        title: "Engineering Manager",
        company: "Previous Corp",
        email: "bob@previous.com",
        phone: "555-1234",
        relationship: "Former Manager",
        yearsKnown: 3,
        status: "confirmed",
      },
      {
        id: 2,
        name: "Alice Colleague",
        title: "Senior Developer",
        company: "Tech Inc",
        email: "alice@tech.com",
        phone: "555-5678",
        relationship: "Former Colleague",
        yearsKnown: 2,
        status: "pending",
      },
    ]);
  }),

  http.post(`${API_BASE}/api/references`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: Date.now(), ...body });
  }),

  // ===================== INDUSTRY CONTACTS ENDPOINTS =====================

  http.get(`${API_BASE}/api/industry-contacts/discover`, () => {
    return HttpResponse.json({
      contacts: [
        {
          id: 1,
          name: "Industry Expert",
          company: "Tech Corp",
          title: "Director",
        },
      ],
    });
  }),

  // ===================== INFORMATIONAL INTERVIEWS ENDPOINTS =====================

  http.get(`${API_BASE}/api/informational-interviews`, () => {
    return HttpResponse.json([
      {
        id: 1,
        contact: { name: "Jane Expert" },
        company: "Tech Inc",
        scheduledDate: new Date().toISOString(),
        status: "scheduled",
      },
    ]);
  }),

  // ===================== JOB MAP ENDPOINTS =====================

  http.get(`${API_BASE}/api/jobs/map`, () => {
    return HttpResponse.json({
      success: true,
      jobs: [
        {
          id: 1,
          title: "Software Engineer",
          company: "Tech Corp",
          location: "New York, NY",
          latitude: 40.7128,
          longitude: -74.006,
          status: "Applied",
          location_type: "on_site",
        },
        {
          id: 2,
          title: "Frontend Developer",
          company: "Web Inc",
          location: "San Francisco, CA",
          latitude: 37.7749,
          longitude: -122.4194,
          status: "Interview",
          location_type: "hybrid",
        },
      ],
    });
  }),

  // ===================== TECHNICAL PREP ENDPOINTS =====================

  http.get(`${API_BASE}/api/technical-prep/user/:userId/stats`, () => {
    return HttpResponse.json({
      data: {
        totalChallenges: 25,
        solved: 18,
        avgScore: 78,
        byDifficulty: { easy: 10, medium: 6, hard: 2 },
        byCategory: { arrays: 5, trees: 4, dp: 3 },
        streakDays: 7,
      },
    });
  }),

  http.get(`${API_BASE}/api/technical-prep/user/:userId/history`, () => {
    return HttpResponse.json({
      data: {
        codingChallenges: [
          {
            id: 1,
            title: "Two Sum",
            difficulty: "easy",
            score: 95,
            completedAt: new Date().toISOString(),
          },
        ],
        systemDesignQuestions: [
          {
            id: 1,
            question: "Design a URL shortener",
            category: "scalability",
            completedAt: new Date().toISOString(),
          },
        ],
      },
    });
  }),

  http.get(`${API_BASE}/api/technical-prep/solution-frameworks`, () => {
    return HttpResponse.json({
      data: {
        frameworks: [
          {
            id: "two_pointer",
            name: "Two Pointer",
            description: "Use two pointers technique",
          },
          {
            id: "sliding_window",
            name: "Sliding Window",
            description: "Use sliding window for subarrays",
          },
        ],
      },
    });
  }),

  http.post(`${API_BASE}/api/technical-prep/coding-challenge`, () => {
    return HttpResponse.json({
      data: {
        challengeId: "challenge-123",
        challenge: {
          title: "Two Sum",
          description: "Find two numbers that add up to target",
          difficulty: "easy",
          category: "arrays",
          starter_code:
            "function twoSum(nums, target) {\n  // Your code here\n}",
        },
      },
    });
  }),

  http.post(`${API_BASE}/api/technical-prep/submit-solution`, () => {
    return HttpResponse.json({
      data: {
        evaluation: {
          score: 85,
          correctness: { is_correct: true, issues: [] },
          feedback: "Good solution!",
          improvements: ["Consider edge cases"],
          what_went_well: ["Correct approach", "Clean code"],
        },
        optimal_solution: "function twoSum(nums, target) { /* optimal */ }",
        solution_explanation: "Use a hash map for O(n) time complexity.",
      },
    });
  }),

  // ===================== OFFER COMPARISON ENDPOINTS =====================

  http.get(`${API_BASE}/api/offer-comparison/compare`, () => {
    return HttpResponse.json({
      offers: [
        {
          id: 1,
          company: "Tech Corp",
          position: "Software Engineer",
          base_salary: 120000,
          bonus: 15000,
          equity: "10000 RSUs",
          benefits: "Full health, 401k match",
          location: "San Francisco",
        },
        {
          id: 2,
          company: "Startup Inc",
          position: "Senior Developer",
          base_salary: 110000,
          bonus: 20000,
          equity: "0.5% equity",
          benefits: "Health, unlimited PTO",
          location: "Remote",
        },
      ],
    });
  }),

  // ===================== CAREER GROWTH ENDPOINTS =====================

  http.get(`${API_BASE}/api/career-growth/offers`, () => {
    return HttpResponse.json({
      offers: [
        {
          id: 1,
          company: "Tech Corp",
          salary: 120000,
          year: 2024,
        },
      ],
    });
  }),

  http.get(`${API_BASE}/api/career-growth/projections`, () => {
    return HttpResponse.json({
      projections: {
        fiveYear: 180000,
        tenYear: 250000,
        careerPeak: 350000,
      },
    });
  }),

  // ===================== GEOCODING ENDPOINTS =====================

  http.post(`${API_BASE}/api/geocoding/geocode/batch`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      success: true,
      results: (body.locations || []).map((location) => ({
        location,
        success: true,
        data: {
          latitude: 40.7128,
          longitude: -74.006,
          location_type: "on_site",
        },
      })),
    });
  }),

  http.post(`${API_BASE}/api/geocoding/commute`, async ({ request }) => {
    return HttpResponse.json({
      success: true,
      data: {
        distance: { miles: 25, km: 40 },
        drivingTime: { minutes: 35, formatted: "35 min" },
        planeTime: { minutes: 120, formatted: "2h" },
      },
    });
  }),

  // ===================== FOLLOW-UP REMINDERS ENDPOINTS =====================

  http.get(`${API_BASE}/api/follow-up-reminders`, () => {
    return HttpResponse.json({
      reminders: [
        {
          id: 1,
          title: "Follow up with Tech Corp",
          dueDate: new Date().toISOString(),
          type: "application",
          completed: false,
        },
      ],
    });
  }),

  http.post(`${API_BASE}/api/follow-up-reminders`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: Date.now(), ...body });
  }),

  http.put(
    `${API_BASE}/api/follow-up-reminders/:id`,
    async ({ request, params }) => {
      const body = await request.json();
      return HttpResponse.json({ id: parseInt(params.id), ...body });
    }
  ),

  http.delete(`${API_BASE}/api/follow-up-reminders/:id`, ({ params }) => {
    return HttpResponse.json({ success: true });
  }),

  // Followup reminders without hyphen (used by some components directly via axios)
  http.get(`${API_BASE}/api/followup-reminders/upcoming`, () => {
    return HttpResponse.json([
      {
        id: 1,
        jobId: 1,
        company: "Tech Corp",
        title: "Software Engineer",
        type: "follow_up",
        message: "Follow up on application status",
        dueDate: new Date(Date.now() + 86400000).toISOString(),
        status: "pending",
      },
    ]);
  }),

  http.get(`${API_BASE}/api/followup-reminders`, () => {
    return HttpResponse.json([
      {
        id: 1,
        jobId: 1,
        company: "Tech Corp",
        title: "Software Engineer",
        type: "follow_up",
        message: "Follow up on application status",
        dueDate: new Date(Date.now() + 86400000).toISOString(),
        status: "pending",
      },
      {
        id: 2,
        jobId: 2,
        company: "Web Inc",
        title: "Frontend Developer",
        type: "interview_prep",
        message: "Prepare for technical interview",
        dueDate: new Date(Date.now() + 172800000).toISOString(),
        status: "pending",
      },
    ]);
  }),

  http.get(`${API_BASE}/api/followup-reminders/etiquette/tips`, () => {
    return HttpResponse.json([
      { id: 1, tip: "Wait 1-2 weeks before following up", category: "timing" },
      { id: 2, tip: "Be concise and professional", category: "content" },
    ]);
  }),

  http.post(
    `${API_BASE}/api/followup-reminders/:id/snooze`,
    async ({ request, params }) => {
      return HttpResponse.json({ success: true, id: params.id });
    }
  ),

  http.put(
    `${API_BASE}/api/followup-reminders/:id`,
    async ({ request, params }) => {
      const body = await request.json();
      return HttpResponse.json({ id: parseInt(params.id), ...body });
    }
  ),

  http.delete(`${API_BASE}/api/followup-reminders/:id`, ({ params }) => {
    return HttpResponse.json({ success: true });
  }),

  // ===================== NETWORKING ENDPOINTS (ADDITIONAL) =====================

  http.get(`${API_BASE}/api/networking/events`, () => {
    return HttpResponse.json({
      events: [
        {
          id: 1,
          name: "Tech Meetup",
          date: new Date().toISOString(),
          location: "San Francisco",
          type: "networking",
        },
      ],
    });
  }),

  http.get(`${API_BASE}/api/networking/referrals`, () => {
    return HttpResponse.json([
      {
        id: 1,
        contact_name: "John Doe",
        company: "Tech Corp",
        status: "pending",
        job_title: "Software Engineer",
      },
    ]);
  }),

  http.post(`${API_BASE}/api/networking/referrals`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: Date.now(), ...body });
  }),

  http.delete(`${API_BASE}/api/networking/referrals/:id`, ({ params }) => {
    return HttpResponse.json({ success: true });
  }),

  // ===================== LINKEDIN ENDPOINTS =====================

  http.get(`${API_BASE}/api/linkedin/templates`, () => {
    return HttpResponse.json({
      templates: [
        {
          id: 1,
          name: "Connection Request",
          content: "Hi, I'd love to connect!",
          category: "outreach",
        },
      ],
    });
  }),

  http.get(`${API_BASE}/api/linkedin/profile-optimization`, () => {
    return HttpResponse.json({
      suggestions: [
        { section: "headline", suggestion: "Add keywords" },
        { section: "summary", suggestion: "Make it more engaging" },
      ],
      score: 75,
    });
  }),

  // ===================== RELATIONSHIP MAINTENANCE ENDPOINTS =====================

  http.get(`${API_BASE}/api/relationship-maintenance`, () => {
    return HttpResponse.json({
      contacts: [
        {
          id: 1,
          name: "John Doe",
          lastContact: new Date(
            Date.now() - 30 * 24 * 60 * 60 * 1000
          ).toISOString(),
          nextFollowUp: new Date().toISOString(),
          strength: "medium",
        },
      ],
    });
  }),

  // ===================== MENTORS/COACHES ENDPOINTS =====================

  http.get(`${API_BASE}/api/mentors`, () => {
    return HttpResponse.json([
      {
        id: 1,
        name: "Sarah Coach",
        title: "Career Coach",
        company: "Career Services Inc",
        specialty: "Interview Prep",
        rating: 4.8,
        sessions: 25,
        availability: "Available",
      },
      {
        id: 2,
        name: "Mike Mentor",
        title: "Engineering Lead",
        company: "Tech Corp",
        specialty: "Technical Career Growth",
        rating: 4.9,
        sessions: 50,
        availability: "Busy",
      },
    ]);
  }),

  http.get(`${API_BASE}/api/mentors/my-mentors`, () => {
    // Component expects response.data.data structure
    return HttpResponse.json({
      data: [
        {
          id: 1,
          name: "Sarah Coach",
          title: "Career Coach",
          company: "Career Services Inc",
          specialty: "Interview Prep",
          rating: 4.8,
          sessions: 25,
          availability: "Available",
        },
        {
          id: 2,
          name: "Mike Mentor",
          title: "Engineering Lead",
          company: "Tech Corp",
          specialty: "Technical Career Growth",
          rating: 4.9,
          sessions: 50,
          availability: "Busy",
        },
      ],
    });
  }),

  http.post(`${API_BASE}/api/mentors`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: Date.now(), ...body });
  }),

  http.put(`${API_BASE}/api/mentors/:id`, async ({ request, params }) => {
    const body = await request.json();
    return HttpResponse.json({ id: parseInt(params.id), ...body });
  }),

  http.delete(`${API_BASE}/api/mentors/:id`, ({ params }) => {
    return HttpResponse.json({ success: true });
  }),

  // ===================== PROFESSIONAL REFERENCES ENDPOINTS (ADDITIONAL) =====================

  http.put(`${API_BASE}/api/references/:id`, async ({ request, params }) => {
    const body = await request.json();
    return HttpResponse.json({ id: parseInt(params.id), ...body });
  }),

  http.delete(`${API_BASE}/api/references/:id`, ({ params }) => {
    return HttpResponse.json({ success: true });
  }),

  // ===================== PIPELINE ENDPOINTS =====================

  http.get(`${API_BASE}/api/jobs/pipeline`, () => {
    return HttpResponse.json({
      pipeline: {
        applied: [{ id: 1, title: "Dev", company: "Corp" }],
        interviewing: [{ id: 2, title: "SWE", company: "Tech" }],
        offered: [],
        rejected: [],
      },
    });
  }),

  // ===================== INTERVIEWS TRACKER ENDPOINTS =====================

  http.get(`${API_BASE}/api/interviews`, () => {
    return HttpResponse.json([
      {
        id: 1,
        company: "Tech Corp",
        position: "Software Engineer",
        date: new Date().toISOString(),
        type: "technical",
        status: "scheduled",
      },
    ]);
  }),

  http.post(`${API_BASE}/api/interviews`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: Date.now(), ...body });
  }),

  http.put(`${API_BASE}/api/interviews/:id`, async ({ request, params }) => {
    const body = await request.json();
    return HttpResponse.json({ id: parseInt(params.id), ...body });
  }),

  http.delete(`${API_BASE}/api/interviews/:id`, ({ params }) => {
    return HttpResponse.json({ success: true });
  }),

  // ===================== SALARY RESEARCH ENDPOINTS =====================

  http.get(`${API_BASE}/api/salary-research`, () => {
    return HttpResponse.json({
      data: {
        role: "Software Engineer",
        location: "San Francisco",
        median: 150000,
        p25: 120000,
        p75: 180000,
        p90: 220000,
      },
    });
  }),

  http.post(`${API_BASE}/api/salary-research/search`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      data: {
        role: body.role || "Software Engineer",
        median: 150000,
        range: { low: 120000, high: 200000 },
      },
    });
  }),

  // ===================== MOCK INTERVIEW ENDPOINTS =====================

  http.post(`${API_BASE}/api/interviews/mock/submit`, async ({ request }) => {
    return HttpResponse.json({
      feedback: {
        score: 85,
        strengths: ["Clear communication", "Good examples"],
        improvements: ["Be more concise"],
      },
    });
  }),

  http.get(`${API_BASE}/api/interviews/mock/history`, () => {
    return HttpResponse.json({
      sessions: [
        {
          id: 1,
          date: new Date().toISOString(),
          score: 85,
          type: "behavioral",
        },
      ],
    });
  }),

  // ===================== COMPANY RESEARCH ENDPOINTS (ADDITIONAL) =====================

  http.post(`${API_BASE}/api/company-research`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      data: {
        name: body.company || "Test Company",
        description: "A test company",
        industry: "Technology",
      },
    });
  }),

  // ===================== RESUME OPTIMIZATION ENDPOINTS =====================

  http.post(`${API_BASE}/api/resume/optimize`, async ({ request }) => {
    return HttpResponse.json({
      suggestions: [
        { section: "experience", suggestion: "Add metrics" },
        { section: "skills", suggestion: "Include more keywords" },
      ],
      score: 78,
    });
  }),

  http.get(`${API_BASE}/api/resume/score/:id`, ({ params }) => {
    return HttpResponse.json({
      overall: 85,
      breakdown: {
        keywords: 80,
        formatting: 90,
        impact: 85,
      },
    });
  }),

  // ===================== PROJECTS ENDPOINTS =====================

  http.get(`${API_BASE}/api/projects`, () => {
    return HttpResponse.json([
      {
        id: 1,
        name: "Portfolio Website",
        description: "Personal portfolio built with React",
        technologies: ["React", "Node.js", "CSS"],
        url: "https://example.com",
        github_url: "https://github.com/user/portfolio",
      },
    ]);
  }),

  http.post(`${API_BASE}/api/projects`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: Date.now(), ...body });
  }),

  http.put(`${API_BASE}/api/projects/:id`, async ({ request, params }) => {
    const body = await request.json();
    return HttpResponse.json({ id: parseInt(params.id), ...body });
  }),

  http.delete(`${API_BASE}/api/projects/:id`, ({ params }) => {
    return HttpResponse.json({ success: true });
  }),

  // ===================== ARCHIVED JOBS ENDPOINTS =====================

  http.get(`${API_BASE}/api/jobs/archived`, () => {
    return HttpResponse.json([
      {
        id: 1,
        title: "Old Position",
        company: "Previous Corp",
        status: "rejected",
        archived_at: new Date().toISOString(),
      },
    ]);
  }),

  http.post(`${API_BASE}/api/jobs/:id/archive`, ({ params }) => {
    return HttpResponse.json({ success: true, id: params.id });
  }),

  http.post(`${API_BASE}/api/jobs/:id/restore`, ({ params }) => {
    return HttpResponse.json({ success: true, id: params.id });
  }),
];

// Error handlers for testing error states
export const errorHandlers = [
  http.post(`${API_BASE}/login`, () => {
    return HttpResponse.json({ error: "Server error" }, { status: 500 });
  }),

  http.get(`${API_BASE}/api/jobs`, () => {
    return HttpResponse.json(
      { error: "Failed to fetch jobs" },
      { status: 500 }
    );
  }),
];
