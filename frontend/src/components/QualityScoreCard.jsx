// frontend/src/components/QualityScoreCard.jsx
// UC-122: Quality Score Card Component

import React from "react";
import "./QualityScoreCard.css";

export default function QualityScoreCard({ score, userStats }) {
  if (!score) return null;

  const overallScore = score.overall_score || 0;
  // Get scores from score_breakdown if not at top level
  const scoreBreakdown = score.score_breakdown || {};
  const resumeScore = score.resume_score || scoreBreakdown.resume_score || 0;
  const coverLetterScore = score.cover_letter_score || scoreBreakdown.cover_letter_score || 0;
  const meetsThreshold = score.meets_threshold || false;
  const minimumThreshold = score.minimum_threshold || 70;

  // Determine score color
  const getScoreColor = (score) => {
    if (score >= 70) return "#10b981"; // Green
    if (score >= 60) return "#f59e0b"; // Yellow
    return "#ef4444"; // Red
  };

  const getScoreLabel = (score) => {
    if (score >= 70) return "Excellent";
    if (score >= 60) return "Good";
    if (score >= 50) return "Fair";
    return "Needs Improvement";
  };

  const scoreColor = getScoreColor(overallScore);
  const scoreLabel = getScoreLabel(overallScore);

  return (
    <div className="quality-score-card">
      {/* Main Score Display */}
      <div className="quality-score-main">
        <div className="quality-score-circle" style={{ borderColor: scoreColor }}>
          <div className="quality-score-number" style={{ color: scoreColor }}>
            {overallScore}
          </div>
          <div className="quality-score-max">/ 100</div>
        </div>
        <div className="quality-score-info">
          <h2 className="quality-score-label" style={{ color: scoreColor }}>
            {scoreLabel}
          </h2>
          <div className="quality-score-status">
            {meetsThreshold ? (
              <span className="quality-threshold-badge passing">
                ✓ Meets Threshold ({minimumThreshold}+)
              </span>
            ) : (
              <span className="quality-threshold-badge failing">
                ✗ Below Threshold ({minimumThreshold}+)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Component Scores */}
      <div className="quality-component-scores">
        <div className="quality-component-item">
          <span className="quality-component-label">Resume</span>
          <div className="quality-component-bar">
            <div
              className="quality-component-fill"
              style={{
                width: `${resumeScore}%`,
                backgroundColor: getScoreColor(resumeScore),
              }}
            />
          </div>
          <span className="quality-component-value">{resumeScore}</span>
        </div>
        <div className="quality-component-item">
          <span className="quality-component-label">Cover Letter</span>
          <div className="quality-component-bar">
            <div
              className="quality-component-fill"
              style={{
                width: `${coverLetterScore}%`,
                backgroundColor: getScoreColor(coverLetterScore),
              }}
            />
          </div>
          <span className="quality-component-value">{coverLetterScore}</span>
        </div>
      </div>

      {/* Comparison Metrics */}
      {userStats && (userStats.average_score !== null || userStats.top_score !== null) && (
        <div className="quality-comparison">
          <h3>Your Performance</h3>
          <div className="quality-comparison-stats">
            {userStats.average_score !== null && (
              <div className="quality-comparison-item">
                <span className="quality-comparison-label">Average</span>
                <span className="quality-comparison-value">
                  {parseFloat(userStats.average_score).toFixed(1)}
                </span>
                <span
                  className={`quality-comparison-diff ${
                    overallScore >= userStats.average_score ? "positive" : "negative"
                  }`}
                >
                  {overallScore >= userStats.average_score ? "+" : ""}
                  {(overallScore - parseFloat(userStats.average_score)).toFixed(1)}
                </span>
              </div>
            )}
            {userStats.top_score !== null && (
              <div className="quality-comparison-item">
                <span className="quality-comparison-label">Top Score</span>
                <span className="quality-comparison-value">{userStats.top_score}</span>
                <span
                  className={`quality-comparison-diff ${
                    overallScore >= userStats.top_score ? "positive" : "negative"
                  }`}
                >
                  {overallScore >= userStats.top_score ? "=" : ""}
                  {(overallScore - userStats.top_score).toFixed(0)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

