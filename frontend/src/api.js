import axios from "axios";

const baseURL =
  import.meta.env.VITE_API_URL ||
  (window.location.hostname === "localhost"
    ? "http://localhost:4000"
    : "http://backend:4000");

export const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
});

/* -------------------------------------------------------
   ⬆️ REQUEST INTERCEPTOR — attach token
------------------------------------------------------- */
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/* -------------------------------------------------------
   ⬇️ RESPONSE INTERCEPTOR — auto logout on 401
------------------------------------------------------- */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.warn(
        "🔐 401 detected — token invalid or expired. Logging out..."
      );

      // Remove token immediately
      localStorage.removeItem("token");

      // Force redirect to login AND prevent Back button returning
      window.location.replace("/login");
    }

    return Promise.reject(error);
  }
);

/* -------------------------------------------------------
   Company Research API
------------------------------------------------------- */
export async function fetchCompanyResearch(company) {
  try {
    const res = await api.get(`/api/company-research`, {
      params: { company },
    });
    return res.data.data;
  } catch (err) {
    console.error("❌ Error fetching company research:", err);
    throw new Error(
      err.response?.data?.message || "Failed to fetch company research"
    );
  }
}

/* ============================================================
   COVER LETTER TEMPLATES — Phase 2 Actions*/

// ✏️ Edit template
export const updateTemplate = (id, data) =>
  api.put(`/api/cover-letter/templates/${id}`, data);

// 🗑 Delete template
export const deleteTemplate = (id) =>
  api.delete(`/api/cover-letter/templates/${id}`);

// 📄 Duplicate template
export const duplicateTemplate = (id) =>
  api.post(`/api/cover-letter/templates/${id}/duplicate`);


/* ============================================================
   COVER LETTER EXPORT*/
    // === Cover Letter Export ===
    export function exportPDF(payload) {
      return api.post("/api/cover-letter/export/pdf", payload, {
        responseType: "blob",
      });
    }

    export function exportDOCX(payload) {
      return api.post("/api/cover-letter/export/docx", payload, {
        responseType: "blob",
      });
    }

    export function exportTXT(payload) {
      return api.post("/api/cover-letter/export/text", payload, {
        responseType: "blob",
      });
    }

    export async function fetchDashboardStats(token, filters = {}) {
      const params = new URLSearchParams();
    
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);
    
      const res = await fetch(
        `http://localhost:4000/api/dashboard/stats?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
    
      if (!res.ok) throw new Error("Failed to load stats");
      const data = await res.json();
      return data;
    }

    export const getSuccessAnalysis = () => api.get("/api/success-analysis/full");

    /* -------------------------------------------------------
       Goals API
    ------------------------------------------------------- */
    export const getGoals = () => api.get("/api/goals");
    
    export const updateGoals = (goals) => api.put("/api/goals", goals);
    
    export const resetGoals = () => api.delete("/api/goals");

    /* -------------------------------------------------------
       Interview Analysis API
    ------------------------------------------------------- */
    export const getInterviewAnalysis = () => api.get("/api/interview-analysis/full");

    /* -------------------------------------------------------
       Networking Analysis API
    ------------------------------------------------------- */
    export const getNetworkingAnalysis = () => api.get("/api/networking-analysis/full");

    /* -------------------------------------------------------
       Networking CRUD API
    ------------------------------------------------------- */
    // Contacts
    export const getContacts = () => api.get("/api/networking/contacts");
    export const getContact = (id) => api.get(`/api/networking/contacts/${id}`);
    export const createContact = (data) => api.post("/api/networking/contacts", data);
    export const updateContact = (id, data) => api.put(`/api/networking/contacts/${id}`, data);
    export const deleteContact = (id) => api.delete(`/api/networking/contacts/${id}`);

    // Activities
    export const getActivities = (contactId) => {
      const url = contactId 
        ? `/api/networking/activities?contact_id=${contactId}`
        : "/api/networking/activities";
      return api.get(url);
    };
    export const createActivity = (data) => api.post("/api/networking/activities", data);

    // Events
    export const getEvents = () => api.get("/api/networking/events");
    export const createEvent = (data) => api.post("/api/networking/events", data);

    // Referrals
    export const getReferrals = () => api.get("/api/networking/referrals");
    export const createReferral = (data) => api.post("/api/networking/referrals", data);
    export const updateReferral = (id, data) => api.put(`/api/networking/referrals/${id}`, data);

    /* -------------------------------------------------------
       Compensation & Offers API
    ------------------------------------------------------- */
    // Offers
    export const getOffers = () => api.get("/api/offers");
    export const getOffer = (id) => api.get(`/api/offers/${id}`);
    export const createOffer = (data) => api.post("/api/offers", data);
    export const updateOffer = (id, data) => api.put(`/api/offers/${id}`, data);
    export const deleteOffer = (id) => api.delete(`/api/offers/${id}`);
    export const recordNegotiation = (id, data) => api.post(`/api/offers/${id}/negotiate`, data);
    export const acceptOffer = (id) => api.post(`/api/offers/${id}/accept`);

    // Compensation Analytics
    export const getCompensationAnalytics = () => api.get("/api/compensation-analytics/full");
    export const getComprehensiveCompensationAnalytics = () => api.get("/api/compensation-analytics/comprehensive");
    export const getNegotiationSuccess = () => api.get("/api/compensation-analytics/negotiation-success");
    export const getMarketComparison = (offerId) => api.get(`/api/compensation-analytics/market-comparison/${offerId}`);
    export const getCompensationEvolution = () => api.get("/api/compensation-analytics/evolution");

    