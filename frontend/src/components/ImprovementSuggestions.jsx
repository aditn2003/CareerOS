// frontend/src/components/ImprovementSuggestions.jsx
// UC-122: Improvement Suggestions List Component

import React, { useState } from "react";
import "./ImprovementSuggestions.css";

export default function ImprovementSuggestions({ suggestions = [] }) {
  const [expandedIndex, setExpandedIndex] = useState(null);

  if (!suggestions || suggestions.length === 0) {
    return (
      <div className="improvement-suggestions-card">
        <h3 className="improvement-suggestions-title">Improvement Suggestions</h3>
        <p className="improvement-suggestions-empty">
          No suggestions available. Your application looks great!
        </p>
      </div>
    );
  }

  // Sort by priority: high -> medium -> low
  const sortedSuggestions = [...suggestions].sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
  });

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
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

  const getCategoryIcon = (category) => {
    switch (category?.toLowerCase()) {
      case "keywords":
        return "🔑";
      case "skills":
        return "💼";
      case "formatting":
        return "📝";
      case "quantification":
        return "📊";
      case "cover_letter":
        return "✉️";
      case "experience":
        return "💡";
      default:
        return "💡";
    }
  };

  return (
    <div className="improvement-suggestions-card">
      <h3 className="improvement-suggestions-title">Improvement Suggestions</h3>
      <p className="improvement-suggestions-subtitle">
        Prioritized recommendations to improve your application quality score
      </p>

      <div className="improvement-suggestions-list">
        {sortedSuggestions.map((suggestion, index) => {
          const isExpanded = expandedIndex === index;
          const priorityColor = getPriorityColor(suggestion.priority);
          const categoryIcon = getCategoryIcon(suggestion.category);

          return (
            <div
              key={index}
              className={`improvement-suggestion-item ${
                suggestion.priority === "high" ? "high-priority" : ""
              }`}
            >
              <div
                className="improvement-suggestion-header"
                onClick={() => setExpandedIndex(isExpanded ? null : index)}
              >
                <div className="improvement-suggestion-left">
                  <span className="improvement-suggestion-icon">{categoryIcon}</span>
                  <div className="improvement-suggestion-main">
                    <div className="improvement-suggestion-priority-badge">
                      <span
                        className="improvement-suggestion-priority-dot"
                        style={{ backgroundColor: priorityColor }}
                      />
                      <span className="improvement-suggestion-priority-text">
                        {suggestion.priority?.toUpperCase() || "MEDIUM"}
                      </span>
                    </div>
                    <p className="improvement-suggestion-text">{suggestion.suggestion}</p>
                  </div>
                </div>
                <div className="improvement-suggestion-right">
                  {suggestion.estimated_score_improvement && (
                    <span className="improvement-suggestion-impact">
                      +{suggestion.estimated_score_improvement} pts
                    </span>
                  )}
                  <span className="improvement-suggestion-expand">
                    {isExpanded ? "−" : "+"}
                  </span>
                </div>
              </div>

              {isExpanded && (
                <div className="improvement-suggestion-details">
                  <div className="improvement-suggestion-detail-item">
                    <strong>Category:</strong> {suggestion.category || "General"}
                  </div>
                  {suggestion.impact && (
                    <div className="improvement-suggestion-detail-item">
                      <strong>Impact:</strong> {suggestion.impact}
                    </div>
                  )}
                  {suggestion.estimated_score_improvement && (
                    <div className="improvement-suggestion-detail-item">
                      <strong>Estimated Score Improvement:</strong> +
                      {suggestion.estimated_score_improvement} points
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}



