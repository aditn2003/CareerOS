// src/pages/Jobs.jsx
import React, { useState } from "react";
import { useNavigate, useLocation, NavLink } from "react-router-dom";
import { FaBriefcase, FaChartLine, FaPlus, FaMapMarkedAlt, FaTh } from "react-icons/fa";
import JobEntryForm from "../components/JobEntryForm";
import JobPipeline from "../components/JobPipeLine";
import JobMapView from "../components/JobMapView";
import UpcomingDeadlinesWidget from "../components/UpcomingDeadlinesWidget";
import JobsCalendar from "../components/JobsCalendar";
import StatisticsDashboard from "../components/stats";
import { useAuth } from "../contexts/AuthContext";
import "./Jobs.css";

export default function Jobs() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMapView = location.pathname === "/jobs/map";

  const [showForm, setShowForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(Date.now());

  const handleApply = (jobId) => {
    if (!jobId) return;
    navigate(`/job-match?jobId=${jobId}&tab=quality`);
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h2>
              <FaBriefcase style={{ marginRight: "0.5rem", display: "inline-block" }} />
              Job Tracker
            </h2>
            
            {/* View Mode Toggle - Using Links */}
            <div className="view-mode-toggle">
              <NavLink
                to="/jobs"
                end
                className={({ isActive }) => (isActive ? "active" : "")}
              >
                <FaTh style={{ marginRight: "0.5rem" }} />
                Pipeline
              </NavLink>
              <NavLink
                to="/jobs/map"
                className={({ isActive }) => (isActive ? "active" : "")}
              >
                <FaMapMarkedAlt style={{ marginRight: "0.5rem" }} />
                Map
              </NavLink>
            </div>
          </div>

          {!showForm ? (
            <button className="btn-success" onClick={() => setShowForm(true)}>
              <FaPlus style={{ marginRight: "0.5rem", display: "inline-block" }} />
              Add New Job
            </button>
          ) : (
            <JobEntryForm
              token={token}
              onSaved={handleSaved}
              onCancel={() => setShowForm(false)}
            />
          )}
        </div>

        {/* 📊 Job Pipeline or 🗺️ Map View */}
        {isMapView ? (
          <div className="profile-box">
            <h3>
              <FaMapMarkedAlt style={{ marginRight: "0.5rem", display: "inline-block" }} />
              Job Locations Map
            </h3>
            <JobMapView key={refreshKey} token={token} />
          </div>
        ) : (
          <>
            <div className="profile-box">
              <h3>
                <span style={{ marginRight: "0.5rem" }}>📊</span>
                Job Pipeline
              </h3>
              <JobPipeline
                key={refreshKey}
                token={token}
                onApply={handleApply}
              />
            </div>

            {/* 📈 PERFORMANCE STATS DASHBOARD - Only show on Pipeline view */}
            <div className="profile-box">
              <h3>
                <FaChartLine style={{ marginRight: "0.5rem", display: "inline-block" }} />
                Performance Dashboard
              </h3>
              <StatisticsDashboard token={token} />
            </div>
          </>
        )}
      </div>

      {/* ---------- SIDEBAR ---------- */}
      <aside className="sidebar-widget">
        <UpcomingDeadlinesWidget token={token} />
      </aside>
    </div>
  );
}
