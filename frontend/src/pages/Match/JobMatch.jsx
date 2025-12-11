// src/pages/Match/JobMatch.jsx
import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import MatchAnalysisTab from "./MatchAnalysisTab";
import QualityScoringTab from "./QualityScoringTab";
import TimingTab from "./TimingTab";
import "./JobMatch.css";

export default function JobMatch() {
  const [searchParams] = useSearchParams();
  const jobIdFromUrl = searchParams.get("jobId");
  const tabFromUrl = searchParams.get("tab");
  
  const [activeTab, setActiveTab] = useState(
    tabFromUrl === "quality" ? "quality" : tabFromUrl === "timing" ? "timing" : "match"
  );

  // Set active tab if tab param is in URL
  useEffect(() => {
    if (tabFromUrl === "quality") {
      setActiveTab("quality");
    } else if (tabFromUrl === "timing") {
      setActiveTab("timing");
    }
  }, [tabFromUrl]);

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
              onClick={() => setActiveTab("match")}
            >
              <span className="tab-icon">📊</span>
              <span className="tab-text">Match</span>
            </button>
            <button
              className={`nav-tab quality-scoring ${activeTab === "quality" ? "active" : ""}`}
              onClick={() => setActiveTab("quality")}
            >
              <span className="tab-icon">⭐</span>
              <span className="tab-text">Quality</span>
            </button>
            <button
              className={`nav-tab timing-tab ${activeTab === "timing" ? "active" : ""}`}
              onClick={() => setActiveTab("timing")}
            >
              <span className="tab-icon">⏰</span>
              <span className="tab-text">Timing</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Tab Content */}
      <div className="job-match-content">
        {activeTab === "match" && <MatchAnalysisTab />}
        {activeTab === "quality" && <QualityScoringTab jobId={jobIdFromUrl} />}
        {activeTab === "timing" && <TimingTab jobId={jobIdFromUrl} />}
      </div>
    </div>
  );
}
