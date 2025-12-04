// src/pages/Jobs.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import JobEntryForm from "../components/JobEntryForm";
import JobPipeline from "../components/JobPipeLine";
import UpcomingDeadlinesWidget from "../components/UpcomingDeadlinesWidget";
import JobsCalendar from "../components/JobsCalendar";
import StatisticsDashboard from "../components/stats";   // <-- ADD THIS
import { useAuth } from "../contexts/AuthContext";
import "./Jobs.css";

export default function Jobs() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [showForm, setShowForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(Date.now());

  const handleAnalyzeSkills = (jobId) => {
    if (!jobId) return;
    navigate(`/skills-gap/${jobId}`);
  };

  const handleSaved = () => {
    setShowForm(false);
    setRefreshKey(Date.now());
  };

  return (
    <div className="jobs-layout">
      {/* ---------- MAIN SECTION ---------- */}
      <div className="jobs-main">
        {/* 💼 Job Tracker */}
        <div className="profile-box">
          <h2>💼 Job Tracker</h2>

          {!showForm ? (
            <button className="btn-success" onClick={() => setShowForm(true)}>
              ➕ Add New Job
            </button>
          ) : (
            <JobEntryForm
              token={token}
              onSaved={handleSaved}
              onCancel={() => setShowForm(false)}
            />
          )}
        </div>

        {/* 📊 Job Pipeline */}
        <div className="profile-box">
          <h3>📊 Job Pipeline</h3>
          <JobPipeline
            key={refreshKey}
            token={token}
            onAnalyzeSkills={handleAnalyzeSkills}
          />
        </div>


        {/* 📈 PERFORMANCE STATS DASHBOARD — ADDED HERE */}
        <div className="profile-box">
          <h3>Performance Dashboard</h3>
          <StatisticsDashboard  token={token}/>   {/* <-- YOUR ENTIRE STATS COMPONENT */}
        </div>
      </div>

      {/* ---------- SIDEBAR ---------- */}
      <aside className="sidebar-widget">
        <UpcomingDeadlinesWidget token={token} />
      </aside>
    </div>
  );
}
