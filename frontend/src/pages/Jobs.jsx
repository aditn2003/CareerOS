// src/pages/Jobs.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaBriefcase, FaChartLine, FaPlus, FaBell, FaRocket } from "react-icons/fa";
import JobEntryForm from "../components/JobEntryForm";
import JobPipeline from "../components/JobPipeLine";
import UpcomingDeadlinesWidget from "../components/UpcomingDeadlinesWidget";
import JobsCalendar from "../components/JobsCalendar";
import StatisticsDashboard from "../components/stats";
import FollowUpReminders from "../components/FollowUpReminders";
import OptimizationDashboard from "../components/OptimizationDashboard";
import { useAuth } from "../contexts/AuthContext";
import "./Jobs.css";

export default function Jobs() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [showForm, setShowForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(Date.now());
  const [activeTab, setActiveTab] = useState("pipeline"); // 'pipeline', 'followups', or 'optimization'

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
      {/* Tab Navigation */}
      <div className="jobs-tabs-container">
        <button
          className={`jobs-tab ${activeTab === "pipeline" ? "active" : ""}`}
          onClick={() => setActiveTab("pipeline")}
        >
          <FaBriefcase style={{ marginRight: "0.5rem" }} />
          Pipeline
        </button>
        <button
          className={`jobs-tab ${activeTab === "followups" ? "active" : ""}`}
          onClick={() => setActiveTab("followups")}
        >
          <FaBell style={{ marginRight: "0.5rem" }} />
          Follow-Ups
        </button>
        <button
          className={`jobs-tab ${activeTab === "optimization" ? "active" : ""}`}
          onClick={() => setActiveTab("optimization")}
        >
          <FaRocket style={{ marginRight: "0.5rem" }} />
          Optimization
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "pipeline" && (
        <div style={{ display: 'flex', flexDirection: 'row', gap: '2.5rem', width: '100%', justifyContent: 'center' }}>
          {/* ---------- MAIN SECTION ---------- */}
          <div className="jobs-main">
            {/* 💼 Job Tracker */}
            <div className="profile-box">
              <h2>
                <FaBriefcase style={{ marginRight: "0.5rem", display: "inline-block" }} />
                Job Tracker
              </h2>

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

            {/* 📊 Job Pipeline */}
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

            {/* 📈 PERFORMANCE STATS DASHBOARD */}
            <div className="profile-box">
              <h3>
                <FaChartLine style={{ marginRight: "0.5rem", display: "inline-block" }} />
                Performance Dashboard
              </h3>
              <StatisticsDashboard token={token} />
            </div>
          </div>

          {/* ---------- SIDEBAR ---------- */}
          <aside className="sidebar-widget">
            <UpcomingDeadlinesWidget token={token} />
          </aside>
        </div>
      )}

      {activeTab === "followups" && (
        <div className="jobs-followups-tab">
          <FollowUpReminders />
        </div>
      )}

      {activeTab === "optimization" && (
        <div className="jobs-optimization-tab">
          <OptimizationDashboard />
        </div>
      )}
    </div>
  );
}
