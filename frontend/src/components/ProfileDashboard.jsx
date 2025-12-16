import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ProfileCompletenessMeter from "./ProfileCompleteness";
import SkillDistributionChart from "./SkillDist";
import { api } from "../api";
import "./ProfileDashboard.css";

export default function ProfileDashboard({ token, setActiveTab }) {
  const navigate = useNavigate();
  // ✅ default to safe empty object to avoid null errors
  const [summary, setSummary] = useState({
    completeness: { score: 0, suggestions: [] },
    employment_count: 0,
    skills_count: 0,
    education_count: 0,
    certifications_count: 0,
    projects_count: 0,
    skills_distribution: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSummary() {
      try {
        setLoading(true);
        console.log("🔍 Frontend: Fetching profile summary...");
        const { data } = await api.get("/api/profile/summary");
        console.log("🔍 Frontend: Received data:", data);
        console.log("🔍 Frontend: Counts:", {
          employment: data?.employment_count,
          skills: data?.skills_count,
          education: data?.education_count,
          certifications: data?.certifications_count,
          projects: data?.projects_count,
        });

        // ✅ merge defaults with backend data so nothing breaks
        setSummary((prev) => {
          const merged = {
            ...prev,
            ...data,
            completeness: {
              score: data?.completeness?.score ?? prev.completeness.score,
              suggestions:
                data?.completeness?.suggestions ?? prev.completeness.suggestions,
            },
            skills_distribution:
              data?.skills_distribution ?? prev.skills_distribution,
          };
          console.log("🔍 Frontend: Merged summary:", merged);
          return merged;
        });
      } catch (err) {
        console.error("❌ Failed to load dashboard summary", err);
        console.error("❌ Error details:", err.response?.data);
      } finally {
        setLoading(false);
      }
    }
    loadSummary();
  }, [token]);

  const handleTabClick = (tab) => {
    if (setActiveTab && typeof setActiveTab === 'function') {
      setActiveTab(tab);
    } else {
      navigate(`/profile/${tab}`);
    }
  };

  if (loading) {
    return (
      <div className="dashboard">
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: '#64748b', fontSize: '1.1rem' }}>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <h2>Profile Overview</h2>

      {/* ✅ Completion progress bar */}
      <ProfileCompletenessMeter data={summary.completeness} />

      {/* ✅ Summary cards */}
      <div className="summary-grid">
        <div className="summary-card">
          <h3>Employment</h3>
          <p>{summary.employment_count || 0} entries</p>
          <button onClick={() => handleTabClick("employment")}>➕ Add Job</button>
        </div>

        <div className="summary-card">
          <h3>Skills</h3>
          <p>{summary.skills_count || 0} listed</p>
          <button onClick={() => handleTabClick("skills")}>➕ Add Skill</button>
        </div>

        <div className="summary-card">
          <h3>Education</h3>
          <p>{summary.education_count || 0} records</p>
          <button onClick={() => handleTabClick("education")}>
            ➕ Add Education
          </button>
        </div>

        <div className="summary-card">
          <h3>Certifications</h3>
          <p>{summary.certifications_count || 0} certificates</p>
          <button onClick={() => handleTabClick("certifications")}>
            ➕ Add Certification
          </button>
        </div>

        <div className="summary-card">
          <h3>Projects</h3>
          <p>{summary.projects_count || 0} entries</p>
          <button onClick={() => handleTabClick("projects")}>
            ➕ Add Project
          </button>
        </div>
      </div>

      {/* ✅ Skill chart */}
      <div className="charts-container">
        <SkillDistributionChart data={summary.skills_distribution || []} />
      </div>

      {/* ✅ Suggestions */}
      <div className="tips-section">
        <h3>Suggestions for Improvement</h3>
        <ul>
          {summary?.completeness?.suggestions?.length > 0 ? (
            summary.completeness.suggestions.map((tip, i) => (
              <li key={i}>💡 {tip}</li>
            ))
          ) : (
            <li>No suggestions available yet.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
