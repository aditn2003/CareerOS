// src/pages/Match/MatchAnalysisTab.jsx
import React, { useEffect, useState } from "react";
import { api } from "../../api";
import { Link, useLocation } from "react-router-dom";

export default function MatchAnalysisTab() {
  // ---------- Decode userId ----------
  const token = localStorage.getItem("token");
  let userId = null;

  if (token) {
    try {
      userId = JSON.parse(atob(token.split(".")[1])).id;
    } catch (err) {
      console.error("❌ Error decoding token:", err);
    }
  }

  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const jobParam = queryParams.get("job");

  const [jobs, setJobs] = useState([]);
  const [activeJobId, setActiveJobId] = useState(jobParam || "");
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);

  const [weights, setWeights] = useState({
    skillsWeight: 50,
    experienceWeight: 30,
    educationWeight: 20,
  });

  // ---------- Load all jobs ----------
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const res = await api.get("/api/jobs");
        setJobs(res.data.jobs || []);
      } catch (err) {
        console.error("❌ Error loading jobs:", err);
      }
    };
    fetchJobs();
  }, []);

  // ---------- Auto-run match when opened from "View" ----------
  useEffect(() => {
    if (jobParam) {
      setActiveJobId(jobParam);
      runMatch(jobParam);
    }
  }, [jobParam]);

  // ---------- Run match ----------
  const runMatch = async (overrideJobId) => {
    const jobId = overrideJobId || activeJobId;
    if (!jobId) return;

    setLoading(true);
    setAnalysis(null);

    try {
      const res = await api.post("/api/match/analyze", {
        userId: Number(userId),
        jobId: Number(jobId),
        weights,
      });

      setAnalysis(res.data.analysis);
    } catch (err) {
      console.error("❌ Match analysis error:", err);
    } finally {
      setLoading(false);
    }
  };

  // ---------- CSV Export ----------
  const exportCSV = () => {
    if (!analysis) return;

    const header = [
      "Job Title",
      "Company",
      "Match Score",
      "Skills Score",
      "Experience Score",
      "Education Score",
      "Strengths",
      "Gaps",
      "Improvements",
    ];

    const row = [
      analysis.jobTitle || "",
      analysis.company || "",
      analysis.matchScore,
      analysis.breakdown?.skills,
      analysis.breakdown?.experience,
      analysis.breakdown?.education,
      (analysis.strengths || []).join(" | "),
      (analysis.gaps || []).join(" | "),
      (analysis.improvements || []).join(" | "),
    ];

    const csv = [header, row]
      .map((r) => r.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `match_${analysis.jobId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="match-tab-content">
      {/* Job Selector */}
      <div className="match-select-row">
        <select
          className="match-job-select"
          value={activeJobId}
          onChange={(e) => setActiveJobId(e.target.value)}
        >
          <option value="">Select a job to analyze</option>
          {jobs.map((job) => (
            <option key={job.id} value={job.id}>
              {job.title} — {job.company}
            </option>
          ))}
        </select>

        <button
          className="match-run-btn"
          onClick={() => runMatch()}
          disabled={!activeJobId || loading}
        >
          {loading ? "Analyzing…" : "Run Match"}
        </button>
      </div>

      {/* Weight Inputs */}
      <div className="weight-controls">
        <h3>Matching Weights</h3>
        {["skillsWeight", "experienceWeight", "educationWeight"].map((k) => (
          <div key={k} className="weight-row">
            <label>{k.replace("Weight", "")}:</label>
            <input
              type="number"
              value={weights[k]}
              onChange={(e) =>
                setWeights({ ...weights, [k]: Number(e.target.value) })
              }
            />
          </div>
        ))}
      </div>

      {/* Loading */}
      {loading && <p className="match-loading">Analyzing match using AI…</p>}

      {/* Match Result */}
      {analysis && (
        <div className="match-results">
          <h2>Match Score: {analysis.matchScore}%</h2>

          <div className="match-breakdown">
            <p>Skills: {analysis.breakdown.skills}%</p>
            <p>Experience: {analysis.breakdown.experience}%</p>
            <p>Education: {analysis.breakdown.education}%</p>
          </div>

          <h3>Strengths</h3>
          <ul>
            {analysis.strengths.map((s, i) => <li key={i}>{s}</li>)}
          </ul>

          <h3>Gaps</h3>
          <ul>
            {analysis.gaps.map((g, i) => <li key={i}>{g}</li>)}
          </ul>

          <h3>Improvements</h3>
          <ul>
            {analysis.improvements.map((im, i) => <li key={i}>{im}</li>)}
          </ul>

          <button className="export-btn" onClick={exportCSV}>
            Download Report (CSV)
          </button>
        </div>
      )}

      {/* Comparison Section */}
      <div className="compare-section">
        <h2 className="compare-title">Compare Match Scores</h2>
        <p className="compare-desc">
          View all your analyzed jobs and compare them side-by-side.
        </p>

        <Link className="compare-link" to="/match/compare">
          View Comparison Table →
        </Link>
      </div>
    </div>
  );
}

