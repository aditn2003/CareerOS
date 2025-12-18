// src/pages/Match/JobMatch.jsx
import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import MatchAnalysisTab from "./MatchAnalysisTab";
import QualityScoringTab from "./QualityScoringTab";
import TimingTab from "./TimingTab";
import MaterialComparisonTab from "./MaterialComparisonTab";
import "./JobMatch.css";

export default function JobMatch() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const jobIdFromUrl = searchParams.get("jobId");
  const tabFromUrl = searchParams.get("tab");
  
  const [activeTab, setActiveTab] = useState(
    tabFromUrl === "quality" ? "quality" : tabFromUrl === "timing" ? "timing" : tabFromUrl === "comparison" ? "comparison" : "match"
  );

  // Track if user navigated via URL (from Quality tab) or clicked tab directly
  const [jobIdForTiming, setJobIdForTiming] = useState(null);

  // Set active tab if tab param is in URL
  useEffect(() => {
    if (tabFromUrl === "quality") {
      setActiveTab("quality");
    } else if (tabFromUrl === "timing") {
      setActiveTab("timing");
      // Only set jobId if coming from URL (e.g., from Quality tab button)
      if (jobIdFromUrl) {
        setJobIdForTiming(jobIdFromUrl);
      }
    } else if (tabFromUrl === "comparison") {
      setActiveTab("comparison");
    }
  }, [tabFromUrl, jobIdFromUrl]);

  // Handle tab click - clears jobId when clicking tabs directly
  const handleTabClick = (tab) => {
    setActiveTab(tab);
    setJobIdForTiming(null); // Clear job selection when clicking tab directly
    // Clear URL params when clicking tabs
    navigate('/job-match', { replace: true });
  };

  return (
    <div className="match-wrapper">
      <div className="match-header-section">
        <h1 className="match-main-title">Job Match</h1>
        <p className="match-main-subtitle">Analyze job fit and application quality</p>
      </div>

      {/* Navigation Tabs - Interview Command Centre Style */}
      <nav className="job-match-nav-container">
        <div className="nav-group">
          <span className="nav-group-label">Analysis</span>
          <div className="nav-group-tabs">
            <button
              className={`nav-tab match-analysis ${activeTab === "match" ? "active" : ""}`}
              onClick={() => handleTabClick("match")}
            >
              <span className="tab-icon">📊</span>
              <span className="tab-text">Match</span>
            </button>
            <button
              className={`nav-tab quality-scoring ${activeTab === "quality" ? "active" : ""}`}
              onClick={() => handleTabClick("quality")}
            >
              <span className="tab-icon">⭐</span>
              <span className="tab-text">Quality</span>
            </button>
            <button
              className={`nav-tab timing-tab ${activeTab === "timing" ? "active" : ""}`}
              onClick={() => handleTabClick("timing")}
            >
              <span className="tab-icon">⏰</span>
              <span className="tab-text">Timing</span>
            </button>
            <button
              className={`nav-tab comparison-tab ${activeTab === "comparison" ? "active" : ""}`}
              onClick={() => handleTabClick("comparison")}
            >
              <span className="tab-icon">📈</span>
              <span className="tab-text">Comparison</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Tab Content */}
      <div className="job-match-content">
        {activeTab === "match" && <MatchAnalysisTab />}
        {activeTab === "quality" && <QualityScoringTab jobId={jobIdFromUrl} />}
        {activeTab === "timing" && <TimingTab jobId={jobIdForTiming} />}
        {activeTab === "comparison" && <MaterialComparisonTab />}
      </div>
    </div>
  );
}
