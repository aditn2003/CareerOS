// src/pages/Match/MatchAnalysisTab.jsx
import React, { useEffect, useState } from "react";
import { api } from "../../api";
import { Link, useLocation } from "react-router-dom";
import RequirementsMatchAnalysis from "../../components/RequirementsMatchAnalysis";

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
  const [jobsLoading, setJobsLoading] = useState(true);
  const [jobsError, setJobsError] = useState(null);
  
  // UC-123: New state for requirements analysis and job ranking
  const [showRequirementsAnalysis, setShowRequirementsAnalysis] = useState(false);
  const [rankedJobs, setRankedJobs] = useState([]);
  const [unanalyzedJobs, setUnanalyzedJobs] = useState([]);
  const [showRanking, setShowRanking] = useState(false);
  const [rankingLoading, setRankingLoading] = useState(false);

  const [weights, setWeights] = useState({
    skillsWeight: 50,
    experienceWeight: 30,
    educationWeight: 20,
  });

  // ---------- Load all jobs ----------
  useEffect(() => {
    const fetchJobs = async () => {
      setJobsLoading(true);
      setJobsError(null);
      try {
        console.log("🔄 Fetching jobs...");
        const res = await api.get("/api/jobs");
        console.log("✅ Jobs response:", res.data);
        const jobsList = res.data.jobs || res.data || [];
        setJobs(Array.isArray(jobsList) ? jobsList : []);
        console.log(`📊 Loaded ${jobsList.length} jobs`);
      } catch (err) {
        console.error("❌ Error loading jobs:", err);
        setJobsError(err.response?.data?.error || err.message || "Failed to load jobs");
      } finally {
        setJobsLoading(false);
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

  // ---------- Fetch ranked jobs (UC-123) ----------
  const fetchRankedJobs = async () => {
    if (!userId) return;
    setRankingLoading(true);
    try {
      const res = await api.get(`/api/match/rank-jobs/${userId}`);
      setRankedJobs(res.data.rankedJobs || []);
      setUnanalyzedJobs(res.data.unanalyzedJobs || []);
    } catch (err) {
      console.error("❌ Error fetching ranked jobs:", err);
    } finally {
      setRankingLoading(false);
    }
  };

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

  // Get score color for ranking
  const getScoreColor = (score) => {
    if (score >= 80) return "#10b981";
    if (score >= 60) return "#f59e0b";
    if (score >= 40) return "#f97316";
    return "#ef4444";
  };

  // Get selected job info
  const selectedJob = jobs.find(j => j.id === Number(activeJobId));

  return (
    <div className="match-tab-content">
      {/* Job Selector */}
      <div className="match-select-row">
        <select
          className="match-job-select"
          value={activeJobId}
          onChange={(e) => {
            setActiveJobId(e.target.value);
            setShowRequirementsAnalysis(false);
          }}
          disabled={jobsLoading}
        >
          {jobsLoading ? (
            <option value="">Loading jobs...</option>
          ) : jobsError ? (
            <option value="">Error loading jobs</option>
          ) : jobs.length === 0 ? (
            <option value="">No jobs found - add jobs first</option>
          ) : (
            <>
              <option value="">Select a job to analyze ({jobs.length} available)</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title} — {job.company}
                </option>
              ))}
            </>
          )}
        </select>

        <button
          className="match-run-btn"
          onClick={() => runMatch()}
          disabled={!activeJobId || loading || jobsLoading}
        >
          {loading ? "Analyzing…" : "Run Match"}
        </button>
      </div>

      {/* Error message */}
      {jobsError && (
        <div className="jobs-error-message">
          ⚠️ {jobsError} - <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      )}

      {/* UC-123: Quick Actions */}
      <div className="match-quick-actions">
        <button 
          className={`quick-action-btn requirements-btn ${showRequirementsAnalysis ? 'active' : ''}`}
          onClick={() => setShowRequirementsAnalysis(!showRequirementsAnalysis)}
          disabled={!activeJobId}
          title={!activeJobId ? "Please select a job first" : "View detailed requirements analysis"}
        >
          🎯 Requirements Analysis
        </button>
        <button 
          className={`quick-action-btn ranking-btn ${showRanking ? 'active' : ''}`}
          onClick={() => {
            setShowRanking(!showRanking);
            if (!showRanking) fetchRankedJobs();
          }}
        >
          📊 Rank All Jobs
        </button>
      </div>
      {!activeJobId && (
        <p className="select-job-hint">👆 Select a job from the dropdown above to enable Requirements Analysis</p>
      )}

      {/* UC-123: Requirements Match Analysis */}
      {showRequirementsAnalysis && activeJobId && (
        <div className="requirements-analysis-wrapper">
          <RequirementsMatchAnalysis 
            jobId={activeJobId}
            jobTitle={selectedJob?.title}
            company={selectedJob?.company}
            onClose={() => setShowRequirementsAnalysis(false)}
          />
        </div>
      )}

      {/* UC-123: Job Ranking View */}
      {showRanking && (
        <div className="job-ranking-section">
          <div className="ranking-header">
            <h3>📊 Jobs Ranked by Match Score</h3>
            <button onClick={fetchRankedJobs} className="refresh-ranking-btn" disabled={rankingLoading}>
              {rankingLoading ? '🔄 Loading...' : '🔄 Refresh'}
            </button>
          </div>
          
          {rankedJobs.length > 0 && (
            <div className="ranked-jobs-list">
              <h4>✅ Analyzed Jobs ({rankedJobs.length})</h4>
              <table className="ranking-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Job</th>
                    <th>Match Score</th>
                    <th>Skills</th>
                    <th>Experience</th>
                    <th>Education</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rankedJobs.map((job, idx) => (
                    <tr key={job.job_id} className={idx < 3 ? 'top-match' : ''}>
                      <td className="rank-cell">
                        {idx === 0 && '🥇'}
                        {idx === 1 && '🥈'}
                        {idx === 2 && '🥉'}
                        {idx > 2 && `#${idx + 1}`}
                      </td>
                      <td className="job-cell">
                        <strong>{job.title}</strong>
                        <span className="company-name">{job.company}</span>
                      </td>
                      <td className="score-cell">
                        <span 
                          className="score-badge"
                          style={{ backgroundColor: getScoreColor(job.match_score) }}
                        >
                          {job.match_score}%
                        </span>
                      </td>
                      <td>{job.skills_score || '-'}%</td>
                      <td>{job.experience_score || '-'}%</td>
                      <td>{job.education_score || '-'}%</td>
                      <td>
                        <button 
                          className="view-details-btn"
                          onClick={() => {
                            setActiveJobId(String(job.job_id));
                            setShowRequirementsAnalysis(true);
                            setShowRanking(false);
                          }}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {unanalyzedJobs.length > 0 && (
            <div className="unanalyzed-jobs-section">
              <h4>⏳ Not Yet Analyzed ({unanalyzedJobs.length})</h4>
              <div className="unanalyzed-jobs-grid">
                {unanalyzedJobs.map(job => (
                  <div key={job.job_id} className="unanalyzed-job-card">
                    <div className="unanalyzed-job-info">
                      <strong>{job.title}</strong>
                      <span>{job.company}</span>
                    </div>
                    <button 
                      className="analyze-job-btn"
                      onClick={() => {
                        setActiveJobId(String(job.job_id));
                        setShowRanking(false);
                        runMatch(job.job_id);
                      }}
                    >
                      Analyze Now
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {rankedJobs.length === 0 && unanalyzedJobs.length === 0 && !rankingLoading && (
            <div className="no-jobs-message">
              <p>No jobs found. Add some jobs to your tracker to see rankings!</p>
            </div>
          )}
        </div>
      )}

      {/* Weight Inputs */}
      {!showRequirementsAnalysis && !showRanking && (
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
      )}

      {/* Loading */}
      {loading && <p className="match-loading">Analyzing match using AI…</p>}

      {/* Match Result */}
      {analysis && !showRequirementsAnalysis && !showRanking && (
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

          {/* UC-123: Button to see detailed requirements analysis */}
          <button 
            className="requirements-analysis-btn"
            onClick={() => setShowRequirementsAnalysis(true)}
          >
            🎯 View Detailed Requirements Analysis
          </button>

          <button className="export-btn" onClick={exportCSV}>
            Download Report (CSV)
          </button>
        </div>
      )}

      {/* Comparison Section */}
      {!showRequirementsAnalysis && !showRanking && (
        <div className="compare-section">
          <h2 className="compare-title">Compare Match Scores</h2>
          <p className="compare-desc">
            View all your analyzed jobs and compare them side-by-side.
          </p>

          <Link className="compare-link" to="/match/compare">
            View Comparison Table →
          </Link>
        </div>
      )}
    </div>
  );
}

