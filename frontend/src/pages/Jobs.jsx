// src/pages/Jobs.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import JobEntryForm from "../components/JobEntryForm";
import JobPipeline from "../components/JobPipeLine";
import UpcomingDeadlinesWidget from "../components/UpcomingDeadlinesWidget";
import JobsCalendar from "../components/JobsCalendar";
import { useAuth } from "../contexts/AuthContext";
import "./Jobs.css";

export default function Jobs() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [showForm, setShowForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(Date.now());

  // 🔥 When user clicks “Analyze Skills” on a job card
  const handleAnalyzeSkills = (jobId) => {
    if (!jobId) return;
    navigate(`/skills-gap/${jobId}`);
  };

  const handleSaved = () => {
    setShowForm(false);
    setRefreshKey(Date.now()); // force JobPipeline to reload
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
            onAnalyzeSkills={handleAnalyzeSkills} // <-- passed in
          />
        </div>

        {/* 🗓️ Jobs Calendar */}
        <div className="profile-box">
          <h3>🗓️ Jobs Calendar</h3>
          <JobsCalendar token={token} />
        </div>
      </div>

      {/* ---------- SIDEBAR ---------- */}
      <aside className="sidebar-widget">
        <UpcomingDeadlinesWidget token={token} />
      </aside>
    </div>
  );
}
