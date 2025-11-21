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
