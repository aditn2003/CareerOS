// src/components/RequirementsMatchAnalysis.jsx
// UC-123: Job Requirements Match Analysis
import React, { useState, useEffect } from "react";
import { api } from "../api";
import "./RequirementsMatchAnalysis.css";

export default function RequirementsMatchAnalysis({ jobId, jobTitle, company, onClose }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Get userId from token
  const token = localStorage.getItem("token");
  let userId = null;
  if (token) {
    try {
      userId = JSON.parse(atob(token.split(".")[1])).id;
    } catch (err) {
      console.error("❌ Error decoding token:", err);
    }
  }

  useEffect(() => {
    if (jobId && userId) {
      fetchAnalysis();
    }
  }, [jobId, userId]);

  const fetchAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post("/api/match/requirements-analysis", {
        userId: Number(userId),
        jobId: Number(jobId)
      });
      setAnalysis(res.data.analysis);
    } catch (err) {
      console.error("❌ Requirements analysis error:", err);
      setError(err.response?.data?.message || "Failed to analyze requirements");
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return "#10b981";
    if (score >= 60) return "#f59e0b";
    if (score >= 40) return "#f97316";
    return "#ef4444";
  };

  const getScoreLabel = (score) => {
    if (score >= 80) return "Excellent Match";
    if (score >= 60) return "Good Match";
    if (score >= 40) return "Moderate Match";
    return "Needs Work";
  };

  const cleanLevel = (level) => {
    if (!level) return "";
    // Remove ALL numbers and clean up the level string
    return level.toString().toLowerCase().replace(/[0-9]/g, '').trim();
  };

  const getLevelIcon = (level) => {
    const cleanedLevel = cleanLevel(level);
    const icons = {
      entry: "🌱",
      mid: "🌿",
      senior: "🌳",
      executive: "👑"
    };
    return icons[cleanedLevel] || "📊";
  };

  const formatLevel = (level) => {
    const cleanedLevel = cleanLevel(level);
    return cleanedLevel.toUpperCase();
  };

  const getImportanceColor = (importance) => {
    const colors = {
      critical: "#ef4444",
      important: "#f59e0b",
      "nice-to-have": "#10b981"
    };
    return colors[importance] || "#6b7280";
  };

  if (loading) {
    return (
      <div className="requirements-analysis-loading">
        <div className="loading-spinner"></div>
        <p>Analyzing job requirements match...</p>
        <p className="loading-subtitle">AI is comparing your profile with job requirements</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="requirements-analysis-error">
        <span className="error-icon">⚠️</span>
        <p>{error}</p>
        <button onClick={fetchAnalysis} className="retry-btn">Try Again</button>
      </div>
    );
  }

  if (!analysis) {
    return null;
  }

  return (
    <div className="requirements-analysis">
      {/* Header with Score */}
      <div className="ra-header">
        <div className="ra-job-info">
          <h2>{analysis.jobTitle || jobTitle}</h2>
          <p className="ra-company">{analysis.company || company}</p>
        </div>
        <div className="ra-score-circle" style={{ borderColor: getScoreColor(analysis.overallScore) }}>
          <span className="score-number" style={{ color: getScoreColor(analysis.overallScore) }}>
            {analysis.overallScore}<span className="score-total">/100</span>
          </span>
          <span className="score-label">{getScoreLabel(analysis.overallScore)}</span>
        </div>
      </div>

      {/* Experience Level Match */}
      {analysis.experienceLevelMatch && (
        <div className="ra-section ra-experience-level">
          <h3>📊 Experience Level Match</h3>
          <div className="level-comparison">
            <div className="level-item">
              <span className="level-label">Job Requires</span>
              <span className="level-value">
                {getLevelIcon(analysis.experienceLevelMatch.jobLevel)}
                {formatLevel(analysis.experienceLevelMatch.jobLevel)}
                {analysis.experienceLevelMatch.yearsRequired && 
                  ` (${analysis.experienceLevelMatch.yearsRequired}+ years)`}
              </span>
            </div>
            <div className={`level-match-indicator ${analysis.experienceLevelMatch.isMatch ? 'match' : 'no-match'}`}>
              {analysis.experienceLevelMatch.isMatch ? '✓' : '✗'}
            </div>
            <div className="level-item">
              <span className="level-label">Your Level</span>
              <span className="level-value">
                {getLevelIcon(analysis.experienceLevelMatch.candidateLevel)}
                {formatLevel(analysis.experienceLevelMatch.candidateLevel)}
                {analysis.experienceLevelMatch.yearsCandidate && 
                  ` (${analysis.experienceLevelMatch.yearsCandidate} years)`}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Strongest Qualifications */}
      {analysis.strongestQualifications?.length > 0 && (
        <div className="ra-section ra-strongest">
          <h3>⭐ Your Strongest Qualifications</h3>
          <div className="strongest-list">
            {analysis.strongestQualifications.map((item, idx) => (
              <div key={idx} className="strongest-item">
                <span className="strongest-badge">🏆</span>
                <div className="strongest-content">
                  <strong>{item.qualification}</strong>
                  <p>{item.reason}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Matching Skills */}
      {analysis.matchingSkills?.length > 0 && (
        <div className="ra-section ra-matching-skills">
          <h3>✅ Matching Skills</h3>
          <div className="skills-grid">
            {analysis.matchingSkills.map((skill, idx) => (
              <div key={idx} className="skill-tag-card" data-relevance={skill.relevance}>
                <div className="skill-tag-header">
                  <span className="skill-name">{skill.skill}</span>
                  <span className="skill-proficiency-badge">{skill.proficiency}</span>
                </div>
                <span 
                  className="skill-relevance-badge"
                  style={{ backgroundColor: getImportanceColor(skill.relevance) }}
                >
                  {skill.relevance}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Matching Experiences */}
      {analysis.matchingExperiences?.length > 0 && (
        <div className="ra-section ra-matching-exp">
          <h3>💼 Relevant Experience</h3>
          <ul className="experience-list">
            {analysis.matchingExperiences.map((exp, idx) => (
              <li key={idx} className={`exp-item relevance-${exp.relevance}`}>
                <span className="exp-relevance-dot"></span>
                {exp.experience}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Skills to Emphasize */}
      {analysis.skillsToEmphasize?.length > 0 && (
        <div className="ra-section ra-emphasize">
          <h3>🎯 Skills to Emphasize in Your Application</h3>
          <div className="emphasize-list">
            {analysis.skillsToEmphasize.map((item, idx) => (
              <div key={idx} className="emphasize-item">
                <div className="emphasize-skill">{item.skill}</div>
                <div className="emphasize-reason">{item.reason}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Experiences to Highlight */}
      {analysis.experiencesToHighlight?.length > 0 && (
        <div className="ra-section ra-highlight">
          <h3>📝 Experiences to Highlight</h3>
          <div className="highlight-list">
            {analysis.experiencesToHighlight.map((item, idx) => (
              <div key={idx} className="highlight-item">
                <div className="highlight-exp">{item.experience}</div>
                <div className="highlight-reason">{item.reason}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Missing Requirements */}
      {analysis.missingRequirements?.length > 0 && (
        <div className="ra-section ra-missing">
          <h3>⚠️ Missing Requirements</h3>
          <div className="missing-list">
            {analysis.missingRequirements.map((item, idx) => (
              <div key={idx} className="missing-item">
                <span 
                  className="missing-importance"
                  style={{ backgroundColor: getImportanceColor(item.importance) }}
                >
                  {item.importance}
                </span>
                <span className="missing-category">{item.category}</span>
                <span className="missing-text">{item.requirement}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations for Gaps */}
      {analysis.recommendationsForGaps?.length > 0 && (
        <div className="ra-section ra-recommendations">
          <h3>💡 Recommendations to Address Gaps</h3>
          <div className="recommendations-list">
            {analysis.recommendationsForGaps.map((rec, idx) => (
              <div key={idx} className="recommendation-card">
                <div className="rec-header">
                  <span className="rec-gap">{rec.gap}</span>
                  <span className={`rec-timeframe timeframe-${rec.timeframe}`}>
                    {rec.timeframe}
                  </span>
                </div>
                <p className="rec-text">{rec.recommendation}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Application Advice */}
      {analysis.applicationAdvice && (
        <div className="ra-section ra-advice">
          <h3>📋 Application Advice</h3>
          <div className="advice-box">
            <p>{analysis.applicationAdvice}</p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="ra-actions">
        <button onClick={fetchAnalysis} className="ra-refresh-btn">
          🔄 Refresh Analysis
        </button>
        {onClose && (
          <button onClick={onClose} className="ra-close-btn">
            Close
          </button>
        )}
      </div>
    </div>
  );
}

