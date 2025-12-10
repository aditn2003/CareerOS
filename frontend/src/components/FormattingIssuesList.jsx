// frontend/src/components/FormattingIssuesList.jsx
// UC-122: Formatting Issues and Inconsistencies Component

import React from "react";
import "./FormattingIssuesList.css";

export default function FormattingIssuesList({
  formattingIssues = [],
  inconsistencies = [],
}) {
  if (formattingIssues.length === 0 && inconsistencies.length === 0) {
    return null;
  }

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case "high":
        return "#ef4444";
      case "medium":
        return "#f59e0b";
      case "low":
        return "#3b82f6";
      default:
        return "#6b7280";
    }
  };

  const getSeverityBadge = (severity) => {
    const color = getSeverityColor(severity);
    return (
      <span
        className="formatting-issue-severity"
        style={{ backgroundColor: color + "20", color: color }}
      >
        {severity?.toUpperCase() || "MEDIUM"}
      </span>
    );
  };

  return (
    <div className="formatting-issues-card">
      <h3 className="formatting-issues-title">Issues & Inconsistencies</h3>
      <p className="formatting-issues-subtitle">
        Formatting problems and inconsistencies found in your application materials
      </p>

      <div className="formatting-issues-content">
        {formattingIssues.length > 0 && (
          <div className="formatting-issues-section">
            <h4 className="formatting-issues-section-title">
              <span className="formatting-issues-icon">📝</span>
              Formatting Issues ({formattingIssues.length})
            </h4>
            <div className="formatting-issues-list">
              {formattingIssues.map((issue, index) => (
                <div key={index} className="formatting-issue-item">
                  <div className="formatting-issue-header">
                    <span className="formatting-issue-type">{issue.type || "Issue"}</span>
                    {getSeverityBadge(issue.severity)}
                  </div>
                  <p className="formatting-issue-location">
                    <strong>Location:</strong> {issue.location || "Unknown"}
                  </p>
                  <p className="formatting-issue-description">{issue.issue}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {inconsistencies.length > 0 && (
          <div className="formatting-issues-section">
            <h4 className="formatting-issues-section-title">
              <span className="formatting-issues-icon">⚠️</span>
              Inconsistencies ({inconsistencies.length})
            </h4>
            <div className="formatting-issues-list">
              {inconsistencies.map((inconsistency, index) => (
                <div key={index} className="formatting-issue-item">
                  <div className="formatting-issue-header">
                    <span className="formatting-issue-type">
                      {inconsistency.type || "Inconsistency"}
                    </span>
                    {getSeverityBadge(inconsistency.severity)}
                  </div>
                  <p className="formatting-issue-location">
                    <strong>Location:</strong> {inconsistency.location || "Unknown"}
                  </p>
                  <p className="formatting-issue-description">{inconsistency.issue}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}



