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
        <Link
          to="/interviews/follow-up"
          className={`nav-tab ${location.pathname === '/interviews/follow-up' ? 'active' : ''}`}
        >
          📧 Follow-Up
        </Link>
        <Link
          to="/interviews/company-research"
          className={`nav-tab ${location.pathname === '/interviews/company-research' ? 'active' : ''}`}
        >
          🏢 Company Research
        </Link>
        <Link
          to="/interviews/salary-research"
          className={`nav-tab ${location.pathname === '/interviews/salary-research' ? 'active' : ''}`}
        >
          💰 Salary Research
        </Link>
        <Link
          to="/interviews/salary-negotiation"
          className={`nav-tab ${location.pathname === '/interviews/salary-negotiation' ? 'active' : ''}`}
        >
          💵 Negotiation
        </Link>
        <Link
          to="/interviews/tracker"
          className={`nav-tab ${location.pathname === '/interviews/tracker' ? 'active' : ''}`}
        >
          📋 Tracker
        </Link>
        <Link
          to="/interviews/analytics"
          className={`nav-tab ${location.pathname === '/interviews/analytics' ? 'active' : ''}`}
        >
          📊 Analytics
        </Link>
      </nav>

      {/* Render child routes */}
      <div className="interview-content">
        <Outlet />
      </div>
    </div>
  );
}