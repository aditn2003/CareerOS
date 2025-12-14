import React, { useState, useEffect } from "react";
import "./JobEntryForm.css";
import { api } from "../api";
import FileUpload from "./FileUpload";
import QualityScoreCard from "./QualityScoreCard";

const today = new Date().toISOString().split("T")[0];

export default function JobEntryForm({ token, onSaved, onCancel }) {
  const [form, setForm] = useState({
    title: "",
    company: "",
    location: "",
    location_type: "",
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
  
  // Quality Scoring
  const [qualityScore, setQualityScore] = useState(null);
  const [analyzingQuality, setAnalyzingQuality] = useState(false);
  const [qualityError, setQualityError] = useState(null);
  const [tempJobId, setTempJobId] = useState(null); // Temporary job ID for analysis
  const [overrideThreshold, setOverrideThreshold] = useState(false);

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
  // Analyze Quality Score
  // -------------------------------------------------------
  const canAnalyzeQuality = () => {
    return (
      form.title.trim() &&
      form.company.trim() &&
      form.description.trim() &&
      (form.resume_id || form.cover_letter_id)
    );
  };

  async function analyzeQuality() {
    if (!canAnalyzeQuality()) {
      return alert("Please fill in job title, company, description, and select at least one material (resume or cover letter) before analyzing quality.");
    }

    try {
      setAnalyzingQuality(true);
      setQualityError(null);

      // First, save the job temporarily to get a job ID
      const skillsArray = form.required_skills
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter((s) => s.length > 0);

      const payload = {
        ...form,
        required_skills: skillsArray,
      };

      // Save job first (or use existing tempJobId)
      let jobId = tempJobId;
      if (!jobId) {
        const saveRes = await fetch("http://localhost:4000/api/jobs", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        if (!saveRes.ok) throw new Error("Failed to save job for analysis");
        const saveData = await saveRes.json();
        jobId = saveData.job.id;
        setTempJobId(jobId);
      } else {
        // Update existing job
        await fetch(`http://localhost:4000/api/jobs/${jobId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
      }

      // Now analyze quality
      const res = await api.post(`/api/quality-scoring/${jobId}/analyze`, {
        forceRefresh: true,
      });

      const score = res.data.score;
      
      // Parse JSONB fields if they're strings
      if (typeof score.score_breakdown === 'string') {
        score.score_breakdown = JSON.parse(score.score_breakdown);
      }
      if (typeof score.formatting_issues === 'string') {
        score.formatting_issues = JSON.parse(score.formatting_issues);
      }
      if (typeof score.inconsistencies === 'string') {
        score.inconsistencies = JSON.parse(score.inconsistencies);
      }
      if (typeof score.improvement_suggestions === 'string') {
        score.improvement_suggestions = JSON.parse(score.improvement_suggestions);
      }

      setQualityScore(score);
    } catch (err) {
      console.error("❌ Quality analysis error:", err);
      setQualityError(err.response?.data?.message || "Failed to analyze application quality");
    } finally {
      setAnalyzingQuality(false);
    }
  }

  // -------------------------------------------------------
  // Save Job (POST) with Threshold Validation
  // -------------------------------------------------------
  async function saveJob() {
    if (!form.title.trim() || !form.company.trim()) {
      return alert("Job Title and Company Name are required.");
    }

    if (!form.deadline) {
      return alert("Please enter an application deadline date.");
    }

    // Check quality score threshold if score exists
    if (qualityScore && !qualityScore.meets_threshold && !overrideThreshold) {
      const minimumThreshold = qualityScore.minimum_threshold || 70;
      const currentScore = qualityScore.overall_score;
      
      const message = `⚠️ Quality Score Below Threshold\n\n` +
        `Your application quality score is ${currentScore}/100, which is below the minimum threshold of ${minimumThreshold}.\n\n` +
        `Top 3 Improvement Suggestions:\n` +
        (qualityScore.improvement_suggestions?.slice(0, 3).map((s, i) => 
          `${i + 1}. ${s.suggestion}`
        ).join('\n') || 'No suggestions available') +
        `\n\nWould you like to:\n` +
        `• Improve Application (recommended)\n` +
        `• Submit Anyway (not recommended)`;

      const userChoice = window.confirm(message + "\n\nClick OK to submit anyway, or Cancel to improve first.");
      
      if (!userChoice) {
        return; // User chose to improve first
      }
      
      // User confirmed, set override flag
      setOverrideThreshold(true);
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

      // If we have a tempJobId, update it; otherwise create new
      let jobId = tempJobId;
      if (jobId) {
        const res = await fetch(`http://localhost:4000/api/jobs/${jobId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) throw new Error("Failed to update job");
      } else {
        const res = await fetch("http://localhost:4000/api/jobs", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) throw new Error("Failed to save job");
      }

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

      <label>Location Type</label>
      <select
        value={form.location_type || ""}
        onChange={(e) => setForm({ ...form, location_type: e.target.value })}
      >
        <option value="">Select location type</option>
        <option value="remote">Remote</option>
        <option value="hybrid">Hybrid</option>
        <option value="on_site">On-Site</option>
        <option value="flexible">Flexible</option>
      </select>

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

        {/* Quality Score Analysis */}
        {canAnalyzeQuality() && (
          <div style={{ marginTop: "20px", padding: "16px", background: "#f0f9ff", borderRadius: "8px", border: "1px solid #bae6fd" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 600, color: "#0369a1" }}>
                ⭐ Application Quality Score
              </h4>
              <button
                type="button"
                onClick={analyzeQuality}
                disabled={analyzingQuality}
                style={{
                  padding: "8px 16px",
                  background: analyzingQuality ? "#94a3b8" : "#10b981",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: analyzingQuality ? "not-allowed" : "pointer",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                }}
              >
                {analyzingQuality ? "Analyzing..." : "Analyze Quality"}
              </button>
            </div>

            {qualityError && (
              <div style={{ padding: "8px", background: "#fee2e2", borderRadius: "6px", marginBottom: "12px", fontSize: "0.875rem", color: "#991b1b" }}>
                ❌ {qualityError}
              </div>
            )}

            {qualityScore && (
              <div style={{ marginTop: "12px" }}>
                <QualityScoreCard score={qualityScore} />
                {!qualityScore.meets_threshold && (
                  <div style={{ 
                    marginTop: "12px", 
                    padding: "12px", 
                    background: "#fef3c7", 
                    borderRadius: "6px",
                    border: "1px solid #f59e0b",
                    fontSize: "0.875rem"
                  }}>
                    ⚠️ <strong>Score below threshold ({qualityScore.minimum_threshold}+).</strong> Consider improving your application before submitting.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* BUTTONS */}
      <div className="button-group">
        <button 
          onClick={saveJob} 
          disabled={loading}
          style={{
            opacity: qualityScore && !qualityScore.meets_threshold && !overrideThreshold ? 0.7 : 1
          }}
        >
          {loading ? "Saving..." : "Save"}
        </button>
        <button className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
