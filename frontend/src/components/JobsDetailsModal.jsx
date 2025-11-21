import React, { useEffect, useState } from "react";
import "./JobDetails.css";
import { api } from "../api";

const STAGES = [
  "Interested",
  "Applied",
  "Phone Screen",
  "Interview",
  "Offer",
  "Rejected",
];

export default function JobDetailsModal({
  token,
  jobId,
  onClose,
  onStatusUpdate,
}) {
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [resume, setResume] = useState(null);
  const [history, setHistory] = useState([]); // ✅ FOR HISTORY

  const [resumes, setResumes] = useState([]); // ✅ LIST OF RESUMES
  const [coverLetters, setCoverLetters] = useState([]); // ✅ LIST OF COVER LETTERS

  const [selectedResume, setSelectedResume] = useState(""); // ✅ CURRENTLY CHOSEN RESUME
  const [selectedCover, setSelectedCover] = useState(""); // ✅ CURRENTLY CHOSEN COVER
  const [coverLetter, setCoverLetter] = useState(null);

  // 🟢 Load job details

  async function loadHistory() {
    try {
      const res = await api.get(`/api/jobs/${jobId}/materials-history`);
      setHistory(res.data.history || []);
    } catch (err) {
      console.error("❌ Failed to load history:", err);
    }
  }
  useEffect(() => {
    async function loadJob() {
      try {
        const res = await fetch(`http://localhost:4000/api/jobs/${jobId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to fetch job details");
        const data = await res.json();
        setJob(data.job);
      } catch (err) {
        console.error("❌ Failed to fetch job details:", err);
      } finally {
        setLoading(false);
      }
    }

    if (jobId) {
      loadJob();
      loadHistory(); // 🔥 now this works
    }
  }, [jobId, token]);

  useEffect(() => {
    async function loadCoverLetter() {
      if (!job?.cover_letter_id) return;

      try {
        const res = await fetch(
          `http://localhost:4000/api/cover-letters/${job.cover_letter_id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const data = await res.json();
        if (data.cover_letter) setCoverLetter(data.cover_letter);
      } catch (err) {
        console.error("❌ Failed to load linked cover letter:", err);
      }
    }

    loadCoverLetter();
  }, [job, token]);

  useEffect(() => {
    async function loadMaterials() {
      try {
        const r = await api.get("/api/resumes");
        setResumes(r.data.resumes || []);

        const c = await api.get("/api/cover-letters");
        setCoverLetters(c.data.cover_letters || []);
      } catch (err) {
        console.error("❌ Failed to load materials list", err);
      }
    }

    loadMaterials();
  }, []);

  useEffect(() => {
    if (job) {
      setSelectedResume(job.resume_id || "");
      setSelectedCover(job.cover_letter_id || "");
    }
  }, [job]);

  useEffect(() => {
    async function loadResume() {
      if (!job?.resume_id) return;

      try {
        const res = await fetch(
          `http://localhost:4000/api/resumes/${job.resume_id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const data = await res.json();
        if (data.resume) setResume(data.resume);
      } catch (err) {
        console.error("❌ Failed to load linked resume:", err);
      }
    }

    loadResume();
  }, [job, token]);

  async function handleResumeDownload() {
    if (!resume) return alert("No resume linked.");

    try {
      const res = await fetch(
        `http://localhost:4000/api/resumes/${resume.id}/download`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) throw new Error("Download failed");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `${resume.title}.${resume.format || "pdf"}`;
      link.click();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("❌ Resume download failed:", err);
      alert("Failed to download resume.");
    }
  }

  async function handleMaterialUpdate() {
    try {
      const res = await api.put(`/api/jobs/${jobId}/materials`, {
        resume_id: selectedResume || null,
        cover_letter_id: selectedCover || null,
      });

      alert("✅ Materials updated!");
      setJob(res.data.job);

      await loadHistory(); // 🔥 refresh timestamps immediately
    } catch (err) {
      console.error("❌ Failed to update materials:", err);
      alert("Failed to update materials.");
    }
  }

  // 🟡 Save job updates
  async function handleSave() {
    if (!job.title?.trim() || !job.company?.trim()) {
      return alert("Job title and company name are required.");
    }

    try {
      setSaving(true);
      const res = await fetch(`http://localhost:4000/api/jobs/${jobId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(job),
      });

      if (!res.ok) throw new Error("Failed to update job");
      const data = await res.json();
      setJob(data.job);
      alert("✅ Job updated successfully!");
      onStatusUpdate?.(jobId, data.job.status);
      onClose(); // close after save
    } catch (err) {
      console.error("❌ Save failed:", err);
      alert("Failed to save job changes.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div>Loading...</div>;
  if (!job) return <div>Job not found</div>;

  return (
    <div className="job-details-overlay">
      <div className="job-details-modal edit-mode">
        <button className="close-btn" onClick={onClose}>
          ✖
        </button>
        <h2>Edit Job Details</h2>

        {/* BASIC INFO */}
        <label>Job Title *</label>
        <input
          value={job.title || ""}
          onChange={(e) => setJob({ ...job, title: e.target.value })}
          placeholder="e.g., Software Engineer"
        />

        <label>Company *</label>
        <input
          value={job.company || ""}
          onChange={(e) => setJob({ ...job, company: e.target.value })}
          placeholder="e.g., Palantir Technologies"
        />

        <label>Location</label>
        <input
          value={job.location || ""}
          onChange={(e) => setJob({ ...job, location: e.target.value })}
          placeholder="e.g., New York, NY"
        />

        {/* STAGE */}
        <label>Status</label>
        <select
          value={job.status || ""}
          onChange={(e) => setJob({ ...job, status: e.target.value })}
        >
          {STAGES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        {/* SALARY */}
        <label>Salary Range ($)</label>
        <div className="salary-group">
          <input
            type="number"
            placeholder="Min"
            value={job.salary_min || ""}
            onChange={(e) => setJob({ ...job, salary_min: e.target.value })}
          />
          <input
            type="number"
            placeholder="Max"
            value={job.salary_max || ""}
            onChange={(e) => setJob({ ...job, salary_max: e.target.value })}
          />
        </div>

        {/* DEADLINE */}
        <label>Application Deadline</label>
        <input
          type="date"
          value={job.deadline ? job.deadline.split("T")[0] : ""}
          onChange={(e) => setJob({ ...job, deadline: e.target.value })}
        />
        <label>Date Applied</label>
        <input
          type="date"
          value={job.applied_on ? job.applied_on.split("T")[0] : ""}
          onChange={(e) => setJob({ ...job, applied_on: e.target.value })}
        />

        {/* DESCRIPTION */}
        <label>Job Description</label>
        <textarea
          rows={4}
          maxLength={2000}
          value={job.description || ""}
          onChange={(e) => setJob({ ...job, description: e.target.value })}
          placeholder="Describe responsibilities, qualifications, etc."
        />
        <label>Job Posting URL</label>
        <input
          type="url"
          value={job.url || ""}
          onChange={(e) => setJob({ ...job, url: e.target.value })}
          placeholder="https://www.linkedin.com/jobs/view/..."
        />

        {/* Optional: Quick link preview */}
        {job.url && (
          <p className="url-preview">
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: "#2563eb",
                textDecoration: "underline",
                fontSize: "0.9rem",
              }}
            >
              Open job posting ↗
            </a>
          </p>
        )}

        {/* INDUSTRY */}
        <label>Industry</label>
        <input
          value={job.industry || ""}
          onChange={(e) => setJob({ ...job, industry: e.target.value })}
          placeholder="e.g., Technology, Finance"
        />

        {/* TYPE */}
        <label>Job Type</label>
        <select
          value={job.type || ""}
          onChange={(e) => setJob({ ...job, type: e.target.value })}
        >
          <option value="">Select job type</option>
          <option value="full_time">Full Time</option>
          <option value="part_time">Part Time</option>
          <option value="internship">Internship</option>
          <option value="contract">Contract</option>
        </select>

        {/* NOTES */}
        <label>Personal Notes</label>
        <textarea
          rows={3}
          value={job.notes || ""}
          onChange={(e) => setJob({ ...job, notes: e.target.value })}
          placeholder="Add your thoughts, next steps, etc."
        />

        {/* CONTACT INFO */}
        <label>Contact Name</label>
        <input
          value={job.contact_name || ""}
          onChange={(e) => setJob({ ...job, contact_name: e.target.value })}
          placeholder="e.g., John Doe"
        />

        <label>Contact Email</label>
        <input
          type="email"
          value={job.contact_email || ""}
          onChange={(e) => setJob({ ...job, contact_email: e.target.value })}
          placeholder="e.g., john.doe@company.com"
        />

        <label>Contact Phone</label>
        <input
          type="tel"
          value={job.contact_phone || ""}
          onChange={(e) => setJob({ ...job, contact_phone: e.target.value })}
          placeholder="e.g., (555) 123-4567"
        />

        {/* SALARY NEGOTIATION NOTES */}
        <label>Salary Negotiation Notes</label>
        <textarea
          rows={2}
          value={job.salary_notes || ""}
          onChange={(e) => setJob({ ...job, salary_notes: e.target.value })}
          placeholder="Negotiation history, offers, etc."
        />

        {/* INTERVIEW FEEDBACK */}
        <label>Interview Notes / Feedback</label>
        <textarea
          rows={2}
          value={job.interview_feedback || ""}
          onChange={(e) =>
            setJob({ ...job, interview_feedback: e.target.value })
          }
          placeholder="Feedback, interviewer names, or impressions"
        />

        {/* HISTORY */}
        <div className="history-section">
          <h3>Application History</h3>
          {job.history && job.history.length > 0 ? (
            <ul>
              {job.history.map((h, i) => (
                <li key={i}>
                  <small>{new Date(h.timestamp).toLocaleString()}</small> —{" "}
                  {h.event}
                </li>
              ))}
            </ul>
          ) : (
            <p>No history yet.</p>
          )}
        </div>
        {/* APPLICATION MATERIALS */}
        <div className="linked-materials">
          <h3>Application Materials</h3>

          {/* RESUME */}
          <div className="material-item">
            <strong>Resume Used:</strong>
            {job.resume_id ? (
              <>
                <p>{resume?.title || "Resume"}</p>

                <a
                  href={`http://localhost:4000/api/resumes/${job.resume_id}/download`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-block",
                    padding: "8px 16px",
                    backgroundColor: "#2563eb",
                    color: "white",
                    textDecoration: "none",
                    borderRadius: "6px",
                    marginTop: "8px",
                    fontWeight: 500,
                  }}
                >
                  ⬇ Download Resume
                </a>
              </>
            ) : (
              <p>No resume linked.</p>
            )}
          </div>

          {/* COVER LETTER */}
          <div className="material-item" style={{ marginTop: "16px" }}>
            <strong>Cover Letter Used:</strong>
            {job.cover_letter_id ? (
              <>
                <p>{coverLetter?.title || "Cover Letter"}</p>

                <a
                  href={`http://localhost:4000/api/cover-letters/${job.cover_letter_id}/download`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-block",
                    padding: "8px 16px",
                    backgroundColor: "#10b981",
                    color: "white",
                    textDecoration: "none",
                    borderRadius: "6px",
                    marginTop: "8px",
                    fontWeight: 500,
                  }}
                >
                  Download Cover Letter
                </a>
              </>
            ) : (
              <p>No cover letter linked.</p>
            )}
          </div>
        </div>

        <div className="change-materials">
          <h4>Change Materials</h4>

          <label>Resume</label>
          <select
            value={selectedResume}
            onChange={(e) => setSelectedResume(e.target.value)}
          >
            <option value="">-- Select Resume --</option>
            {resumes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.title}
              </option>
            ))}
          </select>

          <label style={{ marginTop: "10px" }}>Cover Letter</label>
          <select
            value={selectedCover}
            onChange={(e) => setSelectedCover(e.target.value)}
          >
            <option value="">-- Select Cover Letter --</option>
            {coverLetters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>

          <button
            onClick={handleMaterialUpdate}
            style={{
              marginTop: "14px",
              padding: "8px 14px",
              background: "#2563eb",
              color: "white",
              borderRadius: "6px",
              border: "none",
            }}
          >
            Save Changes
          </button>
        </div>

        {/* ---------------------------------------- */}
        {/* APPLICATION MATERIALS HISTORY            */}
        {/* ---------------------------------------- */}
        <div className="materials-history">
          <h3>Materials History</h3>

          {history.length === 0 ? (
            <p>No history recorded yet.</p>
          ) : (
            <ul>
              {history.map((h) => (
                <li key={h.id} className="history-item">
                  <strong>{new Date(h.changed_at).toLocaleString()}</strong>

                  <div>
                    {h.resume_title ? (
                      <p>
                        📄 Resume: <strong>{h.resume_title}</strong>
                      </p>
                    ) : (
                      <p>📄 Resume: None</p>
                    )}

                    {h.cover_title ? (
                      <p>
                        ✉️ Cover Letter: <strong>{h.cover_title}</strong>
                      </p>
                    ) : (
                      <p>✉️ Cover Letter: None</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ACTION BUTTONS */}
        <div className="modal-actions">
          <button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "💾 Save"}
          </button>
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
