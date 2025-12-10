// src/pages/Match/JobMatch.jsx
import React, { useState } from "react";
import MatchAnalysisTab from "./MatchAnalysisTab";
import QualityScoringTab from "./QualityScoringTab";
import "./JobMatch.css";

export default function JobMatch() {
  const [activeTab, setActiveTab] = useState("match"); // "match" or "quality"

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
          </div>
        </div>
      </nav>

      {/* Tab Content */}
      <div className="job-match-content">
        {activeTab === "match" && <MatchAnalysisTab />}
        {activeTab === "quality" && <QualityScoringTab />}
      </div>
    </div>
  );
}
