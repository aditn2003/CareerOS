// src/pages/Jobs.jsx
import React, { useState, lazy, Suspense } from "react";
import { useNavigate, useLocation, NavLink } from "react-router-dom";
import { FaBriefcase, FaChartLine, FaPlus, FaBell, FaRocket, FaBalanceScale, FaChartBar, FaMapMarkedAlt, FaTh } from "react-icons/fa";
import JobEntryForm from "../components/JobEntryForm";
import JobPipeline from "../components/JobPipeLine";
// Lazy load JobMapView (contains leaflet/maps - only load when map tab is active)
const JobMapView = lazy(() => import("../components/JobMapView"));
import UpcomingDeadlinesWidget from "../components/UpcomingDeadlinesWidget";
import JobsCalendar from "../components/JobsCalendar";
import StatisticsDashboard from "../components/stats";
import FollowUpReminders from "../components/FollowUpReminders";
import OptimizationDashboard from "../components/OptimizationDashboard";
import OfferComparison from "../components/OfferComparison";
import CareerGrowthCalculator from "../components/CareerGrowthCalculator";
import JobTimeline from "../components/JobTimeline";
import { useAuth } from "../contexts/AuthContext";
import Spinner from "../components/Spinner";
import "./Jobs.css";
import "./StatisticsLayout.css";

export default function Jobs() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [showForm, setShowForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(Date.now());
  const [activeTab, setActiveTab] = useState("pipeline");

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
      {/* Tab Navigation - Matching Statistics Page Style */}
      <div className="statistics-nav-container">
        <div className="statistics-nav-group">
          <span className="statistics-nav-group-label">Jobs</span>
          <div className="statistics-nav-group-tabs">
            <button
              className={`statistics-nav-tab analytics ${activeTab === "pipeline" ? "active" : ""}`}
              onClick={() => setActiveTab("pipeline")}
            >
              <span className="statistics-tab-icon">💼</span>
              <span className="statistics-tab-text">Pipeline</span>
            </button>
            <button
              className={`statistics-nav-tab analytics ${activeTab === "map" ? "active" : ""}`}
              onClick={() => setActiveTab("map")}
            >
              <span className="statistics-tab-icon">🗺️</span>
              <span className="statistics-tab-text">Map View</span>
            </button>
            <button
              className={`statistics-nav-tab analytics ${activeTab === "followups" ? "active" : ""}`}
              onClick={() => setActiveTab("followups")}
            >
              <span className="statistics-tab-icon">🔔</span>
              <span className="statistics-tab-text">Follow-Ups</span>
            </button>
            <button
              className={`statistics-nav-tab compensation ${activeTab === "optimization" ? "active" : ""}`}
              onClick={() => setActiveTab("optimization")}
            >
              <span className="statistics-tab-icon">🚀</span>
              <span className="statistics-tab-text">Optimization</span>
            </button>
            <button
              className={`statistics-nav-tab compensation ${activeTab === "comparison" ? "active" : ""}`}
              onClick={() => setActiveTab("comparison")}
            >
              <span className="statistics-tab-icon">⚖️</span>
              <span className="statistics-tab-text">Offer Comparison</span>
            </button>
            <button
              className={`statistics-nav-tab career ${activeTab === "growth" ? "active" : ""}`}
              onClick={() => setActiveTab("growth")}
            >
              <span className="statistics-tab-icon">📈</span>
              <span className="statistics-tab-text">Career Growth</span>
            </button>
          </div>
        </div>
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

      {activeTab === "map" && (
        <div className="jobs-map-tab">
          <div className="profile-box">
            <h3>
              <FaMapMarkedAlt style={{ marginRight: "0.5rem", display: "inline-block" }} />
              Job Locations Map
            </h3>
            <Suspense fallback={<Spinner />}>
              <JobMapView key={refreshKey} token={token} />
            </Suspense>
          </div>
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

      {activeTab === "comparison" && (
        <div className="jobs-comparison-tab">
          <OfferComparison />
        </div>
      )}

      {activeTab === "growth" && (
        <div className="jobs-growth-tab">
          <CareerGrowthCalculator />
        </div>
      )}
    </div>
  );
}