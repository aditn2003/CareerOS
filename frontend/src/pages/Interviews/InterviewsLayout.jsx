import React from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import "./InterviewsLayout.css";

export default function InterviewsLayout() {
  const location = useLocation();
  
  return (
    <div className="interviews-layout">
      <div className="interviews-header">
        <h1 className="main-title">Interview Preparation</h1>
        <p className="main-subtitle">Complete interview prep tools in one place</p>
      </div>

      {/* Navigation Tabs */}
      <nav className="interview-nav-tabs">
        <Link
          to="/interviews/insights"
          className={`nav-tab ${location.pathname === '/interviews/insights' ? 'active' : ''}`}
        >
          📊 Interview Insights
        </Link>
        <Link
          to="/interviews/question-bank"
          className={`nav-tab ${location.pathname === '/interviews/question-bank' ? 'active' : ''}`}
        >
          📝 Question Bank
        </Link>
        <Link
          to="/interviews/response-coaching"
          className={`nav-tab ${location.pathname === '/interviews/response-coaching' ? 'active' : ''}`}
        >
          🤖 AI Coaching
        </Link>
        <Link
          to="/interviews/mock-interview"
          className={`nav-tab ${location.pathname === '/interviews/mock-interview' ? 'active' : ''}`}
        >
          🎭 Mock Interview
        </Link>
      </nav>

      {/* Render child routes */}
      <div className="interview-content">
        <Outlet />
      </div>
    </div>
  );
}