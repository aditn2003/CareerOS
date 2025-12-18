// src/pages/Jobs.jsx
import React, { useState, lazy, Suspense, useEffect } from "react";
import { useNavigate, useLocation, NavLink } from "react-router-dom";
import { FaBriefcase, FaChartLine, FaPlus, FaBell, FaRocket, FaBalanceScale, FaChartBar, FaMapMarkedAlt, FaTh, FaEnvelope, FaCopy, FaDownload, FaExclamationTriangle } from "react-icons/fa";
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
import { api } from "../api";
import "./Jobs.css";
import "./StatisticsLayout.css";

export default function Jobs() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [showForm, setShowForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(Date.now());
  const [activeTab, setActiveTab] = useState("pipeline");
  const [forwardingEmail, setForwardingEmail] = useState("forward@jobs.atscareeros.com"); // Default value
  const [emailCopied, setEmailCopied] = useState(false);
  const [gapData, setGapData] = useState(null);
  const [showGaps, setShowGaps] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleApply = (jobId) => {
    if (!jobId) return;
    navigate(`/job-match?jobId=${jobId}&tab=quality`);
  };

  const handleSaved = () => {
    setShowForm(false);
    setRefreshKey(Date.now());
  };

  useEffect(() => {
    // Fetch forwarding email address
    const fetchForwardingEmail = async () => {
      try {
        const response = await api.get("/api/jobs/forwarding-email");
        console.log("📧 Forwarding email fetched:", response.data);
        setForwardingEmail(response.data.forwarding_email);
      } catch (error) {
        console.error("Failed to fetch forwarding email:", error);
        // Set a fallback email if API fails
        setForwardingEmail("forward@jobs.atscareeros.com");
      }
    };
    if (token) {
      fetchForwardingEmail();
    } else {
      // If no token, still show the email (for testing)
      setForwardingEmail("forward@jobs.atscareeros.com");
    }
  }, [token]);

  const handleCopyEmail = () => {
    if (forwardingEmail) {
      navigator.clipboard.writeText(forwardingEmail);
      setEmailCopied(true);
      setTimeout(() => setEmailCopied(false), 2000);
    }
  };

  // Fetch gap detection data
  useEffect(() => {
    const fetchGapData = async () => {
      try {
        const response = await api.get("/api/jobs/application-gaps");
        setGapData(response.data);
      } catch (error) {
        console.error("Failed to fetch gap data:", error);
      }
    };
    if (token) {
      fetchGapData();
    }
  }, [token, refreshKey]);

  // Export application history
  const handleExport = async (format = 'csv') => {
    setExporting(true);
    try {
      const response = await api.get(`/api/jobs/export?format=${format}`, {
        responseType: 'blob'
      });
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = format === 'csv' ? 'job_applications.csv' : 'job_applications.json';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Failed to export:", error);
    } finally {
      setExporting(false);
    }
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
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    <button className="btn-success" onClick={() => setShowForm(true)}>
                      <FaPlus style={{ marginRight: "0.5rem", display: "inline-block" }} />
                      Add New Job
                    </button>
                    <button
                      onClick={() => handleExport('csv')}
                      disabled={exporting}
                      style={{
                        padding: "0.5rem 1rem",
                        backgroundColor: "#6366f1",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        cursor: exporting ? "wait" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        fontSize: "0.875rem",
                        fontWeight: 500
                      }}
                    >
                      <FaDownload style={{ fontSize: "0.875rem" }} />
                      {exporting ? "Exporting..." : "Export CSV"}
                    </button>
                  </div>
                  
                  {/* Gap Detection Alert */}
                  {gapData && gapData.has_gaps && (
                    <div style={{
                      padding: "0.75rem 1rem",
                      backgroundColor: "#fef3c7",
                      border: "1px solid #f59e0b",
                      borderRadius: "6px",
                      fontSize: "0.875rem",
                      color: "#92400e"
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                        <FaExclamationTriangle style={{ fontSize: "0.875rem", color: "#f59e0b" }} />
                        <strong>Application History Gaps Detected</strong>
                        <button
                          onClick={() => setShowGaps(!showGaps)}
                          style={{
                            marginLeft: "auto",
                            padding: "0.25rem 0.5rem",
                            backgroundColor: "#f59e0b",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "0.75rem"
                          }}
                        >
                          {showGaps ? "Hide" : "Show Details"}
                        </button>
                      </div>
                      <div style={{ fontSize: "0.8125rem" }}>
                        {gapData.recommendation}
                      </div>
                      {showGaps && gapData.gaps && gapData.gaps.length > 0 && (
                        <div style={{ marginTop: "0.75rem", borderTop: "1px solid #f59e0b", paddingTop: "0.75rem" }}>
                          {gapData.gaps.map((gap, idx) => (
                            <div key={idx} style={{ 
                              marginBottom: "0.5rem", 
                              padding: "0.5rem",
                              backgroundColor: "#fffbeb",
                              borderRadius: "4px"
                            }}>
                              <div style={{ fontWeight: 600, marginBottom: "0.25rem" }}>
                                📅 {gap.gap_days} day gap ({gap.start_date} to {gap.end_date})
                              </div>
                              <div style={{ fontSize: "0.8rem" }}>{gap.suggestion}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {forwardingEmail && (
                    <div style={{
                      padding: "0.75rem 1rem",
                      backgroundColor: "#f0f9ff",
                      border: "1px solid #bae6fd",
                      borderRadius: "6px",
                      fontSize: "0.875rem",
                      color: "#0369a1"
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                        <FaEnvelope style={{ fontSize: "0.875rem" }} />
                        <strong>Auto-import jobs via email:</strong>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                        <span style={{ 
                          fontFamily: "monospace", 
                          backgroundColor: "#fff",
                          padding: "0.25rem 0.5rem",
                          borderRadius: "4px",
                          border: "1px solid #bae6fd"
                        }}>
                          {forwardingEmail}
                        </span>
                        <button
                          onClick={handleCopyEmail}
                          style={{
                            padding: "0.25rem 0.5rem",
                            backgroundColor: emailCopied ? "#10b981" : "#0369a1",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "0.75rem",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.25rem"
                          }}
                        >
                          <FaCopy style={{ fontSize: "0.75rem" }} />
                          {emailCopied ? "Copied!" : "Copy"}
                        </button>
                      </div>
                      <div style={{ marginTop: "0.5rem", fontSize: "0.8125rem", color: "#075985" }}>
                        Forward job application confirmation emails to this address to automatically import them into your job tracker.
                      </div>
                    </div>
                  )}
                </div>
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