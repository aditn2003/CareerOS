// frontend/src/components/ScoreBreakdown.jsx
// UC-122: Score Breakdown Visualization Component

import React from "react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";
import "./ScoreBreakdown.css";

export default function ScoreBreakdown({ scoreBreakdown }) {
  if (!scoreBreakdown || typeof scoreBreakdown !== "object") {
    return null;
  }

  // Prepare data for radar chart
  const chartData = [
    {
      category: "Keyword Match",
      score: scoreBreakdown.keyword_match || 0,
      fullMark: 100,
    },
    {
      category: "Skills Alignment",
      score: scoreBreakdown.skills_alignment || 0,
      fullMark: 100,
    },
    {
      category: "Experience",
      score: scoreBreakdown.experience_relevance || 0,
      fullMark: 100,
    },
    {
      category: "Formatting",
      score: scoreBreakdown.formatting_quality || 0,
      fullMark: 100,
    },
    {
      category: "Quantification",
      score: scoreBreakdown.quantification || 0,
      fullMark: 100,
    },
    {
      category: "ATS Optimization",
      score: scoreBreakdown.ats_optimization || 0,
      fullMark: 100,
    },
  ];

  // Add cover letter metrics if available
  if (scoreBreakdown.cover_letter_customization !== undefined) {
    chartData.push({
      category: "CL Customization",
      score: scoreBreakdown.cover_letter_customization || 0,
      fullMark: 100,
    });
  }

  if (scoreBreakdown.professional_tone !== undefined) {
    chartData.push({
      category: "Professional Tone",
      score: scoreBreakdown.professional_tone || 0,
      fullMark: 100,
    });
  }

  return (
    <div className="score-breakdown-card">
      <h3 className="score-breakdown-title">Score Breakdown</h3>
      <div className="score-breakdown-content">
        <ResponsiveContainer width="100%" height={400}>
          <RadarChart data={chartData}>
            <PolarGrid />
            <PolarAngleAxis
              dataKey="category"
              tick={{ fontSize: 12, fill: "#4b5563" }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{ fontSize: 10, fill: "#9ca3af" }}
            />
            <Radar
              name="Score"
              dataKey="score"
              stroke="#8b5cf6"
              fill="#8b5cf6"
              fillOpacity={0.6}
            />
          </RadarChart>
        </ResponsiveContainer>

        {/* Detailed List */}
        <div className="score-breakdown-list">
          {chartData.map((item, index) => {
            const score = item.score;
            const getColor = (score) => {
              if (score >= 70) return "#10b981";
              if (score >= 60) return "#f59e0b";
              return "#ef4444";
            };

            return (
              <div key={index} className="score-breakdown-item">
                <div className="score-breakdown-item-header">
                  <span className="score-breakdown-item-label">{item.category}</span>
                  <span
                    className="score-breakdown-item-value"
                    style={{ color: getColor(score) }}
                  >
                    {score}
                  </span>
                </div>
                <div className="score-breakdown-item-bar">
                  <div
                    className="score-breakdown-item-fill"
                    style={{
                      width: `${score}%`,
                      backgroundColor: getColor(score),
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}



