import React, { useState, useEffect } from "react";
import "./JobEntryForm.css";
import { api } from "../api";
import FileUpload from "./FileUpload";

const today = new Date().toISOString().split("T")[0];

export default function JobEntryForm({ token, onSaved, onCancel }) {
  const [form, setForm] = useState({
    title: "",
    company: "",
    location: "",
    salary_min: "",
    salary_max: "",
    url: "",
    deadline: "",
    description: "",
    industry: "",
    type: "",
    role_level: "",
    applied_on: today,

    // ⭐ MATERIAL LINKING
    resume_id: "",
    cover_letter_id: "",

    // ⭐ REQUIRED SKILLS (string input → array)
    required_skills: "",
  });

  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState("");

  // ⭐ MATERIAL LISTS
  const [resumes, setResumes] = useState([]);
  const [coverLetters, setCoverLetters] = useState([]);
  const [showResumeUpload, setShowResumeUpload] = useState(false);
  const [showCoverLetterUpload, setShowCoverLetterUpload] = useState(false);

  // -------------------------------------------------------
  // Load resumes + cover letters
  // -------------------------------------------------------
  const fetchMaterials = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };

      const [resResumes, resCovers] = await Promise.all([
        fetch("http://localhost:4000/api/resumes", { headers }),
        fetch("http://localhost:4000/api/cover-letters", { headers }),
      ]);

      if (resResumes.ok) {
        const data = await resResumes.json();
        setResumes(data.resumes || []);
      }

      if (resCovers.ok) {
        const data = await resCovers.json();
        console.log("📄 Cover letters data:", data);
        console.log("📄 Cover letters array:", data.cover_letters);
        console.log("📄 User letters:", data.user_letters);
        console.log("📄 Templates:", data.templates);
        // Use the combined list from backend (already includes templates with prefixed IDs)
        setCoverLetters(data.cover_letters || []);
      } else {
        console.error("❌ Cover letters response not OK:", resCovers.status, resCovers.statusText);
      }
    } catch (err) {
      console.error("❌ Failed to fetch materials:", err);
    }
  };

  useEffect(() => {
    if (token) fetchMaterials();
  }, [token]);

  // -------------------------------------------------------
  // Save Job (POST)
  // -------------------------------------------------------
  async function saveJob() {
    if (!form.title.trim() || !form.company.trim()) {
      return alert("Job Title and Company Name are required.");
    }

    if (!form.deadline) {
      return alert("Please enter an application deadline date.");
    }

    // ⭐ convert required_skills → array
    const skillsArray = form.required_skills
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.length > 0);

    const payload = {
      ...form,
      required_skills: skillsArray,
    };

    try {
      setLoading(true);

      const res = await fetch("http://localhost:4000/api/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to save job");

      onSaved?.();
    } catch (err) {
      console.error("❌ Job save error:", err);
      alert("❌ Could not save job entry.");
    } finally {
      setLoading(false);
    }
  }

  // -------------------------------------------------------
  // AI Import Job Details
  // -------------------------------------------------------
  async function importJobDetails() {
    if (!form.url || !form.url.startsWith("http")) {
      return alert("Please enter a valid job posting URL.");
    }

    try {
      setImporting(true);
      setImportStatus("Importing job details...");

      const res = await fetch("http://localhost:4000/api/import-job", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ url: form.url }),
      });

      const data = await res.json();
      console.log("🔍 Import result:", data);

      if (data.status === "success" || data.status === "partial") {
        const job = data.job || {};

        // Fill what is available
        setForm((prev) => ({
          ...prev,
          title: job.title || prev.title,
          company: job.company || prev.company,
          location: job.location || prev.location,
          salary_min: job.salary_min || prev.salary_min,
          salary_max: job.salary_max || prev.salary_max,
          description: job.description || prev.description,
        }));

        const missing = [];
        if (!job.title) missing.push("title");
        if (!job.company) missing.push("company");
        if (!job.description) missing.push("description");

        if (missing.length === 0) setImportStatus("✓ Job details imported.");
        else
          setImportStatus(`⚠ Partial import — missing: ${missing.join(", ")}`);
      } else {
        setImportStatus("❌ Could not extract job details.");
      }
    } catch (err) {
      console.error("❌ Import error:", err);
      setImportStatus("❌ Import failed.");
    } finally {
      setImporting(false);
    }
  }

  // -------------------------------------------------------
  // Render UI
  // -------------------------------------------------------
  return (
    <div className="job-form">
      <h3>Add Job Opportunity</h3>

      {/* URL + Import Button */}
      <label>Job Posting URL</label>
      <div className="import-row">
        <input
          type="url"
          value={form.url}
          onChange={(e) => setForm({ ...form, url: e.target.value })}
          placeholder="https://www.linkedin.com/jobs/view/..."
        />
        <button
          type="button"
          className="import-btn"
          disabled={importing}
          onClick={importJobDetails}
        >
          {importing ? "Importing..." : "Import"}
        </button>
      </div>
      {importStatus && <p className="import-status">{importStatus}</p>}

      {/* MAIN FIELDS */}
      <label>Job Title *</label>
      <input
        value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
      />

      <label>Company *</label>
      <input
        value={form.company}
        onChange={(e) => setForm({ ...form, company: e.target.value })}
      />

      <label>Location</label>
      <input
        value={form.location}
        onChange={(e) => setForm({ ...form, location: e.target.value })}
      />

      <div className="salary-group">
        <div>
          <label>Salary Min ($)</label>
          <input
            value={form.salary_min}
            onChange={(e) =>
              setForm({
                ...form,
                salary_min: e.target.value.replace(/[^\d]/g, ""),
              })
            }
          />
        </div>
        <div>
          <label>Salary Max ($)</label>
          <input
            value={form.salary_max}
            onChange={(e) =>
              setForm({
                ...form,
                salary_max: e.target.value.replace(/[^\d]/g, ""),
              })
            }
          />
        </div>
      </div>

      <label>Date Applied</label>
      <input
        type="date"
        value={form.applied_on}
        onChange={(e) => setForm({ ...form, applied_on: e.target.value })}
      />

      <label>Application Deadline *</label>
      <input
        type="date"
        value={form.deadline}
        onChange={(e) => setForm({ ...form, deadline: e.target.value })}
      />

      <label>Job Description</label>
      <textarea
        maxLength={2000}
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
      />

      <label>Industry</label>
      <select
        value={form.industry}
        onChange={(e) => setForm({ ...form, industry: e.target.value })}
      >
        <option value="">Select industry</option>
        <option value="tech">Technology</option>
        <option value="finance">Finance</option>
        <option value="healthcare">Healthcare</option>
        <option value="education">Education</option>
        <option value="manufacturing">Manufacturing</option>
      </select>

      <label>Job Type</label>
      <select
        value={form.type}
        onChange={(e) => setForm({ ...form, type: e.target.value })}
      >
        <option value="">Select job type</option>
        <option value="full_time">Full Time</option>
        <option value="part_time">Part Time</option>
        <option value="internship">Internship</option>
        <option value="contract">Contract</option>
      </select>

      <label>Role Level</label>
      <select
        value={form.role_level}
        onChange={(e) => setForm({ ...form, role_level: e.target.value })}
      >
        <option value="">Select role level</option>
        <option value="intern">Intern</option>
        <option value="entry">Entry Level</option>
        <option value="junior">Junior</option>
        <option value="mid">Mid-Level</option>
        <option value="senior">Senior</option>
        <option value="staff">Staff</option>
        <option value="principal">Principal</option>
        <option value="lead">Lead</option>
        <option value="manager">Manager</option>
        <option value="director">Director</option>
        <option value="vp">VP</option>
      </select>

      {/* ⭐ REQUIRED SKILLS */}
      <label>Required Skills (comma-separated)</label>
      <input
        value={form.required_skills}
        onChange={(e) => setForm({ ...form, required_skills: e.target.value })}
        placeholder="e.g., Python, React, SQL"
      />

      {/* ⭐ Material Linking */}
      <div style={{ marginTop: "20px", padding: "16px", background: "#f9fafb", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
        <h3 style={{ margin: "0 0 16px 0", fontSize: "1rem", fontWeight: 600 }}>Application Materials</h3>
        
        <label>Resume Used</label>
        <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
          <select
            value={form.resume_id}
            onChange={(e) => setForm({ ...form, resume_id: e.target.value })}
            style={{ flex: 1 }}
          >
            <option value="">Select a Resume</option>
            {resumes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.title}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setShowResumeUpload(!showResumeUpload)}
            style={{
              padding: "8px 16px",
              background: showResumeUpload ? "#dc2626" : "#2563eb",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: 600,
              whiteSpace: "nowrap",
            }}
          >
            {showResumeUpload ? "✕" : "⬆️ Upload"}
          </button>
        </div>
        
        {showResumeUpload && (
          <div style={{ marginBottom: "16px" }}>
            <FileUpload
              type="resume"
              onUploadSuccess={(data) => {
                setShowResumeUpload(false);
                fetchMaterials(); // Reload materials
                if (data.resume?.id) {
                  setForm({ ...form, resume_id: data.resume.id });
                }
              }}
            />
          </div>
        )}

        <label>Cover Letter Used</label>
        <div style={{ display: "flex", gap: "8px" }}>
          <select
            value={form.cover_letter_id}
            onChange={(e) => setForm({ ...form, cover_letter_id: e.target.value })}
            style={{ flex: 1 }}
          >
            <option value="">Select a Cover Letter</option>
            {coverLetters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title} {c.isTemplate ? '(Global Template)' : ''}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setShowCoverLetterUpload(!showCoverLetterUpload)}
            style={{
              padding: "8px 16px",
              background: showCoverLetterUpload ? "#dc2626" : "#2563eb",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: 600,
              whiteSpace: "nowrap",
            }}
          >
            {showCoverLetterUpload ? "✕" : "⬆️ Upload"}
          </button>
        </div>
        
        {showCoverLetterUpload && (
          <div style={{ marginTop: "16px" }}>
            <FileUpload
              type="cover-letter"
              onUploadSuccess={(data) => {
                setShowCoverLetterUpload(false);
                fetchMaterials(); // Reload materials
                if (data.cover_letter?.id) {
                  setForm({ ...form, cover_letter_id: data.cover_letter.id });
                }
              }}
            />
          </div>
        )}
      </div>

      {/* BUTTONS */}
      <div className="button-group">
        <button onClick={saveJob} disabled={loading}>
          {loading ? "Saving..." : "Save"}
        </button>
        <button className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
