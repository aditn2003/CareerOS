import React from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import "./InterviewsLayout.css";

export default function InterviewsLayout() {
  const location = useLocation();

  // Helper to check if path is active
  const isActive = (path) => location.pathname === path;
  
  return (
    <div className="interviews-layout">
      <div className="interviews-header">
        <h1 className="main-title">Interview Command Center</h1>
        <p className="main-subtitle">Your complete toolkit from research to offer</p>
      </div>

      {/* Navigation Tabs - Organized by Interview Journey */}
      <nav className="interview-nav-container">
        {/* Phase 1: Research */}
        <div className="nav-group">
          <span className="nav-group-label">Research</span>
          <div className="nav-group-tabs">
            <Link
              to="/interviews/company-research"
              className={`nav-tab research ${isActive('/interviews/company-research') ? 'active' : ''}`}
            >
              <span className="tab-icon">🏢</span>
              <span className="tab-text">Company</span>
            </Link>
            <Link
              to="/interviews/insights"
              className={`nav-tab research ${isActive('/interviews/insights') ? 'active' : ''}`}
            >
              <span className="tab-icon">🔍</span>
              <span className="tab-text">Insights</span>
            </Link>
          </div>
        </div>

        {/* Phase 2: Practice */}
        <div className="nav-group">
          <span className="nav-group-label">Practice</span>
          <div className="nav-group-tabs">
            <Link
              to="/interviews/question-bank"
              className={`nav-tab practice ${isActive('/interviews/question-bank') ? 'active' : ''}`}
            >
              <span className="tab-icon">📝</span>
              <span className="tab-text">Questions</span>
            </Link>
            <Link
              to="/interviews/technical-prep"
              className={`nav-tab practice ${isActive('/interviews/technical-prep') ? 'active' : ''}`}
            >
              <span className="tab-icon">💻</span>
              <span className="tab-text">Technical</span>
            </Link>
            <Link
              to="/interviews/response-coaching"
              className={`nav-tab practice ${isActive('/interviews/response-coaching') ? 'active' : ''}`}
            >
              <span className="tab-icon">🤖</span>
              <span className="tab-text">AI Coach</span>
            </Link>
            <Link
              to="/interviews/mock-interview"
              className={`nav-tab practice ${isActive('/interviews/mock-interview') ? 'active' : ''}`}
            >
              <span className="tab-icon">🎭</span>
              <span className="tab-text">Mock</span>
            </Link>
          </div>
        </div>

        {/* Phase 3: Track */}
        <div className="nav-group">
          <span className="nav-group-label">Track</span>
          <div className="nav-group-tabs">
            <Link
              to="/interviews/tracker"
              className={`nav-tab track ${isActive('/interviews/tracker') ? 'active' : ''}`}
            >
              <span className="tab-icon">📋</span>
              <span className="tab-text">Interviews</span>
            </Link>
            <Link
              to="/interviews/follow-up"
              className={`nav-tab track ${isActive('/interviews/follow-up') ? 'active' : ''}`}
            >
              <span className="tab-icon">📧</span>
              <span className="tab-text">Follow-Up</span>
            </Link>
            <Link
              to="/interviews/analytics"
              className={`nav-tab track ${isActive('/interviews/analytics') ? 'active' : ''}`}
            >
              <span className="tab-icon">📊</span>
              <span className="tab-text">Analytics</span>
            </Link>
          </div>
        </div>

        {/* Phase 4: Offer */}
        <div className="nav-group">
          <span className="nav-group-label">Offer</span>
          <div className="nav-group-tabs">
            <Link
              to="/interviews/salary-research"
              className={`nav-tab offer ${isActive('/interviews/salary-research') ? 'active' : ''}`}
            >
              <span className="tab-icon">💰</span>
              <span className="tab-text">Salary Data</span>
            </Link>
            <Link
              to="/interviews/salary-negotiation"
              className={`nav-tab offer ${isActive('/interviews/salary-negotiation') ? 'active' : ''}`}
            >
              <span className="tab-icon">💵</span>
              <span className="tab-text">Negotiate</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Render child routes */}
      <div className="interview-content">
        <Outlet />
      </div>
    </div>
  );
}